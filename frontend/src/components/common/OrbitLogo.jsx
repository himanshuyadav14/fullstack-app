/**
 * Modern B2B SaaS Geometric Orbit Logo (Linear / Vercel Aesthetic)
 * Uses currentColor for seamless monochrome dark/light mode integration.
 */
const OrbitLogo = ({ className = "w-6 h-6", size }) => {
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
    >
      {/* Primary Orbital Ellipse Track */}
      <ellipse
        cx="16"
        cy="16"
        rx="13.2"
        ry="5.4"
        transform="rotate(-28 16 16)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Secondary Cross-Orbit Velocity Arc */}
      <ellipse
        cx="16"
        cy="16"
        rx="12.5"
        ry="5"
        transform="rotate(38 16 16)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="22 12"
        opacity="0.45"
      />

      {/* Central Gravitational Nucleus */}
      <circle cx="16" cy="16" r="3.2" fill="currentColor" />

      {/* Orbiting Satellite Node */}
      <circle cx="26.8" cy="10.2" r="1.8" fill="currentColor" />
    </svg>
  );
};

export default OrbitLogo;