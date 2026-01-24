import { NextResponse } from 'next/server';
import { parseNotebook } from '@/lib/notebook';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const notebookPath = searchParams.get('path');

  if (!notebookPath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  try {
    const cells = await parseNotebook(notebookPath);
    return NextResponse.json({ cells });
  } catch (error) {
    console.error('Failed to parse notebook:', error);
    return NextResponse.json({ error: 'Failed to parse notebook' }, { status: 500 });
  }
}
