# Gift Card System — Phase 2 Implementation Plan

## Overview

Three features to implement in order:

1. **A — Sandbox/Production data separation** with mode tagging and sandbox data cleanup
2. **B — Archive & Restore** gift cards with soft-delete and recovery
3. **C — Un-redeem** gift cards with full audit trail

---

## A. Sandbox vs Production Data Separation

### Goal

Every gift card is tagged with the mode it was created in (`sandbox` or `production`). The Purchases page automatically filters to show only cards matching the current system mode configured in Settings. Switching from Sandbox to Production in Settings means the Purchases page immediately shows only production cards. Sandbox test data is never mixed with real data.

### Backend Changes

#### 1. Gift Card Domain (`/var/www/gift-cards-server/src/gift-cards/domain/gift-card.ts`)

- Add field: `mode: 'sandbox' | 'production'`
- Add `@ApiProperty({ enum: ['sandbox', 'production'] })` decorator

#### 2. Gift Card Schema (`/var/www/gift-cards-server/src/gift-cards/infrastructure/persistence/document/entities/gift-card.schema.ts`)

- Add `@Prop({ default: 'sandbox', enum: ['sandbox', 'production'], index: true })` for `mode`
- Index on `mode` for efficient filtering

#### 3. Gift Card Mapper (`/var/www/gift-cards-server/src/gift-cards/infrastructure/persistence/document/mappers/gift-card.mapper.ts`)

- Map `mode` in both `toDomain` and `toPersistence`

#### 4. Gift Cards Service (`/var/www/gift-cards-server/src/gift-cards/gift-cards.service.ts`)

- In `purchase()` method: read `paymentMode` from `this.settingsService.get()` and set `mode` on the created gift card
- This applies to all creation paths: widget purchases, Stripe webhook purchases, and admin Generate page

#### 5. Query DTO (`/var/www/gift-cards-server/src/gift-cards/dto/query-gift-card.dto.ts`)

- Add optional `mode?: 'sandbox' | 'production'` filter parameter

#### 6. Gift Card Repository (`/var/www/gift-cards-server/src/gift-cards/infrastructure/persistence/document/repositories/gift-card.repository.ts`)

- In `findManyWithPagination`: add `mode` to the `where` filter when provided

#### 7. Clear Sandbox Data Endpoint

- New endpoint: `POST /gift-cards/archive-sandbox` (admin-only)
- Sets `archived: true` on all gift cards where `mode === 'sandbox'`
- Does NOT hard delete — archives them so they can be restored if needed
- Returns count of archived cards

### Frontend Changes

#### 8. Gift Card Type (`/var/www/gift-cards/src/services/api/types/gift-card.ts`)

- Add `mode: 'sandbox' | 'production'` to the `GiftCard` interface

#### 9. Purchases Page (`/var/www/gift-cards/src/app/[language]/admin-panel/gift-cards/purchases/page-content.tsx`)

- On load, fetch current `paymentMode` from Settings (via existing `useGetSettingsService`)
- Pass `mode` filter to the gift cards list API call
- The page always shows cards matching the current system mode — no mode toggle in the UI
- When in sandbox mode, show a "Clear Sandbox Data" button that calls `POST /gift-cards/archive-sandbox` with a confirmation dialog

#### 10. Gift Cards API Service (`/var/www/gift-cards/src/services/api/services/gift-cards.ts`)

- Add `mode` parameter to `GetGiftCardsRequest`
- Add `useArchiveSandboxDataService` for the clear sandbox endpoint

---

## B. Archive & Restore Gift Cards

### Goal

Gift cards can be archived (soft-deleted) and restored. Archived cards are hidden from the default Purchases view but accessible via a checkbox toggle. This allows cleanup of test data created with sandbox Stripe keys in production mode, and provides a safety net for accidental actions.

### Backend Changes

#### 1. Gift Card Domain (`/var/www/gift-cards-server/src/gift-cards/domain/gift-card.ts`)

