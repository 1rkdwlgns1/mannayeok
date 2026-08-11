package com.mannayeok.backend.savedrecommendation.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import com.mannayeok.backend.savedrecommendation.SavedRecommendation;
import com.mannayeok.backend.share.SharedResultType;

public record SavedRecommendationResponse(
    Long id,
    String name,
    String memo,
    LocalDate meetingDate,
    LocalTime meetingTime,
    SharedResultType resultType,
    String payload,
    String stationName,
    List<String> originNames,
    List<String> stationLines,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static SavedRecommendationResponse from(
        SavedRecommendation recommendation,
        List<String> originNames,
        List<String> stationLines
    ) {
        return new SavedRecommendationResponse(
            recommendation.getId(),
            recommendation.getName(),
            recommendation.getMemo(),
            recommendation.getMeetingDate(),
            recommendation.getMeetingTime(),
            recommendation.getResultType(),
            recommendation.getPayload(),
            recommendation.getStationName(),
            originNames,
            stationLines,
            recommendation.getCreatedAt(),
            recommendation.getUpdatedAt()
        );
    }
}
