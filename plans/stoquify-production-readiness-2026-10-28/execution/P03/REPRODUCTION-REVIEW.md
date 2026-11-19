# P03 reproduction recipe — PASS_SCOPED for execution

Independent audit_roadmap_review reviewed run-reproduction.cjs. Accepted after independent bounded cleanup, spawn/exit tracking, bounded final DB readback and post-run copied-runtime hash comparison were added. Both transport modes require fresh synthetic clone and preserved artifact. Direct HTTP versus proxied HTTPS is a confounded comparison; differential alone cannot prove proxy cause. Execution depends on successful preparation.
