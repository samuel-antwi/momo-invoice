# MoMoInvoice Product Requirements

## 1. Vision & Value Proposition
- Deliver the fastest, simplest way for Ghanaian small businesses and freelancers to send professional invoices and get paid via Mobile Money within minutes.
- Achieve £500+ monthly recurring revenue by offering an affordable, mobile-first invoicing workflow with locally relevant payment and communication channels.

## 2. Business Goals & Success Metrics
- Launch a self-service MVP that enables onboarding, invoice creation, sharing, and payment tracking without backend dependencies.
- Convert 5% of free users to a paid tier priced to reach £500 MRR within 3 months of launch.
- Median time from invoice creation to share-ready state under 90 seconds on a 3G mobile connection.
- Net Promoter Score (NPS) ≥ 40 with an initial pilot cohort of 20 businesses.

## 3. Target Segments & Personas
**Solo Trader (Ama, 32)**
- Sells beauty products via WhatsApp; needs quick invoices for repeat customers.
- Relies on MTN MoMo; prefers voice notes and short text over long forms.

**Freelance Consultant (Kwame, 28)**
- Provides tech services; tracks multiple clients; needs branded invoices and payment reminders.
- Works from a laptop/tablet but invoices on mobile while commuting.

**Micro-Agency Owner (Esi, 35)**
- Manages small team; needs overview of outstanding invoices and team access in future phases.
- Will pay for automation (reminders, reporting) when value is proven.

## 4. Differentiators
- Mobile-first UX tuned for Ghanaian network speeds and devices.
- Unified Paystack mobile money support (MTN, Vodafone, AirtelTigo) for instant payment capture.
- WhatsApp-first communication workflows (share links, reminders).
- Transparent pricing with low barrier free tier (≤ 5 invoices/month) and affordable pro plan.

## 5. Feature Scope Overview
### Phase 0 – Frontend MVP (current focus)
1. **Onboarding & Business Profile**
   - Capture business name, logo, contact details, currency default (GH₵), and WhatsApp number.
   - Local storage persistence until Supabase is wired in.
2. **Client Management**
   - Add/edit clients with name, phone (WhatsApp), email, business name, and MoMo provider.
   - Search and filter clients.
3. **Invoice Builder**
   - Line items with description, quantity, unit price (GH₵), optional taxes/discounts.
   - Auto-calculated subtotals, totals, and Paystack payment summary.
   - Attach notes, payment terms, and Paystack/mobile money instructions.
   - Branded invoice preview (mobile and desktop).
4. **Invoice Delivery**
   - Generate shareable invoice link (static JSON-backed for now).
   - One-click share actions for WhatsApp (deep link with message template), SMS, email.
   - Download/print to PDF.
5. **Dashboard & Tracking**
   - Overview cards: Paid, Pending, Overdue counts and amounts.
   - List view with status filters, quick actions (share, mark paid, send reminder).
6. **Reminder Automation (Simulated)**
   - Schedule reminder states (e.g., due soon, overdue) using dummy timers/local notifications.
   - Log reminder history per invoice.
7. **Settings & Subscription Stub**
   - Profile settings, business branding, notification preferences.
   - View current plan (Free vs Pro) with upsell messaging.

### Phase 1 – Backend Integration (Supabase + Drizzle)
- Supabase Auth with phone-first OTP and email fallback (magic link/password).
- Multi-tenant database schema for businesses, clients, invoices, payments, reminders.
- Real Paystack transaction logging via webhook relay.
- Background reminder jobs (Edge Functions / Cron).
- Usage quotas and billing logic.

### Phase 2 – Automation & Growth
- Multi-user roles per business account.
- Expense tracking & basic P&L view.
- Advanced analytics (payment time, repeat clients, revenue trend).
- Marketplace integrations (QuickBooks export, bank sync).

## 6. Critical User Journeys
1. **Create & Send Invoice**
   - Onboard → Add client → Create invoice → Preview → Share via WhatsApp → Track status.
2. **Client Payment Flow**
   - Client opens invoice link → Starts Paystack checkout → Completes payment → Sees confirmation.
3. **Reminder Flow**
   - Invoice marked unpaid after due date → Automated reminder template queued → WhatsApp/SMS/email message triggered → Status updates when paid.

## 7. Functional Requirements (Phase 0)
- **Authentication Placeholder**
  - Phone-number-first login with simulated OTP flow and optional email fallback; persist mock session locally.
- **Business Profile & Branding**
  - Logo upload (base64/local preview only).
  - Theme color selection (apply to invoice preview and primary UI accents).
- **Invoice Editor**
  - Form validation for required fields (client, due date, line items, totals).
  - Real-time calculations for tax, discount, grand total, and balance due.
  - Support payment splits (Paystack vs bank transfer instructions).
- **Invoice Viewer**
  - Public-facing page responsive to mobile; includes Pay Now button, summary, and contact options.
  - Status badge (Draft, Sent, Paid, Overdue) with local state toggles.
