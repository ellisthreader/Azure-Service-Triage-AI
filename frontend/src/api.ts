// Central API client, shared types, and demo fallbacks for Service Priority AI.

export const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (import.meta.env.DEV ? "http://localhost:8010" : "");

export type ServiceType =
  | "housing"
  | "adult_social_care"
  | "highways"
  | "waste"
  | "benefits"
  | "council_tax"
  | "children_services";

export type CaseRequest = {
  service_type: ServiceType;
  service_subtype: string;
  district: string;
  month: number;
  source_system: "web_form" | "contact_centre" | "shared_mailbox" | "teams_referral" | "case_portal";
  sla_hours: number;
  out_of_hours: boolean;
  accessibility_need: boolean;
  duplicate_signal: boolean;
  days_open: number;
  previous_contacts: number;
  vulnerability_flag: boolean;
  deprivation_band: "low" | "medium" | "high";
  channel: "web" | "phone" | "email" | "in_person";
  urgency_text: string;
};

export type Prediction = {
  priority: "low" | "medium" | "high";
  confidence: number;
  class_probabilities: Record<string, number>;
  main_reasons: { factor: string; impact: string }[];
  feature_attributions?: { feature: string; value: number; direction: "raises_priority" | "lowers_priority" }[];
  model_version: string;
  human_review_required: boolean;
};

export type CaseRecord = {
  case_id: string;
  title: string;
  service_label: string;
  team: string;
  source: string;
  evidence: string;
  handover: string;
  due: string;
  risk: "low" | "medium" | "high";
  action: string;
  summary: string;
  access_notes: string;
  household_context: string;
  status: "New" | "In review" | "Waiting update" | "In progress";
  last_updated: string;
  assigned_to: StaffMember | null;
  activity: ActivityItem[];
  evidence_items: EvidenceItem[];
  case_notes: SourceItem[];
  previous_contacts: SourceItem[];
  case_request: CaseRequest;
  prediction?: Prediction | null;
};

export type EvidenceItem = {
  id?: string;
  type: "photo" | "document" | "note";
  title: string;
  detail: string;
  source: string;
  image_url?: string | null;
  graph_source?: "outlook" | "teams" | "sharepoint" | "onedrive" | "case_portal" | null;
  graph_id?: string;
  drive_id?: string;
  site_id?: string;
  item_id?: string;
  web_url?: string;
  content_type?: string;
};

export type StaffMember = {
  id: string;
  name: string;
  username: string;
  role: string;
  team: string;
  avatar_url: string;
};

export type ActivityItem = {
  id: string;
  action: string;
  detail: string;
  time: string;
  actor: StaffMember;
};

export type SourceItem = {
  id: string;
  type: "case_note" | "previous_contact" | "evidence";
  app: "Outlook" | "Teams" | "SharePoint" | "Case portal" | "Phone";
  title: string;
  summary: string;
  body: string;
  time: string;
  owner: string;
  external_url?: string;
  graph_source?: "outlook" | "teams" | "sharepoint" | "onedrive" | "case_portal" | null;
  graph_id?: string;
  mailbox?: string;
  team_id?: string;
  channel_id?: string;
  chat_id?: string;
  drive_id?: string;
  site_id?: string;
  item_id?: string;
  web_url?: string;
};

export type M365SourceDetail = {
  id: string;
  title: string;
  app?: SourceItem["app"] | null;
  source: string;
  status: "live" | "fallback" | "not_configured" | "not_found" | "error";
  summary: string;
  body: string;
  owner: string;
  time: string;
  web_url: string;
  content_url: string;
  preview_url: string;
  content_type: string;
  image_url?: string | null;
  message: string;
};

export type DecisionReceipt = {
  case_id: string;
  status: "recorded";
  audit_id: string;
  recorded_at: string;
  final_priority: Prediction["priority"];
  model_priority: Prediction["priority"];
  override_recorded: boolean;
  action_taken: string;
};

export type DecisionPayload = {
  final_priority: Prediction["priority"];
  override_reason: string;
  action_taken: string;
  officer_id: string;
  case_request: CaseRequest;
  prediction: Prediction;
};

export type Metrics = {
  total_predictions: number;
  high_priority_rate: number;
  average_confidence: number;
  fairness_watch?: Record<string, number | string>;
  drift_watch: Record<string, number | string>;
  operational_health?: Record<string, number | string>;
};

export type ModelMetadata = {
  model_name?: string;
  model_version?: string;
  model_type?: string;
  training_rows?: number;
  validation_rows?: number;
};

