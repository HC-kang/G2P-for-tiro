// Canned Tiro responses for store screenshots (dev server only, opened with #demo).
// Real meeting titles must never end up in public screenshots.
const titles = [
  '주간 제품 회의', '3분기 로드맵 검토', '고객 인터뷰: 온보딩 개선', '디자인 시스템 정리', '신규 입사자 온보딩',
  '가격 정책 논의', '파트너 미팅 준비', '장애 회고', '마케팅 캠페인 킥오프', '채용 인터뷰 디브리프',
  '데이터 파이프라인 점검', '분기 OKR 설정',
]
const notes = titles.map((title, i) => ({
  noteGuid: `demo${i}`, title, createdAt: new Date(Date.UTC(2026, 8, 18 - i * 2, 1)).toISOString(),
}))
const summary = `본 회의는 다음 분기 제품 방향을 정하기 위한 주간 회의로, 온보딩 개선과 가격 정책을 중심으로 논의하였다.

## 결정 사항

* 온보딩 단계를 5단계에서 3단계로 줄인다.
* 가격 정책 개편안은 10월 둘째 주까지 초안을 공유한다.
* 모바일 알림 개선은 다음 분기로 미룬다.

## 액션 아이템

* 온보딩 시안 작성: 디자인 팀, 9월 30일까지
* 가격 실험 설계: 제품 팀, 10월 7일까지
* 고객 인터뷰 5건 추가 진행: 리서치 팀`
const live = `네, 그러면 일정부터 다시 확인하겠습니다. 시안은 다음 주 화요일까지 공유드릴 수 있을 것 같습니다.

좋습니다. 그 일정이면 개발 착수는 10월 첫 주로 잡으면 되겠네요. 리스크는 결제 모듈 쪽 하나만 남았습니다.`

export function demo(name: string, args: { noteGuid?: string }): unknown {
  if (name === 'list_notes') return { content: [{ noteGuid: 'live', title: '제품 전략 회의 (녹음 중)', createdAt: new Date(Date.UTC(2026, 8, 19, 1)).toISOString() }, ...notes], nextCursor: 'more' }
  if (name === 'search_notes') return { notes: notes.filter((_, i) => [2, 5, 0].includes(i)) }
  if (args.noteGuid === 'live') return { sourceType: 'live-voice', recordingEndAt: null, transcript: live }
  return { sourceType: 'live-voice', recordingEndAt: '2026-09-18T02:00:00Z', summary: { content: summary } }
}
