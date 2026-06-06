// Original content for the public service portal.
// Layout/IA is inspired by a public-sector service portal, but ALL copy,
// branding and imagery here are original. No third-party / copyrighted
// text, photos, video, logos or marks are used.

// Each nav item points to a real destination: a route hash or an in-page anchor.
export const NAV = [
  { label: "Home", href: "#/", match: "home" as const },
  { label: "How it works", href: "#how-it-works" },
  { label: "Services", href: "#services" },
  { label: "Dashboard", href: "#/dashboard", match: "dashboard" as const },
];

export const SERVICES = [
  {
    key: "housing",
    title: "Housing & repairs",
    blurb: "Report a repair, request adaptations, or raise a tenancy concern.",
    sla: "Triaged in minutes",
    icon: "home",
  },
  {
    key: "adult_social_care",
    title: "Adult social care",
    blurb: "Request an assessment, arrange support, or check an existing plan.",
    sla: "Vulnerability-aware",
    icon: "heart",
  },
  {
    key: "children_services",
    title: "Children & families",
    blurb: "Early help, family support, and safeguarding referrals.",
    sla: "Safeguarding priority",
    icon: "users",
  },
  {
    key: "highways",
    title: "Highways & environment",
    blurb: "Potholes, street lighting, flooding, and waste collection issues.",
    sla: "Geo-routed",
    icon: "map",
  },
] as const;

// "Latest vacancies"-style horizontal card row — here, the live priority queue.
export const QUEUE = [
  {
    flag: "high" as const,
    title: "No heating — family with young children",
    service: "Housing",
    channel: "Phone",
    confidence: 92,
    age: "Opened 2h ago",
  },
  {
    flag: "high" as const,
    title: "Adult social care — missed care visit",
    service: "Adult social care",
    channel: "Phone",
    confidence: 88,
    age: "Opened 5h ago",
  },
  {
    flag: "medium" as const,
    title: "Council tax — payment hardship",
    service: "Benefits",
    channel: "Web",
    confidence: 61,
    age: "Opened 1d ago",
  },
  {
    flag: "low" as const,
    title: "Missed bin collection",
    service: "Waste",
    channel: "Web",
    confidence: 18,
    age: "Opened 1d ago",
  },
];

// "Inspired to do more"-style trio of large image-topped tiles.
export const TILES = [
  {
    eyebrow: "The model",
    title: "See how a request is scored",
    body: "Walk through the live triage model — inputs, confidence, and the reasons behind every priority band.",
    link: "Explore the model",
    route: "dashboard" as const,
    grad: "linear-gradient(140deg, #0b5d54, #08463f 60%, #0c2b30)",
    icon: "activity",
  },
  {
    eyebrow: "Responsible AI",
    title: "Fair, monitored, and reviewable",
    body: "Fairness is measured across vulnerability, deprivation and service cohorts — surfaced, never hidden.",
    link: "Read the approach",
    route: "dashboard" as const,
    grad: "linear-gradient(140deg, #2f6feb, #1b3f86 60%, #0c2b30)",
    icon: "shield",
  },
  {
    eyebrow: "The team",
    title: "People stay in the loop",
    body: "Every high-priority or low-confidence case routes to a caseworker. The model advises; people decide.",
    link: "How oversight works",
    route: "dashboard" as const,
    grad: "linear-gradient(140deg, #e0973a, #b9701f 60%, #5a3608)",
    icon: "users",
  },
];

// Two alternating media/text feature rows ("video testimonial" pattern).
export const FEATURES = [
  {
    kicker: "Urgent first",
    title: "Urgent cases reach a person first",
    body: "When a request signals risk — a vulnerability flag, repeat contact, or an emergency in the words themselves — it is lifted to the top of the queue and routed for same-day human review, not left waiting in line.",
    link: "See live triage",
    route: "dashboard" as const,
    grad: "radial-gradient(120% 120% at 20% 10%, #12796c, transparent 55%), linear-gradient(140deg, #0b5d54, #0c2b30)",
    stat: { value: "97%", label: "of high-priority cases recalled" },
  },
  {
    kicker: "No black box",
    title: "Every score explains itself",
    body: "There is no black box. Each prediction arrives with plain-English reason codes and feature attributions, so a caseworker can trust it when it is right — and confidently challenge it when their judgement says otherwise.",
    link: "Open the dashboard",
    route: "dashboard" as const,
    grad: "radial-gradient(120% 120% at 80% 10%, #3f78f0, transparent 55%), linear-gradient(140deg, #1b3f86, #0c2b30)",
    stat: { value: "100%", label: "of decisions human-reviewed" },
  },
];

export const QUOTES = [
  {
    quote:
      "It surfaces the cases that genuinely cannot wait. I spend less time triaging a backlog and more time with residents.",
    name: "Priya N.",
    role: "Duty caseworker",
    color: "#0b5d54",
  },
  {
    quote:
      "Having the reasons next to every score means I can trust it — and challenge it when my judgement says otherwise.",
    name: "Marcus L.",
    role: "Team lead, Adult Social Care",
    color: "#9a6700",
  },
  {
    quote:
      "The fairness dashboard is the part our governance board cares about most. It is advisory, monitored, and reviewable.",
    name: "Dr. Helen O.",
    role: "Information governance",
    color: "#2f6feb",
  },
];

export const NEWS = [
  {
    tag: "Product",
    title: "How reason codes keep advisory scoring accountable",
    date: "4 Jun 2026",
    cover: "linear-gradient(135deg, #0b5d54, #0c2b30)",
  },
  {
    tag: "Responsible AI",
    title: "Measuring fairness across vulnerability cohorts",
    date: "28 May 2026",
    cover: "linear-gradient(135deg, #2f6feb, #0c2b30)",
  },
  {
    tag: "Engineering",
    title: "From synthetic data to an Azure managed endpoint",
    date: "19 May 2026",
    cover: "linear-gradient(135deg, #e0973a, #8a5a12)",
  },
  {
    tag: "Governance",
    title: "Designing human review into every high-priority case",
    date: "9 May 2026",
    cover: "linear-gradient(135deg, #1b3f86, #0c2b30)",
  },
];

export const STATS = [
  { value: "97%", label: "High-priority recall" },
  { value: "90%", label: "Overall accuracy" },
  { value: "7", label: "Service areas covered" },
  { value: "100%", label: "Human-reviewed decisions" },
];

export const SOCIAL = ["youtube", "linkedin", "twitter", "facebook", "instagram"] as const;
