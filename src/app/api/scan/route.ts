import { NextResponse } from 'next/server';
import { scanAndAnalyzeAction } from '@/lib/actions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await scanAndAnalyzeAction(body);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
