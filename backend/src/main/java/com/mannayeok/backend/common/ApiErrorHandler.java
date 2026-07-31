package com.mannayeok.backend.common;

import java.time.Instant;
import java.util.Map;

import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.kakao.error.KakaoApiException;
import com.mannayeok.backend.transit.error.SubwayApiException;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.support.WebExchangeBindException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiErrorHandler {

    @ExceptionHandler(AuthException.class)
    ResponseEntity<Map<String, Object>> handleAuthException(AuthException exception) {
        return ResponseEntity.status(exception.getStatus()).body(Map.of(
            "code", exception.getCode(),
            "message", exception.getMessage(),
            "timestamp", Instant.now().toString()
        ));
    }

    @ExceptionHandler(WebExchangeBindException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    Map<String, Object> handleValidationException(WebExchangeBindException exception) {
        String message = exception.getFieldErrors().stream()
            .findFirst()
            .map(error -> error.getDefaultMessage())
            .orElse("입력값을 확인해 주세요.");

        return Map.of(
            "code", "INVALID_REQUEST",
            "message", message,
            "timestamp", Instant.now().toString()
        );
    }

    @ExceptionHandler(SubwayApiException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    Map<String, Object> handleSubwayApiException(SubwayApiException exception) {
        return Map.of(
            "code", "SUBWAY_API_ERROR",
            "message", exception.getMessage(),
            "timestamp", Instant.now().toString()
        );
    }

    @ExceptionHandler(KakaoApiException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    Map<String, Object> handleKakaoApiException(KakaoApiException exception) {
        return Map.of(
            "code", "KAKAO_API_ERROR",
            "message", exception.getMessage(),
            "timestamp", Instant.now().toString()
        );
    }
}
