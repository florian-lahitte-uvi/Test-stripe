import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { auth, db } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, uid } = body;
    
    if (!sessionId || !uid) {
      return NextResponse.json(
        { error: 'Missing sessionId or uid' },
        { status: 400 }
      );
    }
    
    // Retrieve the Checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.items.data.price'],
    });

    if (!session.subscription) {
      console.error('No subscription found in session');
      return NextResponse.json(
        { error: 'No subscription found in session' },
        { status: 400 }
      );
    }

    const subscription = session.subscription as any; // Stripe.Subscription type
    const priceId = subscription.items.data[0].price.id;
    const productId = subscription.items.data[0].price.product;
    
    // Fetch the product separately to get the plan name
    const product = await stripe.products.retrieve(productId as string);
    const planName = product.name || 'Unknown Plan';

    const result = { 
      plan: planName,
      subscriptionId: subscription.id,
      status: subscription.status,
      customerId: subscription.customer,
    };

    // Just return the subscription details, don't update Firestore here
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to confirm subscription' },
      { status: 500 }
    );
  }
}