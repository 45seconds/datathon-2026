#!/usr/bin/env python3
"""
Clean the DSC_Datathon.ipynb notebook:
1. Remove appended sections (Geo-Mismatch Analysis and Linear Regression EDA)
2. Remove emojis from all cells
3. Upload to Supabase storage
"""

import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv(Path(__file__).parent.parent / '.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Emoji pattern - comprehensive regex to match emojis
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F1E0-\U0001F1FF"  # flags (iOS)
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F680-\U0001F6FF"  # transport & map symbols
    "\U0001F700-\U0001F77F"  # alchemical symbols
    "\U0001F780-\U0001F7FF"  # Geometric Shapes Extended
    "\U0001F800-\U0001F8FF"  # Supplemental Arrows-C
    "\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
    "\U0001FA00-\U0001FA6F"  # Chess Symbols
    "\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
    "\U00002702-\U000027B0"  # Dingbats
    "\U000024C2-\U0001F251"
    "\U00002600-\U000026FF"  # Misc symbols
    "\U00002700-\U000027BF"  # Dingbats
    "\U0001f926-\U0001f937"
    "\U00010000-\U0010ffff"
    "\u200d"
    "\u2640-\u2642"
    "\u2600-\u2B55"
    "\u23cf"
    "\u23e9"
    "\u231a"
    "\ufe0f"  # dingbats
    "\u3030"
    "\u2139"  # info symbol
    "\u2714"  # check mark
    "\u2705"  # white check mark
    "]+",
    flags=re.UNICODE
)

# Common emoji characters to remove explicitly
COMMON_EMOJIS = ['🔬', '📊', '🚀', '🔮', '💡', 'ℹ️', '✅', '❌', '⚠️', '🎯', '📈', '📉', '🔍', '💾', '📁', '🗂️', '📋', '🏆', '⭐', '🌟', '💪', '🤝', '👍', '👎', '🔗', '📌', '🎉', '🔒', '🔓', '⚡', '🔥', '💥', '✨', '🌍', '🌎', '🌏', 'ℹ']


def remove_emojis(text: str) -> str:
    """Remove emojis from text."""
    # First remove common emojis explicitly
    for emoji in COMMON_EMOJIS:
        text = text.replace(emoji, '')
    # Then use regex for any remaining
    text = EMOJI_PATTERN.sub('', text)
    # Clean up any double spaces left behind
    text = re.sub(r'  +', ' ', text)
    # Clean up lines that start with just whitespace after emoji removal
    lines = text.split('\n')
    cleaned_lines = []
    for line in lines:
        # If line is just whitespace, keep it as-is (might be intentional)
        # But strip leading spaces if the line content was removed
        cleaned_lines.append(line.rstrip())
    return '\n'.join(cleaned_lines)


def clean_cell_source(source):
    """Clean emojis from cell source (can be list or string)."""
    if isinstance(source, list):
        cleaned = []
        for line in source:
            cleaned.append(remove_emojis(line))
        return cleaned
    elif isinstance(source, str):
        return remove_emojis(source)
    return source


def clean_cell_outputs(outputs):
    """Clean emojis from cell outputs."""
    if not outputs:
        return outputs
    
    cleaned_outputs = []
    for output in outputs:
        output_copy = dict(output)
        
        # Clean text outputs
        if 'text' in output_copy:
            if isinstance(output_copy['text'], list):
                output_copy['text'] = [remove_emojis(t) for t in output_copy['text']]
            elif isinstance(output_copy['text'], str):
                output_copy['text'] = remove_emojis(output_copy['text'])
        
        # Clean data outputs (like stdout)
        if 'data' in output_copy:
            data = output_copy['data']
            if 'text/plain' in data:
                if isinstance(data['text/plain'], list):
                    data['text/plain'] = [remove_emojis(t) for t in data['text/plain']]
                elif isinstance(data['text/plain'], str):
                    data['text/plain'] = remove_emojis(data['text/plain'])
        
        cleaned_outputs.append(output_copy)
    
    return cleaned_outputs


def find_appended_section_index(cells):
    """Find the index where appended sections begin."""
    for i, cell in enumerate(cells):
        source = cell.get('source', [])
        if isinstance(source, list):
            source_text = ''.join(source)
        else:
            source_text = source
        
        # Look for the appended markers
        if '# --- APPENDED:' in source_text:
            return i
    
    return None  # No appended section found


