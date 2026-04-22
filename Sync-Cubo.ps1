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

-- PRIMEIRA QUERY: DADOS GERAIS DO CLIENTE E RUPTURAS TOTAIS
WITH PedidosStats AS (
    SELECT 
        ClienteID,
        SUM(CASE WHEN DtPedido >= DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) THEN 1 ELSE 0 END) as Orders_Current,
        SUM(CASE WHEN DtPedido >= DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) THEN ISNULL(VlrTotal, 0) ELSE 0 END) as ROB_Current,
        SUM(CASE WHEN DtPedido >= DATEADD(month, DATEDIFF(month, 0, GETDATE()) - 3, 0) 
                  AND DtPedido <  DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) THEN 1 ELSE 0 END) as Orders_3M,
        SUM(CASE WHEN DtPedido >= DATEADD(month, DATEDIFF(month, 0, GETDATE()) - 3, 0) 
                  AND DtPedido <  DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) THEN ISNULL(VlrTotal, 0) ELSE 0 END) as ROB_3M
    FROM Cubo_Pedido
    WHERE DtPedido >= DATEADD(month, DATEDIFF(month, 0, GETDATE()) - 3, 0)
    GROUP BY ClienteID
),
ResumoTrocas AS (
    SELECT 
        c.CdExtCliente,
        SUM(CASE WHEN alt.NmUsuAlteracao = 'Sistema' THEN 1 ELSE 0 END) AS trocasAuto,
        SUM(CASE WHEN alt.NmUsuAlteracao <> 'Sistema' THEN 1 ELSE 0 END) AS trocasManual,
        COUNT(DISTINCT alt.CotacaoID) AS pedidosComRuptura
    FROM Tabela_Alteracao_Itens_Pedidos alt
    INNER JOIN Cubo_Pedido p ON alt.CotacaoID = p.CotacaoID
    INNER JOIN BR_Cliente_Cubo c ON p.ClienteID = c.ClienteID
    WHERE alt.TipoOperacao = 'Troca' 
      AND alt.ItemAntigo <> alt.ItemNovo
      AND TRY_CAST(alt.DataPedido AS DATETIME) >= DATEADD(month, -3, GETDATE()) 
    GROUP BY c.CdExtCliente
)

SELECT DISTINCT
    C.CdExtCliente, 
    C.Cart_Executivo_Vendas as Executivo, 
    C.NmCliente as Cliente, 
    C.NmConglomerado as Conglomerado,
    C.IntegracaoAutomaticaSAP,
    C.UtilizaJanelaCorte,
    C.FlagProgramacaoAutomatica,
    C.FlagUtilizaLiberacaoAutomatica,
    C.Situacao,
    C.NmCarteira,
    J.FlagNaoLiberaAutomatico,
    C.MultiCDEnderecos,
    C.MultiCDPedidos,
    C.NaoLiberarPedidoSemOC,
    CASE WHEN J.QtdJanelas > 0 THEN 1 ELSE 0 END as TemJanelaMesAtual,
    ISNULL(P.Orders_Current, 0) as Orders_Current,
    ISNULL(P.ROB_Current, 0) as ROB_Current,
    ISNULL(P.Orders_3M, 0) as Orders_3M,
    ISNULL(P.ROB_3M, 0) as ROB_3M,
    ISNULL(T.trocasAuto, 0) as trocasAuto,
    ISNULL(T.trocasManual, 0) as trocasManual,
    ISNULL(T.pedidosComRuptura, 0) as pedidosComRuptura
FROM BR_Cliente_Cubo C
LEFT JOIN (
    -- 👇 AJUSTE AQUI: Lê as janelas a partir do primeiro dia do mês atual para a frente (Mês Atual + Futuro) 👇
    SELECT ClienteID, MIN(CAST(FlagNaoLiberaAutomatico AS INT)) as FlagNaoLiberaAutomatico, COUNT(*) as QtdJanelas
    FROM Cubo_Janela_Corte
    WHERE DataJanelaCorte >= DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)
    GROUP BY ClienteID
) J ON C.ClienteID = J.ClienteID
LEFT JOIN PedidosStats P ON C.ClienteID = P.ClienteID
LEFT JOIN ResumoTrocas T ON C.CdExtCliente = T.CdExtCliente
WHERE C.CdExtCliente IN ($sqlInClause)
  AND (C.NmCarteira LIKE '%Contrat%' OR C.NmCarteira LIKE '%Implant%');

