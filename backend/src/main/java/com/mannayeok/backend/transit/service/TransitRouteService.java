package com.mannayeok.backend.transit.service;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import com.mannayeok.backend.transit.config.SubwayApiProperties;
import com.mannayeok.backend.transit.dto.PublicSubwayResponse;
import com.mannayeok.backend.transit.dto.TransitRouteResponse;
import com.mannayeok.backend.transit.error.SubwayApiException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import org.springframework.beans.factory.annotation.Autowired;
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
    private static final int TRANSFER_BURDEN_SECONDS = 5 * 60;
    private static final int OPTIMAL_TRANSFER_BURDEN_SECONDS = 6 * 60;
    private static final int OPTIMAL_DISTANCE_DIVISOR = 200;
    private static final int NEARBY_ROUTE_DURATION_SECONDS = 2 * 60;
    private static final Duration ROUTE_CACHE_TTL = Duration.ofMinutes(5);
    private static final Duration NO_CACHE = Duration.ZERO;
    private static final int MAX_ROUTE_CACHE_ENTRIES = 500;

    private final WebClient subwayWebClient;
    private final SubwayApiProperties properties;
    private final TransitRouteMapper mapper;
    private final StationCodeResolver stationCodeResolver;
    private final Clock clock;
    private final Duration routeCacheTtl;
    private final ConcurrentMap<String, Mono<TransitRouteResponse>> routeCache =
        new ConcurrentHashMap<>();

    @Autowired
    public TransitRouteService(
        @Qualifier("subwayWebClient") WebClient subwayWebClient,
        SubwayApiProperties properties,
        TransitRouteMapper mapper,
        StationCodeResolver stationCodeResolver
    ) {
        this(
            subwayWebClient,
            properties,
            mapper,
            stationCodeResolver,
            Clock.system(SEOUL_ZONE),
            ROUTE_CACHE_TTL
        );
    }

    TransitRouteService(
        WebClient subwayWebClient,
        SubwayApiProperties properties,
        TransitRouteMapper mapper,
        StationCodeResolver stationCodeResolver,
        Clock clock,
        Duration routeCacheTtl
    ) {
        this.subwayWebClient = subwayWebClient;
        this.properties = properties;
        this.mapper = mapper;
        this.stationCodeResolver = stationCodeResolver;
        this.clock = clock;
        this.routeCacheTtl = routeCacheTtl;
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

        String cacheKey = routeCacheKey(departure, arrival, searchType, departureAt);
        trimRouteCache();
        return routeCache.computeIfAbsent(cacheKey, ignored -> Mono.defer(() ->
                findRouteUncached(departure, arrival, searchType, departureAt)
            )
            .cache(
                ignoredResult -> routeCacheTtl,
                ignoredError -> NO_CACHE,
                () -> NO_CACHE
            ));
    }

    private Mono<TransitRouteResponse> findRouteUncached(
        String departure,
        String arrival,
        String searchType,
        LocalDateTime departureAt
    ) {

        LocalDateTime searchDateTime = departureAt == null
            ? LocalDateTime.now(clock)
            : departureAt;
        List<String> departureCodes = resolveStationCodes(departure);
        List<String> arrivalCodes = resolveStationCodes(arrival);

        if (isOvernight(searchDateTime)) {
            return findBestRouteForSearchType(
                departureCodes,
                arrivalCodes,
                searchType,
                fallbackSearchDateTime(searchDateTime),
                true
            ).switchIfEmpty(noRouteError());
        }

        return findBestRouteForSearchType(
            departureCodes,
            arrivalCodes,
            searchType,
            searchDateTime,
            false
        ).switchIfEmpty(
            findBestRouteForSearchType(
                    departureCodes,
                    arrivalCodes,
                    searchType,
                    fallbackSearchDateTime(searchDateTime),
                    true
                )
                .switchIfEmpty(noRouteError())
        );
    }

    private String routeCacheKey(
        String departure,
        String arrival,
        String searchType,
        LocalDateTime departureAt
    ) {
        String scheduleKey = departureAt == null ? "current" : departureAt.toString();
        return departure.trim() + '|' + arrival.trim() + '|' + searchType + '|' + scheduleKey;
    }

    private void trimRouteCache() {
        if (routeCache.size() < MAX_ROUTE_CACHE_ENTRIES) return;
        var iterator = routeCache.keySet().iterator();
        if (iterator.hasNext()) routeCache.remove(iterator.next());
    }

    private Mono<TransitRouteResponse> findBestRouteForSearchType(
        List<String> departureCodes,
        List<String> arrivalCodes,
        String searchType,
        LocalDateTime searchDateTime,
        boolean fallbackSchedule
    ) {
        if ("optimal".equals(searchType)) {
            return findOptimalRoute(
                departureCodes,
                arrivalCodes,
                searchDateTime,
                fallbackSchedule
            );
        }

        if (!"balanced".equals(searchType)) {
            return findBestRoute(
                departureCodes,
                arrivalCodes,
                searchType,
                searchDateTime,
                fallbackSchedule
            );
        }

        Mono<TransitRouteResponse> fastest = findBestRoute(
            departureCodes,
            arrivalCodes,
            "duration",
            searchDateTime,
            fallbackSchedule
        ).onErrorResume(SubwayApiException.class, ignored -> Mono.empty());
        Mono<TransitRouteResponse> fewestTransfers = findBestRoute(
            departureCodes,
            arrivalCodes,
            "transfer",
            searchDateTime,
            fallbackSchedule
        ).onErrorResume(SubwayApiException.class, ignored -> Mono.empty());

        return Flux.concat(fastest, fewestTransfers)
            .reduce(this::betterBalancedRoute);
    }

    private Mono<TransitRouteResponse> findOptimalRoute(
        List<String> departureCodes,
        List<String> arrivalCodes,
        LocalDateTime searchDateTime,
        boolean fallbackSchedule
    ) {
        Mono<TransitRouteResponse> fastest = findBestRoute(
            departureCodes,
            arrivalCodes,
            "duration",
            searchDateTime,
            fallbackSchedule
        ).onErrorResume(SubwayApiException.class, ignored -> Mono.empty());
        Mono<TransitRouteResponse> fewestTransfers = findBestRoute(
            departureCodes,
            arrivalCodes,
            "transfer",
            searchDateTime,
            fallbackSchedule
        ).onErrorResume(SubwayApiException.class, ignored -> Mono.empty());
        Mono<TransitRouteResponse> shortestDistance = findBestRoute(
            departureCodes,
            arrivalCodes,
            "distance",
            searchDateTime,
            fallbackSchedule
        ).onErrorResume(SubwayApiException.class, ignored -> Mono.empty());

        return Flux.concat(fastest, fewestTransfers, shortestDistance)
            .reduce(this::betterOptimalRoute);
    }

    private Mono<TransitRouteResponse> findBestRoute(
        List<String> departureCodes,
        List<String> arrivalCodes,
        String searchType,
        LocalDateTime searchDateTime,
        boolean fallbackSchedule
    ) {
        AtomicBoolean receivedValidResponse = new AtomicBoolean(false);
        AtomicReference<SubwayApiException> firstApiError = new AtomicReference<>();

        return Flux.fromIterable(routeQueries(departureCodes, arrivalCodes))
            .flatMap(query -> requestRoute(
                    query.departureCode(),
                    query.arrivalCode(),
                    searchType,
                    searchDateTime
                )
                .doOnNext(ignored -> receivedValidResponse.set(true))
                .filter(this::hasRoute)
                .map(response -> toResponse(response, fallbackSchedule))
                .onErrorResume(SubwayApiException.class, exception -> {
                    firstApiError.compareAndSet(null, exception);
                    return Mono.empty();
                }),
                4
            )
            .reduce((left, right) -> betterRoute(left, right, searchType))
            .switchIfEmpty(Mono.defer(() -> {
                SubwayApiException apiError = firstApiError.get();
                if (!receivedValidResponse.get() && apiError != null) {
                    return Mono.error(apiError);
                }
                return Mono.empty();
            }));
    }

    private Mono<PublicSubwayResponse> requestRoute(
        String departureCode,
        String arrivalCode,
        String searchType,
        LocalDateTime searchDateTime
    ) {
        return subwayWebClient.get()
            .uri(uriBuilder -> uriBuilder
                .path("/getShtrmPath2")
                .queryParam("serviceKey", properties.serviceKey())
                .queryParam("dataType", "JSON")
                .queryParam("dptreStn", departureCode)
                .queryParam("arvlStn", arrivalCode)
                .queryParam("searchDt", API_DATE_TIME.format(searchDateTime))
                .queryParam("searchType", searchType)
                .queryParam("schInclYn", "Y")
                .queryParam("stationValueType", "code")
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
            .onErrorMap(
                TimeoutException.class,
                ignored -> new SubwayApiException("공공 지하철 API 응답 시간이 초과되었습니다.")
            )
            .flatMap(this::validateResponse);
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

    private List<String> resolveStationCodes(String stationName) {
        try {
            return stationCodeResolver.resolve(stationName);
        } catch (IllegalArgumentException exception) {
            throw new SubwayApiException(exception.getMessage());
        }
    }

    private List<RouteQuery> routeQueries(
        List<String> departureCodes,
        List<String> arrivalCodes
    ) {
        return departureCodes.stream()
            .flatMap(departureCode -> arrivalCodes.stream()
                .filter(arrivalCode -> !departureCode.equals(arrivalCode))
                .map(arrivalCode -> new RouteQuery(departureCode, arrivalCode)))
            .toList();
    }

    private TransitRouteResponse betterRoute(
        TransitRouteResponse left,
        TransitRouteResponse right,
        String searchType
    ) {
        Comparator<TransitRouteResponse> comparator = switch (searchType) {
            case "distance" -> Comparator
                .comparingInt(TransitRouteResponse::distanceMeters)
                .thenComparingInt(TransitRouteResponse::durationSeconds);
            case "transfer" -> Comparator
                .comparingInt(TransitRouteResponse::transfers)
                .thenComparingInt(TransitRouteResponse::durationSeconds);
            default -> Comparator
                .comparingInt(TransitRouteResponse::durationSeconds)
                .thenComparingInt(TransitRouteResponse::transfers);
        };
        return comparator.compare(left, right) <= 0 ? left : right;
    }

    private TransitRouteResponse betterBalancedRoute(
        TransitRouteResponse left,
        TransitRouteResponse right
    ) {
        long leftScore = balancedScore(left);
        long rightScore = balancedScore(right);
        if (leftScore != rightScore) return leftScore < rightScore ? left : right;
        if (left.transfers() != right.transfers()) {
            return left.transfers() < right.transfers() ? left : right;
        }
        return left.durationSeconds() <= right.durationSeconds() ? left : right;
    }

    private long balancedScore(TransitRouteResponse route) {
        return route.durationSeconds()
            + (long) route.transfers() * TRANSFER_BURDEN_SECONDS;
    }

    private TransitRouteResponse betterOptimalRoute(
        TransitRouteResponse left,
        TransitRouteResponse right
    ) {
        if (
            left.transfers() == right.transfers()
                && Math.abs(left.durationSeconds() - right.durationSeconds())
                    <= NEARBY_ROUTE_DURATION_SECONDS
                && left.distanceMeters() != right.distanceMeters()
        ) {
            return left.distanceMeters() < right.distanceMeters() ? left : right;
        }

        long leftScore = optimalScore(left);
        long rightScore = optimalScore(right);
        if (leftScore != rightScore) return leftScore < rightScore ? left : right;
        if (left.transfers() != right.transfers()) {
            return left.transfers() < right.transfers() ? left : right;
        }
        if (left.durationSeconds() != right.durationSeconds()) {
            return left.durationSeconds() < right.durationSeconds() ? left : right;
        }
        return left.distanceMeters() <= right.distanceMeters() ? left : right;
    }

    private long optimalScore(TransitRouteResponse route) {
        return route.durationSeconds()
            + (long) route.transfers() * OPTIMAL_TRANSFER_BURDEN_SECONDS
            + route.distanceMeters() / OPTIMAL_DISTANCE_DIVISOR;
    }

    private Mono<TransitRouteResponse> noRouteError() {
        return Mono.error(new SubwayApiException("조회 가능한 지하철 운행 경로가 없습니다."));
    }

    private record RouteQuery(String departureCode, String arrivalCode) {
    }
}
