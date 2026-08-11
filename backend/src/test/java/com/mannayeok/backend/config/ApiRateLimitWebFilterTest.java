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
import org.springframework.web.server.WebFilterChain;

import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

class ApiRateLimitWebFilterTest {

    @Test
    void limitsLoginRequestsAndReturnsRetryAfter() {
        ApiRateLimitWebFilter filter = filter(true, 2, 20, 20, 20);
        AtomicInteger calls = new AtomicInteger();
        WebFilterChain chain = exchange -> {
            calls.incrementAndGet();
            return Mono.empty();
        };

        apply(filter, chain, request("POST", "/api/auth/login", "203.0.113.10"));
        apply(filter, chain, request("POST", "/api/auth/login", "203.0.113.10"));
        MockServerWebExchange limited = request("POST", "/api/auth/login", "203.0.113.10");
        apply(filter, chain, limited);

        assertThat(calls).hasValue(2);
        assertThat(limited.getResponse().getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(limited.getResponse().getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isNotBlank();
        String body = limited.getResponse().getBodyAsString().block();
        assertThat(body).contains("TOO_MANY_REQUESTS");
    }

    @Test
    void separatesClientsBehindTheLocalReverseProxy() {
        ApiRateLimitWebFilter filter = filter(true, 1, 20, 20, 20);
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
        ApiRateLimitWebFilter filter = filter(true, 1, 1, 1, 1);
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
        ApiRateLimitWebFilter filter = filter(false, 1, 1, 1, 1);
        AtomicInteger calls = new AtomicInteger();
        WebFilterChain chain = exchange -> {
            calls.incrementAndGet();
            return Mono.empty();
        };

        apply(filter, chain, request("POST", "/api/auth/login", "203.0.113.10"));
        apply(filter, chain, request("POST", "/api/auth/login", "203.0.113.10"));

        assertThat(calls).hasValue(2);
    }

    private ApiRateLimitWebFilter filter(
        boolean enabled,
        int loginRequests,
        int authRequests,
        int proxyRequests,
        int shareRequests
    ) {
        return new ApiRateLimitWebFilter(
            enabled,
            loginRequests,
            60,
            authRequests,
            60,
            proxyRequests,
            60,
            shareRequests,
            3600
        );
    }

    private MockServerWebExchange request(String method, String path, String realIp) {
        MockServerHttpRequest request = MockServerHttpRequest
            .method(org.springframework.http.HttpMethod.valueOf(method), path)
            .remoteAddress(new InetSocketAddress("127.0.0.1", 54321))
            .header("X-Real-IP", realIp)
            .build();
        return MockServerWebExchange.from(request);
    }

    private void apply(
        ApiRateLimitWebFilter filter,
        WebFilterChain chain,
        MockServerWebExchange exchange
    ) {
        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();
    }
}
