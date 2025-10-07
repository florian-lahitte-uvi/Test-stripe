import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid } = body;

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
    const scheduledChange = profileData?.subscription?.scheduled_plan_change;

    if (!scheduledChange) {
      return NextResponse.json({
        success: true,
        message: 'No scheduled changes to clear',
        hadScheduledChange: false,
      });
    }

    // Clear the scheduled change
    await profileRef.update({
      'subscription.scheduled_plan_change': null,
      'subscription.updatedAt': new Date().toISOString(),
    });

    console.log(`Cleared scheduled change for user ${uid}:`, scheduledChange);

    return NextResponse.json({
      success: true,
      message: 'Scheduled plan change cleared successfully',
      hadScheduledChange: true,
      clearedChange: scheduledChange,
    });

  } catch (error: any) {
    console.error('[Clear Scheduled Change Error]', error.message);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}