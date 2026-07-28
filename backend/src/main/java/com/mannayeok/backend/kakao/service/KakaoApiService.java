package com.mannayeok.backend.kakao.service;

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

    private final WebClient kakaoLocalWebClient;
    private final WebClient kakaoMobilityWebClient;
    private final KakaoApiProperties properties;
    private final KakaoLocalRequestValidator localRequestValidator;

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
}
