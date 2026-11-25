package com.engicare.entity;

import com.engicare.dto.CreateReportRequest;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "reports")
public class Report {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String referenceNumber;
    @Column(nullable = false)
    private String title;
    @Column(nullable = false, columnDefinition = "text")
    private String description;
    @Column(nullable = false)
    private String category;
    @Column(nullable = false)
    private String priority;
    @Column(nullable = false)
    private String status;
    @Column(nullable = false)
    private String buildingId;
    @Column(nullable = false)
    private int floor;
    @Column(nullable = false)
    private String room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Column(columnDefinition = "text")
    private String rejectionReason;
    private LocalDateTime resolvedAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    protected Report() {}

    public Report(String referenceNumber, CreateReportRequest request, User reporter, LocalDateTime now) {
        this.referenceNumber = referenceNumber;
        this.title = request.title().strip();
        this.description = request.description().strip();
        this.category = request.category();
        this.priority = request.priority();
        this.status = "pending";
        this.buildingId = request.location().buildingId();
        this.floor = request.location().floor();
        this.room = request.location().room().strip();
        this.reporter = reporter;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void assign(User technician, LocalDateTime now) {
        this.assignee = technician;
        this.updatedAt = now;
    }

    public void changeStatus(String status, String note, LocalDateTime now) {
        this.status = status;
        this.rejectionReason = "rejected".equals(status) ? note : null;
        this.resolvedAt = "resolved".equals(status) ? now : null;
        this.updatedAt = now;
    }

    public UUID getReporterId() { return reporter.getId(); }
    public UUID getAssigneeId() { return assignee == null ? null : assignee.getId(); }
    public String getAssigneeName() { return assignee == null ? null : assignee.getFullName(); }
    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public String getRejectionReason() { return rejectionReason; }

    public UUID getId() { return id; }
    public String getReferenceNumber() { return referenceNumber; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }
    public String getPriority() { return priority; }
    public String getStatus() { return status; }
    public String getBuildingId() { return buildingId; }
    public int getFloor() { return floor; }
    public String getRoom() { return room; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
