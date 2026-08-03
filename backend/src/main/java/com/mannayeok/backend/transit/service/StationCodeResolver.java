package com.mannayeok.backend.transit.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class StationCodeResolver {

    private static final String STATION_DATA_PATH = "data/subway-stations.json";

    private final Map<String, List<String>> codesByStationName;

    public StationCodeResolver(ObjectMapper objectMapper) {
        this.codesByStationName = loadStationCodes(objectMapper);
    }

    public List<String> resolve(String stationName) {
        List<String> codes = codesByStationName.get(normalizeStationName(stationName));
        if (codes == null || codes.isEmpty()) {
            throw new IllegalArgumentException("공식 역코드를 찾을 수 없습니다: " + stationName);
        }
        return codes;
    }

    static String normalizeStationName(String stationName) {
        String normalized = stationName == null ? "" : stationName.trim();
        if ("서울".equals(normalized) || "서울역".equals(normalized)) {
            return "서울역";
        }
        return normalized.endsWith("역")
            ? normalized.substring(0, normalized.length() - 1)
            : normalized;
    }

    private Map<String, List<String>> loadStationCodes(ObjectMapper objectMapper) {
        Map<String, List<String>> mutableCodes = new LinkedHashMap<>();
        ClassPathResource resource = new ClassPathResource(STATION_DATA_PATH);

        try (InputStream inputStream = resource.getInputStream()) {
            JsonNode stations = objectMapper.readTree(inputStream).path("DATA");
            for (JsonNode station : stations) {
                String name = station.path("station_nm").asText();
                String code = station.path("station_cd").asText();
                if (name.isBlank() || code.isBlank()) continue;

                mutableCodes.computeIfAbsent(name, ignored -> new ArrayList<>());
                if (!mutableCodes.get(name).contains(code)) {
                    mutableCodes.get(name).add(code);
                }
            }
        } catch (IOException exception) {
            throw new IllegalStateException("지하철 역코드 데이터를 읽지 못했습니다.", exception);
        }

        Map<String, List<String>> immutableCodes = new LinkedHashMap<>();
        mutableCodes.forEach((name, codes) -> immutableCodes.put(name, List.copyOf(codes)));
        return Map.copyOf(immutableCodes);
    }
}
