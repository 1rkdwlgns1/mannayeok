package com.mannayeok.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.member.Member;
import com.mannayeok.backend.member.MemberRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

class PasswordResetServiceTest {

    private static final ZoneId SEOUL_ZONE = ZoneId.of("Asia/Seoul");
    private static final Clock FIXED_CLOCK = Clock.fixed(
        Instant.parse("2026-08-04T00:00:00Z"),
        SEOUL_ZONE
    );

    private MemberRepository memberRepository;
    private PasswordResetTokenRepository tokenRepository;
    private PasswordEncoder passwordEncoder;
    private PasswordResetMailService mailService;
    private PasswordResetService service;

    @BeforeEach
    void setUp() {
        memberRepository = mock(MemberRepository.class);
        tokenRepository = mock(PasswordResetTokenRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        mailService = mock(PasswordResetMailService.class);
        PasswordResetProperties properties = new PasswordResetProperties(
            true,
            "http://localhost:5173",
            30,
            60,
            "sender@example.com"
        );
        service = new PasswordResetService(
            memberRepository,
            tokenRepository,
            passwordEncoder,
            mailService,
            properties,
            FIXED_CLOCK
        );
    }

    @Test
    void storesOnlyAHashAndSendsTheRawToken() {
        Member member = member(7L, "user@example.com");
        when(memberRepository.findByEmail("user@example.com"))
            .thenReturn(Optional.of(member));
        when(tokenRepository.findTopByMember_IdOrderByCreatedAtDesc(7L))
            .thenReturn(Optional.empty());
        when(tokenRepository.findAllByMember_IdAndUsedAtIsNull(7L))
            .thenReturn(List.of());
        when(tokenRepository.save(any(PasswordResetToken.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(mailService.sendPasswordReset(anyString(), anyString())).thenReturn(true);

        service.requestReset(" User@Example.COM ");

        ArgumentCaptor<PasswordResetToken> tokenCaptor =
            ArgumentCaptor.forClass(PasswordResetToken.class);
        ArgumentCaptor<String> rawTokenCaptor = ArgumentCaptor.forClass(String.class);
        verify(tokenRepository).save(tokenCaptor.capture());
        verify(mailService).sendPasswordReset(
            org.mockito.ArgumentMatchers.eq("user@example.com"),
            rawTokenCaptor.capture()
        );
        assertThat(tokenCaptor.getValue().getTokenHash()).hasSize(64);
        assertThat(tokenCaptor.getValue().getTokenHash())
            .isNotEqualTo(rawTokenCaptor.getValue());
        assertThat(tokenCaptor.getValue().getExpiresAt())
            .isEqualTo(LocalDateTime.now(FIXED_CLOCK).plusMinutes(30));
    }

    @Test
    void doesNotRevealOrCreateAnythingForAnUnknownEmail() {
        when(memberRepository.findByEmail("missing@example.com"))
            .thenReturn(Optional.empty());

        service.requestReset("missing@example.com");

        verify(mailService).ensureConfigured();
        verify(tokenRepository, never()).save(any());
        verify(mailService, never()).sendPasswordReset(anyString(), anyString());
    }

    @Test
    void observesTheRequestCooldown() {
        Member member = member(7L, "user@example.com");
        PasswordResetToken recentToken = new PasswordResetToken(
            member,
            "a".repeat(64),
            LocalDateTime.now(FIXED_CLOCK).plusMinutes(30),
            LocalDateTime.now(FIXED_CLOCK).minusSeconds(30)
        );
        when(memberRepository.findByEmail("user@example.com"))
            .thenReturn(Optional.of(member));
        when(tokenRepository.findTopByMember_IdOrderByCreatedAtDesc(7L))
            .thenReturn(Optional.of(recentToken));

        service.requestReset("user@example.com");

        verify(tokenRepository, never()).save(any());
        verify(mailService, never()).sendPasswordReset(anyString(), anyString());
    }

    @Test
    void hashesTheNewPasswordAndConsumesOutstandingTokens() {
        Member member = member(7L, "user@example.com");
        PasswordResetToken token = new PasswordResetToken(
            member,
            "b".repeat(64),
            LocalDateTime.now(FIXED_CLOCK).plusMinutes(5),
            LocalDateTime.now(FIXED_CLOCK).minusMinutes(1)
        );
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));
        when(tokenRepository.findAllByMember_IdAndUsedAtIsNull(7L))
            .thenReturn(List.of(token));
        when(passwordEncoder.encode("newPassword1")).thenReturn("new-bcrypt-hash");

        service.resetPassword("raw-reset-token", "newPassword1");

        verify(member).changePassword("new-bcrypt-hash");
        assertThat(token.getUsedAt()).isEqualTo(LocalDateTime.now(FIXED_CLOCK));
    }

    @Test
    void rejectsAnExpiredToken() {
        Member member = member(7L, "user@example.com");
        PasswordResetToken token = new PasswordResetToken(
            member,
            "c".repeat(64),
            LocalDateTime.now(FIXED_CLOCK).minusSeconds(1),
            LocalDateTime.now(FIXED_CLOCK).minusMinutes(31)
        );
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));

        assertThatThrownBy(() ->
            service.resetPassword("expired-token", "newPassword1")
        )
            .isInstanceOf(AuthException.class)
            .satisfies(exception -> assertThat(((AuthException) exception).getCode())
                .isEqualTo("PASSWORD_RESET_TOKEN_INVALID"));
    }

    private Member member(Long id, String email) {
        Member member = mock(Member.class);
        when(member.getId()).thenReturn(id);
        when(member.getEmail()).thenReturn(email);
        return member;
    }
}
