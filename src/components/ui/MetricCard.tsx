import { Card } from "@/components/ui/Card";

type MetricCardProps = {
  label: string;
  value: string;
  status?: "neutral" | "success";
};

export function MetricCard({
  label,
  value,
  status = "neutral",
}: MetricCardProps) {
  return (
    <Card
      className="min-h-[132px]"
      description={
        status === "success" ? "Estado verificado" : "Estado pendiente"
      }
      title={label}
    >
      <p
        className={
          status === "success"
            ? "text-3xl font-semibold text-emerald-700"
            : "text-3xl font-semibold text-slate-700"
        }
      >
        {value}
      </p>
    </Card>
  );
}
