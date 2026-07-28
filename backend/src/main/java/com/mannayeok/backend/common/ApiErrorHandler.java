package com.mannayeok.backend.common;

import java.time.Instant;
import java.util.Map;

import com.mannayeok.backend.kakao.error.KakaoApiException;
import com.mannayeok.backend.transit.error.SubwayApiException;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiErrorHandler {

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
