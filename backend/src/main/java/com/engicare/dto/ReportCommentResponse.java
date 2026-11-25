package com.engicare.dto;

import com.engicare.entity.ReportComment;
import java.time.LocalDateTime;
import java.util.UUID;

public record ReportCommentResponse(
        UUID id, UUID reportId, String message, LocalDateTime createdAt, Author author
) {
    public record Author(UUID id, String displayName, String role, boolean isMasked) {}

    public static ReportCommentResponse from(ReportComment comment, UUID reportId,
                                             UUID reporterId, UUID viewerId) {
        var user = comment.getAuthor();
        boolean hideReporter = user.getId().equals(reporterId) && !viewerId.equals(reporterId);
        Author author = hideReporter
                ? new Author(null, "Reporter", null, true)
                : new Author(user.getId(), user.getFullName(), user.getRole(), false);
        return new ReportCommentResponse(
                comment.getId(), reportId, comment.getContent(), comment.getCreatedAt(), author);
    }
}
