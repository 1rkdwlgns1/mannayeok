package com.mannayeok.backend.kakao.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.concurrent.atomic.AtomicInteger;

import com.mannayeok.backend.kakao.config.KakaoApiProperties;
import com.mannayeok.backend.observability.ExternalApiMetrics;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

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
    void executesLocalRequestWhenClientRequestMetricFails() {
        AtomicInteger requestCount = new AtomicInteger();
        MeterRegistry meterRegistry = mock(MeterRegistry.class);
        when(meterRegistry.counter(anyString(), any(String[].class)))
            .thenThrow(new IllegalStateException("client request metric failure"));
        WebClient webClient = WebClient.builder()
            .baseUrl("https://example.test")
            .exchangeFunction(request -> {
                requestCount.incrementAndGet();
                return Mono.just(ClientResponse.create(HttpStatus.OK)
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .body("{\"documents\":[]}")
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
            new KakaoLocalRequestValidator(),
            new ExternalApiMetrics(meterRegistry)
        );
        var params = new LinkedMultiValueMap<String, String>();
        params.add("query", "강남역");

        StepVerifier.create(service.searchLocal("keyword", params))
            .assertNext(response -> assertThat(response.getBody()).contains("documents"))
            .verifyComplete();

        assertThat(requestCount).hasValue(1);
    }

    @Test
    void reusesSuccessfulIdenticalLocalSearchRequests() {
        AtomicInteger requestCount = new AtomicInteger();
        SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
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
            new KakaoLocalRequestValidator(),
            new ExternalApiMetrics(meterRegistry)
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
        assertThat(meterRegistry.get("mannayeok.external.api.client.requests")
            .tags("provider", "kakao", "operation", "local.keyword")
            .counter()
            .count()).isEqualTo(2);
        assertThat(meterRegistry.get("mannayeok.external.api.cache.lookups")
            .tags(
                "provider", "kakao",
                "operation", "local.keyword",
                "result", "entry_created"
            )
            .counter()
            .count()).isEqualTo(1);
        assertThat(meterRegistry.get("mannayeok.external.api.cache.lookups")
            .tags(
                "provider", "kakao",
                "operation", "local.keyword",
                "result", "entry_reused"
            )
            .counter()
            .count()).isEqualTo(1);
        assertThat(meterRegistry.get("mannayeok.external.api.requests.started")
            .tags("provider", "kakao", "operation", "local.keyword")
            .counter()
            .count()).isEqualTo(1);
    }

    @Test
    void measuresActualDirectionsRequestsSeparatelyFromCacheReuse() {
        AtomicInteger requestCount = new AtomicInteger();
        SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
        WebClient webClient = WebClient.builder()
            .baseUrl("https://example.test")
            .exchangeFunction(request -> {
                requestCount.incrementAndGet();
                return Mono.just(ClientResponse.create(HttpStatus.OK)
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .body("{\"routes\":[]}")
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
            new KakaoLocalRequestValidator(),
            new ExternalApiMetrics(meterRegistry)
        );

        StepVerifier.create(service.findDirections("126.9,37.5", "127.0,37.6", "RECOMMEND"))
            .expectNextCount(1)
            .verifyComplete();
        StepVerifier.create(service.findDirections("126.9,37.5", "127.0,37.6", "RECOMMEND"))
            .expectNextCount(1)
            .verifyComplete();

        assertThat(requestCount).hasValue(1);
        assertThat(meterRegistry.get("mannayeok.external.api.client.requests")
            .tags("provider", "kakao", "operation", "directions")
            .counter()
            .count()).isEqualTo(2);
        assertThat(meterRegistry.get("mannayeok.external.api.requests.started")
            .tags("provider", "kakao", "operation", "directions")
            .counter()
            .count()).isEqualTo(1);
    }
}
