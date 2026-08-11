package com.mannayeok.backend.meeting.dto;

public record MeetingParticipantJoinResponse(
    MeetingParticipantResponse participant,
    String participantToken
) {
}
