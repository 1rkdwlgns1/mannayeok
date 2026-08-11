package com.mannayeok.backend.notice;

import java.util.List;

import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.member.Member;
import com.mannayeok.backend.member.MemberRepository;
import com.mannayeok.backend.member.MemberRole;
import com.mannayeok.backend.notice.dto.NoticeRequest;
import com.mannayeok.backend.notice.dto.NoticeResponse;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final MemberRepository memberRepository;

    public NoticeService(NoticeRepository noticeRepository, MemberRepository memberRepository) {
        this.noticeRepository = noticeRepository;
        this.memberRepository = memberRepository;
    }

    @Transactional(readOnly = true)
    public List<NoticeResponse> findPublished() {
        return noticeRepository.findByPublishedTrueAndDeletedAtIsNullOrderByPublishedAtDescIdDesc().stream()
            .map(NoticeResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<NoticeResponse> findAllForAdmin(Long memberId) {
        requireAdmin(memberId);
        return noticeRepository.findAllByOrderByCreatedAtDescIdDesc().stream()
            .map(NoticeResponse::from)
            .toList();
    }

    @Transactional
    public NoticeResponse create(Long memberId, NoticeRequest request) {
        requireAdmin(memberId);
        Notice notice = new Notice(
            request.title(), request.status(), request.summary(), request.details(), request.note(), request.published()
        );
        notice.setPublishedDate(request.publishedDate());
        return NoticeResponse.from(noticeRepository.save(notice));
    }

    @Transactional
    public NoticeResponse update(Long memberId, Long noticeId, NoticeRequest request) {
        requireAdmin(memberId);
        Notice notice = getNotice(noticeId);
        if (notice.getDeletedAt() != null) throw noticeNotFound();
        notice.update(
            request.title(), request.status(), request.summary(), request.details(), request.note(), request.published()
        );
        notice.setPublishedDate(request.publishedDate());
        return NoticeResponse.from(notice);
    }

    @Transactional
    public NoticeResponse delete(Long memberId, Long noticeId) {
        requireAdmin(memberId);
        Notice notice = getNotice(noticeId);
        notice.moveToTrash();
        return NoticeResponse.from(notice);
    }

    @Transactional
    public NoticeResponse restore(Long memberId, Long noticeId) {
        requireAdmin(memberId);
        Notice notice = getNotice(noticeId);
        notice.restore();
        return NoticeResponse.from(notice);
    }

    private Member requireAdmin(Long memberId) {
        Member member = memberRepository.findById(memberId).orElseThrow(() -> new AuthException(
            "MEMBER_NOT_FOUND", HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."
        ));
        if (member.getRole() != MemberRole.ADMIN) {
            throw new AuthException("ADMIN_REQUIRED", HttpStatus.FORBIDDEN, "관리자만 이용할 수 있습니다.");
        }
        return member;
    }

    private Notice getNotice(Long noticeId) {
        return noticeRepository.findById(noticeId).orElseThrow(NoticeService::noticeNotFound);
    }

    private static AuthException noticeNotFound() {
        return new AuthException("NOTICE_NOT_FOUND", HttpStatus.NOT_FOUND, "공지를 찾을 수 없습니다.");
    }
}
