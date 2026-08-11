package com.mannayeok.backend.auth.oauth.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;

public record SocialSignupRequest(
    @NotBlank(message = "가입 정보를 확인해 주세요.")
    String ticket,

    @AssertTrue(message = "서비스 이용약관에 동의해 주세요.")
    boolean termsAccepted,

    @AssertTrue(message = "개인정보 수집·이용에 동의해 주세요.")
    boolean privacyAccepted,

    @AssertTrue(message = "만 14세 이상만 가입할 수 있어요.")
    boolean ageConfirmed
) {
}
