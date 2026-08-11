package com.mannayeok.backend.notice.dto;

import java.time.LocalDate;

import com.mannayeok.backend.notice.NoticeStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record NoticeRequest(
    @NotBlank(message = "제목을 입력해 주세요.")
    @Size(max = 120, message = "제목은 120자 이하로 입력해 주세요.")
    String title,

    @NotNull(message = "공지 상태를 선택해 주세요.")
    NoticeStatus status,

    @NotBlank(message = "요약을 입력해 주세요.")
    @Size(max = 500, message = "요약은 500자 이하로 입력해 주세요.")
    String summary,

    @NotBlank(message = "상세 내용을 한 줄 이상 입력해 주세요.")
    @Size(max = 10000, message = "상세 내용이 너무 깁니다.")
    String details,

    @Size(max = 500, message = "참고 문구는 500자 이하로 입력해 주세요.")
    String note,

    boolean published,

    LocalDate publishedDate
) {
}
