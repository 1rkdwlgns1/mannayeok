package com.mannayeok.backend.transit.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.subway")
public record SubwayApiProperties(
    String baseUrl,
    String serviceKey,
    int timeoutSeconds
) {
    public Duration timeout() {
        return Duration.ofSeconds(timeoutSeconds);
    }

    public boolean hasServiceKey() {
        return serviceKey != null && !serviceKey.isBlank();
    }
}
