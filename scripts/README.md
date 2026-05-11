# Scripts Organization

This folder groups operational and historical scripts to reduce root-level clutter.

## `scripts/maintenance`

Safe maintenance scripts used in the current workflow:

- `ensure-admin.ts`: ensures user `vlicrm` exists with `admin` role.
- `repair-local-schema.ts`: repairs local schema drift without destructive data changes.
- `setup-local-env.ts`: idempotent local baseline setup for admin user, pipeline/stages, and core supporting tables.

Related npm commands:

- `npm run ensure-admin`
- `npm run repair-local-schema`
- `npm run setup-local-env`
- `npm run setup-local-env -- --dry-run`

`setup-local-env` guarantees for local/dev:

- user `vlicrm` with `admin` role;
- pipeline `Pipeline Principal`;
- official stages:
  - `Primeiro Contato`
  - `Não Respondeu`
  - `Interessado`
  - `Sem Interesse`
  - `Ganho` (inactive/final)
  - `Perdido` (inactive/final)
  - `Abandonado` (inactive/final)
- `tags` table existence;
- `contact_tags` table/indexes/FKs consistency (when safe);
- `custom_field_definitions.model` default set to `contact` when legacy default is `lead`.

It is idempotent and does not delete data.

## `scripts/debug`

Local diagnostics and manual tests. Use only in local/dev environments and review each script before running.

## `scripts/seeds`

Seed scripts for local data setup. Some scripts are legacy and may reference old `lead` concepts.

## `scripts/legacy`

Historical one-off migration/fix scripts kept for traceability. Do not run without prior review and backup.

## Safety Notes

- Do not run database scripts in production without a tested backup/rollback plan.
- Prefer maintenance scripts first; use legacy/debug scripts only when the task explicitly requires them.
- Use `--dry-run` for diagnostics before any sensitive execution.
