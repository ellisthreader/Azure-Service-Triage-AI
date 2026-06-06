import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Layers,
  LineChart,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import type { CaseRequest, DashboardSummary, Metrics, ModelMetadata, Prediction } from "../api";
import {
  defaultCase,
  fallbackDashboard,
  fetchDashboard,
  fetchMetadata,
  fetchMetrics,
  pct,
  postPredict,
} from "../api";
import { Kpi } from "../components/primitives";
import { TriageForm } from "../dashboard/TriageForm";
import {
  AzureStatusPanel,
  BatchPanel,
  FairnessPanel,
  GovernancePanel,
  MonitoringPanel,
  PipelinePanel,
  RegistryPanel,
  ShapPanel,
} from "../dashboard/panels";

const NAV = [
  { id: "triage", label: "Live triage", icon: <Activity size={17} /> },
  { id: "model", label: "Model & monitoring", icon: <LineChart size={17} /> },
  { id: "delivery", label: "Delivery", icon: <Rocket size={17} /> },
  { id: "governance", label: "Governance", icon: <CheckCircle2 size={17} /> },
];

type Props = {
  caseInput: CaseRequest;
  setCaseInput: (next: CaseRequest) => void;
  prediction: Prediction | null;
  setPrediction: (p: Prediction | null) => void;
};

export function Dashboard({ caseInput, setCaseInput, prediction, setPrediction }: Props) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  // Merge live data over the fallback so any slice the API omits (e.g. an older
  // payload without azure_status) still resolves instead of crashing a panel.
  const data: DashboardSummary = { ...fallbackDashboard, ...(dashboard ?? {}) };

  useEffect(() => {
    fetchMetrics().then(setMetrics);
    fetchMetadata().then(setMetadata);
    fetchDashboard().then(setDashboard);
  }, []);

  async function submitCase() {
    setLoading(true);
    try {
      const result = await postPredict(caseInput);
      setPrediction(result);
      fetchMetrics().then(setMetrics);
    } catch {
      /* surfaced via chat / metrics offline state */
    } finally {
      setLoading(false);
    }
  }

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="console">
      <aside className="console-side">
        <div className="side-group">
          <div className="side-label">Workspace</div>
          {NAV.map((item) => (
            <button key={item.id} className="side-link" onClick={() => scrollTo(item.id)}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="side-foot">
          <span className="side-env"><span className="dot-live" /> Local demo</span>
          Synthetic data only. Output is advisory — a human caseworker makes the final decision.
        </div>
      </aside>

      <main className="console-main">
        <div className="console-head">
          <div className="eyebrow">Azure MLOps · Responsible AI</div>
          <h1>Model dashboard</h1>
          <p>Training, deployment, monitoring, and governance for the service-priority model — at a glance.</p>
        </div>

        <section className="section-block">
          <div className="kpi-grid">
            <Kpi icon={<Activity size={18} />} label="Live predictions" value={metrics?.total_predictions ?? 0} hint="This session" />
            <Kpi icon={<ShieldCheck size={18} />} label="High-priority rate" value={pct(metrics?.high_priority_rate ?? 0)} hint="Of scored cases" />
            <Kpi icon={<Layers size={18} />} label="Avg confidence" value={pct(metrics?.average_confidence ?? 0)} hint="Model certainty" />
            <Kpi icon={<CheckCircle2 size={18} />} label="Model version" value={metadata?.model_version ?? "0.1.0"} hint="Advisory · human-in-loop" />
          </div>
        </section>

        <section className="section-block" id="triage">
          <h2 className="zone-title">Live triage</h2>
          <TriageForm value={caseInput} onChange={setCaseInput} onSubmit={submitCase} loading={loading} prediction={prediction} />
        </section>

        <section className="section-block" id="model">
          <h2 className="zone-title">Model &amp; monitoring</h2>
          <div className="panel-grid">
            <RegistryPanel registry={data.registry} />
            <MonitoringPanel trend={data.monitoring_trend} />
            <FairnessPanel rows={data.fairness} />
            <ShapPanel rows={data.shap_top_features} />
          </div>
        </section>

        <section className="section-block" id="delivery">
          <h2 className="zone-title">Delivery</h2>
          <div className="panel-grid">
            <PipelinePanel pipeline={data.pipeline} />
            <AzureStatusPanel rows={data.azure_status} />
            <BatchPanel rows={data.batch_preview} />
          </div>
        </section>

        <section className="section-block" id="governance">
          <h2 className="zone-title">Governance</h2>
          <div className="panel-grid">
            <GovernancePanel rows={data.governance} />
          </div>
        </section>

        <p className="console-foot">
          Synthetic data only · advisory output · monitoring, fairness review, and human sign-off stay in the loop.
        </p>
      </main>
    </div>
  );
}
