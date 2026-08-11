package com.mannayeok.backend.auth.oauth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth.kakao")
public record KakaoOAuthProperties(
    String clientId,
    String clientSecret,
    String adminKey,
    String redirectUri,
    String frontendBaseUrl
) {
    public boolean configured() {
        return clientId != null && !clientId.isBlank()
            && clientSecret != null && !clientSecret.isBlank()
            && redirectUri != null && !redirectUri.isBlank();
    }

    public boolean hasAdminKey() {
        return adminKey != null && !adminKey.isBlank();
    }
}
