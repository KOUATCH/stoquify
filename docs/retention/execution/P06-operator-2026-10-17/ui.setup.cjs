// Local host contention exceeded Testing Library's default one-second wait in
// existing asynchronous recovery cases. This only changes observation timeout,
// never application lease/transaction deadlines or assertions.
require('@testing-library/react').configure({ asyncUtilTimeout: 10000 })
