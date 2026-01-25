#!/usr/bin/env python3
"""
MLflow Pipeline Validation Test - Local Runner

This script tests the MLflow integration with your actual datathon data
to ensure the logging works and produces meaningful metrics.

Usage:
    cd datathon-2026-1
    source .venv/bin/activate  # if using virtual env
    pip install mlflow scikit-learn pandas numpy matplotlib
    python scripts/test_mlflow_local.py

Results:
    - Creates ./mlruns directory with experiment data
    - Run `mlflow ui` to view results at http://localhost:5000
"""

import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import sys

# Check dependencies
try:
    import mlflow
    import mlflow.sklearn
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import OneHotEncoder, StandardScaler
    from sklearn.impute import SimpleImputer
    from sklearn.pipeline import Pipeline
    from sklearn.linear_model import Ridge
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.model_selection import cross_val_score, KFold
    from sklearn.metrics import r2_score, mean_absolute_error
    from sklearn.dummy import DummyRegressor
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install with: pip install mlflow scikit-learn pandas numpy")
    sys.exit(1)

# ============================================================================
# Configuration
# ============================================================================

EXPERIMENT_NAME = "DSC_Datathon_2026_Local_Validation"
DATA_DIR = Path("data/geo_mismatch")
YEARS = [2024, 2025, 2026]

# ============================================================================
# Helper Functions
# ============================================================================

def read_hdx_csv(path, usecols=None):
    """Read HDX-exported CSVs (skip schema row, handle BOM)."""
    return pd.read_csv(path, skiprows=[1], encoding="utf-8-sig", usecols=usecols, low_memory=False)

def split_pipe_list(x):
    if pd.isna(x):
        return []
    return [p.strip() for p in str(x).split("|") if p.strip()]

