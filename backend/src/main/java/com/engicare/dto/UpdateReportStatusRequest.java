package com.engicare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateReportStatusRequest(
        @NotBlank @Pattern(regexp = "pending|under_review|in_progress|resolved|rejected") String status,
        @Size(max = 1000) String note
) {}
