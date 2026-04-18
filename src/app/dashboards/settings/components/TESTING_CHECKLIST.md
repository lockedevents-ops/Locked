# Phase 1 Testing Checklist

## Pre-Test Setup

- [ ] Files created successfully
  - [ ] `common/SecuritySection.tsx`
  - [ ] `common/index.ts`
  - [ ] `shared/ChangePasswordModal.tsx`
  - [ ] Migration docs created

- [ ] Backup current working state
  - [ ] Commit current changes
  - [ ] Create test branch (optional)

## Step 1: Enable New Components

In `index.tsx` (around line 8-10):

```typescript
// Change FROM:
// export { SecuritySection } from './common/SecuritySection';

// Change TO:
export { SecuritySection } from './common/SecuritySection';
```

## Step 2: Disable Old Components

In `index.tsx` (around line 48):

```typescript
// Change FROM:
export function SecuritySection({ user, roleContext, isMobile }: any) {

// Change TO:
// DISABLED FOR TESTING: Use common/SecuritySection.tsx instead
// export function SecuritySection({ user, roleContext, isMobile }: any) {
```

## Step 3: Test Security Section

### Desktop View

- [ ] Navigate to Settings → Security
- [ ] Page loads without errors
- [ ] Section heading displays correctly
- [ ] Password card shows last changed date
- [ ] "Change Password" button visible

**2FA Testing:**
- [ ] 2FA toggle switch renders
- [ ] Click toggle - shows loading state
- [ ] Toast notification appears
- [ ] Status badge updates (Enabled/Disabled)
- [ ] Method displays when enabled

**Login Notifications:**
- [ ] Toggle switch renders
- [ ] Click toggle - shows loading state
- [ ] Toast notification appears
- [ ] Setting persists

**Active Sessions:**
- [ ] Sessions list displays
- [ ] Current session marked
- [ ] "Terminate" button on other sessions
- [ ] Click terminate - shows confirmation
- [ ] Session removed from list

### Mobile View

Resize browser to <768px width:

- [ ] Mobile accordion displays
- [ ] All 4 sections visible (Password, 2FA, Login Notifications, Sessions)
- [ ] Click accordion - section expands
- [ ] Toggle switches work
- [ ] Buttons are tap-friendly
- [ ] Text is readable
- [ ] No layout overflow

### Change Password Modal

- [ ] Click "Change Password" button
- [ ] Modal appears with overlay
- [ ] All 3 input fields render
- [ ] Eye icons toggle password visibility
- [ ] Click eye - password becomes visible
- [ ] Click again - password hidden

**Validation Testing:**
- [ ] Leave fields empty - can't submit
- [ ] Enter mismatched passwords - shows error
- [ ] Enter password < 8 chars - shows error
- [ ] Enter valid passwords - form submits
- [ ] Success toast appears
- [ ] Modal closes automatically

**Modal Controls:**
- [ ] Click X button - modal closes
- [ ] Click "Cancel" - modal closes
- [ ] Click outside modal - modal closes (if implemented)
- [ ] Modal backdrop blurs background

## Step 4: Browser Console Check

Open DevTools (F12):

**Console Tab:**
- [ ] No red errors
- [ ] No yellow warnings
- [ ] No failed network requests

**Network Tab:**
- [ ] Only expected requests
- [ ] No 404 errors
- [ ] Component JS loaded successfully

**Performance:**
- [ ] Page loads quickly
- [ ] No layout shifts
- [ ] Smooth interactions

## Step 5: Cross-Browser Testing

Test in:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Edge

## Step 6: Multi-Role Context

If you have multiple roles (test accounts):

- [ ] Role warning banner displays
- [ ] Shows correct role list
- [ ] Mentions "2FA affects all dashboards"
- [ ] Settings apply across roles

## Step 7: Error Scenarios

**Network Issues:**
- [ ] Disconnect internet
- [ ] Try toggling 2FA
- [ ] Error toast appears
- [ ] Graceful error handling

**Invalid Data:**
- [ ] Provide invalid userId
- [ ] Check error handling
- [ ] No app crash

## Step 8: Final Verification

- [ ] Clear browser cache
- [ ] Refresh page
- [ ] Test all features again
- [ ] Check localStorage for settings
- [ ] Verify persistence across sessions

## Results

### Pass Criteria (All must be true):
- [ ] All functionality works identically to before
- [ ] No console errors
- [ ] Toast notifications appear correctly
- [ ] Mobile layout works perfectly
- [ ] Modal functions properly
- [ ] Performance is equal or better

### If ALL Tests Pass:
✅ **Proceed to extract remaining common components!**

1. Extract NotificationsSection
2. Extract PrivacySection
3. Extract PreferencesSection
4. Test all 4 together

### If ANY Test Fails:
❌ **Stop and debug**

1. Document the specific failure
2. Revert changes (comment exports back)
3. Fix the issue in split files
4. Re-test before proceeding

## Notes Section

**Observations:**
```
[Write any observations here]
```

**Issues Found:**
```
[Document any issues]
```

**Performance Notes:**
```
[Any performance improvements/regressions]
```

---

**Tester**: _____________
**Date**: _____________
**Result**: [ ] PASS / [ ] FAIL
**Time to Complete**: _______ minutes
