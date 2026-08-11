package com.mannayeok.backend.auth.oauth.dto;

import jakarta.validation.constraints.NotBlank;

public record SocialLinkRequest(
    @NotBlank(message = "연결 정보를 확인해 주세요.")
    String ticket,

    @NotBlank(message = "현재 비밀번호를 입력해 주세요.")
    String currentPassword
) {
}
