# Scripts Organization

This folder groups operational and historical scripts to reduce root-level clutter.

## `scripts/maintenance`

Safe maintenance scripts used in the current workflow:

- `ensure-admin.ts`: ensures user `vlicrm` exists with `admin` role.
- `repair-local-schema.ts`: repairs local schema drift without destructive data changes.

Related npm commands:

- `npm run ensure-admin`
- `npm run repair-local-schema`

## `scripts/debug`

Local diagnostics and manual tests. Use only in local/dev environments and review each script before running.

## `scripts/seeds`

Seed scripts for local data setup. Some scripts are legacy and may reference old `lead` concepts.

## `scripts/legacy`

Historical one-off migration/fix scripts kept for traceability. Do not run without prior review and backup.

## Safety Notes

- Do not run database scripts in production without a tested backup/rollback plan.
- Prefer maintenance scripts first; use legacy/debug scripts only when the task explicitly requires them.
