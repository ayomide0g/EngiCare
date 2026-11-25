package com.engicare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateReportCommentRequest(@NotBlank @Size(max = 500) String message) {}
