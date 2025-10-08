import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebaseAdmin';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: 'Missing signature or webhook secret' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle subscription updates and cancellations
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any;
      const customerId = subscription.customer;

      // Find user by Stripe customer ID
      const profilesRef = db.collection('profiles');
      const querySnapshot = await profilesRef
        .where('subscription.customerId', '==', customerId)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        return NextResponse.json({ received: true });
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const profileRef = userDoc.ref;

      // Get price details to determine plan name
      const priceId = subscription.items.data[0]?.price?.id;
      if (priceId) {
        const price = await stripe.prices.retrieve(priceId);
        const product = price.product ? await stripe.products.retrieve(price.product as string) : null;
        
        const planName = product?.name || 'Unknown Plan';
        
        // Update Firebase with subscription details
        await profileRef.update({
          'subscription.plan': planName,
          'subscription.status': subscription.status,
          'subscription.cancel_at_period_end': subscription.cancel_at_period_end || false,
          'subscription.canceled_at': subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          'subscription.cancel_subscription_day': subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          'subscription.updatedAt': new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}