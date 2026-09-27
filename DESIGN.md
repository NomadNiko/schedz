# Gift Card Management System - Design Document

## Executive Summary

A web-based gift card management system for restaurants that enables managers to create customizable gift card templates, sell them through an embeddable widget, and manage redemptions through a dedicated console.

## System Overview

### Core Components

1. **Manager Console** (React/Next.js Admin Panel)
2. **Embeddable Widget** (Standalone React component)
3. **REST API** (NestJS Backend)
4. **Database** (MongoDB)
5. **Email Service** (Existing Resend integration)

---

## Data Model

### 1. GiftCardTemplate
```typescript
{
  id: string
  name: string                    // "Holiday Special", "Birthday Card"
  description: string
  imageUrl: string                // S3/local file path
  
  // Code placement on certificate
  codePosition: {
    x: number                     // X coordinate (percentage or pixels)
    y: number                     // Y coordinate (percentage or pixels)
    width: number                 // Width of code area
    height: number                // Height of code area
    fontSize?: number             // Optional font size
    fontColor?: string            // Optional font color (default: black)
    alignment?: 'left' | 'center' | 'right'  // Text alignment
  }
  
  isActive: boolean               // Available for purchase
  createdBy: User                 // Manager who created it
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
```

### 2. GiftCard
```typescript
{
  id: string
  code: string                    // Unique redemption code (e.g., "GC-XXXX-XXXX-XXXX")
  templateId: string              // Reference to GiftCardTemplate
  widgetId?: string               // Reference to Widget used for purchase (tracking)
  
  // Purchase Info
  originalAmount: number          // Initial purchase amount
  currentBalance: number          // Remaining balance
  purchaseDate: Date
  
  // Customer Info
  purchaserEmail: string
  purchaserName: string
  recipientEmail?: string         // Optional if gift for someone else
  recipientName?: string
  
  // Status
  status: 'active' | 'partially_redeemed' | 'fully_redeemed' | 'expired' | 'cancelled'
  
  // Redemption tracking
  redemptions: Redemption[]
  
  // Metadata
  expirationDate?: Date           // Optional expiration
  notes?: string                  // Custom message
  createdAt: Date
  updatedAt: Date
}
```

### 3. Redemption
```typescript
{
  id: string
  giftCardId: string
  amount: number                  // Amount redeemed
  redeemedBy: User                // Manager who processed it
  redeemedAt: Date
  notes?: string                  // Optional notes about redemption
  remainingBalance: number        // Balance after this redemption
}
```

### 4. User (Extended)
```typescript
{
  // Existing fields...
  role: 'admin' | 'manager' | 'user'
  restaurantId?: string           // For multi-restaurant support (future)
}
```

### 5. WidgetConfiguration
```typescript
{
  id: string
  name: string                    // "Main Website Widget", "Partner Restaurant Widget"
  templateId: string              // Specific template for this widget
  apiKey: string                  // Unique public API key for this widget
  allowedDomains: string[]        // CORS whitelist
  
  customization: {
    primaryColor: string
    secondaryColor?: string
    buttonText: string
    logoUrl?: string
    headerText?: string           // Custom header for widget
    footerText?: string           // Custom footer text
  }
  
  isActive: boolean
  createdBy: User                 // Manager who created it
  createdAt: Date
  updatedAt: Date
}
```

---

## API Endpoints

### Gift Card Templates

```
POST   /api/v1/gift-card-templates          Create template (Manager/Admin)
GET    /api/v1/gift-card-templates          List all templates (Manager/Admin)
GET    /api/v1/gift-card-templates/active   List active templates (Public)
GET    /api/v1/gift-card-templates/:id      Get single template
PATCH  /api/v1/gift-card-templates/:id      Update template (Manager/Admin)
DELETE /api/v1/gift-card-templates/:id      Soft delete template (Manager/Admin)
```

### Gift Cards

