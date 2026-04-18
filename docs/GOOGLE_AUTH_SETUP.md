# Setting up Google OAuth for Supabase

This guide explains how to obtain your Google Client ID and Secret and configure them in Supabase.

## 1. Google Cloud Console Setup

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Select an existing project or create a new one.
3.  In the search bar, look for "APIs & Services" and select **Credentials**.

### Configure OAuth Consent Screen
**IMPORTANT:** The name you enter here is what users will see on the "Choose an account" screen.

1.  Go to **OAuth consent screen** in the left sidebar.
2.  Select **External** (unless you are a Google Workspace user testing internally).
3.  **App Information**:
    *   **App name**: Enter **"Locked"** (or exactly what you want users to see). If you see a URL here, change it to your app name.
    *   **User support email**: Select your email.
4.  **App Domain** (Optional but recommended):
    *   **Application home page**: `http://localhost:3000` (or your production URL).
    *   **Application privacy policy link**: `http://localhost:3000/privacy` (or your production URL).
5.  **Save and Continue**.
6.  **Scopes**: Default scopes (`.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`) are usually sufficient. Save and Continue.
7.  **Test Users**: If your app is in "Testing" mode (which it usually is initially), you **MUST** add the email addresses of any users you want to allow to log in (including yourself).

### Create Credentials
1.  Go to **Credentials** in the left sidebar.
2.  Click **+ CREATE CREDENTIALS** at the top and select **OAuth client ID**.
3.  **Application type**: Select **Web application**.
4.  **Name**: Give it a name like "Supabase Auth" or "Locked App Web" (Internal use only).
5.  **Authorized JavaScript origins**:
    *   Add your local development URL: `http://localhost:3000`
    *   Add your production URL (if you have one): `https://your-domain.com`
6.  **Authorized redirect URIs**:
    *   **IMPORTANT**: Paste the Supabase Callback URL you provided:
        `https://tmvujvnmociwuyefrtjq.supabase.co/auth/v1/callback`
7.  Click **Create**.
8.  A modal will appear with your **Client ID** and **Client Secret**. Copy these.

## 2. Supabase Configuration

1.  Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Select your project.
3.  In the left sidebar, click **Authentication** -> **Providers**.
4.  Find **Google** in the list and expand it.
5.  **Enable Google provider**: Toggle the switch to ON.
6.  **Client ID**: Paste the Client ID you copied from Google.
7.  **Client Secret**: Paste the Client Secret you copied from Google.
8.  Click **Save**.

## 3. Verify

1.  Restart your local development server if needed (usually not required for this, but good practice).
2.  Go to your Sign Up page.
3.  Click the "Sign up with Google" button.
4.  You should be redirected to Google to sign in.
5.  Check the text: "Choose an account to continue to **Locked**".

## Troubleshooting: "Continue to [Supabase URL]"
If you see "Continue to ilrpxznizqhlankqldnr.supabase.co" instead of "Continue to Locked":

1.  Go back to **Google Cloud Console > APIs & Services > OAuth consent screen**.
2.  Click **Edit App**.
3.  Check the **App name** field. Ensure it says "Locked".
4.  If it already says "Locked" but still shows the URL on the login screen, it may be because your app is unverified and Google is showing the origin domain as a security measure.
5.  **Fix**: Verify your specific domain in Google Search Console, or for development, ensure you are added as a **Test User** and accept the unverified app warning.
6.  **Production Fix**: To completely white-label this, you would need to set up a **Custom Domain** in Supabase (e.g., `auth.locked.com`) and update the Authorized Redirect URI in Google Cloud to match that custom domain. This requires a Supabase paid plan.
