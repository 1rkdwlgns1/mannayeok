package com.mannayeok.backend.config;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.charset.StandardCharsets;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class SecurityConfigJwtSecretTest {

    private static final String LEGACY_DEVELOPMENT_JWT_SECRET =
        "local-development-jwt-secret-change-me-1234567890";

    private final SecurityConfig securityConfig = new SecurityConfig();

    @Test
    void acceptsConfigured64CharacterSecret() {
        String secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

        SecretKey key = securityConfig.jwtSecretKey(secret);

        assertEquals("HmacSHA256", key.getAlgorithm());
        assertArrayEquals(secret.getBytes(StandardCharsets.UTF_8), key.getEncoded());
    }

    @Test
    void acceptsExactly32ByteSecret() {
        String secret = "0123456789abcdef0123456789abcdef";

        SecretKey key = securityConfig.jwtSecretKey(secret);

        assertArrayEquals(secret.getBytes(StandardCharsets.UTF_8), key.getEncoded());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t", "   \r\n"})
    void rejectsMissingOrBlankSecret(String secret) {
        IllegalStateException error = assertThrows(
            IllegalStateException.class,
            () -> securityConfig.jwtSecretKey(secret)
        );

        assertEquals("JWT_SECRET must be configured.", error.getMessage());
    }

    @Test
    void rejectsSecretShorterThan32Bytes() {
        String secret = "0123456789abcdef0123456789abcde";

        IllegalStateException error = assertThrows(
            IllegalStateException.class,
            () -> securityConfig.jwtSecretKey(secret)
        );

        assertEquals("JWT_SECRET must be at least 32 bytes.", error.getMessage());
    }

    @Test
    void rejectsLegacyDevelopmentDefault() {
        IllegalStateException error = assertThrows(
            IllegalStateException.class,
            () -> securityConfig.jwtSecretKey(LEGACY_DEVELOPMENT_JWT_SECRET)
        );

        assertEquals(
            "JWT_SECRET must not use the legacy development default.",
            error.getMessage()
        );
    }
}
