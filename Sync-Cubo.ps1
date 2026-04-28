# --- 1. CONFIGURAÇÕES ---
$Server = "192.168.0.18"
$Database = "brweb"
$User = "power_Bi"
$Password = "brs123#"

$apiBaseUrl = "https://dash.brsupply.com.br/clientes/api"
$apiUrlSync = "$apiBaseUrl/sync"
$apiUrlErps = "$apiBaseUrl/erps"

$apiKey = "fluxo-vision-master-key-2025" 

$headers = @{ 
    "x-api-key" = $apiKey
    "Content-Type" = "application/json; charset=utf-8" 
}

# --- 2. BUSCAR ERPs NO FIREBASE ---
Write-Host "A procurar a lista de ERPs mapeados no Firebase..." -ForegroundColor Cyan

try {
    $erpsResponse = Invoke-RestMethod -Uri $apiUrlErps -Method Get -Headers $headers -TimeoutSec 90
    $erpsList = $erpsResponse.erps
} catch {
    Write-Host "Erro ao buscar ERPs na API!" -ForegroundColor Red
    exit
}

if ($null -eq $erpsList -or $erpsList.Count -eq 0) {
    Write-Host "Nenhum ERP encontrado no mapeamento. O script será encerrado." -ForegroundColor Yellow
    exit
}

Write-Host "Foram encontrados $($erpsList.Count) ERPs. A construir as tabelas no SQL..." -ForegroundColor Green
$sqlInClause = "'" + ($erpsList -join "','") + "'"

# --- 3. MULTI-QUERY SQL (DADOS GERAIS + DETALHE DE ITENS) ---
$Query = @"
SET DATEFORMAT dmy;

