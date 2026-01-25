"""
Generate 2027 predictions using the trained ML model.
This version uses the actual trained model from train_prediction_model.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
import joblib
import json
import warnings
warnings.filterwarnings('ignore')

# Paths
DATA_DIR = Path(__file__).parent.parent / "data" / "geo_mismatch"
OUTPUT_DIR = Path(__file__).parent.parent / "outputs"
MODELS_DIR = OUTPUT_DIR / "models"

def load_trained_model():
    """Load the trained model and preprocessor"""
    
    model_path = MODELS_DIR / "funding_gap_predictor_2027.pkl"
    preprocessor_path = MODELS_DIR / "preprocessor.pkl"
    feature_names_path = MODELS_DIR / "feature_names.pkl"
    metadata_path = MODELS_DIR / "model_metadata.json"
    
    if not model_path.exists():
        raise FileNotFoundError(
            f"Model not found at {model_path}. "
            "Please run: python scripts/train_prediction_model.py first"
        )
    
    print("📦 Loading trained model...")
    model = joblib.load(model_path)
    preprocessor = joblib.load(preprocessor_path)
    feature_names = joblib.load(feature_names_path)
    
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    
    print(f"   ✓ Model type: {metadata['model_type'].upper()}")
    print(f"   ✓ Test MAE: ${metadata['metrics']['mae']:,.0f}")
    print(f"   ✓ Test R²: {metadata['metrics']['r2']:.4f}")
    
    return model, preprocessor, feature_names, metadata

def engineer_features(df):
    """Engineer features (same as training)"""
    df = df.copy()
    
    # Log transforms
    df['log_requirements'] = np.log1p(df['revisedRequirements'])
    df['log_gap'] = np.log1p(df['Funding_Gap'])
    df['log_actual_funding'] = np.log1p(df['Total_Actual_Funding'])
    
    # Coverage metrics
    df['coverage_rate'] = df['Pct_Funded'] / 100
    df['coverage_deficit'] = 1 - df['coverage_rate']
    
    # Funding efficiency
    df['funding_per_plan'] = df['Total_Actual_Funding'] / df['Plan_Count'].replace(0, 1)
    df['gap_per_plan'] = df['Funding_Gap'] / df['Plan_Count'].replace(0, 1)
    
    # Severity interactions
    df['severity_squared'] = df['INFORM Severity Index'] ** 2
    df['severity_x_year'] = df['INFORM Severity Index'] * (df['Year'] - 2020)
    
    # Year features
    df['years_since_2020'] = df['Year'] - 2020
    df['is_recent'] = (df['Year'] >= 2024).astype(int)
    
    # Country-level aggregates
    country_stats = df.groupby('Country_ISO3').agg({
        'Funding_Gap': ['mean', 'std', 'max'],
        'coverage_rate': ['mean', 'min'],
        'INFORM Severity Index': ['mean', 'std']
    }).reset_index()
    country_stats.columns = ['Country_ISO3', 'country_avg_gap', 'country_std_gap', 'country_max_gap',
                             'country_avg_coverage', 'country_min_coverage', 
                             'country_avg_severity', 'country_std_severity']
    
    df = df.merge(country_stats, on='Country_ISO3', how='left')
    
    # Trend features
    df = df.sort_values(['Country_ISO3', 'Year'])
    df['gap_yoy_change'] = df.groupby('Country_ISO3')['Funding_Gap'].pct_change()
    df['severity_yoy_change'] = df.groupby('Country_ISO3')['INFORM Severity Index'].diff()
    
    df['gap_yoy_change'] = df['gap_yoy_change'].fillna(0)
    df['severity_yoy_change'] = df['severity_yoy_change'].fillna(0)
    
    return df

def create_2027_scenarios(historical_df, priority_countries):
    """Create 2027 scenario features based on historical data"""
    
    print("\n🔮 Creating 2027 scenarios...")
    
    # Get latest data per country (2024-2025 average)
    recent = historical_df[historical_df['Year'].isin([2024, 2025])]
    latest_by_country = recent.groupby('Country_ISO3').last().reset_index()
    
    scenarios = []
    
    for _, row in latest_by_country[latest_by_country['Country_ISO3'].isin(priority_countries)].iterrows():
        iso3 = row['Country_ISO3']
        
        # Baseline scenario (status quo projection)
        baseline = row.copy()
        baseline['Year'] = 2027
        baseline['years_since_2020'] = 7
        baseline['is_recent'] = 1
        baseline['severity_x_year'] = baseline['INFORM Severity Index'] * 7
        
        # Optimistic scenario (30% coverage improvement)
        optimistic = baseline.copy()
        optimistic['coverage_rate'] = min(baseline['coverage_rate'] * 1.5, 0.30)
        optimistic['coverage_deficit'] = 1 - optimistic['coverage_rate']
        optimistic['INFORM Severity Index'] = max(baseline['INFORM Severity Index'] - 0.2, 0)
        optimistic['severity_squared'] = optimistic['INFORM Severity Index'] ** 2
        optimistic['severity_x_year'] = optimistic['INFORM Severity Index'] * 7
        optimistic['revisedRequirements'] = baseline['revisedRequirements'] * 0.88
        optimistic['log_requirements'] = np.log1p(optimistic['revisedRequirements'])
        
        # Pessimistic scenario (coverage deterioration)
        pessimistic = baseline.copy()
        pessimistic['coverage_rate'] = max(baseline['coverage_rate'] * 0.5, 0.10)
        pessimistic['coverage_deficit'] = 1 - pessimistic['coverage_rate']
        pessimistic['INFORM Severity Index'] = min(baseline['INFORM Severity Index'] + 0.2, 5.0)
        pessimistic['severity_squared'] = pessimistic['INFORM Severity Index'] ** 2
        pessimistic['severity_x_year'] = pessimistic['INFORM Severity Index'] * 7
        pessimistic['revisedRequirements'] = baseline['revisedRequirements'] * 1.18
        pessimistic['log_requirements'] = np.log1p(pessimistic['revisedRequirements'])
        
        scenarios.append(('baseline', iso3, baseline))
        scenarios.append(('optimistic', iso3, optimistic))
        scenarios.append(('pessimistic', iso3, pessimistic))
    
    return scenarios

def predict_with_model(scenarios, model, preprocessor, feature_names):
    """Generate predictions for all scenarios"""
    
    print("🎯 Generating ML predictions...")
    
    predictions = []
    
    for scenario_type, iso3, features in scenarios:
        # Select features
        X = features[feature_names].to_frame().T
        
        # Preprocess
        X_prep = preprocessor.transform(X)
        
        # Predict funding gap
        predicted_gap = model.predict(X_prep)[0]
        
        # Calculate derived metrics
        requirement = features['revisedRequirements']
        coverage = features['coverage_rate']
        severity = features['INFORM Severity Index']
        
        # Estimate people in need based on requirement (rough heuristic)
        in_need = requirement / 200  # ~$200 per person in need
        
        predictions.append({
            'scenario': scenario_type,
            'iso3': iso3,
            'requirement': requirement,
            'gap': max(predicted_gap, 0),  # Ensure non-negative
            'in_need': in_need,
            'coverage': coverage,
            'severity': severity
        })
    
    return pd.DataFrame(predictions)

def calculate_priority_scores(df_predictions):
    """Calculate priority and risk scores"""
    
    baseline = df_predictions[df_predictions['scenario'] == 'baseline'].copy()
    
    # Normalize for scoring
    max_gap = baseline['gap'].max()
    max_in_need = baseline['in_need'].max()
    
    baseline['gap_score'] = baseline['gap'] / max_gap
    baseline['severity_score'] = baseline['severity'] / 5.0
    baseline['need_score'] = baseline['in_need'] / max_in_need
    baseline['coverage_deficit'] = 1 - baseline['coverage']
    
    # Composite priority score
    baseline['priority_score'] = (
        0.35 * baseline['gap_score'] +
        0.25 * baseline['severity_score'] +
        0.20 * baseline['need_score'] +
        0.20 * baseline['coverage_deficit']
    )
    
    # Risk score
    baseline['risk_score'] = (
        baseline['gap'] / 1e9 +
        baseline['severity'] * 1.5 +
        (baseline['in_need'] / 1e6) * 0.3
    )
    
    return baseline[['iso3', 'priority_score', 'risk_score']]

def pivot_to_dashboard_format(df_predictions, scores):
    """Pivot predictions into dashboard format"""
    
    results = []
    
    for iso3 in df_predictions['iso3'].unique():
        country_preds = df_predictions[df_predictions['iso3'] == iso3]
        country_scores = scores[scores['iso3'] == iso3].iloc[0]
        
        baseline = country_preds[country_preds['scenario'] == 'baseline'].iloc[0]
        optimistic = country_preds[country_preds['scenario'] == 'optimistic'].iloc[0]
        pessimistic = country_preds[country_preds['scenario'] == 'pessimistic'].iloc[0]
        
        # Scenario variance
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
    """Generate predictions using trained ML model"""
    
    print("=" * 80)
    print("🤖 GENERATING 2027 PREDICTIONS WITH TRAINED ML MODEL")
    print("=" * 80)
    
    # Load trained model
    model, preprocessor, feature_names, metadata = load_trained_model()
    
    # Load historical data
    print("\n📊 Loading historical data...")
    df = pd.read_csv(DATA_DIR / "country_year_severity_funding.csv")
    print(f"   ✓ Loaded {len(df)} records")
    
    # Engineer features
    df = engineer_features(df)
    
    # Priority countries
    priority_countries = ['SDN', 'AFG', 'YEM', 'ETH', 'SOM', 'SYR', 'COD', 'SSD', 'NGA', 'MMR', 'PSE', 'HTI']
    
    # Create 2027 scenarios
    scenarios = create_2027_scenarios(df, priority_countries)
    print(f"   ✓ Created {len(scenarios)} scenarios ({len(priority_countries)} countries × 3 scenarios)")
    
    # Generate predictions
    predictions = predict_with_model(scenarios, model, preprocessor, feature_names)
    
    # Calculate scores
    scores = calculate_priority_scores(predictions)
    
    # Pivot to dashboard format
    final_predictions = pivot_to_dashboard_format(predictions, scores)
    
    # Sort by priority
    final_predictions = final_predictions.sort_values('priority_score', ascending=False)
    
    # Save
    output_path = OUTPUT_DIR / "predictions_2027.csv"
    final_predictions.to_csv(output_path, index=False)
    
    print(f"\n✅ PREDICTIONS COMPLETE!")
    print(f"   💾 Saved to: {output_path}")
    print(f"   📊 Countries: {len(final_predictions)}")
    print(f"   🤖 Model: {metadata['model_type'].upper()}")
    print(f"   📈 Model Performance: R² = {metadata['metrics']['r2']:.4f}, MAE = ${metadata['metrics']['mae']:,.0f}")
    
    print(f"\n🏆 Top 5 Priority Countries for 2027:")
    for i, row in final_predictions.head(5).iterrows():
        print(f"   {i+1}. {row['iso3']}: Priority = {row['priority_score']:.3f}, Gap = ${row['baseline_gap']/1e9:.2f}B")
    
    print(f"\n💡 Summary Statistics:")
    print(f"   Total baseline gap: ${final_predictions['baseline_gap'].sum()/1e9:.2f}B")
    print(f"   Total optimistic gap: ${final_predictions['optimistic_gap'].sum()/1e9:.2f}B")
    print(f"   Total pessimistic gap: ${final_predictions['pessimistic_gap'].sum()/1e9:.2f}B")
    print(f"   Scenario range: ${(final_predictions['pessimistic_gap'].sum() - final_predictions['optimistic_gap'].sum())/1e9:.2f}B")

if __name__ == "__main__":
    main()
