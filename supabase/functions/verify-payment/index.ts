import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import Stripe from 'https://esm.sh/stripe@14.19.0?target=deno';

const stripe = new Stripe('sk_test_51QoSHiG4X4rQBoW6rnGZQ7FfYpbojNCSdBfAmwhXiuzot2eOCEJsJkcfEJFz3JW3USyUtIXRVyGDUz0az1Me6ut900POgAJpHV', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    const { sessionId } = await req.json();

    // Retrieve the session to get payment status
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const invoiceId = session.metadata?.invoiceId;

    if (!invoiceId) {
      throw new Error('Invoice ID not found in session metadata');
    }

    if (session.payment_status === 'paid') {
      // Update invoice status in Supabase
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          stripe_invoice_id: session.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .eq('status', 'sent');

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({ 
          status: 'success',
          message: 'Payment verified and invoice updated'
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    return new Response(
      JSON.stringify({ 
        status: 'error',
        message: 'Payment not completed'
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        status: 'error',
        message: error.message
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});