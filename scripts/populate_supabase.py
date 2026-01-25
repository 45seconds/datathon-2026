#!/usr/bin/env python3
"""
Populate Supabase database with humanitarian crisis data for the dashboard.
This script processes CSV files and uploads them to Supabase tables.
"""

import os
import sys
import argparse
import pandas as pd
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

# Data directory
DATA_DIR = Path(__file__).parent.parent / "data" / "geo_mismatch"

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
    if pd.isna(value):
        return 0
    s = str(value).strip()
    if s == '' or s.lower() == 'nan':
        return 0
    try:
        return float(s.replace(',', ''))
    except Exception:
        return 0


def load_population_data():
    """Load and process population data."""
    print("Loading population data...")
    pop_file = DATA_DIR / "cod_population_admin0.csv"
    df = pd.read_csv(pop_file, skiprows=[1])  # Skip schema row
    
    # Filter for total population
    df_total = df[
        (df['Population_group'] == 'T_TL') &
        (df['Gender'] == 'all') &
        (df['Age_range'] == 'all')
    ].copy()
    
    # Prepare records
    records = []
    for _, row in df_total.iterrows():
        iso3 = row['ISO3']
        pop = parse_number(row['Population'])
        ref_year = int(row['Reference_year']) if pd.notna(row['Reference_year']) else 2024
        
        if iso3 and pop > 0:
            records.append({
                'iso3': iso3,
                'country': COUNTRY_NAMES.get(iso3, iso3),
                'population': int(pop),
                'reference_year': ref_year
            })
    
    print(f"  Found {len(records)} population records")
    return records


def load_hrp_data():
    """Load and process Humanitarian Response Plans."""
    print("Loading HRP data...")
    hrp_file = DATA_DIR / "humanitarian-response-plans.csv"
    df = pd.read_csv(hrp_file, skiprows=[1])
    
    records = []
    seen_codes = set()
    for _, row in df.iterrows():
        code_val = row.get('code', '')
        if pd.isna(code_val):
            continue
        code = str(code_val).strip()
        if not code:
            continue
        # Some legacy rows contain duplicated short codes (e.g., R01/R02).
        # The CSV is sorted newest-first, so keep the first occurrence.
        if code in seen_codes:
            continue
        seen_codes.add(code)

        locations_val = row.get('locations', '')
        years_val = row.get('years', '')
        locations = str(locations_val).strip() if pd.notna(locations_val) else ''
        years = str(years_val).strip() if pd.notna(years_val) else ''
        
        # Parse locations and years
        location_list = [loc.strip() for loc in locations.split('|')] if locations else []
        year_list = [int(y.strip()) for y in years.split('|') if y.strip().isdigit()] if years else []
        
        records.append({
            'code': code,
            'internal_id': str(row.get('internalId', '')).strip() if pd.notna(row.get('internalId')) else '',
            'start_date': row.get('startDate') if pd.notna(row.get('startDate')) else None,
            'end_date': row.get('endDate') if pd.notna(row.get('endDate')) else None,
            'plan_version': str(row.get('planVersion', '')).strip() if pd.notna(row.get('planVersion')) else '',
            'categories': str(row.get('categories', '')).strip() if pd.notna(row.get('categories')) else '',
            'locations': location_list,
            'years': year_list,
            'orig_requirements': parse_number(row.get('origRequirements')),
            'revised_requirements': parse_number(row.get('revisedRequirements'))
        })
    
    print(f"  Found {len(records)} HRP records")
    return records


def load_hno_data(year):
    """Load and process Humanitarian Needs Overview data for a specific year."""
    print(f"Loading HNO data for {year}...")
    hno_file = DATA_DIR / f"hpc_hno_{year}.csv"
    
    if not hno_file.exists():
        print(f"  Warning: {hno_file} not found, skipping")
        return []
    
    df = pd.read_csv(hno_file, skiprows=[1], low_memory=False)
    
    records = []
    for _, row in df.iterrows():
        category_val = row.get('Category', '')
        cluster_val = row.get('Cluster', '')
        description_val = row.get('Description', '')

        records.append({
            'country_iso3': str(row.get('Country ISO3', '')).strip() if pd.notna(row.get('Country ISO3')) else '',
            'admin1_pcode': str(row.get('Admin 1 PCode', '')).strip() if pd.notna(row.get('Admin 1 PCode')) else None,
            'admin1_name': str(row.get('Admin 1 Name', '')).strip() if pd.notna(row.get('Admin 1 Name')) else None,
            'admin2_pcode': str(row.get('Admin 2 PCode', '')).strip() if pd.notna(row.get('Admin 2 PCode')) else None,
            'admin2_name': str(row.get('Admin 2 Name', '')).strip() if pd.notna(row.get('Admin 2 Name')) else None,
            'admin3_pcode': str(row.get('Admin 3 PCode', '')).strip() if pd.notna(row.get('Admin 3 PCode')) else None,
            'admin3_name': str(row.get('Admin 3 Name', '')).strip() if pd.notna(row.get('Admin 3 Name')) else None,
            'description': str(description_val).strip() if pd.notna(description_val) else '',
            'cluster': str(cluster_val).strip() if pd.notna(cluster_val) else '',
            'category': str(category_val).strip() if pd.notna(category_val) else None,
            'population': int(parse_number(row.get('Population'))),
            'in_need': int(parse_number(row.get('In Need'))),
            'targeted': int(parse_number(row.get('Targeted'))),
            'affected': int(parse_number(row.get('Affected'))) if pd.notna(row.get('Affected')) else None,
            'reached': int(parse_number(row.get('Reached'))) if pd.notna(row.get('Reached')) else None,
            'year': year
        })
    
    print(f"  Found {len(records)} HNO records for {year}")
    return records


def calculate_country_metrics(year, hno_records, hrp_records, pop_records):
    """Calculate aggregated country crisis metrics."""
    print(f"Calculating country metrics for {year}...")

    def is_total_category(category) -> bool:
        """Return True if HNO row represents a total (not demographic subset)."""
        if category is None:
            return True
        c = str(category).strip().lower()
        return c == '' or c == 'total'

    def is_national_level(hno: dict) -> bool:
        """Return True if HNO row is at national level (no admin pcode)."""
        return not (hno.get('admin1_pcode') or hno.get('admin2_pcode') or hno.get('admin3_pcode'))
    
    # Build population map
    pop_map = {r['iso3']: r['population'] for r in pop_records}
    
    # Build requirements map from HRP
    req_map = {}
    for hrp in hrp_records:
        if year in hrp['years'] and len(hrp['locations']) == 1:
            iso3 = hrp['locations'][0]
            if not iso3 or str(iso3).strip().lower() == 'nan' or len(str(iso3).strip()) != 3:
                continue
            req_map[iso3] = req_map.get(iso3, 0) + hrp['revised_requirements']
    
    # Aggregate HNO data by country (national total rows only to avoid double counting)
    country_needs = {}
    for hno in hno_records:
        if hno['year'] != year:
            continue
        
        iso3 = hno['country_iso3']
        cluster = hno['cluster']
        category = hno.get('category')

        if not iso3 or iso3.strip().lower() == 'nan':
            continue
        
        # Only use overall totals (cluster=ALL, category total/blank, national level)
        if cluster == 'ALL' and is_total_category(category) and is_national_level(hno):
            if iso3 not in country_needs:
                country_needs[iso3] = {'in_need': 0, 'targeted': 0, 'population': 0}

            # Take max across duplicate national total rows (often differs only in missingness)
            country_needs[iso3]['in_need'] = max(country_needs[iso3]['in_need'], hno['in_need'])
            country_needs[iso3]['targeted'] = max(country_needs[iso3]['targeted'], hno['targeted'])
            country_needs[iso3]['population'] = max(country_needs[iso3]['population'], hno['population'])
    
    # Build metrics
    metrics = []
    for iso3, needs in country_needs.items():
        population = needs['population'] or pop_map.get(iso3, needs['in_need'] * 2)
        requirements = req_map.get(iso3, 0)
        
        need_rate = needs['in_need'] / population if population > 0 else 0
        coverage_rate = needs['targeted'] / needs['in_need'] if needs['in_need'] > 0 else 0
        funding_gap = needs['in_need'] - needs['targeted']
        usd_per_person = requirements / needs['in_need'] if needs['in_need'] > 0 else 0
        
        metrics.append({
            'iso3': iso3,
            'country': COUNTRY_NAMES.get(iso3, iso3),
            'population': int(population),
            'in_need': int(needs['in_need']),
            'targeted': int(needs['targeted']),
            'need_rate': float(need_rate),
            'coverage_rate': float(coverage_rate),
            'funding_gap': int(funding_gap),
            'revised_requirements': float(requirements),
            'usd_per_person_in_need': float(usd_per_person),
            'mismatch': 0,  # Will calculate after
            'year': year
        })
    
    # Calculate mismatch scores
    need_rates = sorted([m['need_rate'] for m in metrics])
    usd_rates = sorted([m['usd_per_person_in_need'] for m in metrics if m['usd_per_person_in_need'] > 0])
    
    def get_percentile(value, sorted_list):
        if not sorted_list:
            return 0.5
        idx = next((i for i, v in enumerate(sorted_list) if v >= value), len(sorted_list))
        return idx / len(sorted_list)
    
    for m in metrics:
        need_pct = get_percentile(m['need_rate'], need_rates)
        usd_pct = get_percentile(m['usd_per_person_in_need'], usd_rates) if m['usd_per_person_in_need'] > 0 else 0.5
        m['mismatch'] = float(need_pct - usd_pct)
    
    print(f"  Calculated {len(metrics)} country metrics for {year}")
    return metrics


def calculate_cluster_metrics(year, hno_records):
    """Calculate cluster-level metrics."""
    print(f"Calculating cluster metrics for {year}...")

    def is_total_category(category) -> bool:
        if category is None:
            return True
        c = str(category).strip().lower()
        return c == '' or c == 'total'

    def is_national_level(hno: dict) -> bool:
        return not (hno.get('admin1_pcode') or hno.get('admin2_pcode') or hno.get('admin3_pcode'))
    
    # First, dedupe at (country, cluster) using national totals to avoid double counting
    by_country_cluster = {}
    for hno in hno_records:
        if hno['year'] != year or hno['cluster'] == 'ALL' or not hno['cluster']:
            continue
        if not is_total_category(hno.get('category')):
            continue
        if not is_national_level(hno):
            continue
        
        cluster = hno['cluster']
        iso3 = hno['country_iso3']
        if not iso3 or iso3.strip().lower() == 'nan':
            continue

        key = (iso3, cluster)
        cur = by_country_cluster.get(key)
        if cur is None:
            by_country_cluster[key] = {
                'description': hno['description'] or cluster,
                'in_need': hno['in_need'],
                'targeted': hno['targeted'],
            }
        else:
            cur['in_need'] = max(cur['in_need'], hno['in_need'])
            cur['targeted'] = max(cur['targeted'], hno['targeted'])
            if not cur.get('description') and (hno['description'] or ''):
                cur['description'] = hno['description']
    
    # Now aggregate to cluster totals
    cluster_data = {}
    for (iso3, cluster), vals in by_country_cluster.items():
        if cluster not in cluster_data:
            cluster_data[cluster] = {
                'description': vals.get('description') or cluster,
                'countries': set(),
                'in_need': 0,
                'targeted': 0,
            }
        cluster_data[cluster]['countries'].add(iso3)
        cluster_data[cluster]['in_need'] += vals['in_need']
        cluster_data[cluster]['targeted'] += vals['targeted']
    
    metrics = []
    for cluster, data in cluster_data.items():
        coverage_rate = data['targeted'] / data['in_need'] if data['in_need'] > 0 else 0
        
        metrics.append({
            'cluster': cluster,
            'description': data['description'],
            'total_in_need': int(data['in_need']),
            'total_targeted': int(data['targeted']),
            'coverage_rate': float(coverage_rate),
            'country_count': len(data['countries']),
            'year': year
        })
    
    # Sort by total in need
    metrics.sort(key=lambda x: x['total_in_need'], reverse=True)
    
    print(f"  Calculated {len(metrics)} cluster metrics for {year}")
    return metrics[:10]  # Top 10


def calculate_country_cluster_gaps(year, hno_records):
    """Calculate sector-specific gaps by country."""
    print(f"Calculating country-cluster gaps for {year}...")

    def is_total_category(category) -> bool:
        if category is None:
            return True
        c = str(category).strip().lower()
        return c == '' or c == 'total'

    def is_national_level(hno: dict) -> bool:
        return not (hno.get('admin1_pcode') or hno.get('admin2_pcode') or hno.get('admin3_pcode'))
    
    # Dedupe at (country, cluster) using national totals to avoid double counting
    gaps = {}
    for hno in hno_records:
        if hno['year'] != year or hno['cluster'] == 'ALL' or not hno['cluster']:
            continue
        if not is_total_category(hno.get('category')):
            continue
        if not is_national_level(hno):
            continue
        
        key = (hno['country_iso3'], hno['cluster'])
        if not key[0] or key[0].strip().lower() == 'nan':
            continue
        if key not in gaps:
            gaps[key] = {
                'iso3': hno['country_iso3'],
                'country': COUNTRY_NAMES.get(hno['country_iso3'], hno['country_iso3']),
                'cluster': hno['cluster'],
                'in_need': hno['in_need'],
                'targeted': hno['targeted']
            }
        else:
            gaps[key]['in_need'] = max(gaps[key]['in_need'], hno['in_need'])
            gaps[key]['targeted'] = max(gaps[key]['targeted'], hno['targeted'])
    
    records = []
    for gap_data in gaps.values():
        coverage_rate = gap_data['targeted'] / gap_data['in_need'] if gap_data['in_need'] > 0 else 0
        gap = gap_data['in_need'] - gap_data['targeted']
        
        records.append({
            'iso3': gap_data['iso3'],
            'country': gap_data['country'],
            'cluster': gap_data['cluster'],
            'in_need': int(gap_data['in_need']),
            'targeted': int(gap_data['targeted']),
            'coverage_rate': float(coverage_rate),
            'gap': int(gap),
            'year': year
        })
    
    print(f"  Calculated {len(records)} country-cluster gaps for {year}")
    return records


def calculate_dashboard_summary(year, country_metrics):
    """Calculate dashboard summary statistics."""
    print(f"Calculating dashboard summary for {year}...")
    
    total_in_need = sum(m['in_need'] for m in country_metrics)
    total_targeted = sum(m['targeted'] for m in country_metrics)
    total_requirements = sum(m['revised_requirements'] for m in country_metrics)
    
    avg_coverage_rate = total_targeted / total_in_need if total_in_need > 0 else 0
    
    countries_with_req = [m for m in country_metrics if m['revised_requirements'] > 0]
    avg_usd_per_person = (
        sum(m['usd_per_person_in_need'] for m in countries_with_req) / len(countries_with_req)
        if countries_with_req else 0
    )
    
    return {
        'year': year,
        'total_countries': len(country_metrics),
        'total_in_need': int(total_in_need),
        'total_targeted': int(total_targeted),
        'total_requirements': float(total_requirements),
        'avg_coverage_rate': float(avg_coverage_rate),
        'avg_usd_per_person': float(avg_usd_per_person)
    }


def upload_to_supabase(table_name, records, batch_size=100):
    """Upload records to Supabase in batches."""
    if not records:
        print(f"  No records to upload to {table_name}")
        return
    
    print(f"Uploading {len(records)} records to {table_name}...")
    
    # Delete existing records for the years being uploaded
    if 'year' in records[0]:
        years = set(r['year'] for r in records)
        for year in years:
            try:
                supabase.table(table_name).delete().eq('year', year).execute()
            except Exception as e:
                print(f"  Warning: Could not delete existing {year} records: {e}")
    
    # Upload in batches
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        try:
            supabase.table(table_name).insert(batch).execute()
            print(f"  Uploaded batch {i // batch_size + 1}/{(len(records) - 1) // batch_size + 1}")
        except Exception as e:
            print(f"  Error uploading batch: {e}")
            # Try one by one
            for record in batch:
                try:
                    supabase.table(table_name).insert(record).execute()
                except Exception as e2:
                    print(f"  Error uploading record: {e2}")
    
    print(f"  ✓ Uploaded to {table_name}")


def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(description="Populate Supabase with dashboard crisis metrics.")
    parser.add_argument(
        "--years",
        nargs="*",
        type=int,
        default=[2024, 2025, 2026],
        help="Years of HNO data to process (default: 2024 2025 2026).",
    )
    parser.add_argument(
        "--skip-humanitarian-needs",
        action="store_true",
        help="Skip uploading the full `humanitarian_needs` table (very large).",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("Populating Supabase with Humanitarian Crisis Data")
    print("=" * 60)
    print()
    
    # Load base data
    pop_records = load_population_data()
    hrp_records = load_hrp_data()
    
    # Upload base data (delete-all first to avoid duplicates across runs)
    try:
        supabase.table('country_population').delete().neq('iso3', '').execute()
    except Exception as e:
        print(f"  Warning: Could not clear country_population: {e}")
    upload_to_supabase('country_population', pop_records)

    try:
        supabase.table('humanitarian_plans').delete().neq('code', '').execute()
    except Exception as e:
        print(f"  Warning: Could not clear humanitarian_plans: {e}")
    upload_to_supabase('humanitarian_plans', hrp_records)
    
    # Process each year
    years = args.years
    all_hno_records = []
    
    for year in years:
        print()
        print(f"Processing year {year}...")
        print("-" * 60)
        
        hno_records = load_hno_data(year)
        if not args.skip_humanitarian_needs:
            all_hno_records.extend(hno_records)
        
        if not hno_records:
            continue
        
        # Calculate metrics
        country_metrics = calculate_country_metrics(year, hno_records, hrp_records, pop_records)
        cluster_metrics = calculate_cluster_metrics(year, hno_records)
        cluster_gaps = calculate_country_cluster_gaps(year, hno_records)
        summary = calculate_dashboard_summary(year, country_metrics)
        
        # Upload metrics
        upload_to_supabase('country_crisis_metrics', country_metrics)
        upload_to_supabase('cluster_metrics', cluster_metrics)
        upload_to_supabase('country_cluster_gaps', cluster_gaps)
        upload_to_supabase('dashboard_summary', [summary])
    
    # Upload all HNO records (optional; can be very large)
    if not args.skip_humanitarian_needs:
        print()
        upload_to_supabase('humanitarian_needs', all_hno_records)
    
    print()
    print("=" * 60)
    print("✓ Database population complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Update your dashboard to use Supabase instead of CSV files")
    print("2. Test the API endpoints with the new data source")
    print("3. Deploy to production with the same environment variables")


if __name__ == "__main__":
    main()
