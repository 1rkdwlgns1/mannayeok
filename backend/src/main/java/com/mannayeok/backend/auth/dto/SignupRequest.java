package com.mannayeok.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
    @NotBlank(message = "이메일을 입력해 주세요.")
    @Email(message = "올바른 이메일 주소를 입력해 주세요.")
    @Size(max = 255, message = "이메일은 255자 이하여야 해요.")
    String email,

    @NotBlank(message = "비밀번호를 입력해 주세요.")
    @Pattern(
        regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$",
        message = "비밀번호는 영문과 숫자를 포함해 8~72자로 입력해 주세요."
    )
    String password,

    @AssertTrue(message = "서비스 이용약관에 동의해 주세요.")
    boolean termsAccepted,

    @AssertTrue(message = "개인정보 수집·이용에 동의해 주세요.")
    boolean privacyAccepted,

    @AssertTrue(message = "만 14세 이상만 가입할 수 있어요.")
    boolean ageConfirmed
) {
}
