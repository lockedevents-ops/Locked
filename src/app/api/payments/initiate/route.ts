
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server/server";
import { hubtelService } from "@/services/hubtelService";
import { TransactionType } from "@/types/transaction";
import { isHubtelNetworkEnabled } from "@/lib/network";
import { incrementRuntimeCounter } from "@/lib/runtimeTelemetry";

export async function POST(request: NextRequest) {
    try {
        if (!isHubtelNetworkEnabled()) {
            incrementRuntimeCounter('hubtel.blocked.payments.initiate');
            return NextResponse.json(
                { error: "Payment provider temporarily unavailable" },
                { status: 503 }
            );
        }

        const supabase = await createClient();
        
        // Check for authenticated user (optional depending on flow, but recommended)
        const { data: { user } } = await supabase.auth.getUser();

        const body = await request.json();
        const { 
            type, 
            amount, 
            eventId, 
            organizerId, 
            items, // for metadata
            description,
            returnUrl, // Optional override
            cancellationUrl, // Optional override
            metadata
        } = body;

        if (!amount || !type || !description) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Generate a unique client reference
        const clientReference = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Create Pending Transaction in DB
        const { data: transaction, error: dbError } = await supabase
            .from("transactions")
            .insert({
                user_id: user?.id || null, // Allow guest checkout if needed, or enforce
                event_id: eventId || null,
                organizer_id: organizerId || null,
                type: type as TransactionType,
                amount: amount,
                currency: "GHS",
                status: "PENDING",
                client_reference: clientReference,
                metadata: {
                    items: items || [],
                    description,
                    ...metadata
                }
            })
            .select()
            .single();

        if (dbError) {
            console.error("Database Error:", dbError);
            return NextResponse.json({ error: "Failed to create transaction record" }, { status: 500 });
        }

        // Initiate Payment with Hubtel
        try {
            const hubtelResponse = await hubtelService.initiatePayment({
                totalAmount: amount,
                description: description,
                clientReference: clientReference,
                returnUrl: returnUrl,
                cancellationUrl: cancellationUrl
            });

            // Update transaction with Hubtel checkout ID
            if (hubtelResponse.data.checkoutId) {
                await supabase
                    .from("transactions")
                    .update({ hubtel_checkout_id: hubtelResponse.data.checkoutId })
                    .eq("id", transaction.id);
            }

            return NextResponse.json({ 
                success: true, 
                checkoutUrl: hubtelResponse.data.checkoutUrl,
                checkoutId: hubtelResponse.data.checkoutId,
                clientReference: clientReference
            });

        } catch (hubtelError: any) {
            console.error("Hubtel Error:", hubtelError);
            // Mark transaction as failed? Or just leave as pending/abandoned?
            await supabase
                .from("transactions")
                .update({ status: "FAILED", metadata: { ...transaction.metadata, error: hubtelError.message } })
                .eq("id", transaction.id);

            return NextResponse.json({ error: "Failed to initiate payment with provider", details: hubtelError.message }, { status: 502 });
        }

    } catch (error: any) {
        console.error("Unexpected Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
