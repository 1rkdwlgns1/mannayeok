package com.mannayeok.backend.meeting.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import com.mannayeok.backend.meeting.CollaborativeMeeting;

public record CollaborativeMeetingResponse(
    String inviteCode,
    String name,
    LocalDate meetingDate,
    LocalTime meetingTime,
    String stationName,
    List<String> stationLines,
    boolean needsRecommendation,
    List<MeetingParticipantResponse> participants,
    LocalDateTime updatedAt
) {
    public static CollaborativeMeetingResponse from(
        CollaborativeMeeting meeting,
        List<String> stationLines,
        List<MeetingParticipantResponse> participants
    ) {
        return new CollaborativeMeetingResponse(
            meeting.getInviteCode(), meeting.getName(), meeting.getMeetingDate(), meeting.getMeetingTime(),
            meeting.getStationName(), stationLines, meeting.isNeedsRecommendation(), participants, meeting.getUpdatedAt()
        );
    }
}
