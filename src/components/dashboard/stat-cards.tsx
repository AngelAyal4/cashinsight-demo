import type { CSSProperties } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  className?: string;
  style?: CSSProperties;
}

export function StatCard({ label, value, className, style }: StatCardProps) {
  return (
    <div className={`card-brutal p-4 ${className ?? ''}`} style={style}>
      <p className="text-[0.7rem] font-bold uppercase tracking-wider text-ink/60">{label}</p>
      <p className="mt-2 text-2xl font-extrabold leading-none text-ink">{value}</p>
    </div>
  );
}

interface StatCardSkeletonProps {
  className?: string;
}

export function StatCardSkeleton({ className }: StatCardSkeletonProps) {
  return (
    <div className={`card-brutal p-4 ${className ?? ''}`}>
      <div className="h-3 w-24 animate-pulse rounded bg-ink/10" />
      <div className="mt-3 h-8 w-32 animate-pulse rounded bg-ink/10" />
    </div>
  );
}
