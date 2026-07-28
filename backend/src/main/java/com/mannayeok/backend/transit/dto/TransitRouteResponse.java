package com.mannayeok.backend.transit.dto;

import java.util.List;

public record TransitRouteResponse(
    int minutes,
    int durationSeconds,
    int transfers,
    int fare,
    int distanceMeters,
    List<String> transferStations,
    List<RouteStep> routeSteps,
    String source,
    boolean fallbackSchedule
) {
}
