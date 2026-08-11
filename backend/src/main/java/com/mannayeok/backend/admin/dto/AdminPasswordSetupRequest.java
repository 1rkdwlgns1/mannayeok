package com.mannayeok.backend.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminPasswordSetupRequest(
    @NotBlank(message = "관리자 2차 비밀번호를 입력해 주세요.")
    @Size(min = 10, max = 72, message = "관리자 2차 비밀번호는 10자 이상 72자 이하로 입력해 주세요.")
    String password,

    @NotBlank(message = "관리자 2차 비밀번호 확인을 입력해 주세요.")
    String passwordConfirmation
) {
}
