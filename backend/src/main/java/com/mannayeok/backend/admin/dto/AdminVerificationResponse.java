package com.mannayeok.backend.admin.dto;

public record AdminVerificationResponse(
    String accessToken,
    String tokenType,
    long expiresIn
) {
}
