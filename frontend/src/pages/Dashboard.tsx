import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  BarChart3,
  Bot,
  BrainCircuit,
  ChevronDown,
  ClipboardList,
  Clock3,
  Database,
  FileCheck2,
  FileText,
  FolderOpen,
  GitBranch,
  Home,
  Layers,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  MessageSquareText,
  Server,
  Settings,
  ShieldCheck,
  Upload,
  UserPlus,
} from "lucide-react";
import type { CaseExtraction, CaseRecord, CaseRequest, DashboardSummary, DecisionReceipt, PipelineScore, Prediction, StaffMember } from "../api";
import {
  SYNTHETIC_STAFF,
  clean,
  fallbackDashboard,
  fallbackCaseQueue,
  fetchDashboard,
  fetchCaseQueue,
  postAssignToSelf,
  postDecision,
  postExtractCaseRequest,
  postPipelineScore,
  pct,
} from "../api";
import { Badge } from "../components/primitives";
import { TriageForm } from "../dashboard/TriageForm";

type DashboardTab = "overview" | "triage" | "pipeline" | "mlops";
type MlopsSection = "summary" | "data" | "azure" | "model" | "monitoring" | "governance";

const TABS: Array<{ id: DashboardTab; label: string; icon: ReactNode; helper: string }> = [
  { id: "overview", label: "Today", icon: <Home size={16} />, helper: "Priority list" },
  { id: "triage", label: "Case details", icon: <ShieldCheck size={16} />, helper: "Review record" },
  { id: "pipeline", label: "Decision support", icon: <ClipboardList size={16} />, helper: "Analyse information" },
  { id: "mlops", label: "MLOps", icon: <LockKeyhole size={16} />, helper: "Manager view" },
];

const MLOPS_SECTIONS: Array<{ id: MlopsSection; label: string; icon: ReactNode }> = [
  { id: "summary", label: "Overview", icon: <BarChart3 size={15} /> },
  { id: "data", label: "Database", icon: <Database size={15} /> },
  { id: "azure", label: "Azure delivery", icon: <Server size={15} /> },
  { id: "model", label: "Model evidence", icon: <Layers size={15} /> },
  { id: "monitoring", label: "Monitoring", icon: <Database size={15} /> },
  { id: "governance", label: "Governance", icon: <FileCheck2 size={15} /> },
];

type Props = {
  caseInput: CaseRequest;
  setCaseInput: (next: CaseRequest) => void;
  prediction: Prediction | null;
  setPrediction: (p: Prediction | null) => void;
  online: boolean;
  chatOpen: boolean;
  onToggleChat: () => void;
};

const PROFILE_STORAGE_KEY = "service-priority-demo-profile";

