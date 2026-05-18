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

# --- 3. MULTI-QUERY SQL (DADOS GERAIS E MÉTRICAS) ---
$Query = @"
SET DATEFORMAT dmy;

WITH PedidosStats AS (
    SELECT 
        ClienteID,
        SUM(CASE WHEN DtPedido >= DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) THEN 1 ELSE 0 END) as Orders_Current,
        SUM(CASE WHEN DtPedido >= DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) THEN ISNULL(VlrTotal, 0) ELSE 0 END) as ROB_Current,
        
        SUM(CASE WHEN DtPedido >= DATEADD(day, -7, GETDATE()) THEN 1 ELSE 0 END) as Orders_7D,
        SUM(CASE WHEN DtPedido >= DATEADD(day, -7, GETDATE()) THEN ISNULL(VlrTotal, 0) ELSE 0 END) as ROB_7D,

        SUM(CASE WHEN DtPedido >= DATEADD(day, -15, GETDATE()) THEN 1 ELSE 0 END) as Orders_15D,
        SUM(CASE WHEN DtPedido >= DATEADD(day, -15, GETDATE()) THEN ISNULL(VlrTotal, 0) ELSE 0 END) as ROB_15D,

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
BaseTrocas AS (
    SELECT 
        c.CdExtCliente,
        alt.CotacaoID,
        alt.NmUsuAlteracao,
        TRY_CAST(alt.DataPedido AS DATETIME) as DataPedidoReal,
        ISNULL(TRY_CAST(alt.QtdeAntiga AS INT), 0) as QtdeReal
    FROM Tabela_Alteracao_Itens_Pedidos alt
    INNER JOIN Cubo_Pedido p ON alt.CotacaoID = p.CotacaoID
    INNER JOIN BR_Cliente_Cubo c ON p.ClienteID = c.ClienteID
    WHERE alt.TipoOperacao = 'Troca' AND alt.ItemAntigo <> alt.ItemNovo AND TRY_CAST(alt.DataPedido AS DATETIME) >= DATEADD(day, -90, GETDATE())
),
ManualOrders AS (
    SELECT DISTINCT CotacaoID 
    FROM BaseTrocas 
    WHERE NmUsuAlteracao <> 'Sistema'
),
ItensTratados AS (
    SELECT 
        b.*,
        CASE WHEN m.CotacaoID IS NOT NULL THEN 1 ELSE 0 END AS HasManual
    FROM BaseTrocas b
    LEFT JOIN ManualOrders m ON b.CotacaoID = m.CotacaoID
),
ResumoTrocas AS (
    SELECT 
        CdExtCliente,
        -- 7 DIAS
        SUM(CASE WHEN DataPedidoReal >= DATEADD(day, -7, GETDATE()) AND NmUsuAlteracao = 'Sistema' THEN 1 ELSE 0 END) AS trocasAuto_7D,
        SUM(CASE WHEN DataPedidoReal >= DATEADD(day, -7, GETDATE()) AND NmUsuAlteracao <> 'Sistema' THEN 1 ELSE 0 END) AS trocasManual_7D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -7, GETDATE()) THEN CotacaoID END) AS rupturas_7D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -7, GETDATE()) AND NmUsuAlteracao <> 'Sistema' THEN CotacaoID END) AS pedManual_7D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -7, GETDATE()) AND NmUsuAlteracao = 'Sistema' THEN CotacaoID END) AS pedAuto_7D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -7, GETDATE()) AND NmUsuAlteracao = 'Sistema' AND HasManual = 0 THEN CotacaoID END) AS ped100Auto_7D,
        SUM(CASE WHEN DataPedidoReal >= DATEADD(day, -7, GETDATE()) AND NmUsuAlteracao = 'Sistema' AND HasManual = 0 THEN 1 ELSE 0 END) AS itens100Auto_7D,

        -- 15 DIAS
        SUM(CASE WHEN DataPedidoReal >= DATEADD(day, -15, GETDATE()) AND NmUsuAlteracao = 'Sistema' THEN 1 ELSE 0 END) AS trocasAuto_15D,
        SUM(CASE WHEN DataPedidoReal >= DATEADD(day, -15, GETDATE()) AND NmUsuAlteracao <> 'Sistema' THEN 1 ELSE 0 END) AS trocasManual_15D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -15, GETDATE()) THEN CotacaoID END) AS rupturas_15D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -15, GETDATE()) AND NmUsuAlteracao <> 'Sistema' THEN CotacaoID END) AS pedManual_15D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -15, GETDATE()) AND NmUsuAlteracao = 'Sistema' THEN CotacaoID END) AS pedAuto_15D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -15, GETDATE()) AND NmUsuAlteracao = 'Sistema' AND HasManual = 0 THEN CotacaoID END) AS ped100Auto_15D,
        SUM(CASE WHEN DataPedidoReal >= DATEADD(day, -15, GETDATE()) AND NmUsuAlteracao = 'Sistema' AND HasManual = 0 THEN 1 ELSE 0 END) AS itens100Auto_15D,

        -- 30 DIAS
        SUM(CASE WHEN DataPedidoReal >= DATEADD(day, -30, GETDATE()) AND NmUsuAlteracao = 'Sistema' THEN 1 ELSE 0 END) AS trocasAuto_30D,
        SUM(CASE WHEN DataPedidoReal >= DATEADD(day, -30, GETDATE()) AND NmUsuAlteracao <> 'Sistema' THEN 1 ELSE 0 END) AS trocasManual_30D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -30, GETDATE()) THEN CotacaoID END) AS rupturas_30D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -30, GETDATE()) AND NmUsuAlteracao <> 'Sistema' THEN CotacaoID END) AS pedManual_30D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -30, GETDATE()) AND NmUsuAlteracao = 'Sistema' THEN CotacaoID END) AS pedAuto_30D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -30, GETDATE()) AND NmUsuAlteracao = 'Sistema' AND HasManual = 0 THEN CotacaoID END) AS ped100Auto_30D,
        SUM(CASE WHEN DataPedidoReal >= DATEADD(day, -30, GETDATE()) AND NmUsuAlteracao = 'Sistema' AND HasManual = 0 THEN 1 ELSE 0 END) AS itens100Auto_30D,

        -- 60 DIAS
        SUM(CASE WHEN DataPedidoReal >= DATEADD(day, -60, GETDATE()) AND NmUsuAlteracao = 'Sistema' THEN 1 ELSE 0 END) AS trocasAuto_60D,
        SUM(CASE WHEN DataPedidoReal >= DATEADD(day, -60, GETDATE()) AND NmUsuAlteracao <> 'Sistema' THEN 1 ELSE 0 END) AS trocasManual_60D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -60, GETDATE()) THEN CotacaoID END) AS rupturas_60D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -60, GETDATE()) AND NmUsuAlteracao <> 'Sistema' THEN CotacaoID END) AS pedManual_60D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -60, GETDATE()) AND NmUsuAlteracao = 'Sistema' THEN CotacaoID END) AS pedAuto_60D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -60, GETDATE()) AND NmUsuAlteracao = 'Sistema' AND HasManual = 0 THEN CotacaoID END) AS ped100Auto_60D,
        SUM(CASE WHEN DataPedidoReal >= DATEADD(day, -60, GETDATE()) AND NmUsuAlteracao = 'Sistema' AND HasManual = 0 THEN 1 ELSE 0 END) AS itens100Auto_60D,

        -- 90 DIAS
        SUM(CASE WHEN DataPedidoReal >= DATEADD(day, -90, GETDATE()) AND NmUsuAlteracao = 'Sistema' THEN 1 ELSE 0 END) AS trocasAuto_90D,
        SUM(CASE WHEN DataPedidoReal >= DATEADD(day, -90, GETDATE()) AND NmUsuAlteracao <> 'Sistema' THEN 1 ELSE 0 END) AS trocasManual_90D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -90, GETDATE()) THEN CotacaoID END) AS rupturas_90D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -90, GETDATE()) AND NmUsuAlteracao <> 'Sistema' THEN CotacaoID END) AS pedManual_90D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -90, GETDATE()) AND NmUsuAlteracao = 'Sistema' THEN CotacaoID END) AS pedAuto_90D,
        COUNT(DISTINCT CASE WHEN DataPedidoReal >= DATEADD(day, -90, GETDATE()) AND NmUsuAlteracao = 'Sistema' AND HasManual = 0 THEN CotacaoID END) AS ped100Auto_90D,
        SUM(CASE WHEN DataPedidoReal >= DATEADD(day, -90, GETDATE()) AND NmUsuAlteracao = 'Sistema' AND HasManual = 0 THEN 1 ELSE 0 END) AS itens100Auto_90D

    FROM ItensTratados
    GROUP BY CdExtCliente
)
SELECT DISTINCT
    C.CdExtCliente, C.Cart_Executivo_Vendas as Executivo, C.NmCliente as Cliente, C.NmConglomerado as Conglomerado,
    C.IntegracaoAutomaticaSAP, C.UtilizaJanelaCorte, C.FlagProgramacaoAutomatica, C.FlagUtilizaLiberacaoAutomatica,
    C.Situacao, C.NmCarteira, J.FlagNaoLiberaAutomatico, C.MultiCDEnderecos, C.FatMultiCD, C.NaoLiberarPedidoSemOC,
    C.TrocaAutomatica,
    CASE WHEN J.QtdJanelas > 0 THEN 1 ELSE 0 END as TemJanelaMesAtual,
    ISNULL(P.Orders_Current, 0) as Orders_Current, ISNULL(P.ROB_Current, 0) as ROB_Current,
    
    ISNULL(P.Orders_7D, 0) as Orders_7D, ISNULL(P.ROB_7D, 0) as ROB_7D,
    ISNULL(P.Orders_15D, 0) as Orders_15D, ISNULL(P.ROB_15D, 0) as ROB_15D,
    ISNULL(P.Orders_30D, 0) as Orders_30D, ISNULL(P.ROB_30D, 0) as ROB_30D,
    ISNULL(P.Orders_60D, 0) as Orders_60D, ISNULL(P.ROB_60D, 0) as ROB_60D,
    ISNULL(P.Orders_90D, 0) as Orders_90D, ISNULL(P.ROB_90D, 0) as ROB_90D,
    
    ISNULL(T.trocasAuto_7D, 0) as trocasAuto_7D, ISNULL(T.trocasManual_7D, 0) as trocasManual_7D, ISNULL(T.rupturas_7D, 0) as rupturas_7D,
    ISNULL(T.pedManual_7D, 0) as pedManual_7D, ISNULL(T.pedAuto_7D, 0) as pedAuto_7D, ISNULL(T.ped100Auto_7D, 0) as ped100Auto_7D, ISNULL(T.itens100Auto_7D, 0) as itens100Auto_7D,

    ISNULL(T.trocasAuto_15D, 0) as trocasAuto_15D, ISNULL(T.trocasManual_15D, 0) as trocasManual_15D, ISNULL(T.rupturas_15D, 0) as rupturas_15D,
    ISNULL(T.pedManual_15D, 0) as pedManual_15D, ISNULL(T.pedAuto_15D, 0) as pedAuto_15D, ISNULL(T.ped100Auto_15D, 0) as ped100Auto_15D, ISNULL(T.itens100Auto_15D, 0) as itens100Auto_15D,

    ISNULL(T.trocasAuto_30D, 0) as trocasAuto_30D, ISNULL(T.trocasManual_30D, 0) as trocasManual_30D, ISNULL(T.rupturas_30D, 0) as rupturas_30D,
    ISNULL(T.pedManual_30D, 0) as pedManual_30D, ISNULL(T.pedAuto_30D, 0) as pedAuto_30D, ISNULL(T.ped100Auto_30D, 0) as ped100Auto_30D, ISNULL(T.itens100Auto_30D, 0) as itens100Auto_30D,
    
    ISNULL(T.trocasAuto_60D, 0) as trocasAuto_60D, ISNULL(T.trocasManual_60D, 0) as trocasManual_60D, ISNULL(T.rupturas_60D, 0) as rupturas_60D,
    ISNULL(T.pedManual_60D, 0) as pedManual_60D, ISNULL(T.pedAuto_60D, 0) as pedAuto_60D, ISNULL(T.ped100Auto_60D, 0) as ped100Auto_60D, ISNULL(T.itens100Auto_60D, 0) as itens100Auto_60D,
    
    ISNULL(T.trocasAuto_90D, 0) as trocasAuto_90D, ISNULL(T.trocasManual_90D, 0) as trocasManual_90D, ISNULL(T.rupturas_90D, 0) as rupturas_90D,
    ISNULL(T.pedManual_90D, 0) as pedManual_90D, ISNULL(T.pedAuto_90D, 0) as pedAuto_90D, ISNULL(T.ped100Auto_90D, 0) as ped100Auto_90D, ISNULL(T.itens100Auto_90D, 0) as itens100Auto_90D
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

