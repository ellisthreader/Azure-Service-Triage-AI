import {
  AlertTriangle,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileText,
  Mail,
  MessageSquareText,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { CaseRecord, DecisionReceipt, Prediction, SourceItem } from "../api";
import { clean, pct } from "../api";
import { PanelTitle } from "../components/primitives";

type Props = {
  caseRecord: CaseRecord | null;
  prediction: Prediction | null;
  onRecordDecision?: (finalPriority: Prediction["priority"], overrideReason: string) => Promise<void>;
  decisionSaving?: boolean;
  decisionReceipt?: DecisionReceipt | null;
};

export function TriageForm({
  caseRecord,
  prediction,
  onRecordDecision,
  decisionSaving = false,
  decisionReceipt,
}: Props) {
  const [officerPriority, setOfficerPriority] = useState<Prediction["priority"] | "">("");
  const [overrideReason, setOverrideReason] = useState("");
  const [activeSource, setActiveSource] = useState<SourceItem | null>(null);

  useEffect(() => {
    if (prediction) {
      setOfficerPriority(prediction.priority);
      setOverrideReason("");
    }
  }, [caseRecord, prediction]);

  if (!caseRecord) {
    return (
      <section className="panel case-review-empty">
        <ClipboardList size={28} />
        <strong>Select a case from today's priority list.</strong>
        <p>The case will open with its details, evidence, and system flag already attached.</p>
      </section>
    );
  }

  const request = caseRecord.case_request;
  const hasOverride = Boolean(prediction && officerPriority && officerPriority !== prediction.priority);
  const sourceItems = [...caseRecord.case_notes, ...caseRecord.previous_contacts];

  return (
    <div className="case-review">
      <section className="panel case-overview-panel">
        <PanelTitle icon={<FileText size={16} />} title="Case details" action={caseRecord.case_id} />
        <div className="case-review-head">
          <div>
            <span className={`risk-badge ${caseRecord.risk}`}>{clean(caseRecord.risk)}</span>
            <h2>{caseRecord.service_label}</h2>
            <p>{request.urgency_text}</p>
          </div>
          <strong>{caseRecord.due}</strong>
        </div>

        <div className="case-detail-grid">
          <Detail label="Team" value={caseRecord.team} />
          <Detail label="Source" value={caseRecord.source} />
          <Detail label="Status" value={caseRecord.status} />
          <Detail label="Last updated" value={caseRecord.last_updated} />
          <Detail label="Days open" value={`${request.days_open}`} />
          <Detail label="Prior contacts" value={`${request.previous_contacts}`} />
          <Detail label="Channel" value={clean(request.channel)} />
          <Detail label="Area context" value={clean(request.deprivation_band)} />
        </div>

        <div className="assigned-staff-card">
          <img src={caseRecord.assigned_to.avatar_url} alt="" />
          <div>
            <span>Assigned officer</span>
            <strong>{caseRecord.assigned_to.name}</strong>
            <p>{caseRecord.assigned_to.role} · {caseRecord.assigned_to.username}</p>
          </div>
        </div>

        <div className="case-context-block">
          <h3>What staff need to know</h3>
          <p>{caseRecord.summary}</p>
          <p><strong>Access:</strong> {caseRecord.access_notes}</p>
          <p><strong>Household/context:</strong> {caseRecord.household_context}</p>
        </div>

        {sourceItems.length > 0 && (
          <div className="source-section">
            <div className="source-section-head">
              <h3>Case notes and previous contacts</h3>
              <span>{sourceItems.length} linked items</span>
            </div>
            <div className="source-list">
              {sourceItems.map((item) => (
                <button key={item.id} type="button" className={`source-card ${appClass(item.app)}`} onClick={() => setActiveSource(item)}>
                  <span className="source-app-icon">{sourceIcon(item.app)}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.summary}</p>
                    <small>{item.app} · {item.time}</small>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {caseRecord.evidence_items.length > 0 && (
          <div className="evidence-section">
            <h3>Evidence and context</h3>
            <div className="evidence-grid">
              {caseRecord.evidence_items.map((item) => (
                <article key={`${item.source}-${item.title}`} className={`evidence-card ${item.type}`}>
                  {item.image_url ? (
                    <img className="evidence-image" src={item.image_url} alt={item.title} />
                  ) : item.type === "photo" ? (
                    <div className="photo-placeholder"><Camera size={22} /><span>Photo</span></div>
                  ) : (
                    <span className="evidence-icon">
                      {item.type === "note" ? <MessageSquareText size={18} /> : <FileText size={18} />}
                    </span>
                  )}
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    <small>{item.source}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {request.vulnerability_flag && (
          <div className="plain-alert">
            <ShieldCheck size={16} />
            <span>Safeguarding or vulnerability context is present. Handle with extra care and follow service policy.</span>
          </div>
        )}

        {caseRecord.activity.length > 0 && (
          <div className="activity-section">
            <h3>Recent activity</h3>
            <div className="activity-list">
              {caseRecord.activity.map((item) => (
                <article key={item.id}>
                  <img src={item.actor.avatar_url} alt="" />
                  <div>
                    <strong>{item.action}</strong>
                    <p>{item.detail}</p>
                    <small>{item.actor.name} · {item.time}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="panel case-action-panel">
        <PanelTitle icon={<AlertTriangle size={16} />} title="System flag" />
        {prediction ? (
          <>
            <div className={`priority staff-priority ${prediction.priority}`}>
              <div>
                <small>Priority to check</small>
                <span className="p-label">{clean(prediction.priority)}</span>
              </div>
              <span className="p-conf">{pct(prediction.confidence)}<em>confidence</em></span>
            </div>

            <div className="staff-next-step">
              <strong>{prediction.human_review_required ? "Review recommended" : "Check and confirm"}</strong>
              <p>The system has flagged this case for attention. Check the case notes and previous contacts, then confirm the final priority.</p>
            </div>

            <div className="staff-reasons">
              <h3>Why this case needs attention</h3>
              {prediction.priority === "high" && (
                <p className="reason-summary">
                  This is marked high because the case combines risk wording, vulnerability context, and enough waiting time to need prompt human review.
                </p>
              )}
              {prediction.main_reasons.map((reason) => (
                <article key={reason.factor}>
                  <strong>{plainReason(reason.factor)}</strong>
                  <p>{plainImpact(reason.impact)}</p>
                </article>
              ))}
            </div>

            <div className="officer-review">
              <div>
                <h3>Final decision</h3>
                <p>Choose the priority that should be saved to the case record.</p>
              </div>
              <div className="segmented" role="group" aria-label="Officer final priority">
                {(["low", "medium", "high"] as const).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    className={officerPriority === priority ? "selected" : ""}
                    onClick={() => setOfficerPriority(priority)}
                  >
                    {priority}
                  </button>
                ))}
              </div>
              {hasOverride && (
                <label>
                  Reason for changing priority
                  <textarea
                    value={overrideReason}
                    onChange={(event) => setOverrideReason(event.target.value)}
                    placeholder="Briefly explain why the final decision is different."
                  />
                </label>
              )}
              <button
                type="button"
                className="btn-primary decision-submit"
                disabled={!officerPriority || decisionSaving || (hasOverride && !overrideReason.trim())}
                onClick={() => officerPriority && onRecordDecision?.(officerPriority, overrideReason)}
              >
                <CheckCircle2 size={16} />
                <span>{decisionSaving ? "Saving..." : "Save decision"}</span>
              </button>
              {hasOverride && !overrideReason.trim() && <p className="field-note">Add a short reason before saving a changed priority.</p>}
              {decisionReceipt && (
                <div className="decision-receipt" role="status">
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>Decision saved</strong>
                    <span>{decisionReceipt.audit_id} · final {decisionReceipt.final_priority}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="case-review-empty">
            <AlertTriangle size={28} />
            <strong>No system flag attached.</strong>
            <p>In production this case would arrive with the flag already calculated.</p>
          </div>
        )}
      </section>

      {activeSource && <SourcePreview item={activeSource} onClose={() => setActiveSource(null)} />}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="case-detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SourcePreview({ item, onClose }: { item: SourceItem; onClose: () => void }) {
  return (
    <div className="source-preview-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className={`source-preview ${appClass(item.app)}`} role="dialog" aria-modal="true" aria-label={item.title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <span className="source-app-icon">{sourceIcon(item.app)}</span>
          <div>
            <small>{item.app} · {item.time}</small>
            <h2>{item.title}</h2>
          </div>
          <button type="button" aria-label="Close preview" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <section className="source-preview-body">
          <div className="source-preview-actions">
            <a
              className="source-open-link"
              href={item.external_url || microsoft365Url(item.app)}
              target="_blank"
              rel="noreferrer"
            >
              <ArrowUpRight size={15} />
              Open in Microsoft 365
            </a>
            <span>Demo preview stays in this website; the 365 button opens the real app shell.</span>
          </div>
          <div className="source-preview-meta">
            <span>Owner</span>
            <strong>{item.owner}</strong>
          </div>
          <p className="source-preview-summary">{item.summary}</p>
          <div className="source-message">
            <p>{item.body}</p>
          </div>
        </section>
      </aside>
    </div>
  );
}

function sourceIcon(app: SourceItem["app"]) {
  if (app === "Outlook") return <Mail size={17} />;
  if (app === "Teams") return <MessageSquareText size={17} />;
  return <FileText size={17} />;
}

function microsoft365Url(app: SourceItem["app"]) {
  if (app === "Outlook") return "https://outlook.office.com/mail/";
  if (app === "Teams") return "https://teams.microsoft.com/";
  if (app === "SharePoint") return "https://www.office.com/launch/sharepoint";
  return "https://www.office.com/";
}

function appClass(app: SourceItem["app"]) {
  return app.toLowerCase().replace(/\s+/g, "-");
}

function plainReason(factor: string) {
  const key = factor.toLowerCase();
  if (key.includes("vulnerability")) return "Extra care needed";
  if (key.includes("case age")) return "Open long enough to need attention";
  if (key.includes("urgency")) return "Urgent wording in the notes";
  if (key.includes("area")) return "Local service-risk context";
  if (key.includes("repeat")) return "Repeated contact";
  if (key.includes("service")) return "Service area needs caution";
  return factor;
}

function plainImpact(impact: string) {
  return impact
    .replace("Raises priority because extra care is needed.", "The case includes vulnerability or safeguarding context.")
    .replace("The case has been open long enough to require attention.", "The issue has waited long enough that it should be checked.")
    .replace("The case text contains high-risk terms.", "The notes include words that suggest risk or urgency.")
    .replace("Used as a service-risk context signal, not an eligibility decision.", "This helps staff understand local service pressure. It must not decide access to a service.");
}
