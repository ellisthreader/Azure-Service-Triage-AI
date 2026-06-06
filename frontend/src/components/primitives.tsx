import React from "react";

export function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string | number; hint?: string }) {
  return (
    <section className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {hint && <small className="kpi-hint">{hint}</small>}
    </section>
  );
}

export function PanelTitle({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="panel-title">
      <span className="panel-title-icon">{icon}</span>
      <h2>{title}</h2>
      {action && <span className="panel-title-action">{action}</span>}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function BarRow({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: "good" | "warm" | "neutral";
}) {
  return (
    <div className="bar-row">
      <div className="bar-label">
        <span>{label}</span>
        <strong>{detail}</strong>
      </div>
      <div className="bar-track">
        <span className={tone} style={{ width: `${Math.max(4, Math.min(value, 1) * 100)}%` }} />
      </div>
    </div>
  );
}

export function Badge({ label }: { label: string }) {
  const tone = /pass|ready|complete|ok/i.test(label) ? "ok" : /requir/i.test(label) ? "warn" : "neutral";
  return <span className={`badge badge-${tone}`}>{label}</span>;
}
