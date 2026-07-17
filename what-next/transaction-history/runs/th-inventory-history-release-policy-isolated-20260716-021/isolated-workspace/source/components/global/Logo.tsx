import Link from "next/link";
import StoquifyLogo from "./kit-logo";

export default function Logo({
  variant = "light",
  href = "/",
}: {
  variant?: "dark" | "light";
  href?: string;
}) {
  if (variant === "light") {
    return (
      <Link href={href} aria-label="Stoquify home" className="flex items-center space-x-2">
        <StoquifyLogo width={200} height={60} />
      </Link>
    );
  } else {
    return (
      <Link href={href} aria-label="Stoquify home" className="flex items-center space-x-2">
        <StoquifyLogo width={200} height={60} theme="dark" />
      </Link>
    );
  }
}
