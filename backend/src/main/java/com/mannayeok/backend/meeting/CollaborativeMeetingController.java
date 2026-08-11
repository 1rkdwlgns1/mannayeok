package com.mannayeok.backend.meeting;

import com.mannayeok.backend.auth.dto.MessageResponse;
import com.mannayeok.backend.meeting.dto.CollaborativeMeetingCreateRequest;
import com.mannayeok.backend.meeting.dto.CollaborativeMeetingOwnerResponse;
import com.mannayeok.backend.meeting.dto.CollaborativeMeetingResponse;
import com.mannayeok.backend.meeting.dto.MeetingParticipantJoinResponse;
import com.mannayeok.backend.meeting.dto.MeetingParticipantRequest;
import com.mannayeok.backend.meeting.dto.MeetingParticipantResponse;
import com.mannayeok.backend.meeting.dto.MeetingResultUpdateRequest;

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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/meetings")
public class CollaborativeMeetingController {

    private final CollaborativeMeetingService meetingService;

    public CollaborativeMeetingController(CollaborativeMeetingService meetingService) {
        this.meetingService = meetingService;
    }

    @PostMapping
    Mono<CollaborativeMeetingOwnerResponse> create(
        @AuthenticationPrincipal Jwt jwt,
        @Valid @RequestBody CollaborativeMeetingCreateRequest request
    ) {
        Long memberId = Long.valueOf(jwt.getSubject());
        return blocking(() -> meetingService.create(memberId, request));
    }

    @GetMapping("/owned/source/{sourceId}")
    Mono<CollaborativeMeetingOwnerResponse> findOwnedBySource(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable Long sourceId
    ) {
        Long memberId = Long.valueOf(jwt.getSubject());
        return blocking(() -> meetingService.findOwnedBySource(memberId, sourceId));
    }

    @GetMapping("/owned/{inviteCode}")
    Mono<CollaborativeMeetingOwnerResponse> findOwned(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String inviteCode
    ) {
        Long memberId = Long.valueOf(jwt.getSubject());
        return blocking(() -> meetingService.findOwned(memberId, inviteCode));
    }

    @PutMapping("/owned/{inviteCode}/result")
    Mono<CollaborativeMeetingOwnerResponse> updateResult(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String inviteCode,
        @Valid @RequestBody MeetingResultUpdateRequest request
    ) {
        Long memberId = Long.valueOf(jwt.getSubject());
        return blocking(() -> meetingService.updateResult(memberId, inviteCode, request));
    }

    @DeleteMapping("/owned/{inviteCode}/participants/{participantId}")
    Mono<MessageResponse> removeParticipant(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String inviteCode,
        @PathVariable Long participantId
    ) {
        Long memberId = Long.valueOf(jwt.getSubject());
        return blocking(() -> {
            meetingService.removeParticipant(memberId, inviteCode, participantId);
            return new MessageResponse("참여자를 모임에서 제외했어요.");
        });
    }

    @GetMapping("/{inviteCode}")
    Mono<CollaborativeMeetingResponse> findPublic(@PathVariable String inviteCode) {
        return blocking(() -> meetingService.findPublic(inviteCode));
    }

    @PostMapping("/{inviteCode}/participants")
    Mono<MeetingParticipantJoinResponse> join(
        @PathVariable String inviteCode,
        @Valid @RequestBody MeetingParticipantRequest request
    ) {
        return blocking(() -> meetingService.join(inviteCode, request));
    }

    @PutMapping("/{inviteCode}/participants/{participantId}")
    Mono<MeetingParticipantResponse> updateParticipant(
        @PathVariable String inviteCode,
        @PathVariable Long participantId,
        @RequestHeader(name = "X-Participant-Token", required = false) String participantToken,
        @Valid @RequestBody MeetingParticipantRequest request
    ) {
        return blocking(() -> meetingService.updateParticipant(inviteCode, participantId, participantToken, request));
    }

    private static <T> Mono<T> blocking(java.util.concurrent.Callable<T> action) {
        return Mono.fromCallable(action).subscribeOn(Schedulers.boundedElastic());
    }
}
