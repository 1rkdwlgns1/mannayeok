package com.mannayeok.backend.savedrecommendation;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SavedRecommendationRepository extends JpaRepository<SavedRecommendation, Long> {

    List<SavedRecommendation> findAllByMemberIdOrderByCreatedAtDesc(Long memberId);

    Optional<SavedRecommendation> findByIdAndMemberId(Long id, Long memberId);
}
