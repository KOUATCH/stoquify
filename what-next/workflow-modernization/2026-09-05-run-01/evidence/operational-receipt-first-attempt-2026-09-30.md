# First operational receipt database attempt

Driver: `../lanes/environment/verify-operational-receipt-recognition.cjs`.
Run UUID: `b11d921c-101b-49dc-96d4-2058e9230fb0`; terminal session 80809, exit 1. Owned local database only.

The terminal reported 11 passing checks: actual receipt plus partial invoices; uninvoiced return; mixed invoiced/uninvoiced return; exact return reversal; missing-rule recovery; stale/tenant/permission/fresh-auth denial; concurrent exact recovery; closed original period; held receipt acceptance; zero-value receipt; non-stock receipt and invoice.

Two checks failed while producing a physical return against blocked receipt accounting: atomic receipt+return recovery and return-rule rollback. Both reported `The data argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received undefined`. This is an implementation diagnosis, not passing recovery evidence.

Final JSON persistence failed with filesystem EPERM. Source stability and outside-fixture invariance were calculated in memory but their values were not printed or retained. Therefore this note does not claim either check passed, and is not a replacement for a complete bound runtime receipt. Keep this failed attempt; rerun with approved artifact-writing access after correcting the diagnosed defect.
