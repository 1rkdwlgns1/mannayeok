package com.mannayeok.backend.auth;

import com.mannayeok.backend.auth.error.AuthException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class PasswordResetMailService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailService.class);

    private final JavaMailSender mailSender;
    private final PasswordResetProperties properties;

    public PasswordResetMailService(
        JavaMailSender mailSender,
        PasswordResetProperties properties
    ) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    public void ensureConfigured() {
        if (
            !properties.enabled()
                || properties.mailFrom() == null
                || properties.mailFrom().isBlank()
        ) {
            throw new AuthException(
                "PASSWORD_RESET_UNAVAILABLE",
                HttpStatus.SERVICE_UNAVAILABLE,
                "비밀번호 재설정 메일 기능을 사용할 수 없어요. 잠시 후 다시 시도해 주세요."
            );
        }
    }

    public boolean sendPasswordReset(String recipient, String rawToken) {
        String resetUrl = UriComponentsBuilder
            .fromUriString(properties.frontendBaseUrl())
            .path("/reset-password")
            .queryParam("token", rawToken)
            .build()
            .encode()
            .toUriString();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.mailFrom());
        message.setTo(recipient);
        message.setSubject("[만나역] 비밀번호 재설정 안내");
        message.setText("""
            만나역 비밀번호 재설정을 요청하셨습니다.

            아래 링크에서 새 비밀번호를 설정해 주세요.
            %s

            이 링크는 %d분 동안 한 번만 사용할 수 있습니다.
            요청하지 않았다면 이 메일을 무시해 주세요.
            """.formatted(resetUrl, properties.tokenMinutes()));

        try {
            mailSender.send(message);
            return true;
        } catch (MailException exception) {
            log.error("Password reset email delivery failed.", exception);
            return false;
        }
    }
}
