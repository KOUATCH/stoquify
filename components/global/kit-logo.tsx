import { cn } from "@/lib/utils";
import {
  STOQUIFY_MARK_FACES,
  STOQUIFY_MARK_PATH,
  STOQUIFY_WORDMARK_PATH,
  STOQUIFY_WORDMARK_RATIO,
  STOQUIFY_WORDMARK_VIEWBOX,
} from "./stoquify-logo-artwork";

type StoquifyLogoProps = {
  theme?: "light" | "dark";
  className?: string;
  width?: number;
  height?: number;
  tagline?: string;
  compact?: boolean;
};

const palette = {
  light: { text: "#132028", muted: "#536575" },
  dark: { text: "#ffffff", muted: "#b8c7d4" },
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
  const markSize = compact ? Math.min(height, 46) : Math.max(34, Math.min(height * 0.82, 46));
  const wordHeight = Math.max(26, Math.min(height * 0.68, 36));

  return (
    <div
      className={cn("inline-flex min-w-0 items-center gap-2.5", className)}
      style={{ maxWidth: width }}
      role="img"
      aria-label="Stoquify"
    >
      <span className="inline-flex shrink-0" aria-hidden="true">
        <svg
          width={markSize}
          height={markSize}
          viewBox="0 0 70 70"
          fill="none"
          focusable="false"
          aria-hidden="true"
        >
          <path d={STOQUIFY_MARK_PATH} fill="var(--product-brand, #2f7df6)" />
          {markSize >= 32 && STOQUIFY_MARK_FACES.map(face => (
            <path key={face.token} d={face.path} fill={`var(${face.token}, ${face.fallback})`} />
          ))}
        </svg>
      </span>

      {compact ? null : (
        <span className="min-w-0 leading-none" style={{ width: "max-content", maxWidth: Math.max(0, width - markSize - 10) }} aria-hidden="true">
          <span className="block">
            <svg
              className="block h-auto max-w-full"
              width={wordHeight * STOQUIFY_WORDMARK_RATIO}
              height={wordHeight}
              viewBox={STOQUIFY_WORDMARK_VIEWBOX}
              fill={colors.text}
              focusable="false"
              aria-hidden="true"
            >
              <path d={STOQUIFY_WORDMARK_PATH} />
            </svg>
          </span>
          {tagline && (
            <span
              className="mt-1 block break-words text-[0.62rem] font-semibold uppercase leading-tight tracking-[0.04em] max-[360px]:hidden"
              style={{ color: colors.muted }}
            >
              {tagline}
            </span>
          )}
        </span>
      )}
    </div>
  );
};

export default StoquifyLogo;
