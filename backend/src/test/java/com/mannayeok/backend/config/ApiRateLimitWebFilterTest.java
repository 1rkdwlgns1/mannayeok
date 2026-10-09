package com.mannayeok.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.server.WebFilterChain;

import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

class ApiRateLimitWebFilterTest {

    private static final String ALLOWED_ORIGIN = "https://mannayeok.kr";

    @Test
    void limitsLoginRequestsAndReturnsRetryAfter() {
        ApiRateLimitWebFilter filter = filter(true, 2, 20, 20, 20, 20);
        AtomicInteger calls = new AtomicInteger();
        WebFilterChain chain = exchange -> {
            calls.incrementAndGet();
            return Mono.empty();
        };

        apply(filter, chain, request("POST", "/api/auth/login", "203.0.113.10"));
        apply(filter, chain, request("POST", "/api/auth/login", "203.0.113.10"));
        MockServerWebExchange limited = request(
            "POST",
            "/api/auth/login",
            "203.0.113.10",
            ALLOWED_ORIGIN
        );
        apply(filter, chain, limited);

        assertThat(calls).hasValue(2);
        assertThat(limited.getResponse().getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(limited.getResponse().getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isNotBlank();
        assertThat(limited.getResponse().getHeaders().getAccessControlAllowOrigin())
            .isEqualTo(ALLOWED_ORIGIN);
        assertThat(limited.getResponse().getHeaders().getAccessControlExposeHeaders())
            .contains(HttpHeaders.RETRY_AFTER);
        String body = limited.getResponse().getBodyAsString().block();
        assertThat(body).contains("TOO_MANY_REQUESTS");
    }

    @Test
    void doesNotAddCorsHeadersForUntrustedOrigins() {
        ApiRateLimitWebFilter filter = filter(true, 1, 20, 20, 20, 20);
        WebFilterChain chain = exchange -> Mono.empty();

        apply(filter, chain, request("POST", "/api/auth/login", "203.0.113.10"));
        MockServerWebExchange limited = request(
            "POST",
            "/api/auth/login",
            "203.0.113.10",
            "https://untrusted.example"
        );
        apply(filter, chain, limited);

        assertThat(limited.getResponse().getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(limited.getResponse().getHeaders().getAccessControlAllowOrigin()).isNull();
    }

    @Test
    void separatesClientsBehindTheLocalReverseProxy() {
        ApiRateLimitWebFilter filter = filter(true, 1, 20, 20, 20, 20);
        AtomicInteger calls = new AtomicInteger();
        WebFilterChain chain = exchange -> {
            calls.incrementAndGet();
            return Mono.empty();
        };

        apply(filter, chain, request("POST", "/api/auth/login", "203.0.113.10"));
        apply(filter, chain, request("POST", "/api/auth/login", "203.0.113.11"));

        assertThat(calls).hasValue(2);
    }

    @Test
    void bypassesUnmatchedAndOptionsRequests() {
        ApiRateLimitWebFilter filter = filter(true, 1, 1, 1, 1, 1);
        AtomicInteger calls = new AtomicInteger();
        WebFilterChain chain = exchange -> {
            calls.incrementAndGet();
            return Mono.empty();
        };

        apply(filter, chain, request("GET", "/api/health", "203.0.113.10"));
        apply(filter, chain, request("OPTIONS", "/api/auth/login", "203.0.113.10"));

        assertThat(calls).hasValue(2);
    }

    @Test
    void canBeDisabledForControlledEnvironments() {
        ApiRateLimitWebFilter filter = filter(false, 1, 1, 1, 1, 1);
        AtomicInteger calls = new AtomicInteger();
        WebFilterChain chain = exchange -> {
            calls.incrementAndGet();
            return Mono.empty();
        };

        apply(filter, chain, request("POST", "/api/auth/login", "203.0.113.10"));
        apply(filter, chain, request("POST", "/api/auth/login", "203.0.113.10"));

        assertThat(calls).hasValue(2);
    }

    @Test
    void separatesKakaoAndTransitProxyLimits() {
        ApiRateLimitWebFilter filter = filter(true, 20, 20, 1, 1, 20);
        AtomicInteger calls = new AtomicInteger();
        WebFilterChain chain = exchange -> {
            calls.incrementAndGet();
            return Mono.empty();
        };

        apply(filter, chain, request("GET", "/api/kakao/local", "203.0.113.10"));
        apply(filter, chain, request("GET", "/api/transit/routes", "203.0.113.10"));

        MockServerWebExchange limitedKakao =
            request("GET", "/api/kakao/local", "203.0.113.10");
        MockServerWebExchange limitedTransit =
            request("GET", "/api/transit/routes", "203.0.113.10");
        apply(filter, chain, limitedKakao);
        apply(filter, chain, limitedTransit);

        assertThat(calls).hasValue(2);
        assertThat(limitedKakao.getResponse().getStatusCode())
            .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(limitedTransit.getResponse().getStatusCode())
            .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    private ApiRateLimitWebFilter filter(
        boolean enabled,
        int loginRequests,
        int authRequests,
        int kakaoRequests,
        int transitRequests,
        int shareRequests
    ) {
        return new ApiRateLimitWebFilter(
            corsConfigurationSource(),
            enabled,
            loginRequests,
            60,
            authRequests,
            60,
            kakaoRequests,
            60,
            transitRequests,
            60,
            shareRequests,
            3600
        );
    }

    private MockServerWebExchange request(String method, String path, String realIp) {
        return request(method, path, realIp, null);
    }

    private MockServerWebExchange request(
        String method,
        String path,
        String realIp,
        String origin
    ) {
        MockServerHttpRequest.BaseBuilder<?> requestBuilder = MockServerHttpRequest
            .method(org.springframework.http.HttpMethod.valueOf(method), path)
            .remoteAddress(new InetSocketAddress("127.0.0.1", 54321))
            .header("X-Real-IP", realIp);
        if (origin != null) {
            requestBuilder.header(HttpHeaders.ORIGIN, origin);
        }
        return MockServerWebExchange.from(requestBuilder.build());
    }

    private CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(java.util.List.of(ALLOWED_ORIGIN));
        configuration.setExposedHeaders(java.util.List.of(HttpHeaders.RETRY_AFTER));
        return exchange -> configuration;
    }

    private void apply(
        ApiRateLimitWebFilter filter,
        WebFilterChain chain,
        MockServerWebExchange exchange
    ) {
        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();
    }
}
