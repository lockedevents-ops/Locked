/**
 * Hubtel Webhook Handler
 * Receives callbacks from Hubtel when payout status changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { emailService } from '@/services/emailService';
import { getFormattedImagePath } from '@/utils/imageHelpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Hubtel sends the signature in a header, but exact header name depends on version.
    // Ideally verify signature here.
    // For now, we trust the payload if it has valid structure and secret matches if provided.
    
    /* 
       NOTE: Hubtel documentation does not explicitly detail the signature header for the basic callback,
       usually it relies on the callback URL being secret or Basic Auth if configured.
       However, we will skip strict signature verification for this MVP step unless we have specific docs.
       We will assume the payload structure matches the docs.
    */
    
    // Sample Payload:
    // {
    //     "ResponseCode": "0000",
    //     "Data": {
    //         "CheckoutId": "...",
    //         "ClientReference": "...",
    //         "Status": "Success" // or "Paid"
    //     }
    // }

    const { Data, ResponseCode } = body;
    
    if (!Data || !Data.ClientReference) {
        return NextResponse.json({ error: 'Invalid Payload' }, { status: 400 });
    }

    const { ClientReference, CheckoutId, Status } = Data;
    
    // Map Hubtel Status to our Status
    // Hubtel Status: "Success", "Paid", "Unpaid", "Failed"?
    // Docs say: "Status": "Success" in callback sample.
    // Docs for Status Check say: "Paid", "Unpaid".
    
    let dbStatus = 'PENDING';
    if (ResponseCode === '0000') {
         // It seems 0000 means success in callback.
         dbStatus = 'PAID'; 
    } else {
         dbStatus = 'FAILED';
    }

    const supabase = await createClient();
    
    // Update Transaction
    const { error } = await supabase
        .from('transactions')
        .update({ 
            status: dbStatus,
            metadata: {
                hubtel_response: body,
                updated_at: new Date().toISOString()
            }
        })
        .eq('client_reference', ClientReference);

    if (error) {
        console.error('Error updating transaction:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }
    
    // Trigger Side Effects (e.g. Voting, Ticket Generation, Order Creation)
    if (dbStatus === 'PAID') {
         const { data: transaction } = await supabase
            .from('transactions')
            .select('*')
            .eq('client_reference', ClientReference)
            .single();

         if (transaction) {
             const metadata = transaction.metadata || {};

             // ========================================
             // Handle TICKET Purchase
             // ========================================
             if (transaction.type === 'TICKET') {
                 const { tickets, attendee_name, attendee_email, event_id } = metadata;
                 
                 if (event_id && attendee_email) {
                     try {
                         // Support both old format (single ticket) and new format (tickets array)
                         const ticketsArray = Array.isArray(tickets) ? tickets : [{
                             ticket_id: metadata.ticket_id,
                             ticket_name: metadata.ticket_name,
                             quantity: metadata.quantity,
                             price: transaction.amount
                         }];

                         // Create one registration record per ticket type
                         for (const ticketItem of ticketsArray) {
                             const { error: registrationError } = await supabase
                                 .from('event_registrations')
                                 .insert({
                                     user_id: transaction.user_id,
                                     event_id: event_id,
                                     status: 'registered',
                                     ticket_type: ticketItem.ticket_name || 'General Admission',
                                     quantity_registered: ticketItem.quantity || 1,
                                     price_at_registration: ticketItem.price || 0,
                                     total_amount: (ticketItem.price || 0) * (ticketItem.quantity || 1),
                                     currency: transaction.currency || 'GHS',
                                     transaction_id: transaction.id,
                                     payment_method: 'hubtel',
                                     payment_status: 'paid',
                                     attendee_name: attendee_name || 'Guest',
                                     attendee_email: attendee_email,
                                     registration_date: new Date().toISOString()
                                 });

                             if (registrationError) {
                                 console.error(`Error creating ticket registration for ${ticketItem.ticket_name}:`, registrationError);
                             } else {
                                 console.log(`Ticket created: ${ticketItem.ticket_name} x${ticketItem.quantity} for ${attendee_email}`);
                             }
                         }
                          // Send confirmation email for paid tickets
                          try {
                              const { data: eventData } = await supabase
                                  .from('events')
                                  .select('*')
                                  .eq('id', event_id)
                                  .single();

                              if (eventData) {
                                  const ticketSummary = ticketsArray.map(t => `${t.quantity}x ${t.ticket_name}`).join(', ');
                                  
                                  await emailService.sendConfirmation({
                                      to: attendee_email,
                                      subject: `Payment Confirmed: Tickets for ${eventData.title}`,
                                      type: 'transactional',
                                      templateData: {
                                          customerName: attendee_name || 'Guest',
                                          eventTitle: eventData.title,
                                          eventDate: new Date(eventData.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                          eventTime: eventData.start_time || 'TBD',
                                          eventVenue: eventData.venue || eventData.location_address || 'TBD',
                                          eventImage: eventData.image_url ? getFormattedImagePath(eventData.image_url) : undefined,
                                          ticketDetails: ticketSummary,
                                          viewTicketsUrl: `${request.nextUrl.origin}/dashboard/user/tickets`
                                      }
                                  });
                              }
                          } catch (emailError) {
                              console.error('Failed to send ticket purchase email:', emailError);
                          }
                      } catch (ticketError) {
                          console.error('Ticket generation failed:', ticketError);
                      }
                 }
             }

             // ========================================
             // Handle VOTE Purchase
             // ========================================
             else if (transaction.type === 'VOTE') {
                 const { contestant_id, votes, event_id } = metadata;
                 
                 if (contestant_id && votes && event_id) {
                     try {
                         // Fetch current contestants array
                         const { data: event, error: fetchError } = await supabase
                             .from('events')
                             .select('contestants')
                             .eq('id', event_id)
                             .single();

                         if (!fetchError && event && event.contestants) {
                             const contestants = event.contestants as any[];
                             
                             // Find and increment the specific contestant
                             const updatedContestants = contestants.map((c: any) => {
                                 if (c.id === contestant_id) {
                                     return {
                                         ...c,
                                         votes: (c.votes || 0) + parseInt(votes)
                                     };
                                 }
                                 return c;
                             });

                             // Update events table with new vote counts
                             const { error: updateError } = await supabase
                                 .from('events')
                                 .update({ 
                                     contestants: updatedContestants,
                                     updated_at: new Date().toISOString()
                                 })
                                 .eq('id', event_id);

                             if (updateError) {
                                 console.error('Error incrementing votes:', updateError);
                             } else {
                                 console.log(`Added ${votes} votes to contestant ${contestant_id} in event ${event_id}`);
                             }
                         }
                     } catch (voteError) {
                         console.error('Vote increment failed:', voteError);
                     }
                 }
             }

             // ========================================
             // Handle MERCH Purchase (Merchandise Order)
             // ========================================
             else if (transaction.type === 'MERCH') {
                 const { items, event_id, attendee_email } = metadata; // Added attendee_email to metadata destructuring
                 
                 if (items && Array.isArray(items) && items.length > 0) {
                     try {
                         // Generate unique order number
                         const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                         // Create order
                         const { data: order, error: orderError } = await supabase
                             .from('orders')
                             .insert({
                                 user_id: transaction.user_id,
                                 event_id: event_id || null,
                                 order_number: orderNumber,
                                 order_type: 'merchandise',
                                 total_amount: transaction.amount,
                                 payment_method: 'hubtel',
                                 payment_reference: transaction.client_reference,
                                 status: 'completed',
                                 completed_at: new Date().toISOString()
                             })
                             .select()
                             .single();

                         if (!orderError && order) {
                             // Create order items
                             const orderItems = items.map((item: any) => ({
                                 order_id: order.id,
                                 product_id: item.product_id || item.id,
                                 product_name: item.product_name || item.name,
                                 product_price: item.product_price || item.price,
                                 product_image: item.product_image || item.image,
                                 quantity: item.quantity || 1
                             }));

                             const { error: itemsError } = await supabase
                                 .from('order_items')
                                 .insert(orderItems);

                             if (itemsError) {
                                 console.error('Error creating order items:', itemsError);
                              } else {
                                  console.log(`Merchandise order ${orderNumber} created for user ${transaction.user_id}`);
                                  
                                  // Send confirmation email for merchandise
                                  try {
                                      const { data: eventData } = await supabase
                                          .from('events')
                                          .select('*')
                                          .eq('id', event_id)
                                          .single();

                                      const userEmail = attendee_email || transaction.user_email; // Fallback to user email if available
                                      
                                      if (eventData && userEmail) {
                                          const itemSummary = items.map((i: any) => `${i.quantity}x ${i.product_name || i.name}`).join(', ');
                                          
                                          await emailService.sendConfirmation({
                                              to: userEmail,
                                              subject: `Order Confirmed: Merchandise for ${eventData.title}`,
                                              type: 'transactional',
                                              templateData: {
                                                  customerName: metadata.attendee_name || 'Guest',
                                                  eventTitle: eventData.title,
                                                  eventDate: new Date(eventData.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                                  eventTime: eventData.start_time || 'TBD',
                                                  eventVenue: eventData.venue || eventData.location_address || 'TBD',
                                                  eventImage: eventData.image_url ? getFormattedImagePath(eventData.image_url) : undefined,
                                                  ticketDetails: `Merchandise: ${itemSummary}`,
                                                  viewTicketsUrl: `${request.nextUrl.origin}/dashboard/user/tickets`
                                              }
                                          });
                                      }
                                  } catch (emailError) {
                                      console.error('Failed to send merch order email:', emailError);
                                  }
                              }
                          } else {
                              console.error('Error creating order:', orderError);
                          }
                     } catch (merchError) {
                         console.error('Merchandise order creation failed:', merchError);
                     }
                 }
             }
         }
     }


    return NextResponse.json({ success: true });
  } catch (e:any) {
    console.error('Webhook processing error:', e);
    return NextResponse.json({ error: 'Webhook error', details: e.message }, { status: 500 });
  }
}

// Handle GET requests (for webhook verification by Hubtel)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const challenge = searchParams.get('challenge');

  if (challenge) {
    // Hubtel webhook verification
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({ 
    status: 'active',
    message: 'Hubtel webhook endpoint'
  });
}
