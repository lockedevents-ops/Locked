# Settings Components

This directory contains all settings page components, organized by user role for optimal code splitting and performance.

## 📁 Structure

```
components/
├── index.tsx                    # Main export file (legacy, will be removed)
├── MobileAccordion.tsx          # Shared UI components
├── common/                      # Components for all users
├── organizer/                   # Organizer-specific components
├── venue-owner/                 # Venue owner-specific components
└── shared/                      # Shared utilities and modals
```

## 🚀 Quick Start

### For Testing (Current Phase)

The components are split but still using the old index.tsx as fallback:

```typescript
// Still works (uses old file)
import { SecuritySection } from './components/index';
```

### After Migration Complete

```typescript
// Direct import (common components)
import { SecuritySection } from './components/common';

// Lazy loaded (role-specific)
const OrganizationSection = lazy(() => 
  import('./components/organizer/OrganizationSection')
);
```

## 📊 Performance Benefits

| User Type | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Regular | 150KB | 60KB | 60% smaller |
| Organizer | 150KB | 135KB | 10% smaller |
| Venue Owner | 150KB | 80KB | 47% smaller |

## 🧪 Testing

See `MIGRATION_GUIDE.md` for detailed testing instructions.

### Quick Test:
1. Navigate to settings page
2. Check each section loads
3. Verify all actions work
4. No console errors

## 📝 Notes

- **DO NOT DELETE index.tsx yet** - migration in progress
- Each component is self-contained with its own state
- All components use the custom `useToast` hook
- Mobile/Desktop layouts are handled within each component

## 🔗 Related Files

- `MIGRATION_GUIDE.md` - Detailed migration plan
- `test-migration.ts` - Quick verification script
- `../page.tsx` - Main settings page
