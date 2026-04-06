# Local development

## 1. Install dependencies

```bash
npm install
```

## 2. Optional local infra

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

At the moment the app uses mock-first commerce services behind a repository boundary, so MySQL/Redis are prepared but not required to boot the UI/API.

## 3. Run apps

```bash
npm run dev:api
npm run dev:storefront
npm run dev:admin
```

## 4. LLM setup

Create `apps/api/.env` with values like:

```bash
PORT=4000
MYSQL_URL=mysql://root:1234@localhost:3306/zeroclick
REDIS_URL=redis://localhost:6379
LLM_PROVIDER=openai
LLM_API_KEY=your_openai_key_here
LLM_MODEL=gpt-4o-mini
PAYMENT_PROVIDER_KEY=
```

- If `LLM_API_KEY` is present, the API uses the OpenAI-backed intent interpreter.
- If `LLM_API_KEY` is missing or invalid, the API automatically falls back to the current mock interpreter.

## 5. Current deferred integrations

- Prisma schema is scaffolded in `packages/db/prisma/schema.prisma`
- MySQL persistence wiring in API repository implementation
- Payment provider credentials

## 6. Prisma workflow (after DB is ready)

```bash
npm run prisma:format --workspace @zeroclick/db
npm run prisma:validate --workspace @zeroclick/db
npm run prisma:generate --workspace @zeroclick/db
```

Once MySQL is connected, replace `MockCommerceRepository` with a Prisma-backed implementation while keeping the `CommerceRepository` interface intact.

## 7. Seed demo data

```bash
npm run seed:db
```

Seed data includes categories, products, variants, prices, inventory, reviews, one active cart, one placed order, and analytics-friendly chat logs.

Images are intentionally left as placeholders for now. The API maps missing product images to `/demo-products/fallback.svg` until real assets are provided.
