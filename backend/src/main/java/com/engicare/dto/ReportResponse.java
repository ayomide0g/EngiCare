package com.engicare.dto;

import com.engicare.entity.Report;
import java.time.LocalDateTime;
import java.util.UUID;

public record ReportResponse(
        UUID id,
        String referenceNumber,
        String title,
        String description,
        String category,
        String priority,
        String status,
        Location location,
        LocalDateTime createdAt,
        UUID assigneeId,
        String assigneeName,
        boolean isOwnReport,
        String rejectionReason,
        LocalDateTime resolvedAt,
        LocalDateTime updatedAt
) {
    public record Location(String buildingId, int floor, String room) {}

    public static ReportResponse from(Report report, UUID viewerId) {
        return new ReportResponse(report.getId(), report.getReferenceNumber(),
                report.getTitle(), report.getDescription(), report.getCategory(),
                report.getPriority(), report.getStatus(),
                new Location(report.getBuildingId(), report.getFloor(), report.getRoom()),
                report.getCreatedAt(), report.getAssigneeId(), report.getAssigneeName(),
                viewerId.equals(report.getReporterId()), report.getRejectionReason(),
                report.getResolvedAt(), report.getUpdatedAt());
    }
}
