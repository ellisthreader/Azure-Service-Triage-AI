import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderOpen,
  Image,
  Mail,
  MessageSquareText,
  Phone,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { CaseRecord, EvidenceItem as ApiEvidenceItem, M365SourceDetail, SourceItem, StaffMember } from "../api";
import { API_BASE, fetchCaseEvidenceDetail, fetchCaseSourceDetail } from "../api";
import { clean } from "../api";

type Props = {
  caseRecord: CaseRecord | null;
  decisionSaving?: boolean;
  onAssignToSelf?: () => Promise<void>;
  currentUser?: StaffMember | null;
  onSignIn?: () => void;
};

type DetailRow = [label: string, value: string];

type LocalUpdate = {
  id: string;
  action: string;
  note: string;
  by: string;
};

type CaseDetailTab = "overview" | "evidence" | "notes" | "updates";
type EvidenceItem = ApiEvidenceItem;

export function TriageForm({
  caseRecord,
  decisionSaving = false,
  onAssignToSelf,
  currentUser,
  onSignIn,
}: Props) {
  const [activeSource, setActiveSource] = useState<SourceItem | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<EvidenceItem | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [nextAction, setNextAction] = useState("Contact resident");
  const [localUpdates, setLocalUpdates] = useState<LocalUpdate[]>([]);
  const [activeTab, setActiveTab] = useState<CaseDetailTab>("overview");

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
  const tabItems: Array<{ id: CaseDetailTab; label: string; count?: number }> = [
    { id: "overview", label: "Overview" },
    { id: "evidence", label: "Evidence", count: caseRecord.evidence_items.length },
    { id: "notes", label: "Notes", count: sourceItems.length },
    { id: "updates", label: "Updates", count: caseRecord.activity.length + localUpdates.length },
  ];
  const keyDetails: DetailRow[] = [
    ["Team", caseRecord.team],
    ["District", request.district],
    ["Channel", clean(request.channel)],
    ["Days open", `${request.days_open}`],
    ["Prior contacts", `${request.previous_contacts}`],
  ];
  const alerts: DetailRow[] = [
    ...(request.accessibility_need ? [["Accessibility need", "Yes"]] as DetailRow[] : []),
    ...(request.vulnerability_flag ? [["Vulnerability context", "Yes"]] as DetailRow[] : []),
    ...(request.duplicate_signal ? [["Duplicate signal", "Yes"]] as DetailRow[] : []),
  ];
  const moreDetails: DetailRow[] = [
    ["Case reference", caseRecord.case_id],
    ["Service", caseRecord.service_label],
    ["Status", caseRecord.status],
    ["Due", caseRecord.due],
    ["Source", caseRecord.source],
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
        <CaseHeader caseRecord={caseRecord} />
        <CaseDetailTabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "overview" && (
          <div className="case-primary-grid" role="tabpanel" aria-label="Overview">
            <div className="case-primary-main">
              <CaseSummary caseRecord={caseRecord} />
              <KeyDetails details={[...keyDetails, ...alerts]} moreDetails={moreDetails} />
            </div>

            <aside className="case-action-rail" aria-label="Case actions">
              <AssignmentPanel
                caseRecord={caseRecord}
                currentUser={currentUser}
                decisionSaving={decisionSaving}
                onAssignToSelf={onAssignToSelf}
                onSignIn={onSignIn}
              />
              {caseRecord.assigned_to && (
                <CaseUpdateForm
                  nextAction={nextAction}
                  updateText={updateText}
                  onNextActionChange={setNextAction}
                  onUpdateTextChange={setUpdateText}
                  onAddUpdate={addUpdate}
                />
              )}
            </aside>
          </div>
        )}

        {activeTab === "evidence" && (
          <div role="tabpanel" aria-label="Evidence">
            <EvidenceList caseRecord={caseRecord} onOpen={setActiveEvidence} />
          </div>
        )}

        {activeTab === "notes" && (
          <div role="tabpanel" aria-label="Notes">
            <LinkedItemsList items={sourceItems} onOpen={setActiveSource} />
          </div>
        )}

        {activeTab === "updates" && (
          <div role="tabpanel" aria-label="Updates">
            <ActivityList caseRecord={caseRecord} localUpdates={localUpdates} />
          </div>
        )}
      </section>

      {activeSource && <SourcePreview caseId={caseRecord.case_id} item={activeSource} onClose={() => setActiveSource(null)} />}
      {activeEvidence && <EvidencePreview caseId={caseRecord.case_id} item={activeEvidence} onClose={() => setActiveEvidence(null)} />}
    </div>
  );
}

function CaseDetailTabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: Array<{ id: CaseDetailTab; label: string; count?: number }>;
  activeTab: CaseDetailTab;
  onChange: (tab: CaseDetailTab) => void;
}) {
  return (
    <nav className="case-detail-tabs" aria-label="Case detail sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={activeTab === tab.id ? "active" : ""}
          aria-current={activeTab === tab.id ? "page" : undefined}
          onClick={() => onChange(tab.id)}
        >
          <span>{tab.label}</span>
          {typeof tab.count === "number" && <em>{tab.count}</em>}
        </button>
      ))}
    </nav>
  );
}

function CaseHeader({ caseRecord }: { caseRecord: CaseRecord }) {
  const request = caseRecord.case_request;
  const confidence = priorityConfidence(caseRecord);

  return (
    <header className="simple-case-header">
      <div>
        <div className="case-header-meta">
          <span className={`risk-badge priority-badge ${caseRecord.risk}`}>
            <strong>{clean(caseRecord.risk)} priority</strong>
            <span>{confidence}%</span>
          </span>
        </div>
        <h2>{caseRecord.service_label}</h2>
        <span className="case-header-submeta">{caseRecord.case_id} · {caseRecord.status}</span>
        <p>{request.urgency_text}</p>
      </div>
      <div className="simple-case-due">
        <span>Due</span>
        <strong>{caseRecord.due}</strong>
      </div>
    </header>
  );
}

function priorityConfidence(caseRecord: CaseRecord) {
  if (caseRecord.prediction?.confidence) {
    return Math.round(caseRecord.prediction.confidence * 100);
  }

  if (caseRecord.risk === "high") return 92;
  if (caseRecord.risk === "medium") return 74;
  return 61;
}

function CaseSummary({ caseRecord }: { caseRecord: CaseRecord }) {
  return (
    <section className="simple-case-section case-summary-section">
      <h3>What needs attention</h3>
      <p className="case-lead">{caseRecord.summary}</p>
      <div className="case-context-list">
        <p><strong>Access:</strong> {caseRecord.access_notes}</p>
        <p><strong>Household/context:</strong> {caseRecord.household_context}</p>
      </div>
    </section>
  );
}

function AssignmentPanel({
  caseRecord,
  currentUser,
  decisionSaving,
  onAssignToSelf,
  onSignIn,
}: {
  caseRecord: CaseRecord;
  currentUser?: StaffMember | null;
  decisionSaving: boolean;
  onAssignToSelf?: () => Promise<void>;
  onSignIn?: () => void;
}) {
  return (
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
            <p>{currentUser ? `Assign this case to ${currentUser.name} before adding work updates.` : "Sign in with your profile before assigning this case."}</p>
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
  );
}

function KeyDetails({ details, moreDetails }: { details: DetailRow[]; moreDetails: DetailRow[] }) {
  return (
    <section className="simple-case-section">
      <h3>Key details</h3>
      <DetailList details={details} />
      <details className="more-case-data">
        <summary>More case data</summary>
        <DetailList details={moreDetails} />
      </details>
    </section>
  );
}

function DetailList({ details }: { details: DetailRow[] }) {
  return (
    <dl className="simple-variable-list">
      {details.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EvidenceList({ caseRecord, onOpen }: { caseRecord: CaseRecord; onOpen: (item: EvidenceItem) => void }) {
  return (
    <section className="simple-case-section">
      <div className="simple-section-head">
        <h3>Supporting evidence</h3>
        <span>{caseRecord.evidence_items.length} items</span>
      </div>
      <div className="simple-evidence-list">
        {caseRecord.evidence_items.map((item) => (
          <button key={evidenceId(item)} type="button" onClick={() => onOpen(item)}>
            {item.image_url ? <img src={item.image_url} alt={item.title} /> : <span className="source-app-icon">{item.type === "note" ? <MessageSquareText size={17} /> : <FileText size={17} />}</span>}
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              <small>{item.source}</small>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function LinkedItemsList({ items, onOpen }: { items: SourceItem[]; onOpen: (item: SourceItem) => void }) {
  return (
    <section className="simple-case-section">
      <div className="simple-section-head">
        <h3>Notes and previous contacts</h3>
        <span>{items.length} linked items</span>
      </div>
      <div className="simple-source-list">
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => onOpen(item)}>
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
  );
}

function CaseUpdateForm({
  nextAction,
  updateText,
  onNextActionChange,
  onUpdateTextChange,
  onAddUpdate,
}: {
  nextAction: string;
  updateText: string;
  onNextActionChange: (value: string) => void;
  onUpdateTextChange: (value: string) => void;
  onAddUpdate: () => void;
}) {
  return (
    <section className="simple-case-section simple-work-section">
      <h3>Work on this case</h3>
      <label>
        Next action
        <select value={nextAction} onChange={(event) => onNextActionChange(event.target.value)}>
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
          onChange={(event) => onUpdateTextChange(event.target.value)}
          placeholder="Write a short case update..."
        />
      </label>
      <button type="button" className="btn-primary simple-update-button" onClick={onAddUpdate} disabled={!updateText.trim()}>
        <CheckCircle2 size={16} />
        Add update
      </button>
    </section>
  );
}

function ActivityList({ caseRecord, localUpdates }: { caseRecord: CaseRecord; localUpdates: LocalUpdate[] }) {
  return (
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
  );
}

function SourcePreview({ caseId, item, onClose }: { caseId: string; item: SourceItem; onClose: () => void }) {
  const [detail, setDetail] = useState<M365SourceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCaseSourceDetail(caseId, item.id)
      .then((result) => {
        if (!active) return;
        setDetail(result);
      })
      .catch(() => {
        if (!active) return;
        setDetail(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [caseId, item.id]);

  const title = detail?.title || item.title;
  const time = detail?.time || item.time;
  const body = readableBody(detail?.body || item.body, detail?.content_type);
  const summary = detail?.summary || item.summary;
  const webUrl = detail?.web_url || item.external_url || microsoft365Url(item.app);

  return (
    <div className="source-preview-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className={`source-preview ${appClass(item.app)}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <span className="source-app-icon">{sourceIcon(item.app)}</span>
          <div>
            <small>{item.app} · {time}</small>
            <h2>{title}</h2>
          </div>
          <button type="button" aria-label="Close preview" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <section className="source-preview-body">
          <div className="source-preview-actions">
            <a
              className="source-open-link"
              href={webUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ArrowUpRight size={15} />
              Open 365
            </a>
          </div>
          <SourceContentPreview
            app={item.app}
            body={body}
            loading={loading}
            owner={detail?.owner || item.owner}
            summary={summary}
            time={time}
            title={title}
            type={item.type}
          />
        </section>
      </aside>
    </div>
  );
}

function EvidencePreview({ caseId, item, onClose }: { caseId: string; item: EvidenceItem; onClose: () => void }) {
  const [detail, setDetail] = useState<M365SourceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCaseEvidenceDetail(caseId, evidenceId(item))
      .then((result) => {
        if (!active) return;
        setDetail(result);
      })
      .catch(() => {
        if (!active) return;
        setDetail(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [caseId, item]);

  const title = detail?.title || item.title;
  const source = detail?.source || item.source;
  const body = readableBody(detail?.body || item.detail, detail?.content_type);
  const imageUrl = m365AssetUrl(detail?.image_url || detail?.preview_url || item.image_url || "");
  const contentUrl = m365AssetUrl(detail?.content_url || "");
  const contentType = detail?.content_type || item.content_type || "";
  const webUrl = detail?.web_url || item.web_url || "";
  const showDetailBelowPreview = Boolean(imageUrl || contentUrl);

  return (
    <div className="source-preview-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="source-preview evidence-preview" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <span className="source-app-icon">{item.type === "photo" ? <Image size={17} /> : item.type === "note" ? <MessageSquareText size={17} /> : <FileText size={17} />}</span>
          <div>
            <small>{source} · {clean(item.type)}</small>
            <h2>{title}</h2>
          </div>
          <button type="button" aria-label="Close preview" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <section className="source-preview-body">
          <div className="source-preview-actions">
            {webUrl ? (
              <a className="source-open-link" href={webUrl} target="_blank" rel="noreferrer">
                <ArrowUpRight size={15} />
                Open 365
              </a>
            ) : null}
          </div>
          <EvidenceContentPreview
            body={body}
            contentType={contentType}
            contentUrl={contentUrl}
            imageUrl={imageUrl}
            itemType={item.type}
            loading={loading}
            source={source}
            title={title}
          />
          {showDetailBelowPreview ? (
            <div className="source-message">
              <p>{loading ? "Loading..." : body}</p>
            </div>
          ) : null}
        </section>
      </aside>
    </div>
  );
}

function SourceContentPreview({
  app,
  body,
  loading,
  owner,
  summary,
  time,
  title,
  type,
}: {
  app: SourceItem["app"];
  body: string;
  loading: boolean;
  owner: string;
  summary: string;
  time: string;
  title: string;
  type: string;
}) {
  if (loading) {
    return (
      <div className="source-message">
        <p>Loading Microsoft 365 record...</p>
      </div>
    );
  }

  const content = body || summary || "No saved content is available for this record.";

  if (app === "Outlook") {
    return (
      <article className="m365-content outlook-content">
        <div className="email-header">
          <span className="email-avatar">
            <Mail size={18} />
          </span>
          <div>
            <span>Outlook email</span>
            <h3>{title}</h3>
            <dl>
              <div>
                <dt>From</dt>
                <dd>{owner || "Shared mailbox"}</dd>
              </div>
              <div>
                <dt>To</dt>
                <dd>Duty casework inbox</dd>
              </div>
              <div>
                <dt>Received</dt>
                <dd>{time}</dd>
              </div>
            </dl>
          </div>
        </div>
        {summary ? <p className="email-summary">{summary}</p> : null}
        <div className="email-body">
          {paragraphs(content).map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </div>
      </article>
    );
  }

  if (app === "Teams") {
    const lines = transcriptLines(content);
    return (
      <article className="m365-content teams-content">
        <div className="teams-thread-head">
          <span className="teams-channel">Teams</span>
          <div>
            <h3>{title}</h3>
            <p>{owner || "Duty team"} · {time}</p>
          </div>
        </div>
        <div className="teams-transcript" aria-label="Teams transcript">
          {lines.map((line, index) => (
            <div className="teams-line" key={`${line}-${index}`}>
              <span>{index === 0 ? time : `+${index * 2} min`}</span>
              <div>
                <strong>{index === 0 ? owner || "Duty team" : "Follow-up"}</strong>
                <p>{line}</p>
              </div>
            </div>
          ))}
        </div>
      </article>
    );
  }

  if (app === "SharePoint") {
    return (
      <article className="m365-content sharepoint-content">
        <div className="sharepoint-file-head">
          <span>
            <FolderOpen size={18} />
          </span>
          <div>
            <small>SharePoint file</small>
            <h3>{title}</h3>
          </div>
        </div>
        <dl className="sharepoint-fields">
          <div>
            <dt>Library</dt>
            <dd>Case evidence</dd>
          </div>
          <div>
            <dt>Item type</dt>
            <dd>{clean(type)}</dd>
          </div>
          <div>
            <dt>Saved</dt>
            <dd>{time}</dd>
          </div>
        </dl>
        <div className="source-message">
          {paragraphs(content).map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </div>
      </article>
    );
  }

  return (
    <article className="m365-content case-note-content">
      <div className="case-note-head">
        <MessageSquareText size={18} />
        <div>
          <small>Case note</small>
          <h3>{title}</h3>
          <p>{owner || app} · {time}</p>
        </div>
      </div>
      <dl className="case-note-fields">
        <div>
          <dt>Source</dt>
          <dd>{app}</dd>
        </div>
        <div>
          <dt>Record type</dt>
          <dd>{clean(type)}</dd>
        </div>
      </dl>
      {summary ? <p className="source-preview-summary">{summary}</p> : null}
      <div className="source-message">
        {paragraphs(content).map((line, index) => (
          <p key={`${line}-${index}`}>{line}</p>
        ))}
      </div>
    </article>
  );
}

function EvidenceContentPreview({
  body,
  contentType,
  contentUrl,
  imageUrl,
  itemType,
  loading,
  source,
  title,
}: {
  body: string;
  contentType: string;
  contentUrl: string;
  imageUrl: string;
  itemType: EvidenceItem["type"];
  loading: boolean;
  source: string;
  title: string;
}) {
  const normalizedType = contentType.toLowerCase();

  if (loading) {
    return (
      <div className="evidence-preview-placeholder">
        <FileText size={22} />
        <span>Loading Microsoft 365 evidence...</span>
      </div>
    );
  }

  if (imageUrl || normalizedType.startsWith("image/")) {
    return <img className="evidence-preview-image" src={imageUrl || contentUrl} alt={title} />;
  }

  if (contentUrl && normalizedType.includes("pdf")) {
    return <iframe className="evidence-preview-frame" title={title} src={contentUrl} />;
  }

  if (contentUrl && (normalizedType.startsWith("text/") || normalizedType.includes("json"))) {
    return <iframe className="evidence-preview-frame compact" title={title} src={contentUrl} />;
  }

  if (isOfficeFile(normalizedType)) {
    return (
      <div className="evidence-preview-content evidence-record">
        <FileText size={22} />
        <strong>{title}</strong>
        <dl>
          <div>
            <dt>Source</dt>
            <dd>{source}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{clean(itemType)}</dd>
          </div>
        </dl>
        <p>{body || "Office document preview is not available in-browser without Office web embed or server-side conversion."}</p>
      </div>
    );
  }

  return (
    <div className="evidence-preview-content evidence-record">
      {itemType === "photo" ? <Image size={22} /> : itemType === "note" ? <MessageSquareText size={22} /> : <FileText size={22} />}
      <strong>{title}</strong>
      <dl>
        <div>
          <dt>Source</dt>
          <dd>{source}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{clean(itemType)}</dd>
        </div>
      </dl>
      <p>{body || clean(itemType)}</p>
    </div>
  );
}

function isOfficeFile(contentType: string) {
  return (
    contentType.includes("officedocument") ||
    contentType.includes("msword") ||
    contentType.includes("ms-powerpoint") ||
    contentType.includes("ms-excel")
  );
}

function evidenceId(item: EvidenceItem) {
  return item.id || item.title.toLowerCase().replace(/&/g, "and").replace(/\//g, "-").replace(/\s+/g, "-");
}

function paragraphs(value: string) {
  return value
    .split(/\r?\n\s*\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function transcriptLines(value: string) {
  const lines = (value.match(/[^.!?]+[.!?]?/g) || []).map((line) => line.trim()).filter(Boolean);
  return lines.length ? lines : ["No transcript text is available for this record."];
}

function m365AssetUrl(value: string) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) return value;
  if (!value.startsWith("/m365/")) return value;
  return `${API_BASE}${value}`;
}

function readableBody(value: string, contentType?: string) {
  if (!value) return "";
  if (!contentType?.toLowerCase().includes("html")) return value;

  if (typeof window === "undefined") {
    return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  const element = window.document.createElement("div");
  element.innerHTML = value;
  return element.textContent?.replace(/\s+/g, " ").trim() || value;
}

function sourceIcon(app: SourceItem["app"]) {
  if (app === "Outlook") return <img src="/m365-icons/outlook.svg" alt="" />;
  if (app === "Teams") return <img src="/m365-icons/teams.svg" alt="" />;
  if (app === "SharePoint") return <img src="/m365-icons/sharepoint.svg" alt="" />;
  if (app === "Phone") return <Phone size={17} />;
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
