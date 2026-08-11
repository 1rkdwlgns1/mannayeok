package com.mannayeok.backend.admin;

import com.mannayeok.backend.admin.dto.AdminVerificationResponse;
import com.mannayeok.backend.admin.dto.AdminVerificationStatusResponse;
import com.mannayeok.backend.auth.JwtService;
import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.member.Member;
import com.mannayeok.backend.member.MemberRepository;
import com.mannayeok.backend.member.MemberRole;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminVerificationService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AdminVerificationAttemptGuard attemptGuard;

    public AdminVerificationService(
        MemberRepository memberRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService,
        AdminVerificationAttemptGuard attemptGuard
    ) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.attemptGuard = attemptGuard;
    }

    @Transactional(readOnly = true)
    public AdminVerificationStatusResponse status(Long memberId) {
        return new AdminVerificationStatusResponse(requireAdmin(memberId).hasAdminSecondaryPassword());
    }

    @Transactional
    public AdminVerificationResponse setup(Long memberId, String password, String passwordConfirmation) {
        Member member = requireAdmin(memberId);
        if (member.hasAdminSecondaryPassword()) {
            throw new AuthException(
                "ADMIN_SECONDARY_PASSWORD_ALREADY_CONFIGURED",
                HttpStatus.CONFLICT,
                "관리자 2차 비밀번호가 이미 설정되어 있습니다."
            );
        }
        if (!password.equals(passwordConfirmation)) {
            throw new AuthException(
                "ADMIN_SECONDARY_PASSWORD_CONFIRMATION_MISMATCH",
                HttpStatus.BAD_REQUEST,
                "관리자 2차 비밀번호 확인이 일치하지 않습니다."
            );
        }

        member.setInitialAdminSecondaryPassword(passwordEncoder.encode(password));
        memberRepository.saveAndFlush(member);
        attemptGuard.reset(memberId);
        return issueVerifiedToken(member);
    }

    @Transactional(readOnly = true)
    public AdminVerificationResponse verify(Long memberId, String password) {
        Member member = requireAdmin(memberId);
        if (!member.hasAdminSecondaryPassword()) {
            throw new AuthException(
                "ADMIN_SECONDARY_PASSWORD_NOT_CONFIGURED",
                HttpStatus.CONFLICT,
                "관리자 2차 비밀번호를 먼저 설정해 주세요."
            );
        }

        attemptGuard.ensureAllowed(memberId);
        boolean matches;
        try {
            matches = passwordEncoder.matches(password, member.getAdminSecondaryPasswordHash());
        } catch (IllegalArgumentException exception) {
            throw new AuthException(
                "ADMIN_SECONDARY_PASSWORD_NOT_CONFIGURED",
                HttpStatus.SERVICE_UNAVAILABLE,
                "관리자 2차 비밀번호 설정을 확인해 주세요."
            );
        }
        if (!matches) {
            attemptGuard.recordFailure(memberId);
            throw new AuthException(
                "ADMIN_SECONDARY_PASSWORD_MISMATCH",
                HttpStatus.UNAUTHORIZED,
                "관리자 2차 비밀번호가 일치하지 않습니다."
            );
        }

        attemptGuard.reset(memberId);
        return issueVerifiedToken(member);
    }

    private Member requireAdmin(Long memberId) {
        Member member = memberRepository.findById(memberId)
            .orElseThrow(() -> new AuthException(
                "MEMBER_NOT_FOUND", HttpStatus.UNAUTHORIZED, "회원 정보를 찾을 수 없습니다."
            ));
        if (member.getRole() != MemberRole.ADMIN) {
            throw new AuthException("ADMIN_REQUIRED", HttpStatus.FORBIDDEN, "관리자만 이용할 수 있습니다.");
        }
        return member;
    }

    private AdminVerificationResponse issueVerifiedToken(Member member) {
        JwtService.IssuedToken token = jwtService.issueAdminVerified(member);
        return new AdminVerificationResponse(token.value(), "Bearer", token.expiresIn());
    }
}
