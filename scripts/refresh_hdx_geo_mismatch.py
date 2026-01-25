#!/usr/bin/env python3
"""
Refresh Geo-Insight Challenge source datasets from HDX (data.humdata.org).

This script "scans the web" via the public HDX CKAN API to detect updates
(`last_modified` / `hash`) and only downloads files that changed since the last
refresh (tracked in `data/geo_mismatch/metadata-hdx-refresh.json`).

By default, it refreshes the small, dashboard-critical files:
  - Humanitarian Response Plans (HRP)
  - Global HPC HNO (2026 only; 2024/2025 are large)
  - COD Population (admin0 + admin4)

Usage:
  python scripts/refresh_hdx_geo_mismatch.py
  python scripts/refresh_hdx_geo_mismatch.py --hno-years 2024 2025 2026 --max-mb 40
  python scripts/refresh_hdx_geo_mismatch.py --force

After running this, repopulate Supabase + Storage:
  python scripts/populate_supabase.py
  python scripts/upload_new_datasets.py
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import os
import sys
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional


HDX_BASE = "https://data.humdata.org"
HDX_PACKAGE_SHOW = f"{HDX_BASE}/api/3/action/package_show?id={{dataset_id}}"

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "geo_mismatch"
META_PATH = DATA_DIR / "metadata-hdx-refresh.json"


def _iso_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def _format_bytes(n: int) -> str:
    if n < 1024:
        return f"{n}B"
    if n < 1024 * 1024:
        return f"{n / 1024:.1f}KB"
    if n < 1024 * 1024 * 1024:
        return f"{n / (1024 * 1024):.1f}MB"
    return f"{n / (1024 * 1024 * 1024):.2f}GB"


def _parse_size(value: Any) -> Optional[int]:
    # HDX resource "size" is typically an int bytes; sometimes string.
    if value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        v = value.strip()
        if v.isdigit():
            try:
                return int(v)
            except Exception:
                return None
        # Strings like "3.8M" (seen in existing metadata json)
        try:
            suffix = v[-1].upper()
            num = float(v[:-1])
            if suffix == "K":
                return int(num * 1024)
            if suffix == "M":
                return int(num * 1024 * 1024)
            if suffix == "G":
                return int(num * 1024 * 1024 * 1024)
        except Exception:
            return None
    return None


def fetch_json(url: str, timeout_s: int = 60) -> Dict[str, Any]:
    req = urllib.request.Request(
        url,
        headers={
            # HDX sometimes throttles unknown user agents.
            "User-Agent": "datathon-2026-refresh/1.0 (+https://data.humdata.org)",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        data = resp.read()
    return json.loads(data.decode("utf-8"))


def get_package(dataset_id: str) -> Dict[str, Any]:
    payload = fetch_json(HDX_PACKAGE_SHOW.format(dataset_id=dataset_id))
    if not payload.get("success"):
        raise RuntimeError(f"HDX package_show failed for {dataset_id}: {payload}")
    return payload["result"]


def md5_file(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def download_to_path(url: str, dest_path: Path, timeout_s: int = 120) -> str:
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "datathon-2026-refresh/1.0 (+https://data.humdata.org)",
            "Accept": "*/*",
        },
    )

    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        with tempfile.NamedTemporaryFile(
            mode="wb", delete=False, dir=str(dest_path.parent), prefix=f".tmp_{dest_path.name}."
        ) as tmp:
            tmp_path = Path(tmp.name)
            h = hashlib.md5()
            while True:
                chunk = resp.read(1024 * 1024)
                if not chunk:
                    break
                tmp.write(chunk)
                h.update(chunk)

    # Basic validation: ensure looks like a CSV with a schema row.
    try:
        with tmp_path.open("r", encoding="utf-8", errors="replace") as f:
            first = f.readline()
            second = f.readline()
        if "," not in first:
            raise ValueError("Downloaded file does not look like CSV (missing commas in header).")
        if second and not second.lstrip().startswith("#"):
            # Many HDX CSVs include HXL tags row; warn but don't block.
            print(f"  ! Warning: second row is not HXL/tag row for {dest_path.name}")
    except Exception as e:
        tmp_path.unlink(missing_ok=True)
        raise RuntimeError(f"Validation failed for downloaded file {dest_path.name}: {e}")

    os.replace(tmp_path, dest_path)
    return h.hexdigest()


def download_hrp_json_to_csv(url: str, dest_path: Path, timeout_s: int = 120) -> str:
    """
    Download the HPC Tools plan JSON API and materialize a CSV compatible with the
    repo's existing `humanitarian-response-plans.csv` (header + HXL tag row).
    """
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "datathon-2026-refresh/1.0 (+https://data.humdata.org)",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        raw = resp.read()

    obj = json.loads(raw.decode("utf-8"))
    data = obj.get("data") if isinstance(obj, dict) else None
    if not isinstance(data, list):
        raise RuntimeError("Unexpected HPC Tools API response shape (expected {data: [...]})")

    rows: list[dict[str, Any]] = []
    for plan in data:
        if not isinstance(plan, dict):
            continue

        pv = plan.get("planVersion") or {}
        if not isinstance(pv, dict):
            continue

        code = pv.get("code")
        plan_name = pv.get("name")
        if not code or not plan_name:
            continue

        categories = plan.get("categories") or []
        cat_names: list[str] = []
        if isinstance(categories, list):
            for c in categories:
                if isinstance(c, dict) and c.get("name"):
                    cat_names.append(str(c["name"]))

        locations = plan.get("locations") or []
        loc_iso3: list[str] = []
        if isinstance(locations, list):
            for l in locations:
                if isinstance(l, dict) and l.get("iso3"):
                    loc_iso3.append(str(l["iso3"]))

        years = plan.get("years") or []
        year_vals: list[str] = []
        if isinstance(years, list):
            for y in years:
                if isinstance(y, dict) and y.get("year"):
                    year_vals.append(str(y["year"]))

        rows.append(
            {
                "code": str(code),
                "internalId": str(pv.get("id") or ""),
                "startDate": str(pv.get("startDate") or ""),
                "endDate": str(pv.get("endDate") or ""),
                "planVersion": str(plan_name),
                "categories": " | ".join(cat_names),
                "locations": " | ".join(loc_iso3),
                "years": " | ".join(year_vals),
                "origRequirements": "" if plan.get("origRequirements") is None else str(plan.get("origRequirements")),
                "revisedRequirements": "" if plan.get("revisedRequirements") is None else str(plan.get("revisedRequirements")),
            }
        )

    # Sort newest first (mimics HDX proxy sorting)
    rows.sort(key=lambda r: (r.get("startDate") or "", r.get("code") or ""), reverse=True)

    header = [
        "code",
        "internalId",
        "startDate",
        "endDate",
        "planVersion",
        "categories",
        "locations",
        "years",
        "origRequirements",
        "revisedRequirements",
    ]
    hxl = [
        "#response+code",
        "#meta+id",
        "#date+start",
        "#date+end",
        "#response+name",
        "#response+type+list",
        "#country+code+list",
        "#date+year+list",
        "#value+requirements+orig+c_usd",
        "#value+requirements+revised+c_usd",
    ]

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        newline="",
        delete=False,
        dir=str(dest_path.parent),
        prefix=f".tmp_{dest_path.name}.",
    ) as tmp:
        tmp_path = Path(tmp.name)
        writer = csv.writer(tmp)
        writer.writerow(header)
        writer.writerow(hxl)
        for r in rows:
            writer.writerow([r.get(col, "") for col in header])

    # Validate quickly.
    with tmp_path.open("r", encoding="utf-8", errors="replace") as f:
        first = f.readline()
        second = f.readline()
    if "," not in first:
        tmp_path.unlink(missing_ok=True)
        raise RuntimeError("Generated HRP CSV missing expected comma-separated header.")
    if second and not second.lstrip().startswith("#"):
        print(f"  ! Warning: generated HRP second row not HXL/tag row for {dest_path.name}")

    local_md5 = md5_file(tmp_path)
    os.replace(tmp_path, dest_path)
    return local_md5


@dataclass(frozen=True)
class Target:
    key: str
    dataset_id: str
    resource_name: str
    dest_relpath: str
    kind: str = "download"  # "download" | "hrp_json_to_csv"


def find_resource(package: Dict[str, Any], resource_name: str) -> Dict[str, Any]:
    resources = package.get("resources") or []
    for r in resources:
        if (r.get("name") or "").strip() == resource_name:
            return r
    raise KeyError(f"Resource not found: {resource_name}")


def load_metadata() -> Dict[str, Any]:
    if not META_PATH.exists():
        return {"updated_at": None, "targets": {}}
    try:
        return json.loads(META_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"updated_at": None, "targets": {}}


def save_metadata(meta: Dict[str, Any]) -> None:
    meta["updated_at"] = _iso_now()
    META_PATH.write_text(json.dumps(meta, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Refresh Geo-Insight HDX datasets used by the dashboard.")
    parser.add_argument(
        "--hno-years",
        nargs="*",
        type=int,
        default=[2026],
        help="HNO years to refresh (default: 2026 only).",
    )
    parser.add_argument(
        "--max-mb",
        type=float,
        default=15.0,
        help="Skip downloads larger than this size (MB). Default: 15.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-download even if metadata indicates up-to-date.",
    )
    args = parser.parse_args()

    max_bytes = int(args.max_mb * 1024 * 1024)

    targets: list[Target] = [
        Target(
            key="humanitarian-response-plans.csv",
            dataset_id="humanitarian-response-plans",
            # Prefer the JSON API and generate CSV locally (more reliable than the proxy CSV).
            resource_name="HPC Tools API output",
            dest_relpath="data/geo_mismatch/humanitarian-response-plans.csv",
            kind="hrp_json_to_csv",
        ),
        Target(
            key="cod_population_admin0.csv",
            dataset_id="cod-ps-global",
            resource_name="cod_population_admin0.csv",
            dest_relpath="data/geo_mismatch/cod_population_admin0.csv",
        ),
        Target(
            key="cod_population_admin4.csv",
            dataset_id="cod-ps-global",
            resource_name="cod_population_admin4.csv",
            dest_relpath="data/geo_mismatch/cod_population_admin4.csv",
        ),
    ]

    for y in args.hno_years:
        targets.append(
            Target(
                key=f"hpc_hno_{y}.csv",
                dataset_id="global-hpc-hno",
                resource_name=f"Global HPC HNO {y}",
                dest_relpath=f"data/geo_mismatch/hpc_hno_{y}.csv",
            )
        )

    meta = load_metadata()
    meta_targets: Dict[str, Any] = meta.setdefault("targets", {})

    # Cache packages to avoid repeated web calls.
    packages: Dict[str, Dict[str, Any]] = {}

    print("=" * 60)
    print("Scanning HDX for dataset updates")
    print("=" * 60)
    print(f"Max download size: {_format_bytes(max_bytes)}")
    print()

    updated_any = False

    for t in targets:
        print(f"- {t.key}")

        try:
            if t.dataset_id not in packages:
                packages[t.dataset_id] = get_package(t.dataset_id)
            package = packages[t.dataset_id]

            res = find_resource(package, t.resource_name)
            remote_last_modified = res.get("last_modified")
            remote_hash = (res.get("hash") or "").strip() or None
            remote_size = _parse_size(res.get("size"))
            remote_url = res.get("download_url") or res.get("url")

            if not remote_url:
                print("  ✗ No download URL found; skipping")
                continue

            prev = meta_targets.get(t.key, {})
            prev_last_modified = prev.get("last_modified")
            prev_hash = prev.get("hash")

            print(f"  remote last_modified: {remote_last_modified}")
            if remote_size is not None:
                print(f"  remote size: {_format_bytes(remote_size)}")

            up_to_date = (
                (not args.force)
                and remote_last_modified
                and prev_last_modified == remote_last_modified
                and (remote_hash is None or prev_hash == remote_hash)
            )

            if up_to_date:
                print("  ✓ Up to date (no download)")
                continue

            if remote_size is not None and remote_size > max_bytes:
                print(f"  ⊘ Skipped download (too large for --max-mb): {_format_bytes(remote_size)}")
                # Still record the remote metadata so we know it's newer.
                meta_targets[t.key] = {
                    "dataset_id": t.dataset_id,
                    "resource_id": res.get("id"),
                    "resource_name": t.resource_name,
                    "last_modified": remote_last_modified,
                    "hash": remote_hash,
                    "size": remote_size,
                    "download_url": remote_url,
                    "note": "Skipped download due to size limit",
                    "checked_at": _iso_now(),
                }
                updated_any = True
                continue

            dest_path = PROJECT_ROOT / t.dest_relpath
            print(f"  ↓ Downloading to {dest_path.relative_to(PROJECT_ROOT)}")
            if t.kind == "hrp_json_to_csv":
                local_md5 = download_hrp_json_to_csv(remote_url, dest_path)
            else:
                local_md5 = download_to_path(remote_url, dest_path)

            meta_targets[t.key] = {
                "dataset_id": t.dataset_id,
                "resource_id": res.get("id"),
                "resource_name": t.resource_name,
                "last_modified": remote_last_modified,
                "hash": remote_hash or local_md5,
                "local_md5": local_md5,
                "size": remote_size,
                "download_url": remote_url,
                "downloaded_at": _iso_now(),
            }
            updated_any = True
            print("  ✓ Updated")
        except (urllib.error.URLError, TimeoutError) as e:
            print(f"  ✗ Network error: {e}")
        except Exception as e:
            print(f"  ✗ Error: {e}")

        print()

    if updated_any:
        save_metadata(meta)
        print(f"✓ Wrote refresh metadata: {META_PATH.relative_to(PROJECT_ROOT)}")
    else:
        print("✓ No changes detected.")

    print()
    print("Next:")
    print("  python scripts/populate_supabase.py")
    print("  python scripts/upload_new_datasets.py")


if __name__ == "__main__":
    main()

