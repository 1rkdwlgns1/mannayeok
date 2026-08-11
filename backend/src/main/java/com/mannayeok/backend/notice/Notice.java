package com.mannayeok.backend.notice;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "notices")
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NoticeStatus status;

    @Column(nullable = false, length = 500)
    private String summary;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String details;

    @Column(length = 500)
    private String note;

    @Column(nullable = false)
    private boolean published;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Notice() {
    }

    public Notice(String title, NoticeStatus status, String summary, String details, String note, boolean published) {
        update(title, status, summary, details, note, published);
    }

    public void update(String title, NoticeStatus status, String summary, String details, String note, boolean published) {
        this.title = title.trim();
        this.status = status;
        this.summary = summary.trim();
        this.details = details.trim();
        this.note = note == null || note.isBlank() ? null : note.trim();
        if (published && !this.published) this.publishedAt = LocalDateTime.now();
        if (!published) this.publishedAt = null;
        this.published = published;
    }

    public void moveToTrash() {
        deletedAt = LocalDateTime.now();
    }

    public void restore() {
        deletedAt = null;
    }

    public void setPublishedDate(LocalDate publishedDate) {
        if (!published) {
            publishedAt = null;
            return;
        }
        if (publishedDate != null) publishedAt = publishedDate.atStartOfDay();
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (published && publishedAt == null) publishedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public NoticeStatus getStatus() { return status; }
    public String getSummary() { return summary; }
    public String getDetails() { return details; }
    public String getNote() { return note; }
    public boolean isPublished() { return published; }
    public LocalDateTime getPublishedAt() { return publishedAt; }
    public LocalDateTime getDeletedAt() { return deletedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
