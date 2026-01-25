#!/usr/bin/env python3
"""
Upload CSV files and notebooks to Supabase Storage for dashboard file serving.
"""

import os
import sys
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "geo_mismatch"
PROJECT_TARGETING_DIR = PROJECT_ROOT / "data" / "project_targeting"
OUTPUTS_DIR = PROJECT_ROOT / "outputs"
NOTEBOOKS_DIR = PROJECT_ROOT / "notebooks"

def create_bucket_if_not_exists(bucket_name: str):
    """Create a storage bucket if it doesn't exist."""
    try:
        buckets = supabase.storage.list_buckets()
        if not any(b['name'] == bucket_name for b in buckets):
            supabase.storage.create_bucket(bucket_name, options={"public": True})
            print(f"✓ Created bucket: {bucket_name}")
        else:
            print(f"✓ Bucket exists: {bucket_name}")
    except Exception as e:
        print(f"  Warning: {e}")

def upload_file(bucket: str, file_path: Path, storage_path: str):
    """Upload a file to Supabase Storage."""
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # Delete if exists
        try:
            supabase.storage.from_(bucket).remove([storage_path])
        except:
            pass
        
        # Upload
        supabase.storage.from_(bucket).upload(
            storage_path,
            content,
            file_options={"content-type": "text/csv" if file_path.suffix == '.csv' else "application/json"}
        )
        print(f"  ✓ Uploaded: {storage_path}")
    except Exception as e:
        print(f"  ✗ Failed to upload {storage_path}: {e}")

def main():
    print("=" * 60)
    print("Uploading Files to Supabase Storage")
    print("=" * 60)
    print()
    
    # Create buckets
    create_bucket_if_not_exists("datasets")
    create_bucket_if_not_exists("notebooks")
    
    print()
    print("Uploading geo_mismatch CSV files...")
    print("-" * 60)
    
    # Upload geo_mismatch CSV files
    csv_files = list(DATA_DIR.glob("*.csv"))
    for csv_file in csv_files:
        upload_file("datasets", csv_file, f"geo_mismatch/{csv_file.name}")
    
    print()
    print("Uploading project_targeting CSV files...")
    print("-" * 60)
    
    # Upload project_targeting CSV files (from zip)
    import zipfile
    zip_path = PROJECT_TARGETING_DIR / "project_targeting_data.zip"
    if zip_path.exists():
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # Extract CSV files temporarily
            temp_dir = PROJECT_ROOT / ".temp_extract"
            temp_dir.mkdir(exist_ok=True)
            
            for file_info in zip_ref.filelist:
                if file_info.filename.endswith('.csv') and not file_info.filename.startswith('__MACOSX'):
                    # Extract to temp
                    zip_ref.extract(file_info, temp_dir)
                    extracted_path = temp_dir / file_info.filename
                    
                    # Upload with original filename
                    filename = Path(file_info.filename).name
                    upload_file("datasets", extracted_path, f"project_targeting/{filename}")
            
            # Cleanup
            import shutil
            shutil.rmtree(temp_dir)
    else:
        print(f"  Warning: {zip_path} not found, skipping project_targeting files")
    
    print()
    print("Uploading Challenge 1 outputs...")
    print("-" * 60)
    
    # Upload Challenge 1 outputs
    if OUTPUTS_DIR.exists():
        output_files = list(OUTPUTS_DIR.glob("challenge1_*.csv"))
        for output_file in output_files:
            upload_file("datasets", output_file, f"outputs/{output_file.name}")
    else:
        print(f"  Warning: {OUTPUTS_DIR} not found, skipping outputs")
    
    print()
    print("Uploading notebooks...")
    print("-" * 60)
    
    # Upload notebooks
    notebook_files = list(NOTEBOOKS_DIR.glob("*.ipynb"))
    for nb_file in notebook_files:
        upload_file("notebooks", nb_file, nb_file.name)
    
    print()
    print("=" * 60)
    print("✓ Upload complete!")
    print("=" * 60)
    print()
    print("Files are now accessible at:")
    print(f"  Datasets: {SUPABASE_URL}/storage/v1/object/public/datasets/")
    print(f"  Notebooks: {SUPABASE_URL}/storage/v1/object/public/notebooks/")

if __name__ == "__main__":
    main()
