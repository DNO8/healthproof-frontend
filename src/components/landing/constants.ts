import type {
  Actor,
  DecorShape,
  IconVisualVariant,
  RoutePoint,
  SolutionFeature,
  TeamMember,
  UseCaseItem,
  WorkflowStep,
} from "./types";

export const ACTORS: Actor[] = [
  {
    name: "Medical Center",
    role: "Validates results",
    image: "/images/hero/medical-center.png",
    summary: "Checks permissions and authenticity before attending.",
  },
  {
    name: "Laboratory",
    role: "Emits evidence",
    image: "/images/hero/laboratory.png",
    summary: "Delivers clinical results ready for verification.",
  },
  {
    name: "Patient",
    role: "Sovereign control",
    image: "/images/hero/paciente-nene.png",
    summary: "You decide who accesses your information and for how long.",
  },
];

export const PRE_BLOCKCHAIN_ASSETS = [
  "/images/icons/pre-blockchain/clip.png",
  "/images/icons/pre-blockchain/docs.png",
  "/images/icons/pre-blockchain/docs2.png",
];

export const POST_BLOCKCHAIN_ASSETS = [
  "/images/icons/post-blockchain/avalanche.png",
  "/images/icons/post-blockchain/candado.png",
  "/images/icons/post-blockchain/security.png",
  "/images/icons/post-blockchain/verify.png",
];

export const HERO_CIRCLE_DECORS: DecorShape[] = [
  { className: "left-6 top-10", color: "#0EA5B7", size: 10 },
  { className: "left-10 top-16", color: "#38BDF8", size: 8 },
  { className: "left-16 top-11", color: "#0EA5B7", size: 7 },
  { className: "left-20 top-18", color: "#38BDF8", size: 12 },
  { className: "left-[18%] top-[13%]", color: "#BAE6FD", size: 28 },
  { className: "left-[9%] top-[32%]", color: "#D4EEF8", size: 22 },
  { className: "right-[14%] top-[18%]", color: "#C7EAF7", size: 18 },
  { className: "right-[10%] bottom-[16%]", color: "#BCE8F7", size: 48 },
  { className: "left-[6%] bottom-[12%]", color: "#B5E5F4", size: 128 },
];

export const HERO_CROSS_DECORS: DecorShape[] = [
  { className: "left-[29%] top-[14%]", color: "#6EC7D8", size: 18 },
  { className: "right-[12%] top-16", color: "#67C3D0", size: 34 },
  { className: "right-[24%] bottom-[18%]", color: "#A8DDED", size: 22 },
];

export const TRANSMISSION_SLOTS = Array.from(
  { length: 18 },
  (_, index) => index,
);

export const ICON_VISUAL_VARIANTS: IconVisualVariant[] = TRANSMISSION_SLOTS.map(
  (slot) => {
    const seed = slot * 37;

    return {
      size: 24 + (seed % 20),
      driftX: ((seed % 7) - 3) * 6,
      driftY: ((((seed / 2) | 0) % 7) - 3) * 4,
      baseScale: 0.82 + (seed % 9) * 0.02,
      alpha: 0.74 + (seed % 6) * 0.04,
    };
  },
);

export const INITIAL_FLOW_SEGMENT_DURATION = 2.6;
export const VERIFIED_FLOW_SPEED_MULTIPLIER = 1.5;
export const INITIAL_FLOW_ROTATION_DURATION = 1.8;

export const ACTOR_SCENE_TRANSFORMS: Record<string, string> = {
  "Medical Center":
    "translate(-20%, -50%) translate3d(calc(-1 * clamp(60px, 19vw, 240px)), clamp(40px, 12vw, 130px), clamp(14px, 10vw, 140px))",
  Laboratory:
    "translate(-15%, -10%) translate3d(-10px, calc(-1 * clamp(60px, 16vw, 170px)), calc(-1 * clamp(60px, 18vw, 210px)))",
  Patient:
    "translate(20%, -50%) translate3d(clamp(60px, 19vw, 240px), clamp(40px, 12vw, 130px), clamp(44px, 10vw, 140px))",
};

export const ASSET_ROUTE_POINTS: {
  mobile: { top: RoutePoint; left: RoutePoint; right: RoutePoint };
  desktop: { top: RoutePoint; left: RoutePoint; right: RoutePoint };
} = {
  mobile: {
    top: { x: 0, y: -74 },
    left: { x: -142, y: 50 },
    right: { x: 108, y: 46 },
  },
  desktop: {
    top: { x: 0, y: -112 },
    left: { x: -236, y: 76 },
    right: { x: 176, y: 64 },
  },
};

export const ACTOR_LABEL_POSITIONS: Record<string, { className: string }> = {
  "Medical Center": {
    className: "left-[2%] bottom-[30%] sm:left-[12%] sm:bottom-[28%]",
  },
  Laboratory: {
    className: "left-1/2 -translate-x-1/2 top-[2%] sm:top-[15%]",
  },
  Patient: {
    className:
      "right-[2%] bottom-[30%] text-right sm:right-[16%] sm:bottom-[28%]",
  },
};

export const ACTOR_PAIN_ROLES: Record<string, string> = {
  "Medical Center": "Bureaucracy and slow validation",
  Laboratory: "Results across scattered channels",
  Patient: "Little control over their history",
};

// §1 Hero — Pain bullets
export const HERO_PAIN_BULLETS: string[] = [
  "Exchange clinical data across institutions",
  "Guarantee document integrity",
  "Maintain traceability of medical records",
  "Record patient consent",
  "Assume legal responsibility for data leaks or document manipulation",
];

