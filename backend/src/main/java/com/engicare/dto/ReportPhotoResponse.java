package com.engicare.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReportPhotoResponse(UUID id, String fileName, String mimeType, int sizeBytes,
                                  LocalDateTime uploadedAt) {}
