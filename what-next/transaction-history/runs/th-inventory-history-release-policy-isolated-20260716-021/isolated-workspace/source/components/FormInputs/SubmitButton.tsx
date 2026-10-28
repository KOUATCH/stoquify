import { cn } from "@/lib/utils";
import { Loader, Plus } from "lucide-react";

type SubmitButtonProps = {
  title: string;
  loadingTitle?: string;
  className?: string;
  loaderIcon?: any;
  buttonIcon?: any;
  loading: boolean;
  showIcon?: boolean;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
};
export default function SubmitButton({
  title,
  loadingTitle = "Saving Please wait...",
  loading,
  className,
  loaderIcon = Loader,
  buttonIcon = Plus,
  showIcon = true,
}: SubmitButtonProps) {
  const LoaderIcon = loaderIcon;
  const ButtonIcon = buttonIcon;
  return (
    <>
      {loading ? (
        <button
          type="button"
          disabled
          className={cn(
            "button-gold-chestnut flex cursor-not-allowed items-center justify-center rounded-md px-3 py-2 text-sm font-semibold leading-6 opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            className
          )}
        >
          <LoaderIcon className="w-4 h-4 animate-spin mr-2" />
          {loadingTitle}
        </button>
      ) : (
        <button
          type="submit"
          className={cn(
            "button-gold-chestnut flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]",
            className
          )}
        >
          {showIcon && <ButtonIcon className="w-4 h-4 mr-2" />}
          {title}
        </button>
      )}
    </>
  );
}
