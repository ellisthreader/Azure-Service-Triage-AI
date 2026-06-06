// Central API client, shared types, and demo fallbacks for Service Priority AI.

export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8010";

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

export type Metrics = {
  total_predictions: number;
  high_priority_rate: number;
  average_confidence: number;
  drift_watch: Record<string, number | string>;
};

export type ModelMetadata = {
  model_name?: string;
  model_version?: string;
  model_type?: string;
  training_rows?: number;
  validation_rows?: number;
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
  days_open: 5,
  previous_contacts: 3,
  vulnerability_flag: true,
  deprivation_band: "high",
  channel: "phone",
  urgency_text: "Customer has no heating and there are young children in the property",
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

export async function postPredict(payload: CaseRequest): Promise<Prediction> {
  const response = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return (await response.json()) as Prediction;
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

export const fallbackDashboard: DashboardSummary = {
  pipeline: [
    { step: "Data generation", status: "complete", detail: "1,500 synthetic service requests" },
    { step: "Training", status: "complete", detail: "scikit-learn pipeline with text and structured features" },
    { step: "Evaluation", status: "complete", detail: "Accuracy 90%, high-priority recall 97%" },
    { step: "Registry candidate", status: "ready", detail: "Model tags, gate summary, and review metadata" },
    { step: "Online endpoint", status: "ready", detail: "Azure managed endpoint YAML and scoring script" },
    { step: "Batch scoring", status: "ready", detail: "Batch endpoint YAML and CSV scoring preview" },
  ],
  azure_status: [
    { item: "Workspace", status: "complete", detail: "Azure ML workspace SaaS in rg-essex-mlops-demo, UK South" },
    { item: "Training job", status: "complete", detail: "credit_default_prediction completed on Azure serverless compute" },
    { item: "Model registry", status: "complete", detail: "Latest registered model version resolved as v1" },
    { item: "Managed endpoint", status: "complete", detail: "credit-endpoint-af589413 was created with key auth and public scoring URI" },
    { item: "Online deployment", status: "blocked", detail: "Free subscription CPU quota blocked DSv2/DS1v2 managed deployment" },
    { item: "Website serving", status: "ready", detail: "Dashboard uses the Railway FastAPI /predict service until Azure ML endpoint quota is approved" },
  ],
  registry: [
    {
      version: "0.1.0",
      name: "service-priority-ai-baseline",
      accuracy: 0.9033,
      macro_f1: 0.9045,
      high_priority_recall: 0.9661,
      gate: "pass",
      target: "Railway FastAPI / Azure ML managed endpoint",
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
    { feature: "vulnerability_flag", value: "False", rows: 227, high_priority_rate: 0.0529, accuracy: 0.9119 },
    { feature: "vulnerability_flag", value: "True", rows: 73, high_priority_rate: 0.7123, accuracy: 0.8767 },
    { feature: "deprivation_band", value: "high", rows: 75, high_priority_rate: 0.2667, accuracy: 0.92 },
    { feature: "deprivation_band", value: "medium", rows: 126, high_priority_rate: 0.1905, accuracy: 0.8889 },
    { feature: "service_type", value: "adult social care", rows: 44, high_priority_rate: 0.3864, accuracy: 0.8864 },
    { feature: "service_type", value: "highways", rows: 44, high_priority_rate: 0.1364, accuracy: 0.7955 },
  ],
  shap_top_features: [
    { feature: "previous contacts", mean_absolute_shap: 1.0029 },
    { feature: "days open", mean_absolute_shap: 0.839 },
    { feature: "vulnerability flag", mean_absolute_shap: 0.8206 },
    { feature: "children services", mean_absolute_shap: 0.7564 },
    { feature: "channel web", mean_absolute_shap: 0.4768 },
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
    { item: "Azure RAI scorecard", status: "requires Azure", owner: "AI/ML engineer" },
    { item: "Power BI publish", status: "requires workspace", owner: "Analytics" },
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
