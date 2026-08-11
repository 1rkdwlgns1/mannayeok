package com.mannayeok.backend.savedrecommendation.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SavedRecommendationUpdateRequest(
    @NotBlank(message = "모임 이름을 입력해 주세요.")
    @Size(max = 60, message = "모임 이름은 60자 이하로 입력해 주세요.")
    String name,

    @Size(max = 100, message = "메모는 100자 이하로 입력해 주세요.")
    String memo,

    LocalDate meetingDate,

    LocalTime meetingTime
) {
}
