# Sprint 3.9D-1 — Desenho da Arquitetura Agência

> **Data:** 2026-05-18 | **Status:** SOMENTE DOCUMENTAÇÃO — nenhum código alterado  
> **Baseado em:** Sprint 3.9D-0 (auditoria somente leitura, git diff limpo)

---

## 1. Resumo Executivo

Esta sprint formaliza a arquitetura multi-tenant do CRM Vitti sem implementar nada. O modelo adotado usa duas novas tabelas (`accounts` e `account_members`) e a adição de `accountId` nas tabelas operacionais. Todos os dados existentes migrarão para uma conta raiz "Vitti Soluções" (id=1) sem perda de dados. As próximas sprints (3.9D-2 a 3.9D-7) executarão essa arquitetura de forma incremental e segura.

---

## 2. Premissas de Negócio

- CRM Vitti é plataforma própria da Vitti Soluções.
- Evolução para modelo agência: a Vitti gerencia múltiplos clientes/subcontas.
- Cada cliente deve ter dados 100% isolados dos outros.
- Usuários podem ter papéis diferentes em contas diferentes.
- GoHighLevel é apenas referência conceitual, sem dependência técnica.
- O sistema atual é single-tenant e deve migrar sem downtime ou perda de dados.

---

## 3. Problemas Identificados na 3.9D-0

| Problema | Risco |
|---|---|
| Zero colunas `accountId` em todas as tabelas | Crítico |
| `users.role` global sem escopo de conta | Crítico |
| `tags.name` com `UNIQUE` global | Crítico |
| Dashboard agrega toda a instância | Crítico |
| Pipelines e custom fields globais | Alto |
| Importação XLSX sem conta alvo | Alto |
| Qualquer user autenticado lê todos os dados | Crítico |

---

## 4. Modelo Conceitual Proposto

### 4.1 Entidades Novas

**`accounts`** — Representa agência e clientes/subcontas:
```
id            INT PK AUTO_INCREMENT
name          VARCHAR(255) NOT NULL
type          ENUM('agency','client') NOT NULL DEFAULT 'client'
parentAccountId INT NULL REFERENCES accounts(id)
isActive      BOOLEAN NOT NULL DEFAULT true
createdAt     DATETIME DEFAULT CURRENT_TIMESTAMP
updatedAt     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```
- `type='agency'` → conta raiz Vitti Soluções (apenas 1 no MVP)
- `type='client'` → subconta de cliente
- `parentAccountId NULL` → conta raiz; preenchido → subconta filha

**`account_members`** — Vínculo usuário ↔ conta com role operacional:
```
id         INT PK AUTO_INCREMENT
accountId  INT NOT NULL REFERENCES accounts(id)
userId     INT NOT NULL REFERENCES users(id)
role       ENUM('owner','admin','seller','viewer') NOT NULL DEFAULT 'seller'
isActive   BOOLEAN NOT NULL DEFAULT true
createdAt  DATETIME DEFAULT CURRENT_TIMESTAMP
updatedAt  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
UNIQUE(accountId, userId)
INDEX(userId)
INDEX(accountId)
```

### 4.2 Tabelas Existentes com `accountId` Adicionado

| Tabela | Recebe `accountId` direto? | Herda via FK? | Justificativa |
|---|---|---|---|
| `contacts` | ✅ Sim | — | Entidade raiz; isolamento crítico |
| `pipelines` | ✅ Sim | — | Entidade raiz; sem herança possível |
| `tags` | ✅ Sim | — | UNIQUE global precisa virar `UNIQUE(name, accountId)` |
| `custom_field_definitions` | ✅ Sim | — | Definições globais são risco crítico |
| `opportunities` | ✅ Sim | pipelineId, contactId | accountId redundante garante segurança em queries simples |
| `pipeline_stages` | ⚠️ Opcional | pipelineId | Herança via pipeline é segura; accountId redundante recomendado para performance |
| `contact_tags` | ❌ Não direto | contactId + tagId | Herança dupla; validar que `contact.accountId = tag.accountId` |
| `custom_field_values` | ❌ Não direto | definitionId + entityId | Herança via definição; definição já terá accountId |
| `opportunity_notes` | ❌ Não direto | opportunityId | Herança via opportunity; JOIN obrigatório |
| `opportunity_tasks` | ❌ Não direto | opportunityId | Herança via opportunity; JOIN obrigatório |
| `users` | ❌ Não | — | Identidade global; membership via account_members |
| `password_reset_tokens` | ❌ Não | userId | Operação de autenticação global |

