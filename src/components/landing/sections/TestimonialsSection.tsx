import { TESTIMONIALS } from "@/components/landing/constants";

export function TestimonialsSection() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {TESTIMONIALS.map((item) => (
        <article className="neu-surface p-6" key={item.author}>
          <p className="text-sm leading-relaxed text-slate-600">
            “{item.quote}”
          </p>
          <div className="mt-4 border-t border-slate-200/80 pt-3">
            <p className="text-sm font-semibold text-slate-700">
              {item.author}
            </p>
            <p className="text-xs text-slate-500">{item.role}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
