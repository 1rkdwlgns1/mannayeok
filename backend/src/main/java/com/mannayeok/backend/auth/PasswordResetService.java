package com.mannayeok.backend.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.member.Member;
import com.mannayeok.backend.member.MemberRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final MemberRepository memberRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetMailService mailService;
    private final PasswordResetProperties properties;
    private final Clock clock;

    public PasswordResetService(
        MemberRepository memberRepository,
        PasswordResetTokenRepository tokenRepository,
        PasswordEncoder passwordEncoder,
        PasswordResetMailService mailService,
        PasswordResetProperties properties,
        Clock clock
    ) {
        this.memberRepository = memberRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional
    public void requestReset(String rawEmail) {
        mailService.ensureConfigured();

        memberRepository.findByEmail(normalizeEmail(rawEmail)).ifPresent(member -> {
            LocalDateTime now = LocalDateTime.now(clock);
            if (isCoolingDown(member, now)) return;

            tokenRepository.findAllByMember_IdAndUsedAtIsNull(member.getId())
                .forEach(token -> token.markUsed(now));

            String rawToken = generateToken();
            PasswordResetToken token = tokenRepository.save(new PasswordResetToken(
                member,
                hashToken(rawToken),
                now.plusMinutes(properties.tokenMinutes()),
                now
            ));

            if (!mailService.sendPasswordReset(member.getEmail(), rawToken)) {
                tokenRepository.delete(token);
            }
        });
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        LocalDateTime now = LocalDateTime.now(clock);
        PasswordResetToken token = tokenRepository.findByTokenHash(hashToken(rawToken))
            .filter(candidate -> candidate.isUsableAt(now))
            .orElseThrow(PasswordResetService::invalidToken);
        Member member = token.getMember();

        member.changePassword(passwordEncoder.encode(newPassword));
        tokenRepository.findAllByMember_IdAndUsedAtIsNull(member.getId())
            .forEach(candidate -> candidate.markUsed(now));
    }

    private boolean isCoolingDown(Member member, LocalDateTime now) {
        return tokenRepository.findTopByMember_IdOrderByCreatedAtDesc(member.getId())
            .map(PasswordResetToken::getCreatedAt)
            .map(createdAt -> createdAt.isAfter(
                now.minusSeconds(properties.cooldownSeconds())
            ))
            .orElse(false);
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static AuthException invalidToken() {
        return new AuthException(
            "PASSWORD_RESET_TOKEN_INVALID",
            HttpStatus.BAD_REQUEST,
            "재설정 링크가 올바르지 않거나 만료됐어요. 다시 요청해 주세요."
        );
    }
}