```
POST   /api/v1/gift-cards                   Purchase gift card (Public/Widget)
GET    /api/v1/gift-cards                   List all gift cards (Manager/Admin)
GET    /api/v1/gift-cards/:id               Get gift card details
GET    /api/v1/gift-cards/code/:code        Lookup by code (Manager/Public)
GET    /api/v1/gift-cards/email/:email      Lookup by email (Public)
PATCH  /api/v1/gift-cards/:id/cancel        Cancel gift card (Admin)
```

### Redemptions

```
POST   /api/v1/gift-cards/:id/redeem        Redeem gift card (Manager/Admin)
GET    /api/v1/gift-cards/:id/redemptions   Get redemption history
GET    /api/v1/redemptions                  List all redemptions (Manager/Admin)
```

### Widget Configuration

```
GET    /api/v1/widgets                      List all widgets (Manager/Admin)
POST   /api/v1/widgets                      Create widget (Manager/Admin)
GET    /api/v1/widgets/:id                  Get widget details
PATCH  /api/v1/widgets/:id                  Update widget (Manager/Admin)
DELETE /api/v1/widgets/:id                  Delete widget (Manager/Admin)
GET    /api/v1/widgets/public/:apiKey       Get widget config by API key (Public)
```

### Analytics/Reports

```
GET    /api/v1/reports/sales                Sales summary
GET    /api/v1/reports/sales/by-widget      Sales by widget (campaign tracking)
GET    /api/v1/reports/sales/by-template    Sales by template
GET    /api/v1/reports/redemptions          Redemption summary
GET    /api/v1/reports/outstanding          Outstanding balance report
```

---

## User Flows

### 1. Manager: Create Gift Card Template

1. Manager logs into console
2. Navigates to "Gift Card Templates"
3. Clicks "Create New Template"
4. Uploads image (drag-drop or file picker)
5. **Image Editor appears with uploaded image**
6. **Manager clicks/drags to select rectangular area for gift card code**
7. **Preview shows sample code in selected position**
8. **Manager can adjust position, size, font size, color, and alignment**
9. Enters name and description
10. Sets active/inactive status
11. Saves template
12. System stores image and code position configuration

### 2. Customer: Purchase Gift Card (Widget)

1. Customer visits restaurant website with embedded widget
2. Widget loads template associated with that specific widget instance
3. Customer views template preview
4. Enters amount (with min/max validation)
5. Enters purchaser info (name, email)
6. Optionally enters recipient info
7. Adds custom message
8. Reviews order
9. Clicks "Purchase" (payment integration placeholder)
10. System generates unique code
11. System creates GiftCard record
12. System generates gift card visual with code overlaid at configured position
13. System sends email with PDF/image of gift card
14. Widget displays success with gift card preview

### 3. Manager: Create Widget for Template

1. Manager logs into console
2. Navigates to "Gift Card Templates"
3. Selects a template
4. Clicks "Create Widget" or navigates to "Widgets" section
5. Enters widget name (e.g., "Main Website", "Partner Event")
6. Selects template for this widget
7. Configures customization:
   - Primary/secondary colors
   - Button text
   - Header/footer text
   - Logo upload (optional)
8. Adds allowed domains (CORS whitelist)
9. Sets active/inactive status
10. Saves widget
11. System generates unique API key
12. System displays embed code snippet for copying
13. Manager copies embed code to use on website(s)

### 4. Manager: Redeem Gift Card

1. Manager logs into console
2. Navigates to "Redeem Gift Card"
3. Enters gift card code or scans QR code
4. System displays gift card details and current balance
5. Manager enters redemption amount
6. Optionally adds notes
7. Confirms redemption
8. System updates balance and creates redemption record
9. System displays updated balance

### 4. Manager: Redeem Gift Card

1. Manager logs into console
2. Navigates to "Redeem Gift Card"
3. Enters gift card code or scans QR code
4. System displays gift card details and current balance
5. Manager enters redemption amount
6. Optionally adds notes
7. Confirms redemption
8. System updates balance and creates redemption record
9. System displays updated balance

