package com.mannayeok.backend.auth.oauth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

import com.mannayeok.backend.auth.JwtService;
import com.mannayeok.backend.auth.dto.AuthResponse;
import com.mannayeok.backend.auth.dto.MemberResponse;
import com.mannayeok.backend.auth.error.AuthException;
import com.mannayeok.backend.auth.oauth.dto.SocialSignupRequest;
import com.mannayeok.backend.auth.oauth.dto.SocialLinkRequest;
import com.mannayeok.backend.member.AccountReauthenticationGuard;
import com.mannayeok.backend.member.Member;
import com.mannayeok.backend.member.MemberRepository;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OAuthLoginService {

    private static final String TERMS_VERSION = "2026-08-10";
    private static final int TICKET_MINUTES = 5;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final OAuthLoginTicketRepository ticketRepository;
    private final MemberSocialAccountRepository socialAccountRepository;
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final OAuthTokenCipher tokenCipher;
    private final AccountReauthenticationGuard reauthenticationGuard;

    public OAuthLoginService(
        OAuthLoginTicketRepository ticketRepository,
        MemberSocialAccountRepository socialAccountRepository,
        MemberRepository memberRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService,
        OAuthTokenCipher tokenCipher,
        AccountReauthenticationGuard reauthenticationGuard
    ) {
        this.ticketRepository = ticketRepository;
        this.socialAccountRepository = socialAccountRepository;
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.tokenCipher = tokenCipher;
        this.reauthenticationGuard = reauthenticationGuard;
    }

    @Transactional
    public PreparedLogin prepareKakaoLogin(KakaoOAuthClient.KakaoUser kakaoUser) {
        return prepareLogin(SocialProvider.KAKAO, kakaoUser.providerUserId(), kakaoUser.email(), null);
    }

    @Transactional
    public PreparedLogin prepareNaverLogin(NaverOAuthClient.NaverUser naverUser) {
        return prepareLogin(
            SocialProvider.NAVER,
            naverUser.providerUserId(),
            naverUser.email(),
            naverUser.refreshToken()
        );
    }

    private PreparedLogin prepareLogin(
        SocialProvider provider,
        String providerUserId,
        String email,
        String refreshToken
    ) {
        MemberSocialAccount socialAccount = socialAccountRepository
            .findByProviderAndProviderUserId(provider, providerUserId)
            .orElse(null);
        Member member = socialAccount == null ? null : socialAccount.getMember();
        String encryptedRefreshToken = tokenCipher.encrypt(refreshToken);

        if (socialAccount != null) {
            socialAccount.updateRefreshToken(encryptedRefreshToken);
        }

        boolean linkRequired = member == null && memberRepository.existsByEmail(email);

        if (member == null && !linkRequired && memberRepository.existsByEmail(email)) {
            throw new AuthException(
                "SOCIAL_EMAIL_ALREADY_EXISTS",
                HttpStatus.CONFLICT,
                "같은 이메일로 가입된 계정이 있어요. 이메일로 로그인해 주세요."
            );
        }

        String rawTicket = randomToken();
        LocalDateTime now = LocalDateTime.now();
        ticketRepository.save(new OAuthLoginTicket(
            sha256(rawTicket),
            provider,
            providerUserId,
            email,
            encryptedRefreshToken,
            member,
            now.plusMinutes(TICKET_MINUTES),
            now
        ));
        return new PreparedLogin(rawTicket, member == null && !linkRequired, linkRequired);
    }

    @Transactional
    public AuthResponse exchange(String rawTicket) {
        OAuthLoginTicket ticket = getUsableTicket(rawTicket);
        if (ticket.getMember() == null) {
            throw invalidTicket();
        }
        ticket.markUsed(LocalDateTime.now());
        return issueAuth(ticket.getMember(), ticket.getProvider());
    }

    @Transactional
    public AuthResponse signup(SocialSignupRequest request) {
        OAuthLoginTicket ticket = getUsableTicket(request.ticket());
        if (ticket.getMember() != null) {
            throw invalidTicket();
        }
        if (memberRepository.existsByEmail(ticket.getEmail())) {
            throw new AuthException(
                "SOCIAL_EMAIL_ALREADY_EXISTS",
                HttpStatus.CONFLICT,
                "같은 이메일로 가입된 계정이 있어요. 이메일로 로그인해 주세요."
            );
        }

        Member member = new Member(ticket.getEmail(), passwordEncoder.encode(randomToken()));
        member.recordSignupConsent(TERMS_VERSION, LocalDateTime.now());
        try {
            memberRepository.save(member);
            socialAccountRepository.saveAndFlush(new MemberSocialAccount(
                member,
                ticket.getProvider(),
                ticket.getProviderUserId(),
                ticket.getRefreshTokenCiphertext()
            ));
        } catch (DataIntegrityViolationException exception) {
            throw new AuthException(
                "SOCIAL_ACCOUNT_ALREADY_EXISTS",
                HttpStatus.CONFLICT,
                "이미 가입된 간편 로그인 계정이에요. 다시 로그인해 주세요."
            );
        }
        ticket.markUsed(LocalDateTime.now());
        return issueAuth(member, ticket.getProvider());
    }

    @Transactional
    public AuthResponse linkKakao(SocialLinkRequest request) {
        return linkSocialAccount(SocialProvider.KAKAO, request);
    }

    @Transactional
    public AuthResponse linkNaver(SocialLinkRequest request) {
        return linkSocialAccount(SocialProvider.NAVER, request);
    }

    private AuthResponse linkSocialAccount(
        SocialProvider expectedProvider,
        SocialLinkRequest request
    ) {
        OAuthLoginTicket ticket = getUsableTicket(request.ticket());
        if (ticket.getMember() != null || ticket.getProvider() != expectedProvider) {
            throw invalidTicket();
        }

        Member member = memberRepository.findByEmail(ticket.getEmail())
            .orElseThrow(OAuthLoginService::invalidTicket);
        reauthenticationGuard.ensureAllowed(member.getId());
        if (!passwordEncoder.matches(request.currentPassword(), member.getPasswordHash())) {
            reauthenticationGuard.recordFailure(member.getId());
            throw new AuthException(
                "CURRENT_PASSWORD_MISMATCH",
                HttpStatus.UNAUTHORIZED,
                "현재 비밀번호가 일치하지 않아요."
            );
        }
        reauthenticationGuard.reset(member.getId());

        if (socialAccountRepository.existsByMember_IdAndProvider(member.getId(), expectedProvider)) {
            throw new AuthException(
                "SOCIAL_ACCOUNT_ALREADY_LINKED",
                HttpStatus.CONFLICT,
                "이미 간편 로그인 계정이 연결되어 있어요."
            );
        }
        if (socialAccountRepository
            .findByProviderAndProviderUserId(expectedProvider, ticket.getProviderUserId())
            .isPresent()) {
            throw new AuthException(
                "SOCIAL_ACCOUNT_ALREADY_EXISTS",
                HttpStatus.CONFLICT,
                "이 간편 로그인 계정은 이미 다른 만나역 계정에 연결되어 있어요."
            );
        }

        try {
            socialAccountRepository.saveAndFlush(new MemberSocialAccount(
                member,
                expectedProvider,
                ticket.getProviderUserId(),
                ticket.getRefreshTokenCiphertext()
            ));
        } catch (DataIntegrityViolationException exception) {
            throw new AuthException(
                "SOCIAL_ACCOUNT_ALREADY_EXISTS",
                HttpStatus.CONFLICT,
                "이 간편 로그인 계정은 이미 다른 만나역 계정에 연결되어 있어요."
            );
        }
        ticket.markUsed(LocalDateTime.now());
        return issueAuth(member, expectedProvider);
    }

    private OAuthLoginTicket getUsableTicket(String rawTicket) {
        OAuthLoginTicket ticket = ticketRepository.findByTokenHash(sha256(rawTicket))
            .orElseThrow(OAuthLoginService::invalidTicket);
        if (!ticket.isUsableAt(LocalDateTime.now())) throw invalidTicket();
        return ticket;
    }

    private AuthResponse issueAuth(Member member, SocialProvider provider) {
        JwtService.IssuedToken token = jwtService.issue(member);
        return new AuthResponse(
            token.value(),
            "Bearer",
            token.expiresIn(),
            MemberResponse.from(
                member,
                provider.name(),
                socialAccountRepository.findAllByMember_IdOrderByIdAsc(member.getId()).stream()
                    .map(MemberSocialAccount::getProvider)
                    .map(Enum::name)
                    .toList()
            )
        );
    }

    public static String randomToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }

    private static AuthException invalidTicket() {
        return new AuthException(
            "INVALID_OAUTH_TICKET",
            HttpStatus.UNAUTHORIZED,
            "로그인 정보가 만료됐어요. 간편 로그인을 다시 시도해 주세요."
        );
    }

    public record PreparedLogin(String ticket, boolean signupRequired, boolean linkRequired) {
    }
}
