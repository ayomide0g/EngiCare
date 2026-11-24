package com.engicare.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateReportRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 5000) String description,
        @NotBlank @Pattern(regexp = "electrical|plumbing|hvac|furniture|it_equipment|lab_equipment|internet|cleanliness|safety|structural|other") String category,
        @NotBlank @Pattern(regexp = "low|medium|high|urgent") String priority,
        @Valid @NotNull Location location
) {
    public record Location(
            @NotBlank @Pattern(regexp = "main|civil|mechanical|electrical|computer|chemical|labs|library") String buildingId,
            @NotNull Integer floor,
            @NotBlank @Size(max = 255) String room
    ) {}
}
