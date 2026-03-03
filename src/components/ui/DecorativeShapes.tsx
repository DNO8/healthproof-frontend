import { cn } from "@/lib/utils";

type ShapeProps = {
  className?: string;
  color?: string;
  size?: number;
};

export function DecorativeCross({
  className,
  color = "#7DD3FC",
  size = 30,
}: ShapeProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0", className)}
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill={color} />
    </svg>
  );
}

export function DecorativeCircle({
  className,
  color = "#BFDBFE",
  size = 96,
}: ShapeProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0", className)}
      height={size}
      viewBox="0 0 100 100"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" fill={color} r="50" />
    </svg>
  );
}
