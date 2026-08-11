package com.mannayeok.backend.notice.dto;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import com.mannayeok.backend.notice.Notice;

public record NoticeResponse(
    Long id,
    String title,
    String status,
    String summary,
    List<String> details,
    String note,
    boolean published,
    LocalDateTime publishedAt,
    LocalDateTime deletedAt,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static NoticeResponse from(Notice notice) {
        List<String> detailLines = Arrays.stream(notice.getDetails().split("\\R"))
            .map(String::trim)
            .filter(line -> !line.isEmpty())
            .toList();
        return new NoticeResponse(
            notice.getId(), notice.getTitle(), notice.getStatus().name(), notice.getSummary(),
            detailLines, notice.getNote(), notice.isPublished(), notice.getPublishedAt(), notice.getDeletedAt(),
            notice.getCreatedAt(), notice.getUpdatedAt()
        );
    }
}
