package com.mannayeok.backend.admin;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

import com.mannayeok.backend.auth.error.AuthException;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class AdminVerificationAttemptGuard {

    private static final int MAX_FAILURES = 5;
    private static final Duration BLOCK_DURATION = Duration.ofMinutes(15);

    private final ConcurrentHashMap<Long, AttemptState> attempts = new ConcurrentHashMap<>();

    public void ensureAllowed(Long memberId) {
        AttemptState state = attempts.get(memberId);
        if (state == null) return;
        if (state.blockedUntil() != null && state.blockedUntil().isAfter(Instant.now())) {
            throw tooManyAttempts();
        }
        if (state.blockedUntil() != null) attempts.remove(memberId, state);
    }

    public void recordFailure(Long memberId) {
        AttemptState state = attempts.compute(memberId, (id, current) -> {
            int failures = current == null ? 1 : current.failures() + 1;
            Instant blockedUntil = failures >= MAX_FAILURES
                ? Instant.now().plus(BLOCK_DURATION)
                : null;
            return new AttemptState(failures, blockedUntil);
        });
        if (state.blockedUntil() != null) throw tooManyAttempts();
    }

    public void reset(Long memberId) {
        attempts.remove(memberId);
    }

    private static AuthException tooManyAttempts() {
        return new AuthException(
            "TOO_MANY_ADMIN_VERIFICATION_ATTEMPTS",
            HttpStatus.TOO_MANY_REQUESTS,
            "관리자 비밀번호 확인에 여러 번 실패했어요. 15분 후 다시 시도해 주세요."
        );
    }

    private record AttemptState(int failures, Instant blockedUntil) {
    }
}
