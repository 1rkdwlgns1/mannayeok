package com.mannayeok.backend.member;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.inOrder;

import java.util.Optional;
import java.util.List;

import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.auth.oauth.MemberSocialAccountRepository;
import com.mannayeok.backend.auth.oauth.KakaoOAuthClient;
import com.mannayeok.backend.auth.oauth.MemberSocialAccount;
import com.mannayeok.backend.auth.oauth.NaverOAuthClient;
import com.mannayeok.backend.auth.oauth.OAuthTokenCipher;
import com.mannayeok.backend.auth.oauth.SocialProvider;
import com.mannayeok.backend.member.dto.PasswordChangeRequest;
import com.mannayeok.backend.member.dto.MemberDeleteRequest;
import com.mannayeok.backend.member.dto.SocialMemberDeleteRequest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.mockito.InOrder;

class MemberAccountServiceTest {

    private MemberRepository memberRepository;
    private PasswordEncoder passwordEncoder;
    private AccountReauthenticationGuard reauthenticationGuard;
    private MemberAccountService memberAccountService;
    private MemberSocialAccountRepository socialAccountRepository;
    private KakaoOAuthClient kakaoOAuthClient;
    private NaverOAuthClient naverOAuthClient;
    private OAuthTokenCipher tokenCipher;

    @BeforeEach
    void setUp() {
        memberRepository = mock(MemberRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        reauthenticationGuard = mock(AccountReauthenticationGuard.class);
        socialAccountRepository = mock(MemberSocialAccountRepository.class);
        kakaoOAuthClient = mock(KakaoOAuthClient.class);
        naverOAuthClient = mock(NaverOAuthClient.class);
        tokenCipher = mock(OAuthTokenCipher.class);
        memberAccountService = new MemberAccountService(
            memberRepository,
            passwordEncoder,
            reauthenticationGuard,
            socialAccountRepository,
            kakaoOAuthClient,
            naverOAuthClient,
            tokenCipher
        );
    }

    @Test
    void changesPasswordAndIncrementsTokenVersion() {
        Member member = new Member("user@example.com", "old-hash");
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("old-password1", "old-hash")).thenReturn(true);
        when(passwordEncoder.matches("new-password1", "old-hash")).thenReturn(false);
        when(passwordEncoder.encode("new-password1")).thenReturn("new-hash");

        memberAccountService.changePassword(
            1L,
            new PasswordChangeRequest("old-password1", "new-password1")
        );

        assertThat(member.getPasswordHash()).isEqualTo("new-hash");
        assertThat(member.getTokenVersion()).isEqualTo(1);
        verify(memberRepository).save(member);
    }

    @Test
    void rejectsWrongCurrentPassword() {
        Member member = new Member("user@example.com", "old-hash");
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("wrong-password", "old-hash")).thenReturn(false);

