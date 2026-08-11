package com.mannayeok.backend.transit.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mannayeok.backend.transit.config.SubwayApiProperties;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

class TransitRouteServiceTest {

    private final StationCodeResolver resolver = new StationCodeResolver(new ObjectMapper());

    @Test
    void resolvesSeoulAliasesToEveryOfficialStationCode() {
        assertThat(resolver.resolve("서울"))
            .containsExactlyInAnyOrder("0150", "0426", "1251", "4201");
        assertThat(resolver.resolve("서울역"))
            .containsExactlyInAnyOrder("0150", "0426", "1251", "4201");
    }

    @Test
    void resolvesStationSuffixAndTransferStationCodes() {
        assertThat(resolver.resolve("강남역"))
            .containsExactlyInAnyOrder("0222", "4307");
        assertThat(resolver.resolve("창동"))
            .containsExactlyInAnyOrder("1022", "0412");
        assertThat(resolver.resolve("덕정역"))
            .containsExactly("1911");
    }

    @Test
    void requestsThePublicApiWithOfficialStationCodes() {
        AtomicReference<URI> requestedUri = new AtomicReference<>();
        WebClient webClient = WebClient.builder()
            .baseUrl("https://example.test")
            .exchangeFunction(request -> {
                requestedUri.set(request.url());
                return Mono.just(ClientResponse.create(HttpStatus.OK)
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .body(successResponse())
                    .build());
            })
            .build();
        TransitRouteService service = new TransitRouteService(
            webClient,
            new SubwayApiProperties("https://example.test", "test-key", 5),
            new TransitRouteMapper(),
            resolver
        );

        StepVerifier.create(service.findRoute(
                "덕정역",
                "녹양",
                "duration",
                LocalDateTime.of(2026, 8, 3, 13, 0)
            ))
            .assertNext(route -> assertThat(route.durationSeconds()).isEqualTo(600))
            .verifyComplete();

        var queryParams = UriComponentsBuilder.fromUri(requestedUri.get())
            .build()
            .getQueryParams();
        assertThat(queryParams.getFirst("dptreStn")).isEqualTo("1911");
        assertThat(queryParams.getFirst("arvlStn")).isEqualTo("1908");
        assertThat(queryParams.getFirst("stationValueType")).isEqualTo("code");
        assertThat(queryParams.getFirst("searchDt"))
            .isEqualTo("2026-08-03%2013:00:00");
    }

    @Test
    void optimalSearchPrefersThirtyOneMinuteDirectRouteOverTwentyOneMinuteTwoTransferRoute() {
        Set<String> requestedSearchTypes = ConcurrentHashMap.newKeySet();
        WebClient webClient = WebClient.builder()
            .baseUrl("https://example.test")
            .exchangeFunction(request -> {
                String searchType = UriComponentsBuilder.fromUri(request.url())
                    .build()
                    .getQueryParams()
                    .getFirst("searchType");
                requestedSearchTypes.add(searchType);
                String body = "transfer".equals(searchType)
                    ? directRouteResponse()
                    : twoTransferRouteResponse();
                return Mono.just(ClientResponse.create(HttpStatus.OK)
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .body(body)
                    .build());
            })
            .build();
        TransitRouteService service = new TransitRouteService(
            webClient,
            new SubwayApiProperties("https://example.test", "test-key", 5),
            new TransitRouteMapper(),
            resolver
        );

        StepVerifier.create(service.findRoute(
                "강남",
                "동대문역사문화공원",
                "optimal",
                LocalDateTime.of(2026, 8, 7, 18, 24)
            ))
            .assertNext(route -> {
                assertThat(route.durationSeconds()).isEqualTo(1830);
                assertThat(route.transfers()).isZero();
                assertThat(route.routeSteps())
                    .extracting(step -> step.line())
                    .containsOnly("2호선");
            })
            .verifyComplete();

        assertThat(requestedSearchTypes)
            .contains("duration", "transfer", "distance");
    }

    @Test
    void optimalSearchPrefersShorterDistanceWhenTransferCountMatchesAndTimeIsClose() {
        WebClient webClient = WebClient.builder()
            .baseUrl("https://example.test")
            .exchangeFunction(request -> {
                String searchType = UriComponentsBuilder.fromUri(request.url())
                    .build()
                    .getQueryParams()
                    .getFirst("searchType");
                String body = "duration".equals(searchType)
                    ? oneTransferRouteResponse(1530, 15157, "창동", "4호선")
                    : oneTransferRouteResponse(1620, 13860, "도봉산", "7호선");
                return Mono.just(ClientResponse.create(HttpStatus.OK)
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .body(body)
                    .build());
            })
            .build();
        TransitRouteService service = new TransitRouteService(
            webClient,
            new SubwayApiProperties("https://example.test", "test-key", 5),
            new TransitRouteMapper(),
            resolver
        );

        StepVerifier.create(service.findRoute(
                "양주",
                "노원",
                "optimal",
                LocalDateTime.of(2026, 8, 11, 14, 0)
            ))
            .assertNext(route -> {
                assertThat(route.durationSeconds()).isEqualTo(1620);
                assertThat(route.transfers()).isEqualTo(1);
                assertThat(route.transferStations()).containsExactly("도봉산");
                assertThat(route.routeSteps())
                    .extracting(step -> step.line())
                    .containsExactly("1호선", "7호선", "7호선");
            })
            .verifyComplete();
    }

