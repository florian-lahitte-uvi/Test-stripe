import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { auth, db } from '@/lib/firebaseAdmin';
// Removed updateDoc import as it's not available in firebase-admin

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { sessionId, uid } = req.body;
  if (!sessionId || !uid) {
    return res.status(400).json({ error: 'Missing sessionId or uid' });
  }

  try {
    console.log('Retrieving session:', sessionId, 'for user:', uid);
    
    // Retrieve the Checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.items.data.price'],
    });

    console.log('Session retrieved:', {
      mode: session.mode,
      payment_status: session.payment_status,
      subscription: session.subscription ? 'exists' : 'null'
    });

    if (!session.subscription) {
      console.error('No subscription found in session');
      return res.status(400).json({ error: 'No subscription found in session' });
    }

    const subscription = session.subscription as any; // Stripe.Subscription type
    const planName = subscription.items.data[0].price.nickname || subscription.items.data[0].price.id;

    const result = { 
      plan: planName,
      subscriptionId: subscription.id,
      status: subscription.status,
      customerId: subscription.customer,
    };

    console.log('Returning subscription data:', result);

    // Just return the subscription details, don't update Firestore here
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to confirm subscription' });
  }
}
