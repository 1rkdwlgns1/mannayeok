package com.mannayeok.backend.auth;

import com.mannayeok.backend.auth.dto.AuthResponse;
import com.mannayeok.backend.auth.dto.EmailAvailabilityRequest;
import com.mannayeok.backend.auth.dto.EmailAvailabilityResponse;
import com.mannayeok.backend.auth.dto.LoginRequest;
import com.mannayeok.backend.auth.dto.MemberResponse;
import com.mannayeok.backend.auth.dto.MessageResponse;
import com.mannayeok.backend.auth.dto.PasswordResetRequest;
import com.mannayeok.backend.auth.dto.PasswordResetSubmitRequest;
import com.mannayeok.backend.auth.dto.SignupRequest;

import jakarta.validation.Valid;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    public AuthController(
        AuthService authService,
        PasswordResetService passwordResetService
    ) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/email-availability")
    Mono<EmailAvailabilityResponse> emailAvailability(
        @Valid @RequestBody EmailAvailabilityRequest request
    ) {
        return Mono.fromCallable(() -> new EmailAvailabilityResponse(
            authService.isEmailAvailable(request.email())
        )).subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    Mono<MemberResponse> signup(@Valid @RequestBody SignupRequest request) {
        return Mono.fromCallable(() -> authService.signup(request))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/login")
    Mono<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return Mono.fromCallable(() -> authService.login(request))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.ACCEPTED)
    Mono<MessageResponse> forgotPassword(
        @Valid @RequestBody PasswordResetRequest request
    ) {
        return Mono.fromCallable(() -> {
            passwordResetService.requestReset(request.email());
            return new MessageResponse(
                "가입된 이메일이라면 비밀번호 재설정 링크를 보내드렸어요."
            );
        }).subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/reset-password")
    Mono<MessageResponse> resetPassword(
        @Valid @RequestBody PasswordResetSubmitRequest request
    ) {
        return Mono.fromCallable(() -> {
            passwordResetService.resetPassword(request.token(), request.password());
            return new MessageResponse("비밀번호가 변경됐어요. 새 비밀번호로 로그인해 주세요.");
        }).subscribeOn(Schedulers.boundedElastic());
    }
}
