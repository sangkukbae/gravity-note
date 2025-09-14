# Gravity Note: 운영 우수성 기술 설계 (Operational Excellence)

**마지막 업데이트**: 2025년 9월 14일
**상태**: 설계 완료

## 1. 개요

이 문서는 Gravity Note의 안정성, 성능, 보안을 보장하기 위한 "피드백 메커니즘", "성능 모니터링", "보안 검토"의 기술적 구현 방안을 상세히 정의합니다. 기존에 도입된 Sentry, Vercel Analytics, Supabase 기능을 최대한 활용하여 효율적인 시스템을 구축하는 것을 목표로 합니다.

---

## 2. 피드백 메커니즘 (Feedback Mechanisms)

사용자로부터 직접적인 피드백을 수집하고 충돌 보고서를 관리하여 제품을 신속하게 개선합니다.

### 2.1. 기술 스택

- **프론트엔드**: React, shadcn/ui (Dialog, Button, Input, Select), Zod (유효성 검사)
- **백엔드**: Next.js API Route, Supabase (PostgreSQL)
- **충돌 보고**: Sentry

### 2.2. 데이터베이스 스키마

Supabase에 `feedback` 테이블을 신규 생성합니다.

```sql
-- 사용자 피드백 저장 테이블
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 익명 피드백 허용
    email TEXT, -- 사용자가 선택적으로 제공
    category TEXT NOT NULL CHECK (category IN ('bug_report', 'feature_request', 'general_feedback')),
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'wont_fix')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB -- Sentry event ID, user agent, app version 등
);

-- 인덱스 생성
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_category ON feedback(category);
CREATE INDEX idx_feedback_status ON feedback(status);

-- RLS 정책 (관리자만 모든 피드백 조회 가능, 사용자는 본인 피드백만 조회 가능)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access" ON feedback
    FOR ALL USING (is_admin(auth.uid())); -- is_admin() 함수는 별도 정의 필요

CREATE POLICY "Allow users to insert their own feedback" ON feedback
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow users to view their own feedback" ON feedback
    FOR SELECT USING (auth.uid() = user_id);
```

### 2.3. 인앱 피드백 위젯

- **컴포넌트**:
  - `components/feedback/FeedbackButton.tsx`: 화면 우측 하단에 고정된 플로팅 버튼. 클릭 시 피드백 모달을 엽니다.
  - `components/feedback/FeedbackModal.tsx`: `shadcn/Dialog` 기반 모달.
    - **피드백 유형**: `Select` 컴포넌트 (`버그 신고`, `기능 제안`, `일반 피드백`).
    - **내용**: `Textarea` 컴포넌트.
    - **이메일 (선택)**: `Input` 컴포넌트. 로그인 사용자의 경우 자동 채움.
    - **제출 버튼**: 클릭 시 `useMutation`을 통해 API에 데이터를 전송하고 로딩/성공/실패 상태를 `sonner`로 표시.
- **상태 관리**: `react-query`의 `useMutation`을 사용하여 API 호출을 관리하고, UI에 즉각적인 피드백을 제공합니다.

### 2.4. 백엔드 API

- **엔드포인트**: `app/api/feedback/route.ts`
- **기능**:
  1.  `POST` 요청 수신.
  2.  Zod를 사용하여 요청 본문(category, content, email)의 유효성 검사.
  3.  `@supabase/ssr`의 `createServerClient`를 사용하여 인증된 사용자 정보 가져오기.
  4.  Supabase `feedback` 테이블에 데이터 삽입.
  5.  Sentry 이벤트 ID, 앱 버전 등 추가 메타데이터를 `metadata` 필드에 저장.
  6.  성공 또는 실패 응답 반환.

### 2.5. 충돌 보고 (Crash Reporting)

- **Sentry 통합**: `app/global-error.tsx`에서 Sentry의 `captureException`을 호출하여 모든 전역 에러를 자동으로 보고합니다.
- **사용자 피드백 연동**: Sentry는 충돌 발생 시 사용자 피드백을 수집하는 다이얼로그를 제공합니다. 이 피드백이 제출되면 Sentry 대시보드에서 해당 충돌 리포트와 함께 확인할 수 있습니다. `Sentry.showReportDialog()`를 `GlobalError` 컴포넌트에 추가하여 수동으로 리포트할 수 있는 버튼을 제공할 수 있습니다.

---

## 3. 성능 모니터링 (Performance Monitoring)

애플리케이션의 주요 성능 지표를 추적하고, 병목 현상을 식별하며, 사용자 경험을 저하시키는 문제를 사전에 방지합니다.

### 3.1. 기술 스택

- **Real User Monitoring (RUM)**: Vercel Analytics
- **Transaction & Error Monitoring**: Sentry
- **Uptime Monitoring**: 외부 서비스 (예: UptimeRobot)

### 3.2. 포괄적인 모니터링 설정

- **Vercel Analytics**:
  - `@vercel/analytics` 패키지를 `app/layout.tsx`에 통합하여 Core Web Vitals (LCP, FID, CLS) 및 페이지뷰를 자동으로 수집합니다.
  - `track` API를 사용하여 커스텀 이벤트를 추적합니다. (예: `track('note-created')`)
- **Sentry Performance**:
  - `next.config.js`와 `instrumentation.ts`의 Sentry 설정을 통해 트랜잭션 추적을 활성화합니다.
  - **주요 모니터링 트랜잭션**:
    - `app.load`: 페이지 초기 로드 성능.
    - `note.create`, `note.update`, `note.delete`: 핵심 노트 CRUD 작업의 API 및 데이터베이스 응답 시간.
    - `search.unified`: 통합 검색 기능의 성능.
    - `attachment.upload`, `attachment.finalize`: 파일 첨부 및 처리 시간.
  - `Sentry.startSpan`을 사용하여 코드 블록의 성능을 수동으로 측정하고 기존 트랜잭션에 스팬을 추가합니다.

### 3.3. 성능 알림 (Alerts)

- **Sentry Alerts**:
  - **트랜잭션 성능 저하**: 특정 트랜잭션(예: `note.create`)의 p95 응답 시간이 800ms를 초과하면 알림을 설정합니다.
  - **Apdex Score**: 전반적인 사용자 만족도 지표인 Apdex가 0.85 미만으로 떨어지면 알림을 설정합니다.
  - **실패율(Failure Rate)**: 특정 트랜잭션의 실패율이 5%를 초과하면 알림을 설정합니다.
- **Vercel Monitoring**: Vercel의 내장 모니터링 기능을 통해 Core Web Vitals 점수가 "나쁨(Poor)"으로 분류될 경우 알림을 받도록 설정합니다.

### 3.4. 가동 시간 모니터링 (Uptime Monitoring)

- **Health Check Endpoint**: `app/api/health/route.ts`가 이미 존재하며, 데이터베이스 및 인증 서비스의 상태를 반환합니다.
- **외부 모니터링 서비스**: UptimeRobot, Better Uptime과 같은 무료 외부 서비스를 사용하여 5분마다 `/api/health` 엔드포인트에 `HEAD` 요청을 보냅니다.
- **알림**: 엔드포인트가 200 OK 이외의 상태 코드를 반환하거나 응답이 없을 경우, 즉시 이메일 또는 Slack으로 알림을 받도록 설정합니다.

### 3.5. 자동화된 테스트 기반 성능 검증

- **Playwright E2E 테스트**:
  - 기존 E2E 테스트 스위트(`e2e/` 디렉토리)에 성능 측정 로직을 추가합니다.
  - Playwright의 내장 추적 및 `performance.mark()` API를 사용하여 주요 사용자 플로우(예: 로그인 후 첫 노트 생성까지의 시간)의 실행 시간을 측정합니다.
  - 측정된 시간이 설정된 임계값을 초과할 경우 테스트를 실패 처리하여 CI/CD 파이프라인에서 성능 저하를 조기에 발견합니다.

---

## 4. 보안 검토 (Security Review)

OWASP Top 10을 기준으로 애플리케이션의 잠재적 보안 취약점을 검토하고 방어 조치를 설계합니다.

