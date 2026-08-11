package com.mannayeok.backend.meeting;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.mannayeok.backend.share.SharedResultType;

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
@Table(name = "collaborative_meetings")
public class CollaborativeMeeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_member_id", nullable = false)
    private Long ownerMemberId;

    @Column(name = "source_saved_recommendation_id")
    private Long sourceSavedRecommendationId;

    @Column(name = "invite_code", nullable = false, unique = true, length = 32)
    private String inviteCode;

    @Column(nullable = false, length = 60)
    private String name;

    @Column(name = "meeting_date")
    private LocalDate meetingDate;

    @Column(name = "meeting_time")
    private LocalTime meetingTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "result_type", nullable = false, length = 20)
    private SharedResultType resultType;

    @Column(nullable = false, columnDefinition = "MEDIUMTEXT")
    private String payload;

    @Column(name = "station_name", nullable = false, length = 100)
    private String stationName;

    @Column(name = "station_lines", nullable = false, length = 500)
    private String stationLines;

    @Column(name = "needs_recommendation", nullable = false)
    private boolean needsRecommendation;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected CollaborativeMeeting() {
    }

    public CollaborativeMeeting(
        Long ownerMemberId,
        Long sourceSavedRecommendationId,
        String inviteCode,
        String name,
        LocalDate meetingDate,
        LocalTime meetingTime,
        SharedResultType resultType,
        String payload,
        String stationName,
        String stationLines
    ) {
        this.ownerMemberId = ownerMemberId;
        this.sourceSavedRecommendationId = sourceSavedRecommendationId;
        this.inviteCode = inviteCode;
        this.name = name;
        this.meetingDate = meetingDate;
        this.meetingTime = meetingTime;
        this.resultType = resultType;
        this.payload = payload;
        this.stationName = stationName;
        this.stationLines = stationLines;
        this.needsRecommendation = true;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void markParticipantsChanged() {
        needsRecommendation = true;
        updatedAt = LocalDateTime.now();
    }

    public void updateResult(
        SharedResultType resultType,
        String payload,
        String stationName,
        String stationLines
    ) {
        this.resultType = resultType;
        this.payload = payload;
        this.stationName = stationName;
        this.stationLines = stationLines;
        this.needsRecommendation = false;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getOwnerMemberId() { return ownerMemberId; }
    public Long getSourceSavedRecommendationId() { return sourceSavedRecommendationId; }
    public String getInviteCode() { return inviteCode; }
    public String getName() { return name; }
    public LocalDate getMeetingDate() { return meetingDate; }
    public LocalTime getMeetingTime() { return meetingTime; }
    public SharedResultType getResultType() { return resultType; }
    public String getPayload() { return payload; }
    public String getStationName() { return stationName; }
    public String getStationLines() { return stationLines; }
    public boolean isNeedsRecommendation() { return needsRecommendation; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
