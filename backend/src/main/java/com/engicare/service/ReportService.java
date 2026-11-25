package com.engicare.service;

import com.engicare.dto.CreateReportRequest;
import com.engicare.dto.ReportResponse;
import com.engicare.dto.ReportPhotoResponse;
import com.engicare.dto.ReportCommentResponse;
import com.engicare.dto.ReportTimelineResponse;
import com.engicare.dto.UpdateReportStatusRequest;
import com.engicare.entity.Report;
import com.engicare.entity.ReportPhoto;
import com.engicare.entity.ReportComment;
import com.engicare.entity.ReportTimelineEntry;
import com.engicare.entity.User;
import com.engicare.repository.ReportRepository;
import com.engicare.repository.ReportPhotoRepository;
import com.engicare.repository.ReportCommentRepository;
import com.engicare.repository.ReportTimelineRepository;
import com.engicare.repository.UserRepository;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional(readOnly = true)
public class ReportService {
    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
            "pending", Set.of("under_review", "in_progress", "rejected"),
            "under_review", Set.of("in_progress", "resolved", "rejected"),
            "in_progress", Set.of("resolved", "under_review"),
            "resolved", Set.of("in_progress"),
            "rejected", Set.of("under_review")
    );

    private final ReportRepository reports;
    private final ReportTimelineRepository timeline;
    private final ReportCommentRepository comments;
    private final ReportPhotoRepository photos;
    private final UserRepository users;

    public ReportService(ReportRepository reports, ReportTimelineRepository timeline,
                         ReportCommentRepository comments, ReportPhotoRepository photos, UserRepository users) {
        this.reports = reports;
        this.timeline = timeline;
        this.comments = comments;
        this.photos = photos;
        this.users = users;
    }

    @Transactional
    public ReportResponse create(UUID reporterId, CreateReportRequest request, List<MultipartFile> files) {
        if (files.size() > ReportPhotoUpload.MAX_PHOTOS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attach up to five photos");
        }
        User reporter = requireUser(reporterId);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        String reference = String.format(Locale.ROOT, "ENG-%d-%04d", now.getYear(), reports.nextReferenceNumber());
        Report report = reports.save(new Report(reference, request, reporter, now));
        timeline.save(new ReportTimelineEntry(report, reporter, "created", "Report submitted",
                "The report was submitted.", report.getStatus(), now));
        for (MultipartFile file : files) {
            photos.save(ReportPhotoUpload.read(report, file, now));
        }
        return ReportResponse.from(report, reporterId);
    }

    public List<ReportResponse> list(UUID viewerId) {
        User viewer = requireUser(viewerId);
        List<Report> visible = switch (viewer.getRole()) {
            case "admin" -> reports.findAllByOrderByCreatedAtDesc();
            case "technician" -> reports.findAllByReporter_IdOrAssignee_IdOrderByCreatedAtDesc(viewerId, viewerId);
            default -> reports.findAllByReporter_IdOrderByCreatedAtDesc(viewerId);
        };
        return visible.stream().map(report -> ReportResponse.from(report, viewerId)).toList();
    }

    public ReportResponse get(UUID viewerId, UUID id) {
        return ReportResponse.from(requireVisibleReport(requireUser(viewerId), id), viewerId);
    }

    public List<ReportTimelineResponse> timeline(UUID viewerId, UUID id) {
        requireVisibleReport(requireUser(viewerId), id);
        return timeline.findAllByReport_IdOrderByCreatedAtAscIdAsc(id).stream()
                .map(ReportTimelineResponse::from)
                .toList();
    }

    public List<ReportPhotoResponse> photos(UUID viewerId, UUID reportId) {
        requireVisibleReport(requireUser(viewerId), reportId);
        return photos.listForReport(reportId);
    }

    public ReportPhoto photo(UUID viewerId, UUID reportId, UUID photoId) {
        requireVisibleReport(requireUser(viewerId), reportId);
        return photos.findByIdAndReport_Id(photoId, reportId).orElseThrow(ReportService::notFound);
    }

    public List<ReportCommentResponse> comments(UUID viewerId, UUID id) {
        Report report = requireVisibleReport(requireUser(viewerId), id);
        return comments.findAllByReport_IdOrderByCreatedAtAscIdAsc(id).stream()
                .map(comment -> ReportCommentResponse.from(comment, id, report.getReporterId(), viewerId))
                .toList();
    }

    @Transactional
    public ReportCommentResponse addComment(UUID viewerId, UUID id, String message) {
        User author = requireUser(viewerId);
        Report report = reports.findForUpdate(id)
                .filter(candidate -> canView(author, candidate))
                .orElseThrow(ReportService::notFound);
        ReportComment comment = comments.save(new ReportComment(report, author, message.strip(),
                LocalDateTime.now(ZoneOffset.UTC)));
        return ReportCommentResponse.from(comment, id, report.getReporterId(), viewerId);
    }

    public List<TechnicianOption> technicians(UUID viewerId) {
        requireAdmin(viewerId);
        return users.findAllByRoleOrderByFullNameAsc("technician").stream()
                .map(user -> new TechnicianOption(user.getId(), user.getFullName(), user.getRole()))
                .toList();
    }

    public record TechnicianOption(UUID id, String fullName, String role) {}

    @Transactional
    public ReportResponse unassign(UUID viewerId, UUID id) {
        User admin = requireAdmin(viewerId);
        Report report = reports.findForUpdate(id).orElseThrow(ReportService::notFound);
        if (report.getAssigneeId() != null) {
            LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
            report.assign(null, now);
            timeline.save(new ReportTimelineEntry(report, admin, "assigned", "Technician unassigned",
                    "The technician was removed from this report.", null, now));
        }
        return ReportResponse.from(report, viewerId);
    }

    @Transactional
    public ReportResponse assign(UUID viewerId, UUID id, UUID technicianId) {
        User admin = requireAdmin(viewerId);

        Report report = reports.findForUpdate(id).orElseThrow(ReportService::notFound);
        User technician = users.findById(technicianId)
                .filter(user -> "technician".equals(user.getRole()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a technician"));
        if (technicianId.equals(report.getAssigneeId())) {
            return ReportResponse.from(report, viewerId);
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        report.assign(technician, now);
        timeline.save(new ReportTimelineEntry(report, admin, "assigned", "Technician assigned",
                "The report was assigned to a technician.", null, now));
        return ReportResponse.from(report, viewerId);
    }

    @Transactional
    public ReportResponse updateStatus(UUID viewerId, UUID id, UpdateReportStatusRequest request) {
        User viewer = requireUser(viewerId);
        if (!"admin".equals(viewer.getRole()) && !"technician".equals(viewer.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        Report report = reports.findForUpdate(id).orElseThrow(ReportService::notFound);
        if (!"admin".equals(viewer.getRole()) && !viewerId.equals(report.getAssigneeId())) {
            throw notFound();
        }

        String status = request.status();
        if (!TRANSITIONS.getOrDefault(report.getStatus(), Set.of()).contains(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This status change is not allowed");
        }
        String note = request.note() == null ? "" : request.note().strip();
        if ("rejected".equals(status) && note.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A rejection reason is required");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        report.changeStatus(status, note, now);
        String type = switch (status) {
            case "resolved", "rejected" -> status;
            default -> "status_changed";
        };
        timeline.save(new ReportTimelineEntry(report, viewer, type, "Report status updated",
                note.isEmpty() ? "New status: " + status : note, status, now));
        return ReportResponse.from(report, viewerId);
    }

    private User requireAdmin(UUID viewerId) {
        User user = requireUser(viewerId);
        if (!"admin".equals(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return user;
    }

    private User requireUser(UUID id) {
        return users.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private Report requireVisibleReport(User viewer, UUID id) {
        return reports.findById(id)
                .filter(report -> canView(viewer, report))
                .orElseThrow(ReportService::notFound);
    }

    private static boolean canView(User viewer, Report report) {
        return "admin".equals(viewer.getRole())
                || viewer.getId().equals(report.getReporterId())
                || ("technician".equals(viewer.getRole()) && viewer.getId().equals(report.getAssigneeId()));
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
}