-- SEGUNDA QUERY: TOP 15 ITENS TROCADOS POR CLIENTE (CRUZAMENTO C/ ITEM_CADASTRO)
WITH RankedTrocas AS (
    SELECT 
        c.CdExtCliente,
        alt.ItemAntigo,
        icA.NmItem AS NomeAntigo,
        icA.Curva AS CurvaAntigo,
        icA.Criticidade AS CritAntigo,
        icA.Ativo AS AtivoAntigo,
        alt.ItemNovo,
        icN.NmItem AS NomeNovo,
        COUNT(*) as QtdVezesTrocado,
        ROW_NUMBER() OVER(PARTITION BY c.CdExtCliente ORDER BY COUNT(*) DESC) as RN
    FROM Tabela_Alteracao_Itens_Pedidos alt
    INNER JOIN Cubo_Pedido p ON alt.CotacaoID = p.CotacaoID
    INNER JOIN BR_Cliente_Cubo c ON p.ClienteID = c.ClienteID
    LEFT JOIN Item_Cadastro icA ON alt.ItemAntigo = icA.CdItem
    LEFT JOIN Item_Cadastro icN ON alt.ItemNovo = icN.CdItem
    WHERE alt.TipoOperacao = 'Troca' 
      AND alt.ItemAntigo <> alt.ItemNovo
      AND TRY_CAST(alt.DataPedido AS DATETIME) >= DATEADD(month, -3, GETDATE())
      AND c.CdExtCliente IN ($sqlInClause)
    GROUP BY c.CdExtCliente, alt.ItemAntigo, icA.NmItem, icA.Curva, icA.Criticidade, icA.Ativo, alt.ItemNovo, icN.NmItem
)
SELECT * FROM RankedTrocas WHERE RN <= 15;
"@

Write-Host "A ligar à base de dados $Database em $Server..." -ForegroundColor Cyan

# --- 4. CONEXÃO E PROCESSAMENTO ---
$connectionString = "Server=$Server;Database=$Database;User Id=$User;Password=$Password;TrustServerCertificate=True;"
$connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
$connection.Open()

$command = $connection.CreateCommand()
$command.CommandText = $Query
$command.CommandTimeout = 600 

$Adapter = New-Object System.Data.SqlClient.SqlDataAdapter $command
$DataSet = New-Object System.Data.DataSet
$Adapter.Fill($DataSet) | Out-Null
$connection.Close()

Write-Host "Dados extraídos com sucesso. Agrupando Itens de Ruptura..." -ForegroundColor Cyan

$DictTrocas = @{}
foreach ($Row in $DataSet.Tables[1]) {
    $erp = $Row["CdExtCliente"].ToString().Trim()
    if (-not $DictTrocas.ContainsKey($erp)) { $DictTrocas[$erp] = @() }
    
    $DictTrocas[$erp] += @{
        itemAntigo  = if ([DBNull]::Value.Equals($Row["ItemAntigo"])) { "" } else { $Row["ItemAntigo"].ToString().Trim() }
        nomeAntigo  = if ([DBNull]::Value.Equals($Row["NomeAntigo"])) { "Desconhecido" } else { $Row["NomeAntigo"].ToString().Trim() }
        curva       = if ([DBNull]::Value.Equals($Row["CurvaAntigo"])) { "" } else { $Row["CurvaAntigo"].ToString().Trim() }
        criticidade = if ([DBNull]::Value.Equals($Row["CritAntigo"])) { "" } else { $Row["CritAntigo"].ToString().Trim() }
        ativo       = if ([DBNull]::Value.Equals($Row["AtivoAntigo"])) { "" } else { $Row["AtivoAntigo"].ToString().Trim() }
        itemNovo    = if ([DBNull]::Value.Equals($Row["ItemNovo"])) { "" } else { $Row["ItemNovo"].ToString().Trim() }
        nomeNovo    = if ([DBNull]::Value.Equals($Row["NomeNovo"])) { "Desconhecido" } else { $Row["NomeNovo"].ToString().Trim() }
        qtd         = [int]$Row["QtdVezesTrocado"]
    }
}

$ResultData = @()

