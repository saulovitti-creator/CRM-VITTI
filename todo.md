# CRM Prospect VLI - Réplica Manus - TODO

## Backend (tRPC + Database)

### Database Schema
- [x] Criar tabela `leads` com campos: id, company_name, contact_name, phone, email, category, status, city, notes, created_at, updated_at
- [x] Criar tabela `lead_notes` com campos: id, lead_id, content, created_at
- [x] Criar enums para lead_category (Clínica, Bar, Restaurante) e lead_status (5 status)
- [x] Executar migrations com `pnpm db:push`

### tRPC Procedures
- [x] Criar procedure para listar leads com filtros (search, category, status)
- [x] Criar procedure para criar lead
- [x] Criar procedure para atualizar lead
- [x] Criar procedure para deletar lead
- [x] Criar procedure para obter lead por ID
- [x] Criar procedure para listar notas de um lead
- [x] Criar procedure para criar nota de lead
- [x] Criar procedure para deletar nota de lead
- [ ] Criar procedure para importar leads (XLSX)
- [ ] Criar procedure para exportar leads (XLSX/CSV)
- [x] Criar procedure para limpar banco de dados (com confirmação)
- [ ] Criar procedure para atualizar status de lead
- [x] Criar procedure para obter estatísticas (cards de status)

## Frontend (React + Shadcn/UI)

### Layout & Navigation
- [x] Criar DashboardLayout com sidebar
- [x] Implementar header com logo e logout
- [x] Criar página de login
- [x] Implementar proteção de rotas

### Componentes Principais
- [x] DashboardHeader (com título e ações)
- [x] StatusCards (5 cards com contagem de leads por status)
- [x] LeadsFilters (filtro por empresa, contato, cidade, telefone)
- [x] StatusFilter (filtro por status com botões)
- [x] LeadsTable (tabela com leads, com ações de editar/deletar)
- [x] KanbanBoard (visualização Kanban com 5 colunas de status)
- [x] KanbanCard (card individual no Kanban)
- [x] KanbanColumn (coluna do Kanban)
- [x] ViewToggle (botão para alternar entre lista e Kanban)
- [ ] ImportXLSX (componente para importar arquivo XLSX)
- [ ] ExportButtons (botões para exportar em XLSX/CSV)
- [x] LeadFormDialog (modal para editar/criar lead)
- [x] DeleteLeadDialog (modal de confirmação para deletar)
- [x] LeadNotesDialog (modal para gerenciar notas do lead)
- [ ] ClearDatabaseDialog (modal de confirmação para limpar BD)
- [x] LogoutButton (botão de logout)
- [x] WhatsAppButton (botão para enviar mensagem via WhatsApp)

### Pages
- [x] Página Home (dashboard principal com todos os componentes)
- [x] Página Login (tela de login)
- [x] Página NotFound (404)

### Features
- [x] Busca em tempo real por empresa, contato, cidade, telefone
- [x] Filtro por categoria (Clínica, Bar, Restaurante)
- [x] Filtro por status (5 opções)
- [x] Visualização em lista (tabela)
- [x] Visualização em Kanban (5 colunas)
- [x] Edição de leads via modal
- [x] Deleção de leads com confirmação
- [x] Adição/edição/deleção de notas por lead
- [x] Integração com WhatsApp
- [ ] Importação de arquivo XLSX
- [ ] Exportação em XLSX
- [ ] Exportação em CSV
- [ ] Limpeza de banco de dados com confirmação
- [ ] Responsividade mobile

## Testing
- [x] Testes unitários para procedures de leads
- [x] Testes para filtros e busca
- [x] Testes para formatação de telefone WhatsApp
- [ ] Testes para importação/exportação
- [x] Testes para CRUD de leads

## Deployment
- [ ] Validar funcionamento em produção
- [ ] Criar checkpoint final
- [ ] Documentar instruções de uso

## Novas Funcionalidades (Solicitação do Usuário)

- [x] Botão "Baixar template" que gera arquivo XLSX com estrutura correta
- [x] Componente para importação de arquivo XLSX
- [x] Procedure tRPC para processar importação de leads
- [x] Validação de dados durante importação
- [x] Feedback visual durante importação (toast com sucesso/erro)
- [x] Testes para importação de XLSX

## Correções Solicitadas

- [x] Permitir campos opcionais vazios na importação (Contato, Email, Cidade, Notas)
- [x] Testar importação com dados incompletos
- [x] Validar comportamento do componente ImportXLSXDialog com campos vazios

## Teste de Carga Visual (Solicitação do Usuário)

- [x] Criar script de seed de 15 leads fictícios brasileiros
- [x] Adicionar categoria Empresa ao schema
- [x] Implementar badges coloridos para Nicho (Clínica, Restaurante, Bar, Empresa)
- [x] Implementar badges coloridos para Status (Entrar em contato, Contatado, Não Respondeu, Interessado, Não possui Interesse)
- [x] Melhorar cards de estatísticas com cores vibrantes (Azul, Laranja, Cinza, Verde, Slate)
- [x] Adicionar botão "Limpar Base de Dados" com confirmação
- [x] Testar interface com 15 leads fictícios
- [x] Validar responsividade com dados de teste
- [x] Executar testes (21 testes passando)

## Bug Fix - Importação XLSX

- [x] Corrigir loop de inserção para iterar corretamente sobre todos os leads
- [x] Implementar fallback para status inválido (usar "Entrar em contato" como padrão)
- [x] Adicionar tratamento de erro detalhado com feedback visual
- [x] Permitir importação parcial (importar válidos, mostrar erros dos inválidos)
- [x] Retornar detalhes de cada linha (sucesso/erro com motivo)
- [x] Validar que todas as linhas válidas são inseridas
- [x] 21 testes passando

## Nova Funcionalidade - Coluna "Site"

- [x] Adicionar campo `site` ao schema do Drizzle
- [x] Executar migration no banco de dados
- [x] Atualizar template XLSX com coluna "site"
- [x] Atualizar função de importação para processar campo "site"
- [x] Atualizar tabela de visualização para mostrar coluna "site"
- [x] Atualizar componente LeadFormDialog para editar campo "site"
- [x] Atualizar procedures create e update com validação de URL
- [x] 21 testes passando

## Sistema de Abas (CRM vs Site) - Nova Solicitação

- [x] Adicionar campo "tipo" ao schema do Drizzle (enum: "CRM" | "Site")
- [x] Executar migration do banco de dados
- [x] Criar componente TabBar com design especificado (azul ativo, cinza inativo)
- [x] Implementar localStorage para persistir aba selecionada
- [x] Atualizar procedures para filtrar por tipo
- [ ] Atualizar tabela de visualização para mostrar tipo
- [ ] Adicionar coluna "tipo" ao template XLSX
- [ ] Atualizar função de importação para processar tipo
- [x] Mostrar contadores por aba (ex: "CRM (8)")
- [x] Implementar filtro por tipo em todas as queries
- [ ] Atualizar componente LeadFormDialog para usar tipo da aba ativa
- [ ] Adicionar opção "Limpar apenas aba atual" no ClearDatabaseDialog
- [ ] Testar importação com tipos diferentes
- [x] Testar persistência de aba ao recarregar página
- [x] Validar contadores em tempo real

## Redesign Premium - Tema Dark e Glass Morphism

