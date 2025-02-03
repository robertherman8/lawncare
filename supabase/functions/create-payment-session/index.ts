import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import Stripe from 'https://esm.sh/stripe@14.19.0?target=deno';

const stripe = new Stripe('sk_test_51QoSHiG4X4rQBoW6rnGZQ7FfYpbojNCSdBfAmwhXiuzot2eOCEJsJkcfEJFz3JW3USyUtIXRVyGDUz0az1Me6ut900POgAJpHV', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers,
      status: 204,
    });
  }

  try {
    // Get the Authorization header
    const authHeader = req.headers.get('Authorization') || '';
    const apiKey = req.headers.get('apikey') || '';

    if (!authHeader || !apiKey) {
      throw new Error('Missing authentication');
    }

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    console.log('Auth check result:', { success: !!user, error: !!authError });

    if (authError || !user) {
      throw new Error(authError?.message || 'Invalid authentication');
    }

    const { invoiceId, amount } = await req.json();
    console.log('Request parameters:', { invoiceId: !!invoiceId, amount: !!amount });

    if (!invoiceId || !amount) {
      throw new Error('Missing required parameters');
    }

    // Get invoice details
    const { data: invoice, error: dbError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('status', 'sent')
      .single();
      
    console.log('Invoice lookup result:', { found: !!invoice, error: !!dbError });

    if (dbError || !invoice) {
      throw new Error(dbError?.message || 'Invoice not found or not in sent status');
    }

    if (invoice.customer_id !== user.id) {
      console.log('Authorization mismatch:', { 
        invoiceCustomerId: invoice.customer_id, 
        userId: user.id 
      });
      throw new Error('Unauthorized access to invoice');
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoiceId}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/payment/cancel`,
      billing_address_collection: 'auto',
      submit_type: 'pay',
      metadata: {
        invoiceId,
        customerId: user.id,
      }
    });

    console.log('Stripe session created:', { sessionId: session.id });

    return new Response(
      JSON.stringify({ sessionId: session.id }),
      { headers, status: 200 }
    );

  } catch (error) {
    console.error('Payment session error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { headers, status: 400 }
    );
  }
});