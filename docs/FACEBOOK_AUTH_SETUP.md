# Setting up Facebook Sign-In for Supabase

This guide explains how to configure Facebook Sign-In for your application. This is free and managed through Meta for Developers.

## 1. Meta for Developers Setup

1.  Go to [Meta for Developers](https://developers.facebook.com/) and log in.
2.  Click **My Apps** and then **Create App**.
3.  Select **Authenticate and request data from users with Facebook Login** (or the current equivalent for authentication).
4.  **Display Name**: "Locked"
5.  Once the app is created, go to **App Settings > Basic** in the left sidebar.
    *   **App Domains**: Add TWO domains here:
        1. `locked-events.vercel.app`
        2. `tmvujvnmociwuyefrtjq.supabase.co` (This is the domain Meta sees during the callback!)
    *   **Privacy Policy URL**: `https://locked-events.vercel.app/pages/legal/privacy-policy`
    *   **Category**: Choose an appropriate one (e.g., Lifestyle).
6.  Scroll to the bottom to **Platforms**, click **Add Platform**, select **Website**.
    *   **Site URL**: Set this to your **PRODUCTION** URL: `https://locked-events.vercel.app/`
    *   Click **Save Changes**.

> [!IMPORTANT]
> Keep the **Site URL** as your production domain. Facebook will still allow `localhost` testing as long as the app is in "Development" mode and the redirect URIs are correct.
7.  In the left sidebar, click on **Use cases**.
8.  Click **Add** (or **Customize**) next to **Authentication and account creation** (this is the new name for Facebook Login).
9.  Inside the Use Case, look for **Settings** or **Facebook Login > Settings**:
    *   **Valid OAuth Redirect URIs**: Add your Supabase callback URL:
        `https://tmvujvnmociwuyefrtjq.supabase.co/auth/v1/callback`
    *   Click **Save Changes**.
10. Go to **App Settings > Basic** (or **App Dashboard**) to find your **App ID** and **App Secret** (you'll need to click "Show" for the secret).

## 2. Supabase Configuration

1.  Go to your [Supabase Dashboard](https://supabase.com/dashboard) > **Authentication** > **Providers**.
2.  Find **Facebook** and enable it.
3.  **App ID**: Paste your Facebook App ID.
4.  **App Secret**: Paste your Facebook App Secret.
5.  Click **Save**.

## 3. Verify

1.  Go to your Sign In page and click the Facebook icon/button.
2.  You should be prompted to "Continue as [Your Name]".
3.  **Note**: While in "Development" mode in Meta, only authorized test users can log in. To allow everyone, you must eventually switch the app to **Live** mode in the top toggle of the Meta dashboard (this requires various policy URLs and sometimes a basic review).
