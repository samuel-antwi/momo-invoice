# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MoMoInvoice** is a mobile-first invoicing SaaS application built for Ghanaian small businesses, freelancers, and traders. It enables professional invoice creation, WhatsApp sharing, and Mobile Money payments.

## Development Commands

```bash
npm run dev          # Start development server at http://localhost:3000
npm run build        # Production build
npm run generate     # Generate static site (SSG)
npm run preview      # Preview production build
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run database migrations
```

## Tech Stack & Architecture

### Core Technologies
- **Frontend**: Nuxt 4, Vue 3, TypeScript
- **UI**: Nuxt UI, TailwindCSS
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Supabase Auth
- **Payments**: Paystack (Mobile Money + Cards)
- **PDF**: PDFMake
- **Phone parsing**: libphonenumber-js

### Application Structure
```
app/
├── composables/        # Vue composables for state management
│   ├── useAuth.ts     # Authentication state
│   ├── useInvoices.ts # Invoice management
│   ├── useClients.ts  # Client management
│   └── useSession.ts  # Session handling
├── components/        # Reusable Vue components
├── layouts/          # Layout components (default, public, plain)
├── middleware/       # Route middleware (auth.global.ts)
├── pages/           # File-based routing
│   ├── app/         # Authenticated app pages
│   ├── i/[id].vue   # Public invoice view
│   └── auth/        # Authentication pages

server/
├── api/             # API endpoints
│   ├── invoices/    # Invoice CRUD + PDF generation
│   ├── clients/     # Client management
│   └── public/      # Public APIs (invoice views)
├── db/schema.ts     # Drizzle database schema
└── utils/           # Server utilities
```

### Data Schema
Multi-tenant PostgreSQL with:
- **Businesses** (with Paystack subaccount integration)
- **Clients** (with MoMo provider support)
- **Invoices** (with line items, payments, reminders)
- **Payment Methods** (MoMo providers: MTN, Vodafone, AirtelTigo)

## Development Guidelines

### Code Style
- 2 spaces indentation
- TypeScript throughout
- PascalCase for components
- kebab-case for pages
- Use composables over Options API
- Server-side utilities for business logic

### Patterns
- File-based routing with Nuxt conventions
- Mobile-first responsive design
- Ghanaian market focus (GH₵ currency, MoMo payments)
- Public invoice sharing (WhatsApp, SMS, email)

## Environment Variables

Required for development:
```bash
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=
APP_URL=http://localhost:3000
```

## Key Features

- Professional invoice creation and editing
- Client management with MoMo provider support
- PDF generation with pdfmake
- Public invoice sharing
- Paystack Mobile Money integration
- Dashboard analytics
- Phone number validation for Ghanaian numbers