package com.mannayeok.backend.auth.oauth;

import java.net.URI;
import java.time.Duration;

import com.mannayeok.backend.auth.dto.AuthResponse;
import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.auth.oauth.dto.OAuthTicketRequest;
import com.mannayeok.backend.auth.oauth.dto.SocialSignupRequest;
import com.mannayeok.backend.auth.oauth.dto.SocialLinkRequest;

import jakarta.validation.Valid;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/api/auth/oauth/kakao")
public class KakaoOAuthController {

    private static final String STATE_COOKIE = "mannayeok_kakao_oauth_state";

    private final KakaoOAuthClient kakaoOAuthClient;
    private final OAuthLoginService oauthLoginService;
    private final KakaoOAuthProperties properties;

    public KakaoOAuthController(
        KakaoOAuthClient kakaoOAuthClient,
        OAuthLoginService oauthLoginService,
        KakaoOAuthProperties properties
    ) {
        this.kakaoOAuthClient = kakaoOAuthClient;
        this.oauthLoginService = oauthLoginService;
        this.properties = properties;
    }

    @GetMapping("/start")
    ResponseEntity<Void> start() {
        String state = OAuthLoginService.randomToken();
        ResponseCookie cookie = ResponseCookie.from(STATE_COOKIE, state)
            .httpOnly(true)
            .secure(properties.redirectUri() != null && properties.redirectUri().startsWith("https://"))
            .sameSite("Lax")
            .path("/api/auth/oauth/kakao")
            .maxAge(Duration.ofMinutes(10))
            .build();
        return ResponseEntity.status(HttpStatus.FOUND)
            .header(HttpHeaders.SET_COOKIE, cookie.toString())
            .location(URI.create(kakaoOAuthClient.authorizationUrl(state)))
            .build();
    }

    @GetMapping("/callback")
    Mono<ResponseEntity<Void>> callback(
        @RequestParam(required = false) String code,
        @RequestParam(required = false) String state,
        @RequestParam(required = false) String error,
        @CookieValue(name = STATE_COOKIE, required = false) String expectedState
    ) {
        return Mono.fromCallable(() -> {
            if (error != null) return redirectError("KAKAO_LOGIN_CANCELLED");
            if (code == null || state == null || expectedState == null || !state.equals(expectedState)) {
                return redirectError("INVALID_OAUTH_STATE");
            }
            try {
                KakaoOAuthClient.KakaoUser user = kakaoOAuthClient.exchangeCode(code);
                OAuthLoginService.PreparedLogin prepared = oauthLoginService.prepareKakaoLogin(user);
                String path = prepared.signupRequired() || prepared.linkRequired()
                    ? "/signup/social"
                    : "/login";
                URI location = UriComponentsBuilder
                    .fromUriString(frontendBaseUrl() + path)
                    .queryParam("oauthTicket", prepared.ticket())
                    .queryParam("provider", "kakao")
                    .queryParamIfPresent(
                        "mode",
                        prepared.linkRequired()
                            ? java.util.Optional.of("link")
                            : java.util.Optional.empty()
                    )
                    .build().encode().toUri();
                return redirect(location);
            } catch (AuthException exception) {
                return redirectError(exception.getCode());
            } catch (RuntimeException exception) {
                return redirectError("KAKAO_LOGIN_FAILED");
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/exchange")
    Mono<AuthResponse> exchange(@Valid @RequestBody OAuthTicketRequest request) {
        return Mono.fromCallable(() -> oauthLoginService.exchange(request.ticket()))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/signup")
    Mono<AuthResponse> signup(@Valid @RequestBody SocialSignupRequest request) {
        return Mono.fromCallable(() -> oauthLoginService.signup(request))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/link")
    Mono<AuthResponse> link(@Valid @RequestBody SocialLinkRequest request) {
        return Mono.fromCallable(() -> oauthLoginService.linkKakao(request))
            .subscribeOn(Schedulers.boundedElastic());
    }

    private ResponseEntity<Void> redirectError(String code) {
        URI location = UriComponentsBuilder.fromUriString(frontendBaseUrl() + "/login")
            .queryParam("oauthError", code)
            .build().encode().toUri();
        return redirect(location);
    }

    private ResponseEntity<Void> redirect(URI location) {
        ResponseCookie expired = ResponseCookie.from(STATE_COOKIE, "")
            .httpOnly(true)
            .sameSite("Lax")
            .path("/api/auth/oauth/kakao")
            .maxAge(Duration.ZERO)
            .build();
        return ResponseEntity.status(HttpStatus.FOUND)
            .header(HttpHeaders.SET_COOKIE, expired.toString())
            .location(location)
            .build();
    }

    private String frontendBaseUrl() {
        String value = properties.frontendBaseUrl();
        return value == null || value.isBlank() ? "http://localhost:5173" : value.replaceAll("/$", "");
    }
}
