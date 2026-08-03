package com.mannayeok.backend.transit.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.time.LocalDateTime;
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
}
