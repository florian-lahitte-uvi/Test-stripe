// lib/createUserProfile.ts

import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from './firebaseClient';

const db = getFirestore(app);

export async function createUserProfileIfNotExists() {
  const auth = getAuth(app);
  const user = auth.currentUser;

  if (!user) return;

  const userRef = doc(db, 'profiles', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      createdAt: new Date().toISOString(),
      subscription: {
        active: false,
        plan: null,
      },
    });

    console.log('✅ Created new profile for user:', user.email);
  } else {
    console.log('✅ Profile already exists for:', user.email);
  }
}
