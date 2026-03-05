export type Actor = {
  name: string;
  role: string;
  image: string;
  summary: string;
};

export type StoryChapter = {
  chapter: string;
  title: string;
  body: string;
  image: string;
  miniCta: string;
};

export type MetricItem = {
  value: string;
  label: string;
  note: string;
};

export type TestimonialItem = {
  quote: string;
  author: string;
  role: string;
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
