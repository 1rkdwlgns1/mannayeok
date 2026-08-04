package com.mannayeok.backend.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth.password-reset")
public record PasswordResetProperties(
    boolean enabled,
    String frontendBaseUrl,
    int tokenMinutes,
    int cooldownSeconds,
    String mailFrom
) {
}
