package com.mannayeok.backend.transit.api;

import com.mannayeok.backend.transit.dto.TransitRouteResponse;
import com.mannayeok.backend.transit.service.TransitRouteService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import reactor.core.publisher.Mono;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@Validated
@RestController
@RequestMapping("/api/transit/routes")
public class TransitRouteController {

    private final TransitRouteService transitRouteService;

    public TransitRouteController(TransitRouteService transitRouteService) {
        this.transitRouteService = transitRouteService;
    }

    @GetMapping
    Mono<TransitRouteResponse> getRoute(
        @RequestParam @NotBlank String departure,
        @RequestParam @NotBlank String arrival,
        @RequestParam(defaultValue = "duration")
        @Pattern(regexp = "duration|distance|transfer") String searchType,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime departureAt
    ) {
        return transitRouteService.findRoute(
            departure,
            arrival,
            searchType,
            departureAt
        );
    }
}
