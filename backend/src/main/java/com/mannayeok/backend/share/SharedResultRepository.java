package com.mannayeok.backend.share;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SharedResultRepository extends JpaRepository<SharedResult, Long> {
    Optional<SharedResult> findByShareCode(String shareCode);
    long deleteByExpiresAtBefore(LocalDateTime cutoff);
}
