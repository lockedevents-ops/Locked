# Setting up Apple Sign-In for Supabase

This guide explains how to configure Apple Sign-In for your application. Unlike Google, Apple requires a paid Developer Program membership.

## 1. Apple Developer Portal Setup

### Create an App ID
1.  Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list/bundleId).
2.  Click **+** to create a new identifier.
3.  Select **App IDs** and click **Continue**.
4.  Select **App** and click **Continue**.
5.  **Description**: "Locked App"
6.  **Bundle ID**: Use a reverse-DNS style (e.g., `com.yourcompany.locked`).
7.  Scroll down to **Capabilities** and check **Sign In with Apple**.
8.  Click **Continue**, then **Register**.

### Create a Services ID (For Web Auth)
1.  Go back to **Identifiers** and click **+**.
2.  Select **Services IDs** and click **Continue**.
3.  **Description**: "Locked Web Auth"
4.  **Identifier**: `com.yourcompany.locked.web` (must be different from App ID).
5.  Click **Continue**, then **Register**.
6.  Find your new Services ID in the list and click it.
7.  Enable **Sign In with Apple** and click **Configure**.
8.  **Primary App ID**: Select the App ID you created in the first step.
9.  **Domains and Subdomains**: `locked-events.vercel.app` (and `localhost` for testing).
10. **Return URLs**: Add your Supabase callback URL:
    `https://tmvujvnmociwuyefrtjq.supabase.co/auth/v1/callback`
11. Click **Next**, then **Done**, then **Continue**, then **Save**.

### Create a Private Key
1.  Go to **Keys** and click **+**.
2.  **Key Name**: "Supabase Auth Key"
3.  Check **Sign In with Apple** and click **Configure**.
4.  **Primary App ID**: Select your App ID.
5.  Click **Save**, then **Continue**, then **Register**.
6.  **IMPORTANT**: Download the `.p8` key file immediately. You can only download it once.
7.  Note your **Key ID** and **Team ID** (visible in the top right of the portal).

## 2. Supabase Configuration

1.  Go to your [Supabase Dashboard](https://supabase.com/dashboard) > **Authentication** > **Providers**.
2.  Find **Apple** and enable it.
3.  **Services ID**: Paste the identifier from the Services ID step (e.g., `com.yourcompany.locked.web`).
4.  **Team ID**: Paste your 10-character Apple Team ID.
5.  **Key ID**: Paste the 10-character Key ID from the private key step.
6.  **Secret Key**: Open the `.p8` file in a text editor and paste the entire contents here.
7.  Click **Save**.

## 3. Verify

1.  Restart your local development server.
2.  Go to the Sign In page and click "Continue with Apple".
3.  You should be prompted to sign in with your Apple ID.
4.  **Note**: Apple only shares the user's name the *first* time they sign in. Subsequent sign-ins will only provide the email.
