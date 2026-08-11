package com.mannayeok.backend.auth;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(PasswordResetProperties.class)
public class PasswordResetConfig {

    @Bean
    Clock passwordResetClock() {
        return Clock.system(ZoneId.of("Asia/Seoul"));
    }
}
