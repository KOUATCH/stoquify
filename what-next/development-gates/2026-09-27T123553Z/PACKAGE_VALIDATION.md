# Report package validation

Status: **PASS**

- PASS all_json_files_parse
- PASS role_membership_ids_and_tenants
- PASS named_candidates_trace_to_current_records
- PASS capability_candidates_trace_to_same_tenant
- PASS every_capability_db_field_extracted
- PASS field_definitions_match_prisma
- PASS no_invalid_selected_fks_or_enums
- PASS every_gate_has_required_report_sections
- PASS all_g1_roles_have_existing_nominations
- PASS source_anchors_exist
- PASS permission_module_sources_unchanged_during_analysis
- PASS initial_extraction_readonly
- PASS supplementary_extraction_readonly
- PASS runtime_and_catalog_extraction_readonly
- PASS migration_checks_pass
- PASS no_object_placeholders_in_markdown
- PASS no_secret_value_fields_in_selected_data

Artifact validation does not convert missing runtime evidence or human approvals into passing gates.
