package com.mannayeok.backend.admin;

import com.mannayeok.backend.auth.error.AuthException;

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;

public final class AdminAuthorization {

    private AdminAuthorization() {
    }

    public static void requireSecondaryVerification(Jwt jwt) {
        if (!Boolean.TRUE.equals(jwt.getClaim("adminVerified"))) {
            throw new AuthException(
                "ADMIN_SECONDARY_VERIFICATION_REQUIRED",
                HttpStatus.FORBIDDEN,
                "관리자 2차 인증이 필요합니다."
            );
        }
    }
}
