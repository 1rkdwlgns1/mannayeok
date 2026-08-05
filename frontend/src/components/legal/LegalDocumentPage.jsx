import { ArrowLeft } from 'lucide-react'
import backgroundImage from '../../assets/background.png'

const documents = {
  '/terms': {
    eyebrow: '만나역',
    title: '서비스 이용약관',
    effectiveDate: '2026년 8월 4일',
    sections: [
      ['1. 목적', '이 약관은 만나역이 제공하는 중간역·약속 장소 추천 및 회원 서비스의 이용 조건을 정합니다.'],
      ['2. 계정 이용', '회원은 정확한 이메일을 사용하고 비밀번호를 안전하게 관리해야 합니다. 계정에서 발생한 비정상 이용을 발견하면 운영자에게 알려주세요.'],
      ['3. 추천 정보 안내', '추천 결과는 거리 균형, 교통 접근성, 주변 상권 등을 바탕으로 제공하는 참고 정보이며 실제 운행·영업 상황과 다를 수 있습니다.'],
      ['4. 이용 제한', '서비스 방해, 타인의 계정 도용, 자동화된 과도한 요청 등 정상적인 운영을 해치는 행위는 제한될 수 있습니다.'],
      ['5. 서비스 변경', '베타 서비스 개선을 위해 기능과 제공 범위가 변경될 수 있으며 중요한 변경은 서비스 화면을 통해 안내합니다.'],
      ['6. 문의', '약관과 서비스 이용 문의는 mannayeok.help@gmail.com으로 접수할 수 있습니다.'],
    ],
  },
  '/privacy': {
    eyebrow: '만나역',
    title: '개인정보처리방침',
    effectiveDate: '2026년 8월 4일',
    sections: [
      ['1. 처리 목적 및 항목', '회원가입·로그인·비밀번호 재설정을 위해 이메일과 암호화된 비밀번호를 처리합니다. 약관 준수 확인을 위해 약관 버전, 동의 시각, 만 14세 이상 확인 시각을 함께 기록합니다.'],
      ['2. 보유 기간', '회원 정보는 회원 탈퇴 시까지 보유하며, 관계 법령에 별도 보존 의무가 있는 경우 해당 기간 동안 보관합니다. 비밀번호 재설정 토큰은 암호화된 형태로 저장되며 만료 또는 사용 후 효력을 잃습니다.'],
      ['3. 서비스 이용 정보', '최근 출발지와 검색 성능 개선용 정보는 이용자의 브라우저 저장소에 보관될 수 있습니다. 문의 접수 시 이용자가 작성한 내용과 답변용 이메일을 처리할 수 있습니다.'],
      ['4. 외부 서비스', '경로·지도·장소 정보 제공을 위해 공공데이터 API와 카카오 API를 이용합니다. 문의 저장과 시스템 운영 과정에서 Google 인프라를 이용할 수 있습니다.'],
      ['5. 이용자의 권리', '이용자는 자신의 개인정보에 대해 열람, 정정, 삭제 및 처리정지를 요청할 수 있으며 회원 탈퇴를 요청할 수 있습니다.'],
      ['6. 보호 조치', '비밀번호는 BCrypt로 암호화하여 저장하고, 인증 토큰과 비밀번호 재설정 토큰을 안전하게 관리하기 위한 기술적 조치를 적용합니다.'],
      ['7. 개인정보 문의', '개인정보 관련 문의는 mannayeok.help@gmail.com으로 접수할 수 있습니다.'],
      ['8. 방침 변경', '처리방침이 변경되는 경우 시행 전에 서비스 화면을 통해 안내합니다.'],
    ],
  },
}

function LegalDocumentPage() {
  const document = documents[window.location.pathname] || documents['/terms']

  const handleBack = () => {
    window.close()
    window.setTimeout(() => {
      if (window.history.length > 1) {
        window.history.back()
        return
      }
      window.location.assign('/signup')
    }, 50)
  }

  return (
    <main
      className="min-h-dvh bg-[#F8FAFC] px-3 py-4 text-slate-950 sm:px-5 sm:py-6"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(248,250,252,0.5), rgba(248,250,252,0.72)), url(${backgroundImage})`,
        backgroundPosition: 'center, center bottom',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover, cover',
      }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 shadow-sm transition hover:border-[#CFC5FF] hover:text-[#5D43E6]"
        >
          <ArrowLeft size={19} strokeWidth={2.2} />
          돌아가기
        </button>

        <article className="mt-4 rounded-[22px] border border-[#DDD6FF] bg-white/95 p-5 shadow-[0_18px_55px_rgba(75,55,160,0.11)] backdrop-blur sm:mt-5 sm:rounded-[26px] sm:p-8">
          <header className="border-b border-slate-100 pb-5 text-center">
            <p className="text-xs font-extrabold text-[#6548E8]">{document.eyebrow}</p>
            <h1 className="mt-1.5 text-2xl font-black tracking-[-0.04em] sm:text-3xl">{document.title}</h1>
            <p className="mt-2 text-xs font-semibold text-slate-400">시행일: {document.effectiveDate}</p>
          </header>

          <div className="divide-y divide-slate-100">
            {document.sections.map(([title, content]) => (
              <section key={title} className="py-4 sm:py-5">
                <h2 className="text-sm font-black text-slate-900 sm:text-base">{title}</h2>
                <p className="mt-2 break-keep text-xs font-medium leading-6 text-slate-600 sm:text-sm">{content}</p>
              </section>
            ))}
          </div>

          <button
            type="button"
            onClick={handleBack}
            className="mt-2 h-11 w-full rounded-xl bg-[#6548E8] text-sm font-black text-white transition hover:bg-[#5639DC]"
          >
            확인했어요
          </button>
        </article>
      </div>
    </main>
  )
}

export default LegalDocumentPage
