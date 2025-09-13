# 노션 스타일 @-멘션(노트 참조) 기술 설계

작성일: 2025-09-13 · 범위: 클라이언트(UI/훅/렌더러) + 최소 백엔드 쿼리 · 상태: 설계 초안(MVP → 단계적 확장)

## 1) 목표와 배경

- 목표: `components/notes/note-input.tsx`, `note-edit-modal.tsx`, `note-creation-modal.tsx`에서 텍스트 입력 중 `@`를 입력하면 노션(Notion)처럼 기존 노트를 인라인으로 검색·선택해 “참조 토큰”을 삽입한다.
- UX: 최근 문서 5개 우선 노출 + “15개 결과 더 보기” 클릭 시 확장 검색, 또는 콤보박스(검색 입력 포함) 패턴. 선택 후 본문에 참조가 삽입되고, 렌더 시 링크/배지 형태와 호버 카드 미리보기를 제공.
- 전제: 리치 에디터로의 교체 없이 현행 textarea 흐름 유지. 기존 검색/커맨드 팔레트 인프라(Shadcn + cmdk, TemporalCommandPalette) 재사용.

## 2) 상위 요구사항(요약)

- 트리거: `@` 입력 직후 인라인 메뉴 오픈(IME 조합 중 제외).
- 결과: 최근 5개 + 검색 결과 상위 10~15개, 하단 “15개 결과 더 보기”.
- 선택: 토큰 삽입 → 본문 저장 시 평문 문자열에 토큰 보존.
- 렌더: 토큰을 링크/배지로 치환, hover 시 미리보기 카드(제목/요약/업데이트 시각) 노출.
- 접근성: 콤보박스/자동완성 ARIA 패턴 및 키보드 내비게이션 준수.

## 3) 핵심 기술 결정

- caret 기준 포지셔닝: Floating UI의 Virtual Element + `autoUpdate`로 caret 근처에 정확히 배치.
- caret 좌표 계산: `textarea-caret-position`(경량)로 픽셀 좌표 산출(이슈 시 미러 div 대안).
- 리스트/키보드: 기존 `components/ui/command.tsx`(cmdk 래퍼) 재사용.
- 미리보기 카드: Radix UI HoverCard(또는 유사 래퍼 컴포넌트) 사용.
- 검색/데이터: 최근 5개는 Supabase 정렬 쿼리, 검색은 `useUnifiedSearch()`/`useNotesMutations()` 제공 함수를 재사용.

## 4) 데이터 모델 및 토큰 포맷

- 저장 문자열 내 토큰: `[[gn:note:<id>|<label>]]`
  - 예: `다음 문서 참조 [[gn:note:3f1c-...|토큰 갱신 로직 흐름]]`
  - label: 삽입 시점 제목 또는 첫 줄 요약(렌더 시 최신 제목으로 대체 가능)
  - 장점: 평문 호환성·백업 친화적·파싱 명확
- (선택) 역링크 테이블: `note_references(id, src_note_id, dst_note_id, created_at)`
  - v1은 필요 없음. v2에서 서버/DB 트리거 또는 저장 훅으로 content에서 토큰 추출 후 upsert.

## 5) UX 상세(입력/선택/닫힘)

- 오픈 조건: `@`가 줄 시작/공백/문장부호 뒤일 때(이메일 `a@b` 방지), IME 조합 아님.
- 쿼리 범위: `@`부터 공백/탭/엔터/특수문자 전까지를 실시간 쿼리로 간주.
- 키보드: ↑↓ 항목 이동, Enter 선택, Esc 닫기, Tab 이동(콤보박스 표준 패턴).
- 닫힘: Esc, 포커스 아웃, 선택 완료, 쿼리 종료 시.
- 모바일: 뷰포트 하단 근접 시 위쪽으로 열림(placement 전환).

## 6) 컴포넌트/모듈 설계

### 6.1 훅: `hooks/use-inline-references.ts`

- 공개 API
  - `isOpen: boolean`, `query: string`, `position: {x:number,y:number}`
  - `open(triggerIndex: number)`, `close()`
  - `onChange(nextContent: string)` – 입력 변경 시 트리거/쿼리 추적 및 caret 좌표 갱신
  - `onKeyDown(e)` – ↑↓/Enter/Esc 처리(포워딩 가능)
  - `insertReference({ id, label }): string` – 현재 콘텐츠에서 트리거~현재 쿼리 구간을 토큰으로 치환한 nextContent 반환
- 내부
  - 트리거 인덱스/쿼리 범위 상태, IME 보호(`compositionstart/end`), textarea ref로 caret 픽셀 좌표 산출 → Floating UI virtual element 업데이트.

### 6.2 인라인 메뉴: `components/notes/inline-reference-menu.tsx`

- props: `open`, `position`, `query`, `recents`, `results`, `onSelect`, `onMore`
- UI: cmdk `<Command>` 컨테이너 + `<Command.List>`/`<Command.Item>`
  - 상단: “최근 문서(5)” 섹션
  - 하단: 검색 결과(최대 10~15)
  - Footer: “… 15개 결과 더 보기” 버튼 → 커맨드 팔레트(`TemporalCommandPalette`) 프리필 오픈
