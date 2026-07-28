package com.mannayeok.backend.transit.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import com.mannayeok.backend.transit.dto.PublicSubwayResponse;
import com.mannayeok.backend.transit.dto.TransitRouteResponse;
import org.junit.jupiter.api.Test;

class TransitRouteMapperTest {

    private final TransitRouteMapper mapper = new TransitRouteMapper();

    @Test
    void compressesStationByStationPathsIntoDisplayRouteSteps() {
        var incheon = station("1812", "인천", "1호선");
        var onSuLine1 = station("1821", "온수", "1호선");
        var onSuLine7 = station("2752", "온수", "7호선");
        var gasan = station("2748", "가산디지털단지", "7호선");

        var body = new PublicSubwayResponse.Body(
            27551,
            3030,
            1950,
            1,
            List.of(new PublicSubwayResponse.TransferStation(
                "온수",
                "1호선 경인선",
                "7호선"
            )),
            List.of(
                path(incheon, onSuLine1, "N"),
                path(onSuLine1, onSuLine7, "Y"),
                path(onSuLine7, gasan, "N")
            )
        );

        TransitRouteResponse result = mapper.toResponse(body);

        assertThat(result.minutes()).isEqualTo(51);
        assertThat(result.transfers()).isEqualTo(1);
        assertThat(result.transferStations()).containsExactly("온수");
        assertThat(result.routeSteps())
            .extracting(step -> step.station() + ":" + step.line() + ":" + step.transfer())
            .containsExactly(
                "인천:1호선:false",
                "온수:7호선:true",
                "가산디지털단지:7호선:false"
            );
    }

    private PublicSubwayResponse.Station station(
        String code,
        String name,
        String line
    ) {
        return new PublicSubwayResponse.Station(code, name, line, null);
    }

    private PublicSubwayResponse.Path path(
        PublicSubwayResponse.Station departure,
        PublicSubwayResponse.Station arrival,
        String transfer
    ) {
        return new PublicSubwayResponse.Path(
            departure,
            arrival,
            60,
            0,
            transfer
        );
    }
}
