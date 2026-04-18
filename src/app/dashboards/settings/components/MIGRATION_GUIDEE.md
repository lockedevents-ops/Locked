# Settings Components Migration Guide

## 📁 New File Structure

```
src/app/dashboards/settings/components/
├── index.tsx                    # ⚠️ OLD: Monolithic file (3,300+ lines) - KEEP FOR NOW
├── MobileAccordion.tsx          # Shared UI components
│
├── common/                      # ✅ NEW: Regular user components (~1,400 lines)
│   ├── index.ts                 # Export file
│   ├── SecuritySection.tsx      # ✅ EXTRACTED
│   ├── NotificationsSection.tsx # TODO
│   ├── PrivacySection.tsx       # TODO
│   └── PreferencesSection.tsx   # TODO
│
├── organizer/                   # ✅ NEW: Organizer-only (~1,700 lines)
│   ├── index.ts                 # Export file with lazy loading
│   ├── OrganizationSection.tsx  # TODO
│   ├── TeamManagementSection.tsx # TODO
│   └── PaymentSettingsSection.tsx # TODO
│
├── venue-owner/                 # ✅ NEW: Venue owner-only (~200 lines)
│   ├── index.ts                 # Export file with lazy loading
│   └── VenueSettingsSection.tsx # TODO
│
└── shared/                      # ✅ NEW: Shared utilities/modals
    ├── index.ts                 # Export file
    ├── ChangePasswordModal.tsx  # ✅ EXTRACTED
    └── AddPaymentMethodModal.tsx # TODO
```

## 🚀 Migration Phases

### ✅ Phase 1: Extract Common Components (TESTING)
**Status**: IN PROGRESS
**Components**: 
- [x] SecuritySection
- [x] ChangePasswordModal
- [ ] NotificationsSection
- [ ] PrivacySection
- [ ] PreferencesSection

**How to Test**:
1. Keep `index.tsx` as is (fallback)
2. Uncomment imports in `index.tsx`:
   ```typescript
   export { SecuritySection } from './common/SecuritySection';
   export { ChangePasswordModal } from './shared/ChangePasswordModal';
   ```
3. Test regular user settings page
4. Verify functionality is identical
5. If working → proceed to Phase 2
6. If broken → revert and fix issues

### Phase 2: Extract Role-Specific Components
**Status**: TODO
**Components**:
- [ ] OrganizationSection (organizer)
- [ ] TeamManagementSection (organizer)
- [ ] PaymentSettingsSection (organizer)
- [ ] VenueSettingsSection (venue-owner)
- [ ] AddPaymentMethodModal (shared)

### Phase 3: Add Code Splitting
**Status**: TODO
**Changes**:
- Add lazy loading to page.tsx
- Implement Suspense boundaries
- Add loading skeletons

### Phase 4: Delete Old Index
**Status**: TODO
**Final Step**:
- Remove old monolithic index.tsx
- Update all imports
- Performance testing

## 📊 Expected Performance Gains

| User Type | Current Bundle | After Split | Savings |
|-----------|---------------|-------------|---------|
| Regular User | ~150KB | ~60KB | **60% reduction** |
| Organizer | ~150KB | ~135KB | **10% reduction** |
| Venue Owner | ~150KB | ~80KB | **47% reduction** |

## 🧪 Testing Checklist

### Phase 1 Testing:
- [ ] Security settings load correctly
- [ ] Change password modal works
- [ ] 2FA toggle functions
- [ ] Login notifications toggle
- [ ] Session termination works
- [ ] Mobile layout renders properly
- [ ] Toast notifications appear
- [ ] No console errors

### Phase 2 Testing:
- [ ] Organizer profile updates
- [ ] Team member management
- [ ] Payment method CRUD
- [ ] Venue settings updates
- [ ] Role-based visibility

### Phase 3 Testing:
- [ ] Lazy loading triggers correctly
- [ ] Loading states appear
- [ ] No layout shifts
- [ ] Performance improved (Lighthouse)

## 🔄 Rollback Plan

If issues occur:
1. Comment out new exports in `index.tsx`
2. Keep using old monolithic file
3. Fix issues in split files
4. Re-test before proceeding

## 💡 Usage Examples

### Current (Old Way):
```typescript
import { SecuritySection } from './components/index';
// Loads all 3,300 lines
```

### After Migration (New Way):
```typescript
// Direct import (always loaded)
import { SecuritySection } from './components/common';

// Lazy import (loaded on demand)
const OrganizationSection = lazy(() => 
  import('./components/organizer/OrganizationSection')
);
```

## 📝 Notes

- **DO NOT DELETE index.tsx yet** - it's the fallback
- Test each phase thoroughly before proceeding
- Keep PR small and focused on one phase
- Document any issues encountered
- Update this guide as you progress

## 🎯 Next Steps

1. ✅ Create file structure
2. ✅ Extract SecuritySection
3. ✅ Extract ChangePasswordModal
4. 🔄 Test Phase 1 (YOU ARE HERE)
5. ⏳ Extract remaining common components
6. ⏳ Extract organizer components
7. ⏳ Extract venue owner components
8. ⏳ Implement code splitting
9. ⏳ Delete old index.tsx

---

**Last Updated**: 2025-11-08
**Migration Progress**: 10% Complete (2/20 components)
