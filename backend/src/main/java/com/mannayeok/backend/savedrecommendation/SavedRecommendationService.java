package com.mannayeok.backend.savedrecommendation;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mannayeok.backend.savedrecommendation.dto.SavedRecommendationCreateRequest;
import com.mannayeok.backend.savedrecommendation.dto.SavedRecommendationResponse;
import com.mannayeok.backend.savedrecommendation.dto.SavedRecommendationUpdateRequest;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SavedRecommendationService {

    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {};

    private final SavedRecommendationRepository savedRecommendationRepository;
    private final ObjectMapper objectMapper;

    public SavedRecommendationService(
        SavedRecommendationRepository savedRecommendationRepository,
        ObjectMapper objectMapper
    ) {
        this.savedRecommendationRepository = savedRecommendationRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SavedRecommendationResponse create(
        Long memberId,
        SavedRecommendationCreateRequest request
    ) {
        SavedRecommendation recommendation = new SavedRecommendation(
            memberId,
            request.name().trim(),
            normalizeMemo(request.memo()),
            request.meetingDate(),
            request.meetingTime(),
            request.resultType(),
            request.payload(),
            request.stationName().trim(),
            writeStringList(request.originNames()),
            writeStringList(request.stationLines())
        );
        return toResponse(savedRecommendationRepository.save(recommendation));
    }

    @Transactional(readOnly = true)
    public List<SavedRecommendationResponse> findAll(Long memberId) {
        List<SavedRecommendation> recommendations = new ArrayList<>(
            savedRecommendationRepository.findAllByMemberIdOrderByCreatedAtDesc(memberId)
        );
        recommendations.sort(savedRecommendationComparator(LocalDate.now()));
        return recommendations.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public SavedRecommendationResponse find(Long memberId, Long id) {
        return toResponse(findOwned(memberId, id));
    }

    @Transactional
    public SavedRecommendationResponse update(
        Long memberId,
        Long id,
        SavedRecommendationUpdateRequest request
    ) {
        SavedRecommendation recommendation = findOwned(memberId, id);
        recommendation.updateSchedule(
            request.name().trim(),
            normalizeMemo(request.memo()),
            request.meetingDate(),
            request.meetingTime()
        );
        return toResponse(recommendation);
    }

    @Transactional
    public void delete(Long memberId, Long id) {
        savedRecommendationRepository.delete(findOwned(memberId, id));
    }

    private SavedRecommendation findOwned(Long memberId, Long id) {
        return savedRecommendationRepository.findByIdAndMemberId(id, memberId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "저장한 모임을 찾을 수 없습니다."
            ));
    }

    private SavedRecommendationResponse toResponse(SavedRecommendation recommendation) {
        return SavedRecommendationResponse.from(
            recommendation,
            readStringList(recommendation.getOriginNames()),
            readStringList(recommendation.getStationLines())
        );
    }

    private String writeStringList(List<String> values) {
        try {
            return objectMapper.writeValueAsString(
                values.stream().map(String::trim).toList()
            );
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("저장할 모임 정보를 확인해 주세요.", exception);
        }
    }

    private List<String> readStringList(String value) {
        try {
            return objectMapper.readValue(value, STRING_LIST_TYPE);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("저장한 모임 정보가 올바르지 않습니다.", exception);
        }
    }

    private static String normalizeMemo(String memo) {
        if (memo == null || memo.isBlank()) return null;
        return memo.trim();
    }

    private static Comparator<SavedRecommendation> savedRecommendationComparator(LocalDate today) {
        return (left, right) -> {
            int leftGroup = scheduleGroup(left.getMeetingDate(), today);
            int rightGroup = scheduleGroup(right.getMeetingDate(), today);
            if (leftGroup != rightGroup) return Integer.compare(leftGroup, rightGroup);

            if (leftGroup == 0) {
                int dateComparison = left.getMeetingDate().compareTo(right.getMeetingDate());
                if (dateComparison != 0) return dateComparison;
                return compareNullableTime(left.getMeetingTime(), right.getMeetingTime());
            }
            return right.getCreatedAt().compareTo(left.getCreatedAt());
        };
    }

    private static int scheduleGroup(LocalDate date, LocalDate today) {
        if (date != null && !date.isBefore(today)) return 0;
        if (date == null) return 1;
        return 2;
    }

    private static int compareNullableTime(LocalTime left, LocalTime right) {
        if (left == null && right == null) return 0;
        if (left == null) return 1;
        if (right == null) return -1;
        return left.compareTo(right);
    }
}
