'use strict';
// Pure acceptance predicates. Original network cancellation and old strict failures remain facts.
const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function classifyBytes(row, bridge, cdp) {
  const issues = [];
  if (!bridge || !cdp) return { accepted: false, issues: ['missing_original_or_browser_evidence'] };
  for (const key of ['captureId', 'method', 'path', 'urlSha256', 'status']) {
    if (bridge[key] !== row[key]) issues.push('bridge_' + key + '_mismatch');
    if (cdp[key] !== row[key]) issues.push('browser_' + key + '_mismatch');
  }
  if (cdp.origin !== row.origin) issues.push('browser_origin_mismatch');
  if (!row.captureId || cdp.matchCount !== 1 || cdp.responseEventCount !== 1 || cdp.redirected) issues.push('ambiguous_original_response');
  if (bridge.complete !== true || bridge.upstreamComplete !== true || bridge.downstreamFinished !== true || bridge.aborted !== false || bridge.downstreamClosedEarly !== false || bridge.captureError) issues.push('incomplete_original_response');
  if (cdp.errors?.length || cdp.streamError || !cdp.stream?.enabled || cdp.stream.overflow || cdp.stream.missingDataEventsAfterEnable) issues.push('incomplete_browser_stream');
  if (cdp.fromDiskCache !== false || cdp.fromServiceWorker !== false || cdp.fromPrefetchCache !== false) issues.push('not_original_network_delivery');
  const stream = cdp.stream;
  if (!stream || !Number.isSafeInteger(stream.bytes) || stream.bytes < 0 || stream.bytes !== bridge.decodedBytes || stream.sha256 !== bridge.decodedSha256 || stream.bytes !== cdp.dataLength) issues.push('browser_original_byte_mismatch');
  if (JSON.stringify(stream?.containsActorCanary) !== JSON.stringify(bridge.containsActorCanary)) issues.push('browser_original_actor_mismatch');
  if (row.playwrightBody && (row.playwrightBody.bytes !== bridge.decodedBytes || row.playwrightBody.sha256 !== bridge.decodedSha256)) issues.push('playwright_original_byte_mismatch');
  const terminal = cdp.terminal;
  const canceled = terminal?.kind === 'loadingFailed' && terminal.canceled === true && terminal.errorText === 'net::ERR_ABORTED' && !terminal.blockedReason && !terminal.corsErrorStatus;
  if (terminal?.kind !== 'loadingFinished' && !canceled) issues.push('unqualified_network_terminal');
  return { accepted: issues.length === 0, issues, networkCompleted: terminal?.kind === 'loadingFinished', networkCanceled: canceled, originalBytes: bridge.decodedBytes, originalSha256: bridge.decodedSha256 };
}

function bindProfileConsumer(row, actor, binding, domEvents, phaseRows) {
  const issues = [];
  const profile = row.bridge?.profileRead;
  if (row.method !== 'POST' || row.requestHeaders?.['next-action'] !== binding.actionId || row.bridge?.request?.nextAction !== binding.actionId || row.cdp?.requestHeaders?.['next-action'] !== binding.actionId) issues.push('wrong_compiled_action');
  if (!profile || row.bridge.profileReadError || row.cdp?.stream?.profileReadError) issues.push('missing_root_profile_result');
  if (profile && JSON.stringify(profile) !== JSON.stringify(row.cdp?.stream?.profileRead)) issues.push('browser_original_profile_result_mismatch');
  if (profile?.actorIdSha256 !== hash(actor.id) || profile?.organizationIdSha256 !== hash(actor.organizationId) || profile?.emailSha256 !== hash(actor.email)) issues.push('wrong_profile_identity');
  if (!/^[a-f0-9]{64}$/.test(profile?.snapshotHash || '')) issues.push('missing_profile_snapshot');
  const responseAt = row.cdp?.responseWallTimeMs;
  const requestAt = row.cdp?.requestWallTimeMs;
  const terminalAt = row.cdp?.terminalWallTimeMs;
  const checkedAt = Date.parse(profile?.checkedAt);
  const start = row.acceptanceWindow?.startMs, end = row.acceptanceWindow?.endMs;
  if (![requestAt, responseAt, terminalAt, checkedAt, start, end].every(Number.isFinite) || requestAt < start || requestAt > responseAt || responseAt > terminalAt || terminalAt > end || checkedAt < requestAt - 1 || checkedAt > responseAt + 1) issues.push('profile_freshness_or_lifecycle_unbound');
  const competing = (phaseRows || []).filter(other => other.path === row.path && other.expectedCheckedText === row.expectedCheckedText && other.bridge?.profileRead?.emailSha256 === profile?.emailSha256 && other.bridge?.profileRead?.fieldsSha256 === profile?.fieldsSha256);
  if (competing.length !== 1 || competing[0].captureId !== row.captureId) issues.push('ambiguous_display_signature_across_original_responses');
  const matches = profile ? domEvents.filter(event => event.kind === 'profile' && event.at >= responseAt && event.at <= end && event.path === row.path && event.emailSha256 === profile.emailSha256 && event.fieldsSha256 === profile.fieldsSha256 && event.checkedText === row.expectedCheckedText) : [];
  if (matches.length !== 1) issues.push('root_profile_result_not_uniquely_consumed');
  const consumed = matches[0];
  return {
    accepted: issues.length === 0, issues, captureId: row.captureId,
    actionIdSha256: binding.actionIdSha256, snapshotHash: profile?.snapshotHash ?? null,
    snapshotBinding: 'Hidden revision from exact original root result; displayed fields and checkedAt are source-bound to that result, not a rendered snapshotHash attribute.',
    displayedCheckedAtPrecision: 'Locale-formatted display; duplicate displayed response signatures within the phase are rejected.',
    checkedAt: profile?.checkedAt ?? null, fieldsSha256: profile?.fieldsSha256 ?? null,
    lifecycle: { requestAt, responseAt, terminalAt, consumedAt: consumed?.at ?? null, terminalBeforeConsumer: consumed ? terminalAt <= consumed.at : null },
  };
}

function classifyConsumer(row, byteProof, profileProof, navigationProofs) {
  const issues = [...byteProof.issues];
  const isRead = row.method === 'POST' && Boolean(row.requestHeaders?.['next-action']);
  const prefetch = row.method === 'GET' && row.prefetch === true && row.requestHeaders?.rsc === '1' && row.cdp?.initiator?.type === 'script';
  let disposition = 'normal_network_completion';
  if (isRead && profileProof?.accepted !== true) issues.push('required_action_consumer_unqualified');
  if (byteProof.networkCanceled) {
    if (isRead && profileProof?.accepted) disposition = 'canceled_transport_complete_original_bytes_and_bound_profile_consumer';
    else if (prefetch && navigationProofs.some(proof => proof.contextId === row.contextId && proof.targetPath === row.path && proof.accepted === true)) disposition = 'canceled_speculative_prefetch_with_real_navigation_proof';
    else issues.push('cancellation_obligation_unresolved');
  }
  return { accepted: issues.length === 0, issues, disposition, strictNetworkGatePassed: byteProof.networkCompleted === true, canceledTerminalPreserved: byteProof.networkCanceled === true };
}

module.exports = { classifyBytes, bindProfileConsumer, classifyConsumer };
