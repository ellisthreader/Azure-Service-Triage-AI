import { AlertTriangle, Gauge, RotateCcw, Send } from "lucide-react";
import type { CaseRequest, Prediction } from "../api";
import { defaultCase, pct, SERVICE_LABELS } from "../api";
import { BarRow, PanelTitle } from "../components/primitives";

type Props = {
  value: CaseRequest;
  onChange: (next: CaseRequest) => void;
  onSubmit: () => void;
  loading: boolean;
  prediction: Prediction | null;
};

export function TriageForm({ value, onChange, onSubmit, loading, prediction }: Props) {
  return (
    <div className="triage">
      <form
        className="panel"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <PanelTitle icon={<Send size={16} />} title="Live triage request" />
        <div className="form-grid">
          <label>
            Service
            <select
              value={value.service_type}
              onChange={(event) => onChange({ ...value, service_type: event.target.value as CaseRequest["service_type"] })}
            >
              {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>

          <div className="field-2">
            <label>
              Days open
              <input
                type="number"
                min="0"
                max="365"
                value={value.days_open}
                onChange={(event) => onChange({ ...value, days_open: Number(event.target.value) })}
              />
            </label>
            <label>
              Prior contacts
              <input
                type="number"
                min="0"
                max="50"
                value={value.previous_contacts}
                onChange={(event) => onChange({ ...value, previous_contacts: Number(event.target.value) })}
              />
            </label>
          </div>

          <div className="field-2">
            <label>
              Area risk
              <select
                value={value.deprivation_band}
                onChange={(event) => onChange({ ...value, deprivation_band: event.target.value as CaseRequest["deprivation_band"] })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>
              Channel
              <select
                value={value.channel}
                onChange={(event) => onChange({ ...value, channel: event.target.value as CaseRequest["channel"] })}
              >
                <option value="web">Web</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="in_person">In person</option>
              </select>
            </label>
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={value.vulnerability_flag}
              onChange={(event) => onChange({ ...value, vulnerability_flag: event.target.checked })}
            />
            <span>Vulnerability indicator present</span>
          </label>

          <label>
            Case notes
            <textarea
              value={value.urgency_text}
              onChange={(event) => onChange({ ...value, urgency_text: event.target.value })}
            />
          </label>

          <div className="btn-row">
            <button type="submit" className="btn-primary" disabled={loading}>
              <Send size={16} />
              <span>{loading ? "Scoring…" : "Score request"}</span>
            </button>
            <button type="button" className="btn-secondary" onClick={() => onChange(defaultCase)}>
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </form>

      <section className="panel result-panel">
        <PanelTitle icon={<AlertTriangle size={16} />} title="Prediction & explainability" />
        {prediction ? (
          <PredictionView prediction={prediction} />
        ) : (
          <div className="empty-state">
            <Gauge size={30} />
            Submit a request to see its priority, class probabilities, reason codes, and feature attributions.
          </div>
        )}
      </section>
    </div>
  );
}

function PredictionView({ prediction }: { prediction: Prediction }) {
  const order = ["low", "medium", "high"];
  const probs = order
    .filter((label) => label in prediction.class_probabilities)
    .map((label) => ({ label, value: prediction.class_probabilities[label] }));
  return (
    <>
      <div className={`priority ${prediction.priority}`}>
        <div>
          <small>Recommended priority</small>
          <span className="p-label">{prediction.priority}</span>
        </div>
        <span className="p-conf">{pct(prediction.confidence)}<em>confidence</em></span>
      </div>

      <div className="prob-bar" role="img" aria-label="Class probabilities">
        {probs.map((item) => (
          <span
            key={item.label}
            className={`seg ${item.label}`}
            style={{ width: `${Math.max(item.value * 100, 3)}%` }}
            title={`${item.label}: ${pct(item.value)}`}
          />
        ))}
      </div>
      <div className="prob-key">
        {probs.map((item) => (
          <span key={item.label}><i className={`dot ${item.label}`} />{item.label} {pct(item.value)}</span>
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

      {(prediction.feature_attributions ?? []).length > 0 && (
        <div className="bar-list bordered">
          <h3>Per-prediction attributions</h3>
          {(prediction.feature_attributions ?? []).map((item) => (
            <BarRow
              key={`${item.feature}-${item.value}`}
              label={item.feature}
              value={Math.min(Math.abs(item.value) / 2.5, 1)}
              detail={`${item.value > 0 ? "+" : ""}${item.value}`}
              tone={item.direction === "raises_priority" ? "warm" : "good"}
            />
          ))}
        </div>
      )}

      {prediction.human_review_required && (
        <div className="review-banner">
          <AlertTriangle size={16} />
          <span>Human review required before action</span>
        </div>
      )}

      <p className="model-version">Model {prediction.model_version}</p>
    </>
  );
}
