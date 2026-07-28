package com.mannayeok.backend.transit.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
@EnableConfigurationProperties(SubwayApiProperties.class)
public class SubwayApiConfig {

    @Bean
    WebClient subwayWebClient(
        WebClient.Builder builder,
        SubwayApiProperties properties
    ) {
        return builder.baseUrl(properties.baseUrl()).build();
    }
}
