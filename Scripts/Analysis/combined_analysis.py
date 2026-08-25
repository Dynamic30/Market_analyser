MATCH_TOL = 0.25


def run_combined(today_rows, previous_rows=None, raw_weight=0.6, sent_weight=0.4):
    for r in today_rows:
        raw = r.get("python_score")
        sent = r.get("overall_bias_score")

        if raw is not None and sent is not None:
            r["combined_score"] = round(raw * raw_weight + (sent * 100) * sent_weight, 2)
        elif raw is not None:
            r["combined_score"] = round(raw, 2)
        elif sent is not None:
            r["combined_score"] = round(sent * 100, 2)
        else:
            r["combined_score"] = None

        score = r.get("combined_score")
        if score is None:
            r["combined_action"] = "NEUTRAL"
        elif score >= 70:
            r["combined_action"] = "BUY"
        elif score <= 30:
            r["combined_action"] = "SELL"
        else:
            r["combined_action"] = "HOLD"

    if not previous_rows:
        return today_rows, []

    today_prices = {r["nse_symbol"]: r["price"] for r in today_rows if r.get("price")}
    for r in previous_rows:
        prev_price = r.get("price")
        today_price = today_prices.get(r["nse_symbol"])

        if prev_price is None or today_price is None:
            continue

        pct = round((today_price - prev_price) / prev_price * 100, 2)
        r["actual_close_pct"] = pct
        r["actual_direction"] = "up" if pct > MATCH_TOL else "down" if pct < -MATCH_TOL else "flat"

        action = r.get("combined_action")
        if action in ("BUY", "HOLD") and pct > MATCH_TOL:
            r["matched"] = "true"
        elif action == "SELL" and pct < -MATCH_TOL:
            r["matched"] = "true"
        elif action:
            r["matched"] = "false"

    return today_rows, previous_rows