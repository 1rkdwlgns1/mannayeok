package com.mannayeok.backend.share.dto;

import java.time.LocalDateTime;

import com.mannayeok.backend.share.SharedResult;
import com.mannayeok.backend.share.SharedResultType;

public record SharedResultResponse(
    String code,
    SharedResultType type,
    String payload,
    LocalDateTime expiresAt
) {
    public static SharedResultResponse from(SharedResult sharedResult) {
        return new SharedResultResponse(
            sharedResult.getShareCode(),
            sharedResult.getResultType(),
            sharedResult.getPayload(),
            sharedResult.getExpiresAt()
        );
    }
}
