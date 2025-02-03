import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function createPaymentSession(invoiceId: string, amount: number, customerId: string, successUrl: string, cancelUrl: string) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer: customerId,
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
    metadata: {
      invoiceId,
    },
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
  });
  
  return session;
}

export async function handlePaymentSuccess(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const invoiceId = session.metadata?.invoiceId;

  if (!invoiceId) {
    throw new Error('Invoice ID not found in session metadata');
  }

  return {
    invoiceId,
    paymentStatus: session.payment_status,
    amountPaid: session.amount_total,
  };
}

export async function createStripeInvoice(customerId: string, amount: number, description: string) {
  try {
    // Create a payment intent instead of an invoice
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      description: description,
      metadata: {
        customerId: customerId
      }
    });

    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      status: paymentIntent.status
    };
  } catch (error) {
    console.error('Stripe error:', error);
    throw new Error('Failed to create Stripe invoice');
  }
}