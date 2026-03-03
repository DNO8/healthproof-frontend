type RoleCardProps = {
  role: string;
  description: string;
  capabilities: string[];
};

export function RoleCard({ role, description, capabilities }: RoleCardProps) {
  return (
    <article className="neu-surface p-5">
      <h3 className="text-lg font-semibold text-slate-800">{role}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        {description}
      </p>

      <ul className="mt-4 space-y-2">
        {capabilities.map((capability) => (
          <li
            className="neu-inset rounded-xl px-3 py-2 text-sm font-medium text-slate-600"
            key={capability}
          >
            {capability}
          </li>
        ))}
      </ul>
    </article>
  );
}
