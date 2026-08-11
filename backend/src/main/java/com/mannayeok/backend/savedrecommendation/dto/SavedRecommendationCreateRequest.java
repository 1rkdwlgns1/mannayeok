package com.mannayeok.backend.savedrecommendation.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.mannayeok.backend.share.SharedResultType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SavedRecommendationCreateRequest(
    @NotBlank(message = "모임 이름을 입력해 주세요.")
    @Size(max = 60, message = "모임 이름은 60자 이하로 입력해 주세요.")
    String name,

    @Size(max = 100, message = "메모는 100자 이하로 입력해 주세요.")
    String memo,

    LocalDate meetingDate,

    LocalTime meetingTime,

    @NotNull(message = "저장할 추천 결과 유형을 확인해 주세요.")
    SharedResultType resultType,

    @NotBlank(message = "저장할 추천 결과가 없습니다.")
    @Size(max = 24_000, message = "저장할 추천 결과가 너무 큽니다.")
    @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "저장할 추천 결과 형식을 확인해 주세요.")
    String payload,

    @NotBlank(message = "추천역을 확인해 주세요.")
    @Size(max = 100, message = "추천역 이름이 너무 깁니다.")
    String stationName,

    @NotNull(message = "출발지를 확인해 주세요.")
    @Size(min = 2, max = 4, message = "출발지는 2개 이상 4개 이하로 저장할 수 있어요.")
    List<@NotBlank @Size(max = 150) String> originNames,

    @NotNull(message = "추천역 노선 정보를 확인해 주세요.")
    @Size(max = 8, message = "노선 정보가 너무 많습니다.")
    List<@NotBlank @Size(max = 30) String> stationLines
) {
}
