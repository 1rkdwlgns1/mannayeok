package com.mannayeok.backend.savedrecommendation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mannayeok.backend.savedrecommendation.dto.SavedRecommendationCreateRequest;
import com.mannayeok.backend.savedrecommendation.dto.SavedRecommendationResponse;
import com.mannayeok.backend.savedrecommendation.dto.SavedRecommendationUpdateRequest;
import com.mannayeok.backend.share.SharedResultType;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class SavedRecommendationServiceTest {

    @Mock
    private SavedRecommendationRepository savedRecommendationRepository;

    private SavedRecommendationService savedRecommendationService;

    @BeforeEach
    void setUp() {
        savedRecommendationService = new SavedRecommendationService(
            savedRecommendationRepository,
            new ObjectMapper()
        );
    }

    @Test
    void createsSavedRecommendationWithEditableNameAndOptionalSchedule() {
        when(savedRecommendationRepository.save(any(SavedRecommendation.class)))
            .thenAnswer(invocation -> {
                SavedRecommendation entity = invocation.getArgument(0);
                entity.onCreate();
                return entity;
            });

        LocalDate meetingDate = LocalDate.now().plusDays(7);
        LocalTime meetingTime = LocalTime.of(14, 30);
        SavedRecommendationCreateRequest request = new SavedRecommendationCreateRequest(
            "  친구들과 저녁 약속  ",
            "  3번 출구에서 만나기  ",
            meetingDate,
            meetingTime,
            SharedResultType.RESULT,
            "abc_DEF-123",
            "건대입구역",
            List.of("노원역", "강남역"),
            List.of("2호선", "7호선")
        );

        SavedRecommendationResponse response = savedRecommendationService.create(10L, request);

        assertThat(response.name()).isEqualTo("친구들과 저녁 약속");
        assertThat(response.memo()).isEqualTo("3번 출구에서 만나기");
        assertThat(response.meetingDate()).isEqualTo(meetingDate);
        assertThat(response.meetingTime()).isEqualTo(meetingTime);
        assertThat(response.originNames()).containsExactly("노원역", "강남역");
        assertThat(response.stationLines()).containsExactly("2호선", "7호선");

        ArgumentCaptor<SavedRecommendation> captor = ArgumentCaptor.forClass(SavedRecommendation.class);
        verify(savedRecommendationRepository).save(captor.capture());
        assertThat(captor.getValue().getMemberId()).isEqualTo(10L);
    }

    @Test
    void updatesOnlyNameAndOptionalScheduleForOwnedRecommendation() {
        SavedRecommendation recommendation = recommendation(
            10L,
            "기존 이름",
            null,
            null
        );
        when(savedRecommendationRepository.findByIdAndMemberId(3L, 10L))
            .thenReturn(Optional.of(recommendation));

        LocalDate nextDate = LocalDate.now().plusDays(3);
        LocalTime nextTime = LocalTime.of(18, 0);
        SavedRecommendationResponse response = savedRecommendationService.update(
            10L,
            3L,
            new SavedRecommendationUpdateRequest("새 모임 이름", "저녁 식사", nextDate, nextTime)
        );

        assertThat(response.name()).isEqualTo("새 모임 이름");
        assertThat(response.memo()).isEqualTo("저녁 식사");
        assertThat(response.meetingDate()).isEqualTo(nextDate);
        assertThat(response.meetingTime()).isEqualTo(nextTime);
        assertThat(response.updatedAt()).isAfterOrEqualTo(response.createdAt());
    }

    @Test
    void returnsUpcomingThenUndatedThenPastMeetings() {
        LocalDate today = LocalDate.now();
        SavedRecommendation upcomingLater = recommendation(10L, "다음 주", today.plusDays(7), null);
        SavedRecommendation past = recommendation(10L, "지난 모임", today.minusDays(1), null);
        SavedRecommendation undated = recommendation(10L, "날짜 없음", null, null);
        SavedRecommendation upcomingSoon = recommendation(10L, "내일", today.plusDays(1), LocalTime.of(19, 0));
        when(savedRecommendationRepository.findAllByMemberIdOrderByCreatedAtDesc(10L))
            .thenReturn(List.of(upcomingLater, past, undated, upcomingSoon));

        List<SavedRecommendationResponse> responses = savedRecommendationService.findAll(10L);

        assertThat(responses).extracting(SavedRecommendationResponse::name)
            .containsExactly("내일", "다음 주", "날짜 없음", "지난 모임");
    }

    @Test
    void doesNotExposeAnotherMembersRecommendation() {
        when(savedRecommendationRepository.findByIdAndMemberId(5L, 10L))
            .thenReturn(Optional.empty());

        assertThatThrownBy(() -> savedRecommendationService.find(10L, 5L))
            .isInstanceOfSatisfying(ResponseStatusException.class, exception ->
                assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND)
            );
    }

    private SavedRecommendation recommendation(
        Long memberId,
        String name,
        LocalDate meetingDate,
        LocalTime meetingTime
    ) {
        SavedRecommendation recommendation = new SavedRecommendation(
            memberId,
            name,
            null,
            meetingDate,
            meetingTime,
            SharedResultType.RESULT,
            "payload_123",
            "건대입구역",
            "[\"노원역\",\"강남역\"]",
            "[\"2호선\",\"7호선\"]"
        );
        recommendation.onCreate();
        return recommendation;
    }
}
