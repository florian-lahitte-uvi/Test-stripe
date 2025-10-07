import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe'; // your Stripe instance (see below)
import { auth, db } from '@/lib/firebaseAdmin'; // Firebase Admin SDK

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, priceId } = body;

    if (!uid || !priceId) {
      return NextResponse.json(
        { error: 'Missing uid or priceId' },
        { status: 400 }
      );
    }

    // 1. Get Firebase user
    const user = await auth.getUser(uid);
    const email = user.email;

    if (!email) {
      return NextResponse.json(
        { error: 'User has no email' },
        { status: 400 }
      );
    }

    // 2. Check if Stripe customer already exists in Firestore
    const profileRef = db.collection('profiles').doc(uid);
    const profileSnap = await profileRef.get();

    let customerId = profileSnap.exists ? profileSnap.data()?.subscription?.customerId : null;

    if (!customerId) {
      // 3. Create new Stripe customer
      const customer = await stripe.customers.create({
        email,
        metadata: { firebaseUID: uid },
      });

      customerId = customer.id;

      // 4. Save customer ID to Firestore profile
      await profileRef.set(
        {
          subscription: {
            customerId: customerId,
          }
        },
        { merge: true }
      );
    }

    // 5. Create Stripe Checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[Create Checkout Session Error]', error.message);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}