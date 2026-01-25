#!/usr/bin/env python3
"""
Enhanced Supabase population script that includes all latest datasets:
- Original HNO, HRP, population, INFORM data
- New aggregated analysis datasets (hrp_inform_aggregated, country_year_severity_funding)
- Challenge 1 outputs (outlier projects, cluster efficiency framework)
"""

import os
import sys
import pandas as pd
import numpy as np
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Data directories
DATA_DIR = Path(__file__).parent.parent / "data" / "geo_mismatch"
OUTPUTS_DIR = Path(__file__).parent.parent / "outputs"

# Country name mapping
COUNTRY_NAMES = {
    'AFG': 'Afghanistan', 'BFA': 'Burkina Faso', 'CAF': 'Central African Republic',
    'CMR': 'Cameroon', 'COD': 'DR Congo', 'COL': 'Colombia', 'ETH': 'Ethiopia',
    'HTI': 'Haiti', 'IRQ': 'Iraq', 'KEN': 'Kenya', 'LBY': 'Libya', 'MLI': 'Mali',
    'MMR': 'Myanmar', 'MOZ': 'Mozambique', 'NER': 'Niger', 'NGA': 'Nigeria',
    'PAK': 'Pakistan', 'PSE': 'Palestine', 'SDN': 'Sudan', 'SOM': 'Somalia',
    'SSD': 'South Sudan', 'SYR': 'Syria', 'TCD': 'Chad', 'UKR': 'Ukraine',
    'VEN': 'Venezuela', 'YEM': 'Yemen', 'ZWE': 'Zimbabwe'
}


def parse_number(value):
    """Parse a number from string, handling commas and empty values."""
    if pd.isna(value) or value == '':
        return None
    try:
        return float(str(value).replace(',', ''))
    except:
        return None


def upload_to_supabase(table_name, records, batch_size=100, upsert_key=None):
    """Upload records to Supabase in batches."""
    if not records:
        print(f"  No records to upload to {table_name}")
        return
    
    print(f"Uploading {len(records)} records to {table_name}...")
    
    # Delete existing records for the years being uploaded (if not using upsert)
    if not upsert_key and 'year' in records[0]:
        years = set(r['year'] for r in records if 'year' in r)
        for year in years:
            try:
                supabase.table(table_name).delete().eq('year', year).execute()
            except Exception as e:
                print(f"  Warning: Could not delete existing {year} records: {e}")
    
    # Upload in batches
    success_count = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        try:
            if upsert_key:
                supabase.table(table_name).upsert(batch, on_conflict=upsert_key).execute()
            else:
                supabase.table(table_name).insert(batch).execute()
            success_count += len(batch)
            print(f"  Uploaded batch {i // batch_size + 1}/{(len(records) - 1) // batch_size + 1}")
        except Exception as e:
            print(f"  Error uploading batch: {e}")
            # Try one by one
            for record in batch:
                try:
                    if upsert_key:
                        supabase.table(table_name).upsert(record, on_conflict=upsert_key).execute()
                    else:
                        supabase.table(table_name).insert(record).execute()
                    success_count += 1
                except Exception as e2:
                    print(f"  Error uploading record: {e2}")
    
    print(f"  ✓ Uploaded {success_count}/{len(records)} to {table_name}")


