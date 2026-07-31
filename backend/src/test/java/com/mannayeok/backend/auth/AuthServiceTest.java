package com.mannayeok.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import com.mannayeok.backend.auth.dto.AuthResponse;
import com.mannayeok.backend.auth.dto.LoginRequest;
import com.mannayeok.backend.auth.dto.SignupRequest;
import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.member.Member;
import com.mannayeok.backend.member.MemberRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {

    private MemberRepository memberRepository;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        memberRepository = mock(MemberRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        jwtService = mock(JwtService.class);
        authService = new AuthService(memberRepository, passwordEncoder, jwtService);
    }

    @Test
    void checksEmailAvailabilityWithNormalizedEmail() {
        when(memberRepository.existsByEmail("user@example.com")).thenReturn(true);

        boolean available = authService.isEmailAvailable(" User@Example.COM ");

        assertThat(available).isFalse();
        verify(memberRepository).existsByEmail("user@example.com");
    }

    @Test
    void normalizesEmailAndHashesPasswordWhenSigningUp() {
        when(memberRepository.existsByEmail("user@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password1")).thenReturn("bcrypt-hash");
        when(memberRepository.save(any(Member.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService.signup(new SignupRequest(" User@Example.COM ", "password1"));

        ArgumentCaptor<Member> memberCaptor = ArgumentCaptor.forClass(Member.class);
        verify(memberRepository).save(memberCaptor.capture());
        assertThat(memberCaptor.getValue().getEmail()).isEqualTo("user@example.com");
        assertThat(memberCaptor.getValue().getPasswordHash()).isEqualTo("bcrypt-hash");
        assertThat(memberCaptor.getValue().getNickname()).isNull();
    }

    @Test
    void rejectsDuplicateEmail() {
        when(memberRepository.existsByEmail("user@example.com")).thenReturn(true);

        assertThatThrownBy(() ->
            authService.signup(new SignupRequest("user@example.com", "password1"))
        )
            .isInstanceOf(AuthException.class)
            .satisfies(exception -> {
                AuthException authException = (AuthException) exception;
                assertThat(authException.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                assertThat(authException.getCode()).isEqualTo("EMAIL_ALREADY_EXISTS");
            });
    }

    @Test
    void returnsJwtWhenPasswordMatches() {
        Member member = new Member("user@example.com", "bcrypt-hash", "만나역");
        when(memberRepository.findByEmail("user@example.com")).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("password1", "bcrypt-hash")).thenReturn(true);
        when(jwtService.issue(member)).thenReturn(new JwtService.IssuedToken("jwt-token", 7200));

        AuthResponse response = authService.login(new LoginRequest("USER@example.com", "password1"));

        assertThat(response.accessToken()).isEqualTo("jwt-token");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(7200);
    }

    @Test
    void hidesWhetherEmailOrPasswordWasWrong() {
        when(memberRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
            authService.login(new LoginRequest("missing@example.com", "wrong-password"))
        )
            .isInstanceOf(AuthException.class)
            .hasMessage("이메일 또는 비밀번호가 올바르지 않아요.");
    }
}
