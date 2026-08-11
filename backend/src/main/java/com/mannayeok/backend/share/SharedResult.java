package com.mannayeok.backend.share;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "shared_results")
public class SharedResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "share_code", nullable = false, unique = true, length = 24)
    private String shareCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "result_type", nullable = false, length = 20)
    private SharedResultType resultType;

    @Column(nullable = false, columnDefinition = "MEDIUMTEXT")
    private String payload;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    protected SharedResult() {
    }

    public SharedResult(String shareCode, SharedResultType resultType, String payload) {
        this(shareCode, resultType, payload, LocalDateTime.now().plusDays(30));
    }

    SharedResult(
        String shareCode,
        SharedResultType resultType,
        String payload,
        LocalDateTime expiresAt
    ) {
        this.shareCode = shareCode;
        this.resultType = resultType;
        this.payload = payload;
        this.expiresAt = expiresAt;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (expiresAt == null) expiresAt = createdAt.plusDays(30);
    }

    public boolean isExpired(LocalDateTime now) {
        return !expiresAt.isAfter(now);
    }

    public void renewUntil(LocalDateTime renewedExpiresAt) {
        expiresAt = renewedExpiresAt;
    }

    public String getShareCode() { return shareCode; }
    public SharedResultType getResultType() { return resultType; }
    public String getPayload() { return payload; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
}
