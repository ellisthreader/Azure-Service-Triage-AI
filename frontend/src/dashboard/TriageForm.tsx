import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  MessageSquareText,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import type { CaseRecord, SourceItem, StaffMember } from "../api";
import { clean } from "../api";

type Props = {
  caseRecord: CaseRecord | null;
  decisionSaving?: boolean;
  onAssignToSelf?: () => Promise<void>;
  currentUser?: StaffMember | null;
  onSignIn?: () => void;
};

export function TriageForm({
  caseRecord,
  decisionSaving = false,
  onAssignToSelf,
  currentUser,
  onSignIn,
}: Props) {
  const [activeSource, setActiveSource] = useState<SourceItem | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [nextAction, setNextAction] = useState("Contact resident");
  const [localUpdates, setLocalUpdates] = useState<Array<{ id: string; action: string; note: string; by: string }>>([]);

  if (!caseRecord) {
    return (
      <section className="panel case-review-empty">
        <ClipboardList size={28} />
        <strong>Select a case from today's priority list.</strong>
        <p>The case will open with its details, evidence, notes, and recent activity.</p>
      </section>
    );
  }

  const request = caseRecord.case_request;
  const sourceItems = [...caseRecord.case_notes, ...caseRecord.previous_contacts];
  const variables = [
    ["Case reference", caseRecord.case_id],
    ["Service", caseRecord.service_label],
    ["Team", caseRecord.team],
    ["Status", caseRecord.status],
    ["Due", caseRecord.due],
    ["Source", caseRecord.source],
    ["District", request.district],
    ["Channel", clean(request.channel)],
    ["Days open", `${request.days_open}`],
    ["Prior contacts", `${request.previous_contacts}`],
    ["Accessibility need", request.accessibility_need ? "Yes" : "No"],
    ["Vulnerability context", request.vulnerability_flag ? "Yes" : "No"],
    ["Duplicate signal", request.duplicate_signal ? "Yes" : "No"],
    ["Area context", clean(request.deprivation_band)],
  ];

  const addUpdate = () => {
    const note = updateText.trim();
    if (!note) return;
    setLocalUpdates((items) => [
      {
        id: `local-${Date.now()}`,
        action: nextAction,
        note,
        by: currentUser?.name ?? "Unsigned user",
      },
      ...items,
    ]);
    setUpdateText("");
  };

  return (
    <div className="case-review">
      <section className="panel case-overview-panel simple-case-record">
        <header className="simple-case-header">
          <div>
            <span className={`risk-badge ${caseRecord.risk}`}>{clean(caseRecord.risk)} priority</span>
            <h2>{caseRecord.service_label}</h2>
            <p>{request.urgency_text}</p>
          </div>
          <div className="simple-case-due">
            <span>Due</span>
            <strong>{caseRecord.due}</strong>
          </div>
        </header>

        <section className="simple-case-section">
          <h3>Case summary</h3>
          <p>{caseRecord.summary}</p>
          <p><strong>Access:</strong> {caseRecord.access_notes}</p>
          <p><strong>Household/context:</strong> {caseRecord.household_context}</p>
        </section>

        <section className="simple-case-section simple-assignment">
          {caseRecord.assigned_to ? (
            <>
              <img src={caseRecord.assigned_to.avatar_url} alt="" />
              <div>
                <h3>Assigned officer</h3>
                <strong>{caseRecord.assigned_to.name}</strong>
                <p>{caseRecord.assigned_to.role} · {caseRecord.assigned_to.username}</p>
              </div>
            </>
          ) : (
            <>
              <span className="unassigned-avatar large"><UserPlus size={20} /></span>
              <div>
                <h3>Assigned officer</h3>
                <strong>Unassigned</strong>
                <p>{currentUser ? `Pick this up as ${currentUser.name}.` : "Sign in with your profile before assigning this case."}</p>
              </div>
              <button
                type="button"
                className="btn-primary assign-self-button"
                disabled={decisionSaving}
                onClick={currentUser ? onAssignToSelf : onSignIn}
              >
                <UserPlus size={16} />
                <span>{decisionSaving ? "Assigning..." : currentUser ? "Assign to me" : "Sign in"}</span>
              </button>
            </>
          )}
        </section>

        <section className="simple-case-section">
          <h3>Variables</h3>
          <dl className="simple-variable-list">
            {variables.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="simple-case-section">
          <div className="simple-section-head">
            <h3>Evidence</h3>
            <span>{caseRecord.evidence_items.length} items</span>
          </div>
          <div className="simple-evidence-list">
            {caseRecord.evidence_items.map((item) => (
              <article key={`${item.source}-${item.title}`}>
                {item.image_url ? <img src={item.image_url} alt={item.title} /> : <span className="source-app-icon">{item.type === "note" ? <MessageSquareText size={17} /> : <FileText size={17} />}</span>}
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <small>{item.source}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="simple-case-section">
          <div className="simple-section-head">
            <h3>Notes and previous contacts</h3>
            <span>{sourceItems.length} linked items</span>
          </div>
          <div className="simple-source-list">
            {sourceItems.map((item) => (
              <button key={item.id} type="button" onClick={() => setActiveSource(item)}>
                <span className="source-app-icon">{sourceIcon(item.app)}</span>
                <span>
                  <strong>{item.title}</strong>
                  <em>{item.summary}</em>
                  <small>{item.app} · {item.time}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="simple-case-section simple-work-section">
          <h3>Work on this case</h3>
          <label>
            Next action
            <select value={nextAction} onChange={(event) => setNextAction(event.target.value)}>
              <option>Contact resident</option>
              <option>Request evidence</option>
              <option>Check linked records</option>
              <option>Refer to duty manager</option>
              <option>Book service visit</option>
              <option>Mark waiting for update</option>
            </select>
          </label>
          <label>
            Add update
            <textarea
              value={updateText}
              onChange={(event) => setUpdateText(event.target.value)}
              placeholder="Write a short case update..."
            />
          </label>
          <button type="button" className="btn-primary simple-update-button" onClick={addUpdate} disabled={!updateText.trim()}>
            <CheckCircle2 size={16} />
            Add update
          </button>
        </section>

        <section className="simple-case-section">
          <h3>Recent updates</h3>
          <div className="simple-update-list">
            {localUpdates.map((item) => (
              <article key={item.id}>
                <strong>{item.action}</strong>
                <p>{item.note}</p>
                <small>{item.by} · just now</small>
              </article>
            ))}
            {caseRecord.activity.map((item) => (
              <article key={item.id}>
                <strong>{item.action}</strong>
                <p>{item.detail}</p>
                <small>{item.actor.name} · {item.time}</small>
              </article>
            ))}
          </div>
        </section>
      </section>

      {activeSource && <SourcePreview item={activeSource} onClose={() => setActiveSource(null)} />}
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
  if (app === "Outlook") return <img src="/m365-icons/outlook.svg" alt="" />;
  if (app === "Teams") return <img src="/m365-icons/teams.svg" alt="" />;
  if (app === "SharePoint") return <img src="/m365-icons/sharepoint.svg" alt="" />;
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
