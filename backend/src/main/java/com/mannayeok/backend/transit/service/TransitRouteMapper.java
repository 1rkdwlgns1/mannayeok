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

            int lastPathIndex = paths.size() - 1;

            for (int index = 0; index < paths.size(); index++) {
                PublicSubwayResponse.Path path = paths.get(index);
                if (path.isTransfer() && index != lastPathIndex) {
                    routeSteps.add(toStep(path.arvlStn(), true));
                }
            }

            PublicSubwayResponse.Path lastPath = paths.get(lastPathIndex);
            RouteStep endStep = toEndStep(lastPath);
            RouteStep lastStep = routeSteps.get(routeSteps.size() - 1);
            if (!sameStep(lastStep, endStep)) {
                routeSteps.add(endStep);
            }
        }

        List<String> transferStations = routeSteps.stream()
            .filter(RouteStep::transfer)
            .map(RouteStep::station)
            .distinct()
            .toList();
        int displayedTransfers = routeSteps.isEmpty()
            ? body.trsitNmtm()
            : (int) routeSteps.stream()
                .filter(RouteStep::transfer)
                .distinct()
                .count();

        return new TransitRouteResponse(
            (int) Math.ceil(body.totalReqHr() / 60.0),
            body.totalReqHr(),
            displayedTransfers,
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

    private RouteStep toEndStep(PublicSubwayResponse.Path lastPath) {
        PublicSubwayResponse.Station end = lastPath.arvlStn();
        if (!lastPath.isTransfer()) return toStep(end, false);

        // 환승역은 노선별 역 코드가 다르다. 도착역의 다른 노선 코드를 조회한
        // 응답은 하차 후 코드 전환까지 환승으로 표시하지만 승객은 환승하지 않는다.
        PublicSubwayResponse.Station arrivingLine = lastPath.dptreStn();
        return new RouteStep(
            end == null ? null : end.stnNm(),
            arrivingLine == null ? null : arrivingLine.lineNm(),
            false
        );
    }

    private boolean sameStep(RouteStep left, RouteStep right) {
        return java.util.Objects.equals(left.station(), right.station())
            && java.util.Objects.equals(left.line(), right.line());
    }
}
