package com.mannayeok.backend.member;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.member.dto.PasswordChangeRequest;
import com.mannayeok.backend.member.dto.MemberDeleteRequest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class MemberAccountServiceTest {

    private MemberRepository memberRepository;
    private PasswordEncoder passwordEncoder;
    private AccountReauthenticationGuard reauthenticationGuard;
    private MemberAccountService memberAccountService;

    @BeforeEach
    void setUp() {
        memberRepository = mock(MemberRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        reauthenticationGuard = mock(AccountReauthenticationGuard.class);
        memberAccountService = new MemberAccountService(
            memberRepository,
            passwordEncoder,
            reauthenticationGuard
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
}
