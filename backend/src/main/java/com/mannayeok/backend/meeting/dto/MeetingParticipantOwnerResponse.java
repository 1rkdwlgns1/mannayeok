package com.mannayeok.backend.meeting.dto;

import com.mannayeok.backend.meeting.MeetingParticipant;

public record MeetingParticipantOwnerResponse(
    Long id,
    String nickname,
    String originName,
    String originAddress,
    double originLat,
    double originLng
) {
    public static MeetingParticipantOwnerResponse from(MeetingParticipant participant) {
        return new MeetingParticipantOwnerResponse(
            participant.getId(),
            participant.getNickname(),
            participant.getOriginName(),
            participant.getOriginAddress(),
            participant.getOriginLat(),
            participant.getOriginLng()
        );
    }
}
