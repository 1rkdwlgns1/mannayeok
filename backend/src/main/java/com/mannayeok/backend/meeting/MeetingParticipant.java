package com.mannayeok.backend.meeting;

import java.time.LocalDateTime;
import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "meeting_participants")
public class MeetingParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "meeting_id", nullable = false)
    private Long meetingId;

    @Column(nullable = false, length = 20)
    private String nickname;

    @Column(name = "origin_name", nullable = false, length = 150)
    private String originName;

    @Column(name = "origin_address", nullable = false, length = 255)
    private String originAddress;

    @Column(name = "origin_lat", nullable = false, precision = 10, scale = 7)
    private BigDecimal originLat;

    @Column(name = "origin_lng", nullable = false, precision = 10, scale = 7)
    private BigDecimal originLng;

    @Column(name = "participant_token_hash", nullable = false, unique = true, length = 64)
    private String participantTokenHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected MeetingParticipant() {
    }

    public MeetingParticipant(
        Long meetingId,
        String nickname,
        String originName,
        String originAddress,
        double originLat,
        double originLng,
        String participantTokenHash
    ) {
        this.meetingId = meetingId;
        this.nickname = nickname;
        this.originName = originName;
        this.originAddress = originAddress;
        this.originLat = BigDecimal.valueOf(originLat);
        this.originLng = BigDecimal.valueOf(originLng);
        this.participantTokenHash = participantTokenHash;
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

    public void update(String nickname, String originName, String originAddress, double originLat, double originLng) {
        this.nickname = nickname;
        this.originName = originName;
        this.originAddress = originAddress;
        this.originLat = BigDecimal.valueOf(originLat);
        this.originLng = BigDecimal.valueOf(originLng);
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getMeetingId() { return meetingId; }
    public String getNickname() { return nickname; }
    public String getOriginName() { return originName; }
    public String getOriginAddress() { return originAddress; }
    public double getOriginLat() { return originLat.doubleValue(); }
    public double getOriginLng() { return originLng.doubleValue(); }
    public String getParticipantTokenHash() { return participantTokenHash; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