WITH PedidosStats AS (
    SELECT 
        ClienteID,
        SUM(CASE WHEN DtPedido >= DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) THEN 1 ELSE 0 END) as Orders_Current,
        SUM(CASE WHEN DtPedido >= DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) THEN ISNULL(VlrTotal, 0) ELSE 0 END) as ROB_Current,
        
        SUM(CASE WHEN DtPedido >= DATEADD(day, -30, GETDATE()) THEN 1 ELSE 0 END) as Orders_30D,
        SUM(CASE WHEN DtPedido >= DATEADD(day, -30, GETDATE()) THEN ISNULL(VlrTotal, 0) ELSE 0 END) as ROB_30D,
        
        SUM(CASE WHEN DtPedido >= DATEADD(day, -60, GETDATE()) THEN 1 ELSE 0 END) as Orders_60D,
        SUM(CASE WHEN DtPedido >= DATEADD(day, -60, GETDATE()) THEN ISNULL(VlrTotal, 0) ELSE 0 END) as ROB_60D,
        
        SUM(CASE WHEN DtPedido >= DATEADD(day, -90, GETDATE()) THEN 1 ELSE 0 END) as Orders_90D,
        SUM(CASE WHEN DtPedido >= DATEADD(day, -90, GETDATE()) THEN ISNULL(VlrTotal, 0) ELSE 0 END) as ROB_90D
    FROM Cubo_Pedido
    WHERE DtPedido >= DATEADD(day, -90, GETDATE())
    GROUP BY ClienteID
),
ResumoTrocas AS (
    SELECT 
        c.CdExtCliente,
        SUM(CASE WHEN TRY_CAST(alt.DataPedido AS DATETIME) >= DATEADD(day, -30, GETDATE()) AND alt.NmUsuAlteracao = 'Sistema' THEN 1 ELSE 0 END) AS trocasAuto_30D,
        SUM(CASE WHEN TRY_CAST(alt.DataPedido AS DATETIME) >= DATEADD(day, -30, GETDATE()) AND alt.NmUsuAlteracao <> 'Sistema' THEN 1 ELSE 0 END) AS trocasManual_30D,
        COUNT(DISTINCT CASE WHEN TRY_CAST(alt.DataPedido AS DATETIME) >= DATEADD(day, -30, GETDATE()) THEN alt.CotacaoID END) AS rupturas_30D,
        SUM(CASE WHEN TRY_CAST(alt.DataPedido AS DATETIME) >= DATEADD(day, -60, GETDATE()) AND alt.NmUsuAlteracao = 'Sistema' THEN 1 ELSE 0 END) AS trocasAuto_60D,
        SUM(CASE WHEN TRY_CAST(alt.DataPedido AS DATETIME) >= DATEADD(day, -60, GETDATE()) AND alt.NmUsuAlteracao <> 'Sistema' THEN 1 ELSE 0 END) AS trocasManual_60D,
        COUNT(DISTINCT CASE WHEN TRY_CAST(alt.DataPedido AS DATETIME) >= DATEADD(day, -60, GETDATE()) THEN alt.CotacaoID END) AS rupturas_60D,
        SUM(CASE WHEN TRY_CAST(alt.DataPedido AS DATETIME) >= DATEADD(day, -90, GETDATE()) AND alt.NmUsuAlteracao = 'Sistema' THEN 1 ELSE 0 END) AS trocasAuto_90D,
        SUM(CASE WHEN TRY_CAST(alt.DataPedido AS DATETIME) >= DATEADD(day, -90, GETDATE()) AND alt.NmUsuAlteracao <> 'Sistema' THEN 1 ELSE 0 END) AS trocasManual_90D,
        COUNT(DISTINCT CASE WHEN TRY_CAST(alt.DataPedido AS DATETIME) >= DATEADD(day, -90, GETDATE()) THEN alt.CotacaoID END) AS rupturas_90D
    FROM Tabela_Alteracao_Itens_Pedidos alt
    INNER JOIN Cubo_Pedido p ON alt.CotacaoID = p.CotacaoID
    INNER JOIN BR_Cliente_Cubo c ON p.ClienteID = c.ClienteID
    WHERE alt.TipoOperacao = 'Troca' AND alt.ItemAntigo <> alt.ItemNovo AND TRY_CAST(alt.DataPedido AS DATETIME) >= DATEADD(day, -90, GETDATE())
    GROUP BY c.CdExtCliente
)
SELECT DISTINCT
    C.CdExtCliente, C.Cart_Executivo_Vendas as Executivo, C.NmCliente as Cliente, C.NmConglomerado as Conglomerado,
    C.IntegracaoAutomaticaSAP, C.UtilizaJanelaCorte, C.FlagProgramacaoAutomatica, C.FlagUtilizaLiberacaoAutomatica,
    C.Situacao, C.NmCarteira, J.FlagNaoLiberaAutomatico, C.MultiCDEnderecos, C.MultiCDPedidos, C.NaoLiberarPedidoSemOC,
    C.TrocaAutomatica,
    CASE WHEN J.QtdJanelas > 0 THEN 1 ELSE 0 END as TemJanelaMesAtual,
    ISNULL(P.Orders_Current, 0) as Orders_Current, ISNULL(P.ROB_Current, 0) as ROB_Current,
    ISNULL(P.Orders_30D, 0) as Orders_30D, ISNULL(P.ROB_30D, 0) as ROB_30D,
    ISNULL(P.Orders_60D, 0) as Orders_60D, ISNULL(P.ROB_60D, 0) as ROB_60D,
    ISNULL(P.Orders_90D, 0) as Orders_90D, ISNULL(P.ROB_90D, 0) as ROB_90D,
    ISNULL(T.trocasAuto_30D, 0) as trocasAuto_30D, ISNULL(T.trocasManual_30D, 0) as trocasManual_30D, ISNULL(T.rupturas_30D, 0) as rupturas_30D,
    ISNULL(T.trocasAuto_60D, 0) as trocasAuto_60D, ISNULL(T.trocasManual_60D, 0) as trocasManual_60D, ISNULL(T.rupturas_60D, 0) as rupturas_60D,
    ISNULL(T.trocasAuto_90D, 0) as trocasAuto_90D, ISNULL(T.trocasManual_90D, 0) as trocasManual_90D, ISNULL(T.rupturas_90D, 0) as rupturas_90D
FROM BR_Cliente_Cubo C
LEFT JOIN (SELECT ClienteID, MIN(CAST(FlagNaoLiberaAutomatico AS INT)) as FlagNaoLiberaAutomatico, COUNT(*) as QtdJanelas FROM Cubo_Janela_Corte WHERE DataJanelaCorte >= DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) GROUP BY ClienteID) J ON C.ClienteID = J.ClienteID
LEFT JOIN PedidosStats P ON C.ClienteID = P.ClienteID
LEFT JOIN ResumoTrocas T ON C.CdExtCliente = T.CdExtCliente
WHERE C.CdExtCliente IN ($sqlInClause) AND (C.NmCarteira LIKE '%Contrat%' OR C.NmCarteira LIKE '%Implant%');
"@

Write-Host "Executando queries no banco de dados..." -ForegroundColor Cyan

$Result = Invoke-Sqlcmd -ServerInstance $Server -Database $Database -Username $User -Password $Password -Query $Query -QueryTimeout 300 -ErrorAction Stop -TrustServerCertificate

Write-Host "Dados extraídos com sucesso. Preparando envio..." -ForegroundColor Cyan

$ResultData = @()

