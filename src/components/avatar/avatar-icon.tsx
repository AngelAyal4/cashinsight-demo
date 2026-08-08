import type { JSX } from 'react';
import type { AvatarId } from '@/types';

interface AvatarIconProps {
  id: AvatarId;
  className?: string;
}

const ink = '#111111';
const skin = '#f6d9b3';

function Eyes({ x1 = 36, x2 = 64, y = 56 }: { x1?: number; x2?: number; y?: number }): JSX.Element {
  return (
    <>
      <circle cx={x1} cy={y} r="4.5" fill={ink} />
      <circle cx={x2} cy={y} r="4.5" fill={ink} />
    </>
  );
}

function Smile({ d = 'M40 70 Q50 78 60 70' }: { d?: string }): JSX.Element {
  return (
    <path
      d={d}
      fill="none"
      stroke={ink}
      strokeWidth="3"
      strokeLinecap="round"
    />
  );
}

function Brows(): JSX.Element {
  return (
    <>
      <path d="M28 48 Q35 44 43 47" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M57 47 Q65 44 72 48" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Glasses(): JSX.Element {
  return (
    <>
      <rect x="27" y="50" width="17" height="13" fill="none" stroke={ink} strokeWidth="3" rx="2" />
      <rect x="56" y="50" width="17" height="13" fill="none" stroke={ink} strokeWidth="3" rx="2" />
      <path d="M44 56 H56" stroke={ink} strokeWidth="3" />
    </>
  );
}

function Earring(): JSX.Element {
  return (
    <>
      <circle cx="16" cy="64" r="3" fill="none" stroke={ink} strokeWidth="2.5" />
      <circle cx="84" cy="64" r="3" fill="none" stroke={ink} strokeWidth="2.5" />
    </>
  );
}

const hair: Record<AvatarId, JSX.Element> = {
  bruno: (
    <path
      d="M18 62 Q18 26 50 26 Q82 26 82 62 L82 55 Q80 34 66 30 Q64 18 50 22 Q36 18 34 30 Q20 34 18 55 Z"
      fill={ink}
    />
  ),
  mateo: (
    <>
      <circle cx="34" cy="26" r="11" fill={ink} />
      <circle cx="50" cy="20" r="12" fill={ink} />
      <circle cx="66" cy="26" r="11" fill={ink} />
      <circle cx="22" cy="36" r="8" fill={ink} />
      <circle cx="78" cy="36" r="8" fill={ink} />
      <path
        d="M24 64 Q24 78 36 80 Q46 84 50 84 Q54 84 64 80 Q76 78 76 64 Q76 70 64 76 L36 76 Q24 70 24 64 Z"
        fill={ink}
      />
    </>
  ),
  lucía: (
    <>
      <path
        d="M16 64 Q16 28 50 28 Q84 28 84 64 L84 92 L74 92 L74 42 L26 42 L26 92 L16 92 Z"
        fill={ink}
      />
      <path
        d="M22 36 Q28 30 50 30 Q72 30 78 36 L78 32 Q74 24 50 24 Q26 24 22 32 Z"
        fill={ink}
      />
    </>
  ),
  clara: (
    <>
      <circle cx="50" cy="24" r="13" fill={ink} />
      <path
        d="M30 26 Q22 34 22 46 L22 88 L32 88 L32 44 Q36 34 50 34 Q64 34 68 44 L68 88 L78 88 L78 46 Q78 34 70 26 Z"
        fill={ink}
      />
    </>
  ),
  ren: (
    <>
      <path
        d="M22 60 Q22 26 50 26 Q78 26 78 60 L78 52 Q76 30 64 28 Q62 14 50 18 Q38 14 36 28 Q24 30 22 52 Z"
        fill={ink}
      />
      <Earring />
    </>
  ),
  max: (
    <>
      <path
        d="M20 58 Q20 24 50 24 Q80 24 80 58 L80 56 Q78 38 66 32 Q62 22 50 26 Q38 22 34 32 Q22 38 20 56 Z"
        fill={ink}
      />
      <Earring />
    </>
  ),
};

const features: Record<AvatarId, JSX.Element> = {
  bruno: (
    <>
      <Brows />
      <Eyes />
      <Smile />
    </>
  ),
  mateo: (
    <>
      <Eyes x1={36} x2={64} y={56} />
      <Smile d="M40 70 Q50 76 60 70" />
    </>
  ),
  lucía: (
    <>
      <Eyes x1={36} x2={64} y={54} />
      <Smile d="M40 68 Q50 76 60 68" />
      <path d="M40 66 Q50 62 60 66" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  clara: (
    <>
      <Eyes x1={36} x2={64} y={54} />
      <Smile d="M40 70 Q50 76 60 70" />
      <Earring />
    </>
  ),
  ren: (
    <>
      <Glasses />
      <Eyes x1={36} x2={64} y={56} />
      <Smile d="M42 70 Q50 76 58 70" />
    </>
  ),
  max: (
    <>
      <Brows />
      <Eyes x1={36} x2={64} y={54} />
      <Smile d="M40 72 Q50 78 60 72" />
    </>
  ),
};

const backgrounds: Record<AvatarId, string> = {
  bruno: '#a3e635',
  mateo: '#7c3aed',
  lucía: '#fbbf24',
  clara: '#fb7185',
  ren: '#38bdf8',
  max: '#f472b6',
};

const labels: Record<AvatarId, string> = {
  bruno: 'Bruno',
  mateo: 'Mateo',
  lucía: 'Lucía',
  clara: 'Clara',
  ren: 'Ren',
  max: 'Max',
};

export function AvatarIcon({ id, className }: AvatarIconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={labels[id]}
    >
      <circle cx="50" cy="50" r="48" fill={backgrounds[id]} stroke={ink} strokeWidth="4" />
      <ellipse cx="50" cy="62" rx="32" ry="30" fill={skin} stroke={ink} strokeWidth="4" />
      {hair[id]}
      {features[id]}
    </svg>
  );
}

export const avatarIds: AvatarId[] = ['bruno', 'mateo', 'lucía', 'clara', 'ren', 'max'];

export function AvatarLabel({ id }: { id: AvatarId }): string {
  return labels[id];
}
