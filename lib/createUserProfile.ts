// lib/createUserProfile.ts

import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from './firebaseClient';

const db = getFirestore(app);

export async function createUserProfileIfNotExists(firstName?: string, lastName?: string, role?: 'Parent' | 'Family' | 'Medical') {
  const auth = getAuth(app);
  const user = auth.currentUser;

  if (!user) return;

  const userRef = doc(db, 'profiles', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const profileData: any = {
      uid: user.uid,
      email: user.email,
      createdAt: new Date().toISOString(),
      subscription: {
        active: false,
        plan: null,
      },
    };

    // Add additional fields if provided (for new signups)
    if (firstName) profileData.firstName = firstName;
    if (lastName) profileData.lastName = lastName;
    if (role) profileData.role = role;

    await setDoc(userRef, profileData);

    console.log('✅ Created new profile for user:', user.email);
  } else {
    console.log('✅ Profile already exists for:', user.email);
  }
}