# --- 4. QUERY DE DETALHES (GERAÇÃO DO ARQUIVO ANALÍTICO PARA O EXCEL E PARA A TELA) ---
Write-Host "Buscando detalhes dos itens (90 DIAS para o Excel)..." -ForegroundColor Cyan

$QueryDetalhes = @"
SET DATEFORMAT dmy;

SELECT 
    c.ClienteID, -- NOVA COLUNA ADICIONADA AQUI
    c.CdExtCliente,
    c.Cart_Executivo_Vendas as Executivo,
    c.NmConglomerado as Conglomerado,
    alt.CotacaoID as pedido,
    FORMAT(TRY_CAST(alt.DataHoraAlteracao AS DATETIME), 'dd/MM/yyyy HH:mm') as data,
    CASE WHEN alt.NmUsuAlteracao = 'Sistema' THEN 'AUTO' ELSE 'MANUAL' END as tipo,
    alt.ItemAntigo as codOriginal,
    alt.NmItemAntigo as original,
    alt.ItemNovo as codSubstituto,
    alt.NmItemNovo as substituto,
    alt.QtdeAntiga as qtd,
    TRY_CAST(alt.DataPedido AS DATETIME) as DataPedidoReal
    FROM Tabela_Alteracao_Itens_Pedidos alt
    INNER JOIN Cubo_Pedido p ON alt.CotacaoID = p.CotacaoID
    INNER JOIN BR_Cliente_Cubo c ON p.ClienteID = c.ClienteID
    WHERE alt.TipoOperacao = 'Troca' 
  AND alt.ItemAntigo <> alt.ItemNovo 
  AND TRY_CAST(alt.DataPedido AS DATETIME) >= DATEADD(day, -90, GETDATE())
  AND c.CdExtCliente IN ($sqlInClause)
