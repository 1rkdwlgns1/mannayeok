package com.mannayeok.backend.meeting;

import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mannayeok.backend.meeting.dto.CollaborativeMeetingCreateRequest;
import com.mannayeok.backend.meeting.dto.CollaborativeMeetingOwnerResponse;
import com.mannayeok.backend.meeting.dto.CollaborativeMeetingResponse;
import com.mannayeok.backend.meeting.dto.MeetingParticipantJoinResponse;
import com.mannayeok.backend.meeting.dto.MeetingParticipantOwnerResponse;
import com.mannayeok.backend.meeting.dto.MeetingParticipantRequest;
import com.mannayeok.backend.meeting.dto.MeetingParticipantResponse;
import com.mannayeok.backend.meeting.dto.MeetingResultUpdateRequest;
import com.mannayeok.backend.savedrecommendation.SavedRecommendation;
import com.mannayeok.backend.savedrecommendation.SavedRecommendationRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CollaborativeMeetingService {

    private static final int MAX_PARTICIPANTS = 4;
    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {};
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final CollaborativeMeetingRepository meetingRepository;
    private final MeetingParticipantRepository participantRepository;
    private final SavedRecommendationRepository savedRecommendationRepository;
    private final ObjectMapper objectMapper;

    public CollaborativeMeetingService(
        CollaborativeMeetingRepository meetingRepository,
        MeetingParticipantRepository participantRepository,
        SavedRecommendationRepository savedRecommendationRepository,
        ObjectMapper objectMapper
    ) {
        this.meetingRepository = meetingRepository;
        this.participantRepository = participantRepository;
        this.savedRecommendationRepository = savedRecommendationRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CollaborativeMeetingOwnerResponse create(Long memberId, CollaborativeMeetingCreateRequest request) {
        CollaborativeMeeting existing = meetingRepository
            .findByOwnerMemberIdAndSourceSavedRecommendationId(memberId, request.savedRecommendationId())
            .orElse(null);
        if (existing != null) return toOwnerResponse(existing);

        SavedRecommendation source = savedRecommendationRepository
            .findByIdAndMemberId(request.savedRecommendationId(), memberId)
            .orElseThrow(() -> notFound("저장한 모임을 찾을 수 없습니다."));

        CollaborativeMeeting meeting = new CollaborativeMeeting(
            memberId,
            source.getId(),
            createUniqueInviteCode(),
            source.getName(),
            source.getMeetingDate(),
            source.getMeetingTime(),
            source.getResultType(),
            source.getPayload(),
            source.getStationName(),
            source.getStationLines()
        );
        return toOwnerResponse(meetingRepository.save(meeting));
    }

    @Transactional(readOnly = true)
    public CollaborativeMeetingResponse findPublic(String inviteCode) {
        return toPublicResponse(findByInviteCode(inviteCode));
    }

    @Transactional(readOnly = true)
    public CollaborativeMeetingOwnerResponse findOwnedBySource(Long memberId, Long sourceId) {
        CollaborativeMeeting meeting = meetingRepository
            .findByOwnerMemberIdAndSourceSavedRecommendationId(memberId, sourceId)
            .orElseThrow(() -> notFound("함께하는 모임을 찾을 수 없습니다."));
        return toOwnerResponse(meeting);
    }

    @Transactional(readOnly = true)
    public CollaborativeMeetingOwnerResponse findOwned(Long memberId, String inviteCode) {
        return toOwnerResponse(findOwnedEntity(memberId, inviteCode));
    }

    @Transactional
    public MeetingParticipantJoinResponse join(String inviteCode, MeetingParticipantRequest request) {
        CollaborativeMeeting meeting = findLockedByInviteCode(inviteCode);
        if (participantRepository.countByMeetingId(meeting.getId()) >= MAX_PARTICIPANTS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이 모임은 참여 인원이 모두 찼어요.");
        }

        String nickname = request.nickname().trim();
        if (participantRepository.existsByMeetingIdAndNicknameIgnoreCase(meeting.getId(), nickname)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 닉네임이에요.");
        }
        BigDecimal originLat = BigDecimal.valueOf(request.originLat());
        BigDecimal originLng = BigDecimal.valueOf(request.originLng());
        if (participantRepository.existsByMeetingIdAndOriginLatAndOriginLng(meeting.getId(), originLat, originLng)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 다른 참여자가 선택한 출발지예요.");
        }

        String token = createToken(32);
        MeetingParticipant participant = participantRepository.save(new MeetingParticipant(
            meeting.getId(), nickname, request.originName().trim(), request.originAddress().trim(),
            request.originLat(), request.originLng(), hashToken(token)
        ));
        meeting.markParticipantsChanged();
        return new MeetingParticipantJoinResponse(MeetingParticipantResponse.from(participant), token);
    }

    @Transactional
    public MeetingParticipantResponse updateParticipant(
        String inviteCode,
        Long participantId,
        String participantToken,
        MeetingParticipantRequest request
    ) {
        CollaborativeMeeting meeting = findLockedByInviteCode(inviteCode);
        MeetingParticipant participant = participantRepository.findByIdAndMeetingId(participantId, meeting.getId())
            .orElseThrow(() -> notFound("참여자 정보를 찾을 수 없습니다."));
        requireParticipantToken(participant, participantToken);

        String nickname = request.nickname().trim();
        boolean nicknameTaken = participantRepository.existsByMeetingIdAndNicknameIgnoreCase(meeting.getId(), nickname)
            && !participant.getNickname().equalsIgnoreCase(nickname);
        if (nicknameTaken) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 닉네임이에요.");
        }
        BigDecimal originLat = BigDecimal.valueOf(request.originLat());
        BigDecimal originLng = BigDecimal.valueOf(request.originLng());
        if (participantRepository.existsByMeetingIdAndOriginLatAndOriginLngAndIdNot(
            meeting.getId(), originLat, originLng, participant.getId()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 다른 참여자가 선택한 출발지예요.");
        }

        participant.update(
            nickname, request.originName().trim(), request.originAddress().trim(),
            request.originLat(), request.originLng()
        );
        meeting.markParticipantsChanged();
        return MeetingParticipantResponse.from(participant);
    }

    @Transactional
    public CollaborativeMeetingOwnerResponse updateResult(
        Long memberId,
        String inviteCode,
        MeetingResultUpdateRequest request
    ) {
        CollaborativeMeeting meeting = findOwnedEntity(memberId, inviteCode);
        meeting.updateResult(
            request.resultType(), request.payload(), request.stationName().trim(),
            writeStringList(request.stationLines())
        );
        return toOwnerResponse(meeting);
    }

    @Transactional
    public void removeParticipant(Long memberId, String inviteCode, Long participantId) {
        CollaborativeMeeting meeting = findOwnedEntity(memberId, inviteCode);
        MeetingParticipant participant = participantRepository.findByIdAndMeetingId(participantId, meeting.getId())
            .orElseThrow(() -> notFound("참여자 정보를 찾을 수 없습니다."));
        participantRepository.delete(participant);
        meeting.markParticipantsChanged();
    }

    private CollaborativeMeeting findByInviteCode(String inviteCode) {
        if (inviteCode == null || !inviteCode.matches("^[A-Za-z0-9_-]{20,32}$")) {
            throw notFound("모임 초대 링크를 확인해 주세요.");
        }
        return meetingRepository.findByInviteCode(inviteCode)
            .orElseThrow(() -> notFound("모임을 찾을 수 없습니다."));
    }

    private CollaborativeMeeting findLockedByInviteCode(String inviteCode) {
        if (inviteCode == null || !inviteCode.matches("^[A-Za-z0-9_-]{20,32}$")) {
            throw notFound("모임 초대 링크를 확인해 주세요.");
        }
        return meetingRepository.findLockedByInviteCode(inviteCode)
            .orElseThrow(() -> notFound("모임을 찾을 수 없습니다."));
    }

    private CollaborativeMeeting findOwnedEntity(Long memberId, String inviteCode) {
        return meetingRepository.findByInviteCodeAndOwnerMemberId(inviteCode, memberId)
            .orElseThrow(() -> notFound("함께하는 모임을 찾을 수 없습니다."));
    }

    private CollaborativeMeetingResponse toPublicResponse(CollaborativeMeeting meeting) {
        List<MeetingParticipantResponse> participants = participantRepository
            .findAllByMeetingIdOrderByCreatedAtAsc(meeting.getId())
            .stream().map(MeetingParticipantResponse::from).toList();
        return CollaborativeMeetingResponse.from(meeting, readStringList(meeting.getStationLines()), participants);
    }

    private CollaborativeMeetingOwnerResponse toOwnerResponse(CollaborativeMeeting meeting) {
        List<MeetingParticipantOwnerResponse> participants = participantRepository
            .findAllByMeetingIdOrderByCreatedAtAsc(meeting.getId())
            .stream().map(MeetingParticipantOwnerResponse::from).toList();
        return CollaborativeMeetingOwnerResponse.from(meeting, readStringList(meeting.getStationLines()), participants);
    }

    private String createUniqueInviteCode() {
        for (int attempt = 0; attempt < 5; attempt++) {
            String code = createToken(18);
            if (!meetingRepository.existsByInviteCode(code)) return code;
        }
        throw new IllegalStateException("모임 초대 코드를 만들지 못했습니다.");
    }

    private static String createToken(int byteLength) {
        byte[] bytes = new byte[byteLength];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }

    private static void requireParticipantToken(MeetingParticipant participant, String token) {
        if (token == null || token.isBlank()) throw forbidden();
        byte[] expected = participant.getParticipantTokenHash().getBytes(StandardCharsets.UTF_8);
        byte[] actual = hashToken(token).getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, actual)) throw forbidden();
    }

    private String writeStringList(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values.stream().map(String::trim).toList());
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("노선 정보를 확인해 주세요.", exception);
        }
    }

    private List<String> readStringList(String value) {
        try {
            return objectMapper.readValue(value, STRING_LIST_TYPE);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("저장된 노선 정보가 올바르지 않습니다.", exception);
        }
    }

    private static ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }

    private static ResponseStatusException forbidden() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "이 참여자 정보를 수정할 권한이 없습니다.");
    }
}
