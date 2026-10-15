export default function Panel({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border border-bg-4 bg-bg-1 p-5 ${className}`}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-medium text-foreground">{title}</h2>
        {hint && <p className="mt-1 text-xs text-gray-1">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
