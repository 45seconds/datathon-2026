import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const notebookPath = searchParams.get('path');

  if (!notebookPath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  // In production, notebook files are not available on the filesystem
  // Notebooks should be viewed from the GitHub repository or local development
  return NextResponse.json({ 
    error: 'Notebook viewer not available in production.',
    message: 'View analysis notebooks in the GitHub repository: https://github.com/45seconds/datathon-2026/tree/main/notebooks'
  }, { status: 503 });

  /* Original filesystem code - disabled for production
  try {
    const fullPath = path.join(process.cwd(), '..', notebookPath);
    const { promises as fs } = await import('fs');
    const content = await fs.readFile(fullPath, 'utf-8');
    const notebook = JSON.parse(content);
    
    return NextResponse.json({ notebook });
  } catch (error) {
    console.error('Failed to load notebook:', error);
    return NextResponse.json({ error: 'Failed to load notebook' }, { status: 500 });
  }
  */
}
