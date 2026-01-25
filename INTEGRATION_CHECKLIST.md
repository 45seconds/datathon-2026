# Databricks Integration Checklist

**Time:** 20 minutes | **Files:** 2 notebooks | **Result:** Professional ML workflow

---

## Pre-Integration

- [ ] Open `notebooks/databricks_enhancements.ipynb` (source)
- [ ] Open `notebooks/DSC_Datathon.ipynb` (destination)
- [ ] Have both side-by-side for easy copying

---

## Step 1: MLflow Setup (3 min)

**Source:** `databricks_enhancements.ipynb` Cell 0-1  
**Destination:** `DSC_Datathon.ipynb` after Cell 1 (imports)

- [ ] Copy Cell 0 (MLflow initialization)
- [ ] Copy Cell 1 (Databricks widgets)
- [ ] Paste both after your imports
- [ ] Run both cells
- [ ] Verify output: "✅ MLflow ready"

---

## Step 2: Widget Filters (2 min)

**Source:** `databricks_enhancements.ipynb` Cell 2  
**Destination:** `DSC_Datathon.ipynb` after Cell 10 (feature engineering)

- [ ] Copy Cell 2 (widget filter logic)
- [ ] Paste after feature engineering (after `core_enriched` is created)
- [ ] Run cell
- [ ] Verify output: "✅ Filtered dataset ready: N country-years"

---

## Step 3: Geo-Insight Models (5 min)

**Source:** `databricks_enhancements.ipynb` Cell 3  
**Destination:** `DSC_Datathon.ipynb` REPLACE Cell 19

- [ ] Delete existing Cell 19 (Geo-Insight model cell)
- [ ] Copy Cell 3 from enhancements
- [ ] Paste as new Cell 19
- [ ] Run cell
- [ ] Verify output: "✅ Logged to MLflow" (appears twice)
- [ ] Check plots appear (Ridge coefficients + XGBoost importance)

---

## Step 4: Sensitivity Analysis (3 min)

**Source:** `databricks_enhancements.ipynb` Cell 4  
**Destination:** `DSC_Datathon.ipynb` after Cell 22 (Forgotten Crisis Index)

- [ ] Copy Cell 4 (sensitivity analysis)
- [ ] Paste after Forgotten Crisis Index section
- [ ] Run cell
- [ ] Verify output: Table + bar chart
- [ ] Check for "✅ KEY FINDING: [Country] appears in top-5 for 5/5 schemes"

---

## Step 5: Challenge 1 Models (5 min)

**Source:** `databricks_enhancements.ipynb` Cell 5-6  
**Destination:** `DSC_Datathon.ipynb` REPLACE Cell 30

- [ ] Delete existing Cell 30 (Challenge 1 model cell)
- [ ] Copy Cell 5 from enhancements
- [ ] Paste as new Cell 30
- [ ] Copy Cell 6 from enhancements
- [ ] Paste as new Cell 31 (right after Cell 30)
- [ ] Run both cells
- [ ] Verify output: "✅ Logged to MLflow" (appears twice)
- [ ] Check plots appear

---

## Step 6: Summary Table (2 min)

**Source:** `databricks_enhancements.ipynb` Cell 7  
**Destination:** `DSC_Datathon.ipynb` at the END

- [ ] Copy Cell 7 (final summary)
- [ ] Paste at end of notebook
- [ ] Run cell
- [ ] Verify output: Model comparison table with 4 rows

---

## Verification (5 min)

### Run Full Notebook
- [ ] Restart kernel
- [ ] Run all cells
- [ ] No errors occur
- [ ] All plots render correctly

### Check MLflow
- [ ] Open MLflow UI (Databricks: Experiments tab | Local: `mlflow ui`)
- [ ] Verify 5 runs exist:
  - [ ] GeoInsight_Ridge_v1
  - [ ] GeoInsight_XGBoost_v1 (or GradientBoosting)
  - [ ] Challenge1_Ridge_CPB_v1
  - [ ] Challenge1_XGBoost_CPB_v1 (or GradientBoosting)
  - [ ] Sensitivity_Analysis_Mismatch
- [ ] Click any run → verify params, metrics, and plots are logged

### Test Widgets (Databricks only)
- [ ] Change "Analysis Year" to 2024
- [ ] Re-run widget filter cell (Cell 2)
- [ ] Verify filtered count changes
- [ ] Change back to 2026

---

## Screenshot for Video (3 min)

Take these screenshots for your video presentation:

- [ ] MLflow comparison table (all 4 models side-by-side)
- [ ] Sensitivity analysis bar chart
- [ ] Widget dropdown (showing year selector)
- [ ] Final summary table

Save as:
- `screenshots/mlflow_comparison.png`
- `screenshots/sensitivity_analysis.png`
- `screenshots/widgets_demo.png`
- `screenshots/model_summary.png`

---

## Commit Changes (2 min)

```bash
git add notebooks/DSC_Datathon.ipynb
git add notebooks/databricks_enhancements.ipynb
git add DATABRICKS_INTEGRATION_GUIDE.md
git add ENHANCEMENTS_SUMMARY.md
git commit -m "Add Databricks enhancements: MLflow tracking, widgets, sensitivity analysis"
git push
```

---

## Troubleshooting

### "NameError: name 'dbutils' is not defined"
- **Cause:** Running locally (not in Databricks)
- **Fix:** Ignore - code handles this with MockDbutils
- **Impact:** Widgets won't appear locally (expected)

### "MLflow experiment already exists"
- **Cause:** Ran setup cell multiple times
- **Fix:** Ignore - code reuses existing experiment
- **Impact:** None

### "No runs found in MLflow"
- **Cause:** Model cells haven't been run yet
- **Fix:** Run Cell 19 and Cell 30-31
- **Impact:** Runs will appear after model cells execute

### Plots don't show
- **Cause:** matplotlib not displaying
- **Fix:** Add `%matplotlib inline` after imports
- **Impact:** Plots should render inline

### "KeyError: 'core_enriched'"
- **Cause:** Skipped earlier cells
- **Fix:** Run notebook from top (Restart & Run All)
- **Impact:** Need full data pipeline to run

---

## Success Criteria

You're done when:

✅ Notebook runs end-to-end without errors  
✅ MLflow UI shows 5 runs  
✅ Sensitivity analysis prints stability table  
✅ Final summary shows 4-model comparison  
✅ Screenshots saved for video  

---

## Next Steps

1. ✅ Integration complete (you are here)
2. ⏳ Draft video script (30 min)
3. ⏳ Record video (1 hour)
4. ⏳ Submit to datathon portal

---

## Time Breakdown

| Step | Time | Cumulative |
|------|------|------------|
| Pre-integration | 1 min | 1 min |
| MLflow setup | 3 min | 4 min |
| Widget filters | 2 min | 6 min |
| Geo-Insight models | 5 min | 11 min |
| Sensitivity analysis | 3 min | 14 min |
| Challenge 1 models | 5 min | 19 min |
| Summary table | 2 min | 21 min |
| Verification | 5 min | 26 min |
| Screenshots | 3 min | 29 min |
| Commit | 2 min | **31 min** |

**Actual time:** ~30 minutes (faster if you're familiar with the notebook)

---

## Questions?

Refer to:
- `DATABRICKS_INTEGRATION_GUIDE.md` - Detailed instructions
- `ENHANCEMENTS_SUMMARY.md` - What each enhancement does
- `notebooks/mlflow_test_validation.ipynb` - Full validation example

Or check the validation test results:
```bash
python scripts/test_mlflow_local.py
```
