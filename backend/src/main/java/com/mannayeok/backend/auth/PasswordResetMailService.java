package com.mannayeok.backend.auth;

import com.mannayeok.backend.auth.error.AuthException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

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

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(properties.mailFrom());
            helper.setTo(recipient);
            helper.setSubject("[만나역] 비밀번호 재설정 안내");
            helper.setText(
                buildPlainText(resetUrl),
                buildHtml(resetUrl)
            );
            mailSender.send(message);
            return true;
        } catch (MessagingException | MailException exception) {
            log.error("Password reset email delivery failed.", exception);
            return false;
        }
    }

    private String buildPlainText(String resetUrl) {
        return """
            안녕하세요, 만나역입니다.

            만나역 비밀번호 재설정을 요청하셨어요.
            아래 링크에서 새 비밀번호를 설정해 주세요.
            %s

            이 링크는 %d분 동안 유효하며, 1회만 사용할 수 있습니다.

            문의: %s
            """.formatted(
                resetUrl,
                properties.tokenMinutes(),
                properties.mailFrom()
            );
    }

    private String buildHtml(String resetUrl) {
        String safeResetUrl = HtmlUtils.htmlEscape(resetUrl);
        String safeContact = HtmlUtils.htmlEscape(properties.mailFrom());

        return """
            <!doctype html>
            <html lang="ko">
              <body style="margin:0;padding:32px 16px;background:#f7f5ff;font-family:Arial,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#17152b;">
                <div style="max-width:560px;margin:0 auto;padding:40px 36px;background:#ffffff;border:1px solid #ded8ff;border-radius:20px;">
                  <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">안녕하세요, 만나역입니다.</p>
                  <h1 style="margin:0 0 12px;font-size:24px;line-height:1.4;">비밀번호를 재설정해 주세요</h1>
                  <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#5f6880;">
                    만나역 비밀번호 재설정을 요청하셨어요.<br>
                    아래 버튼을 눌러 새 비밀번호를 설정해 주세요.
                  </p>
                  <p style="margin:0 0 28px;text-align:center;">
                    <a href="%s" style="display:inline-block;padding:15px 30px;background:#654be8;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;border-radius:12px;">비밀번호 재설정하기</a>
                  </p>
                  <p style="margin:0 0 24px;padding:16px;background:#f5f2ff;border-radius:12px;font-size:14px;line-height:1.7;color:#5f6880;">
                    ⏱ 이 링크는 %d분 동안 유효하며, 1회만 사용할 수 있습니다.
                  </p>
                  <p style="margin:0;font-size:13px;color:#8a91a5;">문의: %s</p>
                </div>
              </body>
            </html>
            """.formatted(
                safeResetUrl,
                properties.tokenMinutes(),
                safeContact
            );
    }
}