    @Test
    void reusesSuccessfulIdenticalRouteRequests() {
        AtomicInteger requestCount = new AtomicInteger();
        WebClient webClient = WebClient.builder()
            .baseUrl("https://example.test")
            .exchangeFunction(request -> {
                requestCount.incrementAndGet();
                return Mono.just(ClientResponse.create(HttpStatus.OK)
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .body(successResponse())
                    .build());
            })
            .build();
        TransitRouteService service = new TransitRouteService(
            webClient,
            new SubwayApiProperties("https://example.test", "test-key", 5),
            new TransitRouteMapper(),
            resolver
        );
        LocalDateTime departureAt = LocalDateTime.of(2026, 8, 11, 14, 0);

        StepVerifier.create(service.findRoute("덕정", "녹양", "optimal", departureAt))
            .expectNextCount(1)
            .verifyComplete();
        StepVerifier.create(service.findRoute("덕정", "녹양", "optimal", departureAt))
            .expectNextCount(1)
            .verifyComplete();

        assertThat(requestCount).hasValue(3);
    }

    private String successResponse() {
        return """
            {
              "header": {"resultCode": "00", "resultMsg": "정상"},
              "body": {
                "totalDstc": 1000,
                "totalReqHr": 600,
                "totalCardCrg": 1500,
                "trsitNmtm": 0,
                "trfstnNms": [],
                "paths": [
                  {
                    "dptreStn": {"stnCd": "1911", "stnNm": "덕정", "lineNm": "1호선"},
                    "arvlStn": {"stnCd": "1908", "stnNm": "녹양", "lineNm": "1호선"},
                    "reqHr": 600,
                    "wtngHr": 0,
                    "trsitYn": "N"
                  }
                ]
              }
            }
            """;
    }

    private String directRouteResponse() {
        return """
            {
              "header": {"resultCode": "00", "resultMsg": "정상"},
              "body": {
                "totalDstc": 18934,
                "totalReqHr": 1830,
                "totalCardCrg": 1550,
                "trsitNmtm": 0,
                "trfstnNms": [],
                "paths": [
                  {
                    "dptreStn": {"stnCd": "0222", "stnNm": "강남", "lineNm": "2호선"},
                    "arvlStn": {"stnCd": "0205", "stnNm": "동대문역사문화공원", "lineNm": "2호선"},
                    "reqHr": 1830,
                    "wtngHr": 0,
                    "trsitYn": "N"
                  }
                ]
              }
            }
            """;
    }

    private String oneTransferRouteResponse(
        int durationSeconds,
        int distanceMeters,
        String transferStation,
        String arrivalLine
    ) {
        return """
            {
              "header": {"resultCode": "00", "resultMsg": "정상"},
              "body": {
                "totalDstc": %d,
                "totalReqHr": %d,
                "totalCardCrg": 1650,
                "trsitNmtm": 1,
                "trfstnNms": [],
                "paths": [
                  {
                    "dptreStn": {"stnCd": "1902", "stnNm": "양주", "lineNm": "1호선"},
                    "arvlStn": {"stnCd": "transfer", "stnNm": "%s", "lineNm": "%s"},
                    "reqHr": 900,
                    "wtngHr": 0,
                    "trsitYn": "Y"
                  },
                  {
                    "dptreStn": {"stnCd": "transfer", "stnNm": "%s", "lineNm": "%s"},
                    "arvlStn": {"stnCd": "arrival", "stnNm": "노원", "lineNm": "%s"},
                    "reqHr": 630,
                    "wtngHr": 0,
                    "trsitYn": "N"
                  }
                ]
              }
            }
            """.formatted(
                distanceMeters,
                durationSeconds,
                transferStation,
                arrivalLine,
                transferStation,
                arrivalLine,
                arrivalLine
            );
    }

    private String twoTransferRouteResponse() {
        return """
            {
              "header": {"resultCode": "00", "resultMsg": "정상"},
              "body": {
                "totalDstc": 10951,
                "totalReqHr": 1232,
                "totalCardCrg": 2250,
                "trsitNmtm": 2,
                "trfstnNms": [
                  {"stnNm": "신사", "dptreLineNm": "신분당선", "arvlLineNm": "3호선"},
                  {"stnNm": "충무로", "dptreLineNm": "3호선", "arvlLineNm": "4호선"}
                ],
                "paths": [
                  {
                    "dptreStn": {"stnCd": "4307", "stnNm": "강남", "lineNm": "신분당선"},
                    "arvlStn": {"stnCd": "0337", "stnNm": "신사", "lineNm": "3호선"},
                    "reqHr": 260,
                    "wtngHr": 0,
                    "trsitYn": "Y"
                  },
                  {
                    "dptreStn": {"stnCd": "0337", "stnNm": "신사", "lineNm": "3호선"},
                    "arvlStn": {"stnCd": "0423", "stnNm": "충무로", "lineNm": "4호선"},
                    "reqHr": 520,
                    "wtngHr": 0,
                    "trsitYn": "Y"
                  },
                  {
                    "dptreStn": {"stnCd": "0423", "stnNm": "충무로", "lineNm": "4호선"},
                    "arvlStn": {"stnCd": "0422", "stnNm": "동대문역사문화공원", "lineNm": "4호선"},
                    "reqHr": 452,
                    "wtngHr": 0,
                    "trsitYn": "N"
                  }
                ]
              }
            }
            """;
    }
}
