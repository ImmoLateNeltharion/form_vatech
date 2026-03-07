export function AnimatedCheck() {
  return (
    <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
      {/* Glow rings */}
      <div
        className="absolute inset-0 rounded-full bg-green-400/30"
        style={{ animation: "glowPulse 2.2s ease-out 1s infinite" }}
      />
      <div
        className="absolute inset-3 rounded-full bg-green-400/20"
        style={{ animation: "glowPulse 2.2s ease-out 1.4s infinite" }}
      />

      {/* SVG: circle draws, then checkmark draws */}
      <svg
        width="128"
        height="128"
        viewBox="0 0 128 128"
        fill="none"
        className="relative z-10"
      >
        {/* Background fill */}
        <circle cx="64" cy="64" r="56" fill="#f0fdf4" />

        {/* Animated ring */}
        <circle
          cx="64"
          cy="64"
          r="56"
          stroke="#4ade80"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          style={{
            strokeDasharray: 352,
            strokeDashoffset: 352,
            transformOrigin: "64px 64px",
            transform: "rotate(-90deg)",
            animation: "drawRing 0.75s cubic-bezier(0.65, 0, 0.35, 1) 0.1s forwards",
          }}
        />

        {/* Checkmark */}
        <path
          d="M36 66L54 84L92 42"
          stroke="#16a34a"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 90,
            strokeDashoffset: 90,
            animation: "drawCheck 0.45s cubic-bezier(0.65, 0, 0.35, 1) 0.8s forwards",
          }}
        />
      </svg>
    </div>
  );
}
