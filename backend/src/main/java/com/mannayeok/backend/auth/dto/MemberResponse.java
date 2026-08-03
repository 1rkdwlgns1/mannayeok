package com.mannayeok.backend.auth.dto;

import com.mannayeok.backend.member.Member;

public record MemberResponse(
    Long id,
    String email,
    String nickname,
    boolean emailVerified
) {
    public static MemberResponse from(Member member) {
        return new MemberResponse(
            member.getId(),
            member.getEmail(),
            member.getNickname(),
            member.isEmailVerified()
        );
    }
}
