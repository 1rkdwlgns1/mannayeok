package com.mannayeok.backend.auth.oauth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthLoginTicketRepository extends JpaRepository<OAuthLoginTicket, Long> {
    Optional<OAuthLoginTicket> findByTokenHash(String tokenHash);
}
