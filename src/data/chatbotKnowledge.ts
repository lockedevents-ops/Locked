/**
 * Chatbot Knowledge Base
 * ----------------------
 * Comprehensive FAQ, rules, how-to guides, and knowledge base for the Locked platform chatbot.
 * This provides context-based responses instead of hardcoded replies.
 */

export interface KnowledgeEntry {
  id: string;
  category: string;
  subcategory?: string;
  question: string;
  answer: string;
  keywords: string[];
  relatedTopics?: string[];
  priority?: number; // Higher = more relevant
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

// Knowledge Categories
export const knowledgeCategories: KnowledgeCategory[] = [
  {
    id: 'account',
    name: 'Account & Profile',
    description: 'Account management, profile settings, and security'
  },
  {
    id: 'events',
    name: 'Events & Tickets',
    description: 'Finding, booking, and managing event tickets'
  },
  {
    id: 'organizers',
    name: 'Event Organizers',
    description: 'Creating and managing events as an organizer'
  },
  {
    id: 'voting',
    name: 'Voting & Contests',
    description: 'How voting works in competitions and events'
  },
  {
    id: 'keys',
    name: 'KEYS System',
    description: 'Understanding and using KEYS for voting'
  },
  {
    id: 'payments',
    name: 'Payments & Refunds',
    description: 'Payment methods, refunds, and billing'
  },
  {
    id: 'venues',
    name: 'Venues',
    description: 'Venue information and booking'
  },
  {
    id: 'security',
    name: 'Security & Privacy',
    description: 'Account security, 2FA, and data privacy'
  },
  {
    id: 'general',
    name: 'General',
    description: 'General platform information and support'
  }
];

// Comprehensive Knowledge Base
export const knowledgeBase: KnowledgeEntry[] = [
  // ==========================================
  // ACCOUNT & PROFILE
  // ==========================================
  {
    id: 'account-create',
    category: 'account',
    question: 'How do I create an account?',
    answer: `Creating an account on Locked is easy:

1. Click "Sign Up" on the homepage
2. Enter your email address and create a password
3. Verify your email by clicking the link we send you
4. Complete your profile with your name and optional photo

You can also sign up using Google or other social providers for faster registration.`,
    keywords: ['create account', 'sign up', 'register', 'new account', 'join'],
    relatedTopics: ['account-verify', 'account-profile'],
    priority: 10
  },
  {
    id: 'account-login',
    category: 'account',
    question: 'How do I log in to my account?',
    answer: `To log in to your Locked account:

1. Click "Sign In" on the homepage
2. Enter your email and password
3. If you have 2FA enabled, enter your verification code
4. Click "Sign In"

Forgot your password? Click "Forgot Password" to reset it via email.`,
    keywords: ['login', 'sign in', 'log in', 'access account', 'cant login'],
    relatedTopics: ['account-password-reset', 'account-2fa'],
    priority: 10
  },
  {
    id: 'account-password-reset',
    category: 'account',
    question: 'How do I reset my password?',
    answer: `To reset your password:

1. Go to the Sign In page
2. Click "Forgot Password"
3. Enter your email address
4. Check your email for a reset link (check spam folder too)
5. Click the link and create a new password

The reset link expires after 24 hours. If you didn't receive the email, try requesting another one or contact lockedeventsgh@gmail.com.`,
    keywords: ['reset password', 'forgot password', 'change password', 'lost password', 'password recovery'],
    relatedTopics: ['account-login', 'account-security'],
    priority: 10
  },
  {
    id: 'account-profile',
    category: 'account',
    question: 'How do I update my profile?',
    answer: `To update your profile:

1. Click your avatar/profile icon in the top right
2. Go to "Settings" or "Edit Profile"
3. Update your name, photo, bio, or other details
4. Click "Save Changes"

You can add a profile photo, bio, and social links to personalize your profile.`,
    keywords: ['update profile', 'edit profile', 'change name', 'profile picture', 'avatar', 'bio'],
    relatedTopics: ['account-create', 'account-settings'],
    priority: 8
  },
  {
    id: 'account-delete',
    category: 'account',
    question: 'How do I delete my account?',
    answer: `To delete your account:

1. Go to Settings → Security & Privacy
2. Scroll to "Danger Zone" or "Delete Account"
3. Click "Delete Account"
4. Type "DELETE ACCOUNT" to confirm
5. Your account will be scheduled for deletion

**Important:** Your account enters a 30-day recovery period before permanent deletion. During this time, you can contact lockedeventsgh@gmail.com to recover your account.

If you have organizer or venue owner roles, associated data (events, venues) will also be deleted.`,
    keywords: ['delete account', 'remove account', 'close account', 'deactivate', 'cancel account'],
    relatedTopics: ['account-recovery', 'data-export'],
    priority: 8
  },
  {
    id: 'account-recovery',
    category: 'account',
    question: 'Can I recover a deleted account?',
    answer: `Yes, you can recover a deleted account within 30 days!

When you delete your account, it enters a 30-day recovery period. During this time:

1. Your account is soft-deleted (not permanently removed)
2. You won't be able to log in
3. Your data is preserved

**To recover your account:**
- Email lockedeventsgh@gmail.com with your account email
- Our team will verify your identity
- Your account will be restored

After 30 days, accounts are permanently deleted and cannot be recovered.`,
    keywords: ['recover account', 'restore account', 'undelete', 'get account back', 'deleted by mistake'],
    relatedTopics: ['account-delete', 'contact-support'],
    priority: 9
  },
  {
    id: 'account-2fa',
    category: 'account',
    subcategory: 'security',
    question: 'How do I set up two-factor authentication (2FA)?',
    answer: `Two-factor authentication adds extra security to your account:

**To enable 2FA:**
1. Go to Settings → Security
2. Find "Two-Factor Authentication"
3. Click "Enable 2FA"
4. Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.)
5. Enter the 6-digit code to verify
6. Save your backup codes somewhere safe!

**To disable 2FA:**
1. Go to Settings → Security
2. Click "Disable 2FA"
3. Enter your authenticator code to confirm

We recommend keeping 2FA enabled for account security.`,
    keywords: ['2fa', 'two factor', 'authenticator', 'security code', 'mfa', 'verification'],
    relatedTopics: ['account-security', 'account-login'],
    priority: 9
  },
  {
    id: 'account-verify',
    category: 'account',
    question: 'How do I verify my email?',
    answer: `Email verification is required to access all features:

1. Check your inbox for an email from Locked
2. Click the verification link in the email
3. If you can't find it, check your spam/junk folder
4. The link expires after 24 hours

**Didn't receive the email?**
- Go to Settings → Account
- Click "Resend Verification Email"
- Or contact lockedeventsgh@gmail.com`,
    keywords: ['verify email', 'email verification', 'confirm email', 'verification link', 'didnt receive email'],
    relatedTopics: ['account-create', 'contact-support'],
    priority: 8
  },

  // ==========================================
  // EVENTS & TICKETS
  // ==========================================
  {
    id: 'events-find',
    category: 'events',
    question: 'How do I find events?',
    answer: `There are several ways to discover events on Locked:

1. **Homepage:** Browse featured, trending, and upcoming events
2. **Search:** Use the search bar to find specific events or keywords
3. **Discover Page:** Filter by category, date, location, and price
4. **Categories:** Browse events by type (Music, Sports, Arts, etc.)

**Filters available:**
- Location (city, country)
- Date range
- Price (free, paid)
- Category
- Event type (physical, online, hybrid)`,
    keywords: ['find events', 'search events', 'browse events', 'discover', 'explore', 'upcoming events'],
    relatedTopics: ['events-book', 'events-lock'],
    priority: 10
  },
  {
    id: 'events-book',
    category: 'events',
    question: 'How do I book tickets for an event?',
    answer: `To book tickets for an event:

1. Find an event you want to attend
2. Click on the event to view details
3. Select your ticket type and quantity
4. Click "Get Tickets" or "Book Now"
5. Review your order and enter payment details
6. Confirm your purchase

**After booking:**
- You'll receive a confirmation email with your tickets
- Tickets are also available in your account under "My Tickets"
- Some events have QR codes for entry

**Payment methods:** Mobile Money (MTN, Vodafone, AirtelTigo), Cards, and more.`,
    keywords: ['book tickets', 'buy tickets', 'purchase tickets', 'get tickets', 'how to book', 'ticket purchase'],
    relatedTopics: ['events-find', 'payments-methods', 'tickets-view'],
    priority: 10
  },
  {
    id: 'events-free',
    category: 'events',
    question: 'How do I find free events?',
    answer: `To find free events on Locked:

1. Go to the Discover page
2. Use the price filter and select "Free"
3. Browse the results

Free events include:
- Community gatherings
- Free concerts and performances
- Educational workshops
- Networking events
- And more!

You still need to "register" for free events to get your ticket.`,
    keywords: ['free events', 'free tickets', 'no cost', 'free admission', 'complimentary'],
    relatedTopics: ['events-find', 'events-book'],
    priority: 9
  },
  {
    id: 'events-lock',
    category: 'events',
    question: 'What does "Lock" an event mean?',
    answer: `"Locking" an event is like bookmarking it for later:

**How it works:**
- Click the lock icon on any event card
- The event is saved to your "Locked Events" list
- Access your locked events from your dashboard

**Benefits:**
- Quick access to events you're interested in
- Get reminders before events start
- Compare events before buying tickets
- Never forget about events you want to attend

Locking is free and doesn't require purchasing tickets.`,
    keywords: ['lock event', 'save event', 'bookmark', 'locked events', 'favorites', 'wishlist'],
    relatedTopics: ['events-find', 'events-book'],
    priority: 8
  },
  {
    id: 'tickets-view',
    category: 'events',
    question: 'Where can I find my tickets?',
    answer: `To view your purchased tickets:

1. Log in to your account
2. Go to your Dashboard
3. Click "My Tickets" or "Purchased Tickets"

Each ticket shows:
- Event name and date
- Ticket type and quantity
- QR code (if applicable)
- Venue/location details

**Options:**
- Download tickets as PDF
- Share tickets via email
- Add to calendar`,
    keywords: ['my tickets', 'view tickets', 'find tickets', 'ticket history', 'purchased tickets', 'where are my tickets'],
    relatedTopics: ['events-book', 'tickets-transfer'],
    priority: 9
  },
  {
    id: 'tickets-check-order',
    category: 'events',
    subcategory: 'payments',
    question: 'How do I check my order status?',
    answer: `To check the status of your order or ticket:

**Option 1: Dashboard**
1. Log in to your account
2. Go to "My Tickets" or "Orders"
3. Find your order in the list
4. View the current status

**Order statuses:**
- **Pending:** Payment being processed
- **Processing:** Order being prepared
- **Completed:** Order confirmed, ticket ready
- **Failed:** Payment failed, contact support
- **Refunded:** Refund processed

**Ticket statuses:**
- **Registered:** You're all set for the event
- **Checked In:** You attended the event
- **Cancelled:** Ticket cancelled
- **Refunded:** Refund completed

**If you can't find your order:**
- Search by event name
- Search by order number
- Contact lockedeventsgh@gmail.com with order details

Payment confirmations are sent via email after purchase.`,
    keywords: ['check order', 'order status', 'ticket status', 'is my payment confirmed', 'order confirmation', 'check ticket'],
    relatedTopics: ['tickets-view', 'payments-methods', 'contact-support'],
    priority: 10
  },
  {
    id: 'tickets-payment-confirm',
    category: 'events',
    subcategory: 'payments',
    question: 'Is my payment confirmed?',
    answer: `To check if your payment is confirmed:

**Immediate verification:**
- You'll receive a confirmation email after payment
- Check your email inbox and spam folder
- The order status will show as "Completed" in your dashboard

**Payment confirmation timeline:**
- Instant: Debit/credit card payments
- 1-5 minutes: Mobile Money payments
- Same day: Bank transfers (usually)

**Payment methods confirmed by:**
- **Debit/Credit Card:** Immediate
- **Mobile Money:** 1-5 minutes
- **Bank Transfer:** Within 24 hours

**If your payment isn't confirmed:**
1. Check email for confirmation message
2. Go to "My Orders" and verify status
3. Refresh the page if status hasn't updated
4. Wait 5-10 minutes for processing
5. If still pending, contact support

Most payment issues resolve within minutes. For persistent problems, email lockedeventsgh@gmail.com with your order number.`,
    keywords: ['payment confirmed', 'confirm payment', 'payment status', 'is my payment processed', 'payment pending', 'payment successful'],
    relatedTopics: ['payments-methods', 'payments-issues', 'tickets-check-order'],
    priority: 10
  },
  {
    id: 'tickets-view',
    category: 'events',
    subcategory: 'tickets',
    question: 'Where can I find my tickets?',
    answer: `To find and view your tickets:

**In your dashboard:**
1. Log in to your account
2. Go to "My Tickets" or "Dashboard"
3. View all your registered tickets
4. Click on a ticket to see details

**Ticket information available:**
- Event name and date
- Ticket type (General, VIP, etc.)
- Quantity purchased
- QR code (for check-in)
- Price paid
- Status (Registered, Checked In, etc.)

**Upcoming vs Past tickets:**
- **Upcoming:** Events haven't started yet
- **Past:** Events already happened

**Download or share tickets:**
- Email your QR code
- Screenshot your ticket
- Show digital QR code at entry

**Can't find a ticket?**
- Search by event name
- Check your email for confirmation
- Check all your email accounts
- Contact support if purchase isn't showing

Your tickets are saved permanently in your account!`,
    keywords: ['find tickets', 'view tickets', 'my tickets', 'ticket history', 'where are my tickets', 'download ticket', 'ticket qr code'],
    relatedTopics: ['tickets-check-order', 'tickets-refund'],
    priority: 9
  },
  {
    id: 'tickets-when-expire',
    category: 'events',
    subcategory: 'tickets',
    question: 'When does my ticket expire?',
    answer: `Ticket expiration depends on the event:

**Most tickets:**
- Tickets are valid until the event ends
- After the event, tickets expire
- You can still view past tickets in your history

**Non-expiring tickets:**
- Membership passes (if applicable)
- Season tickets
- Passes purchased as bundles

**How to check expiration:**
1. Go to "My Tickets"
2. Look for the event date
3. Tickets valid until: [Event End Date]
4. After that date, they become "past events"

**What happens after expiration:**
- You can't use the ticket anymore
- It moves to your "Past Tickets" list
- You can view it for your records
- QR code becomes inactive

**Extending your stay:**
- Some events have multiple dates
- Purchase another ticket for upcoming dates
- Check if season passes are available

**Questions about specific event?**
Contact the organizer or lockedeventsgh@gmail.com`,
    keywords: ['ticket expire', 'when expire', 'ticket expiration', 'ticket valid until', 'expired ticket', 'ticket validity'],
    relatedTopics: ['tickets-view', 'tickets-check-order'],
    priority: 8
  },

  // ==========================================
  // PAYMENTS & REFUNDS
  // ==========================================
  {
    id: 'tickets-refund',
    category: 'events',
    subcategory: 'payments',
    question: 'Can I get a refund for my tickets?',
    answer: `Refund policies vary by event and organizer:

**General guidelines:**
- Check the event's refund policy before purchasing
- Most refunds are only available before the event
- Some organizers offer full refunds, partial refunds, or no refunds

**To request a refund:**
1. Go to "My Tickets" in your dashboard
2. Select the ticket(s) you want refunded
3. Click "Request Refund" (if available)
4. Follow the instructions

**If refunds aren't available online:**
Contact the event organizer directly or email lockedeventsgh@gmail.com for assistance.

Refunds typically take 5-10 business days to process.`,
    keywords: ['refund', 'get refund', 'money back', 'cancel ticket', 'return ticket', 'refund policy'],
    relatedTopics: ['tickets-view', 'contact-support', 'payments-issues'],
    priority: 9
  },

  // ==========================================
  // KEYS SYSTEM
  // ==========================================
  {
    id: 'keys-what',
    category: 'keys',
    question: 'What are KEYS?',
    answer: `KEYS are Locked's virtual currency used for voting in events and competitions.

**Key facts about KEYS:**
- 1 KEY = GHS 1 (approximately)
- Used exclusively for voting, not for ticket purchases
- Some events give free KEYS for participation

**How to use KEYS:**
1. Find an event with voting enabled
2. Purchase KEYS or use free ones
3. Vote for your favorite contestant
4. Track results in real-time

KEYS cannot be refunded or converted back to cash.`,
    keywords: ['keys', 'what are keys', 'voting currency', 'virtual currency', 'keys system'],
    relatedTopics: ['keys-buy', 'keys-use', 'voting-how'],
    priority: 10
  },
  {
    id: 'keys-buy',
    category: 'keys',
    question: 'How do I buy KEYS?',
    answer: `To purchase KEYS for voting:

1. Go to an event with voting enabled
2. Click "Get KEYS" or "Buy KEYS"
3. Select the amount of KEYS you want
4. Choose your payment method
5. Complete the purchase

**Payment methods:**
- Mobile Money (MTN, Vodafone, AirtelTigo)
- Debit/Credit Cards
- Bank Transfer

KEYS are added to your account instantly after payment. Minimum purchase is usually 5 KEYS.`,
    keywords: ['buy keys', 'purchase keys', 'get keys', 'how to buy keys', 'add keys'],
    relatedTopics: ['keys-what', 'keys-use', 'payments-methods'],
    priority: 9
  },
  {
    id: 'keys-use',
    category: 'keys',
    question: 'How do I use KEYS to vote?',
    answer: `To use your KEYS for voting:

1. Find an event with active voting
2. View the contestants/nominees
3. Click "Vote" on your favorite
4. Enter the number of KEYS to use
5. Confirm your vote

**Voting tips:**
- Each KEY = 1 vote (unless the event specifies differently)
- You can vote multiple times for the same contestant
- Votes cannot be undone
- Check the voting period before voting

Your KEYS balance is shown in your account dashboard.`,
    keywords: ['use keys', 'vote with keys', 'how to vote', 'spend keys', 'cast vote'],
    relatedTopics: ['keys-what', 'keys-buy', 'voting-how'],
    priority: 9
  },
  {
    id: 'keys-balance',
    category: 'keys',
    question: 'Where can I check my KEYS balance?',
    answer: `To check your KEYS balance:

1. Log in to your account
2. Look at the top navigation bar (you'll see your balance)
3. Or go to Dashboard → "My KEYS"

Your KEYS history shows:
- Purchases made
- Votes cast
- KEYS received (from promotions/events)

KEYS don't expire, but they cannot be refunded or transferred.`,
    keywords: ['keys balance', 'check keys', 'my keys', 'how many keys', 'keys remaining'],
    relatedTopics: ['keys-buy', 'keys-use'],
    priority: 7
  },

  // ==========================================
  // VOTING & CONTESTS
  // ==========================================
  {
    id: 'voting-how',
    category: 'voting',
    question: 'How does voting work?',
    answer: `Voting on Locked allows you to support contestants in competitions:

**How it works:**
1. Find an event with voting enabled
2. Browse the contestants
3. Purchase KEYS (the voting currency)
4. Vote for your favorite(s)
5. Track results in real-time

**Important notes:**
- Each KEY typically equals 1 vote
- Some events may have different vote costs
- Voting periods have start and end dates
- Results update in real-time

Events may include pageants, talent shows, awards, and more!`,
    keywords: ['how to vote', 'voting process', 'cast vote', 'voting guide', 'vote for contestant'],
    relatedTopics: ['keys-what', 'keys-use', 'voting-results'],
    priority: 10
  },
  {
    id: 'voting-results',
    category: 'voting',
    question: 'How do I see voting results?',
    answer: `To view voting results:

1. Go to the event page
2. Click "View Results" or "Leaderboard"
3. See real-time rankings

**What you'll see:**
- Contestant rankings
- Vote counts (if the organizer allows)
- Your voting history for that event

Results update in real-time. Final results are typically announced after the voting period ends.`,
    keywords: ['voting results', 'see results', 'leaderboard', 'rankings', 'who is winning'],
    relatedTopics: ['voting-how', 'keys-use'],
    priority: 8
  },
  {
    id: 'voting-period',
    category: 'voting',
    question: 'When can I vote?',
    answer: `Voting is only available during the official voting period:

**Checking voting status:**
- Look for "Voting Open" or "Voting Closed" badges
- Check the voting start and end dates on the event page
- Set reminders for voting periods

**Voting phases:**
Some events have multiple voting rounds:
- Nominations
- Preliminaries  
- Semi-finals
- Finals

Make sure to vote before the deadline as votes cannot be cast after the period ends.`,
    keywords: ['when to vote', 'voting period', 'voting deadline', 'voting open', 'voting closed'],
    relatedTopics: ['voting-how', 'events-find'],
    priority: 7
  },

  // ==========================================
  // PAYMENTS
  // ==========================================
  {
    id: 'payments-methods',
    category: 'payments',
    question: 'What payment methods are accepted?',
    answer: `Locked accepts multiple payment methods:

**Mobile Money:**
- MTN Mobile Money
- Vodafone Cash
- AirtelTigo Money

**Cards:**
- Visa
- Mastercard
- Debit cards
- Credit cards

**Other:**
- Bank transfer (for some transactions)

Payments are processed securely through our payment partners. All transactions are encrypted.`,
    keywords: ['payment methods', 'how to pay', 'how do i pay', 'how can i pay', 'pay for', 'payment options', 'mobile money', 'card payment', 'momo', 'accepted payments', 'pay with', 'paying', 'make payment'],
    relatedTopics: ['events-book', 'keys-buy', 'payments-issues'],
    priority: 10
  },
  {
    id: 'payments-issues',
    category: 'payments',
    question: 'My payment failed. What should I do?',
    answer: `If your payment failed, try these steps:

1. **Check your balance:** Ensure you have sufficient funds
2. **Verify details:** Double-check card numbers, expiry, CVV
3. **Try again:** Sometimes transactions fail temporarily
4. **Try another method:** Use a different card or mobile money

**Common issues:**
- Insufficient funds
- Incorrect card details
- Card blocked for online transactions
- Network timeout

**If problems persist:**
- Contact your bank/mobile money provider
- Email lockedeventsgh@gmail.com with your transaction details
- Include: date, amount, error message (if any)

Payments that fail are not charged to your account.`,
    keywords: ['payment failed', 'payment error', 'transaction failed', 'cant pay', 'payment problem', 'payment declined'],
    relatedTopics: ['payments-methods', 'contact-support'],
    priority: 9
  },
  {
    id: 'payments-receipt',
    category: 'payments',
    question: 'How do I get a receipt for my purchase?',
    answer: `Receipts are sent automatically to your email after purchase.

**To find your receipts:**
1. Check your email inbox (and spam folder)
2. Or go to Dashboard → "Purchase History"
3. Click on any transaction to view/download receipt

**Receipt includes:**
- Transaction ID
- Date and time
- Items purchased
- Amount paid
- Payment method used

Need a receipt resent? Contact lockedeventsgh@gmail.com.`,
    keywords: ['receipt', 'invoice', 'proof of payment', 'transaction history', 'payment confirmation'],
    relatedTopics: ['payments-methods', 'tickets-view'],
    priority: 6
  },

  // ==========================================
  // ORGANIZERS
  // ==========================================
  {
    id: 'organizer-become',
    category: 'organizers',
    question: 'How do I become an event organizer?',
    answer: `To become an event organizer on Locked:

1. Log in to your account
2. Go to Settings → "Role Request" or Dashboard → "Become an Organizer"
3. Fill out the application form
4. Provide required information:
   - Organization/business name
   - Type of events you'll host
   - Contact information
5. Submit your application

**What happens next:**
- Our team reviews your application
- This usually takes 1-3 business days
- You'll receive an email with the decision
- Once approved, you can start creating events!`,
    keywords: ['become organizer', 'create events', 'host events', 'organizer application', 'event creator'],
    relatedTopics: ['organizer-create-event', 'organizer-benefits'],
    priority: 9
  },
  {
    id: 'organizer-create-event',
    category: 'organizers',
    question: 'How do I create an event?',
    answer: `To create an event (organizers only):

1. Go to your Organizer Dashboard
2. Click "Create Event" or "New Event"
3. Fill in event details:
   - Title and description
   - Date, time, and duration
   - Location (physical, online, or hybrid)
   - Category
   - Ticket types and prices
   - Cover image and gallery
4. Set up optional features:
   - Voting/contests
   - Merchandise
   - Age restrictions
5. Review and publish!

**Tips:**
- Save as draft to edit later
- Preview before publishing
- Add a compelling description and high-quality images`,
    keywords: ['create event', 'new event', 'publish event', 'event setup', 'host event'],
    relatedTopics: ['organizer-become', 'organizer-manage'],
    priority: 9
  },
  {
    id: 'organizer-manage',
    category: 'organizers',
    question: 'How do I manage my events?',
    answer: `To manage your events:

1. Go to your Organizer Dashboard
2. Click "My Events" or "Events"
3. Select the event to manage

**What you can do:**
- Edit event details
- View ticket sales
- Check attendee list
- Download reports
- Manage voting (if enabled)
- Send announcements
- Cancel or postpone events

**Analytics available:**
- Ticket sales over time
- Revenue breakdown
- Attendee demographics
- Page views and locks`,
    keywords: ['manage event', 'event dashboard', 'edit event', 'event analytics', 'sales report'],
    relatedTopics: ['organizer-create-event', 'organizer-payouts'],
    priority: 8
  },
  {
    id: 'organizer-payouts',
    category: 'organizers',
    question: 'How do I get paid as an organizer?',
    answer: `Organizer payouts work as follows:

**Payout schedule:**
- Payouts are processed after the event ends
- Funds are typically available within 7-14 business days
- You'll receive payment to your registered account

**Setting up payouts:**
1. Go to Organizer Dashboard → Settings
2. Add your payout method (bank account or mobile money)
3. Verify your identity if required

**Fees:**
- Locked takes a small platform fee (percentage varies)
- Payment processing fees may apply
- Net amount is what you receive

View your earnings in Dashboard → "Finances" or "Earnings".`,
    keywords: ['organizer payout', 'get paid', 'earnings', 'revenue', 'withdraw money'],
    relatedTopics: ['organizer-manage', 'payments-methods'],
    priority: 8
  },
  {
    id: 'organizer-analytics',
    category: 'organizers',
    question: 'Where can I see my event analytics?',
    answer: `View detailed analytics for your events:

**Accessing analytics:**
1. Go to Organizer Dashboard → "My Events"
2. Click on any event
3. Navigate to "Analytics" or "Reports" tab

**Available metrics:**
- 📊 Total ticket sales
- 💰 Revenue generated
- 👥 Attendee count and demographics
- 📈 Sales trends over time
- 🔍 Page views and clicks
- 🔒 Locks (bookmarks)
- ⏱️ User engagement timeline

**Exporting data:**
- Download reports as PDF or CSV
- Share analytics with team members
- Track performance over multiple events

Analytics are updated in real-time as tickets sell.`,
    keywords: ['analytics', 'event analytics', 'reports', 'event performance', 'sales report', 'attendance', 'dashboard'],
    relatedTopics: ['organizer-manage', 'organizer-create-event'],
    priority: 8
  },
  {
    id: 'organizer-voting',
    category: 'organizers',
    question: 'How do I add voting to my event?',
    answer: `Add interactive voting to your event:

**Setting up voting:**
1. Go to Organizer Dashboard
2. Create or edit an event
3. Enable "Voting" option
4. Configure voting settings:
   - Set vote cost (minimum 0.1 KEYS)
   - Add contestants or options
   - Set voting timeline (start/end dates)

**Voting timeline:**
- Before event: Users can vote to pick what happens
- During event: Live voting for engagement
- After event: Voting closes after end date

**Getting votes:**
- Each user pays the set KEYS amount to vote
- You earn KEYS from votes
- Results are displayed in real-time

**Best practices:**
- Set realistic vote costs
- Create engaging contestant descriptions
- Promote voting through announcements
- Share results with attendees

Visit: Organizer Dashboard → Event → Voting Tab`,
    keywords: ['voting', 'add voting', 'event voting', 'voting setup', 'vote cost', 'contestants', 'keys', 'engagement'],
    relatedTopics: ['keys-what', 'keys-buy', 'organizer-manage'],
    priority: 8
  },
  {
    id: 'organizer-tickets',
    category: 'organizers',
    question: 'How do I manage ticket sales?',
    answer: `Manage and monitor ticket sales:

**Ticket management:**
1. Go to Organizer Dashboard → Event
2. Click "Ticket Sales" or "Attendees"
3. View real-time sales data

**What you can do:**
- Add or remove ticket tiers
- Adjust ticket prices (only before sales)
- View sold vs. available
- Download attendee list (CSV/Excel)
- Check payment status
- Send tickets via email

**Monitoring sales:**
- Real-time sales dashboard
- Revenue breakdown by ticket type
- Attendee check-in status
- Refund requests

**Check-in:**
- Use mobile app to scan tickets
- Track who's checked in
- Get live attendance counts

**Common issues:**
- Can't modify price: Change before sales start
- Refund requests: Approve from attendees list
- Duplicate attendees: Contact support

Questions? Visit Organizer Dashboard or Contact Support.`,
    keywords: ['ticket sales', 'manage tickets', 'attendees', 'ticket management', 'check-in', 'refund', 'ticket price'],
    relatedTopics: ['organizer-manage', 'payments-methods'],
    priority: 8
  },
  {
    id: 'organizer-publish',
    category: 'organizers',
    question: 'How do I publish my event?',
    answer: `Publish your event to make it live:

**Before publishing:**
- ✅ Add event title (required)
- ✅ Set date and time (required)
- ✅ Write description
- ✅ Add featured image
- ✅ Set ticket types and prices (required)
- ✅ Set location (for physical events)
- ✅ Category and tags

**Publishing steps:**
1. Go to Organizer Dashboard → "Create Event"
2. Fill in required fields
3. Review all details
4. Click "Publish Event"

**Event status:**
- **Draft:** Saved but not visible
- **Published:** Live and searchable
- **Ended:** Automatically marked when date passes

**After publishing:**
- Event appears on Discover page
- Visible in search results
- Users can buy tickets
- You can still edit details
- Monitor sales in real-time

**Unpublishing:**
- Click "Unpublish" to make private
- Users can't buy new tickets
- Existing tickets remain valid

Tip: Add high-quality images and compelling descriptions for better visibility!`,
    keywords: ['publish event', 'publish', 'make event live', 'event draft', 'go live', 'create event', 'event status'],
    relatedTopics: ['organizer-create-event', 'organizer-manage'],
    priority: 9
  },
  {
    id: 'organizer-help',
    category: 'organizers',
    question: 'What organizer resources are available?',
    answer: `As an organizer, you have access to:

**Dashboard tools:**
- 📅 Event Creation & Management
- 📊 Analytics & Reports
- 💰 Revenue & Payouts
- 👥 Attendee Management
- 🎫 Ticket Management
- 📢 Announcements & Messaging
- ⚙️ Settings & Preferences

**Help resources:**
- Event Hosting Guide
- Best Practices for Promotion
- FAQ for Organizers
- Email Support
- Live Chat with Support Team

**Quick links:**
- My Events Dashboard
- Create New Event
- Event Analytics
- Settings & Payout

**Getting help:**
- Check the Event Hosting Guide
- Browse Organizer FAQs
- Contact lockedeventsgh@gmail.com
- Chat with support team (this chat!)

Start by visiting: Organizer Dashboard → "My Events"`,
    keywords: ['organizer resources', 'organizer tools', 'organizer help', 'organizer guide', 'where do i', 'how do i'],
    relatedTopics: ['organizer-manage', 'organizer-create-event', 'organizer-analytics'],
    priority: 7
  },

  // ==========================================
  // SECURITY & PRIVACY
  // ==========================================
  {
    id: 'security-tips',
    category: 'security',
    question: 'How can I keep my account secure?',
    answer: `Here are tips to keep your Locked account secure:

**Recommended:**
1. ✅ Enable Two-Factor Authentication (2FA)
2. ✅ Use a strong, unique password
3. ✅ Don't share your login credentials
4. ✅ Log out on shared devices
5. ✅ Keep your email secure

**Warning signs:**
- Unexpected login notifications
- Password change emails you didn't request
- Unknown devices in your active sessions

**If you suspect unauthorized access:**
1. Change your password immediately
2. Enable 2FA if not already
3. Check and remove unknown sessions
4. Contact lockedeventsgh@gmail.com`,
    keywords: ['account security', 'protect account', 'secure account', 'safety tips', 'prevent hack'],
    relatedTopics: ['account-2fa', 'account-password-reset'],
    priority: 8
  },
  {
    id: 'privacy-data',
    category: 'security',
    question: 'How is my data protected?',
    answer: `Locked takes your privacy seriously:

**Data protection measures:**
- Encrypted data transmission (HTTPS/SSL)
- Secure password storage (hashed, never plain text)
- Regular security audits
- GDPR-compliant practices

**Your data rights:**
- View what data we store
- Export your data
- Request data deletion
- Control marketing preferences

**We never:**
- Sell your personal data
- Share data without consent
- Store unnecessary information

Read our full Privacy Policy at locked.events/privacy`,
    keywords: ['data protection', 'privacy', 'personal data', 'data security', 'gdpr'],
    relatedTopics: ['data-export', 'account-delete'],
    priority: 7
  },
  {
    id: 'data-export',
    category: 'security',
    question: 'How can I export my data?',
    answer: `You can download all your data from Locked:

1. Go to Settings → Security & Privacy
2. Find "Export Data" section
3. Click "Export Data"
4. Wait for the export to process
5. Download the file (JSON format)

**Exported data includes:**
- Account information
- Purchase history
- Event attendance
- Voting history
- Settings and preferences

The export may take a few minutes depending on data size.`,
    keywords: ['export data', 'download data', 'my data', 'data download', 'personal data export'],
    relatedTopics: ['privacy-data', 'account-delete'],
    priority: 6
  },

  // ==========================================
  // GENERAL / SUPPORT
  // ==========================================
  {
    id: 'contact-support',
    category: 'general',
    question: 'How do I contact support?',
    answer: `You can reach Locked support through:

**Email:**
📧 lockedeventsgh@gmail.com

**In-app chat:**
Click the help button (?) in the bottom corner

**Response times:**
- Email: Within 24-48 hours
- Chat: Real-time during business hours

**When contacting support, include:**
- Your account email
- Description of the issue
- Screenshots if applicable
- Transaction IDs (for payment issues)

Our support team is available Monday-Friday, 9 AM - 6 PM GMT.`,
    keywords: ['contact support', 'help', 'customer service', 'support email', 'get help', 'assistance'],
    relatedTopics: ['payments-issues', 'account-recovery'],
    priority: 10
  },
  {
    id: 'about-locked',
    category: 'general',
    question: 'What is Locked?',
    answer: `Locked is Ghana's premier event discovery and ticketing platform.

**What we offer:**
- 🎫 Event discovery and ticket booking
- 🗳️ Interactive voting for competitions
- 📍 Venue discovery and booking
- 🎤 Tools for event organizers

**Features:**
- Browse events by category, location, date
- Secure ticket purchasing
- Vote in pageants, awards, and contests
- Save events to your "Locked" list
- Real-time event updates

Join thousands of event-goers discovering amazing experiences on Locked!`,
    keywords: ['what is locked', 'about locked', 'locked platform', 'locked app', 'locked events'],
    relatedTopics: ['events-find', 'organizer-become'],
    priority: 9
  },
  {
    id: 'app-mobile',
    category: 'general',
    question: 'Is there a mobile app?',
    answer: `Locked is optimized for mobile browsers and works great on any device!

**Current options:**
- Visit locked.events on your mobile browser
- Add to Home Screen for an app-like experience

**To add to Home Screen:**
**iPhone (Safari):**
1. Tap the Share button
2. Tap "Add to Home Screen"

**Android (Chrome):**
1. Tap the menu (3 dots)
2. Tap "Add to Home screen"

A dedicated mobile app may be coming soon! Follow us for updates.`,
    keywords: ['mobile app', 'download app', 'ios app', 'android app', 'phone app'],
    relatedTopics: ['about-locked'],
    priority: 6
  },
  {
    id: 'event-categories',
    category: 'events',
    question: 'What types of events can I find?',
    answer: `Locked features a wide variety of events:

**Categories include:**
- 🎵 Music & Concerts
- 🎭 Arts & Theatre
- 🏃 Sports & Fitness
- 💼 Business & Networking
- 🎓 Education & Workshops
- 🎉 Parties & Nightlife
- 🍔 Food & Drink
- 💒 Religious & Spiritual
- 🎪 Festivals
- 👗 Fashion & Beauty
- 🎮 Gaming & Esports
- 🌍 Community & Culture

Use filters on the Discover page to find exactly what you're looking for!`,
    keywords: ['event categories', 'types of events', 'event types', 'what events', 'categories'],
    relatedTopics: ['events-find', 'events-free'],
    priority: 7
  },
  {
    id: 'technical-issues',
    category: 'general',
    question: 'The website isn\'t working properly. What should I do?',
    answer: `If you're experiencing technical issues:

**Try these steps:**
1. Refresh the page (Ctrl/Cmd + R)
2. Clear your browser cache
3. Try a different browser
4. Check your internet connection
5. Disable browser extensions temporarily

**Common fixes:**
- Enable JavaScript
- Allow cookies from locked.events
- Update your browser to the latest version

**Still having issues?**
Contact lockedeventsgh@gmail.com with:
- Your browser and version
- Device type (phone, laptop, etc.)
- Description of the issue
- Screenshots if possible`,
    keywords: ['technical issues', 'website not working', 'bug', 'error', 'problem', 'cant access', 'page not loading'],
    relatedTopics: ['contact-support'],
    priority: 7
  }
];

/**
 * Search the knowledge base for relevant entries
 * @param query - The user's question or search term
 * @param limit - Maximum number of results to return
 * @returns Array of relevant knowledge entries
 */
export function searchKnowledge(query: string, limit: number = 5): KnowledgeEntry[] {
  const queryLower = query.toLowerCase();
  // Filter out common stop words that cause false matches
  const stopWords = new Set(['how', 'do', 'does', 'did', 'to', 'the', 'a', 'an', 'is', 'are', 'can', 'i', 'my', 'me', 'for', 'and', 'or', 'it', 'what', 'where', 'when', 'who', 'why', 'which']);
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  
  // Score each entry based on keyword matches
  const scoredEntries = knowledgeBase.map(entry => {
    let score = 0;
    
    // Check keywords - prioritize exact phrase matches
    for (const keyword of entry.keywords) {
      if (queryLower.includes(keyword)) {
        // Exact phrase match - high score
        score += 15;
      } else if (keyword.includes(queryLower)) {
        // Query is part of keyword - medium score
        score += 10;
      } else if (queryWords.some(word => keyword.includes(word) && word.length > 3)) {
        // Word match (only meaningful words 4+ chars)
        score += 5;
      }
    }
    
    // Check question
    if (entry.question.toLowerCase().includes(queryLower)) {
      score += 15;
    } else {
      for (const word of queryWords) {
        if (entry.question.toLowerCase().includes(word)) {
          score += 3;
        }
      }
    }
    
    // Check answer
    for (const word of queryWords) {
      if (entry.answer.toLowerCase().includes(word)) {
        score += 1;
      }
    }
    
    // Apply priority boost
    score += (entry.priority || 5) / 2;
    
    return { entry, score };
  });
  
  // Sort by score and return top results
  return scoredEntries
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(e => e.entry);
}

/**
 * Get entries by category
 * @param categoryId - The category ID to filter by
 * @returns Array of knowledge entries in that category
 */
export function getEntriesByCategory(categoryId: string): KnowledgeEntry[] {
  return knowledgeBase.filter(entry => entry.category === categoryId);
}

/**
 * Get a specific entry by ID
 * @param entryId - The entry ID
 * @returns The knowledge entry or undefined
 */
export function getEntryById(entryId: string): KnowledgeEntry | undefined {
  return knowledgeBase.find(entry => entry.id === entryId);
}

/**
 * Get related entries for a given entry
 * @param entry - The knowledge entry
 * @returns Array of related knowledge entries
 */
export function getRelatedEntries(entry: KnowledgeEntry): KnowledgeEntry[] {
  if (!entry.relatedTopics || entry.relatedTopics.length === 0) {
    return [];
  }
  
  return entry.relatedTopics
    .map(topicId => getEntryById(topicId))
    .filter((e): e is KnowledgeEntry => e !== undefined);
}

// ============================================
// NAVIGATION ACTIONS
// ============================================

export interface ChatAction {
  type: 'navigate' | 'external_link' | 'copy';
  label: string;
  target: string;
  icon?: string;
}

// Navigation mappings for common requests
const NAVIGATION_TRIGGERS: Record<string, { path: string; label: string; keywords: string[]; organizer?: boolean }> = {
  settings: {
    path: '/dashboards/settings',
    label: 'Go to Settings',
    keywords: ['settings', 'preferences', 'account settings', 'my settings', 'profile settings']
  },
  profile: {
    path: '/dashboards/settings',
    label: 'Edit Profile',
    keywords: ['profile', 'edit profile', 'my profile', 'update profile', 'change profile']
  },
  discover: {
    path: '/pages/discover',
    label: 'Discover Events',
    keywords: ['discover', 'explore', 'browse events', 'find events', 'discover page', 'explore events']
  },
  tickets: {
    path: '/dashboards/user/tickets',
    label: 'View My Tickets',
    keywords: ['my tickets', 'purchased tickets', 'view tickets', 'ticket history', 'booked tickets']
  },
  lockedEvents: {
    path: '/dashboards/user/locked-events',
    label: 'View Locked Events',
    keywords: ['locked events', 'saved events', 'bookmarked events', 'my saved', 'favorites']
  },
  orders: {
    path: '/dashboards/user/orders',
    label: 'View Orders',
    keywords: ['orders', 'order history', 'my orders', 'purchases', 'purchase history']
  },
  createEvent: {
    path: '/dashboards/organizer/events/new',
    label: 'Create Event',
    keywords: ['create event', 'new event', 'host event', 'make event', 'start event', 'add event'],
    organizer: true
  },
  myEvents: {
    path: '/dashboards/organizer/events',
    label: 'My Events',
    keywords: ['my events', 'manage events', 'organizer events', 'event dashboard', 'organizer dashboard'],
    organizer: true
  },
  organizerAnalytics: {
    path: '/dashboards/organizer/analytics',
    label: 'Event Analytics',
    keywords: ['analytics', 'event analytics', 'reports', 'performance', 'sales report', 'attendance'],
    organizer: true
  },
  organizerPayouts: {
    path: '/dashboards/organizer/earnings',
    label: 'Earnings & Payouts',
    keywords: ['earnings', 'payouts', 'payout', 'get paid', 'revenue', 'finances', 'withdraw'],
    organizer: true
  },
  organizeVoting: {
    path: '/dashboards/organizer/events',
    label: 'Manage Voting',
    keywords: ['voting', 'add voting', 'voting setup', 'vote cost', 'contestants'],
    organizer: true
  },
  security: {
    path: '/dashboards/settings/security',
    label: 'Security Settings',
    keywords: ['security', '2fa', 'two factor', 'password', 'change password', 'authentication']
  },
  help: {
    path: '/pages/help',
    label: 'Help Center',
    keywords: ['help', 'support', 'help center', 'faq', 'faqs']
  },
  contact: {
    path: '/pages/help/contact',
    label: 'Contact Support',
    keywords: ['contact', 'contact support', 'support email', 'reach support', 'talk to support', 'human', 'real person']
  },
  home: {
    path: '/',
    label: 'Go to Homepage',
    keywords: ['home', 'homepage', 'main page', 'go home']
  }
};

/**
 * Detect navigation intent and return appropriate action
 * @param query - The user's query
 * @param isOrganizer - Whether the user is an organizer
 */
export function detectNavigationIntent(query: string, isOrganizer: boolean = false): ChatAction | null {
  const queryLower = query.toLowerCase();
  
  // Check for "take me to", "go to", "show me", "open" patterns
  const navigationPatterns = [
    /(?:take me to|go to|open|show me|navigate to|bring me to)\s+(.+)/i,
    /(?:where is|how do i get to|how to access)\s+(.+)/i
  ];
  
  for (const [key, nav] of Object.entries(NAVIGATION_TRIGGERS)) {
    // Skip organizer-only shortcuts if user is not an organizer
    if (nav.organizer && !isOrganizer) {
      continue;
    }
    
    // Check keywords
    for (const keyword of nav.keywords) {
      if (queryLower.includes(keyword)) {
        return {
          type: 'navigate',
          label: nav.label,
          target: nav.path,
          icon: getNavIcon(key)
        };
      }
    }
    
    // Check navigation patterns
    for (const pattern of navigationPatterns) {
      const match = queryLower.match(pattern);
      if (match) {
        const destination = match[1].trim();
        for (const keyword of nav.keywords) {
          if (destination.includes(keyword) || keyword.includes(destination)) {
            return {
              type: 'navigate',
              label: nav.label,
              target: nav.path,
              icon: getNavIcon(key)
            };
          }
        }
      }
    }
  }
  
  return null;
}

function getNavIcon(key: string): string {
  const icons: Record<string, string> = {
    settings: '⚙️',
    profile: '👤',
    discover: '🔍',
    tickets: '🎫',
    lockedEvents: '🔒',
    orders: '📦',
    createEvent: '➕',
    myEvents: '📅',
    organizerAnalytics: '📊',
    organizerPayouts: '💰',
    organizeVoting: '🗳️',
    security: '🔐',
    help: '❓',
    contact: '💬',
    home: '🏠'
  };
  return icons[key] || '→';
}

// ============================================
// ORDER & TICKET DETECTION
// ============================================

export interface OrderQueryResult {
  isOrderQuery: boolean;
  queryType: 'check_order' | 'check_ticket' | 'payment_status' | 'upcoming_tickets' | 'last_order' | 'none';
  eventName?: string; // Extracted event name if any
}

/**
 * Detect if a query is about orders, tickets, or payment status
 * Phase 2.2: Order/Ticket Status Lookup
 */
export function detectOrderQuery(query: string): OrderQueryResult {
  const queryLower = query.toLowerCase();
  
  // Order/ticket related keywords
  const orderKeywords = ['order', 'order number', 'order status', 'check order', 'my order', 'last order'];
  const ticketKeywords = ['ticket', 'tickets', 'check ticket', 'my ticket', 'view ticket', 'ticket status'];
  const paymentKeywords = ['payment', 'payment status', 'is my payment', 'payment confirmed', 'confirmed'];
  const upcomingKeywords = ['upcoming', 'upcoming tickets', 'upcoming events', 'next event', 'next events'];
  
  // Check for order queries
  if (orderKeywords.some(kw => queryLower.includes(kw))) {
    if (queryLower.includes('last') || queryLower.includes('recent')) {
      return { isOrderQuery: true, queryType: 'last_order' };
    }
    return { isOrderQuery: true, queryType: 'check_order' };
  }
  
  // Check for ticket queries
  if (ticketKeywords.some(kw => queryLower.includes(kw))) {
    return { isOrderQuery: true, queryType: 'check_ticket' };
  }
  
  // Check for payment status queries
  if (paymentKeywords.some(kw => queryLower.includes(kw))) {
    return { isOrderQuery: true, queryType: 'payment_status' };
  }
  
  // Check for upcoming tickets
  if (upcomingKeywords.some(kw => queryLower.includes(kw))) {
    return { isOrderQuery: true, queryType: 'upcoming_tickets' };
  }
  
  // Try to extract event name from query like "show my ticket for [event name]"
  const forPattern = /for\s+(.+?)(?:\s+event)?$/i;
  const match = queryLower.match(forPattern);
  if (match && (queryLower.includes('ticket') || queryLower.includes('order'))) {
    return {
      isOrderQuery: true,
      queryType: 'check_ticket',
      eventName: match[1].trim()
    };
  }
  
  return { isOrderQuery: false, queryType: 'none' };
}

// ============================================
// ENHANCED RESPONSE GENERATION
// ============================================

export interface EnhancedResponse {
  answer: string;
  suggestions: string[];
  actions?: ChatAction[];
  isEventSearch?: boolean;
  events?: any[]; // Will be populated by HelpChatPanel
}

/**
 * Detect if the user is sending a greeting or introducing themselves
 * @param query - The user's message
 * @param userName - Optional user name from database for authenticated users
 * @returns Greeting response if detected, null otherwise
 */
export function detectGreeting(query: string, userName?: string): EnhancedResponse | null {
  const queryLower = query.toLowerCase().trim();
  
  // Name introduction patterns - "I'm Chris", "My name is Chris", "Im Chris", "I am Chris", "Call me Chris"
  // Also handles corrections: "No my name is Chris", "Actually I'm Chris", "No I'm Chris"
  const nameIntroPatterns = [
    // Standard introductions
    /^(?:i'?m|i am|my name is|call me|this is|it's|its)\s+([a-zA-Z]+)[\s.!?]*$/i,
    /^([a-zA-Z]+)\s+here[\s.!?]*$/i,
    // Corrections with prefixes: "No", "Actually", "Wait", "Sorry", "Nope", "No no"
    /^(?:no+|actually|wait|sorry|nope|no\s*no)\s*,?\s*(?:i'?m|i am|my name is|call me|it's|its)\s+([a-zA-Z]+)[\s.!?]*$/i,
    /^(?:no+|actually|wait|sorry|nope)\s*,?\s*([a-zA-Z]+)[\s.!?]*$/i,
    // "I meant X", "I'm actually X", "It's actually X"
    /^(?:i meant|i'm actually|i am actually|it's actually|its actually)\s+([a-zA-Z]+)[\s.!?]*$/i,
    // Just the name as a correction (single word response after previous name intro)
    // This pattern is risky, so we'll handle it more carefully below
  ];
  
  for (const pattern of nameIntroPatterns) {
    const match = queryLower.match(pattern);
    if (match && match[1]) {
      const introducedName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      
      // Check if this is a correction (has "no", "actually", etc.)
      const isCorrection = /^(?:no+|actually|wait|sorry|nope)/i.test(queryLower);
      
      // If user is authenticated and we know their name, acknowledge both
      if (userName) {
        if (isCorrection) {
          return {
            answer: `Oops, my apologies! Nice to meet you, ${introducedName}! 👋 How can I help you today?`,
            suggestions: [
              'Find events this weekend',
              'Where are my tickets?',
              'What are KEYS?',
              'Browse all events'
            ],
            actions: [
              { type: 'navigate', label: 'Explore Events', target: '/pages/discover', icon: '🔍' }
            ]
          };
        }
        return {
          answer: `Nice to meet you, ${introducedName}! 👋 I see from your profile that you're ${userName}. How can I help you today?`,
          suggestions: [
            'Find events this weekend',
            'Where are my tickets?',
            'What are KEYS?',
            'Browse all events'
          ],
          actions: [
            { type: 'navigate', label: 'Explore Events', target: '/pages/discover', icon: '🔍' }
          ]
        };
      }
      
      // User not authenticated or no name in profile
      if (isCorrection) {
        return {
          answer: `Oops, my apologies! Nice to meet you, ${introducedName}! 👋 How can I help you today?`,
          suggestions: [
            'Find events this weekend',
            'How do I get tickets?',
            'What are KEYS?',
            'Browse all events'
          ],
          actions: [
            { type: 'navigate', label: 'Explore Events', target: '/pages/discover', icon: '🔍' }
          ]
        };
      }
      return {
        answer: `Nice to meet you, ${introducedName}! 👋 How can I help you today?`,
        suggestions: [
          'Find events this weekend',
          'How do I get tickets?',
          'What are KEYS?',
          'Browse all events'
        ],
        actions: [
          { type: 'navigate', label: 'Explore Events', target: '/pages/discover', icon: '🔍' }
        ]
      };
    }
  }
  
  // Greeting patterns - more flexible matching
  const greetingPatterns = [
    /^(hi+|hello+|hey+|greetings?|what'?s\s*up|wassup|howdy|yo+|sup|hola|salaam|aloha|namaste)[\s.!?,]*$/i,
    /^(hi+|hello+|hey+)\s*(there|everyone|all|bot|lockey)?[\s.!?,]*$/i,
    /^good\s*(morning|afternoon|evening|day)[\s.!?,]*$/i,
    /^(how\s*are\s*you|how'?s\s*it\s*going|how\s*are\s*you\s*doing|what'?s\s*good|what'?s\s*happening|what'?s\s*new)[\s.!?,]*$/i,
    /^(hiii+|heyy+|helloo+)[\s.!?,]*$/i, // Extended greetings like "hiii" or "heyyy"
  ];
  
  const isGreeting = greetingPatterns.some(pattern => pattern.test(queryLower));
  
  if (!isGreeting) return null;
  
  // Generate personalized greeting response
  const greetingAnswers = userName 
    ? [
        `Hey ${userName}! 👋 Great to see you. How can I help you today?`,
        `Hi ${userName}! 😊 Welcome back! What can I assist you with?`,
        `Hello ${userName}! 🎉 Ready to explore Locked? What would you like to know?`,
        `Hey there, ${userName}! 👋 What can I help you with today?`,
      ]
    : [
        `Hey there! 👋 How can I help you today?`,
        `Hi! 😊 Welcome to Locked! What can I assist you with?`,
        `Hello! 🎉 Ready to explore Locked? What would you like to know?`,
        `Hey! 👋 What can I help you with today?`,
      ];
  
  // Pick a random greeting
  const randomGreeting = greetingAnswers[Math.floor(Math.random() * greetingAnswers.length)];
  
  return {
    answer: randomGreeting,
    suggestions: userName 
      ? ['Find events this weekend', 'Where are my tickets?', 'What are KEYS?', 'Browse all events']
      : ['Find events this weekend', 'How do I get tickets?', 'What are KEYS?', 'Browse all events'],
    actions: [
      { type: 'navigate', label: 'Explore Events', target: '/pages/discover', icon: '🔍' }
    ]
  };
}

/**
 * Generate a chatbot response based on the user's query
 * Enhanced with navigation actions and event search detection
 * @param query - The user's question
 * @param isOrganizer - Whether the user is an organizer
 * @param userName - Optional user name for personalization
 * @returns Enhanced response with answer, suggestions, and actions
 */
export function generateResponse(query: string, isOrganizer: boolean = false, userName?: string): EnhancedResponse {
  const queryLower = query.toLowerCase();
  
  // Check for greeting first (before other detections)
  const greetingResponse = detectGreeting(query, userName);
  if (greetingResponse) {
    return greetingResponse;
  }
  
  // Check for navigation intent
  const navAction = detectNavigationIntent(query, isOrganizer);
  
  // Check for event search intent (will be handled by HelpChatPanel)
  const eventSearchKeywords = [
    'find event', 'search event', 'show event', 'events today', 'events tomorrow',
    'events this week', 'events this weekend', 'live event', 'upcoming event',
    'free event', 'whats happening', "what's happening", 'things to do',
    'events near', 'events in accra', 'concerts', 'parties', 'festivals'
  ];
  
  const isEventSearch = eventSearchKeywords.some(kw => queryLower.includes(kw));
  
  if (isEventSearch) {
    return {
      answer: '', // Will be populated by event search
      suggestions: [],
      isEventSearch: true
    };
  }
  
  // Search knowledge base
  const results = searchKnowledge(query, 3);
  
  // Handle no results
  if (results.length === 0) {
    const response: EnhancedResponse = {
      answer: `I'm not sure about that specific question, ${userName ? `${userName}` : 'friend'}. Here are some ways I can help:

• Account issues and login help
• Finding and booking events
• Understanding KEYS and voting
• Payment questions
• Event organizer inquiries

You can also contact our support team at lockedeventsgh@gmail.com for personalized assistance.`,
      suggestions: [
        'How do I reset my password?',
        'Find events this weekend',
        'What are KEYS?',
        'How do I contact support?'
      ],
      actions: [
        { type: 'navigate', label: 'Browse Events', target: '/pages/discover', icon: '🔍' },
        { type: 'navigate', label: 'Contact Support', target: '/pages/help/contact', icon: '💬' }
      ]
    };
    
    return response;
  }
  
  const topResult = results[0];
  const relatedEntries = getRelatedEntries(topResult).slice(0, 3);
  
  const suggestions = [
    ...relatedEntries.map(e => e.question),
    ...results.slice(1, 3).map(r => r.question)
  ].slice(0, 4);
  
  // Build actions based on context
  const actions: ChatAction[] = [];
  
  // Add navigation action if detected
  if (navAction) {
    actions.push(navAction);
  }
  
  // Add contextual actions based on topic
  if (topResult.category === 'account') {
    actions.push({ type: 'navigate', label: 'Go to Settings', target: '/dashboards/settings', icon: '⚙️' });
  } else if (topResult.category === 'events') {
    actions.push({ type: 'navigate', label: 'Discover Events', target: '/pages/discover', icon: '🔍' });
  } else if (topResult.category === 'keys' || topResult.category === 'voting') {
    actions.push({ type: 'navigate', label: 'Find Voting Events', target: '/pages/discover?filter=voting', icon: '🗳️' });
  } else if (topResult.category === 'payments') {
    actions.push({ type: 'navigate', label: 'View Orders', target: '/dashboards/user/orders', icon: '📦' });
  } else if (topResult.category === 'organizers') {
    actions.push({ type: 'navigate', label: 'Organizer Dashboard', target: '/dashboards/organizer', icon: '📊' });
  }
  
  // Add support contact for common issues
  if (topResult.id.includes('refund') || topResult.id.includes('issue') || topResult.id.includes('problem')) {
    actions.push({ type: 'navigate', label: 'Contact Support', target: '/pages/help/contact', icon: '💬' });
  }
  
  return {
    answer: topResult.answer,
    suggestions,
    actions: actions.length > 0 ? actions.slice(0, 2) : undefined
  };
}
