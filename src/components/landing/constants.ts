import type {
  Actor,
  DecorShape,
  IconVisualVariant,
  MetricItem,
  RoutePoint,
  SolutionFeature,
  StoryChapter,
  TeamMember,
  TestimonialItem,
  UseCaseItem,
  WorkflowStep,
} from "./types";

export const ACTORS: Actor[] = [
  {
    name: "Centro Médico",
    role: "Valida resultados",
    image: "/images/hero/medical-center.png",
    summary: "Comprueba permisos y autenticidad antes de atender.",
  },
  {
    name: "Laboratorio",
    role: "Emite evidencia",
    image: "/images/hero/laboratory.png",
    summary: "Entrega resultados clínicos listos para verificación.",
  },
  {
    name: "Paciente",
    role: "Control soberano",
    image: "/images/hero/paciente-nene.png",
    summary: "Decide quién accede a su información y por cuánto tiempo.",
  },
];

export const BASELINE_PAIN_METRICS: MetricItem[] = [
  {
    value: "Excesivo",
    label: "Papeleo clínico",
    note: "Demasiados documentos manuales por validación",
  },
  {
    value: "Lenta",
    label: "Burocracia operativa",
    note: "Autorizaciones y revisión con tiempos extendidos",
  },
  {
    value: "Frecuente",
    label: "Retrabajo médico",
    note: "Se repiten procesos por evidencia no confiable",
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

export const PRE_LABELS = ["Documentos", "Imágenes", "Carpetas compartidas"];

export const POST_LABELS = [
  "Registro Avalanche",
  "Permisos cifrados",
  "Evidencia segura",
  "Verificación instantánea",
];

export const TRUST_METRICS: MetricItem[] = [
  {
    value: "99.97%",
    label: "Integridad verificable",
    note: "Auditoría criptográfica de evidencias clínicas",
  },
  {
    value: "< 2 min",
    label: "Validación de documentos",
    note: "Desde emisión de laboratorio hasta consulta médica",
  },
  {
    value: "+42%",
    label: "Reducción de retrabajo",
    note: "Menos reprocesos por archivos no confiables",
  },
];

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    chapter: "Capítulo 1 — El problema",
    title: "Burocracia y validación lenta",
    body: "El paciente visita al médico, quien emite una orden en papel. Luego va al laboratorio donde la receta se valida manualmente. Los resultados llegan por email, papel o portal web. Cada paso depende de confianza implícita y procesos manuales que retrasan la atención.",
    image: "/images/storyboard/issue1.jpeg",
    miniCta: "Proceso manual y lento",
  },
  {
    chapter: "Capítulo 2 — El problema",
    title: "Resultados dispersos sin interoperabilidad",
    body: "Centros médicos y laboratorios operan en silos. Los datos clínicos están fragmentados entre instituciones que no se comunican entre sí. El paciente se convierte en mensajero de sus propios documentos, transportándolos físicamente entre proveedores.",
    image: "/images/storyboard/issue2.jpeg",
    miniCta: "Datos fragmentados",
  },
  {
    chapter: "Capítulo 3 — El problema",
    title: "Sin control sobre tu historial clínico",
    body: "Las plataformas centralizadas almacenan registros en entornos cerrados. El paciente depende de la institución que guarda sus datos, sin portabilidad ni soberanía. Los sistemas actuales almacenan datos, pero no prueban su veracidad.",
    image: "/images/storyboard/issue3.jpeg",
    miniCta: "Paciente sin soberanía",
  },
  {
    chapter: "Capítulo 4 — La solución",
    title: "Autenticidad criptográfica verificable",
    body: "HealthProof registra un hash criptográfico de cada documento clínico en blockchain Layer 1. Cada orden médica, resultado de laboratorio y prescripción genera una prueba inmutable con marca de tiempo. La evidencia es verificable por cualquier actor autorizado, sin intermediarios.",
    image: "/images/storyboard/healthproof1.jpeg",
    miniCta: "Verificación on-chain",
  },
  {
    chapter: "Capítulo 5 — La solución",
    title: "Control de permisos por el paciente",
    body: "El paciente no comparte datos — comparte permisos. Autoriza al centro médico a emitir órdenes, al laboratorio a acceder y subir resultados, y al doctor a interpretar. Todo mediante un código QR o autorización en un clic. Trazabilidad completa, control total.",
    image: "/images/storyboard/healthproof2.jpeg",
    miniCta: "Permisos granulares",
  },
];

export const TESTIMONIALS: TestimonialItem[] = [
  {
    quote:
      "Pasamos de validar documentos manualmente a verificar evidencia clínica en segundos.",
    author: "Dra. Camila Torres",
    role: "Dirección Médica, Red Vital",
  },
  {
    quote:
      "Ahora cada resultado de laboratorio viaja con trazabilidad, sin romper la experiencia clínica.",
    author: "Tomás Herrera",
    role: "CTO, Lab Nova",
  },
  {
    quote:
      "El paciente mantiene control y nosotros reducimos riesgo operativo con evidencia auditable.",
    author: "Marta Quiroga",
    role: "Gerencia de Operaciones, MediTrust",
  },
];

export const PARTNER_SIGNALS = [
  "Hospital Networks",
  "Clinical Labs",
  "Insurance Providers",
  "Digital Health",
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

export const STORY_CIRCLE_DECORS: DecorShape[] = [
  { className: "left-7 top-24", color: "#D8EEF9", size: 18 },
  { className: "right-8 top-10", color: "#C9EBF8", size: 34 },
  { className: "left-[42%] bottom-8", color: "#BDE5F5", size: 14 },
  { className: "right-6 bottom-6", color: "#C9EBF8", size: 104 },
];

export const STORY_CROSS_DECORS: DecorShape[] = [
  { className: "left-7 top-7", color: "#74C9D8", size: 24 },
  { className: "right-[34%] top-[21%]", color: "#9EDBE9", size: 20 },
  { className: "left-[12%] bottom-[17%]", color: "#8ED2E2", size: 16 },
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
  "Centro Médico":
    "translate(-20%, -50%) translate3d(calc(-1 * clamp(60px, 19vw, 240px)), clamp(40px, 12vw, 130px), clamp(14px, 10vw, 140px))",
  Laboratorio:
    "translate(-15%, -10%) translate3d(-10px, calc(-1 * clamp(60px, 16vw, 170px)), calc(-1 * clamp(60px, 18vw, 210px)))",
  Paciente:
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
  "Centro Médico": {
    className: "left-[2%] bottom-[30%] sm:left-[12%] sm:bottom-[28%]",
  },
  Laboratorio: {
    className: "left-1/2 -translate-x-1/2 top-[2%] sm:top-[15%]",
  },
  Paciente: {
    className:
      "right-[2%] bottom-[30%] text-right sm:right-[16%] sm:bottom-[28%]",
  },
};

export const ACTOR_PAIN_ROLES: Record<string, string> = {
  "Centro Médico": "Burocracia y validación lenta",
  Laboratorio: "Resultados en canales dispersos",
  Paciente: "Poco control sobre su historial",
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
  "Integrated APIs and digital tooling",
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
