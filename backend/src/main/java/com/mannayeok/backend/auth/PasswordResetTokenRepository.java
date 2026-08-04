package com.mannayeok.backend.auth;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetTokenRepository
    extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    Optional<PasswordResetToken> findTopByMember_IdOrderByCreatedAtDesc(Long memberId);

    List<PasswordResetToken> findAllByMember_IdAndUsedAtIsNull(Long memberId);
}