- Add field: `archived: boolean` (default `false`)
- Add `@ApiPropertyOptional()` decorator

#### 2. Gift Card Schema (`/var/www/gift-cards-server/src/gift-cards/infrastructure/persistence/document/entities/gift-card.schema.ts`)

- Add `@Prop({ default: false, index: true })` for `archived`

#### 3. Gift Card Mapper (`/var/www/gift-cards-server/src/gift-cards/infrastructure/persistence/document/mappers/gift-card.mapper.ts`)

- Map `archived` in both `toDomain` and `toPersistence`
- Default to `false` if not present (for existing documents)

#### 4. Query DTO (`/var/www/gift-cards-server/src/gift-cards/dto/query-gift-card.dto.ts`)

- Add optional `archived?: boolean` filter parameter (string `'true'`/`'false'` from query params, transformed to boolean)

#### 5. Gift Card Repository (`/var/www/gift-cards-server/src/gift-cards/infrastructure/persistence/document/repositories/gift-card.repository.ts`)

- In `findManyWithPagination`: filter by `archived` field
- When `archived` is not specified in the query, default to `archived: false` (only show live cards)
- When `archived: true` is passed, show only archived cards

#### 6. Archive Endpoint

- `PATCH /gift-cards/:id/archive` (admin-only)
- Sets `archived: true` on the gift card
- Returns the updated gift card

#### 7. Restore Endpoint

- `PATCH /gift-cards/:id/restore` (admin-only)
- Sets `archived: false` on the gift card
- Returns the updated gift card

### Frontend Changes

#### 8. Gift Card Type (`/var/www/gift-cards/src/services/api/types/gift-card.ts`)

- Add `archived: boolean` to the `GiftCard` interface

#### 9. Gift Cards API Service (`/var/www/gift-cards/src/services/api/services/gift-cards.ts`)

- Add `archived` parameter to `GetGiftCardsRequest`
- Add `useArchiveGiftCardService(id)` — calls `PATCH /gift-cards/:id/archive`
- Add `useRestoreGiftCardService(id)` — calls `PATCH /gift-cards/:id/restore`

#### 10. Purchases Page (`/var/www/gift-cards/src/app/[language]/admin-panel/gift-cards/purchases/page-content.tsx`)

- Add a checkbox above the table: "Show Archived"
- When unchecked (default): fetches with `archived=false`, shows live gift cards for current mode
  - Each row gets an **Archive** button (icon or text button)
  - Clicking Archive shows a confirmation dialog, then calls the archive endpoint and refreshes the list
- When checked: fetches with `archived=true`, shows archived gift cards for current mode
  - Each row gets a **Restore** button
  - Clicking Restore calls the restore endpoint and refreshes the list
- The Archive/Restore buttons should be visually distinct (e.g. Archive = outlined/warning, Restore = outlined/success)

---

## C. Un-Redeem Gift Cards

### Goal

Allow admins to reverse a specific redemption on a gift card. The reversed redemption stays in the history for audit purposes but is marked as reversed. The redeemed amount is added back to the card's balance.

### Backend Changes

#### 1. Redemption Domain (`/var/www/gift-cards-server/src/gift-cards/domain/gift-card.ts`)

- Add to `Redemption` class:
  - `reversed?: boolean` (default `undefined`/`false`)
  - `reversedAt?: Date`
  - `reversedBy?: string` (user ID of admin who reversed it)

#### 2. Redemption Schema (`/var/www/gift-cards-server/src/gift-cards/infrastructure/persistence/document/entities/gift-card.schema.ts`)

- Add to `RedemptionSchema`:
  - `@Prop()` for `reversed?: boolean`
  - `@Prop()` for `reversedAt?: Date`
  - `@Prop()` for `reversedBy?: string`

#### 3. Gift Card Mapper (`/var/www/gift-cards-server/src/gift-cards/infrastructure/persistence/document/mappers/gift-card.mapper.ts`)

