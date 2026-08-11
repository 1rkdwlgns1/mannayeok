package com.mannayeok.backend.auth.oauth;

import java.time.LocalDateTime;

import com.mannayeok.backend.member.Member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "oauth_login_tickets")
public class OAuthLoginTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SocialProvider provider;

    @Column(name = "provider_user_id", nullable = false, length = 100)
    private String providerUserId;

    @Column(length = 255)
    private String email;

    @Column(name = "refresh_token_ciphertext", columnDefinition = "TEXT")
    private String refreshTokenCiphertext;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected OAuthLoginTicket() {
    }

    public OAuthLoginTicket(
        String tokenHash,
        SocialProvider provider,
        String providerUserId,
        String email,
        String refreshTokenCiphertext,
        Member member,
        LocalDateTime expiresAt,
        LocalDateTime createdAt
    ) {
        this.tokenHash = tokenHash;
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.email = email;
        this.refreshTokenCiphertext = refreshTokenCiphertext;
        this.member = member;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }

    public SocialProvider getProvider() { return provider; }
    public String getProviderUserId() { return providerUserId; }
    public String getEmail() { return email; }
    public String getRefreshTokenCiphertext() { return refreshTokenCiphertext; }
    public Member getMember() { return member; }

    public boolean isUsableAt(LocalDateTime now) {
        return usedAt == null && expiresAt.isAfter(now);
    }

    public void markUsed(LocalDateTime now) {
        usedAt = now;
    }
}
