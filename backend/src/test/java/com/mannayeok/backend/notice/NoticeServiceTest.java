package com.mannayeok.backend.notice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.time.LocalDate;

import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.member.Member;
import com.mannayeok.backend.member.MemberRepository;
import com.mannayeok.backend.member.MemberRole;
import com.mannayeok.backend.notice.dto.NoticeRequest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class NoticeServiceTest {

    @Mock
    private NoticeRepository noticeRepository;

    @Mock
    private MemberRepository memberRepository;

    private NoticeService noticeService;

    @BeforeEach
    void setUp() {
        noticeService = new NoticeService(noticeRepository, memberRepository);
    }

    @Test
    void regularMemberCannotCreateNotice() {
        Member member = member(1L, MemberRole.USER);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> noticeService.create(1L, request(true)))
            .isInstanceOf(AuthException.class)
            .satisfies(exception -> assertThat(((AuthException) exception).getCode())
                .isEqualTo("ADMIN_REQUIRED"));
    }

    @Test
    void adminCanCreatePublishedNotice() {
        Member admin = member(2L, MemberRole.ADMIN);
        when(memberRepository.findById(2L)).thenReturn(Optional.of(admin));
        when(noticeRepository.save(any(Notice.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = noticeService.create(2L, request(true));

        assertThat(response.title()).isEqualTo("테스트 공지");
        assertThat(response.published()).isTrue();
        assertThat(response.details()).containsExactly("첫 번째 내용", "두 번째 내용");
        verify(noticeRepository).save(any(Notice.class));
    }

    @Test
    void publicListContainsOnlyRepositoryPublishedResults() {
        Notice notice = new Notice("공개 공지", NoticeStatus.INFO, "요약", "내용", null, true);
        when(noticeRepository.findByPublishedTrueAndDeletedAtIsNullOrderByPublishedAtDescIdDesc()).thenReturn(List.of(notice));

        var responses = noticeService.findPublished();

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).published()).isTrue();
    }

    @Test
    void deletedNoticeCanBeRestoredByAdmin() {
        Member admin = member(2L, MemberRole.ADMIN);
        Notice notice = new Notice("복구할 공지", NoticeStatus.INFO, "요약", "내용", null, true);
        when(memberRepository.findById(2L)).thenReturn(Optional.of(admin));
        when(noticeRepository.findById(10L)).thenReturn(Optional.of(notice));

        var deleted = noticeService.delete(2L, 10L);
        var restored = noticeService.restore(2L, 10L);

        assertThat(deleted.deletedAt()).isNotNull();
        assertThat(restored.deletedAt()).isNull();
    }

    private static Member member(Long id, MemberRole role) {
        Member member = new Member("member@example.com", "password-hash");
        ReflectionTestUtils.setField(member, "id", id);
        ReflectionTestUtils.setField(member, "role", role);
        return member;
    }

    private static NoticeRequest request(boolean published) {
        return new NoticeRequest(
            "테스트 공지",
            NoticeStatus.INFO,
            "테스트 요약",
            "첫 번째 내용\n두 번째 내용",
            "참고 문구",
            published,
            LocalDate.of(2026, 8, 7)
        );
    }
}
