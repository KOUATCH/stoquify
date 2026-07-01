import { cn } from "@/lib/utils";

type StoquifyLogoProps = {
  theme?: "light" | "dark";
  className?: string;
  width?: number;
  height?: number;
  tagline?: string;
  compact?: boolean;
};

const palette = {
  light: {
    markBackground: "#132028",
    markText: "#f7faf8",
    text: "#132028",
    muted: "#53675f",
    accent: "#178e83",
    glow: "rgba(23,142,131,0.24)",
  },
  dark: {
    markBackground: "#f0c54d",
    markText: "#132028",
    text: "#ffffff",
    muted: "#b8c7c2",
    accent: "#7de8dc",
    glow: "rgba(125,232,220,0.22)",
  },
} as const;

const StoquifyLogo = ({
  theme = "light",
  className = "",
  width = 220,
  height = 60,
  tagline = "OHADA operating OS",
  compact = false,
}: StoquifyLogoProps) => {
  const colors = palette[theme];
  const markSize = Math.max(34, Math.min(height * 0.76, 46));
  const wordSize = Math.max(21, Math.min(height * 0.48, 31));

  return (
    <div
      className={cn("inline-flex min-w-0 items-center gap-3", className)}
      style={{ maxWidth: width }}
      aria-label="Stoquify"
    >
      <span
        className="relative grid shrink-0 place-items-center overflow-hidden rounded-xl font-black shadow-lg"
        style={{
          width: markSize,
          height: markSize,
          backgroundColor: colors.markBackground,
          color: colors.markText,
          boxShadow: `0 16px 34px ${colors.glow}`,
        }}
        aria-hidden="true"
      >
        <span
          className="relative -mt-0.5 font-black leading-none tracking-normal"
          style={{ fontSize: markSize * 0.58 }}
        >
          q
          <span
            className="absolute left-[53%] top-[18%] h-[72%] w-[0.11em] -rotate-[30deg] rounded-full"
            style={{ backgroundColor: colors.accent }}
          />
        </span>
        <span
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: colors.accent, boxShadow: `0 0 0 4px ${colors.glow}` }}
        />
      </span>

      {compact ? null : (
        <span className="min-w-0 leading-none">
          <span
            className="block truncate font-black lowercase tracking-normal"
            style={{ color: colors.text, fontSize: wordSize }}
            aria-hidden="true"
          >
            sto
            <span className="relative inline-block">
              q
              <span
                className="absolute left-[55%] top-[16%] h-[72%] w-[0.075em] -rotate-[30deg] rounded-full"
                style={{ backgroundColor: colors.accent }}
              />
            </span>
            uify
          </span>
          <span
            className="mt-1 block truncate text-[0.62rem] font-bold uppercase tracking-[0.14em]"
            style={{ color: colors.muted }}
          >
            {tagline}
          </span>
        </span>
      )}
    </div>
  );
};

export default StoquifyLogo;