---

## 5. Diagrama Textual ER

```
users ──────────────────────────── account_members
                                         │
                                    accounts (type: agency | client)
                                         │
                    ┌────────────────────┼────────────────────────┐
                    │                    │                         │
               contacts            pipelines              custom_field_definitions
                    │                    │                         │
             contact_tags         pipeline_stages        custom_field_values
                                         │                   (entityId → contacts
              opportunities ────────────┘                    ou opportunities)
                    │
          ┌─────────┴─────────┐
   opportunity_notes   opportunity_tasks
```

**Cardinalidades principais:**
- `accounts` 1 → N `account_members` N → 1 `users`
- `accounts` 1 → N `contacts`
- `accounts` 1 → N `pipelines` 1 → N `pipeline_stages`
- `accounts` 1 → N `opportunities` (também FK para contact e stage)
- `accounts` 1 → N `tags`
- `accounts` 1 → N `custom_field_definitions` 1 → N `custom_field_values`

---

## 6. Papel da Tabela `users`

- `users` = **identidade e autenticação global**. Não carrega permissão operacional por cliente.
- `users.role` atual (`"admin"` / `"user"`) deve ser **mantido como role sistêmica/global** no MVP:
  - `"admin"` → superadmin/agência (acessa todas as contas)
  - `"user"` → usuário operacional (acessa apenas contas onde tem membership)
- No longo prazo, `users.role` pode ser depreciado em favor de `account_members.role` com uma role global separada.
- A verificação `ENV.ownerOpenId` que promove automaticamente um usuário a admin permanece inalterada.

---

## 7. Modelo de Roles e Permissões

### 7.1 Roles Sistêmicas (campo `users.role`)

| Role | Descrição |
|---|---|
| `"admin"` (superadmin) | Acessa todas as contas; gerencia accounts; pode importar em qualquer conta |
| `"user"` | Acessa apenas contas onde tem `account_members` ativo |

### 7.2 Roles Operacionais por Conta (`account_members.role`)

| Role | Escopo | Ver dados? | Gerenciar usuários? | Importar XLSX? | Config. pipeline? | Operar oportunidades? |
|---|---|---|---|---|---|---|
| `owner` | Conta | ✅ | ✅ | ✅ | ✅ | ✅ |
| `admin` | Conta | ✅ | ✅ | ✅ | ✅ | ✅ |
| `seller` | Conta | ✅ | ❌ | ❌ | ❌ | ✅ |
| `viewer` | Conta | ✅ (read-only) | ❌ | ❌ | ❌ | ❌ |

### 7.3 Decisões de Role (MVP)

- **MVP simplificado:** apenas `owner/admin` e `seller` serão usados inicialmente.
- `viewer` e `manager` reservados para sprints futuras (3.9F+).
- Superadmin (`users.role = "admin"`) tem acesso irrestrito sem necessitar de `account_members`.

---

## 8. Estratégia de `activeAccountId`

### 8.1 Comparação de Abordagens

| Abordagem | Segurança | Complexidade | Recomendado? |
|---|---|---|---|
| Parâmetro explícito em cada request | Baixa (manipulável) | Alta | ❌ |
| localStorage como fonte de auth | Baixa (manipulável) | Baixa | ❌ |
| Cookie HttpOnly com accountId | Alta | Média | ✅ |
| Sessão server-side | Alta | Média-alta | ✅ alternativa |
| Header customizado validado | Média | Média | ⚠️ |

### 8.2 Recomendação: Cookie HttpOnly + Validação de Membership

1. Ao fazer login, se user tiver apenas 1 conta: `activeAccountId` definido automaticamente.
2. Se tiver múltiplas contas: frontend exibe seletor; após escolha, backend define cookie `active_account_id` (HttpOnly, assinado com `JWT_SECRET`).
3. **Cada request tRPC lê `active_account_id` do cookie** — nunca do body/query.
4. Middleware valida: `account_members WHERE userId = ctx.user.id AND accountId = activeAccountId AND isActive = true`.
5. Superadmin (`users.role = "admin"`) pode setar qualquer `activeAccountId` sem exigir membership.
6. **Ao trocar de conta:** backend limpa o cookie, frontend invalida todo o cache do React Query (`queryClient.clear()`).

### 8.3 Proteção Contra Manipulação

- `activeAccountId` nunca é aceito como parâmetro de input nas mutations/queries operacionais.
- Sempre lido de `ctx.activeAccountId` (resolvido pelo middleware, não pelo cliente).
- Queries de leitura/escrita sempre aplicam `AND accountId = ctx.activeAccountId` implicitamente.

---

## 9. Middleware de Conta no tRPC (Desenho Conceitual)

```
Hierarquia de procedures (do mais permissivo ao mais restritivo):

publicProcedure          → qualquer request (login, register, reset)
  └── protectedProcedure → usuário autenticado (ctx.user != null)
        └── accountProcedure   → usuário + activeAccountId válido + membership confirmado
              └── accountAdminProcedure → membership.role IN ('owner','admin')
                    └── agencyProcedure → users.role = 'admin' (superadmin)
```

**`accountProcedure` (futuro):**
1. Verificar `ctx.user` (herda de protectedProcedure)
2. Resolver `activeAccountId` do cookie HttpOnly
3. Consultar `account_members` verificando membership ativo
4. Injetar `ctx.activeAccountId` e `ctx.membership` para uso nas queries
5. Lançar `FORBIDDEN` se membership não existir

**`accountAdminProcedure` (futuro):**
- Herda de `accountProcedure`
- Verifica `ctx.membership.role IN ('owner', 'admin')`

**`agencyProcedure` (futuro):**
- Herda de `protectedProcedure`
- Verifica `ctx.user.role === 'admin'`
- Pode receber `targetAccountId` opcional para operar em nome de outra conta

---

## 10. Regras de Integridade e Unicidade

| Constraint | Situação atual | Situação futura |
|---|---|---|
| `tags.name` UNIQUE | Global (impede duplicatas entre contas) | `UNIQUE(name, accountId)` |
| `contacts.email` / `.phone` | Verificação lógica global | Verificação por `accountId` apenas |
| `pipelines.name` | Sem constraint de unicidade | Pode haver nomes iguais em contas diferentes |
| `custom_field_definitions.name` | Sem constraint | Pode haver nomes iguais em contas diferentes |
| `account_members (accountId, userId)` | N/A | `UNIQUE(accountId, userId)` obrigatório |
| `contact_tags` | Sem validação cross-account | Garantir `contact.accountId = tag.accountId` via constraint ou trigger |
| `opportunities` | Sem validação cross-account | Garantir `pipelineId` e `contactId` pertencem à mesma `accountId` |

---

## 11. Estratégia para Dados Existentes

### Opção A: Uma única conta "Vitti Soluções"
- Criar `accounts` id=1, type='agency', name='Vitti Soluções'
- Popular `accountId = 1` em todas as tabelas operacionais
- Vincular todos os users existentes em `account_members` com roles adequadas

### Opção B: Agência raiz + Conta cliente default
- Criar `accounts` id=1, type='agency', name='Vitti Soluções (Agência)'
- Criar `accounts` id=2, type='client', parentAccountId=1, name='CRM Interno'
- Popular `accountId = 2` em dados operacionais
- Agência opera na conta id=2 por padrão

### ✅ Decisão: Adotar Opção A (MVP)

**Justificativa:** No MVP não há clientes reais separados ainda. Uma única conta reduz a complexidade da migration e preserva o funcionamento atual sem nenhuma alteração de UX. Quando o modelo agência for ativado de fato, a conta id=1 se torna a agência e novas contas filhas são criadas para clientes reais.

---

## 12. Impacto nos Fluxos Principais

| Fluxo | Impacto futuro |
|---|---|
| **Login/Auth** | Após auth, resolve `activeAccountId` (automático se 1 conta, seletor se múltiplas) |
| **Dashboard** | Filtro obrigatório por `activeAccountId` em todas as queries |
| **Kanban** | Lista apenas pipelines e oportunidades da conta ativa |
| **Contatos** | `getContacts` sempre com `AND contacts.accountId = activeAccountId` |
| **Oportunidades** | Idem; `createOpportunity` insere `accountId` do contexto |
| **Pipelines/Stages** | `getAllPipelines` filtra por `accountId`; stages herdam |
| **Tags** | `getAllTags` filtra por `accountId`; criação inclui `accountId` |
| **Custom Fields** | Definições filtradas por `accountId`; valores herdam |
| **Importação XLSX** | Usa `ctx.activeAccountId`; bloqueada sem conta ativa |
| **Tarefas/Notas** | Herdam via `opportunityId`; queries fazem JOIN de validação |
| **Seletor de conta** | Nova UI (Sprint 3.9D-5): dropdown no header ao ter múltiplas contas |

---

## 13. Políticas Específicas

### 13.1 Importação XLSX
- Sempre usa `ctx.activeAccountId` do servidor — nunca parâmetro do cliente.
- Superadmin deve selecionar conta-alvo antes de importar (via seletor).
- Importação sem conta ativa válida: `FORBIDDEN`.
- Tags criadas durante importação pertencem à conta ativa.
- Log de importação registra `accountId` alvo.

### 13.2 Dashboard
- Sempre escopado por `activeAccountId` — sem exceção.
- Visão consolidada multi-conta (ex: comparativo entre clientes) é feature futura separada.
- Superadmin troca de conta via seletor para ver Dashboard de cada cliente.

### 13.3 Kanban
- Apenas pipelines com `pipeline.accountId = activeAccountId` são listados.
- `moveToStage` valida que `opportunity.accountId = stage.pipeline.accountId`.
- Ao trocar `activeAccountId`: `queryClient.clear()` no frontend.

### 13.4 Tags e Custom Fields
- Tags pertencem à conta; UNIQUE por `(name, accountId)`.
- Custom field definitions pertencem à conta; campos de cliente A não aparecem em cliente B.
- Valores de custom fields herdam via `definitionId` já escopado.

---

## 14. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| `accountId` esquecido em query | Middleware injeta `activeAccountId`; code review obrigatório; testes de isolamento |
| Cache vazando dados entre contas | `queryClient.clear()` ao trocar de conta; cache keys incluem `accountId` |
| Migration parcial quebra produção | Backup obrigatório (Sprint Infra-1); migration em fases com rollback |
| Importação na conta errada | `accountId` sempre do servidor, nunca do client |
| Superadmin confundido com admin de cliente | Roles claramente distintas: `users.role` vs `account_members.role` |
| UNIQUE constraints globais remanescentes | Checklist de constraints na Sprint 3.9D-3 |
| `contact_tags` com contas cruzadas | Constraint ou trigger garantindo `contact.accountId = tag.accountId` |
| Usuário injeta `accountId` via payload | Middleware sempre resolve do cookie, nunca do body |

---

## 15. Respostas às 35 Decisões Obrigatórias

1. **`users.role` continua existindo?** ✅ Sim, como role sistêmica.
2. **Sua função?** Identificar superadmin global (agência). Role operacional vai para `account_members.role`.
3. **Diferença admin global vs admin cliente?** `users.role='admin'` = superadmin irrestrito. `account_members.role='admin'` = admin apenas na sua conta.
4. **Quem cria contas?** Superadmin (`users.role='admin'`).
5. **Quem edita contas?** Superadmin e `account_members.role='owner'` da própria conta.
6. **Quem troca de conta ativa?** Qualquer usuário autenticado com membership, via seletor UI.
7. **Usuário pode pertencer a mais de uma conta?** ✅ Sim, via múltiplos registros em `account_members`.
8. **Admin agência acessa todas as contas?** ✅ Sim, sem precisar de membership.
9. **Admin cliente acessa apenas a própria?** ✅ Sim.
10. **Vendedor vê todos os dados da conta?** ✅ No MVP sim (sem atribuição individual). Feature futura.
11. **Roles no MVP?** `owner/admin` e `seller`. `viewer` reservado.
12. **Tabelas com `accountId` direto?** `contacts`, `pipelines`, `tags`, `custom_field_definitions`, `opportunities`.
13. **Tabelas que herdam isolamento?** `pipeline_stages`, `contact_tags`, `custom_field_values`, `opportunity_notes`, `opportunity_tasks`.
14. **Pipelines pertencem a account?** ✅ Sim.
15. **Pipeline stages herdam ou recebem direto?** Herdam via `pipelineId`; `accountId` redundante recomendado para performance.
16. **Opportunities recebem `accountId` direto?** ✅ Sim (redundante mas obrigatório por segurança).
17. **Contacts recebem `accountId` direto?** ✅ Sim.
18. **Tags pertencem a account?** ✅ Sim.
19. **`tags.name` vira `UNIQUE(name, accountId)`?** ✅ Sim.
20. **Custom field definitions por account?** ✅ Sim.
21. **Custom field values herdam?** ✅ Sim, via `definitionId` escopado.
22. **Opportunity notes herdam?** ✅ Sim, via `opportunityId`.
23. **Opportunity tasks herdam?** ✅ Sim, via `opportunityId`.
24. **Contact tags herdam?** ✅ Sim, mas exige validação cross-account.
25. **Importação usa `activeAccountId`?** ✅ Sempre do contexto do servidor.
26. **Dashboard filtra por `activeAccountId`?** ✅ Sempre.
27. **Kanban filtra por `activeAccountId`?** ✅ Sempre.
28. **Cache ao trocar de conta?** `queryClient.clear()` + cookie novo.
29. **Como transportar `activeAccountId`?** Cookie HttpOnly assinado.
30. **Como impedir injeção manual?** Middleware resolve do cookie, nunca do payload.
31. **Validação de membership?** `account_members WHERE userId AND accountId AND isActive`.
32. **Conta padrão para dados atuais?** `accounts` id=1, "Vitti Soluções", type='agency'.
33. **Como migrar dados existentes?** `UPDATE tabela SET accountId = 1` após criar accounts id=1.
34. **Contatos duplicados por e-mail entre contas?** Permitido — unicidade será por `(email, accountId)` ou apenas lógica, não constraint hard.
35. **Tags duplicadas entre contas?** Permitido — resolvido com `UNIQUE(name, accountId)`.

---

## 16. Sequência das Próximas Sprints

### Sprint 3.9D-2 — Plano de Migração Multi-Tenant
- **Objetivo:** Documentar passo a passo seguro das migrations sem alterar código ainda.
- **Entregável:** `docs/plano-migracao.md` com ordem de ALTERs, rollback e janela de manutenção.
- **Risco:** Migration sem rollback quebra produção.
- **Critérios:** Documento aprovado, backup validado.

### Sprint 3.9D-3 — Migration Base
- **Objetivo:** Criar `accounts`, `account_members`; adicionar `accountId` nas tabelas; popular dados existentes.
- **Entregável:** Migrations Drizzle + dados migrados + build funcionando.
- **Risco:** ALTER em tabelas grandes pode causar lentidão no TiDB Starter.
- **Critérios:** `tsc --noEmit` limpo; build OK; dados existentes acessíveis; `accountId = 1` em todos os registros.