foreach ($Row in $DataSet.Tables[0]) {
    $situacao = if ([DBNull]::Value.Equals($Row["Situacao"])) { "" } else { $Row["Situacao"].ToString().Trim() }
    $carteira = if ([DBNull]::Value.Equals($Row["NmCarteira"])) { "" } else { $Row["NmCarteira"].ToString().Trim() }

    $isAtivo = $true
    if ($situacao -ne "Ativo" -or $carteira -match "Inativos" -or $carteira -match "Duplicado") { $isAtivo = $false }

    $cdExtCliente = if ([DBNull]::Value.Equals($Row["CdExtCliente"])) { "" } else { $Row["CdExtCliente"].ToString().Trim() }
    $integraSAP = if ([DBNull]::Value.Equals($Row["IntegracaoAutomaticaSAP"])) { "" } else { $Row["IntegracaoAutomaticaSAP"].ToString().Trim().ToUpper() }
    $multiCdEnd = if ([DBNull]::Value.Equals($Row["MultiCDEnderecos"])) { "" } else { $Row["MultiCDEnderecos"].ToString().Trim().ToUpper() }
    $multiCdPed = if ([DBNull]::Value.Equals($Row["MultiCDPedidos"])) { "" } else { $Row["MultiCDPedidos"].ToString().Trim().ToUpper() }
    $naoLiberaOC = if ([DBNull]::Value.Equals($Row["NaoLiberarPedidoSemOC"])) { "" } else { $Row["NaoLiberarPedidoSemOC"].ToString().Trim().ToUpper() }
    $utilizaJanela = if ([DBNull]::Value.Equals($Row["UtilizaJanelaCorte"])) { "" } else { $Row["UtilizaJanelaCorte"].ToString().Trim().ToUpper() }
    $flagProgAuto = if ([DBNull]::Value.Equals($Row["FlagProgramacaoAutomatica"])) { "" } else { $Row["FlagProgramacaoAutomatica"].ToString().Trim().ToUpper() }
    $flagLibAuto = if ([DBNull]::Value.Equals($Row["FlagUtilizaLiberacaoAutomatica"])) { "" } else { $Row["FlagUtilizaLiberacaoAutomatica"].ToString().Trim().ToUpper() }
    $temJanelaMesAtual = if ([DBNull]::Value.Equals($Row["TemJanelaMesAtual"])) { 0 } else { [int]$Row["TemJanelaMesAtual"] }
    $flagNaoLibera = if ([DBNull]::Value.Equals($Row["FlagNaoLiberaAutomatico"])) { -1 } else { [int]$Row["FlagNaoLiberaAutomatico"] }

    $ordersCurrent = if ([DBNull]::Value.Equals($Row["Orders_Current"])) { 0 } else { [int]$Row["Orders_Current"] }
    $robCurrent = if ([DBNull]::Value.Equals($Row["ROB_Current"])) { 0 } else { [double]$Row["ROB_Current"] }
    $orders3M = if ([DBNull]::Value.Equals($Row["Orders_3M"])) { 0 } else { [int]$Row["Orders_3M"] }
    $rob3M = if ([DBNull]::Value.Equals($Row["ROB_3M"])) { 0 } else { [double]$Row["ROB_3M"] }

    $trocasAuto = if ([DBNull]::Value.Equals($Row["trocasAuto"])) { 0 } else { [int]$Row["trocasAuto"] }
    $trocasManual = if ([DBNull]::Value.Equals($Row["trocasManual"])) { 0 } else { [int]$Row["trocasManual"] }
    $pedidosComRuptura = if ([DBNull]::Value.Equals($Row["pedidosComRuptura"])) { 0 } else { [int]$Row["pedidosComRuptura"] }

    if (-not $isAtivo) {
        $ordersCurrent = 0; $robCurrent = 0; $orders3M = 0; $rob3M = 0; $trocasAuto = 0; $trocasManual = 0; $pedidosComRuptura = 0
    }

    $avgOrders3M = [Math]::Round($orders3M / 3, 2)
    $avgRob3M = [Math]::Round($rob3M / 3, 2)
    $avgRuptura3M = [Math]::Round($pedidosComRuptura / 3, 2)

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

    $topRup = if ($cdExtCliente -ne "" -and $DictTrocas.ContainsKey($cdExtCliente)) { $DictTrocas[$cdExtCliente] } else { @() }

    $ResultData += @{
        cdExtCliente  = $cdExtCliente
        nome          = if ([DBNull]::Value.Equals($Row["Executivo"])) { "" } else { $Row["Executivo"].ToString().Trim() }
        carteira      = $carteira
        cliente       = if ([DBNull]::Value.Equals($Row["Cliente"])) { "" } else { $Row["Cliente"].ToString().Trim() }
        conglomerado  = if ([DBNull]::Value.Equals($Row["Conglomerado"])) { "" } else { $Row["Conglomerado"].ToString().Trim() }
        flagGeraOVAuto = if ($integraSAP -eq "SIM" -and $isAtivo) { $true } else { $false }
        etapa2Ativo   = $etapa2
        etapa3Ativo   = $etapa3
        utilizaJanela = $utilizaJanela
        ordersCurrent = $ordersCurrent
        robCurrent    = $robCurrent
        avgOrders3M   = $avgOrders3M
        avgRob3M      = $avgRob3M
        isAtivo       = $isAtivo 
        multiCdEnderecos = $multiCdEnd
        multiCdPedidos   = $multiCdPed
        naoLiberarPedidoSemOC = $naoLiberaOC
        trocasAuto    = $trocasAuto
        trocasManual  = $trocasManual
        avgRuptura3M  = $avgRuptura3M
        topRupturas   = $topRup
    }
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
        if ($item.cdExtCliente -ne "") { $ValidIds += $item.cdExtCliente }
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