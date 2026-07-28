package com.mannayeok.backend.kakao.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
@EnableConfigurationProperties(KakaoApiProperties.class)
public class KakaoApiConfig {

    @Bean
    WebClient kakaoLocalWebClient(
        WebClient.Builder builder,
        KakaoApiProperties properties
    ) {
        return builder.baseUrl(properties.localBaseUrl()).build();
    }

    @Bean
    WebClient kakaoMobilityWebClient(
        WebClient.Builder builder,
        KakaoApiProperties properties
    ) {
        return builder.baseUrl(properties.mobilityBaseUrl()).build();
    }
}
