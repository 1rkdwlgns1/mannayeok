package com.mannayeok.backend.observability;

import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.LongAdder;
import java.util.function.Consumer;
import java.util.function.Function;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import reactor.core.publisher.Mono;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatusCode;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ExternalApiMetrics {

    static final String CLIENT_REQUESTS_METRIC =
        "mannayeok.external.api.client.requests";
    static final String CACHE_LOOKUPS_METRIC =
        "mannayeok.external.api.cache.lookups";
    static final String OUTBOUND_STARTED_METRIC =
        "mannayeok.external.api.requests.started";
    static final String OUTBOUND_COMPLETED_METRIC =
        "mannayeok.external.api.requests.completed";
    static final String OUTBOUND_DURATION_METRIC =
        "mannayeok.external.api.duration";
    static final String FALLBACKS_METRIC =
        "mannayeok.external.api.fallbacks";

    private static final Logger log = LoggerFactory.getLogger(ExternalApiMetrics.class);

    private final MeterRegistry meterRegistry;
    private final Consumer<String> aggregateLogger;
    private final ConcurrentMap<ApiKey, ApiStats> stats = new ConcurrentHashMap<>();
    private final ConcurrentMap<ApiKey, StatsSnapshot> lastReported =
        new ConcurrentHashMap<>();

    @Autowired
    public ExternalApiMetrics(MeterRegistry meterRegistry) {
        this(meterRegistry, message -> log.info("{}", message));
    }

    ExternalApiMetrics(
        MeterRegistry meterRegistry,
        Consumer<String> aggregateLogger
    ) {
        this.meterRegistry = meterRegistry;
        this.aggregateLogger = aggregateLogger;
    }

    public void recordClientRequest(String provider, String operation) {
        safely(() -> metricCounter(
            CLIENT_REQUESTS_METRIC,
            provider,
            operation
        ).increment());
        ApiStats apiStats = safeStats(provider, operation);
        if (apiStats != null) safely(apiStats.clientRequests::increment);
    }

    public void recordCacheLookup(
        String provider,
        String operation,
        boolean entryCreated
    ) {
        String result = entryCreated ? "entry_created" : "entry_reused";
        safely(() -> meterRegistry.counter(
            CACHE_LOOKUPS_METRIC,
            "provider", provider,
            "operation", operation,
            "result", result
        ).increment());

        ApiStats apiStats = safeStats(provider, operation);
        if (apiStats == null) return;
        if (entryCreated) {
            safely(apiStats.cacheEntriesCreated::increment);
        } else {
            safely(apiStats.cacheEntriesReused::increment);
        }
    }

    public void recordFallback(String provider, String operation) {
        safely(() -> metricCounter(
            FALLBACKS_METRIC,
            provider,
            operation
        ).increment());
        ApiStats apiStats = safeStats(provider, operation);
        if (apiStats != null) safely(apiStats.fallbacks::increment);
    }

    public <T> Mono<T> observeOutbound(
        String provider,
        String operation,
        Mono<T> outboundRequest,
        Function<T, String> outcomeClassifier
    ) {
        return Mono.defer(() -> {
            long startedAtNanos = System.nanoTime();
            AtomicBoolean completed = new AtomicBoolean(false);
            ApiStats apiStats = safeStats(provider, operation);

            safely(() -> metricCounter(
                OUTBOUND_STARTED_METRIC,
                provider,
                operation
            ).increment());
            if (apiStats != null) safely(apiStats.outboundStarted::increment);

            return outboundRequest
                .doOnNext(value -> completeOnce(
                    provider,
                    operation,
                    safeOutcome(outcomeClassifier, value),
                    startedAtNanos,
                    completed,
                    apiStats
                ))
                .doOnError(error -> completeOnce(
                    provider,
                    operation,
                    errorOutcome(error),
                    startedAtNanos,
                    completed,
                    apiStats
                ))
                .doOnSuccess(value -> {
                    if (value == null) {
                        completeOnce(
                            provider,
                            operation,
                            "empty",
                            startedAtNanos,
                            completed,
                            apiStats
                        );
                    }
                })
                .doOnCancel(() -> completeOnce(
                    provider,
                    operation,
                    "cancelled",
                    startedAtNanos,
                    completed,
                    apiStats
                ));
        });
    }

    public static String httpOutcome(HttpStatusCode statusCode) {
        if (statusCode == null) return "unknown";
        return "http_" + statusCode.value() / 100 + "xx";
    }

    @Scheduled(
        fixedDelayString =
            "${app.observability.external-api-report-interval-ms:60000}"
    )
    void report() {
        safely(() -> stats.forEach(this::reportOne));
    }

    private void reportOne(ApiKey key, ApiStats apiStats) {
        safely(() -> {
            StatsSnapshot current = apiStats.snapshot();
            StatsSnapshot previous = lastReported.get(key);
            if (current.equals(previous)) return;

            long completedRequests = current.outboundSucceeded()
                + current.outboundFailed()
                + current.outboundTimedOut()
                + current.outboundCancelled();
            double averageDurationMillis = completedRequests == 0
                ? 0
                : current.outboundDurationNanos()
                    / (double) completedRequests
                    / 1_000_000;

            String message = String.format(
                Locale.ROOT,
                "external_api_metrics provider=%s operation=%s "
                    + "client_requests=%d cache_entries_created=%d "
                    + "cache_entries_reused=%d outbound_started=%d "
                    + "outbound_succeeded=%d outbound_failed=%d "
                    + "outbound_timed_out=%d outbound_cancelled=%d "
                    + "fallbacks=%d average_duration_ms=%.2f",
                key.provider(),
                key.operation(),
                current.clientRequests(),
                current.cacheEntriesCreated(),
                current.cacheEntriesReused(),
                current.outboundStarted(),
                current.outboundSucceeded(),
                current.outboundFailed(),
                current.outboundTimedOut(),
                current.outboundCancelled(),
                current.fallbacks(),
                averageDurationMillis
            );
            aggregateLogger.accept(message);
            lastReported.put(key, current);
        });
    }

    private void completeOnce(
        String provider,
        String operation,
        String outcome,
        long startedAtNanos,
        AtomicBoolean completed,
        ApiStats apiStats
    ) {
        if (!completed.compareAndSet(false, true)) return;

        long durationNanos = Math.max(System.nanoTime() - startedAtNanos, 0);
        safely(() -> meterRegistry.counter(
            OUTBOUND_COMPLETED_METRIC,
            "provider", provider,
            "operation", operation,
            "outcome", outcome
        ).increment());
        safely(() -> meterRegistry.timer(
            OUTBOUND_DURATION_METRIC,
            "provider", provider,
            "operation", operation,
            "outcome", outcome
        ).record(durationNanos, TimeUnit.NANOSECONDS));

        if (apiStats == null) return;
        safely(() -> apiStats.outboundDurationNanos.add(durationNanos));
        if ("timeout".equals(outcome)) {
            safely(apiStats.outboundTimedOut::increment);
        } else if ("cancelled".equals(outcome)) {
            safely(apiStats.outboundCancelled::increment);
        } else if (isSuccess(outcome)) {
            safely(apiStats.outboundSucceeded::increment);
        } else {
            safely(apiStats.outboundFailed::increment);
        }
    }

    private <T> String safeOutcome(
        Function<T, String> outcomeClassifier,
        T value
    ) {
        try {
            String outcome = outcomeClassifier.apply(value);
            return outcome == null || outcome.isBlank() ? "unknown" : outcome;
        } catch (RuntimeException ignored) {
            return "unknown";
        }
    }

    private String errorOutcome(Throwable error) {
        Throwable current = error;
        while (current != null) {
            if (current instanceof TimeoutException) return "timeout";
            current = current.getCause();
        }
        return "error";
    }

    private boolean isSuccess(String outcome) {
        return "success".equals(outcome) || "http_2xx".equals(outcome);
    }

    private Counter metricCounter(
        String name,
        String provider,
        String operation
    ) {
        return meterRegistry.counter(
            name,
            "provider", provider,
            "operation", operation
        );
    }

    private ApiStats safeStats(String provider, String operation) {
        try {
            return stats.computeIfAbsent(
                new ApiKey(provider, operation),
                ignored -> new ApiStats()
            );
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private void safely(Runnable action) {
        try {
            action.run();
        } catch (RuntimeException ignored) {
            // Observability must never change the application response.
        }
    }

    private record ApiKey(String provider, String operation) {
    }

    private static final class ApiStats {
        private final LongAdder clientRequests = new LongAdder();
        private final LongAdder cacheEntriesCreated = new LongAdder();
        private final LongAdder cacheEntriesReused = new LongAdder();
        private final LongAdder outboundStarted = new LongAdder();
        private final LongAdder outboundSucceeded = new LongAdder();
        private final LongAdder outboundFailed = new LongAdder();
        private final LongAdder outboundTimedOut = new LongAdder();
        private final LongAdder outboundCancelled = new LongAdder();
        private final LongAdder outboundDurationNanos = new LongAdder();
        private final LongAdder fallbacks = new LongAdder();

        private StatsSnapshot snapshot() {
            return new StatsSnapshot(
                clientRequests.sum(),
                cacheEntriesCreated.sum(),
                cacheEntriesReused.sum(),
                outboundStarted.sum(),
                outboundSucceeded.sum(),
                outboundFailed.sum(),
                outboundTimedOut.sum(),
                outboundCancelled.sum(),
                outboundDurationNanos.sum(),
                fallbacks.sum()
            );
        }
    }

    private record StatsSnapshot(
        long clientRequests,
        long cacheEntriesCreated,
        long cacheEntriesReused,
        long outboundStarted,
        long outboundSucceeded,
        long outboundFailed,
        long outboundTimedOut,
        long outboundCancelled,
        long outboundDurationNanos,
        long fallbacks
    ) {
    }
}
