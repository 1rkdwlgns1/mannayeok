package com.mannayeok.backend.auth.oauth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.mannayeok.backend.auth.JwtService;
import com.mannayeok.backend.auth.dto.AuthResponse;
import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.auth.oauth.dto.SocialLinkRequest;
import com.mannayeok.backend.member.AccountReauthenticationGuard;
import com.mannayeok.backend.member.Member;
import com.mannayeok.backend.member.MemberRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

class OAuthLoginServiceTest {

    private OAuthLoginTicketRepository ticketRepository;
    private MemberSocialAccountRepository socialAccountRepository;
    private MemberRepository memberRepository;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private OAuthTokenCipher tokenCipher;
    private AccountReauthenticationGuard reauthenticationGuard;
    private OAuthLoginService service;

    @BeforeEach
    void setUp() {
        ticketRepository = mock(OAuthLoginTicketRepository.class);
        socialAccountRepository = mock(MemberSocialAccountRepository.class);
        memberRepository = mock(MemberRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        jwtService = mock(JwtService.class);
        tokenCipher = mock(OAuthTokenCipher.class);
        reauthenticationGuard = mock(AccountReauthenticationGuard.class);
        service = new OAuthLoginService(
            ticketRepository,
            socialAccountRepository,
            memberRepository,
            passwordEncoder,
            jwtService,
            tokenCipher,
            reauthenticationGuard
        );
    }

    @Test
    void linksNaverToExistingEmailMemberAfterPasswordVerification() {
        Member member = new Member("user@example.com", "password-hash");
        ReflectionTestUtils.setField(member, "id", 1L);
        OAuthLoginTicket ticket = linkTicket();
        when(ticketRepository.findByTokenHash(anyString())).thenReturn(Optional.of(ticket));
        when(memberRepository.findByEmail("user@example.com")).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("password1", "password-hash")).thenReturn(true);
        when(socialAccountRepository.existsByMember_IdAndProvider(1L, SocialProvider.NAVER))
            .thenReturn(false);
        when(socialAccountRepository.findByProviderAndProviderUserId(
            SocialProvider.NAVER,
            "naver-user-id"
        )).thenReturn(Optional.empty());
        when(socialAccountRepository.saveAndFlush(any(MemberSocialAccount.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(socialAccountRepository.findAllByMember_IdOrderByIdAsc(1L))
            .thenReturn(List.of());
        when(jwtService.issue(member)).thenReturn(new JwtService.IssuedToken("jwt", 7200));

        AuthResponse response = service.linkNaver(new SocialLinkRequest("raw-ticket", "password1"));

        assertThat(response.member().loginProvider()).isEqualTo("NAVER");
        verify(reauthenticationGuard).reset(1L);
        verify(socialAccountRepository).saveAndFlush(any(MemberSocialAccount.class));
    }

    @Test
    void rejectsNaverLinkWhenCurrentPasswordIsWrong() {
        Member member = new Member("user@example.com", "password-hash");
        ReflectionTestUtils.setField(member, "id", 1L);
        when(ticketRepository.findByTokenHash(anyString())).thenReturn(Optional.of(linkTicket()));
        when(memberRepository.findByEmail("user@example.com")).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("wrong-password", "password-hash")).thenReturn(false);

        assertThatThrownBy(() -> service.linkNaver(
            new SocialLinkRequest("raw-ticket", "wrong-password")
        ))
            .isInstanceOf(AuthException.class)
            .satisfies(exception -> assertThat(((AuthException) exception).getCode())
                .isEqualTo("CURRENT_PASSWORD_MISMATCH"));

        verify(reauthenticationGuard).recordFailure(1L);
        verify(socialAccountRepository, never()).saveAndFlush(any(MemberSocialAccount.class));
    }

    @Test
    void linksKakaoToExistingEmailMemberAfterPasswordVerification() {
        Member member = new Member("user@example.com", "password-hash");
        ReflectionTestUtils.setField(member, "id", 1L);
        LocalDateTime now = LocalDateTime.now();
        OAuthLoginTicket ticket = new OAuthLoginTicket(
            "hash",
            SocialProvider.KAKAO,
            "kakao-user-id",
            "user@example.com",
            null,
            null,
            now.plusMinutes(5),
            now
        );
        when(ticketRepository.findByTokenHash(anyString())).thenReturn(Optional.of(ticket));
        when(memberRepository.findByEmail("user@example.com")).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("password1", "password-hash")).thenReturn(true);
        when(socialAccountRepository.existsByMember_IdAndProvider(1L, SocialProvider.KAKAO))
            .thenReturn(false);
        when(socialAccountRepository.findByProviderAndProviderUserId(
            SocialProvider.KAKAO,
            "kakao-user-id"
        )).thenReturn(Optional.empty());
        when(socialAccountRepository.saveAndFlush(any(MemberSocialAccount.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(socialAccountRepository.findAllByMember_IdOrderByIdAsc(1L))
            .thenReturn(List.of());
        when(jwtService.issue(member)).thenReturn(new JwtService.IssuedToken("jwt", 7200));

        AuthResponse response = service.linkKakao(new SocialLinkRequest("raw-ticket", "password1"));

        assertThat(response.member().loginProvider()).isEqualTo("KAKAO");
        verify(reauthenticationGuard).reset(1L);
        verify(socialAccountRepository).saveAndFlush(any(MemberSocialAccount.class));
    }

    private static OAuthLoginTicket linkTicket() {
        LocalDateTime now = LocalDateTime.now();
        return new OAuthLoginTicket(
            "hash",
            SocialProvider.NAVER,
            "naver-user-id",
            "user@example.com",
            "encrypted-refresh-token",
            null,
            now.plusMinutes(5),
            now
        );
    }
}
