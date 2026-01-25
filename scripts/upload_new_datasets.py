#!/usr/bin/env python3
"""
Upload new datasets to Supabase Storage (optimized for large files).
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

PROJECT_ROOT = Path(__file__).parent.parent

def upload_file(bucket: str, file_path: Path, storage_path: str, max_size_mb=10):
    """Upload a file to Supabase Storage with size check."""
    try:
        file_size_mb = file_path.stat().st_size / (1024 * 1024)
        
        if file_size_mb > max_size_mb:
            print(f"  ⊘ Skipped (too large: {file_size_mb:.1f}MB): {storage_path}")
            return False
        
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
        print(f"  ✓ Uploaded ({file_size_mb:.1f}MB): {storage_path}")
        return True
    except Exception as e:
        print(f"  ✗ Failed {storage_path}: {e}")
        return False

def main():
    print("=" * 60)
    print("Uploading New Datasets to Supabase Storage")
    print("=" * 60)
    print()
    
    # Files to upload (prioritized list)
    files_to_upload = [
        # Aggregated analysis datasets (small, high-value)
        ("data/geo_mismatch/country_year_severity_funding.csv", "geo_mismatch/country_year_severity_funding.csv"),
        ("data/geo_mismatch/hrp_inform_aggregated_for_analysis.csv", "geo_mismatch/hrp_inform_aggregated_for_analysis.csv"),
        ("data/geo_mismatch/hrp_inform_severity_intersection.csv", "geo_mismatch/hrp_inform_severity_intersection.csv"),
        ("data/geo_mismatch/inform_severity_cleaned.csv", "geo_mismatch/inform_severity_cleaned.csv"),
        
        # Challenge 1 outputs
        ("outputs/challenge1_outlier_projects.csv", "outputs/challenge1_outlier_projects.csv"),
        ("outputs/challenge1_cluster_efficiency_framework.csv", "outputs/challenge1_cluster_efficiency_framework.csv"),
        
        # Additional population data (smaller files)
        ("data/geo_mismatch/cod_population_admin0.csv", "geo_mismatch/cod_population_admin0.csv"),
        ("data/geo_mismatch/cod_population_admin2.csv", "geo_mismatch/cod_population_admin2.csv"),
        ("data/geo_mismatch/cod_population_admin3.csv", "geo_mismatch/cod_population_admin3.csv"),
        ("data/geo_mismatch/cod_population_admin4.csv", "geo_mismatch/cod_population_admin4.csv"),
    ]
    
    success_count = 0
    skip_count = 0
    fail_count = 0
    
    for local_path, storage_path in files_to_upload:
        full_path = PROJECT_ROOT / local_path
        if full_path.exists():
            result = upload_file("datasets", full_path, storage_path, max_size_mb=15)
            if result:
                success_count += 1
            elif result is False:
                skip_count += 1
            else:
                fail_count += 1
        else:
            print(f"  ⊘ Not found: {local_path}")
            skip_count += 1
    
    print()
    print("=" * 60)
    print(f"✓ Upload complete!")
    print(f"  Uploaded: {success_count}")
    print(f"  Skipped: {skip_count}")
    print(f"  Failed: {fail_count}")
    print("=" * 60)
    print()
    print("Note: Large files (>15MB) like cod_population_admin1.csv")
    print("were skipped. These can be accessed via direct file download.")

if __name__ == "__main__":
    main()
