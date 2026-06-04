import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, AlertTriangle, RotateCcw, Send } from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8010";

type CaseRequest = {
  service_type:
    | "housing"
    | "adult_social_care"
    | "highways"
    | "waste"
    | "benefits"
    | "council_tax"
    | "children_services";
  days_open: number;
  previous_contacts: number;
  vulnerability_flag: boolean;
  deprivation_band: "low" | "medium" | "high";
  channel: "web" | "phone" | "email" | "in_person";
  urgency_text: string;
};

type Prediction = {
  priority: "low" | "medium" | "high";
  confidence: number;
  class_probabilities: Record<string, number>;
  main_reasons: { factor: string; impact: string }[];
  model_version: string;
  human_review_required: boolean;
};

type Metrics = {
  total_predictions: number;
  high_priority_rate: number;
  average_confidence: number;
  fairness_watch: Record<string, number | string>;
  drift_watch: Record<string, number | string>;
  operational_health: Record<string, number | string>;
};

const defaultCase: CaseRequest = {
  service_type: "housing",
  days_open: 5,
  previous_contacts: 3,
  vulnerability_flag: true,
  deprivation_band: "high",
  channel: "phone",
  urgency_text: "Customer has no heating and there are young children in the property",
};

function App() {
  const [caseInput, setCaseInput] = useState<CaseRequest>(defaultCase);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);

  async function refreshMetrics() {
    const response = await fetch(`${API_BASE}/metrics/summary`);
    if (response.ok) {
      setMetrics(await response.json());
    }
  }

  useEffect(() => {
    refreshMetrics().catch(() => setStatus("API offline"));
  }, []);

  async function submitCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("Scoring");

    try {
      const response = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(caseInput),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      setPrediction(await response.json());
      await refreshMetrics();
      setStatus("Complete");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Azure MLOps portfolio demo</p>
          <h1>Service Priority AI</h1>
          <p className="subtitle">Human-reviewed triage for high-volume service requests.</p>
        </div>
        <div className="status-pill">
          <Activity size={17} />
          <span>{status}</span>
        </div>
      </header>

      <section className="workspace">
        <form className="panel form-panel" onSubmit={submitCase}>
          <h2>Request Details</h2>

          <label>
            Service
            <select
              value={caseInput.service_type}
              onChange={(event) => setCaseInput({ ...caseInput, service_type: event.target.value as CaseRequest["service_type"] })}
            >
              <option value="housing">Housing repair</option>
              <option value="adult_social_care">Adult support</option>
              <option value="highways">Highways</option>
              <option value="waste">Waste service</option>
              <option value="benefits">Benefits</option>
              <option value="council_tax">Billing</option>
              <option value="children_services">Family support</option>
            </select>
          </label>

          <div className="field-grid">
            <label>
              Days open
              <input
                type="number"
                min="0"
                max="365"
                value={caseInput.days_open}
                onChange={(event) => setCaseInput({ ...caseInput, days_open: Number(event.target.value) })}
              />
            </label>
            <label>
              Contacts
              <input
                type="number"
                min="0"
                max="50"
                value={caseInput.previous_contacts}
                onChange={(event) => setCaseInput({ ...caseInput, previous_contacts: Number(event.target.value) })}
              />
            </label>
          </div>

          <div className="field-grid">
            <label>
              Area risk
              <select
                value={caseInput.deprivation_band}
                onChange={(event) =>
                  setCaseInput({ ...caseInput, deprivation_band: event.target.value as CaseRequest["deprivation_band"] })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>
              Channel
              <select
                value={caseInput.channel}
                onChange={(event) => setCaseInput({ ...caseInput, channel: event.target.value as CaseRequest["channel"] })}
              >
                <option value="web">Web</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="in_person">In person</option>
              </select>
            </label>
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={caseInput.vulnerability_flag}
              onChange={(event) => setCaseInput({ ...caseInput, vulnerability_flag: event.target.checked })}
            />
            <span>Vulnerability indicator</span>
          </label>

          <label>
            Notes
            <textarea
              value={caseInput.urgency_text}
              onChange={(event) => setCaseInput({ ...caseInput, urgency_text: event.target.value })}
            />
          </label>

          <div className="button-row">
            <button type="submit" disabled={loading}>
              <Send size={17} />
              <span>{loading ? "Scoring" : "Score"}</span>
            </button>
            <button type="button" className="secondary" onClick={() => setCaseInput(defaultCase)}>
              <RotateCcw size={17} />
              <span>Reset</span>
            </button>
          </div>
        </form>

        <section className="panel result-panel">
          <h2>Result</h2>

          {prediction ? (
            <>
              <div className={`priority ${prediction.priority}`}>
                <span>{prediction.priority}</span>
                <strong>{Math.round(prediction.confidence * 100)}%</strong>
              </div>

              <div className="probability-row">
                {Object.entries(prediction.class_probabilities).map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{Math.round(value * 100)}%</strong>
                  </div>
                ))}
              </div>

              <div className="reason-list">
                {prediction.main_reasons.map((reason) => (
                  <article key={reason.factor}>
                    <strong>{reason.factor}</strong>
                    <p>{reason.impact}</p>
                  </article>
                ))}
              </div>

              {prediction.human_review_required && (
                <div className="review-banner">
                  <AlertTriangle size={17} />
                  <span>Human review required</span>
                </div>
              )}

              <p className="model-version">Model {prediction.model_version}</p>
            </>
          ) : (
            <div className="empty-state">No request scored yet.</div>
          )}
        </section>
      </section>

      <section className="metric-strip">
        <Metric label="Predictions" value={metrics?.total_predictions ?? 0} />
        <Metric label="High priority" value={`${Math.round((metrics?.high_priority_rate ?? 0) * 100)}%`} />
        <Metric label="Confidence" value={`${Math.round((metrics?.average_confidence ?? 0) * 100)}%`} />
        <Metric
          label="Low-confidence"
          value={`${Math.round(Number(metrics?.drift_watch?.low_confidence_rate ?? 0) * 100)}%`}
        />
      </section>

      <p className="footer-note">Synthetic data only. Advisory output. Human review, monitoring, and governance stay in the loop.</p>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
