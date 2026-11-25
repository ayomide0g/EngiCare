package com.engicare.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AssignReportRequest(@NotNull UUID assigneeId) {}
