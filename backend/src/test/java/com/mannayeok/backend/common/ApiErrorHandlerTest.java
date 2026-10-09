package com.mannayeok.backend.common;

import static org.assertj.core.api.Assertions.assertThat;

import com.mannayeok.backend.transit.error.TransitRouteNotFoundException;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class ApiErrorHandlerTest {

    @Test
    void returnsNoContentWhenThePublicApiHasNoRoute() {
        var response = new ApiErrorHandler().handleTransitRouteNotFoundException(
            new TransitRouteNotFoundException("조회 가능한 지하철 운행 경로가 없습니다.")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(response.getBody()).isNull();
    }
}
