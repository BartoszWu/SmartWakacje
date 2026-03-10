import { useStore } from "../store/useStore";

export function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isLight ? "Tryb ciemny" : "Tryb jasny"}
      aria-label={isLight ? "Tryb ciemny" : "Tryb jasny"}
      className="relative w-14 h-7 rounded-full border border-sand/15 transition-all duration-300 hover:border-sand/30 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none group"
      style={{
        background: isLight
          ? "linear-gradient(135deg, #87ceeb 0%, #e0f0ff 100%)"
          : "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      }}
    >
      {/* Track decorations */}
      {!isLight && (
        <>
          <span className="absolute top-1.5 left-2 w-0.5 h-0.5 rounded-full bg-white/50" />
          <span className="absolute top-3.5 left-3.5 w-[3px] h-[3px] rounded-full bg-white/30" />
          <span className="absolute bottom-1.5 left-1.5 w-0.5 h-0.5 rounded-full bg-white/40" />
        </>
      )}
      {isLight && (
        <>
          <span className="absolute top-2 right-3 w-1.5 h-1 rounded-full bg-white/60" />
          <span className="absolute bottom-2 right-2 w-2 h-1 rounded-full bg-white/40" />
        </>
      )}

      {/* Knob */}
      <span
        className="absolute top-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{
          left: isLight ? "calc(100% - 26px)" : "2px",
          background: isLight ? "#fbbf24" : "#c4b5a0",
          boxShadow: isLight
            ? "0 0 8px rgba(251,191,36,0.5), 0 1px 3px rgba(0,0,0,0.1)"
            : "0 0 6px rgba(196,181,160,0.3), 0 1px 3px rgba(0,0,0,0.3)",
        }}
      >
        {isLight ? (
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
            <circle cx="12" cy="12" r="4" fill="#92400e" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line
                key={angle}
                x1="12"
                y1="3"
                x2="12"
                y2="5.5"
                stroke="#92400e"
                strokeWidth="1.5"
                strokeLinecap="round"
                transform={`rotate(${angle} 12 12)`}
              />
            ))}
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
            <path
              d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
              fill="#3d3529"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
