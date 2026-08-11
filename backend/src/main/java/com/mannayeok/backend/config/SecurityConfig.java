package com.mannayeok.backend.config;

import java.nio.charset.StandardCharsets;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.OctetSequenceKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.proc.SecurityContext;
import com.mannayeok.backend.member.Member;
import com.mannayeok.backend.member.MemberRepository;

import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.reactive.CorsConfigurationSource;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecretKey jwtSecretKey(@Value("${app.auth.jwt-secret}") String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes.");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
        OctetSequenceKey jwk = new OctetSequenceKey.Builder(jwtSecretKey).build();
        ImmutableJWKSet<SecurityContext> jwkSource = new ImmutableJWKSet<>(new JWKSet(jwk));
        return new NimbusJwtEncoder(jwkSource);
    }

    @Bean
    ReactiveJwtDecoder jwtDecoder(
        SecretKey jwtSecretKey,
        MemberRepository memberRepository
    ) {
        ReactiveJwtDecoder delegate = NimbusReactiveJwtDecoder.withSecretKey(jwtSecretKey)
            .macAlgorithm(MacAlgorithm.HS256)
            .build();

        return token -> delegate.decode(token).flatMap(jwt ->
            Mono.fromCallable(() -> {
                Long memberId;
                try {
                    memberId = Long.valueOf(jwt.getSubject());
                } catch (NumberFormatException exception) {
                    throw new BadJwtException("Invalid member subject.");
                }

                Member member = memberRepository.findById(memberId)
                    .orElseThrow(() -> new BadJwtException("Member no longer exists."));
                Number tokenVersionClaim = jwt.getClaim("tokenVersion");
                long tokenVersion = tokenVersionClaim == null ? 0 : tokenVersionClaim.longValue();
                if (member.getTokenVersion() != tokenVersion) {
                    throw new BadJwtException("Token is no longer valid.");
                }
                return jwt;
            }).subscribeOn(Schedulers.boundedElastic())
        );
    }

    @Bean
    SecurityWebFilterChain securityWebFilterChain(
        ServerHttpSecurity http,
        ReactiveJwtDecoder jwtDecoder,
        CorsConfigurationSource corsConfigurationSource
    ) {
        return http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
            .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
            .authorizeExchange(exchange -> exchange
                .pathMatchers(HttpMethod.OPTIONS, "/api/**").permitAll()
                .pathMatchers("/api/auth/**").permitAll()
                .pathMatchers(HttpMethod.GET, "/api/health", "/actuator/health", "/actuator/health/**").permitAll()
                .pathMatchers(HttpMethod.GET, "/api/notices").permitAll()
                .pathMatchers(HttpMethod.POST, "/api/shares").permitAll()
                .pathMatchers(HttpMethod.GET, "/api/shares/*").permitAll()
                .pathMatchers(HttpMethod.GET, "/api/kakao/**", "/api/transit/routes").permitAll()
                .pathMatchers("/api/meetings/owned/**").authenticated()
                .pathMatchers(HttpMethod.POST, "/api/meetings").authenticated()
                .pathMatchers(HttpMethod.GET, "/api/meetings/*").permitAll()
                .pathMatchers(HttpMethod.POST, "/api/meetings/*/participants").permitAll()
                .pathMatchers(HttpMethod.PUT, "/api/meetings/*/participants/*").permitAll()
                .pathMatchers("/api/admin/**").authenticated()
                .pathMatchers("/api/members/**").authenticated()
                .pathMatchers("/api/saved-recommendations/**").authenticated()
                .anyExchange().denyAll()
            )
            .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.jwtDecoder(jwtDecoder)))
            .build();
    }
}
