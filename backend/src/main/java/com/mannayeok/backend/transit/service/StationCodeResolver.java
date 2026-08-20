package com.mannayeok.backend.transit.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class StationCodeResolver {

    private static final String STATION_DATA_PATH = "data/subway-stations.json";
    private static final Pattern LINE_SUFFIX_PATTERN = Pattern.compile(
        "\\s*(?:0?\\d+호선|인천(?:\\d+호선|선)|경의(?:·)?중앙선|경의선|경춘선|경강선|"
            + "서해선|수인분당선|신분당선|GTX-A|공항철도|김포골드라인|"
            + "김포도시철도|용인경전철|에버라인|우이신설경전철|우이신설선|"
            + "신림선|의정부경전철|경전철의정부)$",
        Pattern.CASE_INSENSITIVE
    );

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
        normalized = LINE_SUFFIX_PATTERN.matcher(normalized).replaceFirst("").trim();
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
