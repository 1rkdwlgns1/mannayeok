package com.mannayeok.backend.auth;

import java.time.LocalDateTime;
import java.util.Locale;

import com.mannayeok.backend.auth.dto.AuthResponse;
import com.mannayeok.backend.auth.dto.LoginRequest;
import com.mannayeok.backend.auth.dto.MemberResponse;
import com.mannayeok.backend.auth.dto.SignupRequest;
import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.member.Member;
import com.mannayeok.backend.member.MemberRepository;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final String TERMS_VERSION = "2026-08-04";

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
        MemberRepository memberRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService
    ) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional(readOnly = true)
    public boolean isEmailAvailable(String rawEmail) {
        return !memberRepository.existsByEmail(normalizeEmail(rawEmail));
    }

    @Transactional
    public MemberResponse signup(SignupRequest request) {
        String email = normalizeEmail(request.email());
        if (memberRepository.existsByEmail(email)) {
            throw duplicateEmail();
        }

        Member member = new Member(
            email,
            passwordEncoder.encode(request.password())
        );
        member.recordSignupConsent(TERMS_VERSION, LocalDateTime.now());

        try {
            return MemberResponse.from(memberRepository.save(member));
        } catch (DataIntegrityViolationException exception) {
            throw duplicateEmail();
        }
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Member member = memberRepository.findByEmail(normalizeEmail(request.email()))
            .orElseThrow(AuthService::invalidCredentials);

        if (!passwordEncoder.matches(request.password(), member.getPasswordHash())) {
            throw invalidCredentials();
        }

        JwtService.IssuedToken token = jwtService.issue(member);
        return new AuthResponse(
            token.value(),
            "Bearer",
            token.expiresIn(),
            MemberResponse.from(member)
        );
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static AuthException duplicateEmail() {
        return new AuthException(
            "EMAIL_ALREADY_EXISTS",
            HttpStatus.CONFLICT,
            "이미 가입된 이메일이에요."
        );
    }

    private static AuthException invalidCredentials() {
        return new AuthException(
            "INVALID_CREDENTIALS",
            HttpStatus.UNAUTHORIZED,
            "이메일 또는 비밀번호가 올바르지 않아요."
        );
    }
}
