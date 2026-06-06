// Original SVG illustrations for the portal — hand-built flat vector scenes.
// Nothing here is derived from any third-party site's photography or artwork.
// White / translucent line-work designed to sit over the gradient panels.

import type { ReactNode } from "react";

const wrap = (children: ReactNode) => (
  <svg viewBox="0 0 400 250" className="scene" role="img" preserveAspectRatio="xMidYMid slice">
    {children}
  </svg>
);

const W = "rgba(255,255,255,0.92)";
const F = "rgba(255,255,255,0.16)";
const F2 = "rgba(255,255,255,0.28)";

/* Model / triage — a scoring dashboard with bars and a rising trend line */
export function TriageScene() {
  return wrap(
    <>
      <rect x="48" y="40" width="304" height="170" rx="16" fill={F} stroke={F2} />
      <rect x="68" y="60" width="120" height="12" rx="6" fill={W} opacity="0.8" />
      <rect x="68" y="84" width="80" height="9" rx="4.5" fill={W} opacity="0.45" />
      {[
        [80, 150],
        [116, 120],
        [152, 168],
        [188, 100],
      ].map(([x, h], i) => (
        <rect key={i} x={x} y={190 - (h - 80)} width="22" height={h - 80} rx="5" fill={W} opacity={0.5 + i * 0.12} />
      ))}
      <polyline
        points="230,150 258,128 286,138 314,96"
        fill="none"
        stroke="#ffce6b"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[
        [230, 150],
        [258, 128],
        [286, 138],
        [314, 96],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4.5" fill="#ffce6b" />
      ))}
    </>,
  );
}

/* Responsible AI — balanced scales over cohort bars */
export function FairnessScene() {
  return wrap(
    <>
      <line x1="200" y1="46" x2="200" y2="92" stroke={W} strokeWidth="4" strokeLinecap="round" />
      <circle cx="200" cy="44" r="7" fill={W} />
      <line x1="120" y1="92" x2="280" y2="92" stroke={W} strokeWidth="4" strokeLinecap="round" />
      <path d="M120 92 L102 132 H138 Z" fill={F} stroke={F2} />
      <path d="M280 92 L262 132 H298 Z" fill={F} stroke={F2} />
      <line x1="120" y1="92" x2="120" y2="74" stroke={W} strokeWidth="3" />
      <line x1="280" y1="92" x2="280" y2="74" stroke={W} strokeWidth="3" />
      {[
        [96, 0.5],
        [140, 0.7],
        [184, 0.55],
        [228, 0.75],
        [272, 0.6],
      ].map(([x, o], i) => (
        <rect key={i} x={x} y={210 - (40 + i * 6)} width="26" height={40 + i * 6} rx="5" fill={W} opacity={o} />
      ))}
      <line x1="80" y1="210" x2="320" y2="210" stroke={W} strokeWidth="2" opacity="0.5" />
    </>,
  );
}

/* Oversight — people with an approval shield */
export function OversightScene() {
  const person = (x: number, o: number) => (
    <g opacity={o}>
      <circle cx={x} cy="120" r="18" fill={W} />
      <path d={`M${x - 28} 196 a28 30 0 0 1 56 0 Z`} fill={F2} stroke={W} strokeWidth="2" />
    </g>
  );
  return wrap(
    <>
      {person(120, 0.55)}
      {person(280, 0.55)}
      {person(200, 0.95)}
      <g transform="translate(248,150)">
        <path d="M0 0 L40 0 L40 26 a20 22 0 0 1 -20 22 a20 22 0 0 1 -20 -22 Z" fill="#6be0b8" />
        <path d="M11 24 L18 31 L31 16" fill="none" stroke="#0c2b30" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </>,
  );
}

/* Speed — a queue with one urgent item lifted to the top */
export function SpeedScene() {
  return wrap(
    <>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x="120" y={120 + i * 30} width="200" height="22" rx="7" fill={W} opacity={0.32 - i * 0.05} />
      ))}
      <rect x="96" y="64" width="224" height="34" rx="10" fill="#ff6b5e" />
      <circle cx="116" cy="81" r="8" fill="#fff" />
      <rect x="134" y="74" width="120" height="7" rx="3.5" fill="#fff" opacity="0.95" />
      <rect x="134" y="86" width="70" height="6" rx="3" fill="#fff" opacity="0.6" />
      <path d="M300 150 L300 104 M300 104 L288 118 M300 104 L312 118" stroke="#ffce6b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>,
  );
}

/* Explainability — a document with reason codes highlighted */
export function ExplainScene() {
  return wrap(
    <>
      <rect x="118" y="44" width="164" height="200" rx="14" fill={F} stroke={F2} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x="138" y={68 + i * 16} width={124 - i * 22} height="8" rx="4" fill={W} opacity="0.5" />
      ))}
      <rect x="138" y="130" width="124" height="34" rx="8" fill="#ffce6b" opacity="0.9" />
      <circle cx="156" cy="147" r="7" fill="#0c2b30" />
      <rect x="172" y="143" width="78" height="8" rx="4" fill="#0c2b30" opacity="0.85" />
      {[0, 1].map((i) => (
        <rect key={i} x="138" y={180 + i * 16} width={120 - i * 30} height="8" rx="4" fill={W} opacity="0.4" />
      ))}
    </>,
  );
}

export const TILE_SCENES: Record<string, () => ReactNode> = {
  activity: TriageScene,
  shield: FairnessScene,
  users: OversightScene,
};

export const FEATURE_SCENES = [SpeedScene, ExplainScene];
