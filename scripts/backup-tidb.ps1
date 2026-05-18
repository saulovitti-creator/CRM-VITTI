<#
.SYNOPSIS
Script utilitário para automatizar exportação/dump do TiDB via mysqldump como camada de backup controlada.

.DESCRIPTION
Este script executa um dump lógico do banco de dados TiDB Cloud Starter e o salva em um diretório local com timestamp.
Como o TiDB é wire-compatible com MySQL, utilizamos o mysqldump para extração dos dados de forma limpa.
O script foi projetado para NÃO conter credenciais hardcoded, priorizando segurança. Ele consome as informações do banco a partir das variáveis de ambiente já presentes no sistema operacional ou inseridas via parâmetros dinâmicos de runtime.

.PREREQUISITES
- Utilitário de banco 'mysqldump' instalado (parte do MySQL Client Tools) e disponível na variável PATH do Windows.
- Acesso de rede à instância TiDB Cloud.

.USAGE
Executar em um terminal seguro configurado com as variáveis de ambiente:
.\scripts\backup-tidb.ps1
#>

param (
    [string]$HostUrl = $env:TIDB_HOST,
    [string]$User = $env:TIDB_USER,
    [string]$Password = $env:TIDB_PASSWORD,
    [string]$Database = $env:TIDB_DATABASE,
    [string]$Port = "4000",
    [string]$BackupDir = ".\outputs\backups"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " CRM Vitti - Utilitario de Backup Manual  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Validação estrita de parâmetros mínimos para evitar execuções cegas
if (-not $HostUrl -or -not $User -or -not $Password -or -not $Database) {
    Write-Host "ERRO: Parâmetros de conexão críticos estão ausentes." -ForegroundColor Red
    Write-Host "Segurança garantida: Você deve declarar as variáveis de ambiente (TIDB_HOST, TIDB_USER, etc) antes de executar." -ForegroundColor Yellow
    Write-Host "Exemplo em ambiente .env ou exportando variaveis. Não passe senhas por parâmetro." -ForegroundColor Gray
    exit 1
}

# Prepara diretório de destino (ignora erro se já existir)
if (-not (Test-Path -Path $BackupDir)) {
    try {
        New-Item -ItemType Directory -Path $BackupDir | Out-Null
        Write-Host "[-] Diretório de saída criado em: $BackupDir" -ForegroundColor DarkGray
    } catch {
        Write-Host "ERRO: Não foi possível criar o diretório de destino." -ForegroundColor Red
        exit 1
    }
}

# Prepara nomes de arquivos blindados com Timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = Join-Path -Path $BackupDir -ChildPath "tidb_export_$timestamp.sql"

Write-Host ">> Conectando à instância $HostUrl..." -ForegroundColor Green
Write-Host ">> Extraindo Database: $Database..." -ForegroundColor Green

try {
    # Argumentos formatados em Array para blindar injection de powershell nos comandos
    $arguments = @(
        "-h", $HostUrl,
        "-P", $Port,
        "-u", $User,
        "--password=$Password",
        "--single-transaction",
        "--routines",
        "--triggers",
        "--set-gtid-purged=OFF",
        $Database
    )
    
    # Chama o executável nativo do banco e extrai
    & mysqldump $arguments > $backupFile

    if ($LASTEXITCODE -eq 0) {
        $fileInfo = Get-Item $backupFile
        $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host "SUCESSO: Backup lógico finalizado!" -ForegroundColor Green
        Write-Host "Destino: $backupFile" -ForegroundColor Yellow
        Write-Host "Tamanho do artefato gerado: $sizeMB MB" -ForegroundColor Yellow
        Write-Host "==========================================" -ForegroundColor Cyan
    } else {
        Write-Host "FALHA: O comando mysqldump retornou erro de execução (Exit Code: $LASTEXITCODE). Verifique permissões ou parâmetros." -ForegroundColor Red
        if (Test-Path $backupFile) { 
            Remove-Item $backupFile 
        }
    }
} catch {
    Write-Host "ERRO FATAL: Falha sistêmica durante o encapsulamento do script: $_" -ForegroundColor Red
}
