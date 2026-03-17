# --- 1. CONFIGURAÇÕES ---
$Server = "192.168.0.18"
$Database = "brweb"
$User = "power_Bi"
$Password = "brs123#"
# Altere para a porta correta onde o site está a correr no IIS
$apiUrl = "http://127.0.0.1:8083/api/sync"
# A chave que configurou no ficheiro .env
$apiKey = "fluxo-vision-master-key-2025" 

# --- 2. QUERY SQL ---
$Query = @"
SELECT 
    CdExtCliente, 
    Cart_Executivo_Vendas as Executivo, 
    NmCliente as Cliente, 
    NmConglomerado as Conglomerado,
    IntegracaoAutomaticaSAP
FROM BR_Cliente_Cubo
"@

Write-Host "Conectando à base de dados $Database em $Server..." -ForegroundColor Cyan

# --- 3. LÓGICA DE CONEXÃO SQL ---
$connectionString = "Server=$Server;Database=$Database;User Id=$User;Password=$Password;TrustServerCertificate=True;"
$connection = New-Object System.Data.SqlClient.SqlConnection
$connection.ConnectionString = $connectionString
$connection.Open()

$command = $connection.CreateCommand()
$command.CommandText = $Query
$reader = $command.ExecuteReader()

$ResultData = @()

while ($reader.Read()) {
    $ResultData += @{
        cdExtCliente = $reader["CdExtCliente"]
        nome         = $reader["Executivo"]
        cliente      = $reader["Cliente"]
        conglomerado = $reader["Conglomerado"]
        flagProgAuto = $reader["IntegracaoAutomaticaSAP"]
    }
}

$connection.Close()
Write-Host "Foram extraídos $($ResultData.Count) registos do SQL." -ForegroundColor Green

# --- 4. ENVIO PARA A API (DASHBOARD) ---
if ($ResultData.Count -gt 0) {
    Write-Host "Iniciando envio para a API em lotes de 500..." -ForegroundColor Cyan
    
    # Cabeçalhos com a chave de API (Isto estava a faltar)
    $headers = @{ 
        "x-api-key" = $apiKey
        "Content-Type" = "application/json" 
    }

    $LoteTamanho = 500
    $Total = $ResultData.Count
    $Lotes = [Math]::Ceiling($Total / $LoteTamanho)

    for ($i = 0; $i -lt $Lotes; $i++) {
        $inicio = $i * $LoteTamanho
        $fim = [Math]::Min((($i + 1) * $LoteTamanho - 1), ($Total - 1))
        
        # Extrai apenas um bloco de dados
        $LoteDados = $ResultData[$inicio..$fim]
        
        Write-Host "A enviar lote $($i+1) de $Lotes (Registos $inicio a $fim)..."
        
        $jsonBody = @{ data = $LoteDados } | ConvertTo-Json -Depth 5 -Compress
        
        try {
            # O parâmetro -TimeoutSec 30 impede que o script fique congelado para sempre
            $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $jsonBody -TimeoutSec 30
            Write-Host "Lote $($i+1) enviado com sucesso!" -ForegroundColor Green
        } catch {
            Write-Host "Erro ao enviar lote $($i+1): $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "Nenhum dado encontrado na base de dados para enviar." -ForegroundColor Yellow
}