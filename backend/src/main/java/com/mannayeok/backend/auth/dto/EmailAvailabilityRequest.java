package com.mannayeok.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmailAvailabilityRequest(
    @NotBlank(message = "이메일을 입력해 주세요.")
    @Email(message = "올바른 이메일 주소를 입력해 주세요.")
    @Size(max = 255, message = "이메일은 255자 이하여야 해요.")
    String email
) {
}
