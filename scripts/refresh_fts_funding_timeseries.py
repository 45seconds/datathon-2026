#!/usr/bin/env python3
"""
Refresh smaller-interval funding data from FTS (HPC Tools API).

This script uses HRP plan codes (single-country plans) as boundaries and pulls
FTS flow records via:
  https://api.hpc.tools/v1/public/fts/flow

It aggregates *incoming* flows to monthly country time series (paid/pledge/etc),
and writes CSVs into `data/geo_mismatch/` for the dashboard dataset viewer.

Important notes:
- HRP `revisedRequirements` are *requirements (requested)*, not actual funding.
- FTS flows represent reported funding flows; they can lag updates.
"""

from __future__ import annotations

import argparse
import json
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import pandas as pd


API_BASE = "https://api.hpc.tools/v1/public/fts/flow"

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "geo_mismatch"
HRP_PATH = DATA_DIR / "humanitarian-response-plans.csv"


@dataclass(frozen=True)
class PlanYear:
    plan_code: str
    iso3: str
    plan_year: int


def _parse_years(value: Any) -> List[int]:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return []
    s = str(value).strip()
    if not s or s.lower() == "nan":
        return []
    years: List[int] = []
    for part in s.split("|"):
        part = part.strip()
        if part.isdigit():
            years.append(int(part))
    return years


def _parse_locations(value: Any) -> List[str]:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return []
    s = str(value).strip()
    if not s or s.lower() == "nan":
        return []
    locs = [p.strip() for p in s.split("|") if p.strip()]
    return locs


def _iso_month(dt: datetime) -> Tuple[int, int, int]:
    """Return (year, month, quarter)."""
    year = dt.year
    month = dt.month
    quarter = (month - 1) // 3 + 1
    return year, month, quarter


def _parse_iso_dt(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    s = str(value).strip()
    if not s or s.lower() == "nan":
        return None
    # Examples: 2024-10-29T00:00:00Z
    try:
        if s.endswith("Z"):
            return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)
        return datetime.fromisoformat(s).astimezone(timezone.utc)
    except Exception:
        return None


def fetch_json(url: str, timeout_s: int = 60, retries: int = 4) -> Dict[str, Any]:
    last_err: Optional[Exception] = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "Accept": "application/json",
                    "User-Agent": "datathon-2026-refresh/1.0",
                },
            )
            with urllib.request.urlopen(req, timeout=timeout_s) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            last_err = e
            # Exponential backoff with jitter
            sleep_s = (2 ** attempt) + (0.1 * attempt)
            time.sleep(sleep_s)
    assert last_err is not None
    raise last_err


def iter_flows_for_plan_year(plan_code: str, year: int, limit: int = 1000) -> Iterable[Dict[str, Any]]:
    params = {"planCode": plan_code, "year": str(year), "limit": str(limit)}
    url = f"{API_BASE}?{urllib.parse.urlencode(params)}"

    while True:
        payload = fetch_json(url)
        data = payload.get("data") or {}
        flows = data.get("flows") or []
        for f in flows:
            yield f

        meta = payload.get("meta") or {}
        next_link = meta.get("nextLink")
        if not next_link:
            break
        url = next_link


def build_plan_years(hrp_df: pd.DataFrame, years: List[int]) -> List[PlanYear]:
    want = set(years)
    plan_years: List[PlanYear] = []

    for _, row in hrp_df.iterrows():
        code = row.get("code")
        if code is None or (isinstance(code, float) and pd.isna(code)):
            continue
        plan_code = str(code).strip()
        if not plan_code:
            continue

        locs = _parse_locations(row.get("locations"))
        if len(locs) != 1:
            continue
        iso3 = locs[0]
        if not iso3 or len(iso3) != 3:
            continue

        yrs = _parse_years(row.get("years"))
        for y in yrs:
            if y in want:
                plan_years.append(PlanYear(plan_code=plan_code, iso3=iso3, plan_year=y))

    # Deduplicate
    plan_years = sorted(set(plan_years), key=lambda x: (x.plan_year, x.iso3, x.plan_code))
    return plan_years


