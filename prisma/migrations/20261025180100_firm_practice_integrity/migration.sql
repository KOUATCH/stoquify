-- SQL CHECK permits UNKNOWN; make the nullable union fields explicit.
ALTER TABLE "firm_practice_revisions"
  ADD CONSTRAINT "practice_payload_kind_required" CHECK (
    jsonb_typeof("payload") = 'object' AND "payload"->>'kind' IS NOT NULL AND "payload"->>'kind' = "kind"
  ),
  ADD CONSTRAINT "practice_review_actor_required" CHECK (
    "operation" <> 'REVIEW' OR "reviewedById" IS NOT NULL
  ),
  ADD CONSTRAINT "practice_effort_subject_required" CHECK (
    "kind" <> 'EFFORT' OR "subjectUserId" IS NOT NULL
  );
