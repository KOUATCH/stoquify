jest.mock('next-intl/routing', () => ({defineRouting: value => value}));
jest.mock('next/navigation', () => ({usePathname: () => '/en/dashboard/people', useRouter: () => ({refresh: jest.fn()})}));
jest.mock('@/actions/security/step-up-auth.actions', () => ({stepUpWithPasswordAction: jest.fn()}));
jest.mock('@/actions/hris/approval-inbox.actions', () => ({getHrisApprovalReviewAction: jest.fn(), decideHrisApprovalInboxItemAction: jest.fn()}));
jest.mock('@/actions/hris/time-review.actions', () => ({getTimeApprovalReviewAction: jest.fn(), decideReviewedTimeApprovalAction: jest.fn()}));
global.TextEncoder ??= require('node:util').TextEncoder;
global.TextDecoder ??= require('node:util').TextDecoder;
