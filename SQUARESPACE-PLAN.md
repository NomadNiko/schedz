# Squarespace Integration Plan

## Overview

Replace the current always-on test polling with a configurable Squarespace integration. Polling only starts when an admin selects Squarespace as the payment gateway in Settings and provides an API key. Orders are matched to "Connected Pay Links" by exact `productName` match. Matched orders generate gift cards automatically.

---

## A. Settings — Squarespace as Payment Gateway

### A1. Settings Domain

**File:** `/var/www/gift-cards-server/src/settings/domain/settings.ts`

- Extend existing `paymentGateway` type from `'stripe' | 'square'` to `'stripe' | 'square' | 'squarespace'`
- Add new fields:
  - `squarespaceApiKey?: string`
  - `squarespacePollingInterval?: number` (seconds, default 30, min 30, max 300)
  - `squarespacePayLinks?: SquarespacePayLink[]`
  - `squarespaceLastPollAt?: Date` (persisted timestamp so polling survives restarts)
- New class `SquarespacePayLink`:
  - `id: string` (generated UUID)
  - `name: string` (internal display name)
  - `productName: string` (exact Squarespace product name to match against `lineItem.productName`)
  - `templateId: string` (which gift card template to use for generation)

### A2. Settings Schema

**File:** `/var/www/gift-cards-server/src/settings/infrastructure/persistence/document/entities/settings.schema.ts`

- Add new `@Schema` class `SquarespacePayLinkSchema` with fields:
  - `@Prop() _id: string`
  - `@Prop({ required: true }) name: string`
  - `@Prop({ required: true }) productName: string`
  - `@Prop({ required: true }) templateId: string`
- Create `SquarespacePayLinkSchemaDefinition` via `SchemaFactory.createForClass()`
- Add to `SettingsSchemaClass`:
  - `@Prop() squarespaceApiKey?: string` (default empty string)
  - `@Prop({ default: 30 }) squarespacePollingInterval?: number`
  - `@Prop({ type: [SquarespacePayLinkSchemaDefinition], default: [] }) squarespacePayLinks`
  - `@Prop() squarespaceLastPollAt?: Date`

### A3. Settings DTO

**File:** `/var/www/gift-cards-server/src/settings/dto/update-settings.dto.ts`

- Add optional validated fields:
  - `@IsOptional() @IsString() squarespaceApiKey?: string`
  - `@IsOptional() @IsNumber() @Min(30) @Max(300) squarespacePollingInterval?: number`
  - `@IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SquarespacePayLinkDto) squarespacePayLinks?: SquarespacePayLinkDto[]`
- New DTO class `SquarespacePayLinkDto`:
  - `@IsOptional() @IsString() id?: string`
  - `@IsString() name: string`
  - `@IsString() productName: string`
  - `@IsString() templateId: string`

### A4. Settings Repository / Mapper

**File:** `/var/www/gift-cards-server/src/settings/infrastructure/persistence/document/repositories/settings.repository.ts`