### 5. Customer: Check Balance

1. Customer visits balance lookup page (public)
2. Enters gift card code OR email address
3. System displays gift card(s) with current balance
4. Shows redemption history

---

## Frontend Architecture

### Manager Console Routes

```
/admin-panel/gift-cards
  /templates                      List all templates
  /templates/new                  Create new template
  /templates/:id/edit             Edit template
  /templates/:id/widgets          List widgets for template
  
  /widgets                        List all widgets
  /widgets/new                    Create new widget
  /widgets/:id/edit               Edit widget
  /widgets/:id/embed              View embed code
  
  /purchases                      List all purchases
  /purchases/:id                  View purchase details
  
  /redeem                         Redeem gift card interface
  
  /reports                        Analytics dashboard
    /sales                        Sales reports
    /redemptions                  Redemption reports
    /outstanding                  Outstanding balances
```

### Public Routes

```
/gift-cards/balance               Balance lookup page
/gift-cards/view/:code            View gift card (for printing)
```

### Widget (Standalone)

- Embeddable React component
- Loads single template based on widget API key
- Minimal dependencies
- Configurable styling per widget instance
- Communicates with public API endpoints

---

## Technical Implementation Details

### Image Editor for Code Placement

**Component: CodePositionEditor**

```typescript
interface CodePositionEditorProps {
  imageUrl: string;
  initialPosition?: CodePosition;
  onPositionChange: (position: CodePosition) => void;
}

interface CodePosition {
  x: number;        // Percentage (0-100)
  y: number;        // Percentage (0-100)
  width: number;    // Percentage (0-100)
  height: number;   // Percentage (0-100)
  fontSize?: number;
  fontColor?: string;
  alignment?: 'left' | 'center' | 'right';
}
```

**Implementation Approach:**
1. Display uploaded image in canvas/container
2. Overlay draggable/resizable rectangle for code area
3. Show live preview with sample code (e.g., "GC-XXXX-XXXX-XXXX")
4. Store position as percentages for responsive rendering
5. Provide controls for font size, color, and alignment

**Libraries to Consider:**
- `react-rnd` - Draggable and resizable component
- `react-image-crop` - Similar UX to image cropping
- Custom Canvas implementation for precise control

**Preview Mode:**
- Real-time preview showing how code will appear
- Toggle between preview and edit mode
- Sample codes with different lengths to test fit

**User Experience Flow:**
1. Manager uploads template image
2. Image displays in editor with overlay controls
3. Manager drags/resizes rectangle to desired position
4. Live preview shows "GC-XXXX-XXXX-XXXX" in selected area
5. Manager adjusts font size using slider
6. Manager selects font color using color picker
7. Manager chooses alignment (left/center/right)
8. Preview updates in real-time
9. Manager saves template with position data

**Validation:**
- Ensure code area is within image bounds
- Warn if area is too small for typical code length
- Suggest optimal font size based on area dimensions

### Widget Instance Management

**Widget Embed Code Generation:**

```html
<!-- Each widget has unique API key tied to specific template -->
<div id="gift-card-widget-{uniqueId}"></div>
<script src="https://gift-cards.nomadsoft.us/widget.js"></script>
<script>
  GiftCardWidget.init({
    apiKey: 'wgt_xxxxxxxxxxxx',  // Unique per widget
    containerId: 'gift-card-widget-{uniqueId}',
    // Customization loaded from backend via API key
  });
</script>
```

**Widget Loading Flow:**
1. Widget script loads with API key
2. Fetches widget configuration from `/api/v1/widgets/public/:apiKey`
3. Loads associated template
4. Applies customization (colors, text, logo)
5. Renders purchase interface for that specific template

**Benefits of Per-Template Widgets:**
- Different templates on different pages/sites
- Separate tracking per widget/campaign
- Custom branding per partnership
- Independent domain whitelisting
- A/B testing different templates

### Gift Card Code Generation