export type Health = {
  status: string;
  model_loaded: boolean;
  model_version: string | null;
};

export type AuditSummary = {
  store_mode: string;
  durable: boolean;
  table_name: string | null;
  prediction_records: number;
  decision_records: number;
  override_rate: number;
  low_confidence_rate: number;
  high_priority_rate: number;
  latest_decision_at: string | null;
};

export type DashboardSummary = {
  pipeline: { step: string; status: string; detail: string }[];
  azure_status: {
    item: string;
    status: "complete" | "blocked" | "next" | "ready";
    detail: string;
  }[];
  registry: {
    version: string;
    name: string;
    accuracy: number;
    macro_f1: number;
    high_priority_recall: number;
    gate: string;
    target: string;
  }[];
  monitoring_trend: { label: string; volume: number; confidence: number; high_priority_rate: number }[];
  fairness: { feature: string; value: string; rows: number; high_priority_rate: number; accuracy: number }[];
  shap_top_features: { feature: string; mean_absolute_shap: number }[];
  batch_preview: Record<string, string>[];
  governance: { item: string; status: string; owner: string }[];
  audit?: AuditSummary;
};

export type PipelineScore = {
  prediction: Prediction;
  quality: {
    accuracy: number;
    macro_f1: number;
    high_priority_recall: number;
    validation_rows: number;
    training_rows: number;
    gate: string;
  };
  predicted_class_metrics: {
    label: Prediction["priority"];
    precision: number;
    recall: number;
    f1_score: number;
    support: number;
  };
  cohort_evidence: {
    feature: string;
    value: string;
    rows: number;
    accuracy: number;
    high_priority_rate: number;
  }[];
  predictability: {
    score: number;
    rating: "strong" | "moderate" | "review";
    confidence: number;
    probability_margin: number;
    explanation: string;
  };
  review: {
    human_review_required: boolean;
    note: string;
  };
  model: {
    name: string;
    version: string;
    data: string;
  };
};

export type CaseExtraction = {
  case_request: CaseRequest;
  confidence: number;
  field_confidence: Record<string, number>;
  extracted_fields: string[];
  defaulted_fields: string[];
  warnings: string[];
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatResponse = {
  reply: string;
  suggestions: string[];
  prediction: Prediction | null;
  citations: { label: string; source: string }[];
};

export const defaultCase: CaseRequest = {
  service_type: "housing",
  service_subtype: "fire_risk",
  district: "Chelmsford",
  month: 1,
  source_system: "contact_centre",
  sla_hours: 24,
  out_of_hours: false,
  accessibility_need: true,
  duplicate_signal: false,
  days_open: 5,
  previous_contacts: 1,
  vulnerability_flag: true,
  deprivation_band: "high",
  channel: "phone",
  urgency_text: "Fire risk and also children in house",
};

export const SERVICE_LABELS: Record<ServiceType, string> = {
  housing: "Housing repair",
  adult_social_care: "Adult support",
  highways: "Highways & roads",
  waste: "Waste & recycling",
  benefits: "Benefits",
  council_tax: "Council tax & billing",
  children_services: "Family support",
};

export const SYNTHETIC_STAFF: Record<string, StaffMember> = {
  me: {
    id: "staff-demo-user",
    name: "Alex Carter",
    username: "alex.carter@essex.example",
    role: "Senior case review officer",
    team: "Today duty desk",
    avatar_url: "/staff/demo-officer-profile.png",
  },
  alice: {
    id: "staff-alice",
    name: "Alice Morgan",
    username: "alice.morgan@essex.example",
    role: "Housing repairs officer",
    team: "Contact centre",
    avatar_url: "/staff/alice-morgan.png",
  },
  samir: {
    id: "staff-samir",
    name: "Samir Khan",
    username: "samir.khan@essex.example",
    role: "Duty manager",
    team: "Adult support",
    avatar_url: "/staff/samir-khan.png",
  },
  tom: {
    id: "staff-tom",
    name: "Tom Bennett",
    username: "tom.bennett@essex.example",
    role: "Highways coordinator",
    team: "Highways duty desk",
    avatar_url: "/staff/tom-bennett.png",
  },
  rachel: {
    id: "staff-rachel",
    name: "Rachel Hughes",
    username: "rachel.hughes@essex.example",
    role: "Revenues officer",
    team: "Revenues",
    avatar_url: "/staff/rachel-hughes.png",
  },
  maya: {
    id: "staff-maya",
    name: "Maya Patel",
    username: "maya.patel@essex.example",
    role: "Benefits officer",
    team: "Financial support",
    avatar_url: "/staff/alice-morgan.png",
  },
  daniel: {
    id: "staff-daniel",
    name: "Daniel Reed",
    username: "daniel.reed@essex.example",
    role: "Waste services coordinator",
    team: "Waste operations",
    avatar_url: "/staff/tom-bennett.png",
  },
  nina: {
    id: "staff-nina",
    name: "Nina Scott",
    username: "nina.scott@essex.example",
    role: "Family support coordinator",
    team: "Children & families",
    avatar_url: "/staff/rachel-hughes.png",
  },
  owen: {
    id: "staff-owen",
    name: "Owen Clarke",
    username: "owen.clarke@essex.example",
    role: "Housing allocations officer",
    team: "Housing options",
    avatar_url: "/staff/samir-khan.png",
  },
};

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const fetchMetrics = () => getJson<Metrics>("/metrics/summary");
export const fetchMetadata = () => getJson<ModelMetadata>("/model/metadata");
export const fetchDashboard = () => getJson<DashboardSummary>("/dashboard/summary");
export const fetchHealth = () => getJson<Health>("/health");
export const fetchCaseQueue = () => getJson<CaseRecord[]>("/cases/queue");
export const fetchAuditSummary = () => getJson<AuditSummary>("/audit/summary");
export const fetchCaseSourceDetail = (caseId: string, sourceId: string) =>
  getJson<M365SourceDetail>(`/cases/${encodeURIComponent(caseId)}/sources/${encodeURIComponent(sourceId)}`);
export const fetchCaseEvidenceDetail = (caseId: string, evidenceId: string) =>
  getJson<M365SourceDetail>(`/cases/${encodeURIComponent(caseId)}/evidence/${encodeURIComponent(evidenceId)}`);

export async function postPredict(payload: CaseRequest): Promise<Prediction> {
  const response = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return (await response.json()) as Prediction;
}

export async function postPipelineScore(payload: CaseRequest): Promise<PipelineScore> {
  const response = await fetch(`${API_BASE}/pipeline/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return (await response.json()) as PipelineScore;
}

export async function postExtractCaseRequest(text: string, defaults?: CaseRequest): Promise<CaseExtraction> {
  const response = await fetch(`${API_BASE}/pipeline/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, defaults }),
  });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  return (await response.json()) as CaseExtraction;
}

