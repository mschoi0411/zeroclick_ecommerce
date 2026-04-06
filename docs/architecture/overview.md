# Zero Click Ecommerce Architecture Overview

## Current implementation scope

- Full-stack monorepo scaffold with customer web, admin web, and NestJS API
- Mock-first commerce domain so the product can be built without DB credentials or LLM API keys
- MySQL and LLM integrations intentionally deferred behind ports/interfaces

## Runtime flow

1. Customer UI sends chat/search/order intent to API.
2. API orchestrator classifies intent and routes to commerce domain services.
3. Domain services work against in-memory repositories for now.
4. Chat orchestration calls a mock intent interpreter through an LLM abstraction layer, so a real provider can be plugged in later without changing controllers.
5. API returns structured payloads for recommendations, cart, checkout, shipment, and analytics.
6. Admin UI consumes analytics and operational endpoints.

## Deferred integrations

- Prisma + MySQL persistence layer
- Real LLM tool-calling gateway
- Payment provider adapter
- Shipment/carrier adapter
