"use server";
import { ResetPasswordEmail } from "@/components/email-templates/reset-password";
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log";
import { generateToken } from "@/lib/token";
import { db } from "@/prisma/db";
import { Resend } from "resend";

// import { generateNumericToken } from "@/lib/token";
const resend = new Resend(process.env.RESEND_API_KEY);
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export async function sendResetLink(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const genericResponse = {
    status: 200,
    error: null,
    data: null,
  };

  try {
    const user = await db.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    });

    if (!user) {
      return genericResponse;
    }

    const token = generateToken();
    const verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
    await db.user.update({
      where: { id: user.id },
      data: {
        verificationToken: token,
        verificationTokenExpires,
      },
    });
    const userFirstname = user.firstName ?? "there";

    const resetPasswordLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(normalizedEmail)}`;
    try {
      await resend.emails.send({
        // from: "NextAdmin <info@desishub.com>",
        from:"onboarding@resend.dev",
        to: normalizedEmail,
        subject: "Reset Password Request",
        react: ResetPasswordEmail({ userFirstname, resetPasswordLink }),
      });
    } catch (emailError) {
      console.error("Reset email sending error:", emailError);
    }

    await logSecurityEvent({
      type: SecurityEventType.AUTH_PASSWORD_RESET_REQUESTED,
      userId: user.id,
      organizationId: user.organizationId,
      resource: user.id,
      details: { expiresAt: verificationTokenExpires.toISOString() },
    });

    return genericResponse;
  } catch (error) {
    console.log(error);
    return genericResponse;
  }
}
