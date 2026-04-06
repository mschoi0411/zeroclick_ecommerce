# Zero Click Ecommerce

대화형 AI 쇼핑 경험을 목표로 만든 이커머스 프로젝트입니다.  
사용자는 검색창과 필터를 반복해서 조작하는 대신, 자연어 대화로 상품 탐색, 비교, 장바구니, 주문 준비, 배송 조회까지 이어서 수행할 수 있습니다.

## 프로젝트 구성

```text
apps/
  storefront-web/   # 사용자용 웹 (Next.js)
  admin-web/        # 관리자 웹 (Next.js)
  api/              # 백엔드 API (NestJS + Prisma)
  worker/           # 추후 비동기 작업용

packages/
  domain/           # 공통 타입/도메인 모델
  ui/               # 공용 UI 컴포넌트
  db/               # Prisma schema, migration, seed
```

## 기술 스택

- Frontend: Next.js, TypeScript
- Backend: NestJS
- Database: MySQL + Prisma
- AI Layer: env 기반 OpenAI interpreter + mock fallback

---

## 1. 처음 실행하기

루트에서 아래 명령어를 실행합니다.

```bash
npm install
```

---

## 2. DB 연동 방법

이 프로젝트는 MySQL + Prisma 기준으로 동작합니다.

### 2-1. MySQL 준비

예시 기준:

- host: `localhost`
- port: `3306`
- database: `zeroclick`
- user: `root`
- password: `1234`

### 2-2. DB 생성 SQL

MySQL에서 먼저 아래 SQL을 실행합니다.

```sql
CREATE DATABASE zeroclick
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

필요하면 사용자 생성/권한 부여도 따로 진행하면 됩니다.

### 2-3. API 환경변수 파일 만들기

아래 파일을 만듭니다.

```text
apps/api/.env
```

내용 예시:

```env
PORT=4000
MYSQL_URL=mysql://root:1234@localhost:3306/zeroclick
REDIS_URL=redis://localhost:6379
LLM_PROVIDER=openai
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
PAYMENT_PROVIDER_KEY=
```

### 2-4. Prisma 준비

루트에서 아래 순서대로 실행합니다.

```bash
npm run prisma:format --workspace @zeroclick/db
npm run prisma:validate --workspace @zeroclick/db
npm run prisma:generate --workspace @zeroclick/db
```

### 2-5. Prisma migration 실행

```bash
npx prisma migrate dev --name init --schema packages/db/prisma/schema.prisma
```

이 명령을 실행하면 MySQL에 실제 테이블이 생성됩니다.

### 2-6. Seed 데이터 넣기

```bash
npm run seed:db
```

Seed 데이터에는 아래가 포함됩니다.

- 카테고리
- 상품
- 상품 옵션
- 가격
- 재고
- 리뷰
- 장바구니
- 주문
- 채팅 로그 / intent 로그 / recommendation 로그

---

## 3. 실행 명령어

### API 실행

```bash
npm run dev:api
```

기본 주소:

```text
http://localhost:4000
```

### 사용자 웹 실행

```bash
npm run dev:storefront
```

기본 주소:

```text
http://localhost:3000
```

### 관리자 웹 실행

```bash
npm run dev:admin
```

기본적으로 `3000`이 이미 사용 중이면 다른 포트로 뜰 수 있으니 터미널 로그를 확인하면 됩니다.

---

## 4. 전체 빌드 확인

```bash
npm run build
```

---

## 5. LLM 연동 방법

현재 프로젝트는 **OpenAI interpreter + mock fallback** 구조입니다.

### 동작 방식

- `LLM_API_KEY`가 있으면: OpenAI 기반 해석 사용
- `LLM_API_KEY`가 없으면: 기존 mock interpreter 사용
- 키가 있어도 호출 실패/파싱 실패 시: 자동으로 mock fallback

### 필요한 값

`apps/api/.env`에 아래 값을 넣으면 됩니다.

```env
LLM_PROVIDER=openai
LLM_API_KEY=여기에_실제_OpenAI_API_KEY
LLM_MODEL=gpt-4o-mini
```

실제로는 `LLM_API_KEY`만 있어도 동작하도록 구성해 두었습니다.  
`LLM_PROVIDER`를 생략하면 기본값은 `openai`입니다.

---

## 6. 상품 이미지 연결 방법

상품 이미지는 현재 DB `Product.imageUrl` 필드와 연결되어 있습니다.

이미지 파일은 아래 경로에 넣습니다.

```text
apps/storefront-web/public/demo-products/
```

Seed에서 각 상품의 `imageUrl`을 이 경로로 연결하면, API가 그 값을 프론트로 내려주고 storefront에서 표시합니다.

예:

```ts
imageUrl: "/demo-products/airflow-black-hoodie.png"
```

이미지가 없으면 자동으로 아래 fallback을 사용합니다.

```text
/demo-products/fallback.svg
```

---

## 7. 추천 실행 순서

처음 세팅할 때는 보통 아래 순서로 실행하면 됩니다.

```bash
npm install
npm run prisma:format --workspace @zeroclick/db
npm run prisma:validate --workspace @zeroclick/db
npm run prisma:generate --workspace @zeroclick/db
npx prisma migrate dev --name init --schema packages/db/prisma/schema.prisma
npm run seed:db
npm run dev:api
npm run dev:storefront
```

관리자 화면까지 보려면 추가로:

```bash
npm run dev:admin
```

---

## 8. 현재 상태

현재 프로젝트는 다음까지 완료된 상태입니다.

- MySQL + Prisma 연동
- Prisma migration
- Seed 데이터
- 상품 이미지 표시
- 사용자 웹 / 관리자 웹
- API 연동
- OpenAI key 기반 LLM 해석 준비

남은 주된 확장 포인트는 아래입니다.

- 실제 결제/배송 외부 서비스 연동
- 고도화된 LLM tool calling
- 사용자 인증/권한 체계 강화
- 운영 로그/분석 확대
