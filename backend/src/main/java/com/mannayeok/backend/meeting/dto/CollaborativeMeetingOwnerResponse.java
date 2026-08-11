package com.mannayeok.backend.meeting.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.mannayeok.backend.meeting.CollaborativeMeeting;
import com.mannayeok.backend.share.SharedResultType;

public record CollaborativeMeetingOwnerResponse(
    String inviteCode,
    Long sourceSavedRecommendationId,
    String name,
    LocalDate meetingDate,
    LocalTime meetingTime,
    SharedResultType resultType,
    String payload,
    String stationName,
    List<String> stationLines,
    boolean needsRecommendation,
    List<MeetingParticipantOwnerResponse> participants
) {
    public static CollaborativeMeetingOwnerResponse from(
        CollaborativeMeeting meeting,
        List<String> stationLines,
        List<MeetingParticipantOwnerResponse> participants
    ) {
        return new CollaborativeMeetingOwnerResponse(
            meeting.getInviteCode(), meeting.getSourceSavedRecommendationId(), meeting.getName(),
            meeting.getMeetingDate(), meeting.getMeetingTime(), meeting.getResultType(), meeting.getPayload(),
            meeting.getStationName(), stationLines, meeting.isNeedsRecommendation(), participants
        );
    }
}