- In `toDomain`: map `squarespaceApiKey`, `squarespacePollingInterval`, `squarespacePayLinks` (mapping each pay link's `_id` → `id`), `squarespaceLastPollAt`
- The repository's `update` method already does a generic `findOneAndUpdate` — the new fields will flow through automatically as long as the mapper handles them

### A5. Settings Controller

**File:** `/var/www/gift-cards-server/src/settings/settings.controller.ts`

- `GET /settings/public/payment-config` already returns `paymentMode` and `paymentGateway` — no changes needed (no secrets exposed)
- When settings are saved via `PATCH /settings`, if Squarespace fields changed, notify the polling service to restart (see B4)

### A6. Frontend Settings Type

**File:** `/var/www/gift-cards/src/services/api/types/settings.ts`

- Add to `Settings` interface:
  - `squarespaceApiKey?: string`
  - `squarespacePollingInterval?: number`
  - `squarespacePayLinks?: SquarespacePayLink[]`
- New interface `SquarespacePayLink`:
  - `id: string`
  - `name: string`
  - `productName: string`
  - `templateId: string`

### A7. Frontend Settings API Service

**File:** `/var/www/gift-cards/src/services/api/services/settings.ts`

- Include `squarespaceApiKey`, `squarespacePollingInterval`, `squarespacePayLinks` in the update request type

### A8. Frontend Settings Page

**File:** `/var/www/gift-cards/src/app/[language]/admin-panel/gift-cards/settings/page-content.tsx`

Currently when Production mode is selected, there are clickable Stripe/Square gateway cards (Square shows "Coming Soon"). Changes:

- Add **Squarespace** as a third gateway card option (alongside Stripe and Square)
- When Squarespace is selected, show:

  **API Key Section:**
  - `TextField` (password type) for Squarespace API Key
  - Helper text: "Generate this in your Squarespace site under Settings → Advanced → Developer API Keys"

  **Polling Interval Section:**
  - `TextField` (number type) for polling interval in seconds
  - Helper text: "How often to check Squarespace for new orders (30–300 seconds)"
  - Default value: 30

  **Connected Pay Links Section:**
  - `Alert` (severity="info") at the top of this section:
    > "Each pay link product name must be unique and must not be a substring of another. For example, do not create both 'Gift Cards' and 'Buy Gift Cards' — the exact product name from your Squarespace pay link is used for matching."
  - List of existing pay links displayed as `Card` or `Paper` items, each showing:
    - Name (bold)
    - Product Name (monospace)
    - Template Name (looked up from templates list)
    - Edit (icon button) and Delete (icon button)
  - "Add Pay Link" button below the list
  - When adding/editing, show inline form or dialog with:
    - **Name** — `TextField`, label "Display Name", helper "Internal name for this pay link"
    - **Product Name** — `TextField`, label "Squarespace Product Name", helper "The exact product name as it appears in Squarespace"
    - **Template** — `Select` dropdown populated from `GET /gift-card-templates/active`, label "Gift Card Template"
    - Save / Cancel buttons
  - Pay links are managed as local state and saved with the rest of settings on the main Save button

---

## B. Squarespace Polling Service

### B1. Disable Current Test Polling

**File:** `/var/www/gift-cards-server/src/squarespace/squarespace.service.ts`

- Remove the current `onModuleInit` that unconditionally starts polling
- Remove hardcoded `process.env.SQUARESPACE_API_KEY`
- Polling must ONLY start when:
  1. `paymentGateway === 'squarespace'` in Settings
  2. `squarespaceApiKey` is non-empty in Settings
  3. At least one pay link is configured

### B2. Rewrite Squarespace Service

**File:** `/var/www/gift-cards-server/src/squarespace/squarespace.service.ts`

- Inject `SettingsService` and `GiftCardsService`
- On `onModuleInit`: call `this.startPollingIfConfigured()`
- `startPollingIfConfigured()`:
  - Read settings from DB
  - If `paymentGateway !== 'squarespace'` OR no API key OR no pay links → clear any existing interval, return
  - Set `this.apiKey`, `this.payLinks`, `this.pollingInterval` from settings
  - Set `this.lastCheck` from `settings.squarespaceLastPollAt` or `new Date()` if null
  - Start `setInterval` at configured interval
- `restartPolling()`:
  - Clear existing interval if any
  - Call `startPollingIfConfigured()`
  - This is called by the settings save flow
- `poll()`:
  - Fetch orders from Squarespace API using `modifiedAfter` = `lastCheck` and `modifiedBefore` = now
  - For each order:
    - Iterate `order.lineItems`
    - For each line item, check if `lineItem.productName` **exactly equals** any configured pay link's `productName`
    - If match found:
      - Check deduplication: look up existing gift card by `squarespaceOrderId` = `order.id + ':' + lineItem.id` (composite key to handle orders with multiple matching line items)
      - If already exists, skip
      - Otherwise, create gift card:
        - `templateId` = matched pay link's `templateId`
        - `originalAmount` = `parseFloat(lineItem.unitPricePaid.value)` × `lineItem.quantity`
        - `purchaserEmail` = `order.customerEmail`
        - `purchaserName` = `order.billingAddress.firstName + ' ' + order.billingAddress.lastName`
        - `recipientEmail` = same as `purchaserEmail` (no separate recipient in Squarespace flow)
        - `recipientName` = same as `purchaserName`
        - `squarespaceOrderId` = `order.id + ':' + lineItem.id`
        - Call `GiftCardsService.purchase()` with these params
      - Log success: order number, amount, gift card code
  - Update `lastCheck` to now
  - Persist `squarespaceLastPollAt` to Settings DB (so it survives restarts)
- `fetchOrders(after: string, before: string)`:
  - Call `GET https://api.squarespace.com/1.0/commerce/orders?modifiedAfter={after}&modifiedBefore={before}`
  - Headers: `Authorization: Bearer {apiKey}`, `User-Agent: GiftCardServer`
  - Handle pagination if Squarespace returns a `pagination.nextPageCursor`
  - Return array of orders

### B3. Squarespace Module

**File:** `/var/www/gift-cards-server/src/squarespace/squarespace.module.ts`

- Import `SettingsModule` (for `SettingsService`)
- Import `GiftCardsModule` (for `GiftCardsService`)
- Providers: `SquarespaceService`
- Exports: `SquarespaceService`
- Remove `SquarespaceController` (the test webhook endpoint is no longer needed)

### B4. Settings Save → Restart Polling

**File:** `/var/www/gift-cards-server/src/settings/settings.controller.ts` or `settings.service.ts`

- After settings are saved, call `squarespaceService.restartPolling()`
- To avoid circular dependency between `SettingsModule` and `SquarespaceModule`:
  - Option A: Use `@Inject(forwardRef(() => SquarespaceService))` in `SettingsService`
  - Option B: Use NestJS `EventEmitter2` — settings service emits `'settings.updated'` event, squarespace service listens
  - **Recommended: Option B** (cleaner, no circular deps)
  - Install `@nestjs/event-emitter` if not already present
  - In `SettingsService.update()`: emit `'settings.updated'` after save
  - In `SquarespaceService`: `@OnEvent('settings.updated')` handler calls `restartPolling()`

### B5. Delete Squarespace Controller

**File:** `/var/www/gift-cards-server/src/squarespace/squarespace.controller.ts`

- Delete this file entirely — the test webhook endpoint is no longer needed
- Remove from `SquarespaceModule` controllers array

---

## C. Gift Card Domain Changes

### C1. Gift Card Domain

**File:** `/var/www/gift-cards-server/src/gift-cards/domain/gift-card.ts`

- Add `@ApiPropertyOptional() squarespaceOrderId?: string`

### C2. Gift Card Schema

**File:** `/var/www/gift-cards-server/src/gift-cards/infrastructure/persistence/document/entities/gift-card.schema.ts`

- Add `@Prop({ index: true }) squarespaceOrderId?: string`

### C3. Gift Card Mapper

**File:** `/var/www/gift-cards-server/src/gift-cards/infrastructure/persistence/document/mappers/gift-card.mapper.ts`

- Map `squarespaceOrderId` in `toDomain` and `toPersistence`

### C4. Gift Card Repository (Abstract)

**File:** `/var/www/gift-cards-server/src/gift-cards/infrastructure/persistence/gift-card.repository.ts`

- Add `abstract findBySquarespaceOrderId(orderId: string): Promise<NullableType<GiftCard>>`

### C5. Gift Card Repository (Document Implementation)

**File:** `/var/www/gift-cards-server/src/gift-cards/infrastructure/persistence/document/repositories/gift-card.repository.ts`

- Implement `findBySquarespaceOrderId`: query by `{ squarespaceOrderId: orderId }`

### C6. Gift Cards Service

**File:** `/var/www/gift-cards-server/src/gift-cards/gift-cards.service.ts`

- Add optional `squarespaceOrderId?: string` parameter to `purchase()` method (same pattern as existing `stripeSessionId`)
- Set `squarespaceOrderId` on the created gift card when provided
- Add `findBySquarespaceOrderId(orderId: string)` method

---

## D. Clean Up

### D1. Remove .env API Key

**File:** `/var/www/gift-cards-server/.env`

- Remove `SQUARESPACE_API_KEY=...` line entirely
- API key is now stored in Settings DB, managed via the admin UI

### D2. Delete Test Webhook Controller

**File:** `/var/www/gift-cards-server/src/squarespace/squarespace.controller.ts`

- Delete this file (covered in B5)

---

## Execution Order

1. **C** — Gift card domain changes (C1–C6). Foundation with no dependencies.
2. **A1–A5** — Backend settings changes. Adds Squarespace fields to Settings.
3. **B** — Polling service rewrite (B1–B5). Depends on C and A.
4. **A6–A8** — Frontend settings UI. Can be done after backend is ready.
5. **D** — Clean up .env and test controller.

---

## Files Summary

### Backend — Modified
| File | Phase | Change |
|------|-------|--------|
| `src/gift-cards/domain/gift-card.ts` | C | Add `squarespaceOrderId` |
| `src/gift-cards/infrastructure/persistence/document/entities/gift-card.schema.ts` | C | Add `squarespaceOrderId` prop |
| `src/gift-cards/infrastructure/persistence/document/mappers/gift-card.mapper.ts` | C | Map `squarespaceOrderId` both ways |
| `src/gift-cards/infrastructure/persistence/gift-card.repository.ts` | C | Add abstract `findBySquarespaceOrderId` |
| `src/gift-cards/infrastructure/persistence/document/repositories/gift-card.repository.ts` | C | Implement `findBySquarespaceOrderId` |
| `src/gift-cards/gift-cards.service.ts` | C | Add `squarespaceOrderId` to `purchase()`, add lookup method |
| `src/settings/domain/settings.ts` | A | Add Squarespace fields + `SquarespacePayLink` class |
| `src/settings/infrastructure/persistence/document/entities/settings.schema.ts` | A | Add Squarespace schema fields + `SquarespacePayLinkSchema` |
| `src/settings/dto/update-settings.dto.ts` | A | Add Squarespace DTO fields + `SquarespacePayLinkDto` |
| `src/settings/infrastructure/persistence/document/repositories/settings.repository.ts` | A | Map Squarespace fields in `toDomain` |
| `src/settings/settings.controller.ts` or `settings.service.ts` | B | Emit event on settings save |
| `src/squarespace/squarespace.service.ts` | B | Full rewrite — config-driven polling, order processing, gift card creation |
| `src/squarespace/squarespace.module.ts` | B | Import SettingsModule + GiftCardsModule, remove controller |
| `src/app.module.ts` | B | Add EventEmitterModule if using event approach |
| `.env` | D | Remove `SQUARESPACE_API_KEY` |

### Backend — Deleted
| File | Phase | Reason |
|------|-------|--------|
| `src/squarespace/squarespace.controller.ts` | B/D | Test webhook no longer needed |

### Frontend — Modified
| File | Phase | Change |
|------|-------|--------|
| `src/services/api/types/settings.ts` | A | Add Squarespace types |
| `src/services/api/services/settings.ts` | A | Add Squarespace fields to update request |
| `src/app/[language]/admin-panel/gift-cards/settings/page-content.tsx` | A | Squarespace gateway UI with API key, polling interval, connected pay links |

---

## Test Plan

1. **Settings UI**: Select Squarespace gateway, enter API key, set polling interval, add a pay link with product name "Purchase a Gift Certificate" linked to a template. Save.
2. **Verify polling starts**: Check PM2 logs for polling start message.
3. **Make test purchase**: Buy "Purchase a Gift Certificate" on Squarespace.
4. **Verify gift card created**: Check Purchases page for new gift card with correct amount, purchaser info, and template.
5. **Verify deduplication**: Restart server, confirm the same order doesn't create a duplicate gift card.
6. **Verify email sent**: Purchaser should receive gift card email with PDF.
7. **Switch gateway**: Change to Stripe in settings, verify polling stops.
8. **Switch back**: Change to Squarespace, verify polling resumes from last poll timestamp.
