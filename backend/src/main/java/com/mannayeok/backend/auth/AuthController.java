package com.mannayeok.backend.auth;

import com.mannayeok.backend.auth.dto.AuthResponse;
import com.mannayeok.backend.auth.dto.LoginRequest;
import com.mannayeok.backend.auth.dto.MemberResponse;
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

    public AuthController(AuthService authService) {
        this.authService = authService;
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
}
