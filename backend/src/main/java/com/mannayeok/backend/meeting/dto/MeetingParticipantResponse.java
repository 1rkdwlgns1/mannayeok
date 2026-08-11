package com.mannayeok.backend.meeting.dto;

import java.time.LocalDateTime;

import com.mannayeok.backend.meeting.MeetingParticipant;

public record MeetingParticipantResponse(
    Long id,
    String nickname,
    String originName,
    LocalDateTime updatedAt
) {
    public static MeetingParticipantResponse from(MeetingParticipant participant) {
        return new MeetingParticipantResponse(
            participant.getId(),
            participant.getNickname(),
            participant.getOriginName(),
            participant.getUpdatedAt()
        );
    }
}
