package com.mannayeok.backend.transit.service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import com.mannayeok.backend.transit.config.SubwayApiProperties;
import com.mannayeok.backend.transit.dto.PublicSubwayResponse;
import com.mannayeok.backend.transit.dto.TransitRouteResponse;
import com.mannayeok.backend.transit.error.SubwayApiException;
import reactor.core.publisher.Mono;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class TransitRouteService {

    private static final DateTimeFormatter API_DATE_TIME =
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final ZoneId SEOUL_ZONE = ZoneId.of("Asia/Seoul");
    private static final LocalTime FALLBACK_SEARCH_TIME = LocalTime.of(13, 0);
    private static final LocalTime FIRST_TRAIN_REFERENCE_TIME = LocalTime.of(5, 0);

    private final WebClient subwayWebClient;
    private final SubwayApiProperties properties;
    private final TransitRouteMapper mapper;

    public TransitRouteService(
        @Qualifier("subwayWebClient") WebClient subwayWebClient,
        SubwayApiProperties properties,
        TransitRouteMapper mapper
    ) {
        this.subwayWebClient = subwayWebClient;
        this.properties = properties;
        this.mapper = mapper;
    }

    public Mono<TransitRouteResponse> findRoute(
        String departure,
        String arrival,
        String searchType,
        LocalDateTime departureAt
    ) {
        if (!properties.hasServiceKey()) {
            return Mono.error(new SubwayApiException(
                "SUBWAY_API_SERVICE_KEY 환경변수가 설정되지 않았습니다."
            ));
        }

        LocalDateTime searchDateTime = departureAt == null
            ? LocalDateTime.now(SEOUL_ZONE)
            : departureAt;

        if (isOvernight(searchDateTime)) {
            return requestRoute(
                departure,
                arrival,
                searchType,
                fallbackSearchDateTime(searchDateTime)
            ).flatMap(response -> validateAndMap(response, true));
        }

        return requestRoute(departure, arrival, searchType, searchDateTime)
            .flatMap(response -> {
                if (hasRoute(response)) {
                    return Mono.just(toResponse(response, false));
                }

                return requestRoute(
                    departure,
                    arrival,
                    searchType,
                    fallbackSearchDateTime(searchDateTime)
                ).flatMap(responseAtFallbackTime ->
                    validateAndMap(responseAtFallbackTime, true)
                );
            });
    }

    private Mono<PublicSubwayResponse> requestRoute(
        String departure,
        String arrival,
        String searchType,
        LocalDateTime searchDateTime
    ) {
        return subwayWebClient.get()
            .uri(uriBuilder -> uriBuilder
                .path("/getShtrmPath2")
                .queryParam("serviceKey", properties.serviceKey())
                .queryParam("dataType", "JSON")
                .queryParam("dptreStn", normalizeStationName(departure))
                .queryParam("arvlStn", normalizeStationName(arrival))
                .queryParam("searchDt", API_DATE_TIME.format(searchDateTime))
                .queryParam("searchType", searchType)
                .queryParam("schInclYn", "Y")
                .queryParam("stationValueType", "name")
                .build())
            .retrieve()
            .onStatus(
                HttpStatusCode::isError,
                response -> response.bodyToMono(String.class)
                    .defaultIfEmpty("")
                    .map(body -> new SubwayApiException(
                        "공공 지하철 API 호출에 실패했습니다: HTTP "
                            + response.statusCode().value()
                    ))
            )
            .bodyToMono(PublicSubwayResponse.class)
            .timeout(properties.timeout())
            .flatMap(this::validateResponse);
    }

    private Mono<TransitRouteResponse> validateAndMap(
        PublicSubwayResponse response,
        boolean fallbackSchedule
    ) {
        return validateResponse(response)
            .flatMap(validResponse -> {
                if (!hasRoute(validResponse)) {
                    return Mono.error(new SubwayApiException(
                        "조회 가능한 지하철 운행 경로가 없습니다."
                    ));
                }
                return Mono.just(toResponse(validResponse, fallbackSchedule));
            });
    }

    private TransitRouteResponse toResponse(
        PublicSubwayResponse response,
        boolean fallbackSchedule
    ) {
        TransitRouteResponse route = mapper.toResponse(response.body());
        return new TransitRouteResponse(
            route.minutes(),
            route.durationSeconds(),
            route.transfers(),
            route.fare(),
            route.distanceMeters(),
            route.transferStations(),
            route.routeSteps(),
            route.source(),
            fallbackSchedule
        );
    }

    private Mono<PublicSubwayResponse> validateResponse(
        PublicSubwayResponse response
    ) {
        if (
            response == null
                || response.header() == null
                || !"00".equals(response.header().resultCode())
                || response.body() == null
        ) {
            String message = response != null && response.header() != null
                ? response.header().resultMsg()
                : "응답 본문이 비어 있습니다.";
            return Mono.error(new SubwayApiException(message));
        }
        return Mono.just(response);
    }

    private boolean hasRoute(PublicSubwayResponse response) {
        return response.body().totalReqHr() > 0
            && response.body().paths() != null
            && !response.body().paths().isEmpty();
    }

    private LocalDateTime fallbackSearchDateTime(LocalDateTime searchDateTime) {
        LocalDateTime fallback = searchDateTime
            .toLocalDate()
            .atTime(FALLBACK_SEARCH_TIME);
        return fallback.isAfter(searchDateTime)
            ? fallback
            : fallback.plusDays(1);
    }

    private boolean isOvernight(LocalDateTime searchDateTime) {
        return searchDateTime.toLocalTime().isBefore(FIRST_TRAIN_REFERENCE_TIME);
    }

    static String normalizeStationName(String stationName) {
        String normalized = stationName.trim();
        if ("서울".equals(normalized) || "서울역".equals(normalized)) {
            return "서울역";
        }
        return normalized.endsWith("역")
            ? normalized.substring(0, normalized.length() - 1)
            : normalized;
    }
}