```typescript
// Format: GC-XXXX-XXXX-XXXX (16 characters + dashes)
// Uses crypto-secure random generation
// Validates uniqueness before saving
function generateGiftCardCode(): string {
  const segments = 3;
  const segmentLength = 4;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars
  
  // Generate segments
  // Check uniqueness in database
  // Return formatted code
}
```

### Gift Card Visual Generation

**Server-side Generation with Code Overlay**

```typescript
interface GenerateGiftCardVisualParams {
  templateImageUrl: string;
  codePosition: CodePosition;
  giftCardCode: string;
  amount: number;
}

// Using Canvas API (Node.js with 'canvas' package) or Puppeteer
async function generateGiftCardVisual(params: GenerateGiftCardVisualParams) {
  // 1. Load template image
  // 2. Create canvas with image dimensions
  // 3. Draw template image
  // 4. Calculate absolute position from percentages
  // 5. Draw code text at specified position with styling
  // 6. Optionally add amount, date, etc.
  // 7. Export as PNG/PDF
  // 8. Return file path or buffer
}
```

**Client-side Preview (Manager Console & Widget)**

```typescript
// React component for live preview
function GiftCardPreview({ template, code, amount }) {
  return (
    <div style={{ position: 'relative' }}>
      <img src={template.imageUrl} alt="Gift Card" />
      <div
        style={{
          position: 'absolute',
          left: `${template.codePosition.x}%`,
          top: `${template.codePosition.y}%`,
          width: `${template.codePosition.width}%`,
          height: `${template.codePosition.height}%`,
          fontSize: template.codePosition.fontSize,
          color: template.codePosition.fontColor,
          textAlign: template.codePosition.alignment,
          display: 'flex',
          alignItems: 'center',
          justifyContent: template.codePosition.alignment,
        }}
      >
        {code}
      </div>
    </div>
  );
}
```

**Recommendation**: 
- Client-side preview for real-time feedback during template creation
- Server-side generation for final gift card (email/download) to ensure consistency

### Email Template

```html
Subject: Your Gift Card - [Restaurant Name]

Body:
- Thank you message
- Gift card visual (embedded image or PDF attachment)
- Gift card code (large, readable)
- Amount
- Balance lookup link
- Expiration info (if applicable)
- Terms and conditions
```

### Widget Embedding

```html
<!-- Restaurant embeds widget for specific template -->
<div id="gift-card-widget-main"></div>
<script src="https://gift-cards.nomadsoft.us/widget.js"></script>
<script>
  GiftCardWidget.init({
    apiKey: 'wgt_abc123xyz',      // Unique widget API key
    containerId: 'gift-card-widget-main'
  });
</script>

<!-- Partner site embeds different widget/template -->
<div id="gift-card-widget-partner"></div>
<script src="https://gift-cards.nomadsoft.us/widget.js"></script>
<script>
  GiftCardWidget.init({
    apiKey: 'wgt_def456uvw',      // Different widget, different template
    containerId: 'gift-card-widget-partner'
  });
</script>
```

**Widget Configuration Loaded via API Key:**
- Template to display
- Color scheme
- Custom text/branding
- Allowed domains (CORS)
- Tracking/analytics ID

### Security Considerations

1. **Widget API Key**: Public key for widget, rate-limited
2. **CORS**: Whitelist allowed domains for widget
3. **Gift Card Codes**: Crypto-secure random generation
4. **Redemption Auth**: Only authenticated managers can redeem
5. **Balance Lookup**: Rate-limited to prevent brute force
6. **Input Validation**: Strict validation on amounts, emails, codes

---

## Database Indexes

```typescript
// GiftCard collection
{
  code: 1,              // Unique index for fast lookup
  purchaserEmail: 1,    // For email-based lookup
  status: 1,            // Filter by status
  purchaseDate: -1      // Sort by date
}

// GiftCardTemplate collection
{
  isActive: 1,          // Filter active templates
  createdAt: -1         // Sort by date
}

// Redemption collection
{
  giftCardId: 1,        // Lookup redemptions for a card
  redeemedAt: -1        // Sort by date
}
```

