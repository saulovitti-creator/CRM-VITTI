# Sprint 3.9D-2 — Plano de Migração Multi-Tenant

> **Data:** 2026-05-18 | **Status:** SOMENTE PLANEJAMENTO — nenhum código/schema alterado  
> **Referência:** commit `4c884de` | docs/arquitetura-agencia.md

---

## 1. Resumo Executivo

Este documento transforma a arquitetura aprovada na Sprint 3.9D-1 em um plano técnico seguro, incremental e reversível para as Sprints 3.9D-3 (migration base) e 3.9D-4 (isolamento backend). Nenhuma migration é executada aqui.

**Estratégia escolhida:** `accountId NOT NULL DEFAULT 1` desde o primeiro ALTER (ver seção 4).

---

## 2. Premissas Aprovadas (3.9D-1)

| Premissa | Valor |
|---|---|
| Nomenclatura | `accounts`, `account_members`, `accountId` |
| `users` | Identidade global; não recebe `accountId` |
| `users.role` no MVP | `"admin"` = superadmin; `"user"` = operacional |
| Roles por conta | `account_members.role`: `owner/admin/seller` |
| `viewer` no MVP | ❌ Reservado |
| `activeAccountId` | Cookie HttpOnly assinado; nunca via body |
| Conta padrão | id=1, name="Vitti Soluções", type="agency" |
| Dados existentes | Todos migram para `accountId = 1` |
| `tags.name` | `UNIQUE(name, accountId)` |
| `contacts.email` | Sem UNIQUE hard; deduplicação lógica |
| `pipeline_stages` | Recebe `accountId` redundante |
| Provisionamento padrão | Sprint 3.9D-7 |
| Visão consolidada | Feature futura |

---

## 3. Estado Atual do Banco

**Tabelas existentes (auditadas na 3.9D-0):**

| Tabela | Tem `accountId`? | Constraint relevante |
|---|---|---|
| `users` | ❌ | `UNIQUE(username)`, `UNIQUE(email)`, `UNIQUE(openId)` |
| `password_reset_tokens` | ❌ | FK → users |
| `tags` | ❌ | **`UNIQUE(name)` — problema crítico** |
| `custom_field_definitions` | ❌ | Sem UNIQUE de nome |
| `custom_field_values` | ❌ | FK → custom_field_definitions; INDEX(entityType, entityId) |
| `contacts` | ❌ | Sem UNIQUE hard em email/phone |
| `contact_tags` | ❌ | FK → contacts, tags |
| `pipelines` | ❌ | Sem UNIQUE de nome |
| `pipeline_stages` | ❌ | FK → pipelines |
| `opportunities` | ❌ | FK → contacts, pipelines, pipeline_stages; INDEX(pipelineId, status); INDEX(contactId) |
| `opportunity_notes` | ❌ | FK → opportunities |
| `opportunity_tasks` | ❌ | FK → opportunities |

---

## 4. Estratégia Geral de Migração

### Opção A — `accountId NOT NULL DEFAULT 1` desde o primeiro ALTER ✅ ESCOLHIDA
```sql
ALTER TABLE contacts ADD COLUMN accountId INT NOT NULL DEFAULT 1;
```
- Todos os registros existentes ganham `accountId = 1` automaticamente no ALTER.
- Sem fase nullable, sem backfill separado.
- Sem risco de registros sem conta.
- **Rollback:** `DROP COLUMN accountId` (simples, sem perda de dados originais).

### Opção B — nullable → backfill → NOT NULL ❌ Descartada
- Mais etapas, maior risco de inconsistência temporária.
- Desnecessário: volume atual é baixo, uma única conta de destino.

**Justificativa da Opção A:**
- Volume atual baixo → ALTER rápido no TiDB Starter.
- `DEFAULT 1` garante integridade imediata sem script de backfill separado.
- FK pode ser adicionada após o DEFAULT, após criar `accounts`.
- Rollback é um simples `DROP COLUMN`.
- Zero downtime esperado para o volume atual.

---

## 5. Sequência Exata das Migrations

### Migration M-01 — Tabelas `accounts` e `account_members`

**Criar `accounts`:**
```sql
-- pseudo-SQL ilustrativo
CREATE TABLE accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  type ENUM('agency','client') NOT NULL DEFAULT 'client',
  parentAccountId INT NULL REFERENCES accounts(id),
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT INTO accounts (id, name, type, parentAccountId, isActive)
VALUES (1, 'Vitti Soluções', 'agency', NULL, true);
```