- Map `reversed`, `reversedAt`, `reversedBy` in both directions for redemptions

#### 4. Un-Redeem DTO (`/var/www/gift-cards-server/src/gift-cards/dto/unredeem-gift-card.dto.ts`)

- New file with:
  - `redemptionId: string` (required)

#### 5. Gift Cards Service (`/var/www/gift-cards-server/src/gift-cards/gift-cards.service.ts`)

- New method: `unredeem(giftCardId: string, redemptionId: string, userId: string)`
  - Find the gift card by ID
  - Find the redemption by `redemptionId` in the `redemptions` array
  - Validate: card exists, redemption exists, redemption is not already reversed
  - Mark the redemption: `reversed: true`, `reversedAt: new Date()`, `reversedBy: userId`
  - Add the redemption amount back to `currentBalance`
  - Update status:
    - If there are other non-reversed redemptions remaining, set status to `partially_redeemed`
    - If all redemptions are now reversed, set status to `active`
  - Save and return the updated gift card

#### 6. Un-Redeem Endpoint (`/var/www/gift-cards-server/src/gift-cards/gift-cards.controller.ts`)

- `POST /gift-cards/:id/unredeem` (admin-only, `AuthGuard('jwt')` + `RolesGuard`)
- Accepts `{ redemptionId: string }` in body
- Calls `this.service.unredeem(id, dto.redemptionId, req.user.id)`

### Frontend Changes

#### 7. Gift Card Type (`/var/www/gift-cards/src/services/api/types/gift-card.ts`)

- Add to `Redemption` interface:
  - `reversed?: boolean`
  - `reversedAt?: string`
  - `reversedBy?: string`

#### 8. Gift Cards API Service (`/var/www/gift-cards/src/services/api/services/gift-cards.ts`)

- Add `useUnredeemGiftCardService(id, { redemptionId })` — calls `POST /gift-cards/:id/unredeem`

#### 9. Redeem Page (`/var/www/gift-cards/src/app/[language]/admin-panel/gift-cards/redeem/page-content.tsx`)

- In the redemption history section (shown after looking up a gift card):
  - Each redemption row that is NOT reversed gets an **Undo** button
  - Each redemption row that IS reversed shows "Reversed" label with the date and is visually struck through or greyed out
  - Clicking Undo shows a confirmation dialog: "Restore £X.XX to this gift card's balance?"
  - After confirming, calls the unredeem endpoint and refreshes the gift card data

---

## Execution Order

1. **Phase A** — Mode tagging (backend + frontend)
2. **Phase B** — Archive/Restore (backend + frontend)
3. **Phase C** — Un-redeem (backend + frontend)

Phases A and B share changes to the same files (gift card domain, schema, mapper, purchases page) so they should be done together or sequentially. Phase C is fully independent.

---

## Files Modified (Summary)

### Backend files touched by all phases:
- `src/gift-cards/domain/gift-card.ts` — A, B, C
- `src/gift-cards/infrastructure/persistence/document/entities/gift-card.schema.ts` — A, B, C
- `src/gift-cards/infrastructure/persistence/document/mappers/gift-card.mapper.ts` — A, B, C
- `src/gift-cards/infrastructure/persistence/document/repositories/gift-card.repository.ts` — A, B
- `src/gift-cards/gift-cards.service.ts` — A, C
- `src/gift-cards/gift-cards.controller.ts` — A, B, C
- `src/gift-cards/dto/query-gift-card.dto.ts` — A, B

### Backend new files:
- `src/gift-cards/dto/unredeem-gift-card.dto.ts` — C

### Frontend files touched by all phases:
- `src/services/api/types/gift-card.ts` — A, B, C
- `src/services/api/services/gift-cards.ts` — A, B, C
- `src/app/[language]/admin-panel/gift-cards/purchases/page-content.tsx` — A, B

### Frontend files touched by single phase:
- `src/app/[language]/admin-panel/gift-cards/redeem/page-content.tsx` — C