foreach ($Row in $Result) {
    $situacao = if ([DBNull]::Value.Equals($Row["Situacao"])) { "" } else { $Row["Situacao"].ToString().Trim() }
    $carteira = if ([DBNull]::Value.Equals($Row["NmCarteira"])) { "" } else { $Row["NmCarteira"].ToString().Trim() }

    $isAtivo = $true
    if ($situacao -ne "Ativo" -or $carteira -match "Inativos" -or $carteira -match "Duplicado") { $isAtivo = $false }

    $cdExtCliente = if ([DBNull]::Value.Equals($Row["CdExtCliente"])) { "" } else { $Row["CdExtCliente"].ToString().Trim() }
    
    $utilizaJanela = if ([DBNull]::Value.Equals($Row["UtilizaJanelaCorte"])) { "NAO" } else { $Row["UtilizaJanelaCorte"].ToString().Trim().ToUpper() }
    $flagProgAuto = if ([DBNull]::Value.Equals($Row["FlagProgramacaoAutomatica"])) { "NAO" } else { $Row["FlagProgramacaoAutomatica"].ToString().Trim().ToUpper() }
    $flagLibAuto = if ([DBNull]::Value.Equals($Row["FlagUtilizaLiberacaoAutomatica"])) { "NAO" } else { $Row["FlagUtilizaLiberacaoAutomatica"].ToString().Trim().ToUpper() }
    $temJanelaMesAtual = if ([DBNull]::Value.Equals($Row["TemJanelaMesAtual"])) { 0 } else { [int]$Row["TemJanelaMesAtual"] }
    $flagNaoLibera = if ([DBNull]::Value.Equals($Row["FlagNaoLiberaAutomatico"])) { -1 } else { [int]$Row["FlagNaoLiberaAutomatico"] }
    $integraSAP = if ([DBNull]::Value.Equals($Row["IntegracaoAutomaticaSAP"])) { "NAO" } else { $Row["IntegracaoAutomaticaSAP"].ToString().Trim().ToUpper() }

    $etapa2 = $false; $etapa3 = $false
    if ($isAtivo) {
        if ($utilizaJanela -eq "NAO") {
            if ($flagProgAuto -eq "SIM") { $etapa2 = $true }
            if ($flagLibAuto -eq "SIM") { $etapa3 = $true }
        } elseif ($utilizaJanela -eq "SIM") {
            if ($temJanelaMesAtual -eq 1) { $etapa2 = $true }
            if ($flagNaoLibera -eq 0) { $etapa3 = $true }
        }
    }
    
    $clientObj = @{
        "CdExtCliente" = $cdExtCliente
        "Cliente" = if ([DBNull]::Value.Equals($Row["Cliente"])) { "" } else { $Row["Cliente"].ToString().Trim() }
        "Executivo" = if ([DBNull]::Value.Equals($Row["Executivo"])) { "" } else { $Row["Executivo"].ToString().Trim() }
        "Conglomerado" = if ([DBNull]::Value.Equals($Row["Conglomerado"])) { "" } else { $Row["Conglomerado"].ToString().Trim() }
        "Situacao" = $situacao
        "NmCarteira" = $carteira
        
        "Orders_Current" = if ($isAtivo) { [int]$Row["Orders_Current"] } else { 0 }
        "ROB_Current" = if ($isAtivo) { [double]$Row["ROB_Current"] } else { 0 }
        
        "Historico_30D" = @{
            "Orders" = if ($isAtivo) { [int]$Row["Orders_30D"] } else { 0 }
            "ROB" = if ($isAtivo) { [double]$Row["ROB_30D"] } else { 0 }
            "trocasAuto" = if ($isAtivo) { [int]$Row["trocasAuto_30D"] } else { 0 }
            "trocasManual" = if ($isAtivo) { [int]$Row["trocasManual_30D"] } else { 0 }
            "pedidosComRuptura" = if ($isAtivo) { [int]$Row["rupturas_30D"] } else { 0 }
        }
        "Historico_60D" = @{
            "Orders" = if ($isAtivo) { [int]$Row["Orders_60D"] } else { 0 }
            "ROB" = if ($isAtivo) { [double]$Row["ROB_60D"] } else { 0 }
            "trocasAuto" = if ($isAtivo) { [int]$Row["trocasAuto_60D"] } else { 0 }
            "trocasManual" = if ($isAtivo) { [int]$Row["trocasManual_60D"] } else { 0 }
            "pedidosComRuptura" = if ($isAtivo) { [int]$Row["rupturas_60D"] } else { 0 }
        }
        "Historico_90D" = @{
            "Orders" = if ($isAtivo) { [int]$Row["Orders_90D"] } else { 0 }
            "ROB" = if ($isAtivo) { [double]$Row["ROB_90D"] } else { 0 }
            "trocasAuto" = if ($isAtivo) { [int]$Row["trocasAuto_90D"] } else { 0 }
            "trocasManual" = if ($isAtivo) { [int]$Row["trocasManual_90D"] } else { 0 }
            "pedidosComRuptura" = if ($isAtivo) { [int]$Row["rupturas_90D"] } else { 0 }
        }

        # 👇 CORREÇÃO: Enviando as strings "SIM" e "NAO" puras
        "IntegracaoAutomaticaSAP" = $integraSAP
        "UtilizaJanelaCorte" = $utilizaJanela
        "FlagProgramacaoAutomatica" = $flagProgAuto
        "FlagUtilizaLiberacaoAutomatica" = $flagLibAuto
        "TemJanelaMesAtual" = $temJanelaMesAtual
        "FlagNaoLiberaAutomatico" = $flagNaoLibera
        "MultiCDEnderecos" = if ([DBNull]::Value.Equals($Row["MultiCDEnderecos"])) { "NAO" } else { $Row["MultiCDEnderecos"].ToString().Trim().ToUpper() }
        "MultiCDPedidos" = if ([DBNull]::Value.Equals($Row["MultiCDPedidos"])) { "NAO" } else { $Row["MultiCDPedidos"].ToString().Trim().ToUpper() }
        "NaoLiberarPedidoSemOC" = if ([DBNull]::Value.Equals($Row["NaoLiberarPedidoSemOC"])) { "NAO" } else { $Row["NaoLiberarPedidoSemOC"].ToString().Trim().ToUpper() }
        "TrocaAutomatica" = if ([DBNull]::Value.Equals($Row["TrocaAutomatica"])) { "SIM" } else { $Row["TrocaAutomatica"].ToString().Trim().ToUpper() }

        "FlagGeraOVAuto" = if ($integraSAP -eq "SIM" -and $isAtivo) { $true } else { $false }
        "Etapa2Ativo" = $etapa2
        "Etapa3Ativo" = $etapa3
    }
    $ResultData += $clientObj
}

