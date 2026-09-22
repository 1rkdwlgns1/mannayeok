UPDATE notices
SET title = '만나역 서비스 이용 안내',
    summary = '만나역은 더 편리하고 정확한 약속역 추천을 위해 서비스를 지속적으로 개선하고 있습니다.',
    updated_at = NOW(6)
WHERE title = '만나역 베타 서비스 이용 안내'
  AND summary = '만나역은 더 편리하고 정확한 약속역 추천을 위해 베타 서비스로 운영되고 있습니다.';
