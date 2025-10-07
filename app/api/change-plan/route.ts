import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { auth, db } from '@/lib/firebaseAdmin';

// Plan hierarchy for determining upgrades/downgrades
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
      // If subscription is canceling, reactivate it
      if (stripeSubscription.cancel_at_period_end) {
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false,
        });

        // Update Firestore - clear any scheduled changes and reactivate
        await profileRef.update({
          'subscription.cancel_at_period_end': false,
          'subscription.canceled_at': null,
          'subscription.scheduled_plan_change': null, // Clear any scheduled changes
          'subscription.updatedAt': new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          changeType: 'reactivate',
          message: 'Your subscription has been reactivated!',
        });
      } else {
        // Clear any existing scheduled changes even if staying on same plan
        const hasScheduledChange = profileData?.subscription?.scheduled_plan_change;
        if (hasScheduledChange) {
          await profileRef.update({
            'subscription.scheduled_plan_change': null,
            'subscription.updatedAt': new Date().toISOString(),
          });
          
          return NextResponse.json({
            success: true,
            changeType: 'clear_schedule',
            message: 'Cancelled scheduled plan change. You will remain on your current plan.',
          });
        }
        
        return NextResponse.json(
          { error: 'You are already on this plan' },
          { status: 400 }
        );
      }
    }

    // Determine if upgrade or downgrade
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

    const isUpgrade = newPlan.level > currentPlan.level;
    const changeType = isUpgrade ? 'upgrade' : 'downgrade';

    // Validate and handle missing subscription period data
    if (!stripeSubscription.current_period_end) {
      console.error('Missing current_period_end from Stripe subscription, using fallback:', stripeSubscription);
      
      // Calculate fallback period end (30 days from created date or now)
      const createdDate = stripeSubscription.created ? new Date(stripeSubscription.created * 1000) : new Date();
      const fallbackPeriodEnd = Math.floor((createdDate.getTime() + (30 * 24 * 60 * 60 * 1000)) / 1000);
      
      stripeSubscription.current_period_end = fallbackPeriodEnd;
    }

    if (isUpgrade) {
      // UPGRADE: Immediate change with proration
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations', // Handle refund/charge automatically
        cancel_at_period_end: false, // Remove any pending cancellation
      });

      // Update Firestore - clear any scheduled changes since upgrade is immediate
      const updateData = {
        'subscription.plan': newPlan.name,
        'subscription.cancel_at_period_end': false,
        'subscription.canceled_at': null,
        'subscription.scheduled_plan_change': null, // Clear any existing scheduled changes
        'subscription.updatedAt': new Date().toISOString(),
      };
      
      await profileRef.update(updateData);

      return NextResponse.json({
        success: true,
        changeType: 'upgrade',
        message: `Upgraded to ${newPlan.name}! You now have access to all premium features. Any prorated charges will appear on your next invoice.`,
        currentPlan: currentPlan.name,
        newPlan: newPlan.name,
      });

    } else {
      // DOWNGRADE: Use Stripe Subscription Schedules for automatic handling
      try {
        // Create a subscription schedule that will automatically downgrade at period end
        const schedule = await stripe.subscriptionSchedules.create({
          from_subscription: subscriptionId,
          phases: [
            // Phase 1: Keep current plan until period end
            {
              items: [{ price: currentPriceId, quantity: 1 }],
              end_date: stripeSubscription.current_period_end,
            },
            // Phase 2: Switch to new plan automatically
            {
              items: [{ price: newPriceId, quantity: 1 }],
              // This phase will start automatically when phase 1 ends
            }
          ],
        });

        // Update Firestore - store schedule info for tracking
        await profileRef.update({
          'subscription.scheduled_plan_change': {
            new_plan: newPlan.name,
            new_price_id: newPriceId,
            effective_date: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            stripe_schedule_id: schedule.id, // Track the Stripe schedule
          },
          'subscription.cancel_at_period_end': false,
          'subscription.canceled_at': null,
          'subscription.updatedAt': new Date().toISOString(),
        });

        const effectiveDate = new Date(stripeSubscription.current_period_end * 1000).toLocaleDateString();

        return NextResponse.json({
          success: true,
          changeType: 'downgrade',
          message: `Scheduled downgrade to ${newPlan.name}! Stripe will automatically switch your plan on ${effectiveDate}. You'll keep your current ${currentPlan.name} features until then.`,
          currentPlan: currentPlan.name,
          newPlan: newPlan.name,
          effectiveDate: effectiveDate,
          scheduleId: schedule.id,
        });

      } catch (scheduleError: any) {
        console.error('Failed to create Stripe subscription schedule:', scheduleError);
        
        // Fallback: Store in Firebase and rely on webhook
        await profileRef.update({
          'subscription.scheduled_plan_change': {
            new_plan: newPlan.name,
            new_price_id: newPriceId,
            effective_date: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          },
          'subscription.cancel_at_period_end': false,
          'subscription.canceled_at': null,
          'subscription.updatedAt': new Date().toISOString(),
        });

        const effectiveDate = new Date(stripeSubscription.current_period_end * 1000).toLocaleDateString();

        return NextResponse.json({
          success: true,
          changeType: 'downgrade',
          message: `Scheduled downgrade to ${newPlan.name}! You'll keep your current ${currentPlan.name} features until ${effectiveDate}, then automatically switch to ${newPlan.name}.`,
          currentPlan: currentPlan.name,
          newPlan: newPlan.name,
          effectiveDate: effectiveDate,
        });
      }
    }

  } catch (error: any) {
    console.error('[Change Plan Error]', error.message);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}