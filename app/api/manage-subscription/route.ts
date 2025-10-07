import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { auth, db } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json(
        { error: 'Missing user ID' },
        { status: 400 }
      );
    }

    // Verify Firebase user
    const user = await auth.getUser(uid);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user profile from Firestore
    const profileRef = db.collection('profiles').doc(uid);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const profileData = profileSnap.data();
    const subscriptionId = profileData?.subscription?.subscriptionId;

    if (!subscriptionId) {
      // Return null data instead of error when no subscription exists
      return NextResponse.json({
        subscription: null,
        plan: null,
        hasSubscription: false
      });
    }

    // Get subscription details from Stripe with expanded data
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product']
    });
    
    // Cast to access all properties properly
    const stripeSubscription = subscription as any;

    // Get price details
    const priceId = subscription.items.data[0]?.price?.id;
    const price = priceId ? await stripe.prices.retrieve(priceId) : null;
    const product = price?.product ? await stripe.products.retrieve(price.product as string) : null;

    // Validate and handle missing timestamp data
    if (!stripeSubscription.current_period_end) {
      console.error('Missing current_period_end from Stripe subscription, using fallback');
      
      // Calculate fallback period end (30 days from created date or now)
      const createdDate = stripeSubscription.created ? new Date(stripeSubscription.created * 1000) : new Date();
      const fallbackPeriodEnd = Math.floor((createdDate.getTime() + (30 * 24 * 60 * 60 * 1000)) / 1000);
      
      stripeSubscription.current_period_end = fallbackPeriodEnd;
      stripeSubscription.current_period_start = stripeSubscription.created || Math.floor(Date.now() / 1000);
    }

    // Get scheduled plan change from Firestore profile
    const scheduledPlanChange = profileData?.subscription?.scheduled_plan_change || null;

    return NextResponse.json({
      subscription: {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        current_period_start: stripeSubscription.current_period_start,
        current_period_end: stripeSubscription.current_period_end,
        cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
        canceled_at: stripeSubscription.canceled_at,
        created: stripeSubscription.created || Math.floor(Date.now() / 1000),
        scheduled_plan_change: scheduledPlanChange,
      },
      plan: {
        name: product?.name || 'Unknown Plan',
        amount: price?.unit_amount ? price.unit_amount / 100 : 0,
        currency: price?.currency || 'usd',
        interval: price?.recurring?.interval || 'month',
      },
    });

  } catch (error: any) {
    console.error('[Get Subscription Error]', error.message);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, action } = body;

    if (!uid || !action) {
      return NextResponse.json(
        { error: 'Missing uid or action' },
        { status: 400 }
      );
    }

    // Verify Firebase user
    const user = await auth.getUser(uid);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user profile from Firestore
    const profileRef = db.collection('profiles').doc(uid);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const profileData = profileSnap.data();
    const subscriptionId = profileData?.subscription?.subscriptionId;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    if (action === 'cancel') {
      // Cancel subscription at period end
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      // Update Firestore
      await profileRef.update({
        'subscription.cancel_at_period_end': true,
        'subscription.canceled_at': new Date().toISOString(),
        'subscription.updatedAt': new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: 'Subscription will be canceled at the end of the current billing period',
        subscription: {
          id: subscription.id,
          cancel_at_period_end: (subscription as any).cancel_at_period_end,
          current_period_end: (subscription as any).current_period_end,
        },
      });

    } else if (action === 'reactivate') {
      // Reactivate subscription (undo cancellation)
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      // Update Firestore
      await profileRef.update({
        'subscription.cancel_at_period_end': false,
        'subscription.canceled_at': null,
        'subscription.updatedAt': new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: 'Subscription has been reactivated',
        subscription: {
          id: subscription.id,
          cancel_at_period_end: (subscription as any).cancel_at_period_end,
        },
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "cancel" or "reactivate"' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('[Manage Subscription Error]', error.message);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}