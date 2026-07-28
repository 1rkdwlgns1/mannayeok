package com.mannayeok.backend.transit.dto;

public record RouteStep(
    String station,
    String line,
    boolean transfer
) {
}
