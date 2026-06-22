import { useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";

const fmt = (n) =>
  typeof n === "number" ? n.toLocaleString("ja-JP", { maximumFractionDigits: 0 }) : "-";

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const upload = useCallback(async (file) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("http://localhost:8000/api/analyze", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "エラーが発生しました");
      }
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    upload(file);
  }, [upload]);

  const onFileChange = (e) => upload(e.target.files[0]);

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "sans-serif" }}>
      <header style={{ background: "#1a56db", color: "#fff", padding: "16px 32px" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem" }}>購買データ分析</h1>
      </header>

      <main style={{ maxWidth: 960, margin: "32px auto", padding: "0 16px" }}>
        {/* Upload */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          style={{
            border: `2px dashed ${dragging ? "#1a56db" : "#aab"}`,
            borderRadius: 12,
            padding: 48,
            textAlign: "center",
            background: dragging ? "#e8f0fe" : "#fff",
            cursor: "pointer",
            transition: "all .2s",
          }}
          onClick={() => document.getElementById("fileInput").click()}
        >
          <div style={{ fontSize: "2.5rem" }}>📂</div>
          <p style={{ margin: "12px 0 4px", fontWeight: 600 }}>CSVファイルをドロップ</p>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>またはクリックして選択</p>
          <input id="fileInput" type="file" accept=".csv" style={{ display: "none" }} onChange={onFileChange} />
        </div>

        {loading && <p style={{ textAlign: "center", marginTop: 24, color: "#555" }}>分析中...</p>}
        {error && <p style={{ textAlign: "center", color: "#c00", marginTop: 16 }}>{error}</p>}

        {result && <Results data={result} />}
      </main>
    </div>
  );
}

function Results({ data }) {
  const { summary, monthly_sales, product_ranking } = data;

  return (
    <div style={{ marginTop: 32 }}>
      {/* Summary cards */}
      <h2 style={{ marginBottom: 16 }}>サマリー</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        <Card label="総レコード数" value={fmt(summary.total_rows)} unit="件" />
        {summary.total_amount != null && <Card label="売上合計" value={fmt(summary.total_amount)} unit="円" />}
        {summary.avg_amount != null && <Card label="平均購買金額" value={fmt(summary.avg_amount)} unit="円" />}
        {summary.unique_customers != null && <Card label="ユニーク顧客数" value={fmt(summary.unique_customers)} unit="人" />}
      </div>

      {/* Monthly sales */}
      {monthly_sales.length > 0 && (
        <>
          <h2 style={{ marginBottom: 16 }}>月別売上推移</h2>
          <div style={{ background: "#fff", borderRadius: 12, padding: "24px 8px", marginBottom: 32 }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthly_sales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => v.toLocaleString("ja-JP")} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => v.toLocaleString("ja-JP") + " 円"} />
                <Line type="monotone" dataKey="amount" stroke="#1a56db" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Product ranking */}
      {product_ranking.length > 0 && (
        <>
          <h2 style={{ marginBottom: 16 }}>商品ランキング（上位10件）</h2>
          <div style={{ background: "#fff", borderRadius: 12, padding: "24px 8px" }}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={product_ranking} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => v.toLocaleString("ja-JP")} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="product" width={130} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => v.toLocaleString("ja-JP")} />
                <Bar dataKey="amount" fill="#1a56db" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value, unit }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
      <div style={{ color: "#666", fontSize: "0.8rem", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1a56db" }}>
        {value} <span style={{ fontSize: "0.9rem", fontWeight: 400, color: "#555" }}>{unit}</span>
      </div>
    </div>
  );
}