export function Dashboard({ setCaseInput, setPrediction, online, chatOpen, onToggleChat }: Props) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("triage");
  const [caseQueue, setCaseQueue] = useState<CaseRecord[]>(fallbackCaseQueue);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(fallbackCaseQueue[0]?.case_id ?? null);
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(() => readSavedProfile());
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>(fallbackDashboard);
  const [activeMlopsSection, setActiveMlopsSection] = useState<MlopsSection>("summary");
  const [lastDashboardRefresh, setLastDashboardRefresh] = useState<Date>(() => new Date());
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());
  const [newCaseIds, setNewCaseIds] = useState<Set<string>>(() => new Set());
  const [changedCaseIds, setChangedCaseIds] = useState<Set<string>>(() => new Set());
  const [uploadedBatchName, setUploadedBatchName] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const previousQueueRef = useRef<Map<string, string> | null>(null);
  const selectedCase = caseQueue.find((row) => row.case_id === selectedCaseId) ?? null;

  const activeLabel =
    activeTab === "mlops"
      ? `MLOps · ${MLOPS_SECTIONS.find((section) => section.id === activeMlopsSection)?.label ?? "Overview"}`
      : TABS.find((tab) => tab.id === activeTab)?.label ?? "Today";
  const changeTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    setProfileMenuOpen(false);
    window.requestAnimationFrame(() => {
      document.querySelector(".employee-content")?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetchCaseQueue().then((result) => {
        if (!active || !result) return;
        const previous = previousQueueRef.current;
        if (previous) {
          const nextNew = new Set<string>();
          const nextChanged = new Set<string>();
          for (const row of result) {
            const previousSnapshot = previous.get(row.case_id);
            const nextSnapshot = caseSnapshot(row);
            if (!previousSnapshot) {
              nextNew.add(row.case_id);
            } else if (previousSnapshot !== nextSnapshot) {
              nextChanged.add(row.case_id);
            }
          }
          setNewCaseIds(nextNew);
          setChangedCaseIds(nextChanged);
        }
        previousQueueRef.current = new Map(result.map((row) => [row.case_id, caseSnapshot(row)]));
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
    const timer = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [selectedCaseId, setCaseInput]);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetchDashboard().then((result) => {
        if (active && result) {
          setDashboardSummary(result);
          setLastDashboardRefresh(new Date());
        }
      });
    };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setLiveNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileMenuOpen]);

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
    setProfileMenuOpen(false);
    setDecisionError(null);
  }

  function signOut() {
    setCurrentUser(null);
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    setProfileMenuOpen(false);
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
            <div key={tab.id} className="employee-nav-group">
              <button
                type="button"
                aria-current={activeTab === tab.id ? "page" : undefined}
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => changeTab(tab.id)}
              >
                {tab.icon}
                <span className={tab.id === "pipeline" ? "employee-nav-label-stacked" : undefined}>
                  {tab.id === "pipeline" ? (
                    <>
                      Decision
                      <br />
                      support
                    </>
                  ) : (
                    tab.label
                  )}
                </span>
                <small>{tab.helper}</small>
                {tab.id === "mlops" && <ChevronDown className="employee-nav-caret" size={15} />}
              </button>
              {tab.id === "mlops" && activeTab === "mlops" && (
                <div className="employee-subnav" aria-label="MLOps manager sections">
                  {MLOPS_SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      className={activeMlopsSection === section.id ? "active" : ""}
                      onClick={() => setActiveMlopsSection(section.id)}
                    >
                      {section.icon}
                      <span>{section.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

      </aside>

      <main className="employee-main">
        <header className="employee-topbar">
          <div>
            <span className="employee-kicker">Employee workspace</span>
            <strong>{activeLabel}</strong>
          </div>
          <div className="employee-top-actions">
            <button
              type="button"
              className={`employee-ai-button ${chatOpen ? "active" : ""}`}
              onClick={onToggleChat}
              aria-label={chatOpen ? "Close AI assistant" : "Open AI assistant"}
              aria-expanded={chatOpen}
              title="AI assistant"
            >
              <Bot size={18} />
              <span>AI</span>
              <small>{online ? "Online" : "Offline"}</small>
            </button>
            {currentUser ? (
              <div className="employee-profile-menu" ref={profileMenuRef}>
                <button
                  type="button"
                  className="employee-profile-trigger"
                  aria-label={`${currentUser.name} account menu`}
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                  onClick={() => setProfileMenuOpen((open) => !open)}
                >
                  <img src={currentUser.avatar_url} alt="" />
                </button>
                {profileMenuOpen && (
                  <div className="employee-profile-dropdown" role="menu">
                    <div className="employee-profile-dropdown-head">
                      <img src={currentUser.avatar_url} alt="" />
                      <div>
                        <strong>{currentUser.name}</strong>
                        <span>{currentUser.role}</span>
                      </div>
                    </div>
                    <button type="button" role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                      <Settings size={16} />
                      Account settings
                    </button>
                    <button type="button" role="menuitem" onClick={signOut}>
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button type="button" className="employee-login-button" onClick={signIn}>
                <LogIn size={16} />
                Sign in
              </button>
            )}
          </div>
        </header>

        <div
          className={`employee-content ${
            activeTab === "overview"
              ? "employee-content--overview"
              : activeTab === "pipeline"
              ? "employee-content--pipeline"
              : activeTab === "mlops"
              ? "employee-content--mlops"
              : "employee-content--case-record"
          }`}
        >
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
                  <div className="priority-rows">
                    {caseQueue.map((row) => (
                      <button
                        key={row.case_id}
                        type="button"
                        className={`priority-row ${row.risk} ${selectedCaseId === row.case_id ? "selected" : ""} ${
                          changedCaseIds.has(row.case_id) || isLiveCaseUpdate(row) ? "live-updated" : ""
                        } ${
                          newCaseIds.has(row.case_id) ? "live-entered" : ""
                        }`}
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
                            {(newCaseIds.has(row.case_id) || changedCaseIds.has(row.case_id) || isLiveCaseUpdate(row)) && (
                              <span className="live-change-chip">{newCaseIds.has(row.case_id) ? "New in queue" : row.activity[0]?.action ?? "Updated"}</span>
                            )}
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

          {activeTab === "pipeline" && (
            <section className="tab-panel employee-pipeline-score" role="tabpanel">
              <PipelineScoreTab caseRecord={selectedCase} currentUser={currentUser} />
            </section>
          )}

          {activeTab === "mlops" && (
            <section className="tab-panel employee-mlops" role="tabpanel">
              <ManagerMlopsTab
                summary={dashboardSummary}
                activeSection={activeMlopsSection}
                onSectionChange={setActiveMlopsSection}
                liveNow={liveNow}
                lastRefresh={lastDashboardRefresh}
                uploadedBatchName={uploadedBatchName}
                onUploadClick={() => uploadInputRef.current?.click()}
              />
              <input
                ref={uploadInputRef}
                type="file"
                accept=".csv,.json,.xlsx"
                className="sr-only"
                onChange={(event) => setUploadedBatchName(event.target.files?.[0]?.name ?? null)}
              />
            </section>
          )}

        </div>
      </main>
    </div>
  );
}

function PipelineScoreTab({
  caseRecord,
  currentUser,
}: {
  caseRecord: CaseRecord | null;
  currentUser: StaffMember | null;
}) {
  type DecisionStep = "add" | "review" | "recommendation" | "decision";
  type ReviewField = keyof CaseRequest;
  const [informationType, setInformationType] = useState("");
  const [operationalText, setOperationalText] = useState("");
  const [uploadedInfoName, setUploadedInfoName] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<CaseExtraction | null>(null);
  const [reviewCaseRequest, setReviewCaseRequest] = useState<CaseRequest | null>(null);
  const [blankReviewFields, setBlankReviewFields] = useState<Set<ReviewField>>(new Set());
  const [analysisScore, setAnalysisScore] = useState<PipelineScore | null>(null);
  const [step, setStep] = useState<DecisionStep>("add");
  const [extracting, setExtracting] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [finalPriority, setFinalPriority] = useState<Prediction["priority"]>("medium");
  const [actionTaken, setActionTaken] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [decisionReceipt, setDecisionReceipt] = useState<DecisionReceipt | null>(null);
  const analysisUploadRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setOperationalText("");
    setUploadedInfoName(null);
    setExtraction(null);
    setReviewCaseRequest(null);
    setBlankReviewFields(new Set());
    setAnalysisScore(null);
    setAnalysisError(null);
    setDecisionReceipt(null);
    setStep("add");
  }, [caseRecord?.case_id]);

  const currentScore = analysisScore;
  const selectedPrediction = currentScore?.prediction ?? null;
  const predictability = currentScore?.predictability.score ?? selectedPrediction?.confidence ?? 0;
  const rating = currentScore?.predictability.rating ?? "review";
  const busy = extracting || analysisLoading || decisionSaving;
  const hasNewInformation = Boolean(operationalText.trim() || uploadedInfoName);
  const finalDiffersFromModel = Boolean(selectedPrediction && finalPriority !== selectedPrediction.priority);
  const stepOrder: DecisionStep[] = ["add", "review", "recommendation", "decision"];
  const activeStepIndex = stepOrder.indexOf(step);
  const furthestStepIndex = reviewCaseRequest ? (selectedPrediction ? (decisionReceipt ? 3 : 2) : 1) : 0;
  const requiredReviewFields: ReviewField[] = ["service_type", "service_subtype", "district", "channel", "urgency_text"];
  const missingReviewFields = requiredReviewFields.filter((field) => {
    const value = reviewCaseRequest?.[field];
    return blankReviewFields.has(field) || (typeof value === "string" && !value.trim());
  });

  function goToStep(nextStep: DecisionStep) {
    if (stepOrder.indexOf(nextStep) <= furthestStepIndex) {
      setStep(nextStep);
    }
  }

  function goBack() {
    setStep(stepOrder[Math.max(activeStepIndex - 1, 0)]);
  }

  async function extractInformation() {
    if (!caseRecord) return;
    const enteredText = operationalText.trim();
    const uploadedContext = uploadedInfoName ? ` Uploaded supporting file: ${uploadedInfoName}.` : "";
    const defaults: CaseRequest = {
      ...caseRecord.case_request,
      ...sourceFields(informationType),
    };

    setExtracting(true);
    setAnalysisError(null);
    try {
      const result = await postExtractCaseRequest(`${enteredText}${uploadedContext}`, defaults);
      setExtraction(result);
      setReviewCaseRequest(result.case_request);
      setBlankReviewFields(new Set(result.defaulted_fields as ReviewField[]));
      setAnalysisScore(null);
      setDecisionReceipt(null);
      setStep("review");
    } catch (problem) {
      setAnalysisError(problem instanceof Error ? problem.message : "The information could not be extracted.");
    } finally {
      setExtracting(false);
    }
  }

  async function runAnalysis() {
    if (!reviewCaseRequest) return;
    if (missingReviewFields.length) {
      setAnalysisError(`Complete ${missingReviewFields.map(reviewFieldLabel).join(", ")} before generating a recommendation.`);
      return;
    }
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const result = await postPipelineScore(reviewCaseRequest);
      setAnalysisScore(result);
      setFinalPriority(result.prediction.priority);
      setStep("recommendation");
    } catch (analysisProblem) {
      setAnalysisError(analysisProblem instanceof Error ? analysisProblem.message : "The recommendation could not be generated.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function saveStaffDecision() {
    if (!caseRecord || !reviewCaseRequest || !selectedPrediction) return;
    if (finalDiffersFromModel && !overrideReason.trim()) {
      setAnalysisError("Add an override reason before recording a different final priority.");
      return;
    }
    setDecisionSaving(true);
    setAnalysisError(null);
    try {
      const receipt = await postDecision(caseRecord.case_id, {
        final_priority: finalPriority,
        override_reason: overrideReason,
        action_taken: actionTaken,
        officer_id: currentUser?.id ?? "demo.officer",
        case_request: reviewCaseRequest,
        prediction: selectedPrediction,
      });
      setDecisionReceipt(receipt);
      setStep("decision");
    } catch (problem) {
      setAnalysisError(problem instanceof Error ? problem.message : "The staff decision could not be recorded.");
    } finally {
      setDecisionSaving(false);
    }
  }

  function updateReviewField<K extends keyof CaseRequest>(field: K, value: CaseRequest[K]) {
    setReviewCaseRequest((current) => (current ? { ...current, [field]: value } : current));
    setBlankReviewFields((current) => {
      const next = new Set(current);
      if (typeof value === "string" && !value.trim()) {
        next.add(field);
      } else {
        next.delete(field);
      }
      return next;
    });
  }

  return (
    <div className="decision-page">
      <section className="decision-header">
        <div>
          <span className="employee-kicker">Staff decision support</span>
          <h2>Decision support</h2>
          <p>Paste new case information, check the fields, then generate a staff-reviewed recommendation.</p>
        </div>
        <div className={`pipeline-rating ${rating}`}>
          <span>{analysisScore ? "Model confidence" : "Status"}</span>
          <strong>{analysisScore ? pct(predictability) : "Waiting"}</strong>
          <small>{analysisScore ? clean(rating) : "Add information"}</small>
        </div>
      </section>

      <DecisionSteps activeStep={step} furthestStepIndex={furthestStepIndex} onStepChange={goToStep} />

      {caseRecord && <DecisionCaseStrip caseRecord={caseRecord} />}

      {(step === "add" || step === "recommendation") && (
      <section className="decision-tab-panel">
        {step === "add" && (
        <section className="decision-card decision-input-card">
          <h3>1. Add information</h3>
          <label>
            Information type
            <select value={informationType} onChange={(event) => setInformationType(event.target.value)}>
              <option value="">Choose if known</option>
              <option value="resident_report">Resident report</option>
              <option value="inspection_note">Inspection note</option>
              <option value="email_update">Email update</option>
              <option value="case_portal">Case portal data</option>
              <option value="teams_referral">Teams referral</option>
            </select>
          </label>
          <label>
            New information
            <textarea
              value={operationalText}
              onChange={(event) => setOperationalText(event.target.value)}
              placeholder="Paste a resident report, inspection note, email, or case update..."
            />
          </label>
          <div className="decision-upload-row">
            <button type="button" onClick={() => analysisUploadRef.current?.click()}>
              <Upload size={16} />
              Add file
            </button>
            <span>{uploadedInfoName ?? "Optional supporting file"}</span>
            <input
              ref={analysisUploadRef}
              type="file"
              accept=".txt,.csv,.json,.pdf,.doc,.docx,.eml"
              className="sr-only"
              onChange={(event) => setUploadedInfoName(event.target.files?.[0]?.name ?? null)}
            />
          </div>
          <button type="button" className="btn-primary" disabled={!caseRecord || busy || !hasNewInformation} onClick={extractInformation}>
            <ClipboardList size={16} />
            {extracting ? "Extracting..." : "Extract fields"}
          </button>
        </section>
        )}

        {step === "recommendation" && (
        <section className="decision-card decision-output-card">
          <h3>3. Model recommendation</h3>
          {selectedPrediction ? (
            <div className="decision-recommendation">
              <span>Suggested priority</span>
              <strong className={selectedPrediction.priority}>{clean(selectedPrediction.priority)}</strong>
              <p>{recommendedAction(selectedPrediction.priority)}</p>
              <small>Confidence {pct(selectedPrediction.confidence)} · {selectedPrediction.human_review_required ? "Staff review required" : "Standard review"}</small>
            </div>
          ) : (
            <div className="decision-empty-state">
              <BrainCircuit size={22} />
              <span>Review extracted fields, then generate a recommendation.</span>
            </div>
          )}
          <div className="decision-panel-actions">
            <button type="button" className="btn-secondary" disabled={busy} onClick={goBack}>
              Back
            </button>
            <button type="button" className="btn-primary" disabled={!selectedPrediction} onClick={() => setStep("decision")}>
              Continue
            </button>
          </div>
        </section>
        )}
      </section>
      )}

      {analysisError && (
        <div className="error-banner" role="alert">
          <AlertCircle size={17} />
          <span>Analysis failed: {analysisError}. Check the API endpoint, then try again.</span>
        </div>
      )}

      {step === "review" && reviewCaseRequest && (
        <section className="decision-card decision-review-card">
          <div className="decision-section-head">
            <div>
              <h3>2. Review extracted fields</h3>
              <p>Complete the blank fields. The model only runs after staff review.</p>
            </div>
            <Badge label={missingReviewFields.length ? `${missingReviewFields.length} to complete` : "Ready"} />
          </div>
          <ReviewFields request={reviewCaseRequest} blankFields={blankReviewFields} onChange={updateReviewField} />
          {missingReviewFields.length ? (
            <div className="decision-warning-list">
              <span>Complete the blank fields before generating a recommendation.</span>
            </div>
          ) : null}
          <div className="decision-panel-actions">
            <button type="button" className="btn-secondary" disabled={busy} onClick={goBack}>
              Back
            </button>
            <button type="button" className="btn-primary" disabled={busy || missingReviewFields.length > 0} onClick={runAnalysis}>
              <BrainCircuit size={16} />
              {analysisLoading ? "Generating..." : "Generate recommendation"}
            </button>
          </div>
        </section>
      )}

      {step === "decision" && selectedPrediction && (
        <section className="decision-card decision-final-card">
          <div className="decision-section-head">
            <div>
              <h3>4. Staff final decision</h3>
              <p>Advisory only. Staff must apply policy and professional judgement.</p>
            </div>
            {decisionReceipt && <Badge label={decisionReceipt.status} />}
          </div>
          <div className="segmented">
            {(["high", "medium", "low"] as const).map((priority) => (
              <button
                key={priority}
                type="button"
                className={finalPriority === priority ? "selected" : ""}
                onClick={() => setFinalPriority(priority)}
              >
                {priority}
              </button>
            ))}
          </div>
          <label>
            Action taken
            <input value={actionTaken} onChange={(event) => setActionTaken(event.target.value)} placeholder="e.g. Escalated to duty manager" />
          </label>
          {finalDiffersFromModel && (
            <label>
              Override reason
              <textarea value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Explain why staff final priority differs from the model recommendation." />
            </label>
          )}
          <div className="decision-panel-actions">
            <button type="button" className="btn-secondary" disabled={busy} onClick={goBack}>
              Back
            </button>
            <button type="button" className="btn-primary" disabled={busy} onClick={saveStaffDecision}>
              <FileCheck2 size={16} />
              {decisionSaving ? "Recording..." : "Record staff decision"}
            </button>
          </div>
          {decisionReceipt && (
            <div className="decision-receipt">
              <strong>Recorded</strong>
              <span>{decisionReceipt.audit_id} · final priority {clean(decisionReceipt.final_priority)}</span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function DecisionSteps({
  activeStep,
  furthestStepIndex,
  onStepChange,
}: {
  activeStep: "add" | "review" | "recommendation" | "decision";
  furthestStepIndex: number;
  onStepChange: (step: "add" | "review" | "recommendation" | "decision") => void;
}) {
  const steps = [
    ["add", "Add info"],
    ["review", "Review fields"],
    ["recommendation", "Recommendation"],
    ["decision", "Final decision"],
  ] as const;
  const activeIndex = steps.findIndex(([id]) => id === activeStep);

  return (
    <nav className="decision-steps" aria-label="Decision support steps">
      {steps.map(([id, label], index) => {
        const available = index <= furthestStepIndex;
        const selected = id === activeStep;
        return (
          <button
            key={id}
            type="button"
            className={`${index <= activeIndex ? "active" : ""} ${selected ? "selected" : ""}`}
            disabled={!available}
            onClick={() => onStepChange(id)}
            aria-current={selected ? "step" : undefined}
          >
            <i>{index + 1}</i>
            {label}
          </button>
        );
      })}
    </nav>
  );
}

function DecisionCaseStrip({ caseRecord }: { caseRecord: CaseRecord }) {
  return (
    <section className="decision-case-strip" aria-label="Selected case">
      <div>
        <span>Case</span>
        <strong>{caseRecord.case_id}</strong>
      </div>
      <div>
        <span>Service</span>
        <strong>{caseRecord.service_label}</strong>
      </div>
      <div>
        <span>Current queue</span>
        <strong>{clean(caseRecord.risk)}</strong>
      </div>
      <div>
        <span>Status</span>
        <strong>{caseRecord.status}</strong>
      </div>
      <div>
        <span>Assigned</span>
        <strong>{caseRecord.assigned_to?.name ?? "Unassigned"}</strong>
      </div>
    </section>
  );
}

function ReviewFields({
  request,
  blankFields,
  onChange,
}: {
  request: CaseRequest;
  blankFields: Set<keyof CaseRequest>;
  onChange: <K extends keyof CaseRequest>(field: K, value: CaseRequest[K]) => void;
}) {
  const valueFor = <K extends keyof CaseRequest>(field: K) => (blankFields.has(field) ? "" : String(request[field]));

  return (
    <div className="decision-review-grid">
      <label>
        Service
        <select value={valueFor("service_type")} onChange={(event) => onChange("service_type", event.target.value as CaseRequest["service_type"])}>
          <option value="">Select service</option>
          <option value="housing">Housing</option>
          <option value="adult_social_care">Adult social care</option>
          <option value="highways">Highways</option>
          <option value="waste">Waste</option>
          <option value="benefits">Benefits</option>
          <option value="council_tax">Council tax</option>
          <option value="children_services">Children services</option>
        </select>
      </label>
      <label>
        Issue
        <input value={valueFor("service_subtype")} onChange={(event) => onChange("service_subtype", event.target.value)} placeholder="e.g. urgent repair, missed collection" />
      </label>
      <label>
        District
        <input value={valueFor("district")} onChange={(event) => onChange("district", event.target.value)} placeholder="Enter district" />
      </label>
      <label>
        Channel
        <select value={valueFor("channel")} onChange={(event) => onChange("channel", event.target.value as CaseRequest["channel"])}>
          <option value="">Select channel</option>
          <option value="web">Web</option>
          <option value="phone">Phone</option>
          <option value="email">Email</option>
          <option value="in_person">In person</option>
        </select>
      </label>
      <label>
        Days open
        <input type="number" min={0} max={365} value={request.days_open} onChange={(event) => onChange("days_open", Number(event.target.value))} />
      </label>
      <label>
        Previous contacts
        <input type="number" min={0} max={50} value={request.previous_contacts} onChange={(event) => onChange("previous_contacts", Number(event.target.value))} />
      </label>
      <label className="decision-check">
        <input type="checkbox" checked={request.vulnerability_flag} onChange={(event) => onChange("vulnerability_flag", event.target.checked)} />
        Vulnerable resident
      </label>
      <label className="decision-check">
        <input type="checkbox" checked={request.accessibility_need} onChange={(event) => onChange("accessibility_need", event.target.checked)} />
        Accessibility need
      </label>
      <label className="decision-review-notes">
        Summary for model
        <textarea value={valueFor("urgency_text")} onChange={(event) => onChange("urgency_text", event.target.value)} placeholder="Short summary of what has been reported" />
      </label>
    </div>
  );
}

function reviewFieldLabel(field: keyof CaseRequest) {
  const labels: Partial<Record<keyof CaseRequest, string>> = {
    service_type: "Service",
    service_subtype: "Issue",
    district: "District",
    channel: "Channel",
    urgency_text: "Summary",
  };
  return labels[field] ?? clean(String(field));
}

function sourceFields(informationType: string): Partial<CaseRequest> {
  if (!informationType) return {};
  if (informationType === "inspection_note") return { source_system: "case_portal", channel: "web" };
  if (informationType === "email_update") return { source_system: "shared_mailbox", channel: "email" };
  if (informationType === "case_portal") return { source_system: "case_portal", channel: "web" };
  if (informationType === "teams_referral") return { source_system: "teams_referral", channel: "email" };
  return { source_system: "contact_centre", channel: "phone" };
}

function recommendedAction(priority?: Prediction["priority"]) {
  if (priority === "high") return "Escalate for same-day officer review and check safeguarding or service-risk evidence.";
  if (priority === "medium") return "Prioritise for duty-team review after urgent cases and request any missing information.";
  if (priority === "low") return "Keep in the standard queue unless staff identify new risk evidence.";
  return "Enter or upload information, then run the ML analysis.";
}

function ManagerMlopsTab({
  summary,
  activeSection,
  onSectionChange,
  liveNow,
  lastRefresh,
  uploadedBatchName,
  onUploadClick,
}: {
  summary: DashboardSummary;
  activeSection: MlopsSection;
  onSectionChange: (section: MlopsSection) => void;
  liveNow: Date;
  lastRefresh: Date;
  uploadedBatchName: string | null;
  onUploadClick: () => void;
}) {
  return (
    <div className="manager-assurance">
      <div className="mlops-mobile-sections" role="tablist" aria-label="MLOps manager sections">
        {MLOPS_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeSection === section.id}
            className={activeSection === section.id ? "active" : ""}
            onClick={() => onSectionChange(section.id)}
          >
            {section.icon}
            {section.label}
          </button>
        ))}
      </div>

      <section className="mlops-workspace">
        {activeSection === "summary" && (
          <MlopsSummary
            summary={summary}
            onSectionChange={onSectionChange}
            liveNow={liveNow}
            lastRefresh={lastRefresh}
          />
        )}
        {activeSection === "data" && (
          <MlopsData
            summary={summary}
            uploadedBatchName={uploadedBatchName}
            onUploadClick={onUploadClick}
          />
        )}
        {activeSection === "azure" && <MlopsAzure summary={summary} />}
        {activeSection === "model" && <MlopsModel summary={summary} />}
        {activeSection === "monitoring" && <MlopsMonitoring summary={summary} />}
        {activeSection === "governance" && <MlopsGovernance summary={summary} />}
      </section>
    </div>
  );
}

function MlopsSummary({
  summary,
  onSectionChange,
  liveNow,
  lastRefresh,
}: {
  summary: DashboardSummary;
  onSectionChange: (section: MlopsSection) => void;
  liveNow: Date;
  lastRefresh: Date;
}) {
  const registry = summary.registry[0];
  const completeAzure = summary.azure_status.filter((row) => row.status === "complete").length;
  const governanceReady = summary.governance.filter((row) => /ready|complete|pass/i.test(row.status)).length;
  const audit = summary.audit;

  return (
    <div className="mlops-page mlops-overview-page">
      <section className="overview-welcome overview-welcome--calm">
        <div>
          <span className="employee-kicker">Live manager dashboard</span>
          <h2>Service Priority AI assurance</h2>
          <p>A concise view of whether the model, cloud delivery, monitoring and governance evidence are ready for manager review.</p>
        </div>
        <div className="live-time-card" aria-label="Live dashboard time">
          <Clock3 size={17} />
          <span>{liveNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <small>Last refreshed {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small>
        </div>
      </section>

      <div className="overview-metrics" aria-label="Important manager metrics">
        <OverviewMetric
          label="Live summary"
          value="Active"
          detail={`Updated ${lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
        />
        <OverviewMetric label="Model version" value={registry?.version ?? "0.1.0"} detail={registry?.gate ?? "ready"} />
        <OverviewMetric label="Audit records" value={audit?.prediction_records ?? 0} detail={`${audit?.decision_records ?? 0} decisions`} />
        <OverviewMetric label="Governance ready" value={`${governanceReady}/${summary.governance.length}`} detail="Review checklist" />
      </div>

      <div className="manager-visual-summary" aria-label="Manager assurance summary">
        <PercentBar label="Azure readiness" value={completeAzure / Math.max(summary.azure_status.length, 1)} detail={`${completeAzure}/${summary.azure_status.length} checks complete`} />
        <PercentBar label="High-priority recall" value={registry?.high_priority_recall ?? 0.9408} detail={registry ? pct(registry.high_priority_recall) : "94%"} />
        <PercentBar label="Governance ready" value={governanceReady / Math.max(summary.governance.length, 1)} detail={`${governanceReady}/${summary.governance.length} items ready`} />
        <PercentBar label="Audit override rate" value={audit?.override_rate ?? 0} detail={audit ? pct(audit.override_rate) : "0%"} tone="neutral" />
      </div>
      <div className="mlops-plain-grid">
        <AssuranceRow label="Delivery" value={`${completeAzure}/${summary.azure_status.length} Azure checks are complete for the current evidence set.`} />
        <AssuranceRow label="Quality" value={`${registry ? pct(registry.accuracy) : "90%"} accuracy with ${registry ? pct(registry.high_priority_recall) : "94%"} high-priority recall.`} />
        <AssuranceRow label="Governance" value="Human review, DPIA-lite, model card, fairness review and audit trail evidence are tracked." />
      </div>
      <ManagerActions onSectionChange={onSectionChange} />
    </div>
  );
}

function MlopsData({
  summary,
  uploadedBatchName,
  onUploadClick,
}: {
  summary: DashboardSummary;
  uploadedBatchName: string | null;
  onUploadClick: () => void;
}) {
  const totalScored = summary.monitoring_trend.reduce((total, row) => total + row.volume, 0);
  const fairnessRows = summary.fairness.reduce((total, row) => total + row.rows, 0);
  const sourceRows = [
    {
      name: "Case scoring history",
      source: "Audit store",
      records: summary.audit?.prediction_records ?? totalScored,
      cleaned: summary.audit?.prediction_records ?? totalScored,
      status: "ready",
    },
    {
      name: "Monitoring trend",
      source: "Power BI export",
      records: totalScored,
      cleaned: Math.round(totalScored * 0.98),
      status: "cleaned",
    },
    {
      name: "Fairness review slices",
      source: "Evaluation set",
      records: fairnessRows,
      cleaned: fairnessRows,
      status: "ready",
    },
    {
      name: "Batch preview sample",
      source: "Local demo file",
      records: summary.batch_preview.length,
      cleaned: summary.batch_preview.length,
      status: uploadedBatchName ? "staged" : "ready",
    },
  ];
  const totalRecords = sourceRows.reduce((total, row) => total + row.records, 0);
  const cleanedRecords = sourceRows.reduce((total, row) => total + row.cleaned, 0);
  const cleanRate = totalRecords ? cleanedRecords / totalRecords : 0;

  return (
    <div className="mlops-page data-page">
      <MlopsPageTitle
        icon={<Database size={18} />}
        title="Database"
        intro="Current demo data, cleaning coverage, and the route for adding more records."
      />

      <section className="database-hero" aria-label="Database totals">
        <OverviewMetric label="Total records" value={totalRecords.toLocaleString()} detail="Across current data sources" />
        <OverviewMetric label="Cleaned records" value={cleanedRecords.toLocaleString()} detail={`${pct(cleanRate)} ready for review`} />
        <OverviewMetric label="Current sources" value={sourceRows.length} detail="Audit, monitoring, fairness, batch" />
        <button type="button" onClick={onUploadClick}>
          <Upload size={16} />
          Add more data
        </button>
      </section>

      <section className="database-process" aria-label="Data cleaning process">
        <ProcessStep label="Received" detail={uploadedBatchName ?? "Existing demo sources"} active />
        <ProcessStep label="Validated" detail="Schema and required fields checked" active />
        <ProcessStep label="Cleaned" detail={`${cleanedRecords.toLocaleString()} records standardised`} active />
        <ProcessStep label="Ready" detail="Available to monitoring and model review" active />
      </section>

      <section className="database-table" aria-label="Current data in database">
        <header>
          <span><FolderOpen size={16} /></span>
          <h3>Current data</h3>
          <small>{uploadedBatchName ? `${uploadedBatchName} selected for import` : "No new file selected"}</small>
        </header>
        {sourceRows.map((row) => (
          <article key={row.name}>
            <div>
              <strong>{row.name}</strong>
              <span>{row.source}</span>
            </div>
            <em>{row.records.toLocaleString()}</em>
            <em>{row.cleaned.toLocaleString()}</em>
            <Badge label={row.status} />
          </article>
        ))}
      </section>
    </div>
  );
}

function ProcessStep({ label, detail, active }: { label: string; detail: string; active?: boolean }) {
  return (
    <article className={active ? "active" : ""}>
      <span />
      <strong>{label}</strong>
      <p>{detail}</p>
    </article>
  );
}

function MlopsAzure({ summary }: { summary: DashboardSummary }) {
  const completeAzure = summary.azure_status.filter((row) => row.status === "complete").length;

  return (
    <div className="mlops-page mlops-azure-page">
      <MlopsPageTitle
        icon={<Server size={18} />}
        title="Azure delivery"
        intro="A simple view of the deployment route: reproducible training, reviewed registration, governed serving and batch scoring."
      />
      <PercentBar
        label="Deployment readiness"
        value={completeAzure / Math.max(summary.azure_status.length, 1)}
        detail={`${completeAzure}/${summary.azure_status.length} Azure checks complete`}
      />
      <div className="mlops-stack">
        <SimpleList title="Pipeline" icon={<GitBranch size={17} />}>
          {summary.pipeline.slice(0, 3).map((item) => (
            <StatusLine key={item.step} label={item.step} detail={item.detail} status={item.status} />
          ))}
        </SimpleList>
        <SimpleList title="Azure services" icon={<Server size={17} />}>
          {summary.azure_status.slice(0, 4).map((item) => (
            <StatusLine key={item.item} label={item.item} detail={item.detail} status={item.status} />
          ))}
        </SimpleList>
      </div>
    </div>
  );
}

function MlopsModel({ summary }: { summary: DashboardSummary }) {
  const registry = summary.registry[0];
  const shapMax = Math.max(...summary.shap_top_features.map((item) => item.mean_absolute_shap), 1);

  return (
    <div className="mlops-page mlops-model-page">
      <MlopsPageTitle
        icon={<Layers size={18} />}
        title="Model evidence"
        intro="Enough evidence for review without turning the manager view into a data-science workbook."
      />
      <div className="mlops-two-column">
        <SimpleList title="Quality gates" icon={<Layers size={17} />}>
          <PercentBar label="Accuracy" value={registry?.accuracy ?? 0.902} detail={registry ? pct(registry.accuracy) : "90%"} />
          <PercentBar label="Macro F1" value={registry?.macro_f1 ?? 0.9035} detail={registry ? pct(registry.macro_f1) : "90%"} />
          <PercentBar label="High-priority recall" value={registry?.high_priority_recall ?? 0.9408} detail={registry ? pct(registry.high_priority_recall) : "94%"} />
          <StatusLine label="Serving target" detail={registry?.target ?? "Azure Functions API / Azure ML managed endpoint"} status={registry?.gate ?? "ready"} />
        </SimpleList>
        <SimpleList title="Top explanation factors" icon={<Database size={17} />}>
          {summary.shap_top_features.slice(0, 4).map((item) => (
            <PercentBar
              key={item.feature}
              label={clean(item.feature)}
              value={item.mean_absolute_shap / shapMax}
              detail={item.mean_absolute_shap.toFixed(3)}
              tone="neutral"
            />
          ))}
          <StatusLine label="Batch preview" detail={`${summary.batch_preview.length} sample rows available for Power BI review.`} status="ready" />
        </SimpleList>
      </div>
    </div>
  );
}

function MlopsMonitoring({ summary }: { summary: DashboardSummary }) {
  const avgConfidence = summary.monitoring_trend.length
    ? summary.monitoring_trend.reduce((total, item) => total + item.confidence, 0) / summary.monitoring_trend.length
    : 0;
  const avgHighPriority = summary.monitoring_trend.length
    ? summary.monitoring_trend.reduce((total, item) => total + item.high_priority_rate, 0) / summary.monitoring_trend.length
    : 0;

  return (
    <div className="mlops-page mlops-monitoring-page">
      <MlopsPageTitle
        icon={<Database size={18} />}
        title="Monitoring"
        intro="A manager-level readout of service health, confidence, high-priority mix and fairness watch items."
      />
      <TrendChart rows={summary.monitoring_trend} />
      <div className="mlops-two-column">
        <SimpleList title="Operational signals" icon={<BarChart3 size={17} />}>
          <PercentBar label="Average confidence" value={avgConfidence} detail={pct(avgConfidence)} />
          <PercentBar label="High-priority rate" value={avgHighPriority} detail={pct(avgHighPriority)} tone="neutral" />
          <StatusLine label="Audit records" detail={`${summary.audit?.decision_records ?? 0} decisions, ${summary.audit?.prediction_records ?? 0} predictions.`} status={summary.audit?.durable ? "complete" : "ready"} />
        </SimpleList>
        <SimpleList title="Fairness watch" icon={<ShieldCheck size={17} />}>
          {summary.fairness.slice(0, 3).map((row) => (
            <PercentBar
              key={`${row.feature}-${row.value}`}
              label={`${clean(row.feature)}: ${row.value}`}
              value={row.high_priority_rate}
              detail={`${pct(row.high_priority_rate)} high`}
              tone="neutral"
            />
          ))}
        </SimpleList>
      </div>
    </div>
  );
}

function MlopsGovernance({ summary }: { summary: DashboardSummary }) {
  const governanceReady = summary.governance.filter((row) => /ready|complete|pass/i.test(row.status)).length;

  return (
    <div className="mlops-page mlops-governance-page">
      <MlopsPageTitle
        icon={<FileCheck2 size={18} />}
        title="Governance"
        intro="Responsible AI, Information Governance and service-owner checks needed before any real resident data use."
      />
      <PercentBar
        label="Review readiness"
        value={governanceReady / Math.max(summary.governance.length, 1)}
        detail={`${governanceReady}/${summary.governance.length} items ready`}
      />
      <SimpleList title="Review checklist" icon={<FileCheck2 size={17} />}>
        {summary.governance.slice(0, 4).map((item) => (
          <StatusLine key={item.item} label={item.item} detail={item.owner} status={item.status} />
        ))}
      </SimpleList>
      <div className="mlops-two-column">
        <SimpleList title="Available in this dashboard" icon={<ShieldCheck size={17} />}>
          <AccessLine label="Deployment route" detail="Pipeline, model registry, online endpoint, batch endpoint and browser API status." />
          <AccessLine label="Model evidence" detail="Quality gates, high-priority recall, explanation factors and batch scoring preview." />
        </SimpleList>
        <SimpleList title="External access needed for live operation" icon={<LockKeyhole size={17} />}>
          <AccessLine label="Azure ML Studio" detail="Approve registered model versions, inspect jobs, endpoints, deployments and batch runs." />
          <AccessLine label="Azure Monitor / App Insights" detail="Investigate latency, error rate, request traces and dependency failures." />
        </SimpleList>
      </div>
    </div>
  );
}

function MlopsPageTitle({ icon, title, intro }: { icon: ReactNode; title: string; intro: string }) {
  return (
    <div className="mlops-page-title">
      <span>{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{intro}</p>
      </div>
    </div>
  );
}

function AssuranceRow({ label, value }: { label: string; value: string }) {
  return (
    <article className="assurance-row">
      <strong>{label}</strong>
      <p>{value}</p>
    </article>
  );
}

function OverviewMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <article className="overview-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function AccessLine({ label, detail }: { label: string; detail: string }) {
  return (
    <article className="access-line">
      <strong>{label}</strong>
      <p>{detail}</p>
    </article>
  );
}

function PercentBar({
  label,
  value,
  detail,
  tone = "good",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "good" | "neutral";
}) {
  const bounded = Math.max(0, Math.min(value, 1));

  return (
    <div className="percent-bar">
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
      <div className="percent-track" aria-hidden="true">
        <span className={tone} style={{ width: `${Math.max(4, bounded * 100)}%` }} />
      </div>
    </div>
  );
}

function TrendChart({ rows }: { rows: DashboardSummary["monitoring_trend"] }) {
  const maxVolume = Math.max(...rows.map((row) => row.volume), 1);

  return (
    <section className="trend-chart" aria-label="Daily monitoring trend">
      <header>
        <strong>Daily scoring volume</strong>
        <span>Confidence and high-priority mix are watched alongside volume.</span>
      </header>
      <div className="trend-bars">
        {rows.map((row) => (
          <div key={row.label}>
            <span>{row.volume}</span>
            <i style={{ height: `${Math.max(18, (row.volume / maxVolume) * 92)}px` }} />
            <small>{row.label}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function ManagerActions({ onSectionChange }: { onSectionChange: (section: MlopsSection) => void }) {
  return (
    <section className="manager-actions" aria-label="Manager actions">
      <strong>Manager actions</strong>
      <div>
        <button type="button" onClick={() => onSectionChange("azure")}>Check deployment route</button>
        <button type="button" onClick={() => onSectionChange("model")}>Review model evidence</button>
        <button type="button" onClick={() => onSectionChange("monitoring")}>Inspect monitoring</button>
        <button type="button" onClick={() => onSectionChange("governance")}>Open governance checklist</button>
      </div>
    </section>
  );
}

function SimpleList({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="simple-list">
      <header>
        <span>{icon}</span>
        <h3>{title}</h3>
      </header>
      <div>{children}</div>
    </section>
  );
}

function StatusLine({ label, detail, status }: { label: string; detail: string; status: string }) {
  return (
    <article className="status-line">
      <div>
        <strong>{label}</strong>
        <p>{detail}</p>
      </div>
      <Badge label={status} />
    </article>
  );
}

function isLiveCaseUpdate(row: CaseRecord) {
  return row.last_updated === "Just now" || row.activity.some((item) => item.time === "Just now");
}

function caseSnapshot(row: CaseRecord) {
  return [
    row.status,
    row.title,
    row.last_updated,
    row.assigned_to?.id ?? "unassigned",
    row.activity[0]?.id ?? "no-activity",
  ].join("|");
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