Write-Host "Processamento concluído. $( $ResultData.Count ) clientes preparados." -ForegroundColor Green

# --- 5. ENVIO PARA A API DE SYNC ---
if ($ResultData.Count -gt 0) {
    Write-Host "A iniciar o envio para a API em lotes..." -ForegroundColor Cyan
    
    $LoteTamanho = 250
    $Total = $ResultData.Count
    $Lotes = [Math]::Ceiling($Total / $LoteTamanho)

    $ValidIds = @()
    foreach ($item in $ResultData) {
        if ($item.CdExtCliente -ne "") { $ValidIds += $item.CdExtCliente }
    }

    for ($i = 0; $i -lt $Lotes; $i++) {
        $inicio = $i * $LoteTamanho
        $fim = [Math]::Min((($i + 1) * $LoteTamanho - 1), ($Total - 1))
        $LoteDados = $ResultData[$inicio..$fim]
        $jsonBody = @{ data = $LoteDados } | ConvertTo-Json -Depth 6 -Compress
        
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
        
        try {
            $response = Invoke-RestMethod -Uri $apiUrlSync -Method Post -Headers $headers -Body $bytes -ContentType "application/json; charset=utf-8" -TimeoutSec 90
            
            if ($response.isDebugError -eq $true) {
                Write-Host "--- ERRO ENCONTRADO DENTRO DA API (LOTE $($i+1)) ---" -ForegroundColor Red
                Write-Host "Motivo: $($response.errorMessage)" -ForegroundColor Yellow
                Write-Host "Pilha: $($response.errorStack)" -ForegroundColor Gray
                exit
            }
            Write-Host "Lote $($i+1) enviado com sucesso!" -ForegroundColor Green
        } catch {
            Write-Host "Erro de Conexão no lote $($i+1): $_" -ForegroundColor Red
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $errBody = $reader.ReadToEnd()
                Write-Host "Detalhe do Servidor: $errBody" -ForegroundColor Yellow
            }
            exit
        }
    }

    # --- 6. LIMPEZA DOS FANTASMAS ---
    Write-Host "A iniciar a limpeza de ERPs antigos (Fantasmas) no Firebase..." -ForegroundColor Cyan

    $cleanupBody = @{ action = "cleanup"; validIds = $ValidIds } | ConvertTo-Json -Depth 5 -Compress
    $cleanupBytes = [System.Text.Encoding]::UTF8.GetBytes($cleanupBody)

    try {
        $response = Invoke-RestMethod -Uri $apiUrlSync -Method Post -Headers $headers -Body $cleanupBytes -ContentType "application/json; charset=utf-8" -TimeoutSec 90
        Write-Host "Limpeza concluída com sucesso: $($response.message)" -ForegroundColor Green
    } catch {
        Write-Host "Erro ao limpar fantasmas: $_" -ForegroundColor Red
    }

} else {
    Write-Host "Nenhum dado encontrado na base de dados para enviar." -ForegroundColor Yellow
}