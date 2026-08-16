export function StatCard({
  label, value, delta, hint, spark,
}: {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  spark?: number[];
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <span className="text-sm text-fog">{label}</span>
        {delta && (
          <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">
            {delta}
          </span>
        )}
      </div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-fog">{hint}</div>}
      {spark && <Spark data={spark} />}
    </div>
  );
}

function Spark({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const pts = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((d - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-8 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#19e57f" />
          <stop offset="1" stopColor="#ff3d81" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke="url(#spark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
