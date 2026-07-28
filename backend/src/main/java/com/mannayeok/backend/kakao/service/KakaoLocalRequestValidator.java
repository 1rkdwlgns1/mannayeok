package com.mannayeok.backend.kakao.service;

import java.util.Map;
import java.util.Set;

import com.mannayeok.backend.kakao.error.KakaoApiException;

import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;

@Component
public class KakaoLocalRequestValidator {

    private static final Map<String, String> ENDPOINTS = Map.of(
        "address", "address.json",
        "category", "category.json",
        "keyword", "keyword.json"
    );

    private static final Map<String, Set<String>> ALLOWED_PARAMS = Map.of(
        "address", Set.of("query", "analyze_type", "page", "size"),
        "category", Set.of(
            "category_group_code", "x", "y", "radius", "rect",
            "page", "size", "sort"
        ),
        "keyword", Set.of(
            "query", "category_group_code", "x", "y", "radius",
            "rect", "page", "size", "sort"
        )
    );

    public String validate(String type, MultiValueMap<String, String> params) {
        String endpoint = ENDPOINTS.get(type);
        if (endpoint == null) {
            throw new KakaoApiException("지원하지 않는 카카오 로컬 검색 유형입니다.");
        }

        Set<String> allowedParams = ALLOWED_PARAMS.get(type);
        params.forEach((key, values) -> {
            if (!allowedParams.contains(key)) {
                throw new KakaoApiException("지원하지 않는 요청 변수입니다: " + key);
            }
            if (values.size() != 1) {
                throw new KakaoApiException("중복 요청 변수는 사용할 수 없습니다: " + key);
            }
        });

        String query = first(params, "query");
        if (
            ("address".equals(type) || "keyword".equals(type))
                && (query == null || query.isBlank() || query.trim().length() > 100)
        ) {
            throw new KakaoApiException("검색어는 1자 이상 100자 이하여야 합니다.");
        }

        if ("category".equals(type)) {
            String categoryCode = first(params, "category_group_code");
            if (categoryCode == null || !categoryCode.matches("[A-Z0-9]{2,4}")) {
                throw new KakaoApiException("카테고리 코드가 올바르지 않습니다.");
            }
        }

        validateInteger(params, "page", 1, 45);
        validateInteger(params, "size", 1, 15);
        validateInteger(params, "radius", 0, 20_000);
        validateDouble(params, "x", -180, 180);
        validateDouble(params, "y", -90, 90);

        String sort = first(params, "sort");
        if (sort != null && !Set.of("accuracy", "distance").contains(sort)) {
            throw new KakaoApiException("정렬 기준이 올바르지 않습니다.");
        }

        String analyzeType = first(params, "analyze_type");
        if (
            analyzeType != null
                && !Set.of("similar", "exact").contains(analyzeType)
        ) {
            throw new KakaoApiException("주소 분석 방식이 올바르지 않습니다.");
        }

        validateRect(params);
        return endpoint;
    }

    private void validateInteger(
        MultiValueMap<String, String> params,
        String key,
        int minimum,
        int maximum
    ) {
        String value = first(params, key);
        if (value == null) return;

        try {
            int number = Integer.parseInt(value);
            if (number < minimum || number > maximum) {
                throw new NumberFormatException();
            }
        } catch (NumberFormatException exception) {
            throw new KakaoApiException(key + " 값이 올바르지 않습니다.");
        }
    }

    private void validateDouble(
        MultiValueMap<String, String> params,
        String key,
        double minimum,
        double maximum
    ) {
        String value = first(params, key);
        if (value == null) return;

        try {
            double number = Double.parseDouble(value);
            if (!Double.isFinite(number) || number < minimum || number > maximum) {
                throw new NumberFormatException();
            }
        } catch (NumberFormatException exception) {
            throw new KakaoApiException(key + " 값이 올바르지 않습니다.");
        }
    }

    private void validateRect(MultiValueMap<String, String> params) {
        String rect = first(params, "rect");
        if (rect == null) return;

        String[] coordinates = rect.split(",");
        if (coordinates.length != 4) {
            throw new KakaoApiException("검색 영역 값이 올바르지 않습니다.");
        }

        for (int index = 0; index < coordinates.length; index += 1) {
            double minimum = index % 2 == 0 ? -180 : -90;
            double maximum = index % 2 == 0 ? 180 : 90;
            try {
                double coordinate = Double.parseDouble(coordinates[index]);
                if (
                    !Double.isFinite(coordinate)
                        || coordinate < minimum
                        || coordinate > maximum
                ) {
                    throw new NumberFormatException();
                }
            } catch (NumberFormatException exception) {
                throw new KakaoApiException("검색 영역 값이 올바르지 않습니다.");
            }
        }
    }

    private String first(MultiValueMap<String, String> params, String key) {
        String value = params.getFirst(key);
        return value == null || value.isBlank() ? null : value.trim();
    }
}
