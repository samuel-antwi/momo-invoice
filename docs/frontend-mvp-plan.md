# Frontend MVP Build Plan (Dummy Data Phase)

## Goals
- Deliver a click-through Nuxt 4 app that mirrors the full MoMoInvoice experience using mocked/local data.
- Lay foundations (layouts, components, composables) so Supabase/Drizzle integration can slot in later with minimal refactor.

## Guiding Principles
- Mobile-first UX; ensure core flows can be executed on 360px viewports.
- Use composables for data access (`useInvoices`, `useClients`, etc.) backed by `localStorage` to simulate persistence.
- Centralize dummy data in `/app/composables/data/` to swap out once backend is ready.

## Implementation Tracks
1. **Design System & Layout**
   - Tailwind config + Nuxt UI theme (Ghana palette).
   - App shell: mobile tab bar + desktop sidebar.
   - Typography, spacing, and reusable atoms (buttons, cards, badges).

2. **Core Data Composables (Mocked)**
   - `useSession` – handles phone/email auth stub, theme color.
   - `useClients` – CRUD on in-memory array persisted to `localStorage`.
   - `useInvoices` – invoice list, status transitions, derived metrics.
   - `useReminders` – schedule templates, history log (client-side timers mocked).

3. **Primary Screens**
   - `/` Dashboard – metrics, charts/cards, attention list.
   - `/invoices` – list/table, filters, quick actions.
   - `/invoices/new` & `/invoices/[id]` – editor + detail view with preview/share.
   - `/clients` – list + client detail drawer.
   - `/settings` – business profile, theme, notification toggles, plan info.
   - `/auth` – phone-first login mock with OTP simulation + email fallback.

4. **Shared Features**
   - Share modals (WhatsApp/SMS/email templates).
   - PDF preview (embed static template first, wire jsPDF later).
   - Paystack checkout handoff (mocked link during dummy phase).
   - Reminder scheduler UI component.

5. **Infrastructure Tasks**
   - Setup ESLint + Prettier (Nuxt defaults) if not already.
   - Create `types/` for shared interfaces (Client, Invoice, LineItem, Reminder).
   - Add `plugins/persisted-storage.ts` to sync composable state with `localStorage`.
   - Seed demo workspace on first load.

## Milestones
- **M1**: Layout + auth stub + session store.
- **M2**: Clients + invoices composables with list screens.
- **M3**: Invoice editor & detail view with share/pay simulation.
- **M4**: Dashboard analytics + reminders UI.
- **M5**: Polish (animations, validation, empty states) + landing walkthrough demo.

## Open Questions
- Final choice between Nuxt UI vs shadcn-nuxt (defaulting to Nuxt UI unless design needs dictate otherwise).
- How deep should PDF preview go before backend integration? (Likely template with dummy data for now.)
- Should we include multi-currency toggle during dummy phase or defer to backend work?

## Next Actions
1. Install and configure Tailwind/Nuxt UI (if not already).
2. Scaffold layout components (`AppShell`, `BottomNav`, `SidebarNav`).
3. Create base types and dummy data composables.
4. Build Dashboard + Invoices list views with mocked data.
