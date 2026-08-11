package com.mannayeok.backend.share;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;

import com.mannayeok.backend.share.dto.SharedResultRequest;
import com.mannayeok.backend.share.dto.SharedResultResponse;

import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SharedResultService {

    private static final int SHARE_CODE_LENGTH = 20;
    private static final int SHARE_RETENTION_DAYS = 30;

    private final SharedResultRepository sharedResultRepository;

    public SharedResultService(SharedResultRepository sharedResultRepository) {
        this.sharedResultRepository = sharedResultRepository;
    }

    @Transactional
    public SharedResultResponse create(SharedResultRequest request) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusDays(SHARE_RETENTION_DAYS);
        String code = createCode(request.type(), request.payload());
        SharedResult sharedResult = sharedResultRepository.findByShareCode(code)
            .orElseGet(() -> sharedResultRepository.save(
                new SharedResult(code, request.type(), request.payload(), expiresAt)
            ));
        sharedResult.renewUntil(expiresAt);
        return SharedResultResponse.from(sharedResult);
    }

    @Transactional(readOnly = true)
    public SharedResultResponse find(String code) {
        if (code == null || !code.matches("^[a-f0-9]{20}$")) {
            throw notFound();
        }
        SharedResult sharedResult = sharedResultRepository.findByShareCode(code)
            .orElseThrow(SharedResultService::notFound);
        if (sharedResult.isExpired(LocalDateTime.now())) throw expired();
        return SharedResultResponse.from(sharedResult);
    }

    @Scheduled(
        fixedDelayString = "${app.share.cleanup-interval-ms:86400000}",
        initialDelayString = "${app.share.cleanup-initial-delay-ms:60000}"
    )
    @Transactional
    public void deleteExpiredResults() {
        sharedResultRepository.deleteByExpiresAtBefore(LocalDateTime.now());
    }

    private static String createCode(SharedResultType type, String payload) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((type.name() + ':' + payload).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).substring(0, SHARE_CODE_LENGTH);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "공유 결과를 찾을 수 없습니다.");
    }

    private static ResponseStatusException expired() {
        return new ResponseStatusException(HttpStatus.GONE, "공유 링크가 만료되었습니다.");
    }
}