async function apiErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") {
      return body.detail;
    }
    if (Array.isArray(body.detail) && body.detail[0]?.msg) {
      return body.detail[0].msg;
    }
  } catch {
    // Fall through to the status fallback.
  }
  return `API returned ${response.status}`;
}

export async function postChat(
  message: string,
  history: ChatMessage[],
  caseContext: CaseRequest | null,
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, case_context: caseContext }),
  });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return (await response.json()) as ChatResponse;
}

export async function postDecision(caseId: string, payload: DecisionPayload): Promise<DecisionReceipt> {
  const response = await fetch(`${API_BASE}/cases/${caseId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return (await response.json()) as DecisionReceipt;
}

export async function postAssignToSelf(caseId: string, currentUser: StaffMember): Promise<CaseRecord> {
  const response = await fetch(`${API_BASE}/cases/${caseId}/assign-to-self`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(currentUser),
  });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return (await response.json()) as CaseRecord;
}

export const fallbackCaseQueue: CaseRecord[] = [
  {
    case_id: "ECC-365-1042",
    title: "Review now",
    service_label: "Housing repair",
    team: "Contact centre",
    source: "Outlook shared mailbox",
    evidence: "SharePoint repair photos",
    handover: "Teams duty note",
    due: "Within 2 hours",
    risk: "high",
    action: "Review and confirm priority",
    summary: "Possible fire risk in a housing repair case with children in the household.",
    access_notes: "Contact by phone first. Check safe access arrangements before assigning a repair visit.",
    household_context: "Children in household; vulnerability/safeguarding indicator present.",
    status: "In review",
    last_updated: "Today 09:24",
    assigned_to: SYNTHETIC_STAFF.alice,
    activity: [
      {
        id: "act-1042-1",
        action: "System flag reviewed",
        detail: "High-priority flag opened from today's queue.",
        time: "Today 09:24",
        actor: SYNTHETIC_STAFF.alice,
      },
      {
        id: "act-1042-2",
        action: "Evidence attached",
        detail: "Repair photo and previous contact linked from 365 context.",
        time: "Today 09:20",
        actor: SYNTHETIC_STAFF.alice,
      },
    ],
    evidence_items: [
      { id: "evidence-1042-photo", type: "photo", title: "Kitchen meter cupboard photo", detail: "Resident-submitted repair photo showing scorch marks around the meter cupboard door frame.", source: "SharePoint", image_url: "/case-evidence/housing-fire-risk-photo.png" },
      { id: "evidence-1042-call-log", type: "document", title: "Contact centre call log", detail: "Call handler notes mention burning smell, children in the property, and phone-first contact preference.", source: "Phone" },
      { id: "evidence-1042-duty-note", type: "note", title: "Repairs duty note", detail: "Teams handover records the safety concern and asks repairs to confirm safe access before appointment booking.", source: "Teams", image_url: "/case-evidence/housing-case-note.png" },
    ],
    case_notes: [
      {
        id: "note-1042-teams",
        type: "case_note",
        app: "Teams",
        title: "Duty handover note",
        summary: "Contact centre flagged fire-risk wording and children in the household.",
        body: "Caller reported a possible fire risk in the repair area. Children are in the household. Officer should check safe access arrangements before assigning a visit.",
        time: "Today 09:12",
        owner: "Contact centre",
        external_url: "https://teams.microsoft.com/",
      },
      {
        id: "note-1042-sharepoint",
        type: "evidence",
        app: "SharePoint",
        title: "Repair evidence folder",
        summary: "Photos and the synthetic repair evidence record are linked to this case.",
        body: "Evidence folder contains the resident repair photo, previous contact reference, and audit note placeholders for the demo.",
        time: "Today 09:20",
        owner: "Housing repairs",
        external_url: "https://www.office.com/launch/sharepoint",
      },
    ],
    previous_contacts: [
      {
        id: "contact-1042-outlook",
        type: "previous_contact",
        app: "Outlook",
        title: "Resident email follow-up",
        summary: "Earlier email linked to the same repair issue.",
        body: "Resident asked for an update on the repair and repeated concern about safety in the home. No real personal data is stored in this synthetic demo.",
        time: "Yesterday 16:42",
        owner: "Shared mailbox",
        external_url: "https://outlook.office.com/mail/",
      },
    ],
    case_request: defaultCase,
  },
  {
    case_id: "ECC-365-1044",
    title: "Assign officer",
    service_label: "Adult support",
    team: "Locality team",
    source: "SharePoint case library",
    evidence: "Care record export",
    handover: "Teams locality update",
    due: "Today",
    risk: "high",
    action: "Check safeguarding context",
    summary: "Adult support case where care package concerns suggest same-day review.",
    access_notes: "Assign to locality team before contacting provider.",
    household_context: "Vulnerability indicator present; resident may be without support.",
    status: "Waiting update",
    last_updated: "Today 08:48",
    assigned_to: SYNTHETIC_STAFF.samir,
    activity: [
      {
        id: "act-1044-1",
        action: "Locality update added",
        detail: "Teams note says provider status needs checking.",
        time: "Today 08:48",
        actor: SYNTHETIC_STAFF.samir,
      },
      {
        id: "act-1044-2",
        action: "Care record linked",
        detail: "Synthetic SharePoint care record export attached.",
        time: "Today 08:41",
        actor: SYNTHETIC_STAFF.samir,
      },
    ],
    evidence_items: [
      { id: "evidence-1044-care-export", type: "document", title: "Care package record export", detail: "SharePoint care summary shows scheduled support was not confirmed for the morning visit.", source: "SharePoint" },
      { id: "evidence-1044-provider-email", type: "document", title: "Provider confirmation email", detail: "Outlook message asks the provider to confirm whether the missed visit has been resolved.", source: "Outlook" },
      { id: "evidence-1044-phone-log", type: "note", title: "Resident welfare call log", detail: "Phone note says the resident may be without support until the provider confirms cover.", source: "Phone" },
    ],
    case_notes: [
      {
        id: "note-1044-teams",
        type: "case_note",
        app: "Teams",
        title: "Locality team update",
        summary: "Team note says the support package may not have been delivered.",
        body: "Locality team should check provider status before contacting the resident. Same-day review recommended because support may have failed.",
        time: "Today 08:35",
        owner: "Locality team",
        external_url: "https://teams.microsoft.com/",
      },
    ],
    previous_contacts: [
      {
        id: "contact-1044-sharepoint",
        type: "previous_contact",
        app: "SharePoint",
        title: "Previous support concern",
        summary: "Earlier case record mentions a related support concern.",
        body: "Synthetic previous contact record: resident may have experienced a missed support visit. Escalate according to service policy if confirmed.",
        time: "Yesterday 11:05",
        owner: "Adult support",
        external_url: "https://www.office.com/launch/sharepoint",
      },
      {
        id: "contact-1044-outlook",
        type: "previous_contact",
        app: "Outlook",
        title: "Provider update request",
        summary: "Email requesting confirmation from provider.",
        body: "Synthetic shared mailbox entry requesting provider confirmation. No live email is connected in this demo.",
        time: "Yesterday 14:18",
        owner: "Shared mailbox",
        external_url: "https://outlook.office.com/mail/",
      },
    ],
    case_request: {
      ...defaultCase,
      service_type: "adult_social_care",
      service_subtype: "care_package_concern",
      district: "Harlow",
      source_system: "case_portal",
      days_open: 2,
      previous_contacts: 2,
      deprivation_band: "medium",
      channel: "email",
      urgency_text: "Care package concern and resident left without support",
    },
  },
  {
    case_id: "ECC-365-1043",
    title: "Check duplicate reports",
    service_label: "Highways & roads",
    team: "Highways duty desk",
    source: "Teams service channel",
    evidence: "SharePoint highways report",
    handover: "Highways channel thread",
    due: "1 day",
    risk: "medium",
    action: "Review repeated impact",
    summary: "Repeated highways report near a school route.",
    access_notes: "Check duplicate reports before scheduling inspection.",
    household_context: "No vulnerability indicator recorded.",
    status: "New",
    last_updated: "Today 10:05",
    assigned_to: SYNTHETIC_STAFF.tom,
    activity: [
      {
        id: "act-1043-1",
        action: "Duplicate signal found",
        detail: "Teams handover mentions linked reports for the same route.",
        time: "Today 10:05",
        actor: SYNTHETIC_STAFF.tom,
      },
    ],
    evidence_items: [
      { id: "evidence-1043-road-photo", type: "photo", title: "Road defect photo", detail: "Resident photo shows a pothole near a marked school crossing approach.", source: "SharePoint", image_url: "/case-evidence/highways-road-defect-photo.png" },
      { id: "evidence-1043-map-note", type: "document", title: "Duplicate-location map note", detail: "Case portal map pins show three reports within the same short road section.", source: "Case portal" },
      { id: "evidence-1043-phone-note", type: "note", title: "School-run phone call", detail: "Phone contact says vehicles are swerving around the defect during school drop-off.", source: "Phone" },
    ],
    case_notes: [
      {
        id: "note-1043-teams",
        type: "case_note",
        app: "Teams",
        title: "Highways channel thread",
        summary: "Several reports may relate to the same location.",
        body: "Duty desk should check duplicate reports and decide whether one inspection can cover the linked reports.",
        time: "Today 10:05",
        owner: "Highways duty desk",
        external_url: "https://teams.microsoft.com/",
      },
    ],
    previous_contacts: [
      {
        id: "contact-1043-teams",
        type: "previous_contact",
        app: "Teams",
        title: "Duplicate report mention",
        summary: "Earlier handover message mentions the same route.",
        body: "Synthetic channel note: repeated resident reports mention a pothole near a school route.",
        time: "Yesterday 09:47",
        owner: "Highways duty desk",
        external_url: "https://teams.microsoft.com/",
      },
    ],
    case_request: {
      ...defaultCase,
      service_type: "highways",
      service_subtype: "road_defect",
      district: "Colchester",
      source_system: "teams_referral",
      duplicate_signal: true,
      days_open: 4,
      previous_contacts: 3,
      vulnerability_flag: false,
      deprivation_band: "medium",
      channel: "web",
      urgency_text: "Repeated pothole report near school route",
    },
  },
  {
    case_id: "ECC-365-1045",
    title: "Standard queue",
    service_label: "Council tax & billing",
    team: "Revenues",
    source: "Online form",
    evidence: "Case portal record",
    handover: "Revenues queue",
    due: "3 days",
    risk: "low",
    action: "Handle in date order",
    summary: "Standard council tax billing query with no urgent risk indicators.",
    access_notes: "Respond through the case portal.",
    household_context: "No vulnerability indicator recorded.",
    status: "In progress",
    last_updated: "Today 12:18",
    assigned_to: SYNTHETIC_STAFF.rachel,
    activity: [
      {
        id: "act-1045-1",
        action: "Form reviewed",
        detail: "Standard billing query accepted into the normal queue.",
        time: "Today 12:18",
        actor: SYNTHETIC_STAFF.rachel,
      },
    ],
    evidence_items: [
      { id: "evidence-1045-form", type: "document", title: "Billing enquiry form", detail: "Case portal submission asks why the instalment amount changed after a revised bill.", source: "Case portal" },
      { id: "evidence-1045-email", type: "document", title: "Automated receipt email", detail: "Outlook receipt confirms the resident received the case reference and standard response timescale.", source: "Outlook" },
    ],
    case_notes: [
      {
        id: "note-1045-caseportal",
        type: "case_note",
        app: "Case portal",
        title: "Form submission",
        summary: "Resident asks for an update on a council tax bill.",
        body: "Standard billing query with no urgent risk wording. Handle in normal queue order.",
        time: "Today 12:10",
        owner: "Revenues",
        external_url: "https://www.office.com/",
      },
    ],
    previous_contacts: [
      {
        id: "contact-1045-phone",
        type: "previous_contact",
        app: "Phone",
        title: "Earlier balance query call",
        summary: "Short call last week asked where to find the revised bill online.",
        body: "Synthetic phone note: caller was directed to the case portal and advised to submit the billing query form if the instalment schedule still looked incorrect.",
        time: "Friday 14:22",
        owner: "Revenues contact centre",
      },
    ],
    case_request: {
      ...defaultCase,
      service_type: "council_tax",
      service_subtype: "billing_query",
      district: "Basildon",
      source_system: "web_form",
      accessibility_need: false,
      days_open: 1,
      previous_contacts: 0,
      vulnerability_flag: false,
      deprivation_band: "low",
      channel: "web",
      urgency_text: "Resident asks for update on council tax bill",
    },
  },
  {
    case_id: "ECC-365-1046",
    title: "Unassigned",
    service_label: "Benefits",
    team: "Financial support",
    source: "Outlook shared mailbox",
    evidence: "Case portal income evidence",
    handover: "Benefits duty inbox",
    due: "Today 15:00",
    risk: "high",
    action: "Assign reviewer and check vulnerability context",
    summary: "Benefit support enquiry with rent arrears wording and repeated contact.",
    access_notes: "Assign an officer before contacting the resident. Check consent and evidence status in the case portal.",
    household_context: "Vulnerability indicator present; affordability pressure mentioned in the contact notes.",
    status: "New",
    last_updated: "Today 11:32",
    assigned_to: null,
    activity: [
      {
        id: "act-1046-1",
        action: "Mailbox item received",
        detail: "Outlook shared mailbox item linked to benefits queue.",
        time: "Today 11:32",
        actor: SYNTHETIC_STAFF.maya,
      },
    ],
    evidence_items: [
      { id: "evidence-1046-income-checklist", type: "document", title: "Income evidence checklist", detail: "Case portal checklist shows tenancy confirmation and one income document still outstanding.", source: "Case portal" },
      { id: "evidence-1046-email", type: "document", title: "Rent arrears email", detail: "Shared mailbox email mentions arrears, callback request, and difficulty uploading evidence.", source: "Outlook" },
      { id: "evidence-1046-call-note", type: "note", title: "Callback attempt note", detail: "Phone note records unsuccessful callback and asks the reviewer to try again before close of day.", source: "Phone" },
    ],
    case_notes: [
      {
        id: "note-1046-outlook",
        type: "case_note",
        app: "Outlook",
        title: "Benefits shared mailbox handover",
        summary: "Email asks the duty team to review rent arrears wording today.",
        body: "Shared mailbox note for demo: the resident describes rent arrears and asks for urgent benefit support. Assign a reviewer, check evidence status, and follow the service escalation route if hardship is confirmed.",
        time: "Today 11:28",
        owner: "Benefits shared mailbox",
        external_url: "https://outlook.office.com/mail/",
      },
      {
        id: "note-1046-caseportal",
        type: "evidence",
        app: "Case portal",
        title: "Evidence checklist",
        summary: "Case portal shows the claim evidence checklist and missing items.",
        body: "Demo case portal note: income evidence and tenancy confirmation are pending. Officer should not make an eligibility decision from the AI priority flag.",
        time: "Today 11:30",
        owner: "Financial support",
        external_url: "https://www.office.com/",
      },
    ],
    previous_contacts: [
      {
        id: "contact-1046-outlook",
        type: "previous_contact",
        app: "Outlook",
        title: "Earlier rent arrears email",
        summary: "Earlier message mentioned arrears and a request for a call back.",
        body: "Synthetic previous contact record: resident asked for a call back about arrears and evidence needed for benefit support.",
        time: "Yesterday 15:44",
        owner: "Benefits shared mailbox",
        external_url: "https://outlook.office.com/mail/",
      },
    ],
    case_request: {
      ...defaultCase,
      service_type: "benefits",
      service_subtype: "rent_arrears_support",
      district: "Tendring",
      source_system: "shared_mailbox",
      sla_hours: 24,
      days_open: 3,
      previous_contacts: 2,
      vulnerability_flag: true,
      deprivation_band: "high",
      channel: "email",
      urgency_text: "Rent arrears and urgent benefits support requested",
    },
  },
  {
    case_id: "ECC-365-1048",
    title: "Unassigned",
    service_label: "Family support",
    team: "Children & families",
    source: "Teams referral",
    evidence: "Referral note",
    handover: "MASH duty Teams handover",
    due: "Within 4 hours",
    risk: "high",
    action: "Assign duty reviewer and check referral note",
    summary: "Family support referral with safeguarding language and out-of-hours handover.",
    access_notes: "Assign a duty reviewer before any outbound contact. Follow safeguarding triage policy.",
    household_context: "Safeguarding/vulnerability context present in the referral note.",
    status: "New",
    last_updated: "Today 13:06",
    assigned_to: null,
    activity: [
      {
        id: "act-1048-1",
        action: "Teams referral received",
        detail: "Duty channel referral added to today's unassigned queue.",
        time: "Today 13:06",
        actor: SYNTHETIC_STAFF.nina,
      },
    ],
    evidence_items: [
      { id: "evidence-1048-referral", type: "note", title: "Teams referral note", detail: "Referral note asks children and families duty to review within four hours.", source: "Teams" },
      { id: "evidence-1048-call-log", type: "document", title: "Out-of-hours call log", detail: "Phone log records the referral source and states no final decision has been made.", source: "Phone" },
      { id: "evidence-1048-case-shell", type: "document", title: "Case portal shell", detail: "Case portal shell has referral metadata and is waiting for duty reviewer assignment.", source: "Case portal" },
    ],
    case_notes: [
      {
        id: "note-1048-teams",
        type: "case_note",
        app: "Teams",
        title: "MASH duty handover",
        summary: "Teams referral asks children and families duty to review today.",
        body: "Demo Teams handover: referral note includes safeguarding wording and asks for duty review within four hours. The AI flag is only a queueing aid; staff must follow statutory safeguarding process.",
        time: "Today 13:03",
        owner: "Children & families",
        external_url: "https://teams.microsoft.com/",
      },
      {
        id: "note-1048-caseportal",
        type: "evidence",
        app: "Case portal",
        title: "Referral case shell",
        summary: "Case shell exists with source referral metadata.",
        body: "Demo case shell: referral source and timestamp are present. No final priority decision has been recorded.",
        time: "Today 13:05",
        owner: "Children & families",
        external_url: "https://www.office.com/",
      },
    ],
    previous_contacts: [
      {
        id: "contact-1048-outlook",
        type: "previous_contact",
        app: "Outlook",
        title: "Previous information request",
        summary: "Earlier mailbox item requested background information from a partner team.",
        body: "Synthetic email: partner team asked whether there was any existing family-support context before the referral was sent to duty.",
        time: "Yesterday 17:36",
        owner: "Children and families shared mailbox",
        external_url: "https://outlook.office.com/mail/",
      },
    ],
    case_request: {
      ...defaultCase,
      service_type: "children_services",
      service_subtype: "family_support_referral",
      district: "Epping Forest",
      source_system: "teams_referral",
      sla_hours: 4,
      out_of_hours: true,
      days_open: 0,
      previous_contacts: 0,
      vulnerability_flag: true,
      deprivation_band: "medium",
      channel: "email",
      urgency_text: "Safeguarding concern in family support referral",
    },
  },
];

export const fallbackDashboard: DashboardSummary = {
  pipeline: [
    { step: "Data generation", status: "complete", detail: "25,000 synthetic Essex-style service requests" },
    { step: "Training", status: "complete", detail: "scikit-learn pipeline with service, operational, text, and area-context features" },
    { step: "Evaluation", status: "complete", detail: "Accuracy 90.2%, high-priority recall 94.1%" },
    { step: "Registry candidate", status: "ready", detail: "Model tags, gate summary, and review metadata" },
    { step: "Online endpoint", status: "ready", detail: "Azure managed endpoint YAML and scoring script" },
    { step: "Batch scoring", status: "ready", detail: "Batch endpoint YAML and CSV scoring preview" },
  ],
  azure_status: [
    { item: "Workspace", status: "complete", detail: "Azure ML workspace mlw-service-priority-ai-v2 in rg-service-priority-ai-demo, UK South" },
    { item: "Model registry", status: "complete", detail: "service-priority-ai model registered as v1 with synthetic-data governance tags" },
    { item: "Online endpoint", status: "complete", detail: "ep-service-priority-ai scoring endpoint routes 100% traffic to blue" },
    { item: "365 API wrapper", status: "complete", detail: "Azure Functions exposes the FastAPI routes for browser-based employees" },
    { item: "Batch scoring", status: "complete", detail: "SharePoint-style CSV batch scoring completed through be-service-priority-ai" },
    { item: "Budget alerts", status: "ready", detail: "Monthly Azure budget alert configured for the demo subscription" },
  ],
  registry: [
    {
      version: "0.1.0",
      name: "service-priority-ai-baseline",
      accuracy: 0.902,
      macro_f1: 0.9035,
      high_priority_recall: 0.9408,
      gate: "pass",
      target: "Azure Functions API / Azure ML managed endpoint",
    },
  ],
  monitoring_trend: [
    { label: "Mon", volume: 28, confidence: 0.82, high_priority_rate: 0.18 },
    { label: "Tue", volume: 34, confidence: 0.84, high_priority_rate: 0.21 },
    { label: "Wed", volume: 31, confidence: 0.81, high_priority_rate: 0.16 },
    { label: "Thu", volume: 43, confidence: 0.86, high_priority_rate: 0.24 },
    { label: "Fri", volume: 39, confidence: 0.85, high_priority_rate: 0.2 },
  ],
  fairness: [
    { feature: "vulnerability_flag", value: "False", rows: 3617, high_priority_rate: 0.084, accuracy: 0.9007 },
    { feature: "vulnerability_flag", value: "True", rows: 1383, high_priority_rate: 0.6001, accuracy: 0.9053 },
    { feature: "deprivation_band", value: "high", rows: 1466, high_priority_rate: 0.2851, accuracy: 0.8997 },
    { feature: "deprivation_band", value: "medium", rows: 2683, high_priority_rate: 0.2039, accuracy: 0.9038 },
    { feature: "service_type", value: "adult social care", rows: 689, high_priority_rate: 0.4891, accuracy: 0.881 },
    { feature: "service_type", value: "highways", rows: 906, high_priority_rate: 0.0993, accuracy: 0.9084 },
  ],
  shap_top_features: [
    { feature: "vulnerability flag true", mean_absolute_shap: 1.4778 },
    { feature: "previous contacts", mean_absolute_shap: 1.4591 },
    { feature: "vulnerability flag false", mean_absolute_shap: 1.2966 },
    { feature: "sla hours", mean_absolute_shap: 1.216 },
    { feature: "days open", mean_absolute_shap: 1.1198 },
  ],
  batch_preview: [
    { case_id: "CASE-00001", priority: "medium", predicted_priority: "medium", confidence: "0.5458", human_review_required: "True" },
    { case_id: "CASE-00002", priority: "medium", predicted_priority: "medium", confidence: "0.6704", human_review_required: "False" },
    { case_id: "CASE-00003", priority: "medium", predicted_priority: "medium", confidence: "0.5651", human_review_required: "True" },
    { case_id: "CASE-00005", priority: "low", predicted_priority: "low", confidence: "0.9361", human_review_required: "False" },
    { case_id: "CASE-00006", priority: "high", predicted_priority: "high", confidence: "0.9234", human_review_required: "True" },
  ],
  governance: [
    { item: "Model card", status: "ready", owner: "AI/ML engineer" },
    { item: "DPIA-lite review", status: "ready", owner: "Information governance" },
    { item: "Fairness cohorts", status: "ready", owner: "Data science" },
    { item: "Human review route", status: "required", owner: "Service team" },
    { item: "Azure RAI scorecard", status: "next", owner: "AI/ML engineer" },
    { item: "Power BI publish", status: "next", owner: "Analytics" },
  ],
};

export function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function clean(value: string) {
  return value.replace(/_/g, " ");
}