ORDER BY TRY_CAST(alt.DataPedido AS DATETIME) DESC
"@

$ResultDetalhes = Invoke-Sqlcmd -ServerInstance $Server -Database $Database -Username $User -Password $Password -Query $QueryDetalhes -QueryTimeout 300 -ErrorAction Stop -TrustServerCertificate

$ItensPorCliente = @{}
$AllDetailsExcel = @()
$Date7DaysAgo = (Get-Date).AddDays(-7)

foreach ($Row in $ResultDetalhes) {
    $cd = $Row["CdExtCliente"].ToString().Trim()
    
    $rawQtd = $Row["qtd"]
    $qtdVal = 0
    if ($rawQtd -ne [System.DBNull]::Value -and -not [string]::IsNullOrWhiteSpace($rawQtd.ToString())) {
        try { $qtdVal = [int][decimal]($rawQtd.ToString()) } catch { $qtdVal = 0 }
    }

    $dataPedidoObj = $Row["DataPedidoReal"]

    $itemDetail = @{
        "executivo" = if ([DBNull]::Value.Equals($Row["Executivo"])) { "Não Informado" } else { $Row["Executivo"].ToString().Trim() }
        "cliente" = if ([DBNull]::Value.Equals($Row["Conglomerado"])) { "Sem Nome" } else { $Row["Conglomerado"].ToString().Trim() }
        "clienteId" = if ([DBNull]::Value.Equals($Row["ClienteID"])) { "-" } else { $Row["ClienteID"].ToString().Trim() } # NOVO CAMPO CAPTURADO
        "erpCode" = $cd
        "pedido" = $Row["pedido"].ToString().Trim()
        "data" = $Row["data"].ToString().Trim()
        "tipo" = $Row["tipo"].ToString().Trim()
        "codOriginal" = $Row["codOriginal"].ToString().Trim()
        "original" = $Row["original"].ToString().Trim()
        "codSubstituto" = $Row["codSubstituto"].ToString().Trim()
        "substituto" = $Row["substituto"].ToString().Trim()
        "qtd" = $qtdVal
        "dataTimestamp" = if ($dataPedidoObj -ne [System.DBNull]::Value) { $dataPedidoObj.ToString("yyyy-MM-ddTHH:mm:ss") } else { (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") }
    }

    # Salva TUDO no array gigante para o Excel analítico
    $AllDetailsExcel += $itemDetail

    # Para a interface do painel web não ficar pesada, enviamos só os últimos 7 dias na tooltip (Max 150)
    if ($dataPedidoObj -ne [System.DBNull]::Value -and $dataPedidoObj -ge $Date7DaysAgo) {
        if (-not $ItensPorCliente.ContainsKey($cd)) { $ItensPorCliente[$cd] = @() }
        if ($ItensPorCliente[$cd].Count -lt 150) {
            $ItensPorCliente[$cd] += $itemDetail
        }
    }
}

# Cria a pasta public se não existir e salva o JSON analítico lá!
$JsonPath = ".\public\rupturas_analitico.json"
if (-not (Test-Path ".\public")) { New-Item -ItemType Directory -Path ".\public" | Out-Null }
$AllDetailsExcel | ConvertTo-Json -Depth 5 -Compress | Out-File $JsonPath -Encoding UTF8

Write-Host "Arquivo Analítico Base criado para o Excel com $($AllDetailsExcel.Count) linhas!" -ForegroundColor Yellow

# --- 5. PREPARAÇÃO DO PAYLOAD DE DADOS PARA A API ---
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
        "ordersCurrent" = if ($isAtivo) { [int]$Row["Orders_Current"] } else { 0 }
        "robCurrent" = if ($isAtivo) { [double]$Row["ROB_Current"] } else { 0 }
        
        "Historico_7D" = @{
            "Orders" = if ($isAtivo) { [int]$Row["Orders_7D"] } else { 0 }
            "ROB" = if ($isAtivo) { [double]$Row["ROB_7D"] } else { 0 }
            "trocasAuto" = if ($isAtivo) { [int]$Row["trocasAuto_7D"] } else { 0 }
            "trocasManual" = if ($isAtivo) { [int]$Row["trocasManual_7D"] } else { 0 }
            "pedidosComRuptura" = if ($isAtivo) { [int]$Row["rupturas_7D"] } else { 0 }
            "pedidosManual" = if ($isAtivo) { [int]$Row["pedManual_7D"] } else { 0 }
            "pedidosAuto" = if ($isAtivo) { [int]$Row["pedAuto_7D"] } else { 0 }
            "pedidos100Auto" = if ($isAtivo) { [int]$Row["ped100Auto_7D"] } else { 0 }
            "itens100Auto" = if ($isAtivo) { [int]$Row["itens100Auto_7D"] } else { 0 }
        }
        "Historico_15D" = @{
            "Orders" = if ($isAtivo) { [int]$Row["Orders_15D"] } else { 0 }
            "ROB" = if ($isAtivo) { [double]$Row["ROB_15D"] } else { 0 }
            "trocasAuto" = if ($isAtivo) { [int]$Row["trocasAuto_15D"] } else { 0 }
            "trocasManual" = if ($isAtivo) { [int]$Row["trocasManual_15D"] } else { 0 }
            "pedidosComRuptura" = if ($isAtivo) { [int]$Row["rupturas_15D"] } else { 0 }
            "pedidosManual" = if ($isAtivo) { [int]$Row["pedManual_15D"] } else { 0 }
            "pedidosAuto" = if ($isAtivo) { [int]$Row["pedAuto_15D"] } else { 0 }
            "pedidos100Auto" = if ($isAtivo) { [int]$Row["ped100Auto_15D"] } else { 0 }
            "itens100Auto" = if ($isAtivo) { [int]$Row["itens100Auto_15D"] } else { 0 }
        }
        "Historico_30D" = @{
            "Orders" = if ($isAtivo) { [int]$Row["Orders_30D"] } else { 0 }
            "ROB" = if ($isAtivo) { [double]$Row["ROB_30D"] } else { 0 }
            "trocasAuto" = if ($isAtivo) { [int]$Row["trocasAuto_30D"] } else { 0 }
            "trocasManual" = if ($isAtivo) { [int]$Row["trocasManual_30D"] } else { 0 }
            "pedidosComRuptura" = if ($isAtivo) { [int]$Row["rupturas_30D"] } else { 0 }
            "pedidosManual" = if ($isAtivo) { [int]$Row["pedManual_30D"] } else { 0 }
            "pedidosAuto" = if ($isAtivo) { [int]$Row["pedAuto_30D"] } else { 0 }
            "pedidos100Auto" = if ($isAtivo) { [int]$Row["ped100Auto_30D"] } else { 0 }
            "itens100Auto" = if ($isAtivo) { [int]$Row["itens100Auto_30D"] } else { 0 }
        }
        "Historico_60D" = @{
            "Orders" = if ($isAtivo) { [int]$Row["Orders_60D"] } else { 0 }
            "ROB" = if ($isAtivo) { [double]$Row["ROB_60D"] } else { 0 }
            "trocasAuto" = if ($isAtivo) { [int]$Row["trocasAuto_60D"] } else { 0 }
            "trocasManual" = if ($isAtivo) { [int]$Row["trocasManual_60D"] } else { 0 }
            "pedidosComRuptura" = if ($isAtivo) { [int]$Row["rupturas_60D"] } else { 0 }
            "pedidosManual" = if ($isAtivo) { [int]$Row["pedManual_60D"] } else { 0 }
            "pedidosAuto" = if ($isAtivo) { [int]$Row["pedAuto_60D"] } else { 0 }
            "pedidos100Auto" = if ($isAtivo) { [int]$Row["ped100Auto_60D"] } else { 0 }
            "itens100Auto" = if ($isAtivo) { [int]$Row["itens100Auto_60D"] } else { 0 }
        }
        "Historico_90D" = @{
            "Orders" = if ($isAtivo) { [int]$Row["Orders_90D"] } else { 0 }
            "ROB" = if ($isAtivo) { [double]$Row["ROB_90D"] } else { 0 }
            "trocasAuto" = if ($isAtivo) { [int]$Row["trocasAuto_90D"] } else { 0 }
            "trocasManual" = if ($isAtivo) { [int]$Row["trocasManual_90D"] } else { 0 }
            "pedidosComRuptura" = if ($isAtivo) { [int]$Row["rupturas_90D"] } else { 0 }
            "pedidosManual" = if ($isAtivo) { [int]$Row["pedManual_90D"] } else { 0 }
            "pedidosAuto" = if ($isAtivo) { [int]$Row["pedAuto_90D"] } else { 0 }
            "pedidos100Auto" = if ($isAtivo) { [int]$Row["ped100Auto_90D"] } else { 0 }
            "itens100Auto" = if ($isAtivo) { [int]$Row["itens100Auto_90D"] } else { 0 }
        }

        "IntegracaoAutomaticaSAP" = $integraSAP
        "UtilizaJanelaCorte" = $utilizaJanela
        "FlagProgramacaoAutomatica" = $flagProgAuto
        "FlagUtilizaLiberacaoAutomatica" = $flagLibAuto
        "TemJanelaMesAtual" = $temJanelaMesAtual
        "FlagNaoLiberaAutomatico" = $flagNaoLibera
        "MultiCDEnderecos" = if ([DBNull]::Value.Equals($Row["MultiCDEnderecos"])) { "NAO" } else { $Row["MultiCDEnderecos"].ToString().Trim().ToUpper() }
        "FatMultiCD" = if ([DBNull]::Value.Equals($Row["FatMultiCD"])) { "NAO" } else { $Row["FatMultiCD"].ToString().Trim().ToUpper() }
        "NaoLiberarPedidoSemOC" = if ([DBNull]::Value.Equals($Row["NaoLiberarPedidoSemOC"])) { "NAO" } else { $Row["NaoLiberarPedidoSemOC"].ToString().Trim().ToUpper() }
        "TrocaAutomatica" = if ([DBNull]::Value.Equals($Row["TrocaAutomatica"])) { "SIM" } else { $Row["TrocaAutomatica"].ToString().Trim().ToUpper() }

        "FlagGeraOVAuto" = if ($integraSAP -eq "SIM" -and $isAtivo) { $true } else { $false }
        "Etapa2Ativo" = $etapa2
        "Etapa3Ativo" = $etapa3

        "ItensDetalhados" = if ($ItensPorCliente.ContainsKey($cdExtCliente)) { $ItensPorCliente[$cdExtCliente] } else { @() }
    }
    $ResultData += $clientObj
}

Write-Host "Processamento concluído. $( $ResultData.Count ) clientes preparados." -ForegroundColor Green

# --- 6. ENVIO PARA A API DE SYNC ---
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

    # --- 7. LIMPEZA DOS FANTASMAS ---
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