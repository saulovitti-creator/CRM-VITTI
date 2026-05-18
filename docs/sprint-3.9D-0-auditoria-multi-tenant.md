# Sprint 3.9D-0 — Auditoria Multi-Tenant / Modelo Agência

> **Data:** 2026-05-18  
> **Autor:** Auditor Técnico — CRM Vitti  
> **Status:** SOMENTE LEITURA — Nenhum arquivo foi alterado  
> **git diff:** limpo

---

## 1. Resumo Executivo

**O CRM Vitti, em seu estado atual, NÃO está preparado para multi-tenant.**

O sistema foi construído como uma instância única sem qualquer conceito de isolamento por conta, organização, agência ou subconta. Não existe nenhuma coluna `accountId`, `tenantId` ou `workspaceId` em nenhuma tabela do banco de dados. Todas as queries retornam dados globais, sem filtragem por proprietário.

A consequência direta é que, se um segundo cliente/subconta fosse adicionado hoje, todos os seus dados (contatos, oportunidades, pipelines, tags, campos personalizados, notas, tarefas) seriam completamente misturados com os dados do primeiro cliente, sem qualquer barreira técnica de separação.

**Os três riscos mais graves identificados:**

1. **Vazamento total de dados:** qualquer usuário autenticado consegue ler todos os contatos, oportunidades, notas e tarefas de todos os outros clientes.
2. **Tags e Custom Fields globais com constraint UNIQUE:** a tabela `tags` tem restrição de unicidade no campo `name`, o que significa que dois clientes não podem ter uma tag com o mesmo nome (ex: "VIP"), gerando conflito de integridade ao escalar.
3. **Dashboard agrega dados de toda a instância:** as queries de métricas comerciais não possuem nenhum filtro de conta, o que significa que o Dashboard mostraria KPIs misturados de todos os clientes.

A boa notícia é que a arquitetura de backend (tRPC + Drizzle + Express) é bem estruturada e receptiva a uma migração controlada. A Sprint 3.9D-1 pode ser iniciada com confiança no planejamento, desde que o isolamento seja introduzido de forma sistemática, começando pelo schema.

---

## 2. Estado Atual da Arquitetura

### 2.1 Usuários (`users`)
O modelo de usuários é global. Existe apenas um campo `role` com valores `"admin"` ou `"user"`. Não há conceito de "usuário pertencente a uma subconta". O admin é determinado comparando o `openId` do usuário com a variável de ambiente `ENV.ownerOpenId` no momento do upsert. Não existe tabela de membros de conta ou vínculo de usuário a um workspace.

### 2.2 Contatos (`contacts`)
A listagem de contatos (`getContacts`) retorna **todos os contatos do banco sem nenhum filtro de proprietário**. A verificação de duplicidade (`email` ou `phone`) é feita globalmente — um cliente B não pode ter um contato com o mesmo e-mail de um cliente A, mesmo que sejam empresas distintas.

### 2.3 Oportunidades (`opportunities`)
A listagem (`getOpportunities`) aceita filtros opcionais por `pipelineId`, `stageId`, `contactId` e `status`, mas todos esses filtros são opcionais. Sem filtros, a query devolve **todas as oportunidades da instância**. Não há conceito de dono da oportunidade.

### 2.4 Pipelines e Stages
Os pipelines são completamente globais. Qualquer usuário autenticado pode listar e visualizar todos os pipelines (via `protectedProcedure`). A criação, edição e exclusão de pipelines é restrita ao `adminProcedure`, mas isso significa "admin global", não "admin do cliente". Não existe o conceito de pipeline pertencer a uma subconta.

### 2.5 Notas e Tarefas
Notas (`opportunityNotes`) e tarefas (`opportunityTasks`) são acessíveis por ID de oportunidade. Como a oportunidade não tem `accountId`, qualquer usuário que conheça o `opportunityId` consegue acessar suas notas e tarefas.

### 2.6 Tags
Tags são **completamente globais** e possuem constraint `UNIQUE` no campo `name`. Não há como dois clientes terem tags com o mesmo nome. Ao escalar para multi-tenant, essa restrição precisará ser convertida para `UNIQUE(name, accountId)`.

### 2.7 Custom Fields (Definições e Valores)
As definições de campos personalizados (`customFieldDefinitions`) são globais. Um campo criado por um admin está disponível para todos os contatos/oportunidades da instância, independentemente de qual cliente pertence. Os valores (`customFieldValues`) são vinculados por `entityId + entityType`, sem isolamento de conta.

### 2.8 Importação XLSX
A importação em massa (`import.bulkImport`) é protegida por `adminProcedure` (correto), mas ao criar contatos, oportunidades e associar tags, **não escreve nenhum `accountId`**, pois ele não existe. Toda importação vai para o pool global de dados.

### 2.9 Dashboard e Métricas
A função `getDashboardStats` executa múltiplas queries sobre a tabela `opportunities` com filtros opcionais de `pipelineId` e intervalo de datas. Sem `pipelineId`, os KPIs agregam **todas as oportunidades do banco de dados**. No modelo agência, isso significaria que o Dashboard de um cliente A mostraria métricas que incluem oportunidades do cliente B.

### 2.10 Kanban
O Kanban carrega oportunidades via `opportunities.list` com filtro por `pipelineId`. Como o pipeline é global e qualquer usuário pode ver qualquer pipeline, o Kanban não oferece isolamento real entre contas.

---

## 3. Diagnóstico por Tabela

| Tabela | Função atual | Precisa de accountId? | Nível de risco | Observações |
|---|---|---|---|---|
| `users` | Autenticação e roles globais | Não diretamente, mas precisa de vínculo a `account_members` | 🔴 Alto | Role é global; no multi-tenant precisa de role por subconta |
| `password_reset_tokens` | Reset de senha de usuários globais | Não | 🟢 Baixo | Vinculado a `userId`, sem impacto direto de tenant |
| `tags` | Labels globais para contatos | **Sim** | 🔴 Alto | `UNIQUE(name)` impedirá dois clientes com a mesma tag; precisa virar `UNIQUE(name, accountId)` |
| `custom_field_definitions` | Definição de campos extras global | **Sim** | 🔴 Alto | Campos criados por admin A aparecem para admin B |
| `custom_field_values` | Valores de campos por entidade | **Sim** (via definição) | 🔴 Alto | Isolamento depende do `definitionId` que já será isolado por conta |
| `contacts` | Lista de prospects/clientes | **Sim** | 🔴 Crítico | Query global; qualquer user vê todos os contatos |
| `contact_tags` | Relação contato ↔ tag | **Sim** (via contato) | 🔴 Alto | Herda risco do contato e da tag |
| `pipelines` | Funis de vendas globais | **Sim** | 🔴 Crítico | Pipelines de todos os clientes são visíveis a todos |
| `pipeline_stages` | Estágios dos funis | **Sim** (via pipeline) | 🔴 Crítico | Herda risco do pipeline pai |
| `opportunities` | Negócios/oportunidades globais | **Sim** | 🔴 Crítico | Sem accountId, toda listagem é global |
| `opportunity_notes` | Notas de oportunidades | **Sim** (via opportunity) | 🔴 Alto | Herda o risco da oportunidade pai |
| `opportunity_tasks` | Tarefas de oportunidades | **Sim** (via opportunity) | 🔴 Alto | Herda o risco da oportunidade pai |

---

## 4. Diagnóstico por Fluxo

### 4.1 Contatos
- **Listagem:** `getContacts()` sem `accountId` retorna TUDO. Risco crítico de exposição cruzada.
- **Criação:** Verificação de duplicidade (`email`, `phone`) é global. No multi-tenant, `email` duplicado entre clientes distintos causaria erro de `CONFLICT` indevido.
- **Edição:** `updateContact(id, data)` sem validação de propriedade. Qualquer usuário autenticado pode editar qualquer contato.
- **Impacto multi-tenant:** Todas as queries precisam de `AND contacts.accountId = :accountId`.

### 4.2 Oportunidades
- **Listagem:** `getOpportunities()` sem `accountId`. Risco crítico.
- **Criação/Edição:** Sem validação de pertencimento. Um user pode criar oportunidade apontando para um `contactId` de outro cliente.
- **Desfecho (won/lost/abandoned):** Sem verificação de propriedade — qualquer user pode fechar oportunidade de qualquer conta.
- **Impacto multi-tenant:** Todas as queries e mutations precisam de validação de `accountId`.

### 4.3 Kanban
- **Movimentação (`moveToStage`):** Verifica apenas se o `stageId` pertence ao mesmo `pipelineId` da oportunidade. Não verifica se o usuário tem acesso àquele pipeline/conta.
- **Carregamento:** Depende da listagem global de oportunidades.
- **Impacto multi-tenant:** O Kanban precisa receber o `accountId` do contexto do usuário logado e filtrar tanto oportunidades quanto pipelines.

### 4.4 Dashboard
- **`getDashboardStats`:** Executa ~10 queries simultâneas sobre `opportunities` sem `accountId`. KPIs são globais.
- **`getFollowUpAlerts`:** Retorna oportunidades frias de toda a instância.
- **Impacto multi-tenant:** Ambas as funções precisam receber `accountId` como parâmetro obrigatório e aplicá-lo em todas as queries.

### 4.5 Importação XLSX
- **Proteção:** Corretamente restrita ao `adminProcedure`.
- **Problema:** Ao criar contatos, oportunidades, tags e vínculos, não existe `accountId` para gravar. No modelo agência, a importação precisará saber "em qual subconta estou importando".
- **Risco específico:** Se implementarmos multi-tenant sem ajustar a importação, um admin global poderia importar dados inadvertidamente sem conta alvo, ou pior, importar na conta errada.

### 4.6 Pipelines e Stages
- **Listagem:** `getAllPipelines()` retorna todos os pipelines da instância.
- **CRUD:** Protegido por `adminProcedure`, mas sem noção de "admin de qual conta".
- **Impacto multi-tenant:** Pipeline precisa de `accountId`. A listagem deve retornar apenas os pipelines da conta ativa do usuário.

### 4.7 Tags
- **Listagem:** `getAllTags()` retorna todas as tags sem filtro.
- **Problema crítico:** `UNIQUE(name)` na tabela. No multi-tenant, duas subcontas não poderão ter a mesma tag.
- **Impacto:** Requer migration para remover o UNIQUE atual e criar `UNIQUE(name, accountId)`.

### 4.8 Custom Fields
- **Definições:** Globais. Um campo "Interesse em Movelaria" criado para o cliente A aparece no formulário do cliente B.
- **Valores:** Vinculados apenas por `entityId + entityType`, sem `accountId`. Se dois clientes tiverem um contato com `id=1` (impossível hoje com chave primária única, mas possível com sharding no futuro), os valores poderiam colidir.
- **Impacto:** `customFieldDefinitions` precisa de `accountId`. As queries de valores herdam o isolamento via `definitionId`.

### 4.9 Tarefas e Notas
- **Acesso:** Por `opportunityId`, sem validação de propriedade da oportunidade.
- **Impacto multi-tenant:** Herdam automaticamente o isolamento quando `opportunities` for isolada por `accountId`, mas as queries precisarão incluir JOINs de validação.

### 4.10 Auth e RBAC
- **Role global:** `users.role` é um campo string global (`"admin"` ou `"user"`). Não existe tabela de membros de conta.
- **Session cookie:** Armazena `{ id, username, role }` — sem `accountId` ativo.
- **`adminProcedure`:** Verifica apenas `ctx.user.role === "admin"`, sem considerar a qual subconta o admin pertence.
- **Impacto:** O modelo de RBAC atual precisará ser completamente reimaginado para o modelo agência.

---

## 5. Lacunas para Modelo Agência

### 5.1 Agência (Entidade raiz)
- ❌ Não existe tabela `accounts` ou `organizations`.
- ❌ Não existe noção de "agência dona" da instância.
- ❌ Não existe `agencyOwnerId` linkando a um usuário específico.

### 5.2 Subcontas / Clientes
- ❌ Não existe tabela `subaccounts` ou `workspaces`.
- ❌ Não existe identificador único de subconta em nenhuma tabela.
- ❌ Não existe mecanismo de provisionamento de nova subconta.

### 5.3 Usuários por Subconta
- ❌ Não existe tabela de `account_members` ou equivalente.
- ❌ Não existe vínculo entre `users.id` e uma subconta específica.
- ❌ Não existe mecanismo de convite/onboarding de usuário em uma conta.

### 5.4 Roles por Subconta
- ❌ O campo `users.role` é global.
- ❌ Não existe distinção entre "admin da agência" e "admin do cliente".
- ❌ Não existe "usuário viewer" ou "usuário editor" com escopo por conta.

### 5.5 Isolamento de Dados
- ❌ Nenhuma tabela operacional tem `accountId`.
- ❌ Nenhuma query possui filtro por conta.
- ❌ Não existe middleware de contexto de conta no tRPC.

### 5.6 Pipelines por Cliente
- ❌ Pipelines são completamente globais.
- ❌ Não existe pipeline padrão por subconta.
- ❌ Não existe mecanismo de clonagem de pipeline para nova conta.

---

## 6. Riscos Arquiteturais

| # | Risco | Gravidade | Probabilidade |
|---|---|---|---|
| 1 | **Vazamento cross-tenant:** qualquer user autenticado lê dados de todos os clientes | 🔴 Crítico | Certeza |
| 2 | **Tags com UNIQUE global:** conflito de nomes ao escalar para segunda conta | 🔴 Crítico | Certeza ao adicionar 2ª conta |
| 3 | **Dashboard agrega dados de todas as contas:** KPIs comerciais misturados | 🔴 Crítico | Certeza |
| 4 | **Importação sem alvo de conta:** dados importados caem no pool global | 🔴 Alto | Certeza sem ajuste |
| 5 | **`adminProcedure` sem escopo de conta:** admin global pode alterar dados de qualquer cliente | 🔴 Alto | Certeza |
| 6 | **Duplicate check global:** dois clientes não podem ter mesmo e-mail/telefone de contato | 🟠 Médio | Alto impacto em B2B |
| 7 | **Cache do tRPC/React Query sem `accountId`:** ao trocar de conta ativa, dados de cache da conta anterior podem aparecer brevemente | 🟠 Médio | Provável sem invalidação explícita |
| 8 | **Migration sem rollback planejado:** adicionar `accountId` NOT NULL em tabelas grandes sem estratégia pode travar o banco | 🔴 Alto | Provável sem planejamento |
| 9 | **Pipeline sem dono:** ao criar a 2ª subconta, os pipelines existentes ficam sem conta proprietária | 🟠 Médio | Certeza sem migration de dados |
| 10 | **Custom Fields globais:** campos sensíveis de um cliente aparecem no formulário de outro | 🔴 Alto | Certeza |

---

## 7. Recomendação de Modelo Conceitual

> **Esta seção é apenas recomendação arquitetural. Nada deve ser implementado nesta sprint.**

### 7.1 Entidades Propostas

```
accounts (agência ou cliente raiz)
  ├── id
  ├── name
  ├── type: "agency" | "client"
  ├── parentAccountId (null = agência raiz; preenchido = subconta)
  ├── isActive
  ├── createdAt

account_members (vínculo usuário ↔ conta)
  ├── id
  ├── accountId → accounts.id
  ├── userId → users.id
  ├── role: "owner" | "admin" | "member" | "viewer"
  ├── createdAt
```

### 7.2 Tabelas Operacionais
Todas as tabelas abaixo devem receber `accountId INT NOT NULL REFERENCES accounts(id)`:

- `contacts`
- `tags`
- `custom_field_definitions`
- `pipelines`
- `opportunities` (herdado via `pipeline.accountId`)
- `opportunity_notes` (herdado via `opportunity.accountId`)
- `opportunity_tasks` (herdado via `opportunity.accountId`)

> `contact_tags`, `custom_field_values`, `pipeline_stages`, `opportunity_notes` e `opportunity_tasks` herdam o isolamento via FK para entidades já isoladas, não necessitando de `accountId` redundante — mas as queries precisarão fazer JOIN de validação.

### 7.3 Contexto de Conta no tRPC
Adicionar ao contexto tRPC (`ctx`) o campo `activeAccountId: number`, resolvido a partir da sessão ou de um cookie/header separado de "conta ativa". Toda query e mutation deve usar esse campo implicitamente via middleware.

### 7.4 Roles Globais vs. Roles por Conta

| Role | Escopo | Permissões |
|---|---|---|
| `superadmin` | Global (agência) | Gerenciar todas as contas, usuários, faturamento |
| `account_admin` | Por subconta | CRUD completo na própria conta |
| `account_member` | Por subconta | CRUD operacional (contatos, oportunidades) |
| `account_viewer` | Por subconta | Somente leitura |

O campo `users.role` atual (`"admin"` / `"user"`) mapearia para `"superadmin"` e `"account_member"` respectivamente, com migração de dados.

### 7.5 Nomenclatura Recomendada
Após análise do domínio do negócio, a nomenclatura recomendada é:

- **`accounts`** (mais genérico e amplamente suportado por ferramentas como Stripe, Clerk, Neon)
- **`account_members`** (padrão da indústria para vínculo usuário/conta)
- Evitar `workspaces` (conotação de ferramentas de produtividade) e `subaccounts` (pode confundir com subcontas de gateway de pagamento)

