package com.mannayeok.backend.auth.dto;

import java.util.List;

import com.mannayeok.backend.member.Member;

public record MemberResponse(
    Long id,
    String email,
    String nickname,
    boolean emailVerified,
    String loginProvider,
    String role,
    List<String> linkedProviders
) {
    public static MemberResponse from(Member member) {
        return from(member, "EMAIL", List.of());
    }

    public static MemberResponse from(Member member, String loginProvider) {
        return from(member, loginProvider, List.of());
    }

    public static MemberResponse from(
        Member member,
        String loginProvider,
        List<String> linkedProviders
    ) {
        return new MemberResponse(
            member.getId(),
            member.getEmail(),
            member.getNickname(),
            member.isEmailVerified(),
            loginProvider,
            member.getRole().name(),
            List.copyOf(linkedProviders)
        );
    }
}
