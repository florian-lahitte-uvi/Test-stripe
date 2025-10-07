// pages/api/profile.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { auth, db } from '@/lib/firebaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { uid } = req.query;

  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    if (decoded.uid !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const doc = await db.collection('profiles').doc(uid as string).get();
    if (!doc.exists) return res.status(404).json({ error: 'Profile not found' });

    return res.status(200).json(doc.data());
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
