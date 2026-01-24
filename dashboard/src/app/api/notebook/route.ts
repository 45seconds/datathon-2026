import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const notebookPath = searchParams.get('path');

  if (!notebookPath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  try {
    const fullPath = path.join(process.cwd(), '..', notebookPath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const notebook = JSON.parse(content);
    
    return NextResponse.json({ notebook });
  } catch (error) {
    console.error('Failed to load notebook:', error);
    return NextResponse.json({ error: 'Failed to load notebook' }, { status: 500 });
  }
}