def clean_notebook(notebook_path: Path) -> dict:
    """Clean the notebook by removing appended sections and emojis."""
    print(f"Reading notebook: {notebook_path}")
    
    with open(notebook_path, 'r', encoding='utf-8') as f:
        notebook = json.load(f)
    
    cells = notebook.get('cells', [])
    print(f"Original cell count: {len(cells)}")
    
    # Find where appended sections start
    appended_idx = find_appended_section_index(cells)
    
    if appended_idx is not None:
        print(f"Found appended section at cell index {appended_idx}")
        # Keep only cells before the appended section
        cells = cells[:appended_idx]
        print(f"Cell count after removing appended sections: {len(cells)}")
    else:
        print("No appended sections found")
    
    # Clean emojis from all cells
    emoji_count = 0
    for cell in cells:
        # Clean source
        original_source = cell.get('source', [])
        if isinstance(original_source, list):
            original_text = ''.join(original_source)
        else:
            original_text = original_source
        
        cell['source'] = clean_cell_source(cell.get('source', []))
        
        if isinstance(cell['source'], list):
            cleaned_text = ''.join(cell['source'])
        else:
            cleaned_text = cell['source']
        
        if original_text != cleaned_text:
            emoji_count += 1
        
        # Clean outputs for code cells
        if cell.get('cell_type') == 'code' and 'outputs' in cell:
            cell['outputs'] = clean_cell_outputs(cell.get('outputs', []))
    
    print(f"Cleaned emojis from {emoji_count} cells")
    
    notebook['cells'] = cells
    return notebook


def upload_to_supabase(notebook: dict, filename: str):
    """Upload the cleaned notebook to Supabase storage."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("ERROR: Supabase credentials not found in .env file")
        return False
    
    print(f"\nConnecting to Supabase...")
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Convert notebook to JSON string
    notebook_json = json.dumps(notebook, indent=1)
    notebook_bytes = notebook_json.encode('utf-8')
    
    print(f"Notebook size: {len(notebook_bytes) / 1024:.1f} KB")
    
    # Upload to notebooks bucket (at root level, not in a subfolder)
    bucket_name = "notebooks"
    file_path = filename  # Just the filename, not notebooks/filename
    
    print(f"Uploading to {bucket_name}/{file_path}...")
    
    try:
        # Try to remove existing file first
        try:
            client.storage.from_(bucket_name).remove([file_path])
            print(f"Removed existing file: {file_path}")
        except Exception:
            pass  # File might not exist
        
        # Upload new file
        result = client.storage.from_(bucket_name).upload(
            file_path,
            notebook_bytes,
            file_options={"content-type": "application/json"}
        )
        print(f"Upload successful!")
        return True
        
    except Exception as e:
        print(f"Upload error: {e}")
        # Try upsert instead
        try:
            result = client.storage.from_(bucket_name).update(
                file_path,
                notebook_bytes,
                file_options={"content-type": "application/json"}
            )
            print(f"Update successful!")
            return True
        except Exception as e2:
            print(f"Update also failed: {e2}")
            return False


def main():
    # Path to the notebook
    repo_root = Path(__file__).parent.parent
    notebook_path = repo_root / 'notebooks' / 'DSC_Datathon.ipynb'
    
    if not notebook_path.exists():
        print(f"ERROR: Notebook not found at {notebook_path}")
        return
    
    # Clean the notebook
    cleaned_notebook = clean_notebook(notebook_path)
    
    # Save the cleaned notebook locally
    print(f"\nSaving cleaned notebook to {notebook_path}...")
    with open(notebook_path, 'w', encoding='utf-8') as f:
        json.dump(cleaned_notebook, f, indent=1)
    print("Saved!")
    
    # Upload to Supabase
    success = upload_to_supabase(cleaned_notebook, 'DSC_Datathon.ipynb')
    
    if success:
        print("\n✓ Notebook cleaned and uploaded successfully!")
    else:
        print("\n✗ Upload failed - notebook was saved locally but not uploaded")


if __name__ == '__main__':
    main()
