import { checkAndSendReminders } from '@/lib/services/reminder.service';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // In a real app, you would pass the current user's organizationId
  // or this would be called by a cron job for all organizations.
  
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
  }

  try {
    const sentReminders = await checkAndSendReminders(organizationId);
    return NextResponse.json({ success: true, count: sentReminders?.length || 0 });
  } catch (error: any) {
    console.error('Erreur Reminder Check:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