**Criar `account_members`:**
```sql
CREATE TABLE account_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accountId INT NOT NULL REFERENCES accounts(id),
  userId INT NOT NULL REFERENCES users(id),
  role ENUM('owner','admin','seller','viewer') NOT NULL DEFAULT 'seller',
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_account_user (accountId, userId),
  INDEX idx_am_userId (userId),
  INDEX idx_am_accountId (accountId)
);
-- Vincular admin atual (userId do owner identificado via users WHERE role='admin')
INSERT INTO account_members (accountId, userId, role, isActive)
SELECT 1, id, 'owner', true FROM users WHERE role = 'admin' LIMIT 1;
```

**Dependências:** Nenhuma tabela depende desta. Executar PRIMEIRO.

---

### Migration M-02 — `accountId` nas Tabelas Raiz

Ordem de execução (sem dependências entre si após M-01):

| Tabela | Comando | FK | Índice |
|---|---|---|---|
| `contacts` | `ADD COLUMN accountId INT NOT NULL DEFAULT 1` | `REFERENCES accounts(id)` | `INDEX idx_contacts_account (accountId)` |
| `pipelines` | `ADD COLUMN accountId INT NOT NULL DEFAULT 1` | `REFERENCES accounts(id)` | `INDEX idx_pipelines_account (accountId)` |
| `pipeline_stages` | `ADD COLUMN accountId INT NOT NULL DEFAULT 1` | `REFERENCES accounts(id)` | `INDEX idx_stages_account (accountId)` |
| `tags` | `ADD COLUMN accountId INT NOT NULL DEFAULT 1` | `REFERENCES accounts(id)` | `INDEX idx_tags_account (accountId)` |
| `custom_field_definitions` | `ADD COLUMN accountId INT NOT NULL DEFAULT 1` | `REFERENCES accounts(id)` | `INDEX idx_cfd_account (accountId)` |
| `opportunities` | `ADD COLUMN accountId INT NOT NULL DEFAULT 1` | `REFERENCES accounts(id)` | `INDEX idx_opp_account (accountId)` — compor com status |

**`DEFAULT 1` garante backfill automático.** Nenhum UPDATE separado necessário.

---

### Migration M-03 — Constraints e Índices

```sql
-- 1. Remover UNIQUE global de tags.name
ALTER TABLE tags DROP INDEX <nome_do_index_unique_name>;

-- 2. Criar UNIQUE composto
ALTER TABLE tags ADD UNIQUE KEY uq_tag_name_account (name, accountId);

-- 3. Índice composto para Dashboard/Kanban (opportunities)
ALTER TABLE opportunities
  ADD INDEX idx_opp_account_status (accountId, status),
  ADD INDEX idx_opp_account_pipeline (accountId, pipelineId);

-- 4. Índice composto pipeline_stages
ALTER TABLE pipeline_stages
  ADD INDEX idx_stages_account_pipeline (accountId, pipelineId);

-- 5. Índice para contacts por account
ALTER TABLE contacts
  ADD INDEX idx_contacts_account_created (accountId, createdAt);
```

> **Atenção:** Identificar o nome real do index `UNIQUE(name)` de `tags` via `SHOW CREATE TABLE tags` antes de executar.

---

### Migration M-04 — Validações de Consistência

Queries de verificação a rodar **antes de avançar para 3.9D-4**:

```sql
-- 1. Nenhum registro sem accountId nas tabelas raiz
SELECT COUNT(*) FROM contacts WHERE accountId IS NULL;         -- Deve ser 0
SELECT COUNT(*) FROM pipelines WHERE accountId IS NULL;        -- Deve ser 0
SELECT COUNT(*) FROM pipeline_stages WHERE accountId IS NULL;  -- Deve ser 0
SELECT COUNT(*) FROM tags WHERE accountId IS NULL;             -- Deve ser 0
SELECT COUNT(*) FROM custom_field_definitions WHERE accountId IS NULL; -- Deve ser 0
SELECT COUNT(*) FROM opportunities WHERE accountId IS NULL;    -- Deve ser 0

-- 2. Consistência contact_tags: contact e tag na mesma account
SELECT ct.id FROM contact_tags ct
JOIN contacts c ON ct.contactId = c.id
JOIN tags t ON ct.tagId = t.id
WHERE c.accountId != t.accountId;  -- Deve retornar 0 linhas

-- 3. Consistência opportunities: contactId e pipelineId da mesma account
SELECT o.id FROM opportunities o
JOIN contacts c ON o.contactId = c.id
WHERE o.accountId != c.accountId;  -- Deve retornar 0 linhas

-- 4. Conta id=1 existe
SELECT id FROM accounts WHERE id = 1 AND type = 'agency'; -- Deve retornar 1 linha

-- 5. Admin vinculado
SELECT id FROM account_members WHERE accountId = 1 AND role IN ('owner','admin'); -- >= 1 linha
```

