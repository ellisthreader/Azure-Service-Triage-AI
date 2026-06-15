import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  Home,
  LogIn,
  LogOut,
  Mail,
  MessageSquareText,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import type { AuditSummary, CaseRecord, CaseRequest, Health, Prediction, StaffMember } from "../api";
import {
  SYNTHETIC_STAFF,
  clean,
  fallbackCaseQueue,
  fetchAuditSummary,
  fetchCaseQueue,
  fetchHealth,
  postAssignToSelf,
} from "../api";
import { TriageForm } from "../dashboard/TriageForm";

type DashboardTab = "overview" | "triage";

const TABS: Array<{ id: DashboardTab; label: string; icon: ReactNode; helper: string }> = [
  { id: "overview", label: "Today", icon: <Home size={16} />, helper: "Priority list" },
  { id: "triage", label: "Case details", icon: <ShieldCheck size={16} />, helper: "Review record" },
];

type Props = {
  caseInput: CaseRequest;
  setCaseInput: (next: CaseRequest) => void;
  prediction: Prediction | null;
  setPrediction: (p: Prediction | null) => void;
};

const PROFILE_STORAGE_KEY = "service-priority-demo-profile";

export function Dashboard({ setCaseInput, setPrediction }: Props) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("triage");
  const [caseQueue, setCaseQueue] = useState<CaseRecord[]>(fallbackCaseQueue);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(fallbackCaseQueue[0]?.case_id ?? null);
  const [health, setHealth] = useState<Health | null>(null);
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(() => readSavedProfile());

  const activeLabel = TABS.find((tab) => tab.id === activeTab)?.label ?? "Today";
  const highQueueCount = caseQueue.filter((row) => row.risk === "high").length;
  const unassignedCount = caseQueue.filter((row) => !row.assigned_to).length;
  const activeStaffCount = new Set(caseQueue.map((row) => row.assigned_to?.id).filter(Boolean)).size;

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
    setDecisionError(null);
    changeTab("triage");
  }

  function signIn() {
    setCurrentUser(SYNTHETIC_STAFF.me);
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(SYNTHETIC_STAFF.me));
    setDecisionError(null);
  }

  function signOut() {
    setCurrentUser(null);
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    setDecisionError(null);
  }

  async function assignSelectedToSelf() {
    if (!selectedCaseId) return;
    if (!currentUser) {
      setDecisionError("Sign in with your profile before assigning a case.");
      return;
    }
    setDecisionSaving(true);
    setDecisionError(null);
    try {
      const updated = await postAssignToSelf(selectedCaseId, currentUser);
      setCaseQueue((rows) => rows.map((row) => (row.case_id === selectedCaseId ? updated : row)));
      setCaseInput(updated.case_request);
      setPrediction(updated.prediction ?? null);
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : "The case could not be assigned.");
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

        <div className="employee-profile-card">
          {currentUser ? (
            <>
              <img src={currentUser.avatar_url} alt="" />
              <div>
                <span>Signed in</span>
                <strong>{currentUser.name}</strong>
                <small>{currentUser.role}</small>
              </div>
              <button type="button" aria-label="Sign out" onClick={signOut}>
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <span className="unassigned-avatar"><LogIn size={16} /></span>
              <div>
                <span>Not signed in</span>
                <strong>No profile active</strong>
                <small>Sign in to assign cases to yourself</small>
              </div>
              <button type="button" aria-label="Sign in" onClick={signIn}>
                <LogIn size={16} />
              </button>
            </>
          )}
        </div>

        <div className="employee-status-card">
          <span className={health ? "status-dot online" : "status-dot offline"} />
          <div>
            <strong>{health ? "Case data ready" : "Case data unavailable"}</strong>
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
            {currentUser ? (
              <span className="employee-user-pill">
                <img src={currentUser.avatar_url} alt="" />
                <span>{currentUser.name}</span>
              </span>
            ) : (
              <button type="button" className="employee-login-button" onClick={signIn}>
                <LogIn size={16} />
                Sign in
              </button>
            )}
            <span className={`employee-api ${health ? "online" : "offline"}`}>
              {health ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {health ? "Live" : "Offline"}
            </span>
          </div>
        </header>

        <div className="employee-content">
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
                    <span>{highQueueCount} high risk · {unassignedCount} unassigned · {activeStaffCount} staff active</span>
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
                          {row.assigned_to ? (
                            <>
                              <img src={row.assigned_to.avatar_url} alt="" />
                              <span>
                                <strong>{row.assigned_to.name}</strong>
                                <small>{row.assigned_to.role}</small>
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="unassigned-avatar"><UserPlus size={16} /></span>
                              <span>
                                <strong>Unassigned</strong>
                                <small>Open case to assign to yourself</small>
                              </span>
                            </>
                          )}
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
                  <span>Assignment failed: {decisionError}. Check the API endpoint, then try again.</span>
                </div>
              )}
              <TriageForm
                caseRecord={caseQueue.find((row) => row.case_id === selectedCaseId) ?? null}
                decisionSaving={decisionSaving}
                onAssignToSelf={assignSelectedToSelf}
                currentUser={currentUser}
                onSignIn={signIn}
              />
            </section>
          )}

        </div>
      </main>
    </div>
  );
}

function readSavedProfile(): StaffMember | null {
  try {
    const saved = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as StaffMember;
  } catch {
    return null;
  }
}
