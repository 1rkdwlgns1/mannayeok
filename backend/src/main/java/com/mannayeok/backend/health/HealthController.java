package com.mannayeok.backend.health;

import java.time.Instant;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    Map<String, Object> health() {
        return Map.of(
            "status", "ok",
            "service", "mannayeok-backend",
            "timestamp", Instant.now().toString()
        );
    }
}
