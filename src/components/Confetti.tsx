const PIECES = [
  { l:  4, c: "#CC1234", s: 10, round: false, d: 0.00, t: 1.15 },
  { l: 11, c: "#f59e0b", s:  7, round: true,  d: 0.10, t: 0.95 },
  { l: 18, c: "#3b82f6", s:  9, round: false, d: 0.18, t: 1.25 },
  { l: 26, c: "#10b981", s:  6, round: true,  d: 0.06, t: 1.00 },
  { l: 33, c: "#8b5cf6", s:  8, round: false, d: 0.22, t: 1.10 },
  { l: 40, c: "#ec4899", s:  7, round: true,  d: 0.14, t: 0.90 },
  { l: 47, c: "#CC1234", s: 11, round: false, d: 0.03, t: 1.05 },
  { l: 54, c: "#f59e0b", s:  6, round: true,  d: 0.20, t: 1.15 },
  { l: 61, c: "#3b82f6", s:  9, round: false, d: 0.11, t: 0.92 },
  { l: 68, c: "#10b981", s:  8, round: true,  d: 0.27, t: 1.20 },
  { l: 75, c: "#8b5cf6", s:  7, round: false, d: 0.08, t: 1.00 },
  { l: 82, c: "#ec4899", s:  9, round: true,  d: 0.24, t: 1.18 },
  { l: 89, c: "#CC1234", s:  6, round: false, d: 0.16, t: 0.88 },
  { l: 96, c: "#f59e0b", s: 10, round: true,  d: 0.32, t: 1.10 },
  // second wave for density
  { l:  8, c: "#10b981", s:  5, round: true,  d: 0.35, t: 0.85 },
  { l: 22, c: "#CC1234", s:  8, round: false, d: 0.30, t: 1.05 },
  { l: 44, c: "#f59e0b", s:  6, round: true,  d: 0.19, t: 0.95 },
  { l: 58, c: "#3b82f6", s:  9, round: false, d: 0.09, t: 1.15 },
  { l: 72, c: "#8b5cf6", s:  6, round: true,  d: 0.26, t: 0.90 },
  { l: 93, c: "#ec4899", s:  8, round: false, d: 0.42, t: 1.08 },
] as const;

export function Confetti() {
  return (
    <div className="absolute inset-x-0 top-0 h-72 overflow-hidden pointer-events-none z-0">
      {PIECES.map((p, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${p.l}%`,
            top: "25%",
            width: p.s,
            height: p.s,
            backgroundColor: p.c,
            borderRadius: p.round ? "50%" : "2px",
            animation: `confettiFall ${p.t}s ${p.d}s ease-in forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
