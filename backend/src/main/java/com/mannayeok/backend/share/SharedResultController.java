package com.mannayeok.backend.share;

import com.mannayeok.backend.share.dto.SharedResultRequest;
import com.mannayeok.backend.share.dto.SharedResultResponse;

import jakarta.validation.Valid;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shares")
public class SharedResultController {

    private final SharedResultService sharedResultService;

    public SharedResultController(SharedResultService sharedResultService) {
        this.sharedResultService = sharedResultService;
    }

    @PostMapping
    Mono<SharedResultResponse> create(@Valid @RequestBody SharedResultRequest request) {
        return Mono.fromCallable(() -> sharedResultService.create(request))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @GetMapping("/{code}")
    Mono<SharedResultResponse> find(@PathVariable String code) {
        return Mono.fromCallable(() -> sharedResultService.find(code))
            .subscribeOn(Schedulers.boundedElastic());
    }
}