def build_country_requirements(hrp_df: pd.DataFrame, years: List[int]) -> pd.DataFrame:
    want = set(years)
    rows = []
    for _, row in hrp_df.iterrows():
        locs = _parse_locations(row.get("locations"))
        if len(locs) != 1:
            continue
        iso3 = locs[0]
        if not iso3 or len(iso3) != 3:
            continue
        yrs = _parse_years(row.get("years"))
        req = row.get("revisedRequirements")
        try:
            req_f = float(str(req).replace(",", "")) if req is not None and not pd.isna(req) else 0.0
        except Exception:
            req_f = 0.0
        if req_f <= 0:
            continue
        for y in yrs:
            if y in want:
                rows.append({"iso3": iso3, "plan_year": y, "hrp_revised_requirements_usd": req_f})

    if not rows:
        return pd.DataFrame(columns=["iso3", "plan_year", "hrp_revised_requirements_usd"])

    df = pd.DataFrame(rows)
    df = (
        df.groupby(["iso3", "plan_year"], as_index=False)["hrp_revised_requirements_usd"]
        .sum()
        .sort_values(["plan_year", "iso3"])
    )
    return df


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch FTS flows and build country/month funding time series."
    )
    parser.add_argument(
        "--years",
        nargs="*",
        type=int,
        default=[2024, 2025, 2026],
        help="Plan years to fetch (default: 2024 2025 2026).",
    )
    parser.add_argument(
        "--out-country",
        default=str(DATA_DIR / "fts_country_monthly_funding.csv"),
        help="Output CSV path for country-month funding time series.",
    )
    parser.add_argument(
        "--out-plan",
        default=str(DATA_DIR / "fts_plan_monthly_funding.csv"),
        help="Output CSV path for plan-month funding time series.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=1000,
        help="FTS API page size (default: 1000).",
    )
    args = parser.parse_args()

    years = sorted(set(args.years))
    if not HRP_PATH.exists():
        raise FileNotFoundError(f"Missing HRP file: {HRP_PATH}")

    hrp_df = pd.read_csv(HRP_PATH, skiprows=[1], low_memory=False)
    plan_years = build_plan_years(hrp_df, years)
    req_df = build_country_requirements(hrp_df, years)

    print(f"Found {len(plan_years)} plan-year boundaries to fetch.")

    raw_rows: List[Dict[str, Any]] = []
    total_calls = 0
    for idx, py in enumerate(plan_years, start=1):
        # Pull flows for this plan-year
        total_calls += 1
        flows = list(iter_flows_for_plan_year(py.plan_code, py.plan_year, limit=args.limit))

        for f in flows:
            if (f.get("boundary") or "").lower() != "incoming":
                continue

            flow_id = str(f.get("id") or "").strip()
            if not flow_id:
                continue

            status = str(f.get("status") or "").strip().lower() or "unknown"
            amt = f.get("amountUSD")
            try:
                amount_usd = float(amt) if amt is not None and not pd.isna(amt) else 0.0
            except Exception:
                amount_usd = 0.0
            if amount_usd == 0.0:
                continue

            # Prefer decisionDate (funding decision) else date
            dt = _parse_iso_dt(f.get("decisionDate")) or _parse_iso_dt(f.get("date"))
            if dt is None:
                continue
            y, m, q = _iso_month(dt)

            raw_rows.append(
                {
                    "flow_id": flow_id,
                    "plan_code": py.plan_code,
                    "iso3": py.iso3,
                    "plan_year": py.plan_year,
                    "year": y,
                    "month": m,
                    "quarter": q,
                    "status": status,
                    "amount_usd": amount_usd,
                    "decision_date": dt.date().isoformat(),
                }
            )

        if idx % 10 == 0 or idx == len(plan_years):
            print(f"  fetched {idx}/{len(plan_years)} plan-years (rows so far: {len(raw_rows):,})")

    if not raw_rows:
        print("No flows found. Nothing to write.")
        return

    df = pd.DataFrame(raw_rows)
    # Deduplicate by flow id for country-level aggregation (defensive against multi-plan mappings)
    df_country_base = df.drop_duplicates(subset=["flow_id"]).copy()

    # --- Plan-month aggregation ---
    plan_monthly = (
        df.groupby(
            ["plan_code", "iso3", "plan_year", "year", "month", "quarter", "status"],
            as_index=False,
        )
        .agg(amount_usd=("amount_usd", "sum"), flow_count=("flow_id", "nunique"))
        .sort_values(["plan_year", "iso3", "plan_code", "status", "year", "month"])
    )
    plan_monthly["period"] = plan_monthly.apply(
        lambda r: f"{int(r['year']):04d}-{int(r['month']):02d}", axis=1
    )
    Path(args.out_plan).parent.mkdir(parents=True, exist_ok=True)
    plan_monthly.to_csv(args.out_plan, index=False)

    # --- Country-month aggregation ---
    country_monthly = (
        df_country_base.groupby(
            ["iso3", "plan_year", "year", "month", "quarter", "status"], as_index=False
        )
        .agg(amount_usd=("amount_usd", "sum"), flow_count=("flow_id", "nunique"))
        .sort_values(["plan_year", "iso3", "status", "year", "month"])
    )
    country_monthly["period"] = country_monthly.apply(
        lambda r: f"{int(r['year']):04d}-{int(r['month']):02d}", axis=1
    )

    # Add HRP requirements (country-year) for reference
    if not req_df.empty:
        country_monthly = country_monthly.merge(req_df, on=["iso3", "plan_year"], how="left")
    else:
        country_monthly["hrp_revised_requirements_usd"] = 0.0
    country_monthly["hrp_revised_requirements_usd"] = country_monthly[
        "hrp_revised_requirements_usd"
    ].fillna(0.0)

    # Cumulative sums per (iso3, plan_year, status) over calendar time
    country_monthly = country_monthly.sort_values(["iso3", "plan_year", "status", "year", "month"])
    country_monthly["cumulative_amount_usd"] = country_monthly.groupby(
        ["iso3", "plan_year", "status"], as_index=False
    )["amount_usd"].cumsum()
    country_monthly["cumulative_pct_of_requirements"] = country_monthly.apply(
        lambda r: (r["cumulative_amount_usd"] / r["hrp_revised_requirements_usd"])
        if r["hrp_revised_requirements_usd"] and r["hrp_revised_requirements_usd"] > 0
        else None,
        axis=1,
    )

    Path(args.out_country).parent.mkdir(parents=True, exist_ok=True)
    country_monthly.to_csv(args.out_country, index=False)

    print()
    print("✓ Wrote:")
    print(f"  - {args.out_country}")
    print(f"  - {args.out_plan}")


if __name__ == "__main__":
    main()

