import { BarChart3, Clock3, Database, FileCheck2, GitBranch, Layers, Server, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { DashboardSummary, Prediction, ServiceType } from "../api";
import { avg, clean, pct } from "../api";
import { BarRow, Badge, Metric, PanelTitle } from "../components/primitives";

type RecentPrediction = {
  service: ServiceType;
  priority: Prediction["priority"];
  confidence: number;
  time: string;
};

export function PipelinePanel({ pipeline }: { pipeline: DashboardSummary["pipeline"] }) {
  return (
    <section className="panel col-span-2">
      <PanelTitle icon={<GitBranch size={16} />} title="Azure ML delivery pipeline" />
      <div className="timeline">
        {pipeline.map((item) => (
          <article key={item.step}>
            <span className={`dot ${item.status}`} />
            <div>
              <strong>{item.step}</strong>
              <p>{item.detail}</p>
            </div>
            <Badge label={item.status} />
          </article>
        ))}
      </div>
    </section>
  );
}

export function AzureStatusPanel({ rows }: { rows: DashboardSummary["azure_status"] }) {
  return (
    <section className="panel col-span-2">
      <PanelTitle icon={<Server size={16} />} title="Azure and 365 integration status" />
      <div className="azure-status-grid">
        {rows.map((row) => (
          <article key={row.item} className={["azure-status-card", row.status].join(" ")}>
            <div>
              <strong>{row.item}</strong>
              <p>{row.detail}</p>
            </div>
            <Badge label={row.status} />
          </article>
        ))}
      </div>
    </section>
  );
}

export function RegistryPanel({ registry }: { registry: DashboardSummary["registry"] }) {
  return (
    <section className="panel col-span-2">
      <PanelTitle icon={<Server size={16} />} title="Model registry and service deployment" />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Version</th>
              <th className="num">Accuracy</th>
              <th className="num">Macro F1</th>
              <th className="num">High recall</th>
              <th>Gate</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {registry.map((item) => (
              <tr key={item.version}>
                <td className="tabular">{item.version}</td>
                <td className="tabular">{pct(item.accuracy)}</td>
                <td className="tabular">{pct(item.macro_f1)}</td>
                <td className="tabular">{pct(item.high_priority_recall)}</td>
                <td><Badge label={item.gate} /></td>
                <td>{item.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RecentPredictionsPanel({ rows }: { rows: RecentPrediction[] }) {
  return (
    <section className="panel col-span-2">
      <PanelTitle icon={<Clock3 size={16} />} title="Recent officer scoring activity" action={rows.length ? "Current session" : "Waiting for first score"} />
      {rows.length === 0 ? (
        <div className="empty-compact">
          No cases have been scored in this browser session yet. Submit a synthetic 365 case to populate the officer activity log.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Service</th>
                <th>Recommendation</th>
                <th className="num">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.time}-${index}`}>
                  <td className="tabular">{row.time}</td>
                  <td>{clean(row.service)}</td>
                  <td><Badge label={row.priority} /></td>
                  <td className="tabular">{pct(row.confidence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function MonitoringPanel({ trend }: { trend: DashboardSummary["monitoring_trend"] }) {
  const maxVolume = Math.max(...trend.map((item) => item.volume), 1);
  return (
    <section className="panel col-span-2">
      <PanelTitle icon={<BarChart3 size={16} />} title="Power BI monitoring signals" action="Daily volume" />
      <div className="mini-chart">
        {trend.map((item) => (
          <div key={item.label}>
            <em>{item.volume}</em>
            <span className="bar" style={{ height: `${Math.max(12, (item.volume / maxVolume) * 96)}px` }} />
            <small>{item.label}</small>
          </div>
        ))}
      </div>
      <div className="compact-metrics">
        <Metric label="Avg confidence" value={pct(avg(trend.map((item) => item.confidence)))} />
        <Metric label="High-priority rate" value={pct(avg(trend.map((item) => item.high_priority_rate)))} />
      </div>
    </section>
  );
}

export function FairnessPanel({ rows }: { rows: DashboardSummary["fairness"] }) {
  return (
    <section className="panel">
      <PanelTitle icon={<ShieldCheck size={16} />} title="Fairness and equality review" />
      <div className="bar-list">
        {rows.slice(0, 6).map((row) => (
          <BarRow
            key={`${row.feature}-${row.value}`}
            label={`${clean(row.feature)}: ${row.value}`}
            value={row.high_priority_rate}
            detail={`${pct(row.high_priority_rate)} high`}
            tone="good"
          />
        ))}
      </div>
    </section>
  );
}

export function ShapPanel({ rows }: { rows: DashboardSummary["shap_top_features"] }) {
  const maxValue = Math.max(...rows.map((item) => item.mean_absolute_shap), 1);
  return (
    <section className="panel">
      <PanelTitle icon={<Layers size={16} />} title="Explanation factors" />
      <div className="bar-list">
        {rows.slice(0, 6).map((row) => (
          <BarRow
            key={row.feature}
            label={clean(row.feature)}
            value={row.mean_absolute_shap / maxValue}
            detail={row.mean_absolute_shap.toFixed(3)}
            tone="good"
          />
        ))}
      </div>
    </section>
  );
}

export function BatchPanel({ rows }: { rows: DashboardSummary["batch_preview"] }) {
  return (
    <section className="panel col-span-2">
      <PanelTitle icon={<Database size={16} />} title="SharePoint CSV batch scoring preview" />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Case</th>
              <th>Actual</th>
              <th>Predicted</th>
              <th className="num">Confidence</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 6).map((row) => (
              <tr key={row.case_id}>
                <td className="tabular">{row.case_id}</td>
                <td>{row.priority}</td>
                <td>{row.predicted_priority}</td>
                <td className="tabular">{pct(Number(row.confidence))}</td>
                <td>{row.human_review_required === "True" ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function GovernancePanel({ rows }: { rows: DashboardSummary["governance"] }) {
  return (
    <section className="panel col-span-2">
      <PanelTitle icon={<FileCheck2 size={16} />} title="Responsible AI and information governance" />
      <div className="governance-grid">
        {rows.map((row) => (
          <article key={row.item}>
            <CheckCircle2 size={16} />
            <div>
              <strong>{row.item}</strong>
              <p>{row.owner}</p>
            </div>
            <Badge label={row.status} />
          </article>
        ))}
      </div>
    </section>
  );
}
