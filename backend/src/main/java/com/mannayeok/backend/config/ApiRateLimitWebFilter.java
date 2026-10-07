package com.mannayeok.backend.config;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;

import reactor.core.publisher.Mono;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class ApiRateLimitWebFilter implements WebFilter {

    private static final byte[] TOO_MANY_REQUESTS_BODY = (
        "{\"code\":\"TOO_MANY_REQUESTS\","
            + "\"message\":\"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.\"}"
    ).getBytes(StandardCharsets.UTF_8);

    private final boolean enabled;
    private final CorsConfigurationSource corsConfigurationSource;
    private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();
    private final AtomicLong cleanupCounter = new AtomicLong();
    private final LimitRule loginRule;
    private final LimitRule authRule;
    private final LimitRule kakaoProxyRule;
    private final LimitRule transitProxyRule;
    private final LimitRule shareCreateRule;

    public ApiRateLimitWebFilter(
        CorsConfigurationSource corsConfigurationSource,
        @Value("${app.security.rate-limit.enabled:true}") boolean enabled,
        @Value("${app.security.rate-limit.login-requests:10}") int loginRequests,
        @Value("${app.security.rate-limit.login-window-seconds:60}") long loginWindowSeconds,
        @Value("${app.security.rate-limit.auth-requests:30}") int authRequests,
        @Value("${app.security.rate-limit.auth-window-seconds:60}") long authWindowSeconds,
        @Value("${app.security.rate-limit.kakao-requests:120}") int kakaoRequests,
        @Value("${app.security.rate-limit.kakao-window-seconds:60}") long kakaoWindowSeconds,
        @Value("${app.security.rate-limit.transit-requests:120}") int transitRequests,
        @Value("${app.security.rate-limit.transit-window-seconds:60}") long transitWindowSeconds,
        @Value("${app.security.rate-limit.share-create-requests:20}") int shareCreateRequests,
        @Value("${app.security.rate-limit.share-create-window-seconds:3600}") long shareCreateWindowSeconds
    ) {
        this.corsConfigurationSource = corsConfigurationSource;
        this.enabled = enabled;
        this.loginRule = new LimitRule("login", loginRequests, loginWindowSeconds);
        this.authRule = new LimitRule("auth", authRequests, authWindowSeconds);
        this.kakaoProxyRule = new LimitRule("kakao-proxy", kakaoRequests, kakaoWindowSeconds);
        this.transitProxyRule = new LimitRule("transit-proxy", transitRequests, transitWindowSeconds);
        this.shareCreateRule = new LimitRule("share-create", shareCreateRequests, shareCreateWindowSeconds);
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        if (!enabled || exchange.getRequest().getMethod() == HttpMethod.OPTIONS) {
            return chain.filter(exchange);
        }

        LimitRule rule = findRule(exchange.getRequest());
        if (rule == null) {
            return chain.filter(exchange);
        }

        long now = System.currentTimeMillis();
        String key = rule.name() + ':' + clientKey(exchange.getRequest());
        LimitDecision decision = increment(key, rule, now);
        cleanupExpiredCounters(now);
        if (decision.allowed()) {
            return chain.filter(exchange);
        }

        exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        exchange.getResponse().getHeaders().set(HttpHeaders.RETRY_AFTER, String.valueOf(decision.retryAfterSeconds()));
        applyCorsHeaders(exchange);
        return exchange.getResponse().writeWith(Mono.just(
            exchange.getResponse().bufferFactory().wrap(TOO_MANY_REQUESTS_BODY)
        ));
    }

    private void applyCorsHeaders(ServerWebExchange exchange) {
        String origin = exchange.getRequest().getHeaders().getOrigin();
        if (origin == null) return;

        CorsConfiguration configuration =
            corsConfigurationSource.getCorsConfiguration(exchange);
        if (configuration == null) return;

        String allowedOrigin = configuration.checkOrigin(origin);
        if (allowedOrigin == null) return;

        HttpHeaders headers = exchange.getResponse().getHeaders();
        headers.setAccessControlAllowOrigin(allowedOrigin);
        headers.setAccessControlExposeHeaders(configuration.getExposedHeaders());
        headers.add(HttpHeaders.VARY, HttpHeaders.ORIGIN);
    }

    private LimitRule findRule(ServerHttpRequest request) {
        String path = request.getPath().pathWithinApplication().value();
        HttpMethod method = request.getMethod();
        if (method == HttpMethod.POST && "/api/auth/login".equals(path)) {
            return loginRule;
        }
        if (path.startsWith("/api/auth/")) {
            return authRule;
        }
        if (path.startsWith("/api/kakao/")) {
            return kakaoProxyRule;
        }
        if (path.startsWith("/api/transit/")) {
            return transitProxyRule;
        }
        if (method == HttpMethod.POST && "/api/shares".equals(path)) {
            return shareCreateRule;
        }
        return null;
    }

    private LimitDecision increment(String key, LimitRule rule, long now) {
        LimitDecision[] decision = new LimitDecision[1];
        counters.compute(key, (ignored, current) -> {
            long windowMillis = rule.windowSeconds() * 1000L;
            WindowCounter active = current;
            if (active == null || now - active.startedAtMillis() >= windowMillis) {
                active = new WindowCounter(now, 0, windowMillis);
            }
            int nextCount = active.count() + 1;
            long retryAfterMillis = Math.max(1L, windowMillis - (now - active.startedAtMillis()));
            decision[0] = new LimitDecision(
                nextCount <= rule.maxRequests(),
                Math.max(1L, (retryAfterMillis + 999L) / 1000L)
            );
            return new WindowCounter(active.startedAtMillis(), nextCount, windowMillis);
        });
        return decision[0];
    }

    private void cleanupExpiredCounters(long now) {
        if (cleanupCounter.incrementAndGet() % 512 != 0) {
            return;
        }
        counters.entrySet().removeIf(entry -> {
            WindowCounter counter = entry.getValue();
            return now - counter.startedAtMillis() >= counter.windowMillis() * 2;
        });
    }

    private String clientKey(ServerHttpRequest request) {
        InetSocketAddress remoteAddress = request.getRemoteAddress();
        InetAddress remoteInetAddress = remoteAddress == null ? null : remoteAddress.getAddress();
        if (remoteInetAddress != null && remoteInetAddress.isLoopbackAddress()) {
            String realIp = safeAddress(request.getHeaders().getFirst("X-Real-IP"));
            if (realIp != null) {
                return realIp;
            }

            String forwardedFor = request.getHeaders().getFirst("X-Forwarded-For");
            if (forwardedFor != null) {
                String[] addresses = forwardedFor.split(",");
                String forwardedIp = safeAddress(addresses[addresses.length - 1]);
                if (forwardedIp != null) {
                    return forwardedIp;
                }
            }
        }
        if (remoteInetAddress != null) {
            return remoteInetAddress.getHostAddress();
        }
        return "unknown";
    }

    private String safeAddress(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.isEmpty() || normalized.length() > 64 || !normalized.matches("[0-9a-fA-F:.]+")) {
            return null;
        }
        return normalized;
    }

    private record LimitRule(String name, int maxRequests, long windowSeconds) {
        private LimitRule {
            maxRequests = Math.max(1, maxRequests);
            windowSeconds = Math.max(1L, windowSeconds);
        }
    }

    private record WindowCounter(long startedAtMillis, int count, long windowMillis) {
    }

    private record LimitDecision(boolean allowed, long retryAfterSeconds) {
    }
}
