package com.mannayeok.backend.meeting.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MeetingParticipantRequest(
    @NotBlank(message = "닉네임을 입력해 주세요.")
    @Size(max = 20, message = "닉네임은 20자 이하로 입력해 주세요.")
    String nickname,

    @NotBlank(message = "출발지를 선택해 주세요.")
    @Size(max = 150, message = "출발지 이름이 너무 깁니다.")
    String originName,

    @NotBlank(message = "출발지 주소를 확인해 주세요.")
    @Size(max = 255, message = "출발지 주소가 너무 깁니다.")
    String originAddress,

    @DecimalMin(value = "-90.0") @DecimalMax(value = "90.0")
    double originLat,

    @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0")
    double originLng
) {
}
