# Locked - Project Specification

## Overview

**Locked** is a full-stack event ticketing platform built with Next.js 16, featuring events, ticketing, voting, merchandise sales, and venue management.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, Radix UI
- **Auth & Database**: Supabase (SSR, Admin)
- **State Management**: Zustand, React Query
- **Validation**: Zod
- **Payments**: Hubtel
- **Email**: Resend
- **Maps**: Mapbox GL

## User Roles

1. **User** - Browse events, register, vote, purchase merch
2. **Organizer** - Create events, manage venues, view analytics
3. **Admin** - Full platform management, user moderation

## Core Features

### Events
- Event discovery (homepage, discover page)
- Featured, trending, upcoming event sections
- Category-based filtering
- Event details with gallery, map, registration
- QR code ticketing
- Event voting system

### Registration & Ticketing
- Event registration with forms
- QR code generation
- Check-in with keys
- Registration success & ticket view

### Merchandise
- Product catalog
- Cart system
- Checkout flow

### Venues
- Venue management (organizer)
- Venue analytics
- Add venue (admin)

### Payments
- Hubtel integration (initiate, webhook, payout)
- Checkout modal with cart

### Organizer Dashboard
- Event management (create, edit, draft)
- Analytics
- Finances & payouts
- Keys generation & purchase
- Premium features

### Admin Dashboard
- User management
- Role requests
- Event moderation
- System metrics
- Activity log
- Communications

### Gamification
- **Keys** - Platform currency earned through engagement
- **Locks** - Achievement/scuffins system

### Security
- 2FA (email-based)
- Role-based permissions
- Session management
- Audit logging

### Other
- Notifications system
- Homepage personalization
- Help chat

## Project Structure

```
src/
├── app/
│   ├── (routes)           # Main app pages
│   │   ├── admin/        # Admin dashboard
│   │   ├── api/         # API routes
│   │   ├── auth/        # Auth pages
│   │   ├── dashboards/ # User dashboards
│   │   └── checkout/   # Checkout
│   └── page.tsx         # Homepage
├── components/          # React components
│   ├── events/
│   ├── layouts/
│   ├── forms/
│   ├── dashboards/
│   └── ...
├── lib/                 # Utilities
│   ├── supabase/        # DB clients
│   ├── dal.ts           # Data access layer
│   └── ...
├── hooks/               # Custom hooks
└── actions/            # Server actions
```

## Key Dependencies

- next: ^16.1.6
- react: ^19.2.4
- @supabase/ssr: ^0.9.0
- @tanstack/react-query: ^5.83.0
- zustand: ^5.0.7
- zod: ^4.1.5
- tailwindcss: ^4.2.1
- framer-motion: ^12.23.6

## Code Conventions

- TypeScript strict mode
- ESLint with Next.js config
- Zod schemas for validation
- Server components by default
- Client components where needed
- Radix UI for accessible components
- Tailwind CSS with cva for variants

## Notes

- Feature flag: Venues surface intentionally frozen
- Uses Hubtel for Ghana payments
- Dynamic imports for below-fold components
- Session management to prevent expiration
- Optimized event fetching with caching