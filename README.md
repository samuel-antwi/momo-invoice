# 📱 MoMoInvoice - Fast Invoicing for Ghanaian SMEs

A lightweight, mobile-first invoicing SaaS built specifically for Ghanaian small businesses, freelancers, and traders. Create professional invoices, send via WhatsApp, and get paid instantly with Mobile Money.

## 🎯 Features

### ✅ Currently Implemented (Frontend with Dummy Data)

- **Professional Invoice Creation** - Clean, branded invoice templates
- **Client Management** - Add and manage client information
- **Public Invoice Views** - Shareable invoice links for clients
- **WhatsApp/SMS/Email Sharing** - One-click sharing to multiple channels
- **Paystack Mobile Money Checkout** - Launch hosted payment links for MTN, Vodafone, and AirtelTigo
- **PDF Generation** - Download and preview invoices as PDFs
- **Dashboard Analytics** - Track paid, pending, and overdue invoices
- **User Settings** - Business profile and plan management
- **Responsive Design** - Mobile-first, works on all devices

### 🚧 Coming Soon (Backend Integration)

- **Supabase Authentication** - Secure user management
- **Deeper Paystack Automation** - Auto-settlement reconciliation & retries
- **Automated Reminders** - WhatsApp/SMS payment reminders
- **Plan Restrictions** - Free (5 invoices/month) vs Pro (unlimited)
- **Real-time Payment Updates** - Automatic invoice status updates

## 🛠 Tech Stack

- **Frontend**: Nuxt 3, Vue 3, TypeScript
- **UI**: Nuxt UI, TailwindCSS
- **PDF Generation**: jsPDF
- **State Management**: Vue Composables
- **Storage**: LocalStorage (demo), Supabase (production)
- **Payments**: Paystack aggregation (mobile money + cards)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd momoinvoice

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Demo Usage

1. **Sign Up/Sign In** - Use any email/password (dummy authentication)
2. **Create Invoice** - Add client details, description, and amount
3. **Share Invoice** - Send via WhatsApp, SMS, or email
4. **Collect Payment** - Launch the Paystack checkout flow
5. **Download PDF** - Generate professional PDF invoices

## 📱 User Journey

### For Business Owners

1. **Sign up** with business details
2. **Add clients** with contact information
3. **Create invoices** with professional templates
4. **Share instantly** via WhatsApp (primary channel)
5. **Get paid** through Mobile Money
6. **Track status** on dashboard

### For Clients (Invoice Recipients)

1. **Receive invoice** via WhatsApp/SMS/Email
2. **View invoice** on mobile-optimised page
3. **Pay instantly** through Paystack (MTN, Vodafone, AirtelTigo)
4. **Get confirmation** automatically

## 🏗 Project Structure

```
app/
├── assets/css/          # Global styles
├── composables/         # Vue composables for state management
│   ├── useAuth.ts      # Authentication logic
│   ├── useInvoices.ts  # Invoice management
│   ├── useClients.ts   # Client management
│   ├── useShare.ts     # Sharing functionality
│   └── usePDF.ts       # PDF generation
├── layouts/            # Layout components
├── middleware/         # Route middleware
├── pages/              # Application routes
│   ├── invoices/       # Invoice management
│   ├── clients/        # Client management
│   ├── i/[id].vue      # Public invoice view
│   └── ...
└── components/         # Reusable components (as needed)
```

## 🎨 Design Principles

- **Mobile-First**: Optimised for Ghana's mobile-heavy user base
- **WhatsApp-Centric**: Primary sharing method for local market
- **Simple & Fast**: Minimal clicks from invoice creation to payment
- **Ghanaian Context**: Mobile money via Paystack, GH₵ currency, local UX patterns

## 🔧 Development Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run generate     # Generate static site
```

## 🌍 Deployment

### Frontend (Current State)

- **Vercel** (recommended) - Connect GitHub repo for auto-deployment
- **Netlify** - Alternative static hosting
- **GitHub Pages** - Free option for static deployment

### Full Stack (Future)

- **Frontend**: Vercel/Netlify
- **Backend**: Supabase (Postgres, Auth, Storage)
- **Payments**: Paystack mobile money & card integration

## 📊 Business Model

- **Free Plan**: Up to 5 invoices/month
- **Pro Plan**: GH₵100/month - Unlimited invoices, reminders, advanced branding
- **Target Users**: Freelancers, online sellers, small shop owners, service providers

## 🔐 Environment Variables (Future)

```bash
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Paystack API
PAYSTACK_PUBLIC_KEY=pk_live_xxx
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxx

# Application
APP_URL=https://yourdomain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for Ghana's vibrant SME ecosystem
- Inspired by the mobile money revolution in West Africa
- Designed with feedback from local business owners

---

**Ready to revolutionise invoicing in Ghana? Let's get started! 🚀**
