/**
 * Modern B2B SaaS Geometric Orbit Logo (Linear / Vercel Aesthetic)
 * Features dynamic depth with contrasting thick (foreground) and thin (background) continuous lines.
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
      {/* Secondary Background Orbit (Thin, delicate, continuous line for 3D depth) */}
      <ellipse
        cx="18"
        cy="18"
        rx="13.8"
        ry="5.4"
        transform="rotate(34 18 18)"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Primary Foreground Orbit (Bold, prominent, continuous line) */}
      <ellipse
        cx="18"
        cy="18"
        rx="14.2"
        ry="5.6"
        transform="rotate(-26 18 18)"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="1"
      />

      {/* Central Core Gravitational Nucleus */}
      <circle cx="18" cy="18" r="3.6" fill="currentColor" />

      {/* Orbiting Satellite Node on Primary Track */}
      <circle cx="30.6" cy="11.8" r="2.2" fill="currentColor" />
    </svg>
  );
};

export default OrbitLogo;