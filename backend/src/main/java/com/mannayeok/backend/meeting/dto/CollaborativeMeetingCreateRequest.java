package com.mannayeok.backend.meeting.dto;

import jakarta.validation.constraints.NotNull;

public record CollaborativeMeetingCreateRequest(
    @NotNull(message = "저장한 모임을 확인해 주세요.")
    Long savedRecommendationId
) {
}