- **Sharing Layer**
  - Generate share message templates with placeholders (client name, amount, due date).
  - Provide copy-to-clipboard fallback when native share is unavailable.
- **Payment Simulation**
  - Modal that launches Paystack checkout; allow marking invoice as paid.
- **Reminders UI**
  - Configure reminder schedule (e.g., 3 days before due, day of due, 2 days overdue).
  - Display reminder history with channel, timestamp, status (sent, failed).
- **Analytics Dashboard**
  - Charts or summary stats for revenue in the last 30 days, outstanding balance, invoices per client.
  - Highlight invoices that need attention (overdue, expiring soon).
- **Settings**
  - Toggle reminder channels (WhatsApp, SMS, email) – simulated until integrations are live.
  - Manage subscription tier and view usage counts.

## 8. Non-Functional Requirements
- **Performance**: TTFB < 1.5s on 3G, Lighthouse Performance ≥ 85 on mobile.
- **Responsiveness**: Optimized layouts for screens 320px to desktop; bottom navigation on mobile.
- **Accessibility**: WCAG 2.1 AA color contrast, keyboard navigation, screen reader labels.
- **Localization**: Default currency GH₵; support multiple currencies in future by abstracting formatting.
- **Offline Resilience**: Cache last 10 invoices locally; warn users when offline.
- **Security**: Sanitize user inputs; prepare to swap local persistence for Supabase with minimal changes.

## 9. Technical Architecture (Target)
- **Frontend**: Nuxt 4 (SSR disabled for now, static hosting) with TailwindCSS and Nuxt UI (or shadcn-nuxt) for components.
- **State Management**: Vue composables (`use*`) for sessions, invoices, clients; store uses `pinia` if global state complexity grows.
- **Data Layer**: LocalStorage or IndexedDB for MVP; Drizzle ORM models mirroring Supabase schema for parity.
- **Backend (Phase 1)**: Supabase Postgres with RLS; Drizzle migrations; Edge Functions for webhooks/reminders and SMS OTP delivery.
- **Integrations**:
  - WhatsApp deep links (`https://wa.me/<phone>?text=<message>`).
  - SMS (device SMS intent) initially; later connect to Africa's Talking SMS gateway for OTP delivery (simple REST API, Node SDK) — no Twilio dependency.
  - Email via `mailto:` initially; later transactional email API (Resend or SendGrid).
- Paystack aggregation covering MTN, Vodafone, and AirtelTigo mobile money.
- **Deployment**: Vercel for frontend; Supabase managed hosting for backend; CI via GitHub Actions.

## 10. UX & Design Guidelines
- Component library: adopt Nuxt UI with custom theming for Ghanaian color palette (warm yellows, deep greens).
- Typography: Use system fonts for performance; ensure 16px base size.
- Navigation: Tab bar on mobile (Dashboard, Invoices, Clients, Settings); left sidebar on desktop.
- Feedback: Toast notifications for actions (saved, sent, reminder queued).
- Illustrations: Lightweight SVGs; avoid heavy assets.
- Content Tone: Friendly, professional, localized (e.g., "Send via WhatsApp" vs "Share").

## 11. Analytics & Instrumentation (Phase 1+)
- Track funnel: onboarding completion, invoice creation rate, share actions, payment confirmations.
- Monitor payment success rate per Paystack mobile money channel.
- Capture reminder effectiveness (paid within X days of reminder).
- Respect privacy laws; offer opt-in for analytics.

## 12. Roadmap & Milestones
- **Week 0-1**: UI foundations, design system, navigation, business profile setup.
- **Week 2-3**: Invoice builder, client management, share flows, dashboard cards.
- **Week 4**: Reminder scheduling UI, payment simulation, PDF exports.
- **Week 5**: Polish, QA, marketing site landing page, initial pilot onboarding.
- **Week 6-8**: Backend integration kickoff, Supabase schema, auth, real reminders.

## 13. Risks & Mitigations
- **Gateway Dependency**: Relying on Paystack introduces single vendor risk. Mitigation: monitor uptime and keep manual fallback instructions.
- **WhatsApp Automation Limits**: Official API costs; rely on deep links initially, explore WA Business API later.
- **SMS Delivery Costs**: Monitor pricing; integrate with Africa's Talking bulk SMS once backend is live; negotiate local rates.
- **Global SMS Providers**: Twilio deemed too complex/costly for Ghana focus; Africa's Talking chosen for easier integration and Ghana coverage.
- **User Trust**: Provide transparent pricing, clear data handling, and quick support responses.
- **Bandwidth Constraints**: Optimize images, lazy-load heavy components, cache fonts.

## 14. Assumptions
- Users have smartphones with WhatsApp installed and active MoMo accounts.
- Initial pilot can operate without full KYC/AML compliance; revisit when scaling beyond £500 MRR.
- Local taxes (VAT/NHIL) can be manually entered; automate once rules are confirmed.
- Paystack merchant onboarding and MoMo settlement configuration complete within 2-3 weeks once initiated.
- Africa's Talking SMS infrastructure is available and reliable for OTP messaging; email remains a fallback for edge cases.
