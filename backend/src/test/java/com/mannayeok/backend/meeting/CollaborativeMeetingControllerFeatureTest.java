package com.mannayeok.backend.meeting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

class CollaborativeMeetingControllerFeatureTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withUserConfiguration(TestConfig.class);

    @Test
    void controllerIsDisabledByDefault() {
        contextRunner.run(context ->
            assertThat(context).doesNotHaveBean(CollaborativeMeetingController.class)
        );
    }

    @Test
    void controllerCanBeEnabledExplicitly() {
        contextRunner
            .withPropertyValues("app.features.collaborative-meetings-enabled=true")
            .run(context ->
                assertThat(context).hasSingleBean(CollaborativeMeetingController.class)
            );
    }

    @Configuration(proxyBeanMethods = false)
    @Import(CollaborativeMeetingController.class)
    static class TestConfig {

        @Bean
        CollaborativeMeetingService collaborativeMeetingService() {
            return mock(CollaborativeMeetingService.class);
        }
    }
}
