package com.mannayeok.backend.member;

import com.mannayeok.backend.auth.dto.MessageResponse;
import com.mannayeok.backend.member.dto.PasswordChangeRequest;
import com.mannayeok.backend.member.dto.MemberDeleteRequest;
import com.mannayeok.backend.member.dto.SocialMemberDeleteRequest;

import jakarta.validation.Valid;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberAccountService memberAccountService;

    public MemberController(MemberAccountService memberAccountService) {
        this.memberAccountService = memberAccountService;
    }

    @PutMapping("/me/password")
    Mono<MessageResponse> changePassword(
        @AuthenticationPrincipal Jwt jwt,
        @Valid @RequestBody PasswordChangeRequest request
    ) {
        Long memberId = Long.valueOf(jwt.getSubject());
        return Mono.fromCallable(() -> {
            memberAccountService.changePassword(memberId, request);
            return new MessageResponse("비밀번호가 변경됐어요. 새 비밀번호로 다시 로그인해 주세요.");
        }).subscribeOn(Schedulers.boundedElastic());
    }

    @DeleteMapping("/me")
    Mono<MessageResponse> deleteMember(
        @AuthenticationPrincipal Jwt jwt,
        @Valid @RequestBody MemberDeleteRequest request
    ) {
        Long memberId = Long.valueOf(jwt.getSubject());
        return Mono.fromCallable(() -> {
            memberAccountService.deleteMember(memberId, request);
            return new MessageResponse("회원탈퇴가 완료됐어요.");
        }).subscribeOn(Schedulers.boundedElastic());
    }

    @DeleteMapping("/me/social")
    Mono<MessageResponse> deleteSocialMember(
        @AuthenticationPrincipal Jwt jwt,
        @Valid @RequestBody SocialMemberDeleteRequest request
    ) {
        Long memberId = Long.valueOf(jwt.getSubject());
        return Mono.fromCallable(() -> {
            memberAccountService.deleteSocialMember(memberId, request);
            return new MessageResponse("회원탈퇴가 완료됐어요.");
        }).subscribeOn(Schedulers.boundedElastic());
    }
}
