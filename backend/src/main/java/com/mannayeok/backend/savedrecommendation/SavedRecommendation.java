package com.mannayeok.backend.savedrecommendation;

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
@Table(name = "saved_recommendations")
public class SavedRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(nullable = false, length = 60)
    private String name;

    @Column(length = 500)
    private String memo;

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

    @Column(name = "origin_names", nullable = false, columnDefinition = "TEXT")
    private String originNames;

    @Column(name = "station_lines", nullable = false, length = 500)
    private String stationLines;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected SavedRecommendation() {
    }

    public SavedRecommendation(
        Long memberId,
        String name,
        String memo,
        LocalDate meetingDate,
        LocalTime meetingTime,
        SharedResultType resultType,
        String payload,
        String stationName,
        String originNames,
        String stationLines
    ) {
        this.memberId = memberId;
        this.name = name;
        this.memo = memo;
        this.meetingDate = meetingDate;
        this.meetingTime = meetingTime;
        this.resultType = resultType;
        this.payload = payload;
        this.stationName = stationName;
        this.originNames = originNames;
        this.stationLines = stationLines;
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

    public void updateSchedule(String name, String memo, LocalDate meetingDate, LocalTime meetingTime) {
        this.name = name;
        this.memo = memo;
        this.meetingDate = meetingDate;
        this.meetingTime = meetingTime;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getMemberId() { return memberId; }
    public String getName() { return name; }
    public String getMemo() { return memo; }
    public LocalDate getMeetingDate() { return meetingDate; }
    public LocalTime getMeetingTime() { return meetingTime; }
    public SharedResultType getResultType() { return resultType; }
    public String getPayload() { return payload; }
    public String getStationName() { return stationName; }
    public String getOriginNames() { return originNames; }
    public String getStationLines() { return stationLines; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