---

## MVP Feature Scope

### Phase 1: Core Functionality (Current Sprint)

✅ **Must Have**
- Gift card template CRUD (manager console)
- Image upload for templates
- **Interactive code position editor for templates**
- **Widget CRUD with unique API keys**
- **Widget embed code generation and display**
- Gift card purchase flow (no payment)
- Unique code generation
- **Gift card visual with code overlay at configured position**
- Gift card visual display/print
- Email delivery with generated visual
- Redemption interface (full & partial)
- Balance lookup (by code)
- Basic list views (templates, widgets, purchases, redemptions)

❌ **Deferred**
- Payment gateway integration (Stripe/Square)
- QR code scanning
- Multi-restaurant/tenant support
- Advanced analytics/charts
- Gift card expiration automation
- Bulk operations
- Export to CSV/PDF
- Mobile app
- SMS notifications

### Phase 2: Enhancement (Future)
- Payment integration
- Advanced reporting with charts
- QR code generation and scanning
- Gift card expiration handling
- Refund/cancellation workflow
- Email customization
- Widget customization UI

---

## File Structure

### Backend (NestJS)

```
src/
  gift-card-templates/
    domain/
      gift-card-template.ts
    dto/
      create-gift-card-template.dto.ts
      update-gift-card-template.dto.ts
      query-gift-card-template.dto.ts
    infrastructure/
      persistence/
        document/
          gift-card-template.schema.ts
          gift-card-template.repository.ts
    gift-card-templates.controller.ts
    gift-card-templates.service.ts
    gift-card-templates.module.ts
  
  gift-cards/
    domain/
      gift-card.ts
      redemption.ts
    dto/
      create-gift-card.dto.ts
      redeem-gift-card.dto.ts
      query-gift-card.dto.ts
    infrastructure/
      persistence/
        document/
          gift-card.schema.ts
          gift-card.repository.ts
      visual-generator/
        gift-card-visual.service.ts    # Generates images with code overlay
    gift-cards.controller.ts
    gift-cards.service.ts
    gift-cards.module.ts
  
  widgets/
    domain/
      widget.ts
    dto/
      create-widget.dto.ts
      update-widget.dto.ts
      query-widget.dto.ts
    infrastructure/
      persistence/
        document/
          widget.schema.ts
          widget.repository.ts
    widgets.controller.ts
    widgets.service.ts
    widgets.module.ts
  
  reports/
    reports.controller.ts
    reports.service.ts
    reports.module.ts
```

### Frontend (Next.js)

```
src/
  app/
    [language]/
      admin-panel/
        gift-cards/
          templates/
            page.tsx                    # List templates
            new/
              page.tsx                  # Create template
            [id]/
              edit/
                page.tsx                # Edit template
              widgets/
                page.tsx                # List widgets for template
          
          widgets/
            page.tsx                    # List all widgets
            new/
              page.tsx                  # Create widget
            [id]/
              edit/
                page.tsx                # Edit widget
              embed/
                page.tsx                # View embed code
          
          purchases/
            page.tsx                    # List purchases
            [id]/
              page.tsx                  # Purchase details
          redeem/
            page.tsx                    # Redemption interface
          reports/
            page.tsx                    # Reports dashboard
      
      gift-cards/
        balance/
          page.tsx                      # Public balance lookup
        view/
          [code]/
            page.tsx                    # View/print gift card
  
  components/
    gift-cards/
      template-form.tsx
      template-card.tsx
      code-position-editor.tsx          # Interactive code placement editor
      gift-card-visual.tsx              # Renders template with code overlay
      widget-form.tsx
      widget-card.tsx
      widget-embed-code.tsx
      redemption-form.tsx
      balance-lookup.tsx
  
  services/
    api/
      services/
        gift-card-templates.ts
        gift-cards.ts
        widgets.ts
        redemptions.ts
      types/
        gift-card-template.ts
        gift-card.ts
        widget.ts
        redemption.ts
        code-position.ts
  
  widget/
    index.tsx                           # Standalone widget entry
    widget-app.tsx
    widget-styles.css
```

