# Gift Card System - Work Log

## TODO List

### Backend (gift-cards-server)

1. [x] **B1**: GiftCardTemplate module (domain, schema, mapper, repository, DTO, controller, service, module)
2. [x] **B2**: GiftCard module (domain, schema, mapper, repository, DTO, controller, service, module)
3. [x] **B3**: Widget module (domain, schema, mapper, repository, DTO, controller, service, module)
4. [x] **B4**: Gift card code generation utility
5. [x] **B5**: Redemption logic (POST redeem endpoint, balance update)
6. [x] **B6**: Public endpoints (balance lookup by code/email, widget config by apiKey, active templates)
7. [x] **B7**: Gift card purchase email template (Handlebars)
8. [x] **B8**: Register new modules in AppModule
9. [x] **B9**: Wire email sending into purchase flow (purchaser + recipient)

### Frontend (gift-cards)

10. [x] **F1**: API types (gift-card-template, gift-card, widget, code-position)
11. [x] **F2**: API services (gift-card-templates, gift-cards, widgets)
12. [x] **F3**: Template list page
13. [x] **F4**: Template create page with code position editor
14. [x] **F5**: Template edit page with code position editor
15. [x] **F6**: Widget list page (with embed code dialog)
16. [x] **F7**: Widget create page
17. [x] **F8**: Widget demo & test purchase page (with embed instructions)
18. [x] **F9**: Purchases list page
19. [x] **F10**: Redemption interface page
20. [x] **F11**: Public balance lookup page
21. [x] **F12**: Gift card view/print page
22. [x] **F13**: Navigation bar updates (Templates, Purchases, Redeem, Widgets for admin; Check Balance for all)

---

## Session 2 - 2026-03-05 (continued)

### What was done:

**Backend:**
- Wired MailService into GiftCardsService.purchase() — sends email to purchaser, and separately to recipient if different email provided
- Emails are fire-and-forget (catch errors silently so purchase still succeeds)

**Frontend — new pages:**
- `/admin-panel/gift-cards/templates/[id]/edit` — full edit page with image replacement, code position editor, all fields pre-populated from API
- `/admin-panel/gift-cards/widgets/[id]/demo` — full widget demo page with:
  - Left side: live widget simulation (4-step stepper: Amount → Details → Review → Success)
  - Preset amount buttons ($25, $50, $75, $100, $150, $200) + custom amount
  - Purchaser/recipient info forms
  - Real purchase flow that creates gift cards in the database and sends emails
  - Success screen with code display + link to view/print page
  - Right side: embed instructions with copyable code snippet, widget details, step-by-step guide

**Frontend — navigation:**
- Added "Check Balance" link to public nav (both mobile menu and desktop toolbar)
- Added "Demo & Test" button to each widget card in the widgets list

### Build & Deploy:
- Both apps compile clean
- Both services restarted via pm2
- All API endpoints verified live via Swagger docs
- Active templates endpoint returns [] (correct — no data yet)

---

## Remaining Work

- Embeddable widget standalone JS build (separate entry point for external sites)
- Reports/analytics dashboard
- Payment gateway integration (Stripe/Square) — deferred
