package com.mannayeok.backend.transit.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TransitRouteServiceTest {

    @Test
    void keepsTheOfficialSeoulStationName() {
        assertThat(TransitRouteService.normalizeStationName("서울"))
            .isEqualTo("서울역");
        assertThat(TransitRouteService.normalizeStationName("서울역"))
            .isEqualTo("서울역");
    }

    @Test
    void removesTheStationSuffixForOtherStations() {
        assertThat(TransitRouteService.normalizeStationName("건대입구역"))
            .isEqualTo("건대입구");
        assertThat(TransitRouteService.normalizeStationName("의정부"))
            .isEqualTo("의정부");
    }
}
