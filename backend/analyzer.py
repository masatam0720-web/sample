import pandas as pd
from io import StringIO


def analyze(csv_text: str) -> dict:
    df = pd.read_csv(StringIO(csv_text))
    df.columns = [c.strip() for c in df.columns]

    date_col = _find_col(df, ["date", "日付", "購買日", "注文日", "order_date"])
    amount_col = _find_col(df, ["amount", "金額", "売上", "price", "total", "購買金額"])
    product_col = _find_col(df, ["product", "商品", "商品名", "item", "product_name"])
    customer_col = _find_col(df, ["customer", "顧客", "顧客ID", "customer_id", "user_id"])

    result = {
        "columns": list(df.columns),
        "row_count": len(df),
        "summary": _summary(df, amount_col, customer_col),
        "monthly_sales": _monthly_sales(df, date_col, amount_col),
        "product_ranking": _product_ranking(df, product_col, amount_col),
    }
    return result


def _find_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    for c in df.columns:
        if c.lower() in [x.lower() for x in candidates]:
            return c
    return None


def _summary(df: pd.DataFrame, amount_col: str | None, customer_col: str | None) -> dict:
    s = {"total_rows": len(df)}
    if amount_col:
        amounts = pd.to_numeric(df[amount_col], errors="coerce")
        s["total_amount"] = float(amounts.sum())
        s["avg_amount"] = float(amounts.mean())
        s["max_amount"] = float(amounts.max())
        s["min_amount"] = float(amounts.min())
    if customer_col:
        s["unique_customers"] = int(df[customer_col].nunique())
    return s


def _monthly_sales(df: pd.DataFrame, date_col: str | None, amount_col: str | None) -> list[dict]:
    if not date_col or not amount_col:
        return []
    try:
        df2 = df.copy()
        df2[date_col] = pd.to_datetime(df2[date_col], errors="coerce")
        df2[amount_col] = pd.to_numeric(df2[amount_col], errors="coerce")
        df2 = df2.dropna(subset=[date_col, amount_col])
        df2["month"] = df2[date_col].dt.to_period("M").astype(str)
        monthly = df2.groupby("month")[amount_col].sum().reset_index()
        monthly.columns = ["month", "amount"]
        return monthly.sort_values("month").to_dict(orient="records")
    except Exception:
        return []


def _product_ranking(df: pd.DataFrame, product_col: str | None, amount_col: str | None) -> list[dict]:
    if not product_col:
        return []
    df2 = df.copy()
    if amount_col:
        df2[amount_col] = pd.to_numeric(df2[amount_col], errors="coerce")
        ranking = df2.groupby(product_col)[amount_col].sum().reset_index()
        ranking.columns = ["product", "amount"]
        ranking = ranking.sort_values("amount", ascending=False).head(10)
    else:
        ranking = df2[product_col].value_counts().head(10).reset_index()
        ranking.columns = ["product", "amount"]
    return ranking.to_dict(orient="records")
