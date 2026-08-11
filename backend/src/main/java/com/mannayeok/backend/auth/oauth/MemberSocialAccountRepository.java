package com.mannayeok.backend.auth.oauth;

import java.util.Optional;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberSocialAccountRepository extends JpaRepository<MemberSocialAccount, Long> {

    Optional<MemberSocialAccount> findByProviderAndProviderUserId(
        SocialProvider provider,
        String providerUserId
    );

    boolean existsByMember_IdAndProvider(Long memberId, SocialProvider provider);

    Optional<MemberSocialAccount> findByMember_IdAndProvider(
        Long memberId,
        SocialProvider provider
    );

    Optional<MemberSocialAccount> findFirstByMember_Id(Long memberId);

    List<MemberSocialAccount> findAllByMember_IdOrderByIdAsc(Long memberId);
}
