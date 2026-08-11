package com.mannayeok.backend.auth.oauth;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(NaverOAuthProperties.class)
public class NaverOAuthConfig {
}
