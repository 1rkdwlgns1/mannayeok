package com.mannayeok.backend.share.dto;

import com.mannayeok.backend.share.SharedResultType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SharedResultRequest(
    @NotNull(message = "공유 결과 유형을 확인해 주세요.")
    SharedResultType type,

    @NotBlank(message = "공유할 결과가 없습니다.")
    @Size(max = 24_000, message = "공유할 결과가 너무 큽니다.")
    @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "공유 결과 형식을 확인해 주세요.")
    String payload
) {
}
