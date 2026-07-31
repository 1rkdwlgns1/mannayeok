package com.mannayeok.backend.auth;

import java.time.Duration;
import java.time.Instant;

import com.mannayeok.backend.member.Member;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final JwtEncoder jwtEncoder;
    private final Duration accessTokenDuration;
    private final String issuer;

    public JwtService(
        JwtEncoder jwtEncoder,
        @Value("${app.auth.access-token-minutes}") long accessTokenMinutes,
        @Value("${app.auth.issuer}") String issuer
    ) {
        this.jwtEncoder = jwtEncoder;
        this.accessTokenDuration = Duration.ofMinutes(accessTokenMinutes);
        this.issuer = issuer;
    }

    public IssuedToken issue(Member member) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plus(accessTokenDuration);
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer(issuer)
            .subject(member.getId().toString())
            .issuedAt(issuedAt)
            .expiresAt(expiresAt)
            .claim("email", member.getEmail())
            .claim("nickname", member.getNickname())
            .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, accessTokenDuration.toSeconds());
    }

    public record IssuedToken(String value, long expiresIn) {
    }
}
