package com.mannayeok.backend.share;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;

import com.mannayeok.backend.share.dto.SharedResultRequest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class SharedResultServiceTest {

    @Mock
    private SharedResultRepository sharedResultRepository;

    private SharedResultService sharedResultService;

    @BeforeEach
    void setUp() {
        sharedResultService = new SharedResultService(sharedResultRepository);
    }

    @Test
    void createsAndReturnsAStableShareCode() {
        SharedResultRequest request = new SharedResultRequest(SharedResultType.RESULT, "zAbc_123");
        when(sharedResultRepository.findByShareCode(any())).thenReturn(Optional.empty());
        when(sharedResultRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = sharedResultService.create(request);

        assertThat(response.code()).matches("^[a-f0-9]{20}$");
        assertThat(response.type()).isEqualTo(SharedResultType.RESULT);
        assertThat(response.payload()).isEqualTo("zAbc_123");
        assertThat(response.expiresAt()).isAfter(LocalDateTime.now().plusDays(29));
    }

    @Test
    void reusesAnExistingIdenticalShare() {
        SharedResultRequest request = new SharedResultRequest(SharedResultType.REFERENCE, "zPayload");
        SharedResult existing = new SharedResult("3e81c7f98a47dcf43214", SharedResultType.REFERENCE, "zPayload");
        when(sharedResultRepository.findByShareCode(any())).thenReturn(Optional.of(existing));

        var response = sharedResultService.create(request);

        assertThat(response.code()).isEqualTo("3e81c7f98a47dcf43214");
        assertThat(response.expiresAt()).isAfter(LocalDateTime.now().plusDays(29));
        verify(sharedResultRepository, never()).save(any());
    }

    @Test
    void rejectsExpiredShares() {
        String code = "0123456789abcdefabcd";
        SharedResult expired = new SharedResult(
            code,
            SharedResultType.RESULT,
            "zPayload",
            LocalDateTime.now().minusSeconds(1)
        );
        when(sharedResultRepository.findByShareCode(code)).thenReturn(Optional.of(expired));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> sharedResultService.find(code)
        );

        assertThat(exception.getStatusCode().value()).isEqualTo(410);
    }

    @Test
    void removesExpiredSharesDuringCleanup() {
        sharedResultService.deleteExpiredResults();

        verify(sharedResultRepository).deleteByExpiresAtBefore(any(LocalDateTime.class));
    }

    @Test
    void rejectsUnknownShareCodes() {
        when(sharedResultRepository.findByShareCode("0123456789abcdefabcd")).thenReturn(Optional.empty());

        assertThrows(
            ResponseStatusException.class,
            () -> sharedResultService.find("0123456789abcdefabcd")
        );
    }
}