---

## UI/UX Mockup Descriptions

### 1. Template Management Page
- **Header**: "Gift Card Templates" with "Create New" button
- **Grid/List View**: Cards showing template image, name, status badge
- **Actions**: Edit, Delete, Toggle Active
- **Filters**: Active/Inactive, Search by name

### 2. Create/Edit Template Form
- **Image Upload**: Drag-drop zone with preview
- **Code Position Editor**: 
  - Interactive image editor showing uploaded template
  - Draggable/resizable rectangle overlay for code placement
  - Live preview with sample code
  - Controls for font size, color, alignment
  - "Preview" button to see final result
- **Fields**: Name, Description
- **Toggle**: Active/Inactive
- **Preview Panel**: Side-by-side view of template with code overlay
- **Actions**: Save, Cancel

### 3. Widget Management Page
- **Header**: "Widgets" with "Create New Widget" button
- **List View**: Cards showing widget name, template, API key (masked), status
- **Actions**: Edit, View Embed Code, Delete, Toggle Active
- **Filters**: Active/Inactive, By Template

### 4. Create/Edit Widget Form
- **Widget Name**: Input field
- **Template Selection**: Dropdown of available templates with preview
- **Customization Section**:
  - Color pickers (primary, secondary)
  - Text inputs (button text, header, footer)
  - Logo upload (optional)
- **Allowed Domains**: Multi-line input for domain whitelist
- **Toggle**: Active/Inactive
- **Preview**: Live preview of widget appearance
- **Actions**: Save, Cancel

### 5. Widget Embed Code Modal
- **API Key**: Display with copy button
- **Embed Code**: Code snippet with syntax highlighting
- **Copy Button**: One-click copy to clipboard
- **Instructions**: Step-by-step guide for embedding
- **Test Link**: Link to test page showing widget in action

### 6. Purchases List
- **Table Columns**: Code, Template, Amount, Balance, Purchaser, Date, Status
- **Filters**: Date range, Status, Template
- **Search**: By code, email
- **Actions**: View details, Cancel (admin only)

### 7. Redemption Interface
- **Code Input**: Large input field with "Lookup" button
- **Gift Card Display**: Shows template image with code overlay, current balance
- **Redemption Form**: Amount input, Notes textarea
- **Validation**: Cannot exceed current balance
- **History**: List of previous redemptions below
- **Actions**: Redeem, Cancel

### 8. Balance Lookup (Public)
- **Simple Interface**: Code or Email input
- **Results**: List of gift cards with balances
- **Gift Card Card**: Template image with code overlay, code (partially masked), balance
- **Action**: "View Full Details" (shows full code)

### 9. Widget (Embedded)
- **Single Template Display**: Shows template associated with widget
- **Amount Input**: With min/max validation
- **Customer Info Form**: Name, email, optional recipient
- **Custom Message**: Optional text area
- **Review**: Summary with template preview
- **Purchase**: Confirmation (payment placeholder)
- **Success**: Gift card preview with code overlay and download option

---

## Email Templates

### Purchase Confirmation Email

**Subject**: Your [Restaurant Name] Gift Card

**Body**:
```
Hi [Purchaser Name],

Thank you for purchasing a gift card from [Restaurant Name]!

Gift Card Details:
- Code: GC-XXXX-XXXX-XXXX
- Amount: $XX.XX
- Valid Until: [Date or "No Expiration"]

[Gift Card Visual Image]

To check your balance or view your gift card anytime, visit:
[Balance Lookup URL]

Terms & Conditions:
- Gift cards are non-refundable
- Can be used for partial payments
- [Additional terms]

Questions? Contact us at [Contact Email]

Enjoy!
[Restaurant Name]
```

---

## Testing Strategy

### Unit Tests
- Gift card code generation (uniqueness, format)
- Balance calculation after redemptions
- Validation logic (amounts, emails, codes)