### Design System
- [x] Atualizar paleta de cores para tema dark (tons de #0f172a, #1e293b)
- [x] Criar gradientes sofisticados no background
- [x] Implementar glass morphism em cards (backdrop-blur, rgba)
- [x] Adicionar bordas com brilho sutil (cyan/azul neon)
- [x] Configurar sombras em múltiplas camadas

### Componentes Atualizados
- [x] Header com fundo dark e gradiente
- [x] TabBar com glass morphism e efeitos hover
- [x] Cards de Status com glass morphism e sombras profundas
- [x] Filtros com design dark e bordas neon
- [x] Tabela com linhas alternadas e hover effects
- [x] Botões com efeitos hover e transições suaves
- [x] Modais com backdrop blur e glass morphism

### Efeitos Visuais
- [x] Hover effects com elevação nos cards
- [x] Brilho intensificado ao passar mouse
- [x] Transições suaves em todas as interações
- [x] Animações de entrada para componentes
- [x] Efeito de foco com glow em inputs

### Testes Visuais
- [x] Validar contraste de cores para acessibilidade
- [x] Testar responsividade com novo design
- [x] Verificar performance das animações
- [x] Testar em diferentes navegadores
- [x] 22 testes passando (sem regressões)

## Aprimoramento TabBar e Header - Nova Solicitação

### TabBar Premium
- [x] Substituir emojis por ícones Lucide (Settings/Wrench para CRM, Globe para Site)
- [x] Implementar gradientes mais brilhantes e dinâmicos
- [x] Adicionar efeito de ripple ao clicar
- [x] Animações de entrada suaves
- [x] Transições mais fluidas ao trocar de abas
- [x] Adicionar underline animado na aba ativa

### Header Profissional
- [x] Aplicar gradiente escuro com glass morphism no background
- [x] Aumentar font-weight do título (bold/900)
- [x] Melhorar tipografia com tamanho maior
- [x] Adicionar subtítulo com opacidade elegante
- [x] Refinar área de boas-vindas com visual mais elegante
- [x] Adicionar efeito de glow no título

### Efeitos Visuais
- [x] Transições suaves entre estados
- [x] Hover effects refinados
- [x] Animações de entrada para elementos
- [x] Efeito de brilho ao passar mouse
- [x] 22 testes passando (sem regressões)

## Sistema de Visualização Lista/Kanban - Nova Solicitação

### Toggle de Visualização
- [x] Criar componente ViewToggle com dois botões (Lista e Kanban)
- [x] Adicionar ícones Lucide (List e LayoutGrid)
- [x] Implementar destaque visual para modo ativo
- [x] Adicionar transições suaves entre modos
- [x] Persistir preferência em localStorage

### Visualização Kanban
- [x] Criar componente KanbanBoard com 5 colunas
- [x] Criar componente KanbanColumn para cada status
- [x] Criar componente KanbanCard para cada lead
- [ ] Implementar drag & drop (react-beautiful-dnd ou similar)
- [x] Adicionar contadores por coluna
- [x] Aplicar design premium dark theme
- [x] Sincronizar com filtros (busca, categoria, tipo)

### Funcionalidades
- [ ] Mover leads entre colunas (atualizar status)
- [x] Visualizar detalhes do lead no card
- [x] Editar lead do Kanban
- [x] Deletar lead do Kanban
- [x] Adicionar notas do Kanban
- [x] Filtros funcionam em ambas visualizações
- [x] Contadores atualizam em tempo real

### Testes
- [x] Testar alternância entre Lista e Kanban
- [x] Testar persistência de preferência
- [ ] Testar drag & drop
- [x] Testar filtros em Kanban
- [x] Testar sincronização de dados
- [x] 22 testes passando (sem regressões)

## Integração com WhatsApp - Nova Solicitação

### Formatação de Telefone
- [x] Criar função formatPhoneForWhatsApp
- [x] Remover caracteres especiais: (), -, espaços, +
- [x] Adicionar código do país (55) se não estiver presente
- [x] Validar que o número tenha 13 dígitos
- [x] Suportar múltiplos formatos brasileiros

### Botão WhatsApp
- [x] Criar componente WhatsAppButton
- [x] Cor verde WhatsApp (#25D366)
- [x] Ícone Lucide (MessageCircle)
- [x] Efeito hover com glow
- [x] Design compacto mas visível
- [x] Adicionar em cada linha da tabela (Lista)
- [x] Adicionar em cada card (Kanban)

### Integração WhatsApp
- [x] Gerar URL: https://web.whatsapp.com/send?phone=[NÚMERO]
- [x] Adicionar parâmetro &text= com mensagem pré-preenchida
- [x] Abrir em nova aba (target="_blank")
- [x] Codificar mensagem em URL (encodeURIComponent)
- [x] Mensagem padrão configurável

### Validação
- [x] Validar se o número de telefone existe
- [x] Validar se o número é válido
- [x] Mostrar mensagem de erro se inválido
- [x] Desabilitar botão se não houver telefone

### Testes
- [x] Testar formatação de diferentes formatos de telefone
- [x] Testar validação de números
- [x] Testar abertura de WhatsApp
- [x] Testar mensagem pré-preenchida
- [x] Testar em Lista e Kanban
- [x] 35 testes passando (sem regressões)


## Recuperação de Senha com Supabase Auth - Nova Solicitação

### Integração Supabase Auth
- [ ] Instalar e configurar @supabase/supabase-js
- [ ] Adicionar SUPABASE_URL e SUPABASE_KEY às variáveis de ambiente
- [ ] Criar cliente Supabase no servidor
- [ ] Implementar funções de autenticação Supabase

### Schema e Banco de Dados
- [ ] Adicionar campo email obrigatório na tabela users
- [ ] Adicionar campo supabaseId para rastrear usuários Supabase
- [ ] Criar tabela password_reset_tokens (token, userId, expiresAt, used)
- [ ] Executar migrations

### Backend - Procedures tRPC
- [ ] Criar procedure requestPasswordReset (email)
- [ ] Criar procedure resetPassword (token, newPassword)
- [ ] Implementar validação de token
- [ ] Implementar validação de força de senha

### Frontend - Componentes
- [ ] Adicionar botão "Esqueci minha senha" na tela de login
- [ ] Criar modal ForgotPasswordModal
- [ ] Criar tela ResetPasswordPage
- [ ] Adicionar validação de email
- [ ] Adicionar validação de força de senha

### Envio de Email via Manus Built-in API
- [ ] Implementar função sendPasswordResetEmail
- [ ] Criar template de email profissional
- [ ] Adicionar link de recuperação no email
- [ ] Testar envio de email

### Fluxo de Recuperação
- [ ] Usuário clica "Esqueci minha senha"
- [ ] Insere email e recebe confirmação
- [ ] Email com link de recuperação é enviado
- [ ] Usuário clica link e é redirecionado
- [ ] Insere nova senha com validação
- [ ] Senha é redefinida com sucesso

### Mensagens e Feedback
- [ ] Mensagem de sucesso ao enviar email
- [ ] Mensagem de erro se email não existir
- [ ] Mensagem de erro se token expirou
- [ ] Mensagem de sucesso ao redefinir senha
- [ ] Validação em tempo real de força de senha

### Testes
- [ ] Testar fluxo completo de recuperação
- [ ] Testar validação de email
- [ ] Testar expiração de token
- [ ] Testar força de senha
- [ ] Testar envio de email


## Modal de Detalhes do Lead no Kanban - Nova Solicitação

### Cards Clicáveis
- [ ] Adicionar evento de clique em cada card do Kanban
- [ ] Adicionar feedback visual ao passar mouse (hover)
- [ ] Mudar cursor para pointer
- [ ] Adicionar elevação no hover

### Modal de Detalhes
- [ ] Criar componente LeadDetailsModal
- [ ] Exibir todas as informações do lead
- [ ] Design premium dark theme
- [ ] Animações suaves de abertura/fechamento

### Funcionalidades do Modal
- [ ] Botão para fechar (X ou ESC)
- [ ] Botão para editar lead
- [ ] Botão para excluir lead (com confirmação)
- [ ] Opção para mover para outro status
- [ ] Campo para adicionar notas/observações

### UX
- [ ] Fechar ao clicar fora do modal
- [ ] Fechar ao pressionar ESC
- [ ] Responsivo em mobile
- [ ] Backdrop blur
- [ ] Transições suaves

### Testes
- [ ] Testar abertura/fechamento do modal
- [ ] Testar edição de lead
- [ ] Testar exclusão de lead
- [ ] Testar movimento entre status
- [ ] Testar adição de notas

## Novos Campos de Valor - Nova Solicitação

### Database Schema
- [x] Adicionar campo `implementationValue` (decimal, opcional) ao schema Drizzle
- [x] Adicionar campo `recurringValue` (decimal, opcional) ao schema Drizzle
- [x] Executar migration com `pnpm db:push`

### tRPC Procedures
- [x] Atualizar procedure create para incluir novos campos
- [x] Atualizar procedure update para incluir novos campos
- [x] Atualizar procedure getById para retornar novos campos

### Frontend - Modal de Detalhes
- [x] Adicionar campos numéricos no modal LeadDetailsModal
- [x] Implementar edição inline dos valores
- [x] Adicionar validação de números positivos
- [x] Mostrar formatação de moeda (R$) nos campos

### Frontend - Visualização
- [x] Exibir valores no card do Kanban (resumido)
- [x] Exibir valores na tabela Lista (colunas adicionais)
- [ ] Adicionar tooltip com valores completos

### Testes
- [x] Testar criação de lead com valores
- [x] Testar atualização de valores
- [x] Testar validação de números
- [x] Testar formatação de moeda
- [x] Validar que campos são opcionais

## Correção - Edição de Valores na Tabela Lista

- [x] Adicionar modal de detalhes ao clicar em linha da tabela
- [x] Permitir edição de todos os campos incluindo Valor Implantação e Valor Recorrência
- [x] Sincronizar dados ao salvar
- [x] Testar edição na tabela Lista

## Nova Feature - Coluna de Valor Total

- [x] Adicionar coluna "Valor Total" na tabela Lista
- [x] Implementar cálculo: Valor Implantação + Valor Recorrência
- [x] Exibir valor formatado em reais (R$)
- [x] Adicionar destaque visual para leads de maior valor
- [x] Testar cálculo com diferentes combinações de valores

## Status de Saída do Funil com Rastreamento - Nova Solicita\u00e7\u00e3o

### Database Schema
- [x] Adicionar campo `status_final` (enum: perdido, abandonado, ganho, null)
- [x] Adicionar campo `data_status_final` (timestamp)
- [x] Adicionar campo `motivo_saida` (texto, opcional)
- [x] Adicionar campo `valor_fechado` (decimal, para status ganho)
- [x] Adicionar campo `mes_referencia` (texto, formato YYYY-MM)
- [x] Adicionar campo `tempo_no_funil` (inteiro, dias)
- [x] Executar migration com `pnpm db:push`

### Constantes e Tipos
- [x] Adicionar novos status às constantes LEAD_STATUSES
- [x] Adicionar cores para PERDIDO (#EF4444), ABANDONADO (#6B7280), GANHO (#10B981)
- [x] Atualizar tipos de status em shared/types.ts

### tRPC Procedures
- [x] Criar procedure para mover lead para status final
- [x] Implementar cálculo de tempo_no_funil
- [x] Implementar cálculo de mes_referencia
- [x] Adicionar validação para valor_fechado em status ganho
- [x] Atualizar procedure getById para retornar novos campos

### Frontend - Kanban
- [x] Adicionar três novas colunas ao board Kanban
- [x] Implementar drag & drop para status finais
- [x] Adicionar cores visuais para cada status final
- [x] Implementar callback para capturar movimento

### Frontend - Modal de Valor Fechado
- [x] Criar modal para capturar valor_fechado quando status = ganho
- [x] Adicionar campo de motivo_saida (opcional)
- [x] Implementar validação de valores positivos
- [x] Salvar dados ao confirmar

### Frontend - Filtro Visual
- [x] Adicionar toggle para mostrar/ocultar leads finalizados
- [x] Filtrar leads com status_final preenchido do funil ativo
- [ ] Criar se\u00e7\u00e3o separada para "Leads Finalizados"
- [ ] Manter dados completos para an\u00e1lise

### Testes
- [x] Testar criação de novos status
- [x] Testar cálculo de tempo_no_funil
- [x] Testar cálculo de mes_referencia
- [x] Testar captura de valor_fechado
- [x] Testar filtro visual de funil ativo
- [x] Testar drag & drop para status finais

## Justificativa Obrigatória e Relatório de Motivos - Nova Solicitação

### Schema e Procedures
- [x] Tornar campo motivoSaida obrigatório no banco de dados
- [x] Atualizar procedure moveToFinalStatus para validar justificativa
- [x] Criar procedure para listar leads finalizados com filtros
- [x] Criar procedure para análise de motivos (agrupamento por motivo)

### Frontend - Modal Atualizado
- [x] Tornar campo "Motivo da Saída" obrigatório
- [x] Adicionar validação de texto mínimo (10 caracteres)
- [x] Desabilitar botão confirmar até preencher justificativa
- [x] Mostrar contador de caracteres

### Frontend - Página de Relatório
- [x] Criar página Reports/LeadExitAnalysis.tsx
- [x] Implementar tabela com leads finalizados (empresa, status, motivo, data)
- [x] Adicionar filtros por: período, status final, categoria
- [x] Implementar gráfico de motivos mais comuns (pizza/barra)
- [x] Mostrar estatísticas: total perdidos, total abandonados, taxa de conversão
- [x] Adicionar busca por texto no motivo

### Navegação
- [x] Adicionar link para página de relatório no menu principal
- [x] Criar rota /reports/exit-analysis
- [ ] Adicionar breadcrumb na página

### Testes
- [x] Testar validação de justificativa obrigatória
- [x] Testar filtros do relatório
- [x] Testar gráficos de análise
- [x] Testar busca por motivo

## Filtro de Data de Criação - Nova Solicitação

### Database Schema
- [x] Adicionar campo `dataCriacao` (timestamp) ao schema Drizzle
- [x] Definir valor padrão como NOW() para novos leads
- [x] Executar migration com `pnpm db:push`
- [x] Atualizar leads existentes com timestamp atual

### tRPC Procedures
- [x] Atualizar procedure list para aceitar filtros de data (dataInicial, dataFinal)
- [x] Criar procedure para listar leads por período específico
- [ ] Adicionar validação de datas (não permitir futuras ou > 10 anos atrás)
- [ ] Atualizar procedure stats para considerar filtro de data

### Frontend - Componente de Filtro
- [x] Criar componente DateFilterDropdown.tsx
- [x] Implementar atalhos rápidos (Hoje, Últimos 7 dias, Últimos 30 dias, Este mês, Mês passado, Este ano)
- [x] Adicionar período personalizado (data inicial e final)
- [x] Adicionar data específica (um dia)
- [x] Mostrar badge quando filtro ativo com opção de limpar
- [x] Integrar ao componente Home.tsx

### Frontend - Cards Kanban
- [x] Adicionar badge de data nos cards (formato: dd/mm/yyyy ou "há X dias")
- [x] Implementar tooltip com timestamp completo ao hover
- [x] Estilizar badge com cor discreta

### Frontend - Modal de Novo Lead
- [x] Adicionar opção de data de criação no LeadFormDialog
- [x] Por padrão usar data/hora atual
- [ ] Permitir data personalizada apenas para admin
- [ ] Validar datas retroativas

### Frontend - Importação
- [ ] Atualizar ImportXLSXDialog para mapear coluna de data
- [ ] Suportar formatos: dd/mm/yyyy, yyyy-mm-dd, dd-mm-yyyy, mm/dd/yyyy, Unix timestamp
- [ ] Adicionar fallback para data atual se não houver coluna de data
- [ ] Validar datas durante importação
- [ ] Mostrar preview dos primeiros 3 registros

### Frontend - Indicadores e Exportação
- [ ] Atualizar cards de indicadores para refletir filtro de data
- [ ] Adicionar coluna "Data de Criação" no CSV exportado
- [ ] Respeitar filtro de data na exportação
- [ ] Mostrar período ativo no header

### Persistência
- [ ] Salvar preferência de filtro no localStorage
- [ ] Restaurar filtro ao recarregar página
- [ ] Adicionar botão "Limpar todos os filtros"

### Testes
- [ ] Testar criação de lead com data automática
- [ ] Testar filtros de atalhos rápidos
- [ ] Testar período personalizado
- [ ] Testar importação com diferentes formatos de data
- [ ] Testar validação de datas futuras/antigas
- [ ] Testar persistência do filtro
- [ ] Testar exportação com filtro ativo

## Limpeza de Usuários e Recuperação de Senha - Nova Solicitação

### Database
- [x] Limpar todos os usuários da tabela users
- [x] Adicionar campos passwordResetToken e passwordResetExpires à tabela users
- [x] Executar migration com `pnpm db:push`

### Backend - Procedures tRPC
- [x] Criar procedure para solicitar recuperação de senha (requestPasswordReset)
- [x] Criar procedure para validar token de reset (validateResetToken)
- [x] Criar procedure para resetar senha (resetPassword)
- [x] Implementar geração de token seguro com expiração (15 minutos)

### Backend - Email
- [x] Integrar API built-in do Manus para envio de email
- [x] Criar template de email com link de reset
- [x] Implementar envio de email na procedure requestPasswordReset

### Frontend - Página de Reset
- [x] Criar página ResetPassword.tsx com formulário
- [x] Implementar validação de token na URL
- [x] Adicionar campos de nova senha e confirmação
- [x] Mostrar mensagens de sucesso/erro

### Frontend - Modal de Recuperação
- [x] Adicionar botão "Esqueci minha senha" na página de login
- [x] Criar modal com campo de email
- [x] Implementar validação e envio
- [x] Mostrar mensagem de sucesso com instruções

### Testes
- [x] Testar limpeza de usuários
- [x] Testar geração de token de reset
- [x] Testar envio de email
- [x] Testar validação de token expirado
- [x] Testar reset de senha

## Redesenho do Dashboard de Análise - Nova Solicitação

### Header e Navegação
- [x] Adicionar header fixo no topo com background escuro (#0A1628)
- [x] Logo/título "CRM Prospect VLI" no canto esquerdo
- [x] Botão "← Voltar ao CRM" com navegação
- [x] Botão "Análise" destacado indicando página ativa
- [ ] Informações do usuário no canto direito

### Título da Página
- [x] H1 grande e bold "Análise e Saída de Funil"
- [x] Subtítulo "Acompanhe motivos de perda e abandono de leads"
- [x] Ícone de gráfico/análise ao lado do título
- [x] Padding generoso (32px no topo)

### Cards de Métricas
- [x] Redesenhar com fundo branco e sombra sutil
- [x] Bordas arredondadas (12px)
- [x] Ícones representativos em cada card
- [x] Título em cinza (#6B7280)
- [x] Número grande e bold (48px)
- [x] Barra de cor na borda esquerda por status
- [ ] Mini gráfico sparkline abaixo do número
- [x] Hover effect com elevação de sombra

### Seção de Filtros
- [x] Container com fundo branco e bordas arredondadas
- [x] Ícone de filtro ao lado do título
- [x] Filtros em linha horizontal
- [x] Inputs e selects com design moderno
- [x] Botão "Limpar Filtros" no canto direito

### Gráficos
- [x] Grid 2 colunas (50% cada)
- [x] Cards brancos com padding 32px
- [x] Gráfico de pizza (Distribuição por Status)
- [x] Gráfico de barras (Motivos Mais Comuns)
- [x] Estados vazios com ilustração SVG

### Tabela de Leads Finalizados
- [x] Header fixo com fundo cinza claro
- [x] Linhas alternadas (zebra striping)
- [x] Hover state nas linhas
- [x] Badges coloridos para status
- [ ] Ações (ícones) no final de cada linha

### Paleta de Cores
- [x] Background: #F3F4F6
- [x] Cards: #FFFFFF
- [x] Texto primário: #111827
- [x] Texto secundário: #6B7280
- [x] Bordas: #E5E7EB
- [x] Accent blue: #3B82F6
- [x] Success green: #10B981
- [x] Warning orange: #F59E0B
- [x] Error red: #EF4444

### Responsividade e Microinterações
- [x] Grid de gráficos 1 coluna em <1024px
- [x] Cards de métricas 2 colunas em tablets
- [ ] Menu hamburger em mobile
- [x] Transições suaves (0.3s ease)
- [ ] Loading skeletons
- [ ] Animação fade in + slide up dos cards

### Acessibilidade
- [x] Contraste mínimo 4.5:1 em textos
- [x] Focus indicators visíveis
- [x] Labels descritivos em inputs
- [x] Aria-labels em ícones

## Melhorias de Visibilidade no Header - Nova Solicitação

- [x] Botão "Análise" com azul vibrante por padrão
- [x] Botão "Análise" com hover em vermelho metálico
- [x] Botão "Sair" com azul vibrante por padrão
- [x] Botão "Sair" com hover em vermelho metálico
- [x] Melhorar contraste dos botões contra fundo escuro do header

## Sistema de Gerenciamento de Colunas do Kanban - Nova Solicitação

### Database Schema
- [ ] Criar tabela `kanbanColumns` com campos: id, nome, cor, descrição, ordem, createdAt, updatedAt
- [ ] Adicionar coluna `columnId` à tabela `leads` para referência
- [ ] Executar migration com `pnpm db:push`

### Backend - Procedures tRPC
- [x] Criar procedure para listar todas as colunas com contagem de leads
- [x] Criar procedure para criar nova coluna
- [x] Criar procedure para editar coluna existente
- [x] Criar procedure para excluir coluna (com validações)
- [x] Criar procedure para mover leads entre colunas
- [x] Criar procedure para reordenar

### Frontend - Modal de Gerenciamento
- [x] Listar todas as colunas com nome, cor, descrição
- [x] Mostrar contagem de leads por coluna
- [x] Botões de ação: editar, deletar, reordenar
- [x] Barra de busca para filtrar colunas
- [x] Botão "Nova Coluna"
- [x] Design profissional com dark theme

### Frontend - Formulário de Criar/Editar
- [x] Campo "Nome" (obrigatório, 2-50 caracteres)
- [x] Seletor de cor (color picker ou cores predefinidas)
- [x] Campo "Descrição" (opcional, máx 200 caracteres)
- [x] Preview da cor ao lado do input
- [x] Validações em tempo real

### Frontend - Fluxo de Exclusão
- [x] Verificar quantidade de leads na coluna
- [x] Se vazio: modal de confirmação simples
- [x] Se com leads: modal com aviso bloqueador
- [x] Campo de seleção para coluna de destino
- [x] Checkbox de confirmação obrigatório (movimentação de leads)
- [x] Proteção: não permitir exclusão se restar < 2 colunas

### Frontend - Reordenação
- [x] Implementar botões ↑↓ para reordenar colunas
- [x] Atualizar ordem no Kanban imediatamente
- [x] Salvar ordem no banco de dados

### Frontend - Integração
- [x] Adicionar botão "⚙️ Gerenciar Colunas" no header do Kanban
- [x] Integrar modal de gerenciamento
- [x] Atualizar Kanban quando colunas forem alteradas

### UX e Feedback
- [x] Implementar toasts para sucesso/erro
- [x] Loading states em ações assíncronas
- [x] Animações suaves ao abrir/fechar modais
- [x] Mensagens de erro claras e destacadas
- [x] Ícones intuitivos para cada ação

### Acessibilidade
- [ ] Aria-labels em todos os botões
- [ ] Focus trap nos modais
- [ ] ESC para fechar modais
- [ ] Tab navigation funcional
- [ ] Contraste adequado nas cores

### Testes
- [ ] Testar criação de coluna
- [ ] Testar edição de coluna
- [ ] Testar exclusão de coluna vazia
- [ ] Testar exclusão de coluna com leads
- [ ] Testar proteção de coluna mínima
- [ ] Testar reordenação de colunas
- [ ] Testar validações de nome duplicado

## Redesign da Tela de Gerenciamento de Colunas - Nova Solicitação

### Listagem de Colunas Existentes
- [x] Badge colorido à esquerda do nome
- [x] Nome em fonte semibold (16px), branco
- [x] Contador de leads com ícone 📊 (linha abaixo)
- [x] Ícone de lixeira vermelho (#EF4444)
- [x] Ícone de editar azul claro
- [x] Espaçamento profissional (padding 16px, margem 12px)
- [x] Cards com fundo escuro (#1E293B), borda sutil, bordas arredondadas

### Modal de Exclusão Aprimorado
- [x] Aviso crítico com AlertTriangle icon
- [x] Listagem de leads (máx 5 visíveis + contador)
- [x] Seletor de coluna de destino
- [x] Checkbox de confirmação obrigatório
- [x] Feedback visual com cores (vermelho para aviso, verde para vazio)
- [x] Botão desabilitado até validações serem atendidas
- [x] Procedure getLeadsInColumn para buscar leads
- [x] Testes de criação, edição e exclusão (9 testes passando)


## Sistema de Importação com Bancos de Dados Separados por Aba

### Fase 1 - Detectar Aba Ativa no Upload
- [x] Identificar componente de importação de XLSX
- [x] Capturar estado da aba ativa (CRM ou Site)
- [x] Passar tipo de aba como parâmetro para função de importação
- [x] Enviar tipo junto com dados do arquivo para servidor

### Fase 2 - Backend: Receber e Aplicar Tipo Correto
- [x] Modificar procedure de importação para receber parâmetro "tipo"
- [x] Validar que tipo é "CRM" ou "Site"
- [x] Forçar tipo para todos os leads importados
- [x] Ignorar coluna "tipo" do arquivo XLSX
- [x] Aplicar tipo recebido do frontend em cada lead

### Fase 3 - Isolamento Total Entre Abas
- [x] Filtrar listagem de leads por tipo
- [x] Filtrar contadores de status por tipo
- [x] Filtrar busca e filtros por tipo
- [x] Filtrar cards de resumo por tipo
- [x] Filtrar ações em lote por tipo
- [x] Recarregar visualizações ao mudar de aba
- [x] 12 testes validando isolamento completo

### Fase 4 - Feedback Visual Durante Importação
- [x] Indicar "Importar para CRM" ou "Importar para Site" no botão
- [x] Mostrar indicador de progresso com mensagem específica
- [x] Exibir mensagem de sucesso com aba e quantidade
- [x] Atualizar contadores das abas automaticamente
- [x] Badge colorido mostrando qual aba será importada

### Fase 5 - Testes
- [x] Testar importação para CRM
- [x] Testar importação para Site
- [x] Validar isolamento entre abas
- [x] Testar atualização de contadores


## Sistema de Tratamento de Erros de Importação

### Fase 1 - Componente de Erro Persistente
- [x] Criar ErrorAlert.tsx com ícone de exclamação
- [x] Implementar tooltip ao passar mouse
- [x] Mostrar descrição completa do erro
- [x] Adicionar sugestões de resolução
- [x] Botão para fechar/descartar erro
- [x] Design profissional com dark theme

### Fase 2 - Mapeamento de Erros
- [x] Identificar tipos de erro (formato, validação, duplicação, etc)
- [x] Criar dicionário de mensagens de erro
- [x] Adicionar sugestões específicas para cada tipo
- [x] Implementar códigos de erro para rastreamento
- [x] Adicionar links para documentação/ajuda

### Fase 3 - Integração no ImportXLSXDialog
- [x] Capturar erros do backend
- [x] Exibir ErrorAlert persistente
- [x] Permitir múltiplos erros simultâneos
- [x] Manter histórico de erros
- [x] Atualizar UI com status do erro

### Fase 4 - Testes e Validação
- [x] Testar erros de formato (XLSX inválido)
- [x] Testar erros de validação (campos obrigatórios)
- [x] Testar erros de duplicação (leads duplicados)
- [x] Testar múltiplos erros
- [x] Validar UX e acessibilidade
- [x] 17 testes de mensagens de erro PASSANDO


## Transformação de Categorias Fixas para Segmentos Dinâmicos

### Fase 1 - Renomear Campo no Banco de Dados
- [x] Criar migration para renomear `category` para `segment`
- [x] Remover enum fixo de categorias
- [x] Transformar campo em VARCHAR texto livre
- [x] Executar migration com sucesso

### Fase 2 - Atualizar Tipos TypeScript
- [x] Atualizar schema.ts para remover leadCategoryEnum
- [x] Atualizar shared/types.ts para remover LeadCategory
- [x] Adicionar LeadSegment como string
- [x] Atualizar todas as referências em componentes frontend
- [x] Atualizar interfaces em LeadDetailsModal e KanbanCard

### Fase 3 - Atualizar Backend (Procedures)
- [x] Modificar procedure `list` para usar `segment`
- [x] Modificar procedure `create` para aceitar string livre
- [x] Modificar procedure `update` para usar `segment`
- [x] Modificar procedure `importLeads` para usar `segment`
- [x] Atualizar função `getLeads` em db.ts

### Fase 4 - Atualizar Frontend
- [x] Atualizar ImportXLSXDialog para usar "Segmento *" em vez de "Categoria *"
- [x] Atualizar LeadFormDialog para campo de texto livre
- [x] Atualizar LeadDetailsModal para exibir "Segmento"
- [x] Atualizar KanbanCard para usar segment
- [x] Remover validação de categorias fixas

### Fase 5 - Testes
- [x] Atualizar testes em leads.test.ts
- [x] Atualizar testes em import.test.ts
- [x] Atualizar testes em import-optional-fields.test.ts
- [x] Atualizar testes em import-by-type.test.ts
- [x] Validar TypeScript sem erros


## Drag-and-Drop Kanban, Contadores e Ícones de Segmento

### Fase 1 - Drag-and-Drop Kanban
- [ ] Instalar react-beautiful-dnd
- [ ] Implementar DragDropContext no KanbanBoard
- [ ] Adicionar Droppable em cada KanbanColumn
- [ ] Adicionar Draggable em cada KanbanCard
- [ ] Implementar handler onDragEnd para atualizar status
- [ ] Criar procedure tRPC para atualizar status de lead
- [ ] Validar que status é válido antes de atualizar
- [ ] Adicionar feedback visual durante drag
- [ ] Testar movimento entre colunas

### Fase 2 - Contadores de Cards por Coluna
- [ ] Calcular quantidade de cards em cada coluna
- [ ] Adicionar badge com contador no header da coluna
- [ ] Exibir contador em tempo real
- [ ] Atualizar contador ao mover card
- [ ] Design profissional do badge (cor, tamanho, posição)
- [ ] Testar atualização de contadores

### Fase 3 - Ícones de Segmento
- [ ] Criar mapeamento de segmentos para ícones Lucide
- [ ] Adicionar ícone no card do Kanban
- [ ] Adicionar ícone na tabela Lista
- [ ] Adicionar ícone no modal de detalhes
- [ ] Permitir customização de ícones por segmento
- [ ] Testar exibição de ícones

### Fase 4 - Testes
- [ ] Testar drag-and-drop entre colunas
- [ ] Testar atualização de status no banco
- [ ] Testar contadores em tempo real
- [ ] Testar exibição de ícones
- [ ] Validar UX e responsividade


## Drag-and-Drop Kanban, Contadores e Ícones de Segmento - CONCLUÍDO

### Fase 1 - Drag-and-Drop Kanban
- [x] Instalar @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- [x] Implementar DragDropContext no KanbanBoard
- [x] Adicionar Droppable em cada KanbanColumn
- [x] Adicionar Draggable em cada KanbanCard
- [x] Implementar handler onDragEnd para atualizar status
- [x] Criar procedure tRPC updateStatus para atualizar status de lead
- [x] Validar que status é válido antes de atualizar
- [x] Adicionar feedback visual durante drag (opacity, border, shadow)
- [x] Cursor muda para "grab" e "grabbing"
- [x] Testar movimento entre colunas

### Fase 2 - Contadores de Cards por Coluna
- [x] Calcular quantidade de cards em cada coluna
- [x] Adicionar badge com contador no header da coluna
- [x] Exibir contador em tempo real
- [x] Atualizar contador ao mover card
- [x] Design profissional do badge (cor, tamanho, posição)
- [x] Testar atualização de contadores

### Fase 3 - Ícones de Segmento
- [x] Criar arquivo segment-icons.ts com mapeamento de segmentos
- [x] Mapear 50+ segmentos para ícones Lucide
- [x] Adicionar cores associadas a cada segmento
- [x] Adicionar ícone no card do Kanban
- [x] Ícone exibido com cor apropriada
- [x] Sistema extensível para novos segmentos
- [ ] Adicionar ícone na tabela Lista
- [ ] Adicionar ícone no modal de detalhes
- [ ] Permitir customização de ícones por segmento

### Fase 4 - Testes
- [x] TypeScript sem erros
- [ ] Testar drag-and-drop entre colunas
- [ ] Testar atualização de status no banco
- [ ] Testar contadores em tempo real
- [ ] Testar exibição de ícones
- [ ] Validar UX e responsividade

## Transições Suaves para Drag-and-Drop - Nova Solicitação

- [x] Instalar Framer Motion para animações fluidas
- [x] Implementar animação de pickup (card levanta com sombra maior)
- [x] Implementar animação de drag (opacidade reduzida + rotação sutil)
- [x] Implementar destaque visual de coluna ao hover
- [x] Implementar animação de drop (encaixe suave na nova posição)
- [x] Testar animações em todos os cenários
- [x] Validar performance das animações

## Refactor Drag-and-Drop - Feedback do Usuário

- [x] Remover conflitos entre Framer Motion e @dnd-kit
- [x] Implementar CSS transitions em vez de Framer Motion
- [x] Opacidade 0.6 durante drag
- [x] Scale 1.03 com sombra 0 10px 30px
- [x] Rotação 2-3deg durante movimento
- [x] Placeholder visual na zona de drop
- [x] Animação de encaixe com bounce leve
- [x] Hover effect nas colunas receptoras
- [x] Cursor grabbing durante drag
- [x] Indicação visual de zona de drop
- [x] Animação de reordenação de cards

## Refactor Final: useSortable() + CSS.Transform.toString() (Abordagem Correta)

- [x] Instalar @dnd-kit/sortable e @dnd-kit/utilities
- [x] Refatorar KanbanCard com useSortable() e CSS.Transform.toString()
- [x] Refatorar KanbanColumn com SortableContext
- [x] Refatorar KanbanBoard com sensores (PointerSensor, TouchSensor, KeyboardSensor)
- [x] Implementar handleDragEnd correto
- [x] Testar transição suave (200ms cubic-bezier)
- [x] Validar performance com 72 testes passando

## Implementação: Transição Suave Real (Sem Teleporte)

- [x] Adicionar estado animatedTransform em KanbanCard
- [x] Implementar useEffect para manter transform durante transição
- [x] Transição condicional: none durante drag, suave após drop
- [x] Transição CSS específica: transform 300ms cubic-bezier(0.2, 0, 0, 1)
- [x] Adicionar requestAnimationFrame em handleDragEnd
- [x] Adicionar will-change-transform ao card
- [x] Remover transition-all do Tailwind
- [x] Testar transição suave sem teleporte
- [x] 72 testes passando

## Correção de Bugs: Status Type e Infinite Loop

- [x] Corrigir erro de tipo: status como número em vez de string
- [x] Usar String(over.id) para garantir tipo string
- [x] Corrigir infinite loop no useEffect de KanbanCard
- [x] Adicionar JSON.stringify para comparação profunda
- [x] Testar drag-and-drop sem erros de validação
- [x] 72 testes passando

## Implementação Alternativa: DragOverlay para Transições Perfeitas

- [x] Refatorar KanbanBoard com DragOverlay e activeCard state
- [x] Simplificar KanbanCard removendo animatedTransform
- [x] Testar drag-and-drop com DragOverlay
- [x] Validar transições perfeitas no card original

## Correção: Status sendo enviado como ID numérico

- [x] Criar mapeamento de ID numérico de coluna → status string
- [x] Verificar se colunas finais existem no banco
- [x] Ajustar handleDragEnd para usar status correto
- [x] Testar drag-and-drop com status correto

## Diagnóstico: Card não está sendo movido para coluna de destino

- [ ] Verificar se over está vindo como null
- [ ] Verificar se handleDragEnd está sendo acionado
- [ ] Verificar se updateLeadStatusMutation está funcionando
- [ ] Verificar se leads.list está sendo invalidado
- [ ] Adicionar logging para debug
- [ ] Testar movimento completo do card

## Remoção Temporária: Visualização Kanban

- [x] Localizar componente principal (CRM/Site page)
- [x] Comentar importações de KanbanBoard, KanbanColumn, KanbanCard
- [x] Remover estado viewMode
- [x] Remover botão Kanban da UI
- [x] Forçar visualização permanente em Lista
- [x] Validar que Lista continua 100% funcional
- [x] Validar que base de dados não foi afetada
- [x] Validar que API endpoints continuam funcionando

## Reimplementação: Kanban do Zero (Guia Completo)

### Parte 1: Toggle Lista/Kanban
- [x] Descomente importações em Home.tsx
- [x] Adicione estado viewMode
- [x] Adicione botões de toggle Lista/Kanban
- [x] Implemente renderização condicional

### Parte 2-3: KanbanBoard e KanbanColumn
- [x] Refatore KanbanBoard.tsx com DndContext e DragOverlay
- [x] Refatore KanbanColumn.tsx com useDroppable
- [x] Configure sensores (PointerSensor com 8px distance)
- [x] Implemente closestCenter collision detection

### Parte 4: KanbanCard com Transições
- [x] Refatore KanbanCard.tsx com useSortable
- [x] Implemente transição CSS: 250ms cubic-bezier ao soltar
- [x] Remova transição durante drag (resposta imediata)
- [x] Adicione opacity 0.6, scale 1.05, rotate 2deg durante drag

### Parte 5-6: Mutation e Estilos
- [x] Integre updateStatusMutation com tRPC
- [x] Adicione invalidate de cache após sucesso
- [x] Adicione estilos de scrollbar no index.css
- [x] Configure kanban-container class

### Parte 7: Testes e Validações
- [x] Teste toggle Lista/Kanban
- [x] Teste drag-and-drop entre colunas
- [x] Valide transição suave de 250ms
- [x] Valide atualização de status no backend
- [x] Valide recarregamento de dados


## Transformação: Segmento de Dropdown Fixo para Texto Livre

- [ ] Remover validação de enum no schema do banco de dados
- [ ] Criar endpoint para buscar segmentos únicos
- [ ] Substituir dropdown por campo de texto livre no formulário
- [ ] Atualizar filtro para usar dados dinâmicos
- [ ] Testar criação de novo prospecto com segmentos personalizados
- [ ] Validar que filtro mostra todos os segmentos únicos


## Correção: Erro de Validação ao Editar Prospecto

- [x] Diagnosticar tipos incorretos em LeadDetailsModal
- [x] Manter id como number (conforme schema)
- [x] Adicionar fallback .trim() || "" para campos obrigatórios
- [x] Corrigir tipos de dados enviados para API
- [x] Testar edição de prospecto
- [x] Validar que segmento pode ser editado

## Correção: Campo Segmento Não Era Exibido na Lista

- [x] Identificar que Home.tsx renderizava lead.category em vez de lead.segment
- [x] Corrigir renderização para usar lead.segment
- [x] Adicionar testes para validar que segment é retornado corretamente
- [x] Validar que filtro de segmento funciona
- [x] Confirmar que 76 testes passando (4 novos testes de segment)

## Correção: Campo Site Impede Salvamento de Alterações

- [x] Verificar validação do campo Site em LeadDetailsModal
- [x] Remover validação obrigatória do campo Site
- [x] Adicionar validação condicional de URL (apenas se preenchido)
- [x] Adicionar asterisco (*) em campos obrigatórios
- [x] Melhorar mensagens de erro no formulário
- [x] Testar edição de Segmento sem preencher Site
- [x] Testar validação de URL quando Site for preenchido

## Correção: Modal de Edição Abre Vazio

- [x] Verificar passagem do lead ao modal LeadDetailsModal
- [x] Verificar inicialização do formulário com dados do lead
- [x] Adicionar useEffect para sincronizar formulário quando lead mudar
- [x] Garantir que ID do lead é enviado na mutation de update
- [x] Testar edição completa de prospecto
- [x] Validar que todos os campos são pré-preenchidos

## Correção: Conflito de Modais (LeadDetailsModal + LeadFormDialog)

- [x] Analisar fluxo atual de abertura de modais
- [x] Modificar Home.tsx para abrir apenas LeadFormDialog ao clicar em "Editar"
- [x] Fechar LeadDetailsModal antes de abrir LeadFormDialog
- [x] Adicionar seção "Mover para Status Final" no LeadFormDialog
- [x] Adicionar botões Perdido/Abandonado/Ganho no LeadFormDialog
- [x] Testar edição completa sem conflito de modais
- [x] Validar que salvamento funciona corretamente

## Correção: Dessincronização Badge vs Dropdown Filtro

- [x] Verificar invalidação de queries no LeadFormDialog após updateLead
- [x] Verificar consistência de nomes de campo (segment vs category)
- [x] Garantir invalidação de leads.list, leads.getUniqueSegments e leads.stats
- [x] Testar edição de segmento e verificar sincronização
- [x] Validar que badge e dropdown sempre mostram mesmo valor

## Modificação: Seletor de Aplicativo WhatsApp

- [x] Localizar código do botão WhatsApp
- [x] Modificar para permitir escolha entre WhatsApp e WhatsApp Beta
- [x] Testar funcionalidade em dispositivo móvel
- [x] Validar que seletor aparece corretamente

## Reversão: Botão WhatsApp Simples

- [x] Remover popover de seleção de aplicativo
- [x] Restaurar botão WhatsApp original (wa.me direto)
- [x] Testar funcionalidade

## Correção: Leads Criados na Aba Errada

- [x] Verificar como tipo é passado ao LeadFormDialog
- [x] Garantir que tipo da aba ativa é usado ao criar lead
- [x] Testar criação na aba CRM
- [x] Testar criação na aba Site
- [x] Validar que lead aparece na aba correta

## Implementação: Filtros Independentes por Aba

- [x] Criar hook useFiltersPersistence para gerenciar localStorage
- [x] Modificar Home.tsx para usar filtros separados por aba (CRM/Site)
- [x] Salvar filtros automaticamente ao mudar valores
- [x] Restaurar filtros ao trocar de aba
- [x] Testar persistência após recarregar página

## Implementação: Botão Limpar Filtros

- [x] Adicionar botão "Limpar Filtros" na seção de filtros
- [x] Implementar lógica para resetar todos os filtros da aba ativa
- [x] Mostrar botão apenas quando houver filtros ativos
- [x] Adicionar ícone X e estilo consistente com design dark
- [x] Testar funcionalidade em ambas as abas

## Implementação: Scanner de Duplicados na Base

### Backend
- [x] Criar arquivo server/duplicates.ts com funções de normalização
- [x] Implementar função normalizeLead (nome lowercase, telefone só números)
- [x] Implementar função groupDuplicates (clustering por nome OU telefone)
- [x] Criar procedure leads.scanDuplicates em routers.ts
- [x] Criar procedure leads.mergeDuplicates em routers.ts
- [x] Criar procedure leads.bulkDelete em routers.ts

### Frontend
- [x] Criar componente DuplicateGroupCard.tsx
- [x] Criar modal DuplicatesResolverModal.tsx
- [x] Adicionar botão "Varrer Base por Duplicados" em Home.tsx
- [x] Integrar lógica de varredura e resolução
- [x] Adicionar dropdown "Resolver Todos" com estratégias
- [ ] Testar fluxo completo de detecção e resolução


## Implementação: Filtro Rápido de Site

### Backend
- [x] Adicionar parâmetro siteStatus ao input Zod da procedure leads.list
- [x] Implementar lógica de filtro WHERE site IS NULL OR site = '' para 'without_site'
- [x] Implementar lógica de filtro WHERE site IS NOT NULL AND site != '' para 'with_site'
- [x] Importar isNotNull e ne do Drizzle

### Frontend
- [x] Adicionar siteStatus ao hook useFiltersPersistence
- [x] Implementar setSiteStatus para atualizar estado
- [x] Persistir siteStatus no localStorage por tipo (CRM/Site)
- [x] Adicionar siteStatus à query tRPC leads.list
- [x] Alterar grid de 3 para 4 colunas na seção de filtros
- [x] Adicionar novo Select "Site" com 3 opções:
  - [x] "Todos os Leads" (all)
  - [x] "Sem Site (Prioridade)" (without_site)
  - [x] "Com Site" (with_site)

### Validação
- [x] Validar que servidor está rodando sem erros
- [x] Validar que 71 testes passando
- [x] Validar que novo Select está visível na interface
- [ ] Testar filtro "Sem Site" na interface
- [ ] Testar filtro "Com Site" na interface
- [ ] Testar persistência de filtro ao trocar de aba
- [ ] Testar persistência de filtro ao recarregar página


## Correção: Contraste de Filtros (UI/UX)

### Problema
- Filtros (Input, Select) com fundo translúcido escuro e texto escuro
- Contraste muito baixo, dificultando leitura das opções

### Solução Implementada
- [x] Modificar componente Input.tsx para fundo branco e texto escuro
- [x] Modificar componente Select.tsx (SelectTrigger, SelectContent, SelectItem) para fundo branco
- [x] Atualizar classes CSS em Home.tsx para remover estilos escuros
- [x] Adicionar estilos globais em index.css para garantir fundo claro
- [x] Aplicar labels em texto escuro (text-slate-900)
- [x] Validar que 71 testes continuam passando
- [x] Validar que contraste está perfeito em todos os 4 filtros

### Resultado
- Input de Busca: fundo branco, texto escuro, placeholder cinza
- Select Segmento: fundo branco, texto escuro, dropdown com fundo branco
- Select Status: fundo branco, texto escuro, dropdown com fundo branco
- Select Site: fundo branco, texto escuro, dropdown com fundo branco
- Focus state: border cyan-500 com ring suave
- Hover state: fundo cinza claro (slate-50) nos selects


## Ajuste Final: Cor dos Labels de Filtros

### Problema
- Labels "Buscar", "Segmento", "Status", "Site" estavam em texto escuro (slate-900)
- Quase invisíveis contra fundo escuro do painel

### Solução Implementada
- [x] Alterar classe de labels em Home.tsx de `text-slate-900` para `text-white`
- [x] Todos os 4 labels agora em branco com excelente contraste
- [x] Validar que 71 testes continuam passando

### Resultado
- ✅ Labels em branco (text-white) com contraste perfeito
- ✅ Campos em branco com texto escuro (contraste máximo)
- ✅ Interface clara e profissional
- ✅ 71 testes passando


## Feature: Ícone X para Limpeza Individual de Filtros

- [x] Adicionar ícone X dentro do Input de Busca (visível quando há texto)
- [x] Adicionar ícone X dentro dos Selects (Segmento, Status, Site) quando há seleção
- [x] Implementar função de limpeza ao clicar no ícone X
- [x] Validar que todos os filtros funcionam corretamente
- [x] Executar testes e garantir que nada foi quebrado


## Feature: Bot\u00e3o "Limpar## Feature: Botão "Limpar Todos os Filtros"

- [x] Adicionar botão visual no card de Filtros
- [x] Implementar função que limpa todos os 4 filtros simultaneamente
- [x] Exibir toast de confirmação "Filtros limpos"
- [x] Testar funcionalidade e validar


## Otimização: Layout da Tabela para Full HD

- [x] Expandir container principal removendo max-width
- [x] Aplicar whitespace-nowrap nas colunas curtas
- [x] Adicionar truncate nas colunas longas (Empresa, Site)
- [x] Configurar rolagem horizontal inteligente com max-h e overflow
- [x] Testar em monitor Full HD


## Correção Crítica: Validação de Telefone (Data Loss Prevention)

- [x] Relaxar validação de telefone no schema (6-15 dígitos)
- [x] Revisar lógica de importação para aceitar fixos (10 dígitos)
- [x] Adaptar máscara de formatação no frontend (fixo/celular/genérico)
- [x] Testar importação com números fixos
- [x] Validar que nenhum lead é rejeitado por formato de telefone


## Correção: Importação Excel com Números como Telefone

- [x] Identificar problema de tipo de dados (int vs string)
- [x] Converter telefone para string antes de .trim()
- [x] Testar importação com arquivo moveis_campinas.xlsx
- [x] Validar que 71 testes continuam passando


## Feature: Exportação de Dados para XLSX

- [x] Implementar lógica de exportação com filtros
- [x] Adicionar formatação de planilha com cabeçalhos amigáveis
- [x] Implementar nomeação inteligente de arquivo com data
- [x] Adicionar estado isExporting e feedback visual
- [x] Testar exportação com dados filtrados


## Bug Crítico: Detecção de Leads Duplicados Não Funciona

- [x] Analisar procedure scanDuplicates
- [x] Adicionar logs de debug para diagnosticar
- [x] Corrigir normalização de phone e companyName
- [x] Corrigir lógica de agrupamento (Map)
- [x] Testar com dados duplicados
- [x] Remover logs de debug


## Hard Debug: Detecção de Duplicados Persiste Falhando

- [x] Verificar binding da aba ativa (type) no frontend
- [x] Adicionar logs de tamanho da busca no backend
- [x] Rastrear normalização da Janete com logs condicionais
- [x] Criar teste unitário com dados da Janete
- [x] Executar testes e analisar logs
- [x] Corrigir falha identificada
- [x] Remover logs e entregar fix


## Bug Frontend: Modal de Duplicados Mostra "0 grupos"

- [x] Analisar shape do retorno batch do tRPC
- [x] Corrigir parse do response no onSuccess (extrair data?.[0]?.result?.data?.json)
- [x] Remover filtros por type que descartam grupos "name"
- [x] Garantir keys únicas para cada grupo (evitar sobrescrita)
- [x] Testar exibição de duplicados (Janete)
- [x] Publicar versão corrigida
