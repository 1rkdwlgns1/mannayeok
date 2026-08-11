package com.mannayeok.backend.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminVerificationRequest(
    @NotBlank(message = "관리자 2차 비밀번호를 입력해 주세요.")
    @Size(min = 10, max = 72, message = "관리자 2차 비밀번호를 확인해 주세요.")
    String password
) {
}
