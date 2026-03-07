export function VatechLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 80"
      className={className}
      aria-label="Vatech"
    >
      <text
        x="0"
        y="62"
        fontFamily='"Exo 2", sans-serif'
        fontWeight="700"
        fontSize="72"
        fill="#CC1234"
        letterSpacing="-2"
      >
        vatech
      </text>
      {/* ® symbol */}
      <circle cx="207" cy="16" r="10" fill="none" stroke="#CC1234" strokeWidth="2.5" />
      <text
        x="207"
        y="20"
        fontFamily="sans-serif"
        fontWeight="700"
        fontSize="11"
        fill="#CC1234"
        textAnchor="middle"
      >
        R
      </text>
    </svg>
  );
}
