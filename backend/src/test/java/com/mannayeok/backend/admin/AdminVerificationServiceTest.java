package com.mannayeok.backend.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import com.mannayeok.backend.auth.JwtService;
import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.member.Member;
import com.mannayeok.backend.member.MemberRepository;
import com.mannayeok.backend.member.MemberRole;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminVerificationServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    private AdminVerificationService service;

    @BeforeEach
    void setUp() {
        service = new AdminVerificationService(
            memberRepository,
            passwordEncoder,
            jwtService,
            new AdminVerificationAttemptGuard()
        );
    }

    @Test
    void firstSetupStoresOnlyEncodedPasswordAndIssuesAdminToken() {
        Member admin = admin();
        when(memberRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(passwordEncoder.encode("secondary-password")).thenReturn("bcrypt-hash");
        when(jwtService.issueAdminVerified(admin)).thenReturn(new JwtService.IssuedToken("admin-token", 900));

        var response = service.setup(1L, "secondary-password", "secondary-password");

        assertThat(admin.getAdminSecondaryPasswordHash()).isEqualTo("bcrypt-hash");
        assertThat(response.accessToken()).isEqualTo("admin-token");
        verify(memberRepository).saveAndFlush(admin);
    }

    @Test
    void setupCannotOverwriteExistingSecondaryPassword() {
        Member admin = admin();
        admin.setInitialAdminSecondaryPassword("existing-hash");
        when(memberRepository.findById(1L)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service.setup(1L, "new-password", "new-password"))
            .isInstanceOf(AuthException.class)
            .satisfies(exception -> assertThat(((AuthException) exception).getCode())
                .isEqualTo("ADMIN_SECONDARY_PASSWORD_ALREADY_CONFIGURED"));
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void verificationRejectsWrongPassword() {
        Member admin = admin();
        admin.setInitialAdminSecondaryPassword("bcrypt-hash");
        when(memberRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(passwordEncoder.matches("wrong-password", "bcrypt-hash")).thenReturn(false);

        assertThatThrownBy(() -> service.verify(1L, "wrong-password"))
            .isInstanceOf(AuthException.class)
            .satisfies(exception -> assertThat(((AuthException) exception).getCode())
                .isEqualTo("ADMIN_SECONDARY_PASSWORD_MISMATCH"));
        verify(jwtService, never()).issueAdminVerified(any());
    }

    private static Member admin() {
        Member member = new Member("admin@example.com", "password-hash");
        ReflectionTestUtils.setField(member, "id", 1L);
        ReflectionTestUtils.setField(member, "role", MemberRole.ADMIN);
        return member;
    }
}
