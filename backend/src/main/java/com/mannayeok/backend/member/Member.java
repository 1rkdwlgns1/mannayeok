package com.mannayeok.backend.member;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "members")
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(length = 20)
    private String nickname;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;

    @Column(name = "terms_version", length = 20)
    private String termsVersion;

    @Column(name = "terms_agreed_at")
    private LocalDateTime termsAgreedAt;

    @Column(name = "privacy_agreed_at")
    private LocalDateTime privacyAgreedAt;

    @Column(name = "age_confirmed_at")
    private LocalDateTime ageConfirmedAt;

    @Column(name = "token_version", nullable = false)
    private long tokenVersion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Member() {
    }

    public Member(String email, String passwordHash) {
        this.email = email;
        this.passwordHash = passwordHash;
    }

    public Member(String email, String passwordHash, String nickname) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.nickname = nickname;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void recordSignupConsent(String termsVersion, LocalDateTime agreedAt) {
        this.termsVersion = termsVersion;
        this.termsAgreedAt = agreedAt;
        this.privacyAgreedAt = agreedAt;
        this.ageConfirmedAt = agreedAt;
    }

    public void changePassword(String passwordHash) {
        this.passwordHash = passwordHash;
        this.tokenVersion++;
    }

    public String getNickname() {
        return nickname;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public String getTermsVersion() {
        return termsVersion;
    }

    public LocalDateTime getTermsAgreedAt() {
        return termsAgreedAt;
    }

    public LocalDateTime getPrivacyAgreedAt() {
        return privacyAgreedAt;
    }

    public LocalDateTime getAgeConfirmedAt() {
        return ageConfirmedAt;
    }

    public long getTokenVersion() {
        return tokenVersion;
    }
}
