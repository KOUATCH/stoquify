export type AccountantClientInviteProviderInput = {
  destination: string
  inviteUrl: string
  organizationName: string
  accountantFirmName: string
  role: "READ_ONLY" | "REVIEWER" | "PREPARER"
  locale: "EN" | "FR"
  expiresAt: string
  referralCode: string
  idempotencyKey: string
}

export type AccountantClientInviteProviderResult =
  | {
      status: "SENT"
      provider: "RESEND"
      providerReference: string
    }
  | {
      status: "DEFERRED" | "FAILED"
      provider: "RESEND"
      errorCode: string
      retryable: boolean
    }
  | {
      status: "UNKNOWN"
      provider: "RESEND"
      errorCode: "ACCOUNTANT_INVITE_PROVIDER_OUTCOME_UNKNOWN"
      retryable: false
    }

type ProviderEnvironment = Record<string, string | undefined>
type ProviderFetch = typeof fetch

function enabled(value?: string) {
  return ["1", "true", "yes", "on"].includes(
    (value ?? "").trim().toLowerCase(),
  )
}

function inviteCopy(input: AccountantClientInviteProviderInput) {
  const role = input.role.replaceAll("_", " ").toLowerCase()
  if (input.locale === "FR") {
    return {
      subject: input.organizationName + " vous invite sur Stoquify",
      heading: "Invitation a collaborer",
      body:
        input.organizationName +
        " vous propose un mandat " +
        role +
        " limite dans le temps pour accompagner ce client.",
      action: "Accepter et creer mon espace",
      expiry: "Cette invitation expire le " + input.expiresAt + ".",
    }
  }
  return {
    subject: input.organizationName + " invited you to Stoquify",
    heading: "Client collaboration invitation",
    body:
      input.organizationName +
      " offered you a time-bound " +
      role +
      " mandate to support this client.",
    action: "Accept and create my workspace",
    expiry: "This invitation expires on " + input.expiresAt + ".",
  }
}

function html(input: AccountantClientInviteProviderInput) {
  const copy = inviteCopy(input)
  const escape = (value: string) => value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
  return [
    '<div style="font-family:Inter,Arial,sans-serif;max-width:620px;margin:auto;color:#132028">',
    '<div style="border:1px solid #d9e1dc;border-radius:16px;padding:28px">',
    '<p style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#178e83">STOQUIFY ACCOUNTANT NETWORK</p>',
    "<h1>" + escape(copy.heading) + "</h1>",
    "<p>" + escape(copy.body) + "</p>",
    '<a href="' + escape(input.inviteUrl) + '" style="display:inline-block;margin:18px 0;padding:12px 18px;border-radius:8px;background:#132028;color:white;text-decoration:none;font-weight:700">' + escape(copy.action) + "</a>",
    '<p style="font-size:13px;color:#53675f">' + escape(copy.expiry) + "</p>",
    '<p style="font-size:12px;color:#7f969f">Powered by Stoquify · Referral ' + escape(input.referralCode) + "</p>",
    "</div></div>",
  ].join("")
}

export async function sendAccountantClientInvite(
  input: AccountantClientInviteProviderInput,
  environment: ProviderEnvironment = process.env,
  fetcher: ProviderFetch = fetch,
): Promise<AccountantClientInviteProviderResult> {
  const apiKey = environment.RESEND_API_KEY?.trim()
  const from = (
    environment.STOQUIFY_ACCOUNTANT_INVITE_FROM_EMAIL ||
    environment.RESEND_FROM_EMAIL ||
    ""
  ).trim()
  if (
    !enabled(environment.STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS) ||
    !apiKey ||
    !from
  ) {
    return {
      status: "DEFERRED",
      provider: "RESEND",
      errorCode: "ACCOUNTANT_INVITE_EMAIL_NOT_CONFIGURED",
      retryable: true,
    }
  }

  try {
    const copy = inviteCopy(input)
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [input.destination],
        subject: copy.subject,
        html: html(input),
      }),
    })
    const body = await response.json().catch(() => null) as {
      id?: unknown
      message?: unknown
    } | null
    if (response.ok && typeof body?.id === "string" && body.id.trim()) {
      return {
        status: "SENT",
        provider: "RESEND",
        providerReference: body.id,
      }
    }
    if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 409) {
      return {
        status: "FAILED",
        provider: "RESEND",
        errorCode: response.status === 429 ? "ACCOUNTANT_INVITE_PROVIDER_RETRYABLE" : "ACCOUNTANT_INVITE_PROVIDER_REJECTED",
        retryable: response.status === 429,
      }
    }
    return { status: "UNKNOWN", provider: "RESEND", errorCode: "ACCOUNTANT_INVITE_PROVIDER_OUTCOME_UNKNOWN", retryable: false }
  } catch {
    return { status: "UNKNOWN", provider: "RESEND", errorCode: "ACCOUNTANT_INVITE_PROVIDER_OUTCOME_UNKNOWN", retryable: false }
  }
}
