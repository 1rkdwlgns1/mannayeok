package com.mannayeok.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MannayeokBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(MannayeokBackendApplication.class, args);
    }
}
