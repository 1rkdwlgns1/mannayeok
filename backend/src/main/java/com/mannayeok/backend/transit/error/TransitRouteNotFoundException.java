package com.mannayeok.backend.transit.error;

public class TransitRouteNotFoundException extends RuntimeException {

    public TransitRouteNotFoundException(String message) {
        super(message);
    }
}