def load_aggregated_analysis_data():
    """Load the pre-aggregated analysis datasets."""
    print("\n" + "=" * 60)
    print("Loading Aggregated Analysis Datasets")
    print("=" * 60)
    
    records = []
    
    # 1. Country-year severity funding (comprehensive analysis table)
    file_path = DATA_DIR / "country_year_severity_funding.csv"
    if file_path.exists():
        print(f"\nLoading {file_path.name}...")
        df = pd.read_csv(file_path)
        
        for _, row in df.iterrows():
            record = {
                'iso3': str(row.get('iso3', '')),
                'country': str(row.get('country', '')),
                'year': int(row.get('year', 2024)),
                'population': int(parse_number(row.get('population')) or 0),
                'in_need': int(parse_number(row.get('in_need')) or 0),
                'targeted': int(parse_number(row.get('targeted')) or 0),
                'need_rate': float(parse_number(row.get('need_rate')) or 0),
                'coverage_rate': float(parse_number(row.get('coverage_rate')) or 0),
                'usd_per_in_need': float(parse_number(row.get('usd_per_in_need')) or 0),
                'req_sum': float(parse_number(row.get('req_sum')) or 0),
                'mismatch': float(parse_number(row.get('mismatch')) or 0),
                'mismatch_severity': float(parse_number(row.get('mismatch_severity')) or 0),
                'severity_index': parse_number(row.get('severity_index')),
                'crisis_type': str(row.get('crisis_type', '')) if pd.notna(row.get('crisis_type')) else None,
                'primary_driver': str(row.get('primary_driver', '')) if pd.notna(row.get('primary_driver')) else None,
                'region': str(row.get('region', '')) if pd.notna(row.get('region')) else None,
            }
            records.append(record)
        
        print(f"  Found {len(records)} country-year records")
        upload_to_supabase('country_year_analysis', records, upsert_key='iso3,year')
    
    # 2. HRP-INFORM aggregated
    file_path = DATA_DIR / "hrp_inform_aggregated_for_analysis.csv"
    if file_path.exists():
        print(f"\nLoading {file_path.name}...")
        df = pd.read_csv(file_path)
        
        records = []
        for _, row in df.iterrows():
            record = {
                'iso3': str(row.get('iso3', '')),
                'country': str(row.get('country', '')),
                'year': int(row.get('year', 2024)),
                'revised_requirements': float(parse_number(row.get('revised_requirements')) or 0),
                'severity_index': parse_number(row.get('severity_index')),
                'crisis_type': str(row.get('crisis_type', '')) if pd.notna(row.get('crisis_type')) else None,
                'primary_driver': str(row.get('primary_driver', '')) if pd.notna(row.get('primary_driver')) else None,
                'region': str(row.get('region', '')) if pd.notna(row.get('region')) else None,
            }
            records.append(record)
        
        print(f"  Found {len(records)} HRP-INFORM records")
        upload_to_supabase('hrp_inform_aggregated', records, upsert_key='iso3,year')


def load_challenge1_outputs():
    """Load Challenge 1 analysis outputs."""
    print("\n" + "=" * 60)
    print("Loading Challenge 1 Outputs")
    print("=" * 60)
    
    # 1. Outlier projects
    file_path = OUTPUTS_DIR / "challenge1_outlier_projects.csv"
    if file_path.exists():
        print(f"\nLoading {file_path.name}...")
        df = pd.read_csv(file_path)
        
        records = []
        for _, row in df.iterrows():
            record = {
                'cluster_primary': str(row.get('cluster_primary', '')),
                'pooled_fund_name': str(row.get('PooledFundName', '')),
                'allocation_year': int(row.get('AllocationYear', 2024)),
                'organization_name': str(row.get('OrganizationName', '')),
                'project_title': str(row.get('ProjectTitle', '')),
                'budget_usd': parse_number(row.get('budget_usd')),
                'beneficiaries_total': parse_number(row.get('beneficiaries_total')),
                'cpb_usd_per_beneficiary': parse_number(row.get('cpb_usd_per_beneficiary')),
                'cpb_percentile_in_cluster': parse_number(row.get('cpb_percentile_in_cluster')),
                'z_log10_cpb': parse_number(row.get('z_log10_cpb')),
                'flag_iqr_high': bool(row.get('flag_iqr_high', False)),
                'flag_z_high': bool(row.get('flag_z_high', False)),
                'flag_pct_high': bool(row.get('flag_pct_high', False)),
                'flag_small_denominator': bool(row.get('flag_small_denominator', False)),
                'flag_beneficiaries_gt_country_pop': bool(row.get('flag_beneficiaries_gt_country_pop', False)),
                'outlier_reason': str(row.get('outlier_reason', '')),
                'cluster_evidence': str(row.get('cluster_evidence', '')),
            }
            records.append(record)
        
        print(f"  Found {len(records)} outlier projects")
        upload_to_supabase('challenge1_outlier_projects', records)
    
    # 2. Cluster efficiency framework
    file_path = OUTPUTS_DIR / "challenge1_cluster_efficiency_framework.csv"
    if file_path.exists():
        print(f"\nLoading {file_path.name}...")
        df = pd.read_csv(file_path)
        
        records = []
        for _, row in df.iterrows():
            record = {
                'rank': int(row.get('rank', 0)),
                'cluster_primary': str(row.get('cluster_primary', '')),
                'n_projects': int(row.get('n_projects', 0)),
                'median_cpb_usd': parse_number(row.get('median_cpb_usd')),
                'p10_cpb_usd': parse_number(row.get('p10_cpb_usd')),
                'p90_cpb_usd': parse_number(row.get('p90_cpb_usd')),
                'outlier_rate': parse_number(row.get('outlier_rate')),
                'efficiency_score': parse_number(row.get('efficiency_score')),
            }
            records.append(record)
        
        print(f"  Found {len(records)} cluster efficiency records")
        upload_to_supabase('challenge1_cluster_efficiency', records)


def load_inform_cleaned():
    """Load the cleaned INFORM severity data."""
    print("\n" + "=" * 60)
    print("Loading Cleaned INFORM Severity Data")
    print("=" * 60)
    
    file_path = DATA_DIR / "inform_severity_cleaned.csv"
    if file_path.exists():
        print(f"\nLoading {file_path.name}...")
        df = pd.read_csv(file_path)
        
        records = []
        for _, row in df.iterrows():
            iso3 = str(row.get('iso3', '')).strip()
            if not iso3 or iso3 == 'nan':
                continue
            
            record = {
                'iso3': iso3,
                'country_name': str(row.get('country_name', '')),
                'crisis_type': str(row.get('crisis_type', '')) if pd.notna(row.get('crisis_type')) else None,
                'severity_index': parse_number(row.get('severity_index')),
                'severity_category': str(row.get('severity_category', '')) if pd.notna(row.get('severity_category')) else None,
                'trend': str(row.get('trend', '')) if pd.notna(row.get('trend')) else None,
                'primary_driver': str(row.get('primary_driver', '')) if pd.notna(row.get('primary_driver')) else None,
                'region': str(row.get('region', '')) if pd.notna(row.get('region')) else None,
                'complexity': parse_number(row.get('complexity')),
                'operating_env': parse_number(row.get('operating_env')),
                'year': int(row.get('year', 2025)) if pd.notna(row.get('year')) else 2025,
            }
            
            records.append(record)
        
        print(f"  Found {len(records)} cleaned INFORM records")
        upload_to_supabase('inform_severity', records, upsert_key='iso3,year')


def main():
    """Main execution function."""
    print("=" * 60)
    print("Populating Supabase with ALL Latest Datasets")
    print("=" * 60)
    print()
    print("This script will upload:")
    print("  1. Aggregated analysis datasets (country_year_severity_funding, etc.)")
    print("  2. Challenge 1 outputs (outlier projects, cluster efficiency)")
    print("  3. Cleaned INFORM severity data")
    print()
    
    try:
        # Load and upload new aggregated datasets
        load_aggregated_analysis_data()
        
        # Load and upload Challenge 1 outputs
        load_challenge1_outputs()
        
        # Load and upload cleaned INFORM data
        load_inform_cleaned()
        
        print()
        print("=" * 60)
        print("✓ All latest datasets uploaded successfully!")
        print("=" * 60)
        print()
        print("Next steps:")
        print("1. Update dashboard API routes to use new tables")
        print("2. Test the new data endpoints")
        print("3. Deploy to production")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
