package com.mannayeok.backend.admin;

import com.mannayeok.backend.admin.dto.AdminPasswordSetupRequest;
import com.mannayeok.backend.admin.dto.AdminVerificationRequest;
import com.mannayeok.backend.admin.dto.AdminVerificationResponse;
import com.mannayeok.backend.admin.dto.AdminVerificationStatusResponse;

import jakarta.validation.Valid;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminVerificationController {

    private final AdminVerificationService adminVerificationService;

    public AdminVerificationController(AdminVerificationService adminVerificationService) {
        this.adminVerificationService = adminVerificationService;
    }

    @GetMapping("/verification/status")
    Mono<AdminVerificationStatusResponse> status(@AuthenticationPrincipal Jwt jwt) {
        return Mono.fromCallable(() -> adminVerificationService.status(Long.valueOf(jwt.getSubject())))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/verification/setup")
    Mono<AdminVerificationResponse> setup(
        @AuthenticationPrincipal Jwt jwt,
        @Valid @RequestBody AdminPasswordSetupRequest request
    ) {
        return Mono.fromCallable(() -> adminVerificationService.setup(
            Long.valueOf(jwt.getSubject()), request.password(), request.passwordConfirmation()
        )).subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/verify")
    Mono<AdminVerificationResponse> verify(
        @AuthenticationPrincipal Jwt jwt,
        @Valid @RequestBody AdminVerificationRequest request
    ) {
        return Mono.fromCallable(() -> adminVerificationService.verify(Long.valueOf(jwt.getSubject()), request.password()))
            .subscribeOn(Schedulers.boundedElastic());
    }
}