### Integration Tests
- Template CRUD operations
- Gift card purchase flow
- Redemption flow with balance updates
- Email sending

### E2E Tests
- Manager creates template and activates it
- Customer purchases gift card through widget
- Manager redeems gift card (partial and full)
- Customer checks balance

---

## Performance Considerations

1. **Image Optimization**: Compress uploaded template images
2. **Caching**: Cache active templates for widget
3. **Pagination**: All list views paginated
4. **Indexes**: Database indexes on frequently queried fields
5. **Rate Limiting**: Widget API endpoints rate-limited
6. **CDN**: Serve widget script and static assets from CDN (future)

---

## Monitoring & Analytics

### Key Metrics
- Total gift cards sold
- Total revenue (when payment integrated)
- Average gift card value
- Redemption rate
- Outstanding balance
- Time to redemption
- Popular templates
- **Widget performance (sales per widget/campaign)**
- **Conversion rate by widget**

### Logging
- All redemptions logged with manager ID
- Failed purchase attempts
- Balance lookup attempts (for fraud detection)

---

## Migration Path

### From Current Boilerplate
1. Keep existing auth system (users, roles)
2. Add "manager" role to existing role enum
3. Extend file upload for template images
4. Create new modules: gift-card-templates, gift-cards, redemptions, widget
5. Update admin panel navigation
6. Create new public routes for widget and balance lookup

---

## Future Enhancements

1. **Multi-Restaurant Support**: Add restaurant entity, scope all data
2. **QR Codes**: Generate QR codes for easy scanning
3. **Mobile App**: Native app for managers to redeem on-the-go
4. **Gift Card Bundles**: Sell multiple cards at discount
5. **Recurring Gift Cards**: Subscription-based gift cards
6. **Integration APIs**: Webhook for POS integration
7. **Advanced Analytics**: Predictive analytics, customer insights
8. **Marketing**: Promotional campaigns, discount codes
9. **White Label**: Allow restaurants to fully brand the system

---

## Timeline Estimate (MVP)

### Week 1: Backend Foundation
- Database schemas (templates with code position, widgets)
- Gift card template CRUD with code position
- Widget CRUD with API key generation
- Gift card purchase endpoint
- Code generation logic

### Week 2: Backend Completion
- Visual generator service (code overlay on templates)
- Redemption logic
- Balance lookup
- Email integration with generated visuals
- Reports endpoints

### Week 3: Manager Console
- Template management UI with code position editor
- Widget management UI
- Widget embed code display
- Purchases list
- Redemption interface

### Week 4: Widget & Polish
- Embeddable widget (loads via API key)
- Public balance lookup
- Gift card visual generation (client & server)
- Testing and bug fixes

**Total: 4 weeks for MVP**

---

## Success Criteria

✅ Manager can create and manage gift card templates with custom code placement  
✅ Manager can create multiple widgets for different templates/campaigns  
✅ Customers can purchase gift cards (without payment)  
✅ Gift cards are emailed with unique codes overlaid on template  
✅ Managers can redeem full or partial amounts  
✅ Customers can check balances  
✅ All transactions are tracked and auditable  
✅ Widgets can be embedded on external websites with unique API keys  
✅ Each widget displays a specific template with custom branding  
✅ System is secure and performant  

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Code collision | High | Crypto-secure generation + uniqueness check |
| Email delivery failure | Medium | Queue system + retry logic |
| Widget CORS issues | Medium | Proper CORS configuration + testing |
| Balance calculation errors | High | Atomic transactions + validation |
| Unauthorized redemptions | High | Strong auth + audit logging |
| Image upload abuse | Medium | File size limits + validation |

---

## Conclusion

This design provides a complete, production-ready gift card management system that meets all stated requirements. The architecture leverages the existing boilerplate infrastructure while adding focused, domain-specific functionality. The phased approach ensures a working MVP can be delivered quickly while leaving room for future enhancements.