- 포지셔닝: Floating UI `useFloating({ elements: { reference: virtualEl } })` + `autoUpdate`

### 6.3 토큰 파서: `lib/references/parse.ts`

- 정규식: `/\[\[gn:note:([a-zA-Z0-9-]+)\|(.*?)\]\]/g`
- API: `parseReferences(text) => Array<{ start, end, id, label }>`

### 6.4 렌더 컴포넌트: `components/notes/note-reference.tsx`

- props: `{ id: string, label: string }`
- 표시: 링크/배지 스타일(아이콘 + label)
- HoverCard: 제목/요약/updated_at 간단 미리보기(지연 로딩). Supabase 단건 select.

### 6.5 기존 파일 연결(코드 변경 지점)

- `note-input.tsx` / `note-edit-modal.tsx` / `note-creation-modal.tsx`
  - textarea에 `useInlineReferences` 연결
  - 인라인 메뉴 포털 렌더
  - “더 보기” 클릭 시 `TemporalCommandPalette` 오픈 + 결과 선택 시 `insertReference`
- `components/notes/smart-text-renderer.tsx`
  - 파싱 → `NoteReference` 치환 단계 추가(기존 마크다운/레거시 렌더 유지)

## 7) 접근성(A11y)

- 콤보박스 패턴 준수(입력 통합형일 경우):
  - `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`
  - 리스트 `role="listbox"`, 항목 `role="option"`
  - 포커스는 textarea 유지(가상 포커스: `aria-activedescendant`)로 입력 연속성 확보
- 키보드: ↑↓/Enter/Esc/Tab 동작을 표준에 맞춤(스크린리더 낭독 호환)
- HoverCard는 포커스 트랩 없이 Esc로 닫힘(기본 Radix 동작)

## 8) 성능/오프라인/오류 처리

- 디바운스: 쿼리 150–200ms
- 프리패치: 최근 5개는 노트 화면 마운트 시 1회 캐시
- `autoUpdate`로 스크롤/리사이즈/viewport 변화 시 위치 유지
- 검색 실패 시 최근 5개만 표시(폴백)
- 오프라인: 메뉴는 열리되 검색 섹션에 오프라인 메시지 노출

## 9) 단계별 구현 계획(PR 단위)

1. PR-1 훅 스켈레톤: `use-inline-references`(트리거/쿼리/IME/좌표만) + 문서/스토리
2. PR-2 인라인 메뉴 MVP: 최근 5개 + 검색 10~15, 선택 시 토큰 삽입
3. PR-3 렌더링: `SmartTextRenderer` 토큰 파서 + `NoteReference` 링크
4. PR-4 HoverCard 미리보기 연동(지연 로딩, 오류 핸들링)
5. PR-5 “15개 결과 더 보기” → `TemporalCommandPalette` 프리필 연동
6. PR-6 (옵션) 메뉴 내부 입력 포함 콤보박스 모드
7. PR-7 (옵션) 역링크 테이블 + 동기화 훅

## 10) 테스트 전략

- 단위
  - 파서: 다양한 문자열/혼합 텍스트에서 정확한 파싱/치환
  - 삽입기: 커서/선택 영역·여러 `@` 동시 사례 처리
- 통합(UI)
  - E2E: ‘@’ → 메뉴 표시 → ↑↓/Enter 선택 → 토큰 삽입 → 저장 → 렌더에서 링크/호버 확인
  - IME: composition 중 메뉴 미표시 확인(한글)
  - 모바일/작은 뷰포트: 충돌/배치 전환
- 접근성
  - 스크린리더 낭독(콤보박스/리스트/옵션), 키보드 내비게이션

## 11) 보안/권한

- 모든 쿼리는 `user_id` 스코프. 미리보기 fetch 또한 동일 스코프.

## 12) 리스크와 완화책

- caret 정밀도: `textarea-caret-position`가 환경별 차이가 있을 수 있음 → 미러 div 백업 구현 경로 확보.
- 입력기(IME) 간섭: composition 이벤트로 보호, 종료 후 재평가.
- 텍스트 길이/스크롤: Floating UI 충돌 회피 미들웨어(placement 전환) 사용.

## 13) 참고 자료(요약 링크)

- Notion @ 멘션 UX(페이지 언급/검색/최근 문서 패턴)
- Floating UI – Virtual element & autoUpdate(클릭/케럿/범위 기준 포지셔닝)
- cmdk – Command/Input/List/Item/Group(키보드/필터)
- WAI-ARIA Authoring Practices – Combobox 패턴(키보드/ARIA 속성)
- Radix UI HoverCard(호버 미리보기)
- textarea-caret-position(텍스트 영역 caret 픽셀 좌표)

> 구현 착수 전 이 문서의 범위/단계(PR 분할)와 토큰 포맷에 대한 합의를 먼저 진행합니다.
