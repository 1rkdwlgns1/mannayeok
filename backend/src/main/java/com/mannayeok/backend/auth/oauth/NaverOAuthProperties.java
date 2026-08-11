package com.mannayeok.backend.auth.oauth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth.naver")
public record NaverOAuthProperties(
    String clientId,
    String clientSecret,
    String redirectUri,
    String frontendBaseUrl
) {
    public boolean configured() {
        return clientId != null && !clientId.isBlank()
            && clientSecret != null && !clientSecret.isBlank()
            && redirectUri != null && !redirectUri.isBlank();
    }
}
