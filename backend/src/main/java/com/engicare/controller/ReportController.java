package com.engicare.controller;

import com.engicare.dto.AssignReportRequest;
import com.engicare.dto.CreateReportRequest;
import com.engicare.dto.CreateReportCommentRequest;
import com.engicare.dto.ReportCommentResponse;
import com.engicare.dto.ReportTimelineResponse;
import com.engicare.dto.UpdateReportStatusRequest;
import com.engicare.dto.ReportResponse;
import com.engicare.dto.ReportPhotoResponse;
import com.engicare.entity.ReportPhoto;
import com.engicare.service.ReportService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
public class ReportController {
    private final ReportService reports;

    public ReportController(ReportService reports) {
        this.reports = reports;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ReportResponse> create(@AuthenticationPrincipal Jwt jwt,
                                                  @Valid @RequestBody CreateReportRequest request) {
        ReportResponse report = reports.create(UUID.fromString(jwt.getSubject()), request, List.of());
        return ResponseEntity.created(URI.create("/api/reports/" + report.id())).body(report);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReportResponse> createWithPhotos(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestPart("report") CreateReportRequest request,
            @RequestPart("photos") List<MultipartFile> photos) {
        ReportResponse report = reports.create(UUID.fromString(jwt.getSubject()), request, photos);
        return ResponseEntity.created(URI.create("/api/reports/" + report.id())).body(report);
    }

    @GetMapping("/{id}/photos")
    public List<ReportPhotoResponse> photos(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return reports.photos(UUID.fromString(jwt.getSubject()), id);
    }

    @GetMapping("/{id}/photos/{photoId}")
    public ResponseEntity<byte[]> photo(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                        @PathVariable UUID photoId) {
        ReportPhoto photo = reports.photo(UUID.fromString(jwt.getSubject()), id, photoId);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType(photo.getMimeType()))
                .body(photo.getContent());
    }

    @GetMapping
    public List<ReportResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return reports.list(UUID.fromString(jwt.getSubject()));
    }

    @GetMapping("/{id}")
    public ReportResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return reports.get(UUID.fromString(jwt.getSubject()), id);
    }

    @GetMapping("/technicians")
    public List<ReportService.TechnicianOption> technicians(@AuthenticationPrincipal Jwt jwt) {
        return reports.technicians(UUID.fromString(jwt.getSubject()));
    }

    @DeleteMapping("/{id}/assignee")
    public ReportResponse unassign(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return reports.unassign(UUID.fromString(jwt.getSubject()), id);
    }

    @PatchMapping("/{id}/assignee")
    public ReportResponse assign(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                 @Valid @RequestBody AssignReportRequest request) {
        return reports.assign(UUID.fromString(jwt.getSubject()), id, request.assigneeId());
    }

    @PatchMapping("/{id}/status")
    public ReportResponse updateStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                       @Valid @RequestBody UpdateReportStatusRequest request) {
        return reports.updateStatus(UUID.fromString(jwt.getSubject()), id, request);
    }

    @GetMapping("/{id}/comments")
    public List<ReportCommentResponse> comments(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return reports.comments(UUID.fromString(jwt.getSubject()), id);
    }

    @PostMapping("/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public ReportCommentResponse addComment(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                            @Valid @RequestBody CreateReportCommentRequest request) {
        return reports.addComment(UUID.fromString(jwt.getSubject()), id, request.message());
    }

    @GetMapping("/{id}/timeline")
    public List<ReportTimelineResponse> timeline(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return reports.timeline(UUID.fromString(jwt.getSubject()), id);
    }
}