### 4.1. 인증 및 접근 제어 (Authentication & Access Control)

- **인증 흐름 검토**:
  - Supabase Auth의 모든 설정(예: 이메일 확인, 비밀번호 최소 강도)을 검토하고 강화합니다.
  - OAuth 콜백 핸들러(`app/auth/callback/route.ts`)가 `state` 파라미터를 올바르게 검증하여 CSRF 공격을 방지하는지 확인합니다.
- **Row Level Security (RLS)**:
  - `notes`, `note_attachments`, `feedback` 등 모든 사용자 데이터 테이블에 RLS 정책이 활성화되어 있는지 확인합니다.
  - 정책이 "오직 자신의 데이터만 접근 가능(Users can only access their own data)" 원칙을 엄격하게 따르는지 검토합니다.
- **API 키 관리**:
  - `NEXT_PUBLIC_` 접두사가 붙은 환경 변수에는 민감한 정보(API 키, 시크릿)가 포함되지 않도록 합니다.
  - 서버 측 로직에서는 `process.env`를 통해 민감한 키를 사용하고, 클라이언트에는 절대 노출하지 않습니다.

### 4.2. 데이터 보호 (Data Protection)

- **전송 중 암호화**: Vercel 및 Supabase와의 모든 통신은 HTTPS를 통해 이루어지는지 확인합니다. `next.config.js`의 보안 헤더 설정을 유지합니다.
- **입력 값 새니타이제이션 및 유효성 검사**:
  - **XSS (Cross-Site Scripting)**:
    - `markdown-to-jsx` 라이브러리는 React 엘리먼트를 생성하므로 `dangerouslySetInnerHTML`보다 안전합니다. 하지만 사용자 제공 링크(<a> 태그)나 이미지(<img> 태그)의 `href`, `src` 속성에 `javascript:` 스킴이 포함될 수 있는지 검토하고, 필요시 `overrides` 옵션을 사용하여 필터링합니다.
    - 노트 내용을 표시하는 모든 곳에서 텍스트가 올바르게 이스케이프 처리되는지 확인합니다.
  - **API 입력 유효성 검사**: 모든 API 라우트(`app/api/`)의 시작 지점에서 Zod를 사용하여 예상치 못한 데이터나 악의적인 페이로드가 시스템에 들어오지 않도록 스키마 유효성 검사를 강제합니다.

### 4.3. 일반적인 취약점 점검 (OWASP Top 10)

- **SQL Injection**: Supabase 클라이언트 라이브러리(PostgREST)는 파라미터화된 쿼리를 사용하므로 SQL Injection에 대해 기본적으로 안전합니다. 단, `rpc()`를 통해 직접 SQL 함수를 호출할 경우, 함수 내부 로직이 안전하게 작성되었는지 검토합니다.
- **보안 설정 오류 (Security Misconfiguration)**:
  - `next.config.js`의 `headers` 설정을 검토하여 `X-Frame-Options`, `X-Content-Type-Options` 등 보안 헤더가 올바르게 적용되었는지 확인합니다.
  - 프로덕션 빌드에서 디버그 정보나 에러 상세 내용이 노출되지 않는지 확인합니다. (`global-error.tsx`는 이미 `NODE_ENV`에 따라 분기 처리됨)
- **취약하고 오래된 구성 요소 (Vulnerable and Outdated Components)**:
  - `pnpm audit` 또는 `npm audit` 명령을 정기적으로(예: 매주 CI에서) 실행하여 알려진 취약점이 있는 의존성을 식별하고 업데이트합니다.
  - GitHub의 Dependabot을 활성화하여 의존성 보안 업데이트를 자동화합니다.
- **서버 측 요청 위조 (SSRF)**: 현재 기능상 외부 URL을 가져오는 기능은 없으므로 위험이 낮습니다. 향후 사용자 제공 URL을 서버 측에서 `fetch`하는 기능이 추가될 경우, 내부 네트워크나 로컬호스트로의 요청을 차단하는 방어 로직을 반드시 추가해야 합니다.
