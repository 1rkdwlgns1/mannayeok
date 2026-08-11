package com.mannayeok.backend.member;

import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.auth.oauth.MemberSocialAccountRepository;
import com.mannayeok.backend.auth.oauth.MemberSocialAccount;
import com.mannayeok.backend.auth.oauth.KakaoOAuthClient;
import com.mannayeok.backend.auth.oauth.NaverOAuthClient;
import com.mannayeok.backend.auth.oauth.OAuthTokenCipher;
import com.mannayeok.backend.auth.oauth.SocialProvider;
import com.mannayeok.backend.member.dto.PasswordChangeRequest;
import com.mannayeok.backend.member.dto.MemberDeleteRequest;
import com.mannayeok.backend.member.dto.SocialMemberDeleteRequest;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberAccountService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final AccountReauthenticationGuard reauthenticationGuard;
    private final MemberSocialAccountRepository socialAccountRepository;
    private final KakaoOAuthClient kakaoOAuthClient;
    private final NaverOAuthClient naverOAuthClient;
    private final OAuthTokenCipher tokenCipher;

    public MemberAccountService(
        MemberRepository memberRepository,
        PasswordEncoder passwordEncoder,
        AccountReauthenticationGuard reauthenticationGuard,
        MemberSocialAccountRepository socialAccountRepository,
        KakaoOAuthClient kakaoOAuthClient,
        NaverOAuthClient naverOAuthClient,
        OAuthTokenCipher tokenCipher
    ) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.reauthenticationGuard = reauthenticationGuard;
        this.socialAccountRepository = socialAccountRepository;
        this.kakaoOAuthClient = kakaoOAuthClient;
        this.naverOAuthClient = naverOAuthClient;
        this.tokenCipher = tokenCipher;
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
        ensureDeletable(member);

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
        unlinkAllSocialAccounts(memberId);
        memberRepository.delete(member);
    }

    @Transactional
    public void deleteSocialMember(Long memberId, SocialMemberDeleteRequest request) {
        Member member = memberRepository.findById(memberId)
            .orElseThrow(MemberAccountService::memberNotFound);
        ensureDeletable(member);
        if (socialAccountRepository.findAllByMember_IdOrderByIdAsc(memberId).isEmpty()) {
            throw new AuthException(
                "SOCIAL_ACCOUNT_NOT_FOUND",
                HttpStatus.BAD_REQUEST,
                "연결된 간편 로그인 계정이 없어요."
            );
        }
        unlinkAllSocialAccounts(memberId);
        memberRepository.delete(member);
    }

    private void unlinkAllSocialAccounts(Long memberId) {
        for (MemberSocialAccount socialAccount
            : socialAccountRepository.findAllByMember_IdOrderByIdAsc(memberId)) {
            unlinkSocialAccount(socialAccount);
            socialAccountRepository.delete(socialAccount);
            socialAccountRepository.flush();
        }
    }

    private void unlinkSocialAccount(MemberSocialAccount socialAccount) {
        if (socialAccount.getProvider() == SocialProvider.KAKAO) {
            kakaoOAuthClient.unlink(socialAccount.getProviderUserId());
            return;
        }
        if (socialAccount.getProvider() == SocialProvider.NAVER) {
            try {
                naverOAuthClient.unlink(
                    socialAccount.getProviderUserId(),
                    tokenCipher.decrypt(socialAccount.getRefreshTokenCiphertext())
                );
                return;
            } catch (AuthException exception) {
                throw exception;
            } catch (RuntimeException exception) {
                throw new AuthException(
                    "NAVER_UNLINK_FAILED",
                    HttpStatus.BAD_GATEWAY,
                    "네이버 계정 연결을 해제하지 못했어요. 다시 시도해 주세요."
                );
            }
        }
        throw new AuthException(
            "SOCIAL_PROVIDER_NOT_SUPPORTED",
            HttpStatus.BAD_REQUEST,
            "지원하지 않는 간편 로그인 계정이에요."
        );
    }

    private static void ensureDeletable(Member member) {
        if (member.getRole() == MemberRole.ADMIN) {
            throw new AuthException(
                "ADMIN_ACCOUNT_PROTECTED",
                HttpStatus.FORBIDDEN,
                "관리자 계정은 회원탈퇴할 수 없습니다."
            );
        }
    }

    private static AuthException memberNotFound() {
        return new AuthException(
            "MEMBER_NOT_FOUND",
            HttpStatus.UNAUTHORIZED,
            "로그인 정보가 유효하지 않아요. 다시 로그인해 주세요."
        );
    }
}
