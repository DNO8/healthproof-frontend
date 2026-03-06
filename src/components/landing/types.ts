export type Actor = {
  name: string;
  role: string;
  image: string;
  summary: string;
};

export type DecorShape = {
  className: string;
  color: string;
  size: number;
};

export type RoutePoint = {
  x: number;
  y: number;
};

export type IconVisualVariant = {
  size: number;
  driftX: number;
  driftY: number;
  baseScale: number;
  alpha: number;
};

export type SolutionFeature = {
  label: string;
};

export type UseCaseItem = {
  title: string;
  description: string;
  benefits: string[];
};

export type WorkflowStep = {
  step: number;
  title: string;
  description: string;
  image: string;
};

export type TeamMember = {
  name: string;
  role: string;
  photo: string;
  icons: string[];
  linkedin: string;
};