---

### Migration M-05 — Endurecimento Final (pós-3.9D-4)

> Esta migration só ocorre após o isolamento backend (3.9D-4) estar validado em produção.

- Confirmar FKs de `accountId` em todas as tabelas raiz.
- Adicionar constraints de validação cross-account em `contact_tags`.
- Remover `DEFAULT 1` das colunas `accountId` (após o código sempre injetar o valor correto).
- Avaliar trigger ou CHECK de consistência entre `opportunity.accountId` e `contact.accountId`.

---

## 6. Plano de Backfill

Com a **Estratégia A** (`NOT NULL DEFAULT 1`), o backfill é automático via ALTER TABLE. Não há script separado.

**Validação pós-backfill (rodar as queries da M-04):**
```sql
SELECT COUNT(*) as total,
       SUM(CASE WHEN accountId = 1 THEN 1 ELSE 0 END) as com_account
FROM contacts;
-- total deve ser igual a com_account
```

Repetir para `pipelines`, `pipeline_stages`, `tags`, `custom_field_definitions`, `opportunities`.

---

## 7. Plano de Rollback

| Migration | Rollback Simples (executar na ordem inversa) | Exige Restore? |
|---|---|---|
| M-01: criar `accounts` e `account_members` | `DROP TABLE account_members; DROP TABLE accounts;` (Atenção: só pode ser feito APÓS o rollback da M-02 remover as FKs) | ❌ |
| M-01: INSERT conta id=1 | `DELETE FROM accounts WHERE id=1;` (Risco de falha se houver registros dependentes, preferir rollback completo das tabelas se M-02 já ocorreu) | ❌ |
| M-02: `ADD COLUMN accountId` nas tabelas raiz | Para cada tabela: `ALTER TABLE <tabela> DROP FOREIGN KEY <nome_fk>; ALTER TABLE <tabela> DROP COLUMN accountId;` | ❌ |
| M-03: `DROP UNIQUE(name)` em tags | `ALTER TABLE tags ADD UNIQUE KEY <nome_original> (name);` | ❌ |
| M-03: `ADD UNIQUE(name,accountId)` | `ALTER TABLE tags DROP INDEX uq_tag_name_account;` | ❌ |
| M-03: índices compostos | `ALTER TABLE <tabela> DROP INDEX <nome_do_indice>;` | ❌ |
| M-04: apenas queries de validação | N/A (operações somente leitura) | ❌ |
| Falha catastrófica ou corrupção de dados | Restaurar banco a partir do backup via script `scripts/backup-tidb.ps1` | ✅ |

**Regra de Ouro do Rollback:** Deve ser sempre executado na **ordem inversa** da aplicação. Se M-02 já adicionou as Foreign Keys apontando para `accounts`, é impossível fazer o rollback da M-01 (dar DROP em `accounts`) sem antes executar o rollback da M-02 (dar DROP nas FKs de `contacts`, `pipelines`, etc).

**Regra:** Nenhuma migration M-02+ deve ser executada sem backup validado.

---

## 8. Checklist Obrigatório de Backup

Executar **antes de qualquer migration em produção**:

- [ ] Garantir que `mysqldump` está instalado e no PATH
- [ ] Configurar variáveis de ambiente: `TIDB_HOST`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE`
- [ ] Executar: `.\scripts\backup-tidb.ps1`
- [ ] Confirmar que arquivo `.sql` foi gerado em `outputs/backups/`
- [ ] Verificar que o arquivo não está vazio (tamanho > 0 bytes)
- [ ] Confirmar que `outputs/backups/` está no `.gitignore` ✅ (já configurado)
- [ ] Anotar timestamp e tamanho do arquivo gerado
- [ ] Testar abertura do arquivo SQL em editor (verificar estrutura)
- [ ] Confirmar que TiDB Cloud mostra backup automático recente (painel TiDB)
- [ ] Não executar migration durante horário comercial de pico

---

## 9. Estratégia de Validação Pré-Migration

Rodar antes da M-01:

```sql
-- Contagens atuais para comparação pós-migration
SELECT
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM contacts) as contacts,
  (SELECT COUNT(*) FROM pipelines) as pipelines,
  (SELECT COUNT(*) FROM pipeline_stages) as stages,
  (SELECT COUNT(*) FROM tags) as tags,
  (SELECT COUNT(*) FROM custom_field_definitions) as cfd,
  (SELECT COUNT(*) FROM opportunities) as opportunities,
  (SELECT COUNT(*) FROM opportunity_notes) as notes,
  (SELECT COUNT(*) FROM opportunity_tasks) as tasks;

-- Verificar admin atual
SELECT id, username, email, role FROM users WHERE role = 'admin';

-- Verificar duplicatas em tags.name (não deveria ter, mas confirmar)
SELECT name, COUNT(*) FROM tags GROUP BY name HAVING COUNT(*) > 1;

