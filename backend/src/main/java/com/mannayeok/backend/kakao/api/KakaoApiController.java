package com.mannayeok.backend.kakao.api;

import com.mannayeok.backend.kakao.service.KakaoApiService;
import jakarta.validation.constraints.NotBlank;
import reactor.core.publisher.Mono;

import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/kakao")
public class KakaoApiController {

    private final KakaoApiService kakaoApiService;

    public KakaoApiController(KakaoApiService kakaoApiService) {
        this.kakaoApiService = kakaoApiService;
    }

    @GetMapping("/local")
    Mono<ResponseEntity<String>> searchLocal(
        @RequestParam @NotBlank String type,
        @RequestParam MultiValueMap<String, String> requestParams
    ) {
        MultiValueMap<String, String> kakaoParams =
            new LinkedMultiValueMap<>(requestParams);
        kakaoParams.remove("type");
        return kakaoApiService.searchLocal(type, kakaoParams);
    }

    @GetMapping("/directions")
    Mono<ResponseEntity<String>> findDirections(
        @RequestParam @NotBlank String origin,
        @RequestParam @NotBlank String destination,
        @RequestParam(defaultValue = "RECOMMEND") String priority
    ) {
        return kakaoApiService.findDirections(origin, destination, priority);
    }
}
