package com.mannayeok.backend.kakao.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.concurrent.atomic.AtomicInteger;

import com.mannayeok.backend.kakao.config.KakaoApiProperties;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

class KakaoApiServiceTest {

    @Test
    void reusesSuccessfulIdenticalLocalSearchRequests() {
        AtomicInteger requestCount = new AtomicInteger();
        WebClient webClient = WebClient.builder()
            .baseUrl("https://example.test")
            .exchangeFunction(request -> {
                requestCount.incrementAndGet();
                return Mono.just(ClientResponse.create(HttpStatus.OK)
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .body("{\"documents\":[],\"meta\":{\"total_count\":0}}")
                    .build());
            })
            .build();
        KakaoApiService service = new KakaoApiService(
            webClient,
            webClient,
            new KakaoApiProperties(
                "https://example.test",
                "https://example.test",
                "test-key",
                "test-key",
                5
            ),
            new KakaoLocalRequestValidator()
        );
        var params = new LinkedMultiValueMap<String, String>();
        params.add("query", "강남역");
        params.add("size", "15");

        StepVerifier.create(service.searchLocal("keyword", params))
            .assertNext(response -> assertThat(response.getBody()).contains("documents"))
            .verifyComplete();
        StepVerifier.create(service.searchLocal("keyword", params))
            .assertNext(response -> assertThat(response.getBody()).contains("documents"))
            .verifyComplete();

        assertThat(requestCount).hasValue(1);
    }
}
