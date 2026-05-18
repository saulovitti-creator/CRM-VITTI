# Estratégia de Backup e Restore - TiDB Cloud Starter

## Visão Geral
O CRM Vitti utiliza o TiDB Cloud Starter (Cluster0, Região us-east-1). Esta documentação estabelece a estratégia mínima e segura de backup e restore para o banco de dados antes da evolução para a arquitetura multi-tenant, visando garantir resiliência contra perdas acidentais de dados sem escalar os custos operacionais precocemente.

## Diagnóstico do Estado Atual
- **Backups Automáticos:** O TiDB Cloud Starter possui rotinas automáticas nativas ativas por padrão.
- **Retenção (Tier Gratuito estrito):** A retenção é limitada a 1 dia se o spending limit estiver desativado/zerado.
- **Retenção (Spending Limit > $0):** Permite configuração da janela de retenção entre 1 e 30 dias (o projeto atual possui um teto configurado de US$10/mês).
- **Limitações Atuais:** 
  - Não é possível engatilhar um backup automático "sob demanda" (manual trigger) via interface para instâncias Starter/Essential. 
  - O restore a partir de um backup automático exige a criação de um **novo cluster/instância**, não sobrepondo a instância original in-place.
  - A ferramenta nativa de Export tem prazo de expiração (o download fica disponível apenas por 48 horas).

## Decisão Recomendada
Adoção de uma **Estratégia Híbrida Mínima**:
1. **Camada Emergencial (Backups Automáticos):** Utilizar a infraestrutura padrão do TiDB. Deve-se ajustar a retenção para pelo menos 7 dias dentro da franquia estabelecida.
2. **Camada Controlada (Dumps Lógicos Ocasioanais):** Como não queremos migrar para o plano Dedicated, a camada complementar envolve dumps `.sql` periódicos executados manualmente ou via script utilitário (`scripts/backup-tidb.ps1`). Esta abordagem também garante que o schema local e as migrations acompanhem instâncias de dados para simulações locais rápidas.

## Frequência de Backup Recomendada
- **Backups Automáticos:** Diários (gerenciados e executados pelo próprio TiDB Cloud).
- **Dumps Manuais (Export/Script):**
  - **Mensalmente**, para arquivamento frio.
  - **Sempre que for aplicar uma Migration estrutural grande** (ex: adição do schema de Agências/Multi-tenant).

## Procedimentos

### 1. Exportação Web (TiDB Cloud Dashboard)
Útil para gerar backups nativos garantidos pela ferramenta.
1. Faça login no [TiDB Cloud Console](https://tidbcloud.com/).
2. Navegue até **Clusters** > Selecione o **Cluster0** > **Export**.
3. Escolha as bases desejadas e selecione o formato **SQL**.
4. Após a conclusão da tarefa ("Export Job"), os arquivos ficarão retidos na plataforma por **2 dias**.
5. *Nota:* Pode ser exigida a autenticação via TiDB Cloud CLI (`ticloud`) para o download seguro dos artefatos locais a depender das configurações de rede do painel.

### 2. Exportação Local (Script Utility)
Utilizando o script auxiliar disponibilizado no projeto (`scripts/backup-tidb.ps1`), você fará um dump através do protocolo MySQL.
1. Garanta que o pacote `mysqldump` ou similar está instalado e mapeado no PATH do seu Windows.
2. Abra o PowerShell.
3. Configure as variáveis de ambiente locais (`$env:TIDB_HOST`, `$env:TIDB_USER`, `$env:TIDB_PASSWORD`, `$env:TIDB_DATABASE`) ou passe-as como argumentos estritos:
   ```powershell
   .\scripts\backup-tidb.ps1
   # Nota: O script usará automaticamente as variáveis de ambiente TIDB_HOST, TIDB_USER, TIDB_PASSWORD e TIDB_DATABASE.
   ```
4. O arquivo será gerado na subpasta `outputs/backups/`.

### 3. Procedimento de Restore (Recuperação de Desastre)

**Cenário A: Desastre Total (Uso do Backup Automático)**
1. No painel TiDB Cloud, vá na aba **Backups**.
2. Localize o snapshot do dia desejado e clique em **Restore**.
3. O TiDB iniciará o provisionamento de um **Novo Cluster** (o Starter bloqueia restore in-place para prevenir conflitos).
4. Após o cluster estar ativo, anote a nova URL de conexão (Connection String).
5. Acesse o Render (PaaS) e atualize a variável `DATABASE_URL` na aplicação Node com as novas credenciais.
6. A aplicação irá restabelecer comunicação sem precisar de rebuild (apenas restart).

**Cenário B: Recuperação Lógica (Uso de Arquivo .SQL)**
1. Pegue o arquivo gerado via `backup-tidb.ps1` ou Export Web.
2. Autentique-se no cluster atual via cliente compatível (MySQL Workbench, DBeaver, Drizzle Studio, ou linha de comando mysql).
3. Execute as queries SQL para reinserir registros corrompidos ou recriar a tabela. 
*Atenção: A execução de drops e recreações deve ser avaliada isoladamente para não afetar as foreign keys.*

## Checklist de Validação Periódica
Recomenda-se executar estas etapas antes da implantação da Feature de Multi-tenant:
- [ ] Validar se as variáveis de ambiente necessárias não estão hardcoded.
- [ ] Executar o script `.ps1` localmente e conferir o peso e conteúdo do `.sql` gerado.
- [ ] Tentar instanciar o dump lógico dentro de um container MySQL/MariaDB Docker local apenas para testar a consistência do schema.
- [ ] Conferir o painel da conta TiDB Cloud certificando-se de que o Spending Limit ($10) abrange as retenções diárias.

## Riscos Remanescentes
1. **O Restore cria novo Cluster:** Restaurar um backup automático nativamente pode forçar a criação de um novo Serverless Cluster. Isso é prático, mas caso a conta ultrapasse o limite de instâncias ou do "Spending Limit", o restore pode falhar por falta de saldo/cotação no Free Tier.
2. **Exposição de Dados via Dump:** O arquivo SQL gerado pelo script não possui encriptação in-rest atrelada ao utilitário por padrão. A máquina local precisa estar blindada ou o arquivo exportado enviado em seguida para um cofre (ex: Bitwarden ou pasta local de backup cifrada).
