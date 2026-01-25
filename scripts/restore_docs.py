import json
import os

target_nb_path = 'notebooks/geo_mismatch_2.ipynb'

def create_doc_cells():
    cells = []
    
    # Header Cell
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "# Data Quality & Cleaning Methodology (INFORM Severity Index)\n",
            "\n",
            "This section documents the preprocessing steps applied to the `inform_severity_master_2020_2025.csv` dataset. The raw data contained formatting inconsistencies and metadata rows that required cleaning before analysis.\n",
            "\n",
            "### 1. Initial Assessment & Issues\n",
            "*   **Metadata Artifacts**: The dataset is a concatenation of yearly reports, resulting in repeated headers and non-data rows (e.g., \"Weights\", \"(a-z)\", \"(1-5)\").\n",
            "*   **Missing Values**: Missing numerical scores were denoted by 'x' instead of standard `NaN`.\n",
            "*   **Data Types**: Numerical columns were initially interpreted as objects due to these artifacts.\n"
        ]
    })

    # Cleaning Logic Cell
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "import pandas as pd\n",
            "import numpy as np\n",
            "from pathlib import Path\n",
            "\n",
            "# Define Paths\n",
            "DATA_DIR = Path('../data/geo_mismatch')\n",
            "RAW_PATH = DATA_DIR / 'inform_severity_master_2020_2025.csv'\n",
            "CLEAN_PATH = DATA_DIR / 'inform_severity_cleaned.csv'\n",
            "\n",
            "def clean_inform_data(raw_path, output_path):\n",
            "    print(\"Loading raw data...\")\n",
            "    try:\n",
            "        df = pd.read_csv(raw_path)\n",
            "    except FileNotFoundError:\n",
            "        print(f\"File not found: {raw_path}\")\n",
            "        return\n",
            "\n",
            "    initial_rows = len(df)\n",
            "    \n",
            "    # 1. Remove Metadata Rows\n",
            "    # Regex to identify non-data rows based on 'CRISIS' column patterns\n",
            "    garbage_mask = df['CRISIS'].astype(str).str.contains(r'Weights|\\(a-z\\)|\\(1-5\\)|\\(Very Low-Very High\\)|^\\d+$', regex=True, na=False)\n",
            "    garbage_mask |= df['CRISIS'].astype(str).isin(['False', 'nan', '0'])\n",
            "    df_clean = df[~garbage_mask].copy()\n",
            "    \n",
            "    print(f\"Removed {initial_rows - len(df_clean)} metadata rows.\")\n",
            "\n",
            "    # 2. Handle Missing Values ('x') & Convert Types\n",
            "    score_cols = [\n",
            "        'INFORM Severity Index', 'Impact of the crisis', 'Geographical Impact', 'Human Impact',\n",
            "        'Conditions of people affected', 'People in need', 'Concentration of conditions',\n",
            "        'Complexity of the crisis', 'Society and safety', 'Operating environment'\n",
            "    ]\n",
            "    \n",
            "    for col in score_cols:\n",
            "        if col in df_clean.columns:\n",
            "            # Coerce errors to NaN (handles 'x')\n",
            "            df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')\n",
            "            \n",
            "    # 3. Standardize Years & Dates\n",
            "    if 'Year' in df_clean.columns:\n",
            "        df_clean['Year'] = pd.to_numeric(df_clean['Year'], errors='coerce').fillna(0).astype(int)\n",
            "    if 'Last updated' in df_clean.columns:\n",
            "        df_clean['Last updated'] = pd.to_datetime(df_clean['Last updated'], errors='coerce')\n",
            "        \n",
            "    # 4. Export\n",
            "    df_clean.to_csv(output_path, index=False)\n",
            "    print(f\"Cleaned dataset saved to {output_path} ({len(df_clean)} rows).\")\n",
            "    return df_clean\n",
            "\n",
            "# Execute Cleaning\n",
            "# df_cleaned = clean_inform_data(RAW_PATH, CLEAN_PATH)"
        ]
    })

    # Validation Cell
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Validation Check\n",
            "if CLEAN_PATH.exists():\n",
            "    df_validation = pd.read_csv(CLEAN_PATH)\n",
            "    print(\"Validation Summary:\")\n",
            "    print(f\"- Shape: {df_validation.shape}\")\n",
            "    print(f\"- Missing Values (INFORM Index): {df_validation['INFORM Severity Index'].isnull().sum()}\")\n",
            "    print(f\"- Unique Years: {sorted(df_validation['Year'].unique())}\")\n",
            "    print(\"- Data Types:\\n\", df_validation[['INFORM Severity Index', 'Year']].dtypes)"
        ]
    })
    
    return cells

def restore_docs():
    if not os.path.exists(target_nb_path):
        print(f"Target notebook not found: {target_nb_path}")
        return

    try:
        with open(target_nb_path, 'r', encoding='utf-8') as f:
            nb = json.load(f)
    except json.JSONDecodeError:
        print("Error decoding JSON. Notebook might be corrupted.")
        return

    doc_cells = create_doc_cells()
    
    # Insert at the end of the notebook as an Appendix
    # Or insert after imports? User said "add a section". Appendix is safer to avoid disrupting flow.
    # Let's insert it at the very bottom.
    
    print(f"Appending {len(doc_cells)} documentation cells to {target_nb_path}...")
    nb['cells'].extend(doc_cells)
    
    with open(target_nb_path, 'w', encoding='utf-8') as f:
        json.dump(nb, f, indent=1)
        
    print("Done.")

if __name__ == "__main__":
    restore_docs()
