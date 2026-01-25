#!/usr/bin/env python3
"""
Populate INFORM Severity data into Supabase.
"""

import os
import sys
import pandas as pd
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

DATA_DIR = Path(__file__).parent.parent / "data" / "geo_mismatch"

def parse_number(value):
    """Parse a number from string."""
    if pd.isna(value) or value == '':
        return None
    try:
        return float(str(value).replace(',', ''))
    except:
        return None

def main():
    print("=" * 60)
    print("Populating INFORM Severity Data")
    print("=" * 60)
    print()
    
    inform_file = DATA_DIR / "inform_severity_master_2020_2025.csv"
    
    if not inform_file.exists():
        print(f"Error: {inform_file} not found")
        sys.exit(1)
    
    print(f"Loading {inform_file.name}...")
    df = pd.read_csv(inform_file, skiprows=[1])
    
    records = []
    for _, row in df.iterrows():
        iso3 = str(row.get('ISO3', '')).strip()
        if not iso3 or iso3 == 'nan':
            continue
        
        # Parse drivers
        drivers = []
        for col in df.columns:
            if 'driver' in col.lower() and pd.notna(row.get(col)):
                driver_val = str(row.get(col)).strip()
                if driver_val and driver_val != 'nan':
                    drivers.append(driver_val)
        
        record = {
            'iso3': iso3,
            'country_name': str(row.get('Country', '')),
            'crisis_type': str(row.get('Crisis type', '')) if pd.notna(row.get('Crisis type')) else None,
            'severity_index': parse_number(row.get('INFORM Severity Index')),
            'severity_category': str(row.get('INFORM Severity category.1', '')) if pd.notna(row.get('INFORM Severity category.1')) else None,
            'trend': str(row.get('Trend', '')) if pd.notna(row.get('Trend')) else None,
            'primary_driver': drivers[0] if drivers else None,
            'drivers': drivers if drivers else None,
            'region': str(row.get('Region', '')) if pd.notna(row.get('Region')) else None,
            'complexity': parse_number(row.get('Complexity')),
            'operating_env': parse_number(row.get('Operating Environment')),
            'year': int(row.get('Year', 2025)) if pd.notna(row.get('Year')) else 2025,
            'last_updated': None  # Could parse from file metadata
        }
        
        records.append(record)
    
    print(f"Found {len(records)} INFORM records")
    
    # Upload in batches using upsert
    print("Uploading INFORM data (upsert mode)...")
    batch_size = 100
    success_count = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        try:
            supabase.table('inform_severity').upsert(batch, on_conflict='iso3,year').execute()
            success_count += len(batch)
            print(f"  Uploaded batch {i // batch_size + 1}/{(len(records) - 1) // batch_size + 1}")
        except Exception as e:
            print(f"  Error: {e}")
            # Try one by one
            for record in batch:
                try:
                    supabase.table('inform_severity').upsert(record, on_conflict='iso3,year').execute()
                    success_count += 1
                except Exception as e2:
                    print(f"    Failed: {record['iso3']} {record['year']}: {e2}")
    
    print(f"\n✓ Successfully uploaded {success_count}/{len(records)} records")
    
    print()
    print("=" * 60)
    print("✓ INFORM data populated!")
    print("=" * 60)

if __name__ == "__main__":
    main()