### Sprint 3.9D-4 — Isolamento de Queries/Mutations
- **Objetivo:** Adaptar `db.ts` e `routers.ts` para usar `ctx.activeAccountId` em todas as operações.
- **Entregável:** Backend isolado; testes de vazamento cross-account.
- **Risco:** Query sem `accountId` expõe dados de outras contas.
- **Critérios:** Nenhuma query sem filtro de `accountId`; Dashboard e importação escopados.

### Sprint 3.9D-5 — Seletor de Conta (Frontend)
- **Objetivo:** UI para selecionar conta ativa quando usuário tem múltiplas contas.
- **Entregável:** Dropdown no `DashboardLayout`; cookie `active_account_id` gerenciado.
- **Risco:** Cache não invalidado ao trocar de conta.
- **Critérios:** Troca de conta limpa o cache; dados da conta nova são carregados corretamente.

### Sprint 3.9D-6 — Gestão de Contas/Subcontas
- **Objetivo:** CRUD de `accounts` para superadmin; criar e ativar subcontas de clientes.
- **Entregável:** Tela de gestão de contas (superadmin only); provisionamento de conta nova.
- **Risco:** Criação de conta sem validação de parentAccountId.
- **Critérios:** Superadmin cria conta; usuário vinculado; login na nova conta funciona.

### Sprint 3.9D-7 — Provisionamento Inicial de Conta
- **Objetivo:** Ao criar nova conta, provisionar automaticamente pipeline padrão, stages e tags padrão.
- **Entregável:** Função de seed por conta; nova conta já operacional ao ser criada.
- **Risco:** Seed com dados globais ao invés de dados da conta.
- **Critérios:** Nova conta tem pipeline e stages funcionais; Kanban operacional imediatamente.

---

## 17. Decisões Finais da Sprint 3.9D-1

- ✅ Nomenclatura: `accounts`, `account_members`, `accountId`
- ✅ `users` permanece como identidade global de autenticação
- ✅ `users.role` mantido como role sistêmica no MVP (`"admin"` = superadmin)
- ✅ Roles operacionais ficam em `account_members.role`
- ✅ `activeAccountId` transportado por cookie HttpOnly assinado
- ✅ Middleware `accountProcedure` resolve e valida `activeAccountId` do servidor
- ✅ Dados existentes migram para `accountId = 1` (Vitti Soluções)
- ✅ Opção A para migração (conta única no MVP)
- ✅ Dashboard, Kanban e importação sempre escopados por `activeAccountId`
- ✅ `tags.name` vira `UNIQUE(name, accountId)`
- ✅ Tags e custom field definitions recebem `accountId` direto
- ✅ Notas, tarefas e contact_tags herdam isolamento via FK

---

## 22. Decisões Pendentes

> **Todas as decisões pendentes foram respondidas e aprovadas pelo responsável técnico em 2026-05-18. A Sprint 3.9D-1 está formalmente encerrada sem pendências.**

| Decisão | Resolução aprovada |
|---|---|
| `pipeline_stages` com `accountId` redundante? | ✅ **Sim.** Facilita queries, auditoria e reduz risco de JOIN esquecido. |
| Role `viewer` entra no MVP? | ❌ **Não.** Reservado para sprints futuras. MVP opera com `owner/admin/seller`. |
| Visão consolidada multi-conta para superadmin? | ❌ **Não no MVP.** Isolamento por conta primeiro. Consolidado será feature explícita futura. |
| `contacts.email` com `UNIQUE(email, accountId)` hard? | ❌ **Não inicialmente.** Validação lógica por conta apenas. Constraint hard pode ser adicionada no futuro se o negócio exigir. |
| Pipeline padrão na 3.9D-3 ou 3.9D-7? | ✅ **3.9D-7.** A Sprint 3.9D-3 fica restrita à migration base. Provisionamento na Sprint 3.9D-7. |

---

## 19. O que NÃO foi Alterado

✅ Nenhum arquivo de código alterado.  
✅ Nenhuma migration criada.  
✅ Nenhum schema alterado.  
✅ Nenhum endpoint tRPC alterado.  
✅ Nenhuma UI alterada.  
✅ Nenhum commit criado.  
✅ `git diff` limpo ao final da sprint.
