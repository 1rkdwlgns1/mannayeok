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
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "member_social_accounts")
public class MemberSocialAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SocialProvider provider;

    @Column(name = "provider_user_id", nullable = false, length = 100)
    private String providerUserId;

    @Column(name = "refresh_token_ciphertext", columnDefinition = "TEXT")
    private String refreshTokenCiphertext;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected MemberSocialAccount() {
    }

    public MemberSocialAccount(Member member, SocialProvider provider, String providerUserId) {
        this(member, provider, providerUserId, null);
    }

    public MemberSocialAccount(Member member, SocialProvider provider, String providerUserId, String refreshTokenCiphertext) {
        this.member = member;
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.refreshTokenCiphertext = refreshTokenCiphertext;
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Member getMember() {
        return member;
    }

    public String getProviderUserId() {
        return providerUserId;
    }

    public SocialProvider getProvider() { return provider; }
    public String getRefreshTokenCiphertext() { return refreshTokenCiphertext; }
    public void updateRefreshToken(String refreshTokenCiphertext) {
        if (refreshTokenCiphertext != null && !refreshTokenCiphertext.isBlank()) {
            this.refreshTokenCiphertext = refreshTokenCiphertext;
        }
    }
}
