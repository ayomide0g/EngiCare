package com.engicare.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "report_photos")
public class ReportPhoto {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_id", nullable = false)
    private Report report;

    @Column(nullable = false)
    private String fileName;
    @Column(nullable = false)
    private String mimeType;
    @Column(nullable = false)
    private int sizeBytes;
    @Column(nullable = false)
    private LocalDateTime uploadedAt;
    @Column(nullable = false, length = 5 * 1024 * 1024)
    private byte[] content;

    protected ReportPhoto() {}

    public ReportPhoto(Report report, String fileName, String mimeType, byte[] content, LocalDateTime uploadedAt) {
        this.report = report;
        this.fileName = fileName;
        this.mimeType = mimeType;
        this.sizeBytes = content.length;
        this.content = content;
        this.uploadedAt = uploadedAt;
    }

    public String getMimeType() { return mimeType; }
    public byte[] getContent() { return content; }
}
