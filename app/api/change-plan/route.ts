import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { auth, db } from '@/lib/firebaseAdmin';

// Plan hierarchy for upgrades only
const PLAN_HIERARCHY = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER!]: { name: 'Starter', level: 1, price: 4.99 },
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS!]: { name: 'Plus', level: 2, price: 6.99 },
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PRO!]: { name: 'Family Pro', level: 3, price: 14.99 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, newPriceId } = body;

    if (!uid || !newPriceId) {
      return NextResponse.json(
        { error: 'Missing uid or newPriceId' },
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

    // Get current subscription from Stripe with expanded data
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product']
    });
    const stripeSubscription = subscription as any;
    
    // Get current price ID
    const currentPriceId = subscription.items.data[0]?.price?.id;
    
    if (!currentPriceId) {
      return NextResponse.json(
        { error: 'Could not determine current plan' },
        { status: 400 }
      );
    }

    // Check if same plan
    if (currentPriceId === newPriceId) {
      return NextResponse.json(
        { error: 'You are already on this plan' },
        { status: 400 }
      );
    }

    // Validate plans exist
    const currentPlan = PLAN_HIERARCHY[currentPriceId as keyof typeof PLAN_HIERARCHY];
    const newPlan = PLAN_HIERARCHY[newPriceId as keyof typeof PLAN_HIERARCHY];

    if (!currentPlan || !newPlan) {
      console.error('Plan hierarchy lookup failed!');
      console.error('Current price ID:', currentPriceId, 'Found:', currentPlan);
      console.error('New price ID:', newPriceId, 'Found:', newPlan);
      
      return NextResponse.json(
        { 
          error: 'Invalid plan configuration',
          debug: {
            currentPriceId,
            newPriceId,
            currentPlan: currentPlan || null,
            newPlan: newPlan || null,
            availablePlans: Object.keys(PLAN_HIERARCHY)
          }
        },
        { status: 400 }
      );
    }

    // Only allow upgrades (higher level plans)
    if (newPlan.level <= currentPlan.level) {
      return NextResponse.json(
        { error: 'Downgrades are not supported. To switch to a lower plan, please cancel your current subscription and resubscribe after it expires.' },
        { status: 400 }
      );
    }

    // UPGRADE: Immediate change with proration
    await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations', // Handle refund/charge automatically
      cancel_at_period_end: false, // Remove any pending cancellation
    });

    // Update Firestore
    await profileRef.update({
      'subscription.plan': newPlan.name,
      'subscription.cancel_at_period_end': false,
      'subscription.canceled_at': null,
      'subscription.updatedAt': new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      changeType: 'upgrade',
      message: `Upgraded to ${newPlan.name}! You now have access to all premium features. Any prorated charges will appear on your next invoice.`,
      currentPlan: currentPlan.name,
      newPlan: newPlan.name,
    });

  } catch (error: any) {
    console.error('[Change Plan Error]', error.message);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}