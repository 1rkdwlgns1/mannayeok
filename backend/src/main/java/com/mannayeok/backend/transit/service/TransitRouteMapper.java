package com.mannayeok.backend.transit.service;

import java.util.ArrayList;
import java.util.List;

import com.mannayeok.backend.transit.dto.PublicSubwayResponse;
import com.mannayeok.backend.transit.dto.RouteStep;
import com.mannayeok.backend.transit.dto.TransitRouteResponse;

import org.springframework.stereotype.Component;

@Component
public class TransitRouteMapper {

    public TransitRouteResponse toResponse(PublicSubwayResponse.Body body) {
        List<PublicSubwayResponse.Path> paths =
            body.paths() == null ? List.of() : body.paths();
        List<RouteStep> routeSteps = new ArrayList<>();

        if (!paths.isEmpty()) {
            PublicSubwayResponse.Station start = paths.get(0).dptreStn();
            routeSteps.add(toStep(start, false));

            paths.stream()
                .filter(PublicSubwayResponse.Path::isTransfer)
                .map(PublicSubwayResponse.Path::arvlStn)
                .map(station -> toStep(station, true))
                .forEach(routeSteps::add);

            PublicSubwayResponse.Station end =
                paths.get(paths.size() - 1).arvlStn();
            RouteStep endStep = toStep(end, false);
            RouteStep lastStep = routeSteps.get(routeSteps.size() - 1);
            if (!sameStep(lastStep, endStep)) {
                routeSteps.add(endStep);
            }
        }

        List<String> transferStations = body.trfstnNms() == null
            ? List.of()
            : body.trfstnNms().stream()
                .map(PublicSubwayResponse.TransferStation::stnNm)
                .toList();

        return new TransitRouteResponse(
            (int) Math.ceil(body.totalReqHr() / 60.0),
            body.totalReqHr(),
            body.trsitNmtm(),
            body.totalCardCrg(),
            body.totalDstc(),
            transferStations,
            List.copyOf(routeSteps),
            "SEOUL_METRO_PUBLIC_DATA",
            false
        );
    }

    private RouteStep toStep(PublicSubwayResponse.Station station, boolean transfer) {
        return new RouteStep(
            station == null ? null : station.stnNm(),
            station == null ? null : station.lineNm(),
            transfer
        );
    }

    private boolean sameStep(RouteStep left, RouteStep right) {
        return java.util.Objects.equals(left.station(), right.station())
            && java.util.Objects.equals(left.line(), right.line());
    }
}
