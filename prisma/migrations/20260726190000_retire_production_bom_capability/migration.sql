-- Retire the unimplemented production/BOM capability without deleting legacy data.
-- Prisma no longer exposes these tables, so application code cannot create new
-- recipes or batches. Existing rows remain available for controlled historical
-- evidence extraction and audit retention.

DO $$
BEGIN
  IF to_regclass('public.legacy_production_batches') IS NULL
     AND to_regclass('public.production_batches') IS NOT NULL THEN
    ALTER TABLE public.production_batches RENAME TO legacy_production_batches;
  END IF;

  IF to_regclass('public.legacy_recipe_ingredients') IS NULL
     AND to_regclass('public.recipe_ingredients') IS NOT NULL THEN
    ALTER TABLE public.recipe_ingredients RENAME TO legacy_recipe_ingredients;
  END IF;

  IF to_regclass('public.legacy_recipes') IS NULL
     AND to_regclass('public.recipes') IS NOT NULL THEN
    ALTER TABLE public.recipes RENAME TO legacy_recipes;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.legacy_production_batches') IS NOT NULL THEN
    COMMENT ON TABLE public.legacy_production_batches IS
      'Archived production batch records retained after BOM capability retirement on 2026-07-26.';
  END IF;

  IF to_regclass('public.legacy_recipe_ingredients') IS NOT NULL THEN
    COMMENT ON TABLE public.legacy_recipe_ingredients IS
      'Archived recipe ingredient records retained after BOM capability retirement on 2026-07-26.';
  END IF;

  IF to_regclass('public.legacy_recipes') IS NOT NULL THEN
    COMMENT ON TABLE public.legacy_recipes IS
      'Archived recipe records retained after BOM capability retirement on 2026-07-26.';
  END IF;
END
$$;
