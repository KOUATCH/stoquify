import ForgotPasswordForm from "@/components/Forms/ForgotPasswordForm";
import { GridBackground } from "@/components/reusable-ui/grid-background";
import React from "react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <GridBackground>
      <div className="px-4">
        <ForgotPasswordForm />
      </div>
    </GridBackground>
  );
}
