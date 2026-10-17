// Offline, consent-scoped pilot worksheet reducer. Inputs require operator-verified source references.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export function summarizePilot(input) {
  const clients = new Map();
  for (const client of input.clients) {
    if (!client.clientId || clients.has(client.clientId) || !client.organizationId || !client.consentRef || !client.onboardingEvidenceRef) throw Error('Unique consented clients and onboarding evidence required');
    clients.set(client.clientId, { ...client, invitation: 'UNKNOWN', firstAuthorizedTaskAt: null, firstReviewedResolutionAt: null, cycles: new Set(), requestHours: [], supportMinutes: 0, paidContinuation: false });
  }
  const seen = new Map(), requests = new Map(), responded = new Set();
  for (const event of [...input.events].sort((a,b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id))) {
    if (!event.id || !event.evidenceRef || !Number.isFinite(Date.parse(event.at))) throw Error('Source event ID, time and evidence required');
    if (seen.has(event.id)) { if (seen.get(event.id) !== JSON.stringify(event)) throw Error('Conflicting duplicate'); else continue; }
    seen.set(event.id, JSON.stringify(event));
    const client = clients.get(event.clientId);
    if (!client || client.organizationId !== event.organizationId) throw Error('Unconsented or cross-tenant event');
    const key = `${event.organizationId}:${event.clientId}:${event.requestId}`;
    if (event.type.startsWith('INVITE_')) {
      const status = event.type.slice(7);
      if (!['SENT','DELIVERED','FAILED','UNKNOWN'].includes(status)) throw Error('Unknown delivery state');
      client.invitation = status;
    } else if (event.type === 'REQUESTED') {
      if (!event.requestId || requests.has(key)) throw Error('Duplicate or missing request');
      requests.set(key, event.at);
    } else if (event.type === 'RESPONSE_SUBMITTED') {
      if (!requests.has(key)) throw Error('Response requires a sourced prior request');
      responded.add(key); client.firstAuthorizedTaskAt ??= event.at;
    } else if (event.type === 'RESPONSE_ACCEPTED') {
      if (!responded.has(key) || !event.cycleId || !event.reviewEvidenceRef) throw Error('Reviewed source chain and business cycle required');
      client.firstReviewedResolutionAt ??= event.at;
      client.cycles.add(event.cycleId);
      if (!client.requestHours.some(row => row.requestId === event.requestId)) client.requestHours.push({ requestId: event.requestId, hours: (Date.parse(event.at) - Date.parse(requests.get(key))) / 3600000 });
    } else if (event.type === 'SUPPORT') {
      if (!Number.isFinite(event.minutes) || event.minutes < 0) throw Error('Support minutes must be nonnegative');
      client.supportMinutes += event.minutes;
    } else if (event.type === 'PAID_CONTINUATION') {
      if (!event.paymentEvidenceRef) throw Error('Paid continuation needs payment evidence, not a registration or quote');
      client.paidContinuation = true;
    } else throw Error('Unknown outcome');
  }
  const journeys = [...clients.values()].map(({ cycles, consentRef, onboardingEvidenceRef, ...client }) => ({ ...client, reviewedCycles: [...cycles], repeatedProductiveUse: cycles.size >= 2 }));
  return { mode: 'OFFLINE_OPERATOR_VERIFIED_EVIDENCE', denominator: clients.size, invitationDelivered: journeys.filter(x => x.invitation === 'DELIVERED').length,
    firstReviewedResolution: journeys.filter(x => x.firstReviewedResolutionAt).length,
    repeatedProductiveUse: journeys.filter(x => x.repeatedProductiveUse).length,
    paidContinuation: journeys.filter(x => x.paidContinuation).length,
    supportMinutes: journeys.reduce((sum,x) => sum+x.supportMinutes,0), journeys };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.stdout.write(JSON.stringify(summarizePilot(JSON.parse(readFileSync(process.argv[2], 'utf8'))), null, 2) + '\n');
