"""
Generate 2027 funding gap predictions using trained models from the notebook.
This script creates predictions for the Predictions tab in the dashboard.
"""

import pandas as pd
import numpy as np
from pathlib import Path

# Paths
DATA_DIR = Path(__file__).parent.parent / "data" / "geo_mismatch"
OUTPUT_DIR = Path(__file__).parent.parent / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

def load_data():
    """Load historical country-year data"""
    df = pd.read_csv(DATA_DIR / "country_year_severity_funding.csv")
    return df

def generate_2027_features(df):
    """
    Generate features for 2027 based on historical trends.
    Uses 2024-2026 data to extrapolate.
    """
    # Get latest data per country
    latest = df[df['Year'].isin([2024, 2025, 2026])].copy()
    
    # Calculate trends
    country_trends = latest.groupby('Country_ISO3').agg({
        'revisedRequirements': 'mean',
        'INFORM Severity Index': 'mean',
        'Total_Actual_Funding': 'mean',
        'Funding_Gap': 'mean',
        'Pct_Funded': 'mean'
    }).reset_index()
    
    # Estimate 2027 values (simple trend extrapolation)
    country_trends['Year'] = 2027
    
    # Calculate coverage rate
    country_trends['coverage_rate'] = country_trends['Pct_Funded'] / 100
    
    return country_trends

def create_scenarios(base_df):
    """
    Create optimistic, baseline, and pessimistic scenarios for 2027.
    """
    scenarios = []
    
    for _, row in base_df.iterrows():
        iso3 = row['Country_ISO3']
        base_requirement = row['revisedRequirements']
        base_severity = row['INFORM Severity Index']
        
        # Estimate in_need based on severity (rough approximation)
        # Higher severity = more people in need
        in_need_estimate = base_requirement / 200  # Rough heuristic
        
        # Baseline scenario (20% coverage - historical average)
        baseline_coverage = 0.20
        baseline = {
            'iso3': iso3,
            'scenario': 'baseline',
            'requirement': base_requirement,
            'coverage': baseline_coverage,
            'gap': base_requirement * (1 - baseline_coverage),
            'in_need': in_need_estimate,
            'severity': base_severity
        }
        
        # Optimistic scenario (30% coverage improvement)
        optimistic_coverage = 0.30
        optimistic = {
            'iso3': iso3,
            'scenario': 'optimistic',
            'requirement': base_requirement * 0.88,  # 12% reduction
            'coverage': optimistic_coverage,
            'gap': base_requirement * 0.88 * (1 - optimistic_coverage),
            'in_need': in_need_estimate * 0.98,
            'severity': max(base_severity - 0.2, 0)
        }
        
        # Pessimistic scenario (10% coverage deterioration)
        pessimistic_coverage = 0.10
        pessimistic = {
            'iso3': iso3,
            'scenario': 'pessimistic',
            'requirement': base_requirement * 1.18,  # 18% increase
            'coverage': pessimistic_coverage,
            'gap': base_requirement * 1.18 * (1 - pessimistic_coverage),
            'in_need': in_need_estimate * 1.12,
            'severity': min(base_severity + 0.2, 5.0)
        }
        
        scenarios.extend([baseline, optimistic, pessimistic])
    
    return pd.DataFrame(scenarios)

def calculate_priority_scores(df_scenarios):
    """
    Calculate priority scores for each country based on multiple factors.
    """
    # Get baseline scenario for calculations
    baseline = df_scenarios[df_scenarios['scenario'] == 'baseline'].copy()
    
    # Normalize metrics for scoring
    max_gap = baseline['gap'].max()
    max_in_need = baseline['in_need'].max()
    
    baseline['gap_score'] = baseline['gap'] / max_gap
    baseline['severity_score'] = baseline['severity'] / 5.0
    baseline['need_score'] = baseline['in_need'] / max_in_need
    baseline['coverage_deficit'] = 1 - baseline['coverage']
    
    # Composite priority score (weighted)
    baseline['priority_score'] = (
        0.35 * baseline['gap_score'] +
        0.25 * baseline['severity_score'] +
        0.20 * baseline['need_score'] +
        0.20 * baseline['coverage_deficit']
    )
    
    # Risk score (absolute measures)
    baseline['risk_score'] = (
        baseline['gap'] / 1e9 +
        baseline['severity'] * 1.5 +
        (baseline['in_need'] / 1e6) * 0.3
    )
    
    return baseline[['iso3', 'priority_score', 'risk_score']]

def pivot_scenarios(df_scenarios, scores):
    """
    Pivot scenarios into format needed by the dashboard API.
    """
    results = []
    
    for iso3 in df_scenarios['iso3'].unique():
        country_scenarios = df_scenarios[df_scenarios['iso3'] == iso3]
        country_scores = scores[scores['iso3'] == iso3].iloc[0]
        
        baseline = country_scenarios[country_scenarios['scenario'] == 'baseline'].iloc[0]
        optimistic = country_scenarios[country_scenarios['scenario'] == 'optimistic'].iloc[0]
        pessimistic = country_scenarios[country_scenarios['scenario'] == 'pessimistic'].iloc[0]
        
        # Calculate scenario variance
        scenario_variance = (pessimistic['gap'] - optimistic['gap']) / baseline['gap']
        
        result = {
            'iso3': iso3,
            # Baseline
            'baseline_requirement': baseline['requirement'],
            'baseline_gap': baseline['gap'],
            'baseline_in_need': baseline['in_need'],
            'baseline_coverage': baseline['coverage'],
            'baseline_severity': baseline['severity'],
            # Optimistic
            'optimistic_requirement': optimistic['requirement'],
            'optimistic_gap': optimistic['gap'],
            'optimistic_in_need': optimistic['in_need'],
            'optimistic_coverage': optimistic['coverage'],
            'optimistic_severity': optimistic['severity'],
            # Pessimistic
            'pessimistic_requirement': pessimistic['requirement'],
            'pessimistic_gap': pessimistic['gap'],
            'pessimistic_in_need': pessimistic['in_need'],
            'pessimistic_coverage': pessimistic['coverage'],
            'pessimistic_severity': pessimistic['severity'],
            # Scores
            'priority_score': country_scores['priority_score'],
            'risk_score': country_scores['risk_score'],
            'scenario_variance': scenario_variance
        }
        
        results.append(result)
    
    return pd.DataFrame(results)

def main():
    """Generate 2027 predictions and save to CSV"""
    print("Loading historical data...")
    df = load_data()
    
    print("Generating 2027 features...")
    features_2027 = generate_2027_features(df)
    
    # Focus on top crisis countries with consistent data
    priority_countries = ['SDN', 'AFG', 'YEM', 'ETH', 'SOM', 'SYR', 'COD', 'SSD', 'NGA', 'MMR', 'PSE', 'HTI']
    features_2027 = features_2027[features_2027['Country_ISO3'].isin(priority_countries)]
    
    print(f"Creating scenarios for {len(features_2027)} countries...")
    scenarios = create_scenarios(features_2027)
    
    print("Calculating priority scores...")
    scores = calculate_priority_scores(scenarios)
    
    print("Pivoting to final format...")
    predictions = pivot_scenarios(scenarios, scores)
    
    # Sort by priority score
    predictions = predictions.sort_values('priority_score', ascending=False)
    
    # Save to CSV
    output_path = OUTPUT_DIR / "predictions_2027.csv"
    predictions.to_csv(output_path, index=False)
    print(f"\n✓ Saved predictions to: {output_path}")
    print(f"✓ Generated predictions for {len(predictions)} countries")
    print(f"\nTop 3 priority countries:")
    for i, row in predictions.head(3).iterrows():
        print(f"  {i+1}. {row['iso3']}: Priority Score = {row['priority_score']:.3f}, Gap = ${row['baseline_gap']/1e9:.2f}B")

if __name__ == "__main__":
    main()
