package com.mannayeok.backend.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PasswordChangeRequest(
    @NotBlank(message = "현재 비밀번호를 입력해 주세요.")
    String currentPassword,

    @NotBlank(message = "새 비밀번호를 입력해 주세요.")
    @Pattern(
        regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$",
        message = "영문과 숫자를 포함한 8자 이상 입력해 주세요."
    )
    String newPassword
) {
}
