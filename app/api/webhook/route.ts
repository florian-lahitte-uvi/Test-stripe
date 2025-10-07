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

    // Handle different subscription events
    if (event.type === 'customer.subscription.updated') {
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

      // Get price details to determine new plan name
      const priceId = subscription.items.data[0]?.price?.id;
      if (priceId) {
        const price = await stripe.prices.retrieve(priceId);
        const product = price.product ? await stripe.products.retrieve(price.product as string) : null;
        
        const planName = product?.name || 'Unknown Plan';
        
        // Update the actual plan in Firebase
        const updateData: any = {
          'subscription.plan': planName,
          'subscription.status': subscription.status,
          'subscription.updatedAt': new Date().toISOString(),
        };

        // If there was a scheduled plan change and it matches the new plan, clear it
        if (userData.subscription?.scheduled_plan_change) {
          const scheduledPlan = userData.subscription.scheduled_plan_change.new_plan;
          if (scheduledPlan === planName) {
            updateData['subscription.scheduled_plan_change'] = null;
          }
        }

        await profileRef.update(updateData);
      }
    }



    // Handle subscription schedule events - Stripe automatically changing plans
    else if (event.type === 'subscription_schedule.updated' || event.type === 'subscription_schedule.completed') {
      const schedule = event.data.object as any;
      const subscriptionId = schedule.subscription;
      
      if (subscriptionId) {
        // Find user by subscription ID
        const profilesRef = db.collection('profiles');
        const querySnapshot = await profilesRef
          .where('subscription.subscriptionId', '==', subscriptionId)
          .limit(1)
          .get();

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          
          // Check if this matches a scheduled change we have stored
          const scheduledChange = userData.subscription?.scheduled_plan_change;
          if (scheduledChange && scheduledChange.stripe_schedule_id === schedule.id) {
            // Update Firebase to reflect the new plan
            await userDoc.ref.update({
              'subscription.plan': scheduledChange.new_plan,
              'subscription.scheduled_plan_change': null, // Clear the scheduled change
              'subscription.updatedAt': new Date().toISOString(),
            });
          }
        }
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