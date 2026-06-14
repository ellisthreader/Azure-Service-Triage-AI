import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  Home,
  Mail,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import type { AuditSummary, CaseRecord, CaseRequest, DecisionReceipt, Health, Prediction } from "../api";
import {
  clean,
  fallbackCaseQueue,
  fetchAuditSummary,
  fetchCaseQueue,
  fetchHealth,
  postDecision,
} from "../api";
import { TriageForm } from "../dashboard/TriageForm";

type DashboardTab = "overview" | "triage";

const TABS: Array<{ id: DashboardTab; label: string; icon: ReactNode; helper: string }> = [
  { id: "overview", label: "Today", icon: <Home size={16} />, helper: "Priority list" },
  { id: "triage", label: "Case details", icon: <ShieldCheck size={16} />, helper: "Review and decide" },
];

type Props = {
  caseInput: CaseRequest;
  setCaseInput: (next: CaseRequest) => void;
  prediction: Prediction | null;
  setPrediction: (p: Prediction | null) => void;
};

export function Dashboard({ caseInput, setCaseInput, prediction, setPrediction }: Props) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [caseQueue, setCaseQueue] = useState<CaseRecord[]>(fallbackCaseQueue);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(fallbackCaseQueue[0]?.case_id ?? null);
  const [health, setHealth] = useState<Health | null>(null);
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionReceipt, setDecisionReceipt] = useState<DecisionReceipt | null>(null);

  const activeLabel = TABS.find((tab) => tab.id === activeTab)?.label ?? "Today";
  const highQueueCount = caseQueue.filter((row) => row.risk === "high").length;

  const changeTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      document.querySelector(".employee-content")?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetchHealth().then((result) => active && setHealth(result));
      fetchAuditSummary().then((result) => active && setAuditSummary(result));
      fetchCaseQueue().then((result) => {
        if (!active || !result) return;
        setCaseQueue(result);
        const selected = result.find((row) => row.case_id === selectedCaseId) ?? result[0];
        if (selected) {
          setSelectedCaseId(selected.case_id);
          setCaseInput(selected.case_request);
          setPrediction(selected.prediction ?? null);
        }
      });
    };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [selectedCaseId, setCaseInput]);

  function openCase(row: CaseRecord) {
    setSelectedCaseId(row.case_id);
    setCaseInput(row.case_request);
    setPrediction(row.prediction ?? null);
    setDecisionReceipt(null);
    setDecisionError(null);
    changeTab("triage");
  }

  async function recordOfficerDecision(finalPriority: Prediction["priority"], overrideReason: string) {
    if (!selectedCaseId || !prediction) return;
    setDecisionSaving(true);
    setDecisionError(null);
    try {
      const receipt = await postDecision(selectedCaseId, {
        final_priority: finalPriority,
        override_reason: overrideReason,
        action_taken: "",
        officer_id: "demo.officer",
        case_request: caseInput,
        prediction,
      });
      setDecisionReceipt(receipt);
      const audit = await fetchAuditSummary();
      setAuditSummary(audit);
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : "The decision could not be recorded.");
    } finally {
      setDecisionSaving(false);
    }
  }

  return (
    <div className="employee-shell">
      <aside className="employee-sidebar" aria-label="Employee dashboard navigation">
        <a className="employee-brand" href="#/" aria-label="Return to Essex County Council home">
          <img src="/essex-brand/ecc-logo-long-red.svg" alt="Essex County Council" />
          <span>Service Priority AI</span>
        </a>

        <button className="employee-primary-action" type="button" onClick={() => changeTab("triage")}>
          <ShieldCheck size={17} />
          <span>Review selected case</span>
        </button>

        <nav className="employee-nav" aria-label="Dashboard sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => changeTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <small>{tab.helper}</small>
            </button>
          ))}
        </nav>

        <div className="employee-status-card">
          <span className={health ? "status-dot online" : "status-dot offline"} />
          <div>
            <strong>{health ? "Case flags ready" : "Case flags unavailable"}</strong>
            <small>Model {health?.model_version ?? "pending"}</small>
          </div>
        </div>

        <div className="employee-status-card">
          <span className={auditSummary?.durable ? "status-dot online" : "status-dot offline"} />
          <div>
            <strong>{auditSummary?.durable ? "Durable audit ready" : "Audit fallback active"}</strong>
            <small>
              {auditSummary
                ? `${auditSummary.decision_records} decisions · ${auditSummary.prediction_records} predictions`
                : "Waiting for audit summary"}
            </small>
          </div>
        </div>

      </aside>

      <main className="employee-main">
        <header className="employee-topbar">
          <div>
            <span className="employee-kicker">Employee workspace</span>
            <strong>{activeLabel}</strong>
          </div>
          <div className="employee-top-actions">
            <span className={`employee-api ${health ? "online" : "offline"}`}>
              {health ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {health ? "Live" : "Offline"}
            </span>
          </div>
        </header>

        <div className="employee-content">
          <section className="employee-hero employee-hero-compact">
            <div>
              <div className="eyebrow">Today</div>
              <h1>Priority workspace</h1>
              <p>
                Review the cases most likely to need attention, then open the linked notes, handovers, and previous contacts inside this dashboard.
              </p>
            </div>
            <button type="button" className="btn-primary employee-hero-action" onClick={() => selectedCaseId && changeTab("triage")}>
              <ShieldCheck size={17} />
              Review selected case
            </button>
          </section>

          <div className="dashboard-tabs mobile-dashboard-tabs" role="tablist" aria-label="Dashboard sections">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => changeTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <section className="tab-panel employee-overview" role="tabpanel">
              <section className="priority-workspace">
                <div className="priority-inbox">
                  <div className="priority-inbox-head">
                    <div>
                      <h2>Today's priority list</h2>
                      <p>Sorted by urgency. Select a case to open the full record.</p>
                    </div>
                    <span>{highQueueCount} high risk · {new Set(caseQueue.map((row) => row.assigned_to.id)).size} staff active</span>
                  </div>

                  <div className="priority-rows">
                    {caseQueue.map((row) => (
                      <button
                        key={row.case_id}
                        type="button"
                        className={`priority-row ${row.risk} ${selectedCaseId === row.case_id ? "selected" : ""}`}
                        onClick={() => openCase(row)}
                      >
                        <span className="priority-row-status">
                          <i />
                          {clean(row.risk)}
                        </span>
                        <span className="priority-row-main">
                          <strong>{row.service_label}</strong>
                          <em>{row.summary}</em>
                          <span className="priority-row-meta">
                            <span><Clock3 size={13} /> {row.due}</span>
                            <span>{row.status}</span>
                            <span>{row.case_id}</span>
                          </span>
                        </span>
                        <span className="priority-row-owner">
                          <img src={row.assigned_to.avatar_url} alt="" />
                          <span>
                            <strong>{row.assigned_to.name}</strong>
                            <small>{row.assigned_to.role}</small>
                          </span>
                        </span>
                        <span className="priority-row-sources" aria-label="Linked Microsoft 365 items">
                          <span><Mail size={14} /> {row.previous_contacts.length}</span>
                          <span><MessageSquareText size={14} /> {row.case_notes.length}</span>
                          <span><FolderOpen size={14} /> {row.evidence_items.length}</span>
                        </span>
                        <span className="priority-row-open">
                          Open
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="workspace-note">
                  <FileText size={16} />
                  <span>Open a case to view notes and previous contacts from Outlook, Teams, SharePoint, and the case portal without leaving this website.</span>
                </div>
              </section>
            </section>
          )}

          {activeTab === "triage" && (
            <section className="tab-panel" role="tabpanel">
              {decisionError && (
                <div className="error-banner" role="alert">
                  <AlertCircle size={17} />
                  <span>Decision failed: {decisionError}. Check the API audit endpoint, then try again.</span>
                </div>
              )}
              <TriageForm
                caseRecord={caseQueue.find((row) => row.case_id === selectedCaseId) ?? null}
                prediction={prediction}
                onRecordDecision={recordOfficerDecision}
                decisionSaving={decisionSaving}
                decisionReceipt={decisionReceipt}
              />
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