-- Verificar UNIQUE atual de tags
SHOW CREATE TABLE tags;
```

---

## 10. Estratégia de Validação Pós-Migration

Após M-01 a M-04:

- [ ] Contagens preservadas (comparar com pré-migration)
- [ ] `SELECT * FROM accounts WHERE id = 1;` retorna "Vitti Soluções"
- [ ] `SELECT COUNT(*) FROM account_members;` >= 1
- [ ] `accountId` preenchido em todas as tabelas raiz (queries M-04)
- [ ] `SHOW CREATE TABLE tags;` mostra `UNIQUE(name, accountId)` e sem `UNIQUE(name)` global
- [ ] `npm run build` sem erros
- [ ] `npx tsc --noEmit` sem erros
- [ ] Login funciona
- [ ] Dashboard abre e exibe dados
- [ ] Kanban abre e exibe oportunidades
- [ ] Criar contato funciona
- [ ] Criar oportunidade funciona
- [ ] Mover card no Kanban funciona
- [ ] Console do browser sem erros críticos

---

## 11. Separação entre 3.9D-3 e 3.9D-4

### Sprint 3.9D-3 — Migration Base

**O que entra:**
- Migrations M-01, M-02, M-03, M-04 (validação)
- Schema Drizzle atualizado (`accounts`, `account_members`, colunas `accountId`)
- Seed/backfill: conta id=1 + vínculo do admin (via script ou migration seed)
- Build funcionando com o novo schema

**O que NÃO entra:**
- Isolamento de queries (ainda retornam tudo — sem filtro por `activeAccountId`)
- Middleware de conta no tRPC
- Cookie de `activeAccountId`
- Qualquer mudança em `db.ts` ou `routers.ts` de lógica
- UI de seletor de conta

**Estado ao final da 3.9D-3:** O banco tem `accountId`, mas o backend ainda não filtra por ele. O sistema continua funcionando como single-tenant com a nova estrutura de dados.

---

### Sprint 3.9D-4 — Isolamento Backend

**O que entra:**
- `server/_core/context.ts`: adicionar `activeAccountId` ao `TrpcContext`
- `server/_core/trpc.ts`: criar `accountProcedure` e `accountAdminProcedure`
- `server/db.ts`: todas as queries recebem `accountId` como parâmetro e aplicam filtro
- `server/routers.ts`: substituir `protectedProcedure`/`adminProcedure` por `accountProcedure` onde aplicável
- Dashboard: filtro por `activeAccountId` obrigatório
- Kanban: filtro por `activeAccountId` obrigatório
- Importação XLSX: `accountId` do contexto, nunca do payload
- Cookie de `activeAccountId` (HttpOnly, assinado)
- `queryClient.clear()` ao trocar de conta

**O que NÃO entra:**
- UI de seletor de conta (3.9D-5)
- Gestão de subcontas (3.9D-6)
- Provisionamento (3.9D-7)

---

## 12. Impacto Esperado por Arquivo na 3.9D-3

| Arquivo | Tipo de mudança | O que NÃO muda |
|---|---|---|
| `drizzle/schema.ts` | + tabelas `accounts`, `account_members`; + coluna `accountId` em 6 tabelas | Lógica de negócio |
| `drizzle/000X_*.sql` | Novas migrations geradas pelo Drizzle Kit | Migrations anteriores |
| `server/db.ts` | Sem mudança de lógica (apenas schema importado) | Todas as queries |
| `server/routers.ts` | Sem mudança | Todos os endpoints |
| Script de seed | Criar `accounts` id=1 + `account_members` | — |

---

## 13. Impacto Esperado por Arquivo na 3.9D-4

| Arquivo | Tipo de mudança |
|---|---|
| `server/_core/context.ts` | + `activeAccountId: number \| null` no `TrpcContext` |
| `server/_core/trpc.ts` | + `accountProcedure`, `accountAdminProcedure` |
| `server/db.ts` | Todas as funções de query recebem `accountId: number` como parâmetro |
| `server/routers.ts` | Substituição de procedures; injeção de `ctx.activeAccountId` nas chamadas |
| `shared/types.ts` | Tipos de `Account` e `AccountMember` exportados |
| `client/src/_core/hooks/useAuth.ts` | Possível adição de `activeAccountId` ao estado |
| `client/src/components/DashboardLayout.tsx` | Lógica de troca de conta (mínima no MVP) |

---

## 14. Riscos Técnicos e Mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| ALTER TABLE lento no TiDB Starter | Baixa (volume atual pequeno) | Executar em horário de baixo tráfego; monitorar |
| FK de `accountId` quebrando antes de `accounts` existir | Certeza se ordem errada | Executar M-01 ANTES de M-02 obrigatoriamente |
| `UNIQUE(name)` de tags com nome repetido na migração | Improvável (dados atuais únicos) | Verificar duplicatas na validação pré-migration |
| `accountId` esquecido em query na 3.9D-4 | Médio | Code review; testes de isolamento com 2 contas fictícias |
| Rollback impossível após dados serem gravados com nova estrutura | Baixo no MVP (1 conta só) | Backup obrigatório; rollback documentado |
| Drizzle Kit gerando SQL incompatível com TiDB | Baixo | Revisar SQL gerado antes de executar; usar `drizzle-kit generate` + revisar |
| Importação executada durante migration | Baixo | Desabilitar importação na janela de manutenção |
| Cache frontend mostrando dados de outra conta | N/A na 3.9D-3 (single conta) | Tratar na 3.9D-4 com `queryClient.clear()` |

---

## 15. Estratégia de Deploy

**Sequência recomendada para 3.9D-3:**

```
1. git pull (confirmar código atual)
2. Executar checklist de backup (seção 8)
3. Validar contagens pré-migration (seção 9)
4. Executar M-01 (accounts + account_members + seed)
5. Validar M-01 (conta existe, admin vinculado)
6. Executar M-02 (accountId em todas as tabelas raiz)
7. Validar M-02 (accountId = 1 em todos os registros)
8. Executar M-03 (constraints + índices)
9. Validar M-03 (UNIQUE(name, accountId) em tags)
10. Executar M-04 (queries de verificação de consistência)
11. npm run build → confirmar OK
12. npx tsc --noEmit → confirmar OK
13. git add + git commit + git push
14. Deploy no Render (automático via push)
15. Smoke tests (seção 16)
```

**Migration antes do deploy:** ✅ Recomendado. O schema novo é retrocompatível (apenas adiciona colunas e tabelas; não remove nada).

**Janela de manutenção:** Não obrigatória para M-01 a M-03. Recomendada para M-05 (endurecimento).

---

## 16. Smoke Tests após 3.9D-3

- [ ] Login admin → OK
- [ ] Login user comum → OK
- [ ] Dashboard abre → OK
- [ ] Kanban abre → cards visíveis → OK
- [ ] Lista de contatos → OK
- [ ] Criar contato → OK
- [ ] Criar oportunidade → OK
- [ ] Mover card no Kanban → OK
- [ ] Tags listadas → OK
- [ ] Custom Fields listados → OK
- [ ] Importação XLSX → OK (ainda sem escopo de conta)
- [ ] Console do browser → sem erros críticos
- [ ] `SELECT COUNT(*) FROM accounts;` → 1
- [ ] `SELECT COUNT(*) FROM account_members;` → >= 1

---

## 17. Critérios de Aceite — Sprint 3.9D-3

- [ ] Migrations Drizzle criadas e aplicadas em produção
- [ ] Tabelas `accounts` e `account_members` existem
- [ ] Conta id=1 "Vitti Soluções" existe
- [ ] Admin atual vinculado em `account_members`
- [ ] `accountId = 1` em 100% dos registros das tabelas raiz
- [ ] `UNIQUE(name, accountId)` em `tags` (sem UNIQUE global)
- [ ] `npx tsc --noEmit` sem erros
- [ ] `npm run build` sem erros
- [ ] Todos os smoke tests passando
- [ ] Rollback documentado e testável
- [ ] Sem dados perdidos (contagens preservadas)

---

## 18. Critérios de Aceite — Sprint 3.9D-4

- [ ] `accountProcedure` criado e ativo no tRPC
- [ ] `activeAccountId` resolvido via cookie HttpOnly
- [ ] Todas as queries de `db.ts` filtram por `accountId`
- [ ] Dashboard escopado por `activeAccountId`
- [ ] Kanban escopado por `activeAccountId`
- [ ] Importação XLSX usa `ctx.activeAccountId`
- [ ] Teste com 2 contas fictícias: sem vazamento cross-account
- [ ] `queryClient.clear()` ao trocar de conta
- [ ] `npx tsc --noEmit` sem erros
- [ ] `npm run build` sem erros
- [ ] Smoke tests passando com 2 contas

---

## 19. O que fica FORA de 3.9D-3 e 3.9D-4

- Seletor visual de conta no frontend (→ 3.9D-5)
- Gestão de subcontas/clientes (→ 3.9D-6)
- Provisionamento automático de pipeline padrão (→ 3.9D-7)
- Visão consolidada multi-conta
- Billing / faturamento por conta
- Automações e WhatsApp por conta
- Roles avançadas (`viewer`, `manager`)
- Gestão completa de membros (convite, remoção)
- Relatórios cross-account

---

## 20. Plano de Testes de Isolamento Futuro (3.9D-4)

```
Cenário de teste:
- Conta A: id=1 ("Vitti Soluções")
  - Contatos: João, Maria
  - Pipeline: "Funil Principal"
  - Oportunidade: "Venda João"

