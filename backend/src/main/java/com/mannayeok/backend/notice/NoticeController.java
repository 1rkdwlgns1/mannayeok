package com.mannayeok.backend.notice;

import java.util.List;

import com.mannayeok.backend.auth.dto.MessageResponse;
import com.mannayeok.backend.admin.AdminAuthorization;
import com.mannayeok.backend.notice.dto.NoticeRequest;
import com.mannayeok.backend.notice.dto.NoticeResponse;

import jakarta.validation.Valid;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class NoticeController {

    private final NoticeService noticeService;

    public NoticeController(NoticeService noticeService) {
        this.noticeService = noticeService;
    }

    @GetMapping("/notices")
    Mono<List<NoticeResponse>> getPublishedNotices() {
        return Mono.fromCallable(noticeService::findPublished).subscribeOn(Schedulers.boundedElastic());
    }

    @GetMapping("/admin/notices")
    Mono<List<NoticeResponse>> getAdminNotices(@AuthenticationPrincipal Jwt jwt) {
        AdminAuthorization.requireSecondaryVerification(jwt);
        return Mono.fromCallable(() -> noticeService.findAllForAdmin(memberId(jwt)))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/admin/notices")
    Mono<NoticeResponse> createNotice(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody NoticeRequest request) {
        AdminAuthorization.requireSecondaryVerification(jwt);
        return Mono.fromCallable(() -> noticeService.create(memberId(jwt), request))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @PutMapping("/admin/notices/{noticeId}")
    Mono<NoticeResponse> updateNotice(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable Long noticeId,
        @Valid @RequestBody NoticeRequest request
    ) {
        AdminAuthorization.requireSecondaryVerification(jwt);
        return Mono.fromCallable(() -> noticeService.update(memberId(jwt), noticeId, request))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @DeleteMapping("/admin/notices/{noticeId}")
    Mono<NoticeResponse> deleteNotice(@AuthenticationPrincipal Jwt jwt, @PathVariable Long noticeId) {
        AdminAuthorization.requireSecondaryVerification(jwt);
        return Mono.fromCallable(() -> noticeService.delete(memberId(jwt), noticeId))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @PutMapping("/admin/notices/{noticeId}/restore")
    Mono<NoticeResponse> restoreNotice(@AuthenticationPrincipal Jwt jwt, @PathVariable Long noticeId) {
        AdminAuthorization.requireSecondaryVerification(jwt);
        return Mono.fromCallable(() -> noticeService.restore(memberId(jwt), noticeId))
            .subscribeOn(Schedulers.boundedElastic());
    }

    private static Long memberId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
