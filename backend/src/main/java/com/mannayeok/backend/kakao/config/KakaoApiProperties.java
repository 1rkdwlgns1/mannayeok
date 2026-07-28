package com.mannayeok.backend.kakao.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.kakao")
public record KakaoApiProperties(
    String localBaseUrl,
    String mobilityBaseUrl,
    String restApiKey,
    String mobilityKey,
    int timeoutSeconds
) {
    public Duration timeout() {
        return Duration.ofSeconds(timeoutSeconds);
    }

    public String directionsKey() {
        return mobilityKey == null || mobilityKey.isBlank()
            ? restApiKey
            : mobilityKey;
    }

    public boolean hasRestApiKey() {
        return restApiKey != null && !restApiKey.isBlank();
    }

    public boolean hasDirectionsKey() {
        return directionsKey() != null && !directionsKey().isBlank();
    }
}
