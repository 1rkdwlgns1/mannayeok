package com.mannayeok.backend.meeting;

import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CollaborativeMeetingRepository extends JpaRepository<CollaborativeMeeting, Long> {
    Optional<CollaborativeMeeting> findByInviteCode(String inviteCode);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select meeting from CollaborativeMeeting meeting where meeting.inviteCode = :inviteCode")
    Optional<CollaborativeMeeting> findLockedByInviteCode(@Param("inviteCode") String inviteCode);
    Optional<CollaborativeMeeting> findByOwnerMemberIdAndSourceSavedRecommendationId(Long ownerMemberId, Long sourceId);
    Optional<CollaborativeMeeting> findByInviteCodeAndOwnerMemberId(String inviteCode, Long ownerMemberId);
    boolean existsByInviteCode(String inviteCode);
}
