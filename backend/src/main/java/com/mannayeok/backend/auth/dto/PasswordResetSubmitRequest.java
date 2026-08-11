package com.mannayeok.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PasswordResetSubmitRequest(
    @NotBlank(message = "재설정 토큰이 필요해요.")
    @Size(max = 256, message = "재설정 토큰이 올바르지 않아요.")
    String token,

    @NotBlank(message = "새 비밀번호를 입력해 주세요.")
    @Pattern(
        regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$",
        message = "비밀번호는 영문과 숫자를 포함해 8~72자로 입력해 주세요."
    )
    String password
) {
}