---

## 8. Ordem Recomendada dos Próximos Sprints

### Sprint 3.9D-1 — Desenho da Arquitetura Agência
**Objetivo:** Documentar formalmente o modelo conceitual (entidades, relações, roles) e obter aprovação antes de qualquer código.
- Diagrama ER completo da arquitetura multi-tenant
- Definir nomenclatura definitiva (accounts, account_members)
- Definir como o `activeAccountId` será transportado na sessão
- Definir estratégia de migração dos dados existentes
- Definir política de context middleware no tRPC
- **Entregável:** `docs/arquitetura-agencia.md` + diagrama ER

### Sprint 3.9D-2 — Plano de Migração Multi-Tenant
**Objetivo:** Planejar a migration de forma segura, sem risco de perda de dados.
- Definir a "conta padrão" para os dados existentes (Vitti Soluções como account #1)
- Planejar a sequência de ALTERs nas tabelas por ordem de dependência
- Planejar rollback de cada migration
- Planejar janela de manutenção e backup obrigatório antes da migration
- **Entregável:** `docs/plano-migracao.md`

### Sprint 3.9D-3 — Migration Base
**Objetivo:** Executar as migrations iniciais de forma controlada.
- Criar tabela `accounts`
- Criar tabela `account_members`
- Criar conta "Vitti Soluções" (id=1) e vincular usuários existentes
- Adicionar `accountId` em `contacts`, `tags`, `custom_field_definitions`, `pipelines`
- Popular `accountId = 1` para todos os registros existentes
- Ajustar UNIQUE de `tags.name` para `UNIQUE(name, accountId)`
- **Entregável:** Migrations Drizzle + dados populados

### Sprint 3.9D-4 — Isolamento por accountId (Backend)
**Objetivo:** Garantir que todas as queries e mutations filtrem por `accountId`.
- Adicionar `activeAccountId` ao contexto tRPC
- Criar middleware de verificação de membership
- Ajustar todas as queries de `db.ts` para incluir filtro `AND accountId = ctx.activeAccountId`
- Ajustar a importação XLSX para receber `accountId` do contexto
- Ajustar Dashboard e Follow-up Alerts
- **Entregável:** Backend isolado por conta + testes de validação

### Sprints Futuras (pós-3.9D-4)
- **3.9D-5:** Seletor de conta no frontend (UI para trocar de subconta ativa)
- **3.9D-6:** Gestão de subcontas (CRUD de accounts para superadmin)
- **3.9D-7:** Gestão de membros (convite, roles, remoção de usuários por conta)
- **3.9D-8:** Provisionamento inicial (pipeline padrão + tags padrão ao criar nova conta)

---

## 9. Arquivos Analisados

| Arquivo | Conteúdo auditado |
|---|---|
| `drizzle/schema.ts` | Schema completo de todas as tabelas (184 linhas) |
| `server/db.ts` | Todas as queries e mutations (1578 linhas) |
| `server/routers.ts` | Todos os endpoints tRPC e proteções de acesso (1304 linhas) |
| `server/_core/trpc.ts` | Definição de `publicProcedure`, `protectedProcedure`, `adminProcedure` |
| `server/_core/context.ts` | Resolução de contexto tRPC (usuário da sessão) |
| `server/_core/env.ts` | Variáveis de ambiente, incluindo `ownerOpenId` |
| `shared/types.ts` | Tipos compartilhados frontend/backend |
| `client/src/_core/hooks/useAuth.ts` | Hook de autenticação frontend e derivação de `isAdmin` |
| `client/src/components/DashboardLayout.tsx` | Layout principal e renderização condicional de roles |
| `client/src/pages/Home.tsx` | Ocultação de ações administrativas por `isAdmin` |
| `drizzle/0000_broad_wraith.sql` até `0005_even_cerebro.sql` | Histórico de migrations existentes |

---

## 10. O que NÃO foi Alterado

✅ **Nenhum arquivo de aplicação foi alterado.**  
✅ **Nenhuma migration foi criada.**  
✅ **Nenhum schema foi alterado.**  
✅ **Nenhuma UI foi alterada.**  
✅ **Nenhuma regra de negócio foi alterada.**  
✅ **Nenhum commit foi criado.**  
✅ **`git diff` estava limpo ao final da sprint.**  

Esta sprint foi exclusivamente de auditoria e leitura de código. Todos os entregáveis são documentação, sem efeitos colaterais na aplicação em produção.
