package com.mannayeok.backend.member.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SocialMemberDeleteRequest(
    @AssertTrue(message = "삭제되는 정보와 복구 불가 안내를 확인해 주세요.")
    boolean deletionConfirmed,

    @NotBlank(message = "확인을 위해 회원탈퇴를 입력해 주세요.")
    @Pattern(regexp = "^회원탈퇴$", message = "확인을 위해 회원탈퇴를 정확히 입력해 주세요.")
    String confirmationText
) {
}