- Conta B: id=2 ("Cliente Teste")
  - Contatos: Carlos
  - Pipeline: "Funil Cliente"
  - Oportunidade: "Proposta Carlos"

Testes:
1. Logar como user da Conta A com activeAccountId=1:
   - GET contacts → deve retornar apenas João e Maria
   - GET opportunities → deve retornar apenas "Venda João"
   - GET pipelines → deve retornar apenas "Funil Principal"

2. Trocar activeAccountId para 2 (Conta B):
   - Cache limpo (queryClient.clear())
   - GET contacts → deve retornar apenas Carlos
   - GET opportunities → deve retornar apenas "Proposta Carlos"

3. Tentar injetar accountId=1 no payload com user da Conta B:
   - Deve ser ignorado; middleware usa cookie

4. Dashboard Conta A → KPIs apenas da Conta A
5. Dashboard Conta B → KPIs apenas da Conta B
```

---

## 21. Decisões Finais do Plano

| Decisão | Resolução |
|---|---|
| Estratégia de migration | Opção A: `NOT NULL DEFAULT 1` |
| Ordem das migrations | M-01 → M-02 → M-03 → M-04 → M-05 (pós 3.9D-4) |
| Backfill | Automático via `DEFAULT 1` no ALTER |
| Rollback | `DROP COLUMN` / `DROP TABLE` conforme necessário |
| Backup | Obrigatório antes de qualquer ALTER |
| Divisão 3.9D-3 / 3.9D-4 | Schema na 3.9D-3; isolamento de lógica na 3.9D-4 |
| Deploy | Migration antes do push; retrocompatível |

---

## 22. Decisões Pendentes

> Nenhuma decisão de arquitetura permanece pendente. Todas foram resolvidas na Sprint 3.9D-1.

**Única ação técnica pendente antes da 3.9D-3:**
- Identificar o nome exato do índice `UNIQUE(name)` da tabela `tags` via `SHOW CREATE TABLE tags` para o comando correto de DROP INDEX na M-03.

---

## 23. O que NÃO foi Alterado

✅ Nenhum arquivo de código alterado.  
✅ Nenhuma migration criada.  
✅ Nenhum schema alterado.  
✅ Nenhum endpoint tRPC alterado.  
✅ Nenhuma UI alterada.  
✅ Nenhum dado alterado.  
✅ Nenhum commit criado.  
✅ `git diff` limpo — apenas `docs/plano-migracao.md` como untracked.
