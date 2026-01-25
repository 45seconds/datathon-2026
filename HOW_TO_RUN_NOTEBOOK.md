# How to Run the DSC_Datathon Notebook Locally

## Quick Start (Recommended)

### Option 1: Open in Jupyter Lab (Best for viewing)
```bash
cd /Users/gsdr/Github/datathon-2026-1
source .venv/bin/activate
jupyter lab notebooks/DSC_Datathon.ipynb
```

### Option 2: Open in VS Code / Cursor
1. Open the file `notebooks/DSC_Datathon.ipynb` in VS Code/Cursor
2. When prompted to select a kernel, choose **"Python (Datathon)"**
3. If you don't see this option:
   - Click "Select Kernel" in the top right
   - Choose "Python Environments..."
   - Select `.venv/bin/python`

### Option 3: Open in Databricks (For MLflow features)
1. Upload `notebooks/DSC_Datathon.ipynb` to Databricks workspace
2. Attach to a cluster
3. Run all cells - MLflow tracking will work automatically

---

## Troubleshooting

### Error: "Install IPython kernel"
**Solution:**
```bash
cd /Users/gsdr/Github/datathon-2026-1
source .venv/bin/activate
pip install ipykernel jupyter
python -m ipykernel install --user --name=datathon-env --display-name="Python (Datathon)"
```

### Error: "ModuleNotFoundError"
**Solution:** Install dependencies
```bash
cd /Users/gsdr/Github/datathon-2026-1
source .venv/bin/activate
pip install pandas numpy matplotlib seaborn scikit-learn mlflow
```

### Notebook shows no outputs
The notebook is already executed and saved with outputs. If you don't see them:
1. Make sure you've pulled the latest version: `git pull`
2. The file should be ~1.4MB (if it's <300KB, outputs are missing)
3. Try opening in Jupyter Lab instead of VS Code

---

## Re-executing the Notebook

If you want to re-run all cells:

```bash
cd /Users/gsdr/Github/datathon-2026-1
source .venv/bin/activate

# Execute and save with outputs
jupyter nbconvert --to notebook --execute --inplace \
  --ExecutePreprocessor.timeout=600 \
  notebooks/DSC_Datathon.ipynb
```

**Note:** This takes ~60 seconds to complete.

---

## Viewing Without Running

The notebook is already executed with all outputs saved. You can view it:
- **On GitHub**: Navigate to the file and GitHub will render it
- **In Jupyter**: `jupyter lab notebooks/DSC_Datathon.ipynb` (read-only)
- **In nbviewer**: Upload to https://nbviewer.org/

---

## Current Environment

- **Python**: 3.14
- **Virtual Environment**: `.venv/`
- **Kernel Name**: `datathon-env` (display name: "Python (Datathon)")
- **Key Packages**: pandas, numpy, matplotlib, seaborn, scikit-learn, mlflow

---

## For Submission

The notebook is ready for submission:
- ✅ All cells executed with outputs
- ✅ Visualizations embedded
- ✅ MLflow results displayed
- ✅ File size: 1.4MB
- ✅ 35 cells total (24 code, 11 markdown)
