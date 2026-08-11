package com.mannayeok.backend.config;

import com.mannayeok.backend.health.HealthController;
import com.mannayeok.backend.member.MemberRepository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.reactive.server.WebTestClient;

@WebFluxTest(controllers = HealthController.class, properties = {
    "app.auth.jwt-secret=test-jwt-secret-with-at-least-32-characters",
    "app.cors.allowed-origins=http://localhost:5173",
    "app.security.rate-limit.enabled=false"
})
@Import({SecurityConfig.class, CorsConfig.class})
class SecurityConfigTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockitoBean
    private MemberRepository memberRepository;

    @Test
    void healthEndpointRemainsPublic() {
        webTestClient.get()
            .uri("/api/health")
            .exchange()
            .expectStatus().isOk();
    }

    @Test
    void oauthAccountLinksReachPasswordAndTicketVerificationWithoutJwt() {
        // This slice only loads HealthController, so 404 proves the request passed
        // the security chain; 401 would mean the link flow still requires a JWT.
        webTestClient.post()
            .uri("/api/auth/oauth/kakao/link")
            .exchange()
            .expectStatus().isNotFound();

        webTestClient.post()
            .uri("/api/auth/oauth/naver/link")
            .exchange()
            .expectStatus().isNotFound();
    }

    @Test
    void unknownApiIsDeniedByDefault() {
        webTestClient.get()
            .uri("/api/internal/unknown")
            .exchange()
            .expectStatus().isUnauthorized();
    }
}