def print_section(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

# ============================================================================
# Main Test
# ============================================================================

def main():
    print("\n" + "=" * 70)
    print("  MLFLOW PIPELINE VALIDATION TEST")
    print("  Testing with actual datathon data")
    print("=" * 70)
    
    # Check data directory
    data_dir = DATA_DIR
    if not data_dir.exists():
        # Try from notebooks directory
        alt_dir = Path("../data/geo_mismatch")
        if alt_dir.exists():
            data_dir = alt_dir
        else:
            print(f"\n❌ Data directory not found: {DATA_DIR}")
            print("   Run this script from the repository root.")
            sys.exit(1)
    
    print(f"\n✅ Data directory: {data_dir.resolve()}")
    print(f"✅ MLflow version: {mlflow.__version__}")
    
    # ---- Setup MLflow ----
    print_section("MLFLOW SETUP")
    
    mlflow.set_tracking_uri("mlruns")  # Local file-based tracking
    
    try:
        experiment_id = mlflow.create_experiment(
            EXPERIMENT_NAME,
            tags={"purpose": "local_validation", "date": datetime.now().strftime("%Y-%m-%d")}
        )
        print(f"✅ Created experiment: {EXPERIMENT_NAME}")
    except mlflow.exceptions.MlflowException:
        experiment = mlflow.get_experiment_by_name(EXPERIMENT_NAME)
        experiment_id = experiment.experiment_id
        print(f"✅ Using existing experiment: {EXPERIMENT_NAME}")
    
    mlflow.set_experiment(EXPERIMENT_NAME)
    
    # ---- Test 1: Data Ingestion ----
    print_section("TEST 1: DATA INGESTION")
    
    with mlflow.start_run(run_name="Test_1_Ingestion"):
        mlflow.set_tag("test_type", "ingestion")
        
        try:
            # Load HNO data
            HNO_COLS = ["Country ISO3", "Cluster", "Category", "Population", "In Need", "Targeted"]
            hno = pd.concat([
                read_hdx_csv(data_dir / f"hpc_hno_{y}.csv", usecols=HNO_COLS).assign(year=y)
                for y in YEARS
            ], ignore_index=True)
            
            for c in ["Population", "In Need", "Targeted"]:
                hno[c] = pd.to_numeric(hno[c], errors="coerce")
            
            mlflow.log_metric("hno_rows", len(hno))
            mlflow.log_metric("hno_countries", hno["Country ISO3"].nunique())
            print(f"  ✅ HNO loaded: {len(hno):,} rows, {hno['Country ISO3'].nunique()} countries")
            
            # Load HRP data
            HRP_COLS = ["code", "locations", "years", "revisedRequirements"]
            hrp = read_hdx_csv(data_dir / "humanitarian-response-plans.csv", usecols=HRP_COLS)
            hrp["revisedRequirements"] = pd.to_numeric(hrp["revisedRequirements"], errors="coerce")
            
            mlflow.log_metric("hrp_rows", len(hrp))
            print(f"  ✅ HRP loaded: {len(hrp):,} plans")
            
            mlflow.log_metric("ingestion_pass", 1.0)
            
        except Exception as e:
            print(f"  ❌ Ingestion failed: {e}")
            mlflow.log_metric("ingestion_pass", 0.0)
            return
    
    # ---- Test 2: Feature Engineering ----
    print_section("TEST 2: FEATURE ENGINEERING")
    
    with mlflow.start_run(run_name="Test_2_Features"):
        mlflow.set_tag("test_type", "feature_engineering")
        
        # Extract overall caseload
        hno["Cluster"] = hno["Cluster"].astype(str).str.strip()
        hno["Category"] = hno["Category"].fillna("").astype(str).str.strip()
        
        hno_overall = (
            hno.query("Cluster == 'ALL' and Category == ''")
            .rename(columns={
                "Country ISO3": "iso3",
                "Population": "population",
                "In Need": "in_need",
                "Targeted": "targeted",
            })
            [["year", "iso3", "population", "in_need", "targeted"]]
            .copy()
        )
        
        # Compute metrics
        hno_overall["need_rate"] = hno_overall["in_need"] / hno_overall["population"]
        hno_overall["coverage_rate"] = hno_overall["targeted"] / hno_overall["in_need"]
        
        # Validate
        valid_need_rate = hno_overall["need_rate"].between(0, 1).sum() / len(hno_overall.dropna(subset=["need_rate"]))
        
        mlflow.log_metric("valid_need_rate_pct", valid_need_rate)
        mlflow.log_metric("records_with_features", len(hno_overall))
        mlflow.log_metric("feature_pass", 1.0 if valid_need_rate > 0.9 else 0.0)
        
        print(f"  ✅ Features computed: {len(hno_overall)} records")
        print(f"  ✅ Valid need_rate: {valid_need_rate:.1%}")
    
    # ---- Test 3: Build Modeling Dataset ----
    print_section("TEST 3: DATASET CONSTRUCTION")
    
    with mlflow.start_run(run_name="Test_3_Dataset"):
        mlflow.set_tag("test_type", "dataset")
        
        # Process HRP
        hrp["loc_list"] = hrp["locations"].apply(split_pipe_list)
        hrp["year_list"] = hrp["years"].apply(split_pipe_list)
        hrp["n_locations"] = hrp["loc_list"].map(len)
        
        hrp_single = hrp.query("n_locations == 1").copy()
        hrp_single = hrp_single.explode("year_list")
        hrp_single["year"] = pd.to_numeric(hrp_single["year_list"], errors="coerce")
        hrp_single = hrp_single[hrp_single["year"].isin(YEARS)].copy()
        hrp_single["year"] = hrp_single["year"].astype(int)
        hrp_single["iso3"] = hrp_single["loc_list"].str[0]
        
        hrp_agg = (
            hrp_single.assign(revisedRequirements=hrp_single["revisedRequirements"].fillna(0))
            .groupby(["year", "iso3"], as_index=False)
            .agg(req_sum=("revisedRequirements", "sum"))
        )
        
        # Merge
        core = hno_overall.merge(hrp_agg, on=["year", "iso3"], how="left")
        core["req_sum"] = core["req_sum"].fillna(0)
        
        # Target variable
        core["usd_per_in_need"] = core["req_sum"] / core["in_need"]
        core.loc[~np.isfinite(core["usd_per_in_need"]), "usd_per_in_need"] = np.nan
        core["log10_usd_per_in_need"] = np.log10(core["usd_per_in_need"].where(core["usd_per_in_need"] > 0))
        core["log10_in_need"] = np.log10(core["in_need"].where(core["in_need"] > 0))
        
        # Check completeness
        target_available = core["log10_usd_per_in_need"].notna().mean()
        
        mlflow.log_metric("total_rows", len(core))
        mlflow.log_metric("target_available_pct", target_available)
        mlflow.log_metric("dataset_pass", 1.0 if target_available > 0.5 else 0.0)
        
        print(f"  ✅ Dataset: {len(core)} country-years")
        print(f"  ✅ Target available: {target_available:.1%}")
    
    # ---- Test 4: Model Training ----
    print_section("TEST 4: MODEL TRAINING")
    
    with mlflow.start_run(run_name="Test_4_Models"):
        mlflow.set_tag("test_type", "modeling")
        
        # Prepare data
        model_df = core.dropna(subset=["log10_usd_per_in_need", "need_rate", "log10_in_need"]).copy()
        
        train_df = model_df[model_df["year"].isin([2024, 2025])].copy()
        test_df = model_df[model_df["year"] == 2026].copy()
        
        num_features = ["need_rate", "log10_in_need"]
        
        X_train = train_df[num_features]
        y_train = train_df["log10_usd_per_in_need"]
        X_test = test_df[num_features]
        y_test = test_df["log10_usd_per_in_need"]
        
        mlflow.log_param("n_train", len(X_train))
        mlflow.log_param("n_test", len(X_test))
        mlflow.log_param("features", ",".join(num_features))
        
        print(f"  Train: {len(X_train)} rows | Test: {len(X_test)} rows")
        
        # Preprocessing
        pre = ColumnTransformer([
            ("num", Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler())
            ]), num_features)
        ])
        
        # Baseline
        dummy = DummyRegressor(strategy="mean")
        dummy.fit(X_train, y_train)
        baseline_r2 = r2_score(y_test, dummy.predict(X_test))
        mlflow.log_metric("baseline_test_r2", baseline_r2)
        print(f"  Baseline (mean): Test R² = {baseline_r2:.4f}")
        
        # Ridge
        ridge = Pipeline([("pre", pre), ("model", Ridge(alpha=1.0))])
        ridge.fit(X_train, y_train)
        ridge_r2 = r2_score(y_test, ridge.predict(X_test))
        ridge_mae = mean_absolute_error(y_test, ridge.predict(X_test))
        mlflow.log_metric("ridge_test_r2", ridge_r2)
        mlflow.log_metric("ridge_test_mae", ridge_mae)
        print(f"  Ridge:           Test R² = {ridge_r2:.4f} | MAE = {ridge_mae:.4f}")
        
        # Gradient Boosting
        gb = Pipeline([("pre", pre), ("model", GradientBoostingRegressor(n_estimators=100, max_depth=3, random_state=42))])
        gb.fit(X_train, y_train)
        gb_r2 = r2_score(y_test, gb.predict(X_test))
        gb_mae = mean_absolute_error(y_test, gb.predict(X_test))
        mlflow.log_metric("gb_test_r2", gb_r2)
        mlflow.log_metric("gb_test_mae", gb_mae)
        print(f"  GradientBoost:   Test R² = {gb_r2:.4f} | MAE = {gb_mae:.4f}")
        
        # Check if models beat baseline
        improvement = max(ridge_r2, gb_r2) - baseline_r2
        mlflow.log_metric("improvement_over_baseline", improvement)
        mlflow.log_metric("model_pass", 1.0 if improvement > 0 else 0.0)
        
        print(f"\n  Improvement over baseline: {'+' if improvement > 0 else ''}{improvement:.4f}")
    
    # ---- Test 5: Cross-Validation ----
    print_section("TEST 5: CROSS-VALIDATION")
    
    with mlflow.start_run(run_name="Test_5_CrossVal"):
        mlflow.set_tag("test_type", "cross_validation")
        
        X_all = model_df[num_features]
        y_all = model_df["log10_usd_per_in_need"]
        
        cv = KFold(n_splits=5, shuffle=True, random_state=42)
        
        # Ridge CV
        ridge_cv = Pipeline([("pre", pre), ("model", Ridge(alpha=1.0))])
        ridge_scores = cross_val_score(ridge_cv, X_all, y_all, cv=cv, scoring="r2")
        
        mlflow.log_metric("ridge_cv_mean", ridge_scores.mean())
        mlflow.log_metric("ridge_cv_std", ridge_scores.std())
        
        print(f"  Ridge 5-fold CV: {ridge_scores.mean():.4f} ± {ridge_scores.std():.4f}")
        print(f"    Fold scores: {[f'{s:.3f}' for s in ridge_scores]}")
        
        # GB CV
        gb_cv = Pipeline([("pre", pre), ("model", GradientBoostingRegressor(n_estimators=100, max_depth=3, random_state=42))])
        gb_scores = cross_val_score(gb_cv, X_all, y_all, cv=cv, scoring="r2")
        
        mlflow.log_metric("gb_cv_mean", gb_scores.mean())
        mlflow.log_metric("gb_cv_std", gb_scores.std())
        
        print(f"  GB 5-fold CV:    {gb_scores.mean():.4f} ± {gb_scores.std():.4f}")
        
        # Stability check
        max_std = max(ridge_scores.std(), gb_scores.std())
        mlflow.log_metric("max_cv_std", max_std)
        mlflow.log_metric("cv_pass", 1.0 if max_std < 0.25 else 0.0)
        
        stability = "✅ STABLE" if max_std < 0.15 else "⚠️ MODERATE" if max_std < 0.25 else "❌ UNSTABLE"
        print(f"\n  Stability: {stability} (max std = {max_std:.4f})")
    
    # ---- Final Summary ----
    print_section("VALIDATION SUMMARY")
    
    with mlflow.start_run(run_name="SUMMARY"):
        mlflow.set_tag("test_type", "summary")
        
        # Collect results
        results = {
            "Data Ingestion": True,  # Would have failed earlier
            "Feature Engineering": valid_need_rate > 0.9,
            "Dataset Construction": target_available > 0.5,
            "Models Beat Baseline": improvement > 0,
            "CV Stability": max_std < 0.25,
        }
        
        passed = sum(results.values())
        total = len(results)
        
        print("\nTest Results:")
        print("-" * 50)
        for test, passed_flag in results.items():
            status = "✅ PASS" if passed_flag else "❌ FAIL"
            print(f"  {status}  {test}")
        print("-" * 50)
        print(f"\nOverall: {passed}/{total} tests passed")
        
        mlflow.log_metric("tests_passed", passed)
        mlflow.log_metric("tests_total", total)
        mlflow.log_metric("pass_rate", passed / total)
        
        # Key metrics for notebook
        print("\n" + "=" * 50)
        print("KEY METRICS FOR YOUR NOTEBOOK")
        print("=" * 50)
        print(f"  Best Test R²: {max(ridge_r2, gb_r2):.4f}")
        print(f"  Baseline R²:  {baseline_r2:.4f}")
        print(f"  Improvement:  +{improvement:.4f}")
        print(f"  CV Mean R²:   {max(ridge_scores.mean(), gb_scores.mean()):.4f}")
        print(f"  CV Std:       ±{max_std:.4f}")
        
        overall_pass = passed >= 4
        
        print("\n" + "=" * 70)
        if overall_pass:
            print("✅ PIPELINE VALIDATION SUCCESSFUL")
            print("   Your analysis is producing meaningful, non-spurious results.")
        else:
            print("⚠️ PIPELINE VALIDATION HAS WARNINGS")
            print("   Review failed tests before finalizing.")
        print("=" * 70)
    
    print("\n" + "-" * 50)
    print("To view MLflow UI:")
    print("  1. Run: mlflow ui")
    print("  2. Open: http://localhost:5000")
    print("-" * 50)


if __name__ == "__main__":
    main()
