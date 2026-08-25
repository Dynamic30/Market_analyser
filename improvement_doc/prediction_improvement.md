# Prediction Improvement Tracker

**Purpose of this doc**
This file tracks concrete changes needed to improve prediction accuracy across all sectors. Energy is the first sector being tuned, but the items below apply to any sector run. Each item lists the problem, fix, files to touch, and schema impact so work can be picked up and verified without re-deriving context.

---

## 1. Universe Gate / Sector-Only Runs

**Status:** Not Done

**Problem**
- Stocks fail the gate when: `price < 20`, `mcap < 1e10`, `P/B <= 0`, marked illiquid, or ASM flagged.
- Filtered-out stocks fall back to sentiment-only `HOLD`, which performs poorly.
- The gate is especially aggressive for small/mid-cap names in sectors like Energy.

**Fix**
- Lower the mcap gate for small/mid-cap names, or define sector-specific thresholds.
- For non-gated stocks, emit `NEUTRAL` instead of defaulting to `HOLD`.

**Files**
- `Scripts/Analysis/RAW_analysis.py` → `pull_analysis_factor()`
- `Scripts/Analysis/combined_analysis.py` → fallback action logic

**Schema Impact**
None.

---

## 2. Multi-Day Verification Horizon

**Status:** Not Done

**Problem**
- Prompt says swing trades (1-10 days), but verification uses next-day close only.
- Single-day noise hides signals that are correct over 3-5 days.

**Fix**
- Verify predictions at 1d, 3d, 5d, 10d.
- Store results in existing `matched` for 1d, plus new fields for longer horizons.

**Files**
- `Scripts/analysis_orchestrator.py` → `RunCombinedAnalysis()`
- `Scripts/Analysis/combined_analysis.py` → `run_combined()`

**Schema Impact**
Required. Add one of:
- `matched_3d`, `matched_5d`, `matched_10d` columns, or
- single JSONB `matched_by_horizon` column.

---

## 3. LLM Prompt Tuning

**Status:** Not Done

**Problem**
- `overall_bias_score` clusters at 0.55-0.75 and 0.30-0.45.
- `short_term_action` is almost always `HOLD`/`NEUTRAL` because the 5% buy/sell-range rule rarely triggers.
- Prompt already asks for full-range scoring but output still bunches.

**Fix**
- Remove or widen the 5% price-range rule so actions become directional based on score alone.
- Add a strong penalty example in the prompt for scores between 0.45-0.55 unless inputs truly cancel.
- Request a single conviction number plus directional confidence, not just labels.

**Files**
- `Scripts/Analysis/LLM_analysis.py` → `PROMPT`

**Schema Impact**
None.

---

## 4. Symbol / Identifier Cleanup

**Status:** Not Done

**Problem**
- Mongo `Financial_Data` stores NSE ticker in `meta_data.company_name` (e.g. `RELIANCE`) and `.NS` ticker in `meta_data.symbol` (e.g. `RELIANCE.NS`).
- Analysis scripts read `company_name` as the canonical key.
- `Sentiments` collection uses `_id = "SYMBOL.NS"`.
- Works now, but breaks if `company_name` ever contains a full legal name instead of the ticker.

**Fix**
- Use `meta_data.symbol` without `.NS` as the canonical symbol everywhere, or use the Mongo `_id`.
- Build sentiment lookup from symbol, not from `company_name`.

**Files**
- `Scripts/Analysis/RAW_analysis.py`
- `Scripts/Analysis/LLM_analysis.py`
- `Scripts/analysis_orchestrator.py`

**Schema Impact**
None.

---

## 5. Absolute Raw Score Thresholds

**Status:** Done

**What changed**
- `python_action` now derives from `composite_score` thresholds (`>=0.5` BUY, `<= -0.5` SELL) instead of percentile within a sector-only batch.

**File**
- `Scripts/Analysis/RAW_analysis.py`

**Schema Impact**
None.

---

## 6. Verification Tolerance Band

**Status:** Done

**What changed**
- Added `MATCH_TOL = 0.25`. Flat moves (-0.25% to +0.25%) are now `flat` and do not count as wins.

**File**
- `Scripts/Analysis/combined_analysis.py`

**Schema Impact**
None.

---

## 7. Sector Summary Wired Into LLM Prompt

**Status:** Done

**What changed**
- `RunSentimentsAnalysis()` now loads the latest sector summary from `sector_summary` and passes it to `score_stocks()`.

**File**
- `Scripts/analysis_orchestrator.py`

**Schema Impact**
None.
