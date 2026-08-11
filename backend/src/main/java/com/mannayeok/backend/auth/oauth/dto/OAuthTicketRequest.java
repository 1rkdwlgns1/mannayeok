package com.mannayeok.backend.auth.oauth.dto;

import jakarta.validation.constraints.NotBlank;

public record OAuthTicketRequest(
    @NotBlank(message = "로그인 정보를 확인해 주세요.")
    String ticket
) {
}
