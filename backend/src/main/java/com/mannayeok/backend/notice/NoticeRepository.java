package com.mannayeok.backend.notice;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
    List<Notice> findByPublishedTrueAndDeletedAtIsNullOrderByPublishedAtDescIdDesc();
    List<Notice> findAllByOrderByCreatedAtDescIdDesc();
}
