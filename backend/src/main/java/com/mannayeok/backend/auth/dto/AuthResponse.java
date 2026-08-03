package com.mannayeok.backend.auth.dto;

public record AuthResponse(
    String accessToken,
    String tokenType,
    long expiresIn,
    MemberResponse member
) {
}
