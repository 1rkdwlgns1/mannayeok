package com.mannayeok.backend.savedrecommendation;

import java.util.List;

import com.mannayeok.backend.auth.dto.MessageResponse;
import com.mannayeok.backend.savedrecommendation.dto.SavedRecommendationCreateRequest;
import com.mannayeok.backend.savedrecommendation.dto.SavedRecommendationResponse;
import com.mannayeok.backend.savedrecommendation.dto.SavedRecommendationUpdateRequest;

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
@RequestMapping("/api/saved-recommendations")
public class SavedRecommendationController {

    private final SavedRecommendationService savedRecommendationService;

    public SavedRecommendationController(SavedRecommendationService savedRecommendationService) {
        this.savedRecommendationService = savedRecommendationService;
    }

    @PostMapping
    Mono<SavedRecommendationResponse> create(
        @AuthenticationPrincipal Jwt jwt,
        @Valid @RequestBody SavedRecommendationCreateRequest request
    ) {
        Long memberId = Long.valueOf(jwt.getSubject());
        return Mono.fromCallable(() -> savedRecommendationService.create(memberId, request))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @GetMapping
    Mono<List<SavedRecommendationResponse>> findAll(@AuthenticationPrincipal Jwt jwt) {
        Long memberId = Long.valueOf(jwt.getSubject());
        return Mono.fromCallable(() -> savedRecommendationService.findAll(memberId))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @GetMapping("/{id}")
    Mono<SavedRecommendationResponse> find(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable Long id
    ) {
        Long memberId = Long.valueOf(jwt.getSubject());
        return Mono.fromCallable(() -> savedRecommendationService.find(memberId, id))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @PutMapping("/{id}")
    Mono<SavedRecommendationResponse> update(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable Long id,
        @Valid @RequestBody SavedRecommendationUpdateRequest request
    ) {
        Long memberId = Long.valueOf(jwt.getSubject());
        return Mono.fromCallable(() -> savedRecommendationService.update(memberId, id, request))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @DeleteMapping("/{id}")
    Mono<MessageResponse> delete(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable Long id
    ) {
        Long memberId = Long.valueOf(jwt.getSubject());
        return Mono.fromCallable(() -> {
            savedRecommendationService.delete(memberId, id);
            return new MessageResponse("저장한 모임을 삭제했어요.");
        }).subscribeOn(Schedulers.boundedElastic());
    }
}
