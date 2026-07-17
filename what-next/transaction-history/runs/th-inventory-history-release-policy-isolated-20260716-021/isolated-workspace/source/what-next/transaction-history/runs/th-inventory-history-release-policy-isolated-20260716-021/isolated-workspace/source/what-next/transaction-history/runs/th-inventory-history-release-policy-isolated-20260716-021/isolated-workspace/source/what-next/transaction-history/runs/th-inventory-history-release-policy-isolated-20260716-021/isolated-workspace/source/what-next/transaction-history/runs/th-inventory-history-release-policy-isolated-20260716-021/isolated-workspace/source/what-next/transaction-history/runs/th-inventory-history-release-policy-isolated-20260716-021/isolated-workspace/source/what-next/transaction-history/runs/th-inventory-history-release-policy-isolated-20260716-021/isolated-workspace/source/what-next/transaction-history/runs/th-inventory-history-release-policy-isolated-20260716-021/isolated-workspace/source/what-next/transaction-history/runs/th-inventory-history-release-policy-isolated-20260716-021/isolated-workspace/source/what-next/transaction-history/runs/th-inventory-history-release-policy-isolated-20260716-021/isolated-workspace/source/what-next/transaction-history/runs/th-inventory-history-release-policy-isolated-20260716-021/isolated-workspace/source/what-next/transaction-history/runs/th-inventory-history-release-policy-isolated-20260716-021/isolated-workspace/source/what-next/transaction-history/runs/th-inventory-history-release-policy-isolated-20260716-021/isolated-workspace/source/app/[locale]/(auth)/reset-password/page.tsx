import ResetPasswordForm from "@/components/Forms/ResetPasswordForm";
import { GridBackground } from "@/components/reusable-ui/grid-background";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <GridBackground>
      <div className="px-4">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </GridBackground>
  );
}