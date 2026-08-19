package com.mannayeok.backend.observability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import org.junit.jupiter.api.Test;

class ExternalApiMetricsTest {

    @Test
    void recordsClientCacheFallbackAndSuccessfulOutboundMetrics() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        ExternalApiMetrics metrics = new ExternalApiMetrics(registry);

        metrics.recordClientRequest("kakao", "local");
        metrics.recordCacheLookup("kakao", "local", true);
        metrics.recordCacheLookup("kakao", "local", false);
        metrics.recordFallback("kakao", "local");

        StepVerifier.create(metrics.observeOutbound(
                "kakao",
                "local",
                Mono.just("response"),
                ignored -> "http_2xx"
            ))
            .expectNext("response")
            .verifyComplete();

        assertThat(counter(registry, ExternalApiMetrics.CLIENT_REQUESTS_METRIC))
            .isEqualTo(1);
        assertThat(registry.get(ExternalApiMetrics.CACHE_LOOKUPS_METRIC)
            .tags(
                "provider", "kakao",
                "operation", "local",
                "result", "entry_created"
            )
            .counter()
            .count()).isEqualTo(1);
        assertThat(registry.get(ExternalApiMetrics.CACHE_LOOKUPS_METRIC)
            .tags(
                "provider", "kakao",
                "operation", "local",
                "result", "entry_reused"
            )
            .counter()
            .count()).isEqualTo(1);
        assertThat(counter(registry, ExternalApiMetrics.OUTBOUND_STARTED_METRIC))
            .isEqualTo(1);
        assertThat(registry.get(ExternalApiMetrics.OUTBOUND_COMPLETED_METRIC)
            .tags(
                "provider", "kakao",
                "operation", "local",
                "outcome", "http_2xx"
            )
            .counter()
            .count()).isEqualTo(1);
        assertThat(counter(registry, ExternalApiMetrics.FALLBACKS_METRIC))
            .isEqualTo(1);
        assertThat(registry.get(ExternalApiMetrics.OUTBOUND_DURATION_METRIC)
            .tags(
                "provider", "kakao",
                "operation", "local",
                "outcome", "http_2xx"
            )
            .timer()
            .count()).isEqualTo(1);
    }

    @Test
    void recordsTimeoutWithoutChangingThePropagatedError() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        ExternalApiMetrics metrics = new ExternalApiMetrics(registry);
        TimeoutException timeout = new TimeoutException("fixture timeout");

        StepVerifier.create(metrics.observeOutbound(
                "seoul_subway",
                "route",
                Mono.error(timeout),
                ignored -> "success"
            ))
            .expectErrorSatisfies(error -> assertThat(error).isSameAs(timeout))
            .verify();

        assertThat(registry.get(ExternalApiMetrics.OUTBOUND_COMPLETED_METRIC)
            .tags(
                "provider", "seoul_subway",
                "operation", "route",
                "outcome", "timeout"
            )
            .counter()
            .count()).isEqualTo(1);
    }

    @Test
    void preservesSuccessfulResponseWhenOutboundStartMetricFails() {
        MeterRegistry registry = meterRegistry();
        when(registry.counter(
            eq(ExternalApiMetrics.OUTBOUND_STARTED_METRIC),
            any(String[].class)
        )).thenThrow(new IllegalStateException("start metric failure"));
        ExternalApiMetrics metrics = new ExternalApiMetrics(registry);
        AtomicInteger apiCalls = new AtomicInteger();

        StepVerifier.create(metrics.observeOutbound(
                "kakao",
                "local.keyword",
                Mono.defer(() -> {
                    apiCalls.incrementAndGet();
                    return Mono.just("original response");
                }),
                ignored -> "http_2xx"
            ))
            .expectNext("original response")
            .verifyComplete();

        assertThat(apiCalls).hasValue(1);
    }

    @Test
    void preservesSuccessfulResponseWhenCompletionCounterFails() {
        MeterRegistry registry = meterRegistry();
        when(registry.counter(
            eq(ExternalApiMetrics.OUTBOUND_COMPLETED_METRIC),
            any(String[].class)
        )).thenThrow(new IllegalStateException("completion counter failure"));
        ExternalApiMetrics metrics = new ExternalApiMetrics(registry);

        StepVerifier.create(metrics.observeOutbound(
                "kakao",
                "directions",
                Mono.just("original response"),
                ignored -> "http_2xx"
            ))
            .expectNext("original response")
            .verifyComplete();
    }

    @Test
    void preservesSuccessfulResponseWhenCompletionTimerFails() {
        MeterRegistry registry = meterRegistry();
        when(registry.timer(
            eq(ExternalApiMetrics.OUTBOUND_DURATION_METRIC),
            any(String[].class)
        )).thenThrow(new IllegalStateException("completion timer failure"));
        ExternalApiMetrics metrics = new ExternalApiMetrics(registry);

        StepVerifier.create(metrics.observeOutbound(
                "seoul_subway",
                "route.duration",
                Mono.just("original response"),
                ignored -> "success"
            ))
            .expectNext("original response")
            .verifyComplete();
    }

    @Test
    void preservesOriginalApiErrorWhenEveryMetricOperationFails() {
        MeterRegistry registry = mock(MeterRegistry.class);
        when(registry.counter(anyString(), any(String[].class)))
            .thenThrow(new IllegalStateException("counter failure"));
        when(registry.timer(anyString(), any(String[].class)))
            .thenThrow(new IllegalStateException("timer failure"));
        ExternalApiMetrics metrics = new ExternalApiMetrics(registry);
        IllegalArgumentException originalError =
            new IllegalArgumentException("original api failure");

        StepVerifier.create(metrics.observeOutbound(
                "seoul_subway",
                "route.transfer",
                Mono.error(originalError),
                ignored -> "success"
            ))
            .expectErrorSatisfies(error -> assertThat(error).isSameAs(originalError))
            .verify();
    }

    @Test
    void retriesAggregateLoggingAfterOneReportingFailure() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        AtomicInteger attempts = new AtomicInteger();
        AtomicInteger successes = new AtomicInteger();
        ExternalApiMetrics metrics = new ExternalApiMetrics(registry, message -> {
            if (attempts.incrementAndGet() == 1) {
                throw new IllegalStateException("aggregate logging failure");
            }
            successes.incrementAndGet();
        });
        metrics.recordClientRequest("kakao", "local.category");

        metrics.report();
        metrics.report();
        metrics.report();

        assertThat(attempts).hasValue(2);
        assertThat(successes).hasValue(1);
    }

    private double counter(SimpleMeterRegistry registry, String metricName) {
        return registry.get(metricName)
            .tags("provider", "kakao", "operation", "local")
            .counter()
            .count();
    }

    private MeterRegistry meterRegistry() {
        MeterRegistry registry = mock(MeterRegistry.class);
        when(registry.counter(anyString(), any(String[].class)))
            .thenReturn(mock(Counter.class));
        when(registry.timer(anyString(), any(String[].class)))
            .thenReturn(mock(Timer.class));
        return registry;
    }
}
