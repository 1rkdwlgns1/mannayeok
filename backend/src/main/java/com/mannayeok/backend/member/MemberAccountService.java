package com.mannayeok.backend.member;

import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.member.dto.PasswordChangeRequest;
import com.mannayeok.backend.member.dto.MemberDeleteRequest;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberAccountService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final AccountReauthenticationGuard reauthenticationGuard;

    public MemberAccountService(
        MemberRepository memberRepository,
        PasswordEncoder passwordEncoder,
        AccountReauthenticationGuard reauthenticationGuard
    ) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.reauthenticationGuard = reauthenticationGuard;
    }

    @Transactional
    public void changePassword(Long memberId, PasswordChangeRequest request) {
        Member member = memberRepository.findById(memberId)
            .orElseThrow(MemberAccountService::memberNotFound);

        reauthenticationGuard.ensureAllowed(memberId);
        if (!passwordEncoder.matches(request.currentPassword(), member.getPasswordHash())) {
            reauthenticationGuard.recordFailure(memberId);
            throw new AuthException(
                "CURRENT_PASSWORD_MISMATCH",
                HttpStatus.UNAUTHORIZED,
                "현재 비밀번호가 일치하지 않아요."
            );
        }
        reauthenticationGuard.reset(memberId);

        if (passwordEncoder.matches(request.newPassword(), member.getPasswordHash())) {
            throw new AuthException(
                "PASSWORD_UNCHANGED",
                HttpStatus.BAD_REQUEST,
                "현재 비밀번호와 다른 새 비밀번호를 입력해 주세요."
            );
        }

        member.changePassword(passwordEncoder.encode(request.newPassword()));
        memberRepository.save(member);
    }

    @Transactional
    public void deleteMember(Long memberId, MemberDeleteRequest request) {
        Member member = memberRepository.findById(memberId)
            .orElseThrow(MemberAccountService::memberNotFound);

        reauthenticationGuard.ensureAllowed(memberId);
        if (!passwordEncoder.matches(request.currentPassword(), member.getPasswordHash())) {
            reauthenticationGuard.recordFailure(memberId);
            throw new AuthException(
                "CURRENT_PASSWORD_MISMATCH",
                HttpStatus.UNAUTHORIZED,
                "현재 비밀번호가 일치하지 않아요."
            );
        }

        reauthenticationGuard.reset(memberId);
        memberRepository.delete(member);
    }

    private static AuthException memberNotFound() {
        return new AuthException(
            "MEMBER_NOT_FOUND",
            HttpStatus.UNAUTHORIZED,
            "로그인 정보가 유효하지 않아요. 다시 로그인해 주세요."
        );
    }
}
