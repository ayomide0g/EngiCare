package com.engicare.dto;

import com.engicare.entity.ReportTimelineEntry;
import java.time.LocalDateTime;
import java.util.UUID;

public record ReportTimelineResponse(UUID id, String type, String title, String message,
                                     String status, LocalDateTime createdAt) {
    public static ReportTimelineResponse from(ReportTimelineEntry entry) {
        return new ReportTimelineResponse(entry.getId(), entry.getType(), entry.getTitle(),
                entry.getMessage(), entry.getStatus(), entry.getCreatedAt());
    }
}
