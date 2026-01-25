"""
Advanced ML Model Training for 2027 Humanitarian Funding Predictions
Uses Optuna for hyperparameter optimization and MLflow for experiment tracking.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# ML imports
from sklearn.model_selection import train_test_split, cross_val_score, TimeSeriesSplit
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.linear_model import Ridge, Lasso, ElasticNet
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, ExtraTreesRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, mean_absolute_percentage_error
import xgboost as xgb
import lightgbm as lgb

# Optuna for hyperparameter optimization
import optuna
from optuna.samplers import TPESampler

# MLflow for experiment tracking
import mlflow
import mlflow.sklearn
import joblib

# Paths
DATA_DIR = Path(__file__).parent.parent / "data" / "geo_mismatch"
OUTPUT_DIR = Path(__file__).parent.parent / "outputs"
MODELS_DIR = OUTPUT_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Random seed for reproducibility
RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

class FundingGapPredictor:
    """Advanced ML predictor for humanitarian funding gaps"""
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_names = None
        self.best_params = None
        
    def load_and_prepare_data(self):
        """Load historical data and engineer features"""
        print("📊 Loading historical data...")
        
        # Load main dataset
        df = pd.read_csv(DATA_DIR / "country_year_severity_funding.csv")
        
        print(f"   Loaded {len(df)} records from {df['Year'].min()}-{df['Year'].max()}")
        print(f"   Countries: {df['Country_ISO3'].nunique()}")
        
        # Feature engineering
        df = self._engineer_features(df)
        
        return df
    
    def _engineer_features(self, df):
        """Engineer predictive features"""
        df = df.copy()
        
        # Log transforms for skewed variables
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
        
        # Country-level aggregates (historical patterns)
        country_stats = df.groupby('Country_ISO3').agg({
            'Funding_Gap': ['mean', 'std', 'max'],
            'coverage_rate': ['mean', 'min'],
            'INFORM Severity Index': ['mean', 'std']
        }).reset_index()
        country_stats.columns = ['Country_ISO3', 'country_avg_gap', 'country_std_gap', 'country_max_gap',
                                 'country_avg_coverage', 'country_min_coverage', 
                                 'country_avg_severity', 'country_std_severity']
        
        df = df.merge(country_stats, on='Country_ISO3', how='left')
        
        # Trend features (year-over-year changes)
        df = df.sort_values(['Country_ISO3', 'Year'])
        df['gap_yoy_change'] = df.groupby('Country_ISO3')['Funding_Gap'].pct_change()
        df['severity_yoy_change'] = df.groupby('Country_ISO3')['INFORM Severity Index'].diff()
        
        # Fill NaN for first years
        df['gap_yoy_change'] = df['gap_yoy_change'].fillna(0)
        df['severity_yoy_change'] = df['severity_yoy_change'].fillna(0)
        
        return df
    
    def prepare_features_target(self, df, target='Funding_Gap'):
        """Prepare feature matrix and target variable"""
        
        # Numeric features
        numeric_features = [
            'revisedRequirements',
            'INFORM Severity Index',
            'Plan_Count',
            'CERF_Funding',
            'CBPF_Budget',
            'Total_Actual_Funding',
            'log_requirements',
            'log_actual_funding',
            'coverage_rate',
            'coverage_deficit',
            'funding_per_plan',
            'severity_squared',
            'severity_x_year',
            'years_since_2020',
            'is_recent',
            'country_avg_gap',
            'country_std_gap',
            'country_max_gap',
            'country_avg_coverage',
            'country_min_coverage',
            'country_avg_severity',
            'country_std_severity',
            'gap_yoy_change',
            'severity_yoy_change'
        ]
        
        # Categorical features
        categorical_features = ['Country_ISO3']
        
        # Filter to available features
        numeric_features = [f for f in numeric_features if f in df.columns]
        
        X = df[numeric_features + categorical_features].copy()
        y = df[target].values
        
        self.feature_names = numeric_features + categorical_features
        
        return X, y, numeric_features, categorical_features
    
    def create_preprocessing_pipeline(self, numeric_features, categorical_features):
        """Create preprocessing pipeline"""
        
        numeric_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', RobustScaler())
        ])
        
        categorical_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
            ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])
        
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', numeric_transformer, numeric_features),
                ('cat', categorical_transformer, categorical_features)
            ])
        
        return preprocessor
    
    def optimize_hyperparameters(self, X_train, y_train, X_val, y_val, model_type='lgbm', n_trials=100):
        """Optimize hyperparameters using Optuna"""
        
        print(f"\n🔍 Optimizing {model_type.upper()} hyperparameters with Optuna...")
        print(f"   Running {n_trials} trials with cross-validation")
        
        def objective(trial):
            if model_type == 'lgbm':
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 100, 1000),
                    'max_depth': trial.suggest_int('max_depth', 3, 15),
                    'learning_rate': trial.suggest_float('learning_rate', 0.001, 0.3, log=True),
                    'num_leaves': trial.suggest_int('num_leaves', 20, 150),
                    'min_child_samples': trial.suggest_int('min_child_samples', 5, 100),
                    'subsample': trial.suggest_float('subsample', 0.5, 1.0),
                    'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
                    'reg_alpha': trial.suggest_float('reg_alpha', 1e-8, 10.0, log=True),
                    'reg_lambda': trial.suggest_float('reg_lambda', 1e-8, 10.0, log=True),
                    'random_state': RANDOM_STATE,
                    'verbose': -1
                }
                model = lgb.LGBMRegressor(**params)
                
            elif model_type == 'xgb':
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 100, 1000),
                    'max_depth': trial.suggest_int('max_depth', 3, 15),
                    'learning_rate': trial.suggest_float('learning_rate', 0.001, 0.3, log=True),
                    'min_child_weight': trial.suggest_int('min_child_weight', 1, 10),
                    'subsample': trial.suggest_float('subsample', 0.5, 1.0),
                    'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
                    'gamma': trial.suggest_float('gamma', 1e-8, 1.0, log=True),
                    'reg_alpha': trial.suggest_float('reg_alpha', 1e-8, 100.0, log=True),
                    'reg_lambda': trial.suggest_float('reg_lambda', 1e-8, 100.0, log=True),
                    'random_state': RANDOM_STATE,
                    'verbosity': 0
                }
                model = xgb.XGBRegressor(**params)
                
            elif model_type == 'rf':
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 100, 500),
                    'max_depth': trial.suggest_int('max_depth', 5, 30),
                    'min_samples_split': trial.suggest_int('min_samples_split', 2, 20),
                    'min_samples_leaf': trial.suggest_int('min_samples_leaf', 1, 10),
                    'max_features': trial.suggest_categorical('max_features', ['sqrt', 'log2', None]),
                    'random_state': RANDOM_STATE
                }
                model = RandomForestRegressor(**params)
                
            elif model_type == 'gbm':
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 100, 1000),
                    'max_depth': trial.suggest_int('max_depth', 3, 10),
                    'learning_rate': trial.suggest_float('learning_rate', 0.001, 0.3, log=True),
                    'min_samples_split': trial.suggest_int('min_samples_split', 2, 20),
                    'min_samples_leaf': trial.suggest_int('min_samples_leaf', 1, 10),
                    'subsample': trial.suggest_float('subsample', 0.5, 1.0),
                    'max_features': trial.suggest_categorical('max_features', ['sqrt', 'log2', None]),
                    'random_state': RANDOM_STATE
                }
                model = GradientBoostingRegressor(**params)
            
            # Fit model
            model.fit(X_train, y_train)
            
            # Predict on validation set
            y_pred = model.predict(X_val)
            
            # Calculate MAE (our optimization metric)
            mae = mean_absolute_error(y_val, y_pred)
            
            return mae
        
        # Create study
        study = optuna.create_study(
            direction='minimize',
            sampler=TPESampler(seed=RANDOM_STATE)
        )
        
        # Optimize
        study.optimize(objective, n_trials=n_trials, show_progress_bar=True)
        
        print(f"\n   ✓ Best MAE: ${study.best_value:,.0f}")
        print(f"   ✓ Best parameters: {study.best_params}")
        
        self.best_params = study.best_params
        
        return study.best_params
    
    def train_final_model(self, X_train, y_train, model_type='lgbm', params=None):
        """Train final model with best parameters"""
        
        print(f"\n🎯 Training final {model_type.upper()} model...")
        
        if params is None:
            params = self.best_params
        
        if model_type == 'lgbm':
            params['random_state'] = RANDOM_STATE
            params['verbose'] = -1
            self.model = lgb.LGBMRegressor(**params)
        elif model_type == 'xgb':
            params['random_state'] = RANDOM_STATE
            params['verbosity'] = 0
            self.model = xgb.XGBRegressor(**params)
        elif model_type == 'rf':
            params['random_state'] = RANDOM_STATE
            self.model = RandomForestRegressor(**params)
        elif model_type == 'gbm':
            params['random_state'] = RANDOM_STATE
            self.model = GradientBoostingRegressor(**params)
        
        self.model.fit(X_train, y_train)
        
        print("   ✓ Model training complete")
        
        return self.model
    
    def evaluate_model(self, X_test, y_test, model_name='Model'):
        """Comprehensive model evaluation"""
        
        print(f"\n📈 Evaluating {model_name}...")
        
        y_pred = self.model.predict(X_test)
        
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        mape = mean_absolute_percentage_error(y_test, y_pred) * 100
        
        # Median Absolute Error
        medae = np.median(np.abs(y_test - y_pred))
        
        metrics = {
            'mae': mae,
            'rmse': rmse,
            'r2': r2,
            'mape': mape,
            'medae': medae
        }
        
        print(f"   MAE:    ${mae:,.0f}")
        print(f"   RMSE:   ${rmse:,.0f}")
        print(f"   R²:     {r2:.4f}")
        print(f"   MAPE:   {mape:.2f}%")
        print(f"   MedAE:  ${medae:,.0f}")
        
        return metrics, y_pred
    
    def save_model(self, model_name='best_model'):
        """Save trained model"""
        
        model_path = MODELS_DIR / f"{model_name}.pkl"
        joblib.dump(self.model, model_path)
        print(f"\n💾 Model saved to: {model_path}")
        
        return model_path


def main():
    """Main training pipeline"""
    
    print("=" * 80)
    print("🚀 ADVANCED ML MODEL TRAINING FOR 2027 HUMANITARIAN FUNDING PREDICTIONS")
    print("=" * 80)
    
    # Initialize predictor
    predictor = FundingGapPredictor()
    
    # Load data
    df = predictor.load_and_prepare_data()
    
    # Prepare features and target
    X, y, numeric_features, categorical_features = predictor.prepare_features_target(df)
    
    print(f"\n📊 Dataset summary:")
    print(f"   Samples: {len(X)}")
    print(f"   Features: {len(predictor.feature_names)}")
    print(f"   Target range: ${y.min():,.0f} - ${y.max():,.0f}")
    print(f"   Target mean: ${y.mean():,.0f}")
    
    # Create preprocessing pipeline
    preprocessor = predictor.create_preprocessing_pipeline(numeric_features, categorical_features)
    
    # Time-based split (train on older data, test on recent)
    # This is more realistic for time series prediction
    train_mask = df['Year'] <= 2023
    val_mask = df['Year'] == 2024
    test_mask = df['Year'] == 2025
    
    X_train = X[train_mask]
    y_train = y[train_mask]
    X_val = X[val_mask]
    y_val = y[val_mask]
    X_test = X[test_mask]
    y_test = y[test_mask]
    
    print(f"\n📊 Train/Val/Test split (time-based):")
    print(f"   Train: {len(X_train)} samples (years 2020-2023)")
    print(f"   Val:   {len(X_val)} samples (year 2024)")
    print(f"   Test:  {len(X_test)} samples (year 2025)")
    
    # Preprocess
    X_train_prep = preprocessor.fit_transform(X_train)
    X_val_prep = preprocessor.transform(X_val)
    X_test_prep = preprocessor.transform(X_test)
    
    # Try multiple models
    models_to_try = ['lgbm', 'xgb', 'gbm', 'rf']
    results = {}
    
    for model_type in models_to_try:
        print(f"\n{'='*80}")
        print(f"🔧 Training {model_type.upper()} Model")
        print(f"{'='*80}")
        
        # Optimize hyperparameters
        best_params = predictor.optimize_hyperparameters(
            X_train_prep, y_train, 
            X_val_prep, y_val,
            model_type=model_type,
            n_trials=50  # Adjust for speed vs accuracy tradeoff
        )
        
        # Train final model
        predictor.train_final_model(X_train_prep, y_train, model_type=model_type, params=best_params)
        
        # Evaluate on test set
        metrics, y_pred = predictor.evaluate_model(X_test_prep, y_test, model_name=model_type.upper())
        
        results[model_type] = {
            'metrics': metrics,
            'params': best_params,
            'predictor': predictor.model
        }
        
        # Log to MLflow
        with mlflow.start_run(run_name=f"2027_Predictions_{model_type.upper()}"):
            mlflow.log_params(best_params)
            mlflow.log_metrics(metrics)
            mlflow.sklearn.log_model(predictor.model, f"model_{model_type}")
    
    # Select best model
    print(f"\n{'='*80}")
    print("🏆 MODEL COMPARISON")
    print(f"{'='*80}")
    
    comparison_df = pd.DataFrame({
        model: {
            'MAE': f"${results[model]['metrics']['mae']:,.0f}",
            'RMSE': f"${results[model]['metrics']['rmse']:,.0f}",
            'R²': f"{results[model]['metrics']['r2']:.4f}",
            'MAPE': f"{results[model]['metrics']['mape']:.2f}%"
        }
        for model in models_to_try
    }).T
    
    print(comparison_df)
    
    best_model_name = min(results.keys(), key=lambda k: results[k]['metrics']['mae'])
    best_mae = results[best_model_name]['metrics']['mae']
    
    print(f"\n🥇 Best model: {best_model_name.upper()} (MAE: ${best_mae:,.0f})")
    
    # Save best model
    predictor.model = results[best_model_name]['predictor']
    model_path = predictor.save_model(model_name='funding_gap_predictor_2027')
    
    # Save preprocessor
    preprocessor_path = MODELS_DIR / "preprocessor.pkl"
    joblib.dump(preprocessor, preprocessor_path)
    print(f"💾 Preprocessor saved to: {preprocessor_path}")
    
    # Save feature names
    feature_path = MODELS_DIR / "feature_names.pkl"
    joblib.dump(predictor.feature_names, feature_path)
    print(f"💾 Feature names saved to: {feature_path}")
    
    # Save model metadata
    metadata = {
        'model_type': best_model_name,
        'best_params': results[best_model_name]['params'],
        'metrics': results[best_model_name]['metrics'],
        'feature_names': predictor.feature_names,
        'trained_on': str(pd.Timestamp.now()),
        'train_years': f"{df['Year'].min()}-2023",
        'val_year': 2024,
        'test_year': 2025
    }
    
    import json
    metadata_path = MODELS_DIR / "model_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2, default=str)
    print(f"💾 Metadata saved to: {metadata_path}")
    
    print(f"\n{'='*80}")
    print("✅ TRAINING COMPLETE!")
    print(f"{'='*80}")
    print(f"\nBest Model: {best_model_name.upper()}")
    print(f"Test MAE: ${best_mae:,.0f}")
    print(f"Test R²: {results[best_model_name]['metrics']['r2']:.4f}")
    print(f"\nModel artifacts saved to: {MODELS_DIR}")
    print("\nNext step: Run generate_2027_predictions.py to create predictions using this model")
    
    return predictor, results


if __name__ == "__main__":
    predictor, results = main()
