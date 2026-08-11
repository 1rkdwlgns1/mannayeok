package com.mannayeok.backend.meeting;

import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingParticipantRepository extends JpaRepository<MeetingParticipant, Long> {
    List<MeetingParticipant> findAllByMeetingIdOrderByCreatedAtAsc(Long meetingId);
    Optional<MeetingParticipant> findByIdAndMeetingId(Long id, Long meetingId);
    long countByMeetingId(Long meetingId);
    boolean existsByMeetingIdAndNicknameIgnoreCase(Long meetingId, String nickname);
    boolean existsByMeetingIdAndOriginLatAndOriginLng(Long meetingId, BigDecimal originLat, BigDecimal originLng);
    boolean existsByMeetingIdAndOriginLatAndOriginLngAndIdNot(Long meetingId, BigDecimal originLat, BigDecimal originLng, Long id);
}
