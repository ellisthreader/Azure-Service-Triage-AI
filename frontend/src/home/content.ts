export const NAV = [
  { label: "Home", href: "#/", match: "home" as const },
  { label: "Services", href: "#services" },
  { label: "Campaigns", href: "#campaigns" },
  { label: "News", href: "#news" },
  { label: "Dashboard", href: "#/dashboard", match: "dashboard" as const },
];

export const HERO = {
  title: "Welcome to Essex",
  searchLabel: "Search Essex County Council",
  primaryImage: "/essex-home/river-harlow.jpg",
  generatedBackdrop: "/essex-home/generated-civic-ops-bg.png",
  primaryAlt:
    "An aerial view of a river in Harlow with barges, fields, trees, footpaths and a nearby car park.",
};

export const CALLOUTS = [
  {
    title: "Cost of living support",
    body: "Get support with bills including energy, broadband and food costs.",
    href: "https://www.essex.gov.uk/help-cost-living",
    label: "Help with the cost of living",
    tone: "blue",
  },
  {
    title: "Local Government Reorganisation (LGR) in Greater Essex",
    body: "Information and plans for Local Government Reorganisation in Greater Essex.",
    href: "https://www.essex.gov.uk/about-council/plans-and-strategies/our-vision-essex/local-government-reorganisation-lgr",
    label: "LGR in Greater Essex",
    tone: "dark",
  },
];

export const SERVICES = [
  {
    title: "Adult social care and health",
    body: "Includes social care help, advice on disabilities and health conditions, Blue Badge, paying for care and support for carers",
    href: "https://www.essex.gov.uk/adult-social-care-and-health",
    icon: "heart",
  },
  {
    title: "Children, young people and families",
    body: "Find services for children and young people, including social care, adoption, fostering and health and wellbeing",
    href: "https://www.essex.gov.uk/children-young-people-and-families",
    icon: "users",
  },
  {
    title: "Schools and learning",
    body: "Includes school admissions, early years and childcare, post-16 options and adult learning",
    href: "https://www.essex.gov.uk/schools-and-learning",
    icon: "school",
  },
  {
    title: "Jobs and apprenticeships",
    body: "Find jobs, volunteering and apprenticeship opportunities in Essex",
    href: "https://www.essex.gov.uk/jobs-and-apprenticeships",
    icon: "briefcase",
  },
  {
    title: "Births, ceremonies and deaths",
    body: "Includes weddings, civil partnerships, births, deaths, Coroner's service, citizenship and other ceremonies",
    href: "https://www.essex.gov.uk/births-ceremonies-and-deaths",
    icon: "landmark",
  },
  {
    title: "Libraries",
    body: "Reserve, renew and access library items. Find events and volunteering opportunities.",
    href: "https://libraries.essex.gov.uk/home",
    icon: "book",
  },
  {
    title: "Roads, streets and transport",
    body: "Report a highways problem, get updates on travel, transport and roadworks",
    href: "https://www.essex.gov.uk/roads-streets-and-transport",
    icon: "road",
  },
  {
    title: "Planning, land and recycling",
    body: "Includes planning applications, recycling centres and Essex Energy Switch",
    href: "https://www.essex.gov.uk/planning-land-and-recycling",
    icon: "recycle",
  },
  {
    title: "Business",
    body: "Includes business licences, supplying the council, trading standards and support for businesses",
    href: "https://www.essex.gov.uk/business",
    icon: "building",
  },
  {
    title: "About the council",
    body: "Find your councillor, Council Tax, what happens at council meetings and how the council works",
    href: "https://www.essex.gov.uk/about-council",
    icon: "council",
  },
  {
    title: "Leisure, culture and local heritage",
    body: "Includes cultural events and activities, historical records, archives and building conservation",
    href: "https://www.essex.gov.uk/leisure-culture-and-local-heritage",
    icon: "palette",
  },
  {
    title: "Make a payment",
    body: "Pay social care and sundry invoices, penalty charges and licence fees",
    href: "https://www.essex.gov.uk/about-council/make-payment",
    icon: "card",
  },
];

export const CAMPAIGN = {
  title: "Clear the air about vaping. Get the facts",
  body: "Children are hearing more about vaping. But not all of it is true. If your child is between 10 and 12, now's the time to chat.",
  href: "https://cleartheair.org.uk",
  label: "Discover more",
  image: "/essex-home/clear-the-air.jpg",
  alt: "Two young children of school age on their phones with silhouettes of other children in the background and colourful graphics of vapes.",
};

export const NEWS = [
  {
    title: "Council Leader writes to PFCC over Henry Nowak case",
    body: "Read Councillor Peter Harris' letter to Roger Hirst, Police, Fire and Crime Commissioner for Essex.",
    date: "5 June 2026",
    href: "https://www.essex.gov.uk/news/2026/council-leader-writes-pfcc-over-henry-nowak-case",
    image: "/essex-home/essex-seaxes-red.jpg",
    alt: "The three seaxes of Essex in white against a red background.",
  },
  {
    title: "Council leadership to review all net zero operations",
    body: "The move was set out by Deputy Leader, Councillor Russell Quirk, at the Council's Annual General Meeting on Thursday 28 May.",
    date: "1 June 2026",
    href: "https://www.essex.gov.uk/news/2026/council-leadership-review-all-net-zero-operations",
    image: "/essex-home/essex-seaxes-red.jpg",
    alt: "The three seaxes of Essex in white against a red background.",
  },
  {
    title: "New £7.5m fund announced to tackle Pothole Emergency in Essex",
    body: "Fund will mean more crews and more machinery to repair the roads.",
    date: "29 May 2026",
    href: "https://www.essex.gov.uk/news/2026/new-ps75m-fund-announced-tackle-pothole-emergency-essex",
    image: "/essex-home/roadworker-asphalt.jpg",
    alt: "A roadworker pouring asphalt on a road.",
  },
];

export const NEWS_MORE = {
  label: "Read more news",
  href: "https://www.essex.gov.uk/node/250",
};

export const NEWSLETTER = {
  title: "Sign up to e-newsletters",
  body: "Get the latest news and information about your council services",
  href: "https://pages.news.essex.gov.uk/pages/subscribe",
  label: "Subscribe",
};

export const FOOTER_LINKS = [
  { label: "Contact us", href: "https://www.essex.gov.uk/contact-us" },
  { label: "Cookies", href: "https://www.essex.gov.uk/cookies" },
  { label: "Accessibility", href: "https://www.essex.gov.uk/about-essexgovuk/accessibility" },
  { label: "Privacy and data protection", href: "https://www.essex.gov.uk/about-essexgovuk/privacy-and-data-protection" },
  { label: "Modern slavery and human trafficking statement", href: "https://www.essex.gov.uk/business/modern-slavery-and-human-trafficking-statement" },
  { label: "Terms and conditions", href: "https://www.essex.gov.uk/about-essexgovuk/terms-and-conditions" },
];

export const SOCIAL_LINKS = [
  { label: "Facebook", href: "https://www.facebook.com/essexcountycouncil", icon: "facebook" },
  { label: "Twitter", href: "https://twitter.com/essex_cc", icon: "twitter" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/essex-county-council/", icon: "linkedin" },
  { label: "YouTube", href: "http://www.youtube.com/user/EssexCountyCouncil", icon: "youtube" },
];

export const FEEDBACK = {
  body: "BETA Help us improve this site by giving feedback",
  href: "https://www.essex.gov.uk/form/feedback-form?reference=1211",
};
