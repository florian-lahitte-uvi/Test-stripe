import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe'; // your Stripe instance (see below)
import { auth, db } from '@/lib/firebaseAdmin'; // Firebase Admin SDK

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { uid, priceId } = req.body;

  if (!uid || !priceId) {
    return res.status(400).json({ error: 'Missing uid or priceId' });
  }

  try {
    // 1. Get Firebase user
    const user = await auth.getUser(uid);
    const email = user.email;

    if (!email) {
      return res.status(400).json({ error: 'User has no email' });
    }

    // 2. Check if Stripe customer already exists in Firestore
    const profileRef = db.collection('profiles').doc(uid);
    const profileSnap = await profileRef.get();

    let customerId = profileSnap.exists ? profileSnap.data()?.stripeCustomerId : null;

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
          stripeCustomerId: customerId,
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

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('[Create Checkout Session Error]', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
