/**
 * Simple utility to generate QR codes for a specific user's registrations
 * Useful for testing after adding the database columns
 */

import { createClient } from '@/lib/supabase/client/client';
import QRCode from 'qrcode';

/**
 * Generate a unique 5-digit alphanumeric ticket ID
 */
function generateTicketId(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Generate QR code data URL
 */
async function generateQRCode(
  registrationId: string,
  eventId: string, 
  attendeeEmail: string,
  ticketId: string
): Promise<string | null> {
  try {
    const qrData = {
      registrationId,
      eventId,
      attendeeEmail,
      ticketId,
      timestamp: new Date().toISOString(),
      checksum: Math.random().toString(36).substring(2, 15)
    };
    
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
}

/**
 * Generate QR codes for a specific user's registrations
 */
export async function generateQRCodesForUser(userEmail: string): Promise<void> {
  // ✅ SECURITY: Removed sensitive user email logging
  
  const supabase = createClient();
  
  try {
    // Get user's registrations without QR codes
    const { data: registrations, error } = await supabase
      .from('event_registrations')
      .select('id, event_id, attendee_email')
      .eq('attendee_email', userEmail)
      .or('ticket_id.is.null,qr_code.is.null');
    
    if (error) {
      console.error('❌ Error fetching registrations:', error);
      return;
    }
    
    if (!registrations || registrations.length === 0) {
      console.log('✅ No registrations need QR codes');
      return;
    }
    
    console.log(`📋 Found ${registrations.length} registrations to process`);
    
    for (const registration of registrations) {
      const ticketId = generateTicketId();
      const qrCode = await generateQRCode(
        registration.id,
        registration.event_id,
        registration.attendee_email,
        ticketId
      );
      
      const updateData: any = { ticket_id: ticketId };
      if (qrCode) {
        updateData.qr_code = qrCode;
      }
      
      const { error: updateError } = await supabase
        .from('event_registrations')
        .update(updateData)
        .eq('id', registration.id);
      
      if (updateError) {
        console.error(`❌ Error updating registration ${registration.id}:`, updateError);
      } else {
        console.log(`✅ Generated QR code for registration ${registration.id} (Ticket: ${ticketId})`);
      }
    }
    
    console.log('🎉 QR code generation completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// For testing in browser console:
// generateQRCodesForUser('testuser2@gmail.com');
