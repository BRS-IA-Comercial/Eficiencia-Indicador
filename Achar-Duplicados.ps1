$Server = "192.168.0.18"
$Database = "brweb"
$User = "power_Bi"
$Password = "brs123#"

$Query = @"
SELECT 
    CdExtCliente, 
    NmCliente,
    COUNT(*) as Qtd
FROM BR_Cliente_Cubo
GROUP BY CdExtCliente, NmCliente
HAVING COUNT(*) > 1
ORDER BY Qtd DESC
"@

Write-Host "Buscando ERPs duplicados no SQL..." -ForegroundColor Cyan

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

$linhas = $DataSet.Tables[0].Rows

if ($linhas.Count -gt 0) {
    Write-Host "ATENÇÃO! Encontrei $($linhas.Count) ERP(s) duplicado(s):" -ForegroundColor Yellow
    Write-Host "---------------------------------------------------"
    foreach ($Row in $linhas) {
        $erp = $Row["CdExtCliente"].ToString()
        $nome = $Row["NmCliente"].ToString()
        $qtd = $Row["Qtd"].ToString()
        
        Write-Host "ERP: $erp | Repetições: $qtd | Cliente: $nome" -ForegroundColor Red
    }
} else {
    Write-Host "Nenhum ERP duplicado encontrado na base toda!" -ForegroundColor Green
}