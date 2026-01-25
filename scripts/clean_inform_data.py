import pandas as pd
import numpy as np
import os

# Define paths
INPUT_PATH = r'c:\Users\kabir\datathon-2026-1\data\geo_mismatch\inform_severity_master_2020_2025.csv'
OUTPUT_PATH = r'c:\Users\kabir\datathon-2026-1\data\geo_mismatch\inform_severity_cleaned.csv'

def clean_data():
    print(f"Loading data from {INPUT_PATH}...")
    try:
        df = pd.read_csv(INPUT_PATH)
    except FileNotFoundError:
        print(f"Error: File not found at {INPUT_PATH}")
        return

    initial_rows = len(df)
    print(f"Initial row count: {initial_rows}")

    # 1. Filter Garbage Rows
    # Remove rows where 'CRISIS' contains specific metadata markers or is '0'
    # We use a regex for 'Weights', '(a-z)', '(1-5)', '(Very Low-Very High)' and exact '0'
    garbage_mask = df['CRISIS'].astype(str).str.contains('Weights|\(a-z\)|\(1-5\)|\(Very Low-Very High\)|^\d+$', regex=True, na=False)
    # Also remove rows where CRISIS might be "False" (seen in previous inspection) or empty
    garbage_mask |= df['CRISIS'].astype(str).isin(['False', 'nan', '0'])
    
    df_clean = df[~garbage_mask].copy()
    rows_removed = initial_rows - len(df_clean)
    print(f"Removed {rows_removed} metadata/garbage rows.")

    # 2. Handle 'x' and convert to numeric
    # List of columns that should be numeric
    # Based on the file content inspection:
    score_cols = [
        'INFORM Severity Index', 'Impact of the crisis', 'Geographical Impact', 'Human Impact',
        'Conditions of people affected', 'People in need', 'Concentration of conditions',
        'Complexity of the crisis', 'Society and safety', 'Operating environment'
    ]

    print("Converting columns to numeric and handling 'x'...")
    for col in score_cols:
        if col in df_clean.columns:
            # Replace 'x' with NaN
            # We coerce errors to NaN, which handles 'x' and any other non-numeric strings
            df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
    
    # 3. Standardize other columns
    if 'Year' in df_clean.columns:
        df_clean['Year'] = pd.to_numeric(df_clean['Year'], errors='coerce').fillna(0).astype(int)
    
    if 'Last updated' in df_clean.columns:
        df_clean['Last updated'] = pd.to_datetime(df_clean['Last updated'], errors='coerce')

    # 4. Final Validation
    print(f"Final row count: {len(df_clean)}")
    print("Missing values per column:")
    print(df_clean.isnull().sum())

    # 5. Export
    print(f"Saving cleaned data to {OUTPUT_PATH}...")
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    df_clean.to_csv(OUTPUT_PATH, index=False)
    print("Done.")

if __name__ == "__main__":
    clean_data()
