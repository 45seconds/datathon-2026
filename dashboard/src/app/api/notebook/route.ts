import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Single allowed notebook - DSC Datathon Final Submission
const ALLOWED_NOTEBOOK = 'notebooks/DSC_Datathon.ipynb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const notebookPath = searchParams.get('path');

  if (!notebookPath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  // Security: Validate the path is allowed (only DSC_Datathon.ipynb)
  if (notebookPath !== ALLOWED_NOTEBOOK) {
    return NextResponse.json({ error: 'Invalid notebook path' }, { status: 400 });
  }

  try {
    // Storage layout can be either:
    // - DSC_Datathon.ipynb (root of bucket)
    // - notebooks/DSC_Datathon.ipynb (nested prefix in bucket)
    // Try both to be robust across deployments.
    const storageCandidates = Array.from(
      new Set([notebookPath.replace(/^notebooks\//, ''), notebookPath].filter(Boolean)),
    );

    let blob: Blob | null = null;
    let lastError: unknown = null;

    for (const storagePath of storageCandidates) {
      const { data, error } = await supabase.storage.from('notebooks').download(storagePath);
      if (data) {
        blob = data;
        lastError = null;
        break;
      }
      if (error) lastError = error;
    }

    if (!blob) {
      console.error('Supabase Storage error:', lastError);
      return NextResponse.json({ error: 'Failed to load notebook from storage' }, { status: 500 });
    }

    // Parse notebook JSON
    const content = await blob.text();
    const notebook = JSON.parse(content);
    
    return NextResponse.json({ notebook });
  } catch (error) {
    console.error('Failed to load notebook:', error);
    return NextResponse.json({ error: 'Failed to load notebook' }, { status: 500 });
  }
}
