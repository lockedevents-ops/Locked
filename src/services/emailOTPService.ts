/**
 * Email OTP Service
 * ==================
 * Handles generation, sending, and verification of email-based
 * one-time passwords for 2FA authentication
 */

import { createClient } from '@/lib/supabase/server/server';
import { Resend } from 'resend';

interface VerificationCode {
  id: string;
  user_id: string;
  code: string;
  type: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

// Lazy-load Resend client to avoid build-time initialization
let resendClient: Resend | null = null;
function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export const emailOTPService = {
  /**
   * Generate a 6-digit OTP code
   */
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  /**
   * Send OTP code via email
   */
  async sendOTP(userId: string, email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();
      
      // Generate code
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store code in database
      const { error: dbError } = await supabase
        .from('verification_codes')
        .insert({
          user_id: userId,
          code,
          type: 'email_2fa',
          expires_at: expiresAt.toISOString()
        });

      if (dbError) {
        console.error('Failed to store verification code:', dbError);
        return { success: false, error: 'Failed to generate verification code' };
      }

      // Send email via Resend (lazy-load client)
      const resend = getResendClient();
      const { error: emailError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@locked.com',
        to: email,
        subject: 'Your 2FA Verification Code',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #000; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Two-Factor Authentication</h1>
              </div>
              
              <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; margin-bottom: 20px;">
                  You requested a verification code to sign in to your account.
                </p>
                
                <div style="background-color: #fff; border: 2px solid #000; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                  <p style="font-size: 14px; color: #666; margin: 0 0 10px 0;">Your verification code is:</p>
                  <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 10px 0; font-family: 'Courier New', monospace; color: #000;">
                    ${code}
                  </p>
                </div>
                
                <p style="font-size: 14px; color: #666; margin-top: 20px;">
                  This code will expire in <strong>10 minutes</strong>.
                </p>
                
                <p style="font-size: 14px; color: #666; margin-top: 20px;">
                  If you didn't request this code, please ignore this email or contact support if you have concerns.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="font-size: 12px; color: #999;">
                  This is an automated email from Locked. Please do not reply to this email.
                </p>
              </div>
            </body>
          </html>
        `,
        text: `Your 2FA verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`
      });

      if (emailError) {
        console.error('Failed to send verification email:', emailError);
        return { success: false, error: 'Failed to send verification email' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in sendOTP:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  /**
   * Verify OTP code
   */
  async verifyOTP(userId: string, code: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const supabase = await createClient();

      // Find unused, non-expired code
      const { data: verificationCode, error: fetchError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('code', code)
        .eq('type', 'email_2fa')
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching verification code:', fetchError);
        return { valid: false, error: 'Database error' };
      }

      if (!verificationCode) {
        return { valid: false, error: 'Invalid or expired code' };
      }

      // Mark code as used
      const { error: updateError } = await supabase
        .from('verification_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', verificationCode.id);

      if (updateError) {
        console.error('Error updating verification code:', updateError);
        return { valid: false, error: 'Failed to mark code as used' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error in verifyOTP:', error);
      return { valid: false, error: 'An unexpected error occurred' };
    }
  },

  /**
   * Clean up expired codes for a user
   */
  async cleanupExpiredCodes(userId: string): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase
        .from('verification_codes')
        .delete()
        .eq('user_id', userId)
        .or(`expires_at.lt.${new Date().toISOString()},used_at.not.is.null`);
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
    }
  },

  /**
   * Get active verification code count for rate limiting
   */
  async getActiveCodeCount(userId: string): Promise<number> {
    try {
      const supabase = await createClient();
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { count, error } = await supabase
        .from('verification_codes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('type', 'email_2fa')
        .gte('created_at', fiveMinutesAgo);

      if (error) {
        console.error('Error counting codes:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getActiveCodeCount:', error);
      return 0;
    }
  }
};
