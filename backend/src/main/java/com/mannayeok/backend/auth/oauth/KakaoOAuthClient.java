package com.mannayeok.backend.auth.oauth;

import com.fasterxml.jackson.databind.JsonNode;
import com.mannayeok.backend.auth.error.AuthException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class KakaoOAuthClient {

    private static final Logger log = LoggerFactory.getLogger(KakaoOAuthClient.class);

    private final WebClient webClient;
    private final KakaoOAuthProperties properties;

    public KakaoOAuthClient(WebClient.Builder builder, KakaoOAuthProperties properties) {
        this.webClient = builder.build();
        this.properties = properties;
    }

    public String authorizationUrl(String state) {
        ensureConfigured();
        return UriComponentsBuilder.fromUriString("https://kauth.kakao.com/oauth/authorize")
            .queryParam("client_id", properties.clientId())
            .queryParam("redirect_uri", properties.redirectUri())
            .queryParam("response_type", "code")
            .queryParam("scope", "account_email")
            .queryParam("state", state)
            .build()
            .encode()
            .toUriString();
    }

    public KakaoUser exchangeCode(String code) {
        ensureConfigured();
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", properties.clientId());
        form.add("client_secret", properties.clientSecret());
        form.add("redirect_uri", properties.redirectUri());
        form.add("code", code);

        JsonNode token = webClient.post()
            .uri("https://kauth.kakao.com/oauth/token")
            .body(BodyInserters.fromFormData(form))
            .retrieve()
            .onStatus(status -> status.isError(), response -> response.createException())
            .bodyToMono(JsonNode.class)
            .block();
        if (token == null || token.path("access_token").asText().isBlank()) {
            throw oauthFailure("카카오 인증 토큰을 확인하지 못했어요.");
        }

        JsonNode user = webClient.get()
            .uri("https://kapi.kakao.com/v2/user/me")
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token.path("access_token").asText())
            .retrieve()
            .onStatus(status -> status.isError(), response -> response.createException())
            .bodyToMono(JsonNode.class)
            .block();
        if (user == null || user.path("id").asText().isBlank()) {
            throw oauthFailure("카카오 사용자 정보를 확인하지 못했어요.");
        }

        JsonNode account = user.path("kakao_account");
        String email = account.path("email").asText("").trim().toLowerCase();
        boolean emailValid = account.path("has_email").asBoolean(false)
            && account.path("is_email_valid").asBoolean(false)
            && account.path("is_email_verified").asBoolean(false)
            && !email.isBlank();
        if (!emailValid) {
            throw new AuthException(
                "KAKAO_EMAIL_REQUIRED",
                HttpStatus.BAD_REQUEST,
                "카카오 계정에서 확인된 이메일을 제공해 주세요."
            );
        }
        return new KakaoUser(user.path("id").asText(), email);
    }

    public void unlink(String providerUserId) {
        if (!properties.hasAdminKey()) {
            throw new AuthException(
                "KAKAO_UNLINK_NOT_CONFIGURED",
                HttpStatus.SERVICE_UNAVAILABLE,
                "카카오 연결 해제 설정이 필요해요."
            );
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("target_id_type", "user_id");
        form.add("target_id", providerUserId);
        try {
            UnlinkResponse unlinkResponse = webClient.post()
                .uri("https://kapi.kakao.com/v1/user/unlink")
                .header(HttpHeaders.AUTHORIZATION, "KakaoAK " + properties.adminKey())
                .body(BodyInserters.fromFormData(form))
                .exchangeToMono(response -> response.bodyToMono(JsonNode.class)
                    .defaultIfEmpty(com.fasterxml.jackson.databind.node.MissingNode.getInstance())
                    .map(body -> new UnlinkResponse(
                        response.statusCode().value(),
                        body.path("id").asText(""),
                        body.path("code").asText("")
                    )))
                .block();

            int status = unlinkResponse == null ? 0 : unlinkResponse.status();
            String returnedUserId = unlinkResponse == null ? "" : unlinkResponse.userId();
            String errorCode = unlinkResponse == null ? "" : unlinkResponse.errorCode();
            log.info(
                "Kakao unlink response: status={}, requested_user_id={}, returned_user_id={}, kakao_error_code={}",
                status,
                providerUserId,
                returnedUserId.isBlank() ? "missing" : returnedUserId,
                errorCode.isBlank() ? "none" : errorCode
            );

            if (status == 400 && "-101".equals(errorCode)) {
                log.info(
                    "Kakao user is already unlinked; continuing local member deletion: requested_user_id={}",
                    providerUserId
                );
                return;
            }

            if (status < 200 || status >= 300 || !providerUserId.equals(returnedUserId)) {
                throw unlinkFailure();
            }
        } catch (AuthException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            log.warn("Kakao unlink request failed before a valid response: requested_user_id={}", providerUserId);
            throw unlinkFailure();
        }
    }

    private static AuthException unlinkFailure() {
        return new AuthException(
            "KAKAO_UNLINK_FAILED",
            HttpStatus.BAD_GATEWAY,
            "카카오 연결을 해제하지 못했어요. 잠시 후 다시 시도해 주세요."
        );
    }

    private void ensureConfigured() {
        if (!properties.configured()) {
            throw new AuthException(
                "KAKAO_LOGIN_NOT_CONFIGURED",
                HttpStatus.SERVICE_UNAVAILABLE,
                "카카오 로그인이 아직 설정되지 않았어요."
            );
        }
    }

    private static AuthException oauthFailure(String message) {
        return new AuthException("KAKAO_LOGIN_FAILED", HttpStatus.BAD_GATEWAY, message);
    }

    public record KakaoUser(String providerUserId, String email) {
    }

    private record UnlinkResponse(int status, String userId, String errorCode) {
    }
}
