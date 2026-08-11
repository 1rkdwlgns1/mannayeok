package com.mannayeok.backend.kakao.service;

import java.time.Duration;
import java.util.Comparator;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import com.mannayeok.backend.kakao.config.KakaoApiProperties;
import com.mannayeok.backend.kakao.error.KakaoApiException;
import reactor.core.publisher.Mono;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class KakaoApiService {

    private static final Duration LOCAL_CACHE_TTL = Duration.ofMinutes(10);
    private static final Duration DIRECTIONS_CACHE_TTL = Duration.ofMinutes(5);
    private static final Duration NO_CACHE = Duration.ZERO;
    private static final int MAX_LOCAL_CACHE_ENTRIES = 1_000;
    private static final int MAX_DIRECTIONS_CACHE_ENTRIES = 500;

    private final WebClient kakaoLocalWebClient;
    private final WebClient kakaoMobilityWebClient;
    private final KakaoApiProperties properties;
    private final KakaoLocalRequestValidator localRequestValidator;
    private final ConcurrentMap<String, Mono<ResponseEntity<String>>> localRequestCache =
        new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Mono<ResponseEntity<String>>> directionsRequestCache =
        new ConcurrentHashMap<>();

    public KakaoApiService(
        @Qualifier("kakaoLocalWebClient") WebClient kakaoLocalWebClient,
        @Qualifier("kakaoMobilityWebClient") WebClient kakaoMobilityWebClient,
        KakaoApiProperties properties,
        KakaoLocalRequestValidator localRequestValidator
    ) {
        this.kakaoLocalWebClient = kakaoLocalWebClient;
        this.kakaoMobilityWebClient = kakaoMobilityWebClient;
        this.properties = properties;
        this.localRequestValidator = localRequestValidator;
    }

    public Mono<ResponseEntity<String>> searchLocal(
        String type,
        MultiValueMap<String, String> params
    ) {
        if (!properties.hasRestApiKey()) {
            return Mono.error(new KakaoApiException(
                "KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다."
            ));
        }

        String endpoint = localRequestValidator.validate(type, params);
        String cacheKey = localCacheKey(type, params);
        trimCache(localRequestCache, MAX_LOCAL_CACHE_ENTRIES);
        return localRequestCache.computeIfAbsent(cacheKey, ignored -> requestLocal(endpoint, params)
            .cache(
                response -> response.getStatusCode().is2xxSuccessful()
                    ? LOCAL_CACHE_TTL
                    : NO_CACHE,
                ignoredError -> NO_CACHE,
                () -> NO_CACHE
            ));
    }

    private Mono<ResponseEntity<String>> requestLocal(
        String endpoint,
        MultiValueMap<String, String> params
    ) {
        return kakaoLocalWebClient.get()
            .uri(uriBuilder -> {
                uriBuilder.pathSegment(endpoint);
                params.forEach((key, values) ->
                    values.forEach(value -> uriBuilder.queryParam(key, value))
                );
                return uriBuilder.build();
            })
            .header(
                HttpHeaders.AUTHORIZATION,
                "KakaoAK " + properties.restApiKey()
            )
            .exchangeToMono(response -> response.bodyToMono(String.class)
                .defaultIfEmpty("")
                .map(body -> ResponseEntity
                    .status(response.statusCode())
                    .contentType(response.headers().contentType()
                        .orElse(MediaType.APPLICATION_JSON))
                    .body(body)))
            .timeout(properties.timeout());
    }

    public Mono<ResponseEntity<String>> findDirections(
        String origin,
        String destination,
        String priority
    ) {
        if (!properties.hasDirectionsKey()) {
            return Mono.error(new KakaoApiException(
                "카카오 길찾기 API 인증키가 설정되지 않았습니다."
            ));
        }

        String cacheKey = origin + '|' + destination + '|' + priority;
        trimCache(directionsRequestCache, MAX_DIRECTIONS_CACHE_ENTRIES);
        return directionsRequestCache.computeIfAbsent(cacheKey, ignored -> requestDirections(
                origin,
                destination,
                priority
            )
            .cache(
                response -> response.getStatusCode().is2xxSuccessful()
                    ? DIRECTIONS_CACHE_TTL
                    : NO_CACHE,
                ignoredError -> NO_CACHE,
                () -> NO_CACHE
            ));
    }

    private Mono<ResponseEntity<String>> requestDirections(
        String origin,
        String destination,
        String priority
    ) {
        return kakaoMobilityWebClient.get()
            .uri(uriBuilder -> uriBuilder
                .path("/v1/directions")
                .queryParam("origin", origin)
                .queryParam("destination", destination)
                .queryParam("priority", priority)
                .build())
            .header(
                HttpHeaders.AUTHORIZATION,
                "KakaoAK " + properties.directionsKey()
            )
            .accept(MediaType.APPLICATION_JSON)
            .exchangeToMono(response -> response.bodyToMono(String.class)
                .defaultIfEmpty("")
                .map(body -> ResponseEntity
                    .status(response.statusCode())
                    .contentType(response.headers().contentType()
                        .orElse(MediaType.APPLICATION_JSON))
                    .body(body)))
            .timeout(properties.timeout())
            .onErrorMap(
                exception -> exception instanceof KakaoApiException
                    ? exception
                    : new KakaoApiException("카카오 길찾기 API 호출에 실패했습니다.")
            );
    }

    private String localCacheKey(
        String type,
        MultiValueMap<String, String> params
    ) {
        String normalizedParams = params.entrySet().stream()
            .sorted(Comparator.comparing(entry -> entry.getKey()))
            .flatMap(entry -> entry.getValue().stream()
                .sorted()
                .map(value -> entry.getKey() + '=' + value))
            .reduce((left, right) -> left + '&' + right)
            .orElse("");
        return type + '?' + normalizedParams;
    }

    private <T> void trimCache(
        ConcurrentMap<String, Mono<T>> cache,
        int maximumSize
    ) {
        if (cache.size() < maximumSize) return;
        var iterator = cache.keySet().iterator();
        if (iterator.hasNext()) cache.remove(iterator.next());
    }
}
