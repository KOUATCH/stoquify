import test from 'node:test'; import assert from 'node:assert/strict';
import { summarizePilot } from './pilot-outcomes.mjs';
const client = {clientId:'client',organizationId:'org',consentRef:'SYNTHETIC/consent',onboardingEvidenceRef:'SYNTHETIC/tieout'};
const event = (id,type,extra={}) => ({id,type,clientId:'client',organizationId:'org',at:`2026-09-${id.padStart(2,'0')}T00:00:00Z`,evidenceRef:`SYNTHETIC/${id}`,requestId:'req',...extra});
test('sent invitation and repeated clicks do not count as delivery or productive activation', () => {
  const result = summarizePilot({clients:[client],events:[event('01','INVITE_SENT')]});
  assert.equal(result.invitationDelivered,0); assert.equal(result.firstReviewedResolution,0);
});
test('counts two reviewed cycles and suppresses identical event retries', () => {
  const events=[event('01','REQUESTED'),event('02','RESPONSE_SUBMITTED'),event('03','RESPONSE_ACCEPTED',{cycleId:'c1',reviewEvidenceRef:'SYNTHETIC/review'}),event('04','REQUESTED',{requestId:'req2'}),event('05','RESPONSE_SUBMITTED',{requestId:'req2'}),event('06','RESPONSE_ACCEPTED',{requestId:'req2',cycleId:'c2',reviewEvidenceRef:'SYNTHETIC/review2'})];
  const result=summarizePilot({clients:[client],events:[...events,events[5]]});
  assert.equal(result.repeatedProductiveUse,1); assert.equal(result.journeys[0].requestHours.length,2);
});
test('rejects cross-tenant, missing evidence and unsupported paid claims', () => {
  for(const bad of [event('01','INVITE_SENT',{organizationId:'other'}),event('01','RESPONSE_ACCEPTED'),event('01','PAID_CONTINUATION')]) assert.throws(()=>summarizePilot({clients:[client],events:[bad]}));
});
