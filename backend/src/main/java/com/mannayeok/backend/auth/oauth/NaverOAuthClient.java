package com.mannayeok.backend.auth.oauth;

import com.fasterxml.jackson.databind.JsonNode;
import com.mannayeok.backend.auth.error.AuthException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class NaverOAuthClient {

    private static final Logger log = LoggerFactory.getLogger(NaverOAuthClient.class);
    private final WebClient webClient;
    private final NaverOAuthProperties properties;

    public NaverOAuthClient(WebClient.Builder builder, NaverOAuthProperties properties) {
        this.webClient = builder.build();
        this.properties = properties;
    }

    public String authorizationUrl(String state) {
        ensureConfigured();
        return UriComponentsBuilder.fromUriString("https://nid.naver.com/oauth2.0/authorize")
            .queryParam("response_type", "code")
            .queryParam("client_id", properties.clientId())
            .queryParam("redirect_uri", properties.redirectUri())
            .queryParam("state", state)
            .build().encode().toUriString();
    }

    public NaverUser exchangeCode(String code, String state) {
        ensureConfigured();
        JsonNode token = tokenRequest(
            UriComponentsBuilder.fromUriString("https://nid.naver.com/oauth2.0/token")
                .queryParam("grant_type", "authorization_code")
                .queryParam("client_id", properties.clientId())
                .queryParam("client_secret", properties.clientSecret())
                .queryParam("code", code)
                .queryParam("state", state)
        );
        String accessToken = token.path("access_token").asText("");
        String refreshToken = token.path("refresh_token").asText("");
        if (accessToken.isBlank() || refreshToken.isBlank()) throw loginFailure();

        JsonNode profile = webClient.get()
            .uri("https://openapi.naver.com/v1/nid/me")
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
            .retrieve()
            .onStatus(status -> status.isError(), response -> response.createException())
            .bodyToMono(JsonNode.class)
            .block();
        JsonNode response = profile == null ? null : profile.path("response");
        String providerUserId = response == null ? "" : response.path("id").asText("");
        String email = response == null ? "" : response.path("email").asText("").trim().toLowerCase();
        if (providerUserId.isBlank()) throw loginFailure();
        if (email.isBlank()) {
            throw new AuthException(
                "NAVER_EMAIL_REQUIRED",
                HttpStatus.BAD_REQUEST,
                "네이버 계정에서 이메일 제공에 동의해 주세요."
            );
        }
        return new NaverUser(providerUserId, email, refreshToken);
    }

    public void unlink(String providerUserId, String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) throw unlinkFailure();
        try {
            JsonNode refreshed = tokenRequest(
                UriComponentsBuilder.fromUriString("https://nid.naver.com/oauth2.0/token")
                    .queryParam("grant_type", "refresh_token")
                    .queryParam("client_id", properties.clientId())
                    .queryParam("client_secret", properties.clientSecret())
                    .queryParam("refresh_token", refreshToken)
            );
            String accessToken = refreshed.path("access_token").asText("");
            if (accessToken.isBlank()) throw unlinkFailure();

            JsonNode deleted = tokenRequest(
                UriComponentsBuilder.fromUriString("https://nid.naver.com/oauth2.0/token")
                    .queryParam("grant_type", "delete")
                    .queryParam("client_id", properties.clientId())
                    .queryParam("client_secret", properties.clientSecret())
                    .queryParam("access_token", accessToken)
                    .queryParam("service_provider", "NAVER")
            );
            boolean success = "success".equalsIgnoreCase(deleted.path("result").asText(""));
            log.info("Naver unlink response: success={}, requested_user_id={}", success, providerUserId);
            if (!success) throw unlinkFailure();
        } catch (RuntimeException exception) {
            log.warn("Naver unlink request failed: requested_user_id={}", providerUserId);
            throw unlinkFailure();
        }
    }

    private JsonNode tokenRequest(UriComponentsBuilder uriBuilder) {
        JsonNode body = webClient.get()
            .uri(uriBuilder.build().encode().toUri())
            .retrieve()
            .onStatus(status -> status.isError(), response -> response.createException())
            .bodyToMono(JsonNode.class)
            .block();
        if (body == null || !body.path("error").asText("").isBlank()) {
            throw new IllegalStateException("Naver token request failed.");
        }
        return body;
    }

    private void ensureConfigured() {
        if (!properties.configured()) {
            throw new AuthException("NAVER_LOGIN_NOT_CONFIGURED", HttpStatus.SERVICE_UNAVAILABLE, "네이버 로그인이 아직 설정되지 않았어요.");
        }
    }

    private static AuthException loginFailure() {
        return new AuthException("NAVER_LOGIN_FAILED", HttpStatus.BAD_GATEWAY, "네이버 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }

    private static AuthException unlinkFailure() {
        return new AuthException("NAVER_UNLINK_FAILED", HttpStatus.BAD_GATEWAY, "네이버 계정 연결을 해제하지 못했어요. 다시 시도해 주세요.");
    }

    public record NaverUser(String providerUserId, String email, String refreshToken) {
    }
}