        assertThatThrownBy(() -> memberAccountService.changePassword(
            1L,
            new PasswordChangeRequest("wrong-password", "new-password1")
        ))
            .isInstanceOf(AuthException.class)
            .satisfies(exception -> assertThat(((AuthException) exception).getCode())
                .isEqualTo("CURRENT_PASSWORD_MISMATCH"));
    }

    @Test
    void rejectsReusingCurrentPassword() {
        Member member = new Member("user@example.com", "old-hash");
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("old-password1", "old-hash")).thenReturn(true);

        assertThatThrownBy(() -> memberAccountService.changePassword(
            1L,
            new PasswordChangeRequest("old-password1", "old-password1")
        ))
            .isInstanceOf(AuthException.class)
            .satisfies(exception -> assertThat(((AuthException) exception).getCode())
                .isEqualTo("PASSWORD_UNCHANGED"));
    }

    @Test
    void deletesMemberAfterPasswordVerification() {
        Member member = new Member("user@example.com", "password-hash");
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("password1", "password-hash")).thenReturn(true);

        memberAccountService.deleteMember(
            1L,
            new MemberDeleteRequest("password1", true, "회원탈퇴")
        );

        verify(memberRepository).delete(member);
    }

    @Test
    void rejectsDeletionWhenCurrentPasswordIsWrong() {
        Member member = new Member("user@example.com", "password-hash");
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("wrong-password", "password-hash")).thenReturn(false);

        assertThatThrownBy(() -> memberAccountService.deleteMember(
            1L,
            new MemberDeleteRequest("wrong-password", true, "회원탈퇴")
        ))
            .isInstanceOf(AuthException.class)
            .satisfies(exception -> assertThat(((AuthException) exception).getCode())
                .isEqualTo("CURRENT_PASSWORD_MISMATCH"));
    }

    @Test
    void emailMemberDeletionRevokesLinkedNaverAccountBeforeDeletingMember() {
        Member member = new Member("user@example.com", "password-hash");
        MemberSocialAccount socialAccount = new MemberSocialAccount(
            member,
            SocialProvider.NAVER,
            "naver-user-id",
            "encrypted-refresh-token"
        );
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("password1", "password-hash")).thenReturn(true);
        when(socialAccountRepository.findAllByMember_IdOrderByIdAsc(1L))
            .thenReturn(List.of(socialAccount));
        when(tokenCipher.decrypt("encrypted-refresh-token")).thenReturn("refresh-token");

        memberAccountService.deleteMember(
            1L,
            new MemberDeleteRequest("password1", true, "회원탈퇴")
        );

        InOrder deletionOrder = inOrder(naverOAuthClient, socialAccountRepository, memberRepository);
        deletionOrder.verify(naverOAuthClient).unlink("naver-user-id", "refresh-token");
        deletionOrder.verify(socialAccountRepository).delete(socialAccount);
        deletionOrder.verify(socialAccountRepository).flush();
        deletionOrder.verify(memberRepository).delete(member);
    }

    @Test
    void emailMemberDeletionRevokesBothKakaoAndNaverConnections() {
        Member member = new Member("user@example.com", "password-hash");
        MemberSocialAccount kakao = new MemberSocialAccount(
            member,
            SocialProvider.KAKAO,
            "kakao-user-id"
        );
        MemberSocialAccount naver = new MemberSocialAccount(
            member,
            SocialProvider.NAVER,
            "naver-user-id",
            "encrypted-refresh-token"
        );
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("password1", "password-hash")).thenReturn(true);
        when(socialAccountRepository.findAllByMember_IdOrderByIdAsc(1L))
            .thenReturn(List.of(kakao, naver));
        when(tokenCipher.decrypt("encrypted-refresh-token")).thenReturn("refresh-token");

        memberAccountService.deleteMember(
            1L,
            new MemberDeleteRequest("password1", true, "회원탈퇴")
        );

        verify(kakaoOAuthClient).unlink("kakao-user-id");
        verify(naverOAuthClient).unlink("naver-user-id", "refresh-token");
        verify(socialAccountRepository).delete(kakao);
        verify(socialAccountRepository).delete(naver);
        verify(memberRepository).delete(member);
    }

    @Test
    void protectsAdminAccountFromDeletion() {
        Member admin = new Member("admin@example.com", "password-hash");
        ReflectionTestUtils.setField(admin, "role", MemberRole.ADMIN);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> memberAccountService.deleteMember(
            1L,
            new MemberDeleteRequest("password1", true, "회원탈퇴")
        ))
            .isInstanceOf(AuthException.class)
            .satisfies(exception -> assertThat(((AuthException) exception).getCode())
                .isEqualTo("ADMIN_ACCOUNT_PROTECTED"));

        verify(memberRepository, never()).delete(admin);
        verify(passwordEncoder, never()).matches("password1", "password-hash");
    }

    @Test
    void deletesSocialMemberOnlyAfterKakaoUnlinkSucceeds() {
        Member member = new Member("social@example.com", "unused-hash");
        MemberSocialAccount socialAccount = new MemberSocialAccount(member, SocialProvider.KAKAO, "12345");
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(socialAccountRepository.findAllByMember_IdOrderByIdAsc(1L))
            .thenReturn(List.of(socialAccount));

        memberAccountService.deleteSocialMember(
            1L,
            new SocialMemberDeleteRequest(true, "회원탈퇴")
        );

        InOrder deletionOrder = inOrder(kakaoOAuthClient, socialAccountRepository, memberRepository);
        deletionOrder.verify(kakaoOAuthClient).unlink("12345");
        deletionOrder.verify(socialAccountRepository).delete(socialAccount);
        deletionOrder.verify(socialAccountRepository).flush();
        deletionOrder.verify(memberRepository).delete(member);
    }

    @Test
    void keepsLocalMemberWhenKakaoUnlinkFails() {
        Member member = new Member("social@example.com", "unused-hash");
        MemberSocialAccount socialAccount = new MemberSocialAccount(member, SocialProvider.KAKAO, "12345");
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(socialAccountRepository.findAllByMember_IdOrderByIdAsc(1L))
            .thenReturn(List.of(socialAccount));
        doThrow(new AuthException(
            "KAKAO_UNLINK_FAILED",
            HttpStatus.BAD_GATEWAY,
            "카카오 연결을 해제하지 못했어요."
        )).when(kakaoOAuthClient).unlink("12345");

        assertThatThrownBy(() -> memberAccountService.deleteSocialMember(
            1L,
            new SocialMemberDeleteRequest(true, "회원탈퇴")
        ))
            .isInstanceOf(AuthException.class)
            .satisfies(exception -> assertThat(((AuthException) exception).getCode())
                .isEqualTo("KAKAO_UNLINK_FAILED"));

        verify(memberRepository, never()).delete(member);
        verify(socialAccountRepository, never()).delete(socialAccount);
        verify(socialAccountRepository, never()).flush();
    }

    @Test
    void deletesNaverMemberOnlyAfterTokenRevocationSucceeds() {
        Member member = new Member("naver@example.com", "unused-hash");
        MemberSocialAccount socialAccount = new MemberSocialAccount(
            member,
            SocialProvider.NAVER,
            "naver-user-id",
            "encrypted-refresh-token"
        );
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(socialAccountRepository.findAllByMember_IdOrderByIdAsc(1L)).thenReturn(List.of(socialAccount));
        when(tokenCipher.decrypt("encrypted-refresh-token")).thenReturn("refresh-token");

        memberAccountService.deleteSocialMember(
            1L,
            new SocialMemberDeleteRequest(true, "회원탈퇴")
        );

        InOrder deletionOrder = inOrder(naverOAuthClient, socialAccountRepository, memberRepository);
        deletionOrder.verify(naverOAuthClient).unlink("naver-user-id", "refresh-token");
        deletionOrder.verify(socialAccountRepository).delete(socialAccount);
        deletionOrder.verify(socialAccountRepository).flush();
        deletionOrder.verify(memberRepository).delete(member);
        verify(kakaoOAuthClient, never()).unlink("naver-user-id");
    }

    @Test
    void keepsLocalMemberWhenNaverUnlinkFails() {
        Member member = new Member("naver@example.com", "unused-hash");
        MemberSocialAccount socialAccount = new MemberSocialAccount(
            member,
            SocialProvider.NAVER,
            "naver-user-id",
            "encrypted-refresh-token"
        );
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(socialAccountRepository.findAllByMember_IdOrderByIdAsc(1L)).thenReturn(List.of(socialAccount));
        when(tokenCipher.decrypt("encrypted-refresh-token")).thenReturn("refresh-token");
        doThrow(new AuthException(
            "NAVER_UNLINK_FAILED",
            HttpStatus.BAD_GATEWAY,
            "네이버 연결을 해제하지 못했어요."
        )).when(naverOAuthClient).unlink("naver-user-id", "refresh-token");

        assertThatThrownBy(() -> memberAccountService.deleteSocialMember(
            1L,
            new SocialMemberDeleteRequest(true, "회원탈퇴")
        ))
            .isInstanceOf(AuthException.class)
            .satisfies(exception -> assertThat(((AuthException) exception).getCode())
                .isEqualTo("NAVER_UNLINK_FAILED"));

        verify(memberRepository, never()).delete(member);
        verify(socialAccountRepository, never()).delete(socialAccount);
        verify(socialAccountRepository, never()).flush();
    }
}
