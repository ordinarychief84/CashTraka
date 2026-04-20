import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { suggestionService } from '@/lib/services/suggestion.service';
import { requireFeature } from '@/lib/gate';

/** GET /api/suggestions — get smart suggestions for the user */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const blocked = requireFeature(user, 'suggestions');
    if (blocked) return blocked;

    const suggestions = await suggestionService.generate(user.id);
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error('GET /api/suggestions error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
