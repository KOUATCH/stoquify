// Mocked UI regressions only; no application environment or database bootstrap.
const shared=require('./jest.hris-fresh-auth-ui.config.cjs');
module.exports={...shared,testMatch:['**/HrisOperationalTimeApprovalPanel.refresh.test.tsx','**/HrisControlledReview.test.tsx','**/HrisOperationalTimeRequestPanel.test.tsx']};
