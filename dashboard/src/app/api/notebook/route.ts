import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Allowed notebook paths for security
const ALLOWED_NOTEBOOKS = [
  'notebooks/DSC_Datathon.ipynb',
  'notebooks/geo_mismatch.ipynb',
  'notebooks/geo_mismatch_2.ipynb',
  'notebooks/DSC_Datathon_2026_Starter_Notebook.ipynb',
  'notebooks/challenge1_smart_beneficiary_targeting_validation.ipynb',
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const notebookPath = searchParams.get('path');

  if (!notebookPath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  // Security: Validate the path is allowed
  if (!ALLOWED_NOTEBOOKS.includes(notebookPath)) {
    return NextResponse.json({ error: 'Invalid notebook path' }, { status: 400 });
  }

  try {
    // Convert path: notebooks/file.ipynb -> file.ipynb
    const storagePath = notebookPath.replace('notebooks/', '');
    
    // Fetch from Supabase Storage
    const { data, error } = await supabase.storage
      .from('notebooks')
      .download(storagePath);

    if (error || !data) {
      console.error('Supabase Storage error:', error);
      return NextResponse.json({ error: 'Failed to load notebook from storage' }, { status: 500 });
    }

    // Parse notebook JSON
    const content = await data.text();
    const notebook = JSON.parse(content);
    
    return NextResponse.json({ notebook });
  } catch (error) {
    console.error('Failed to load notebook:', error);
    return NextResponse.json({ error: 'Failed to load notebook' }, { status: 500 });
  }
}
