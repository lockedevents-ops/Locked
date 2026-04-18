/**
 * Generate QR codes for existing registrations that don't have them
 * Run this after adding the ticket_id and qr_code columns to the database
 */

import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Generate a unique 5-digit alphanumeric ticket ID
 */
function generateTicketId(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing characters (0, O, 1, I)
  let result = ''
  for (let i = 0; i < 5; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

/**
 * Ensure ticket ID is unique by checking database
 */
async function generateUniqueTicketId(): Promise<string> {
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    const ticketId = generateTicketId()
    
    // Check if this ticket ID already exists
    const { data, error } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('ticket_id', ticketId)
      .single()
      
    // If no record found, this ID is available
    if (error && error.code === 'PGRST116') {
      return ticketId
    }
    
    attempts++
  }
  
  // Fallback with timestamp if all attempts fail
  return generateTicketId() + Date.now().toString().slice(-2)
}

/**
 * Generate a unique QR code for a registration
 */
async function generateQRCode(
  registrationId: string, 
  eventId: string, 
  attendeeEmail: string, 
  ticketId: string
): Promise<string | null> {
  try {
    // Create a unique identifier for check-in
    const qrData = {
      registrationId,
      eventId,
      attendeeEmail,
      ticketId,
      timestamp: new Date().toISOString(),
      checksum: Math.random().toString(36).substring(2, 15)
    }
    
    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating QR code:', error)
    return null
  }
}

/**
 * Main function to generate QR codes for existing registrations
 */
async function generateQRCodesForExistingRegistrations() {
  console.log('🚀 Starting QR code generation for existing registrations...')
  
  try {
    // Get all registrations without ticket_id or qr_code
    const { data: registrations, error } = await supabase
      .from('event_registrations')
      .select('id, event_id, attendee_email, attendee_name, ticket_type')
      .or('ticket_id.is.null,qr_code.is.null')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching registrations:', error)
      return
    }
    
    if (!registrations || registrations.length === 0) {
      console.log('✅ No registrations need QR codes')
      return
    }
    
    console.log(`📋 Found ${registrations.length} registrations that need QR codes`)
    
    let successCount = 0
    let errorCount = 0
    
    for (const registration of registrations) {
      try {
        console.log(`🔄 Processing registration ${registration.id}...`)
        
        // Generate unique ticket ID
        const ticketId = await generateUniqueTicketId()
        
        // Generate QR code
        const qrCode = await generateQRCode(
          registration.id,
          registration.event_id,
          registration.attendee_email,
          ticketId
        )
        
        // Update registration with ticket ID and QR code
        const updateData: any = { ticket_id: ticketId }
        if (qrCode) {
          updateData.qr_code = qrCode
        }
        
        const { error: updateError } = await supabase
          .from('event_registrations')
          .update(updateData)
          .eq('id', registration.id)
        
        if (updateError) {
          console.error(`❌ Error updating registration ${registration.id}:`, updateError)
          errorCount++
        } else {
          console.log(`✅ Generated QR code for registration ${registration.id} (Ticket: ${ticketId})`)
          successCount++
        }
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ Error processing registration ${registration.id}:`, error)
        errorCount++
      }
    }
    
    console.log(`\n🎉 QR code generation completed!`)
    console.log(`✅ Success: ${successCount} registrations`)
    console.log(`❌ Errors: ${errorCount} registrations`)
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

// Run the script if this file is executed directly
if (require.main === module) {
  generateQRCodesForExistingRegistrations()
    .then(() => {
      console.log('🏁 Script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Script failed:', error)
      process.exit(1)
    })
}

export { generateQRCodesForExistingRegistrations }
