/**
 * Reusable OrbitHQ SVG Logo Component
 */
const OrbitLogo = ({ className = "w-6 h-6", size }) => {
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      style={style}
    >
      <defs>
        <radialGradient id="orbitCoreComp" cx="50%" cy="50%" r="50%" fx="35%" fy="35%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="70%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </radialGradient>

        <linearGradient id="orbitRingComp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>

        <filter id="orbitGlowComp" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Orbit Ellipse (Back arc) */}
      <ellipse
        cx="18"
        cy="18"
        rx="15"
        ry="6.5"
        transform="rotate(-28 18 18)"
        stroke="url(#orbitRingComp)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="72 24"
        opacity="0.85"
      />

      {/* Central Planet Core */}
      <circle cx="18" cy="18" r="7.5" fill="url(#orbitCoreComp)" filter="url(#orbitGlowComp)" />

      {/* Inner Core Highlight */}
      <circle cx="16" cy="16" r="2.2" fill="#93c5fd" opacity="0.6" />

      {/* Outer Orbit Ellipse (Front crossing arc) */}
      <ellipse
        cx="18"
        cy="18"
        rx="15"
        ry="6.5"
        transform="rotate(-28 18 18)"
        stroke="url(#orbitRingComp)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="32 64"
        strokeDashoffset="36"
      />

      {/* Orbiting Satellite Node */}
      <circle cx="29" cy="12" r="2.2" fill="#38bdf8" filter="url(#orbitGlowComp)" />
      <circle cx="29" cy="12" r="1.2" fill="#ffffff" />
    </svg>
  );
};

export default OrbitLogo;