// §2 The Solution — what HealthProof enables
export const SOLUTION_FEATURES: SolutionFeature[] = [
  { label: "Verifiable medical orders" },
  { label: "Tamper-proof laboratory results" },
  { label: "Traceable prescriptions" },
  { label: "Patient-controlled data access" },
  { label: "Interoperability between institutions" },
];

// §3 Regulatory urgency — drivers
export const REGULATORY_DRIVERS: string[] = [
  "Interoperability regulations",
  "Digital health infrastructure",
  "AI-assisted clinical decision systems",
  "New global data standards",
];

export const RISK_EXAMPLES: string[] = [
  "a diagnosis",
  "a prescription",
  "a payment",
  "a clinical decision",
];

// §4 Use Cases
export const USE_CASES: UseCaseItem[] = [
  {
    title: "Medical Centers",
    description:
      "Doctors issue medical orders that are cryptographically registered and traceable. When patients move across institutions, the document travels with proof of authenticity.",
    benefits: [
      "Eliminate manual validation",
      "Reduce administrative overhead",
      "Enable interoperability with laboratories",
    ],
  },
  {
    title: "Laboratories",
    description:
      "Laboratories receive verifiable orders and attach test results directly to the original request. Every update is timestamped and auditable.",
    benefits: [
      "Reduce fraud and document disputes",
      "Faster verification by physicians",
      "Secure exchange with hospitals",
    ],
  },
  {
    title: "Patients",
    description:
      "Patients control access to their medical documents. They approve which institution can read or update their exams.",
    benefits: [
      "Portability across healthcare providers",
      "Privacy by design",
      "Secure long-term medical record integrity",
    ],
  },
];

// §5 How it works — workflow steps
export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    step: 1,
    title: "Medical order issued",
    description:
      "A doctor creates a medical test order inside their system. A cryptographic hash of the document is registered on blockchain.",
    image: "/images/storyboard/healthproof1.jpeg",
  },
  {
    step: 2,
    title: "Patient authorizes laboratory access",
    description:
      "The patient grants the laboratory permission to view the order. Authorization can occur via QR code or one-click approval.",
    image: "/images/storyboard/healthproof2.jpeg",
  },
  {
    step: 3,
    title: "Laboratory performs the test",
    description:
      "The laboratory updates the exam status and uploads the results. The new document is linked to the original order.",
    image: "/images/storyboard/issue2.jpeg",
  },
  {
    step: 4,
    title: "Doctor verifies results",
    description:
      "The patient returns to the medical center. The doctor verifies the results instantly through HealthProof.",
    image: "/images/storyboard/issue1.jpeg",
  },
];

// §6 Technology — blockchain guarantees
export const TECH_GUARANTEES: string[] = [
  "Document authenticity",
  "Tamper resistance",
  "Time-stamped traceability",
  "Verifiable issuer identity",
];

export const TECH_ENSURES: string[] = [
  "Privacy compliance",
  "Regulatory compatibility",
  "Secure interoperability",
];

// §7 ICD-11
export const ICD11_FEATURES: string[] = [
  "Fully digital disease classification",
  "Over 17,000 diagnostic codes",
  "More than 120,000 codifiable terms",
  "Standardized interoperability frameworks",
];

// §8 Before / After
export const BEFORE_HEALTHPROOF: string[] = [
  "PDFs sent by email",
  "Manual validation",
  "Disconnected systems",
  "No document authenticity",
  "Patients locked into institutions",
];

export const AFTER_HEALTHPROOF: string[] = [
  "Verifiable clinical documents",
  "Instant authenticity checks",
  "Interoperable institutions",
  "Patient-controlled permissions",
  "Traceable clinical workflows",
];

// §9 Final CTA bullets
export const FINAL_CTA_BULLETS: string[] = [
  "Where clinical documents originated",
  "Whether they were altered",
  "Who accessed them",
  "When they were issued",
];

// §10 Team
export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Catalina Orellana",
    role: "CEO",
    photo: "/images/team/catalina_orellana.png",
    icons: ["/images/icons/herdao-icon.png"],
    linkedin: "https://www.linkedin.com/in/catalina-orellana-riveros/",
  },
  {
    name: "Pablo Guzmán",
    role: "CTO",
    photo: "/images/team/pablo_guzman.png",
    icons: ["/images/icons/team-one-icon.png", "/images/icons/pablo-icon.png"],
    linkedin: "https://www.linkedin.com/in/pablo-guzman-sanchez/",
  },
  {
    name: "Danilo Contreras",
    role: "CPO",
    photo: "/images/team/danilo_contreras.png",
    icons: ["/images/icons/ronin-icon.png", "/images/icons/stellar-icon.png"],
    linkedin: "https://www.linkedin.com/in/danilo-contreras-05597922b/",
  },
  {
    name: "Andrés Peña",
    role: "CMO",
    photo: "/images/team/andres_peña.png",
    icons: [
      "/images/icons/andres-icon.png",
      "/images/icons/chatterpay-icon.png",
    ],
    linkedin: "https://www.linkedin.com/in/andresanemic/",
  },
];

export const buildDomePoints = () => {
  const points: Array<{ left: number; top: number; size: number }> = [];

  const cols = 14;
  const rows = 10;

  for (let row = 0; row < rows; row++) {
    const rowProgress = row / (rows - 1);
    const top = Math.round((8 + rowProgress * 82) * 100) / 100;

    for (let col = 0; col < cols; col++) {
      const colProgress = col / (cols - 1);
      const left = Math.round((6 + colProgress * 88) * 100) / 100;
      const size = (row + col) % 4 === 0 ? 5 : (row + col) % 3 === 0 ? 4 : 3;

      points.push({ left, top, size });
    }
  }

  return points;
};
