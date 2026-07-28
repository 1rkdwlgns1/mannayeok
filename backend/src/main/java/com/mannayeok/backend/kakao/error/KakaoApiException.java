package com.mannayeok.backend.kakao.error;

public class KakaoApiException extends RuntimeException {

    public KakaoApiException(String message) {
        super(message);
    }
}
