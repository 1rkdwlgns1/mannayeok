package com.mannayeok.backend.meeting.dto;

import java.util.List;

import com.mannayeok.backend.share.SharedResultType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MeetingResultUpdateRequest(
    @NotNull SharedResultType resultType,
    @NotBlank @Size(max = 24_000) @Pattern(regexp = "^[A-Za-z0-9_-]+$") String payload,
    @NotBlank @Size(max = 100) String stationName,
    @NotNull @Size(max = 8) List<@NotBlank @Size(max = 30) String> stationLines
) {
}
