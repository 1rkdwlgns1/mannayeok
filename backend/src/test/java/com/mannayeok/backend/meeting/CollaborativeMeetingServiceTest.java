package com.mannayeok.backend.meeting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mannayeok.backend.meeting.dto.CollaborativeMeetingCreateRequest;
import com.mannayeok.backend.meeting.dto.CollaborativeMeetingOwnerResponse;
import com.mannayeok.backend.meeting.dto.MeetingParticipantJoinResponse;
import com.mannayeok.backend.meeting.dto.MeetingParticipantRequest;
import com.mannayeok.backend.savedrecommendation.SavedRecommendation;
import com.mannayeok.backend.savedrecommendation.SavedRecommendationRepository;
import com.mannayeok.backend.share.SharedResultType;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class CollaborativeMeetingServiceTest {

    @Mock CollaborativeMeetingRepository meetingRepository;
    @Mock MeetingParticipantRepository participantRepository;
    @Mock SavedRecommendationRepository savedRecommendationRepository;

    private CollaborativeMeetingService service;

    @BeforeEach
    void setUp() {
        service = new CollaborativeMeetingService(
            meetingRepository,
            participantRepository,
            savedRecommendationRepository,
            new ObjectMapper()
        );
    }

    @Test
    void createsAnInviteRoomFromAnOwnedSavedRecommendation() {
        SavedRecommendation source = savedRecommendation();
        ReflectionTestUtils.setField(source, "id", 7L);
        when(meetingRepository.findByOwnerMemberIdAndSourceSavedRecommendationId(10L, 7L))
            .thenReturn(Optional.empty());
        when(savedRecommendationRepository.findByIdAndMemberId(7L, 10L)).thenReturn(Optional.of(source));
        when(meetingRepository.existsByInviteCode(any())).thenReturn(false);
        when(meetingRepository.save(any(CollaborativeMeeting.class))).thenAnswer(invocation -> {
            CollaborativeMeeting meeting = invocation.getArgument(0);
            ReflectionTestUtils.setField(meeting, "id", 20L);
            meeting.onCreate();
            return meeting;
        });
        when(participantRepository.findAllByMeetingIdOrderByCreatedAtAsc(20L)).thenReturn(List.of());

        CollaborativeMeetingOwnerResponse response = service.create(
            10L,
            new CollaborativeMeetingCreateRequest(7L)
        );

        assertThat(response.inviteCode()).matches("^[A-Za-z0-9_-]{20,32}$");
        assertThat(response.name()).isEqualTo("친구 모임");
        assertThat(response.stationName()).isEqualTo("건대입구역");
        assertThat(response.needsRecommendation()).isTrue();
    }

    @Test
    void guestJoinReturnsRawTokenButStoresOnlyItsHash() {
        CollaborativeMeeting meeting = meeting();
        when(meetingRepository.findLockedByInviteCode(meeting.getInviteCode())).thenReturn(Optional.of(meeting));
        when(participantRepository.countByMeetingId(20L)).thenReturn(1L);
        when(participantRepository.existsByMeetingIdAndNicknameIgnoreCase(20L, "지훈")).thenReturn(false);
        ArgumentCaptor<MeetingParticipant> participantCaptor = ArgumentCaptor.forClass(MeetingParticipant.class);
        when(participantRepository.save(participantCaptor.capture())).thenAnswer(invocation -> {
            MeetingParticipant participant = invocation.getArgument(0);
            ReflectionTestUtils.setField(participant, "id", 30L);
            participant.onCreate();
            return participant;
        });

        MeetingParticipantJoinResponse response = service.join(
            meeting.getInviteCode(),
            participantRequest("지훈")
        );

        assertThat(response.participantToken()).matches("^[A-Za-z0-9_-]{40,50}$");
        assertThat(participantCaptor.getValue().getParticipantTokenHash()).hasSize(64);
        assertThat(participantCaptor.getValue().getParticipantTokenHash()).isNotEqualTo(response.participantToken());
        assertThat(meeting.isNeedsRecommendation()).isTrue();
    }

    @Test
    void rejectsAFifthParticipant() {
        CollaborativeMeeting meeting = meeting();
        when(meetingRepository.findLockedByInviteCode(meeting.getInviteCode())).thenReturn(Optional.of(meeting));
        when(participantRepository.countByMeetingId(20L)).thenReturn(4L);

        assertThatThrownBy(() -> service.join(meeting.getInviteCode(), participantRequest("지훈")))
            .isInstanceOfSatisfying(ResponseStatusException.class, exception ->
                assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.CONFLICT)
            );
    }

    @Test
    void rejectsParticipantUpdateWithWrongToken() {
        CollaborativeMeeting meeting = meeting();
        MeetingParticipant participant = new MeetingParticipant(
            20L, "지훈", "노원역", "서울 노원구", 37.655, 127.061,
            "0".repeat(64)
        );
        ReflectionTestUtils.setField(participant, "id", 30L);
        when(meetingRepository.findLockedByInviteCode(meeting.getInviteCode())).thenReturn(Optional.of(meeting));
        when(participantRepository.findByIdAndMeetingId(30L, 20L)).thenReturn(Optional.of(participant));

        assertThatThrownBy(() -> service.updateParticipant(
            meeting.getInviteCode(), 30L, "wrong-token", participantRequest("새 이름")
        )).isInstanceOfSatisfying(ResponseStatusException.class, exception ->
            assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN)
        );
    }

    private CollaborativeMeeting meeting() {
        CollaborativeMeeting meeting = new CollaborativeMeeting(
            10L, 7L, "AbCdEfGhIjKlMnOpQrStUvWx", "친구 모임", null, null,
            SharedResultType.RESULT, "payload_123", "건대입구역", "[\"2호선\",\"7호선\"]"
        );
        ReflectionTestUtils.setField(meeting, "id", 20L);
        meeting.onCreate();
        return meeting;
    }

    private SavedRecommendation savedRecommendation() {
        SavedRecommendation source = new SavedRecommendation(
            10L, "친구 모임", null, null, null, SharedResultType.RESULT, "payload_123",
            "건대입구역", "[\"노원역\",\"강남역\"]", "[\"2호선\",\"7호선\"]"
        );
        ReflectionTestUtils.invokeMethod(source, "onCreate");
        return source;
    }

    private MeetingParticipantRequest participantRequest(String nickname) {
        return new MeetingParticipantRequest(
            nickname, "노원역", "서울 노원구 상계동", 37.655, 127.061
        );
    }
}
