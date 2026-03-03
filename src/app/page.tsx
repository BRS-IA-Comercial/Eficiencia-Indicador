
"use client";

import React, { useState, useMemo, useRef } from "react";
import { 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2,
  Loader2,
  FileUp,
  X,
  Brain,
  Search,
  Bell,
  RefreshCw,
  TrendingUp,
  Activity,
  CheckCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

export default function OrderFulfillmentDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const db = useFirestore();
  const { toast } = useToast();

  // Busca real dos dados do Firestore para exibição
  const erpMappingsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "erp_mappings"), orderBy("importedAt", "desc"));
  }, [db]);

  const { data: erpMappings, loading: isLoadingData } = useCollection(erpMappingsQuery);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Garante que o clique não suba para o seletor de arquivo
    if (!db || !selectedFile) return;

    setIsImporting(true);
    
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Converter para JSON (matriz de arrays para pegar as colunas C e E)
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      const erpMappingsRef = collection(db, "erp_mappings");
      let count = 0;

      // Iterar pelas linhas (pulando o cabeçalho)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const conglomerado = row[2]; // Coluna C (índice 2)
        const erpMaeRaw = row[4];   // Coluna E (índice 4)

        if (conglomerado && erpMaeRaw) {
          const erpCodes = String(erpMaeRaw)
            .split(",")
            .map(code => code.trim())
            .filter(code => code !== "");
          
          // Gravação no Firestore
          addDoc(erpMappingsRef, {
            conglomerado: String(conglomerado),
            erpMaeCodes: erpCodes,
            importedAt: serverTimestamp()
          }).catch(err => {
            console.error("Erro ao salvar no banco:", err);
          });
          
          count++;
        }
      }

      toast({
        title: "Sucesso!",
        description: `${count} registros foram enviados para o banco de dados.`,
      });
      
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Erro na importação:", error);
      toast({
        variant: "destructive",
        title: "Erro fatal",
        description: "Não foi possível processar o arquivo Excel.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-body p-4 overflow-x-auto">
      <div className="max-w-[1400px] mx-auto space-y-4">
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList className="bg-white dark:bg-surface-dark shadow-sm border">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="configuracao" className="gap-2">
                <SettingsIcon className="h-4 w-4" />
                Configuração
              </TabsTrigger>
            </TabsList>
            <div className="text-xxs font-bold text-muted-foreground uppercase tracking-widest bg-white dark:bg-surface-dark px-3 py-1 rounded border">
              Fluxo Vision v3.1 - Cloud Realtime
            </div>
          </div>

          <TabsContent value="dashboard" className="mt-0">
            <div className="bg-surface-light dark:bg-surface-dark shadow-xl rounded-lg overflow-hidden border border-border-light dark:border-border-dark">
              <header className="bg-primary text-white text-center py-3 font-bold text-xl uppercase tracking-wide border-b border-white dark:border-gray-700">
                Etapas do Processo de Atendimento de Pedidos
              </header>

              {/* Grid 1: Cabeçalhos das Etapas */}
              <div className="grid grid-cols-[220px_repeat(6,_1fr)] text-sm">
                <div className="bg-white dark:bg-surface-dark border-r border-b border-gray-200 dark:border-gray-700"></div>
                {[
                  { id: 1, label: "Entrada de Pedidos" },
                  { id: 2, label: "Programação de Pedidos" },
                  { id: 3, label: "Liberação de Pedidos" },
                  { id: 4, label: "Geração de OV" },
                  { id: 5, label: "Tratamento de Rupturas" },
                  { id: 6, label: "Ocorrências de Entrega" },
                ].map((step) => (
                  <div key={step.id} className="bg-primary text-white p-1 text-center font-semibold text-xs flex items-center justify-center gap-1 border-r border-white dark:border-gray-700 last:border-r-0">
                    <span className="bg-white/20 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{step.id}</span>
                    {step.label}
                  </div>
                ))}
              </div>

              {/* Grid 2: Forma e % */}
              <div className="grid grid-cols-[220px_repeat(12,_1fr)] text-sm">
                <div className="bg-white dark:bg-surface-dark border-r border-b border-gray-200 dark:border-gray-700"></div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <div className="bg-gray-600 text-white text-[10px] text-center py-1 border-r border-b border-gray-400">Forma</div>
                    <div className="bg-gray-600 text-white text-[10px] text-center py-1 border-r border-b border-white">%</div>
                  </React.Fragment>
                ))}
              </div>

              {/* Conteúdo Dinâmico (Conglomerados) */}
              <div className="bg-gray-600 text-white text-center py-1 font-bold text-xs uppercase tracking-tighter">
                Conglomerados e ERPs Mapeados no Sistema
              </div>
              
              <div className="max-h-[300px] overflow-y-auto">
                {isLoadingData && (
                  <div className="p-8 text-center text-muted-foreground bg-white dark:bg-surface-dark">
                    <Loader2 className="animate-spin inline mr-2 h-4 w-4" /> Sincronizando dados reais...
                  </div>
                )}
                {erpMappings?.map((mapping: any) => (
                  <div key={mapping.id} className="grid grid-cols-[220px_1fr] border-b border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold px-3 py-1 flex items-center text-xxs border-r border-white dark:border-gray-700">
                      {mapping.conglomerado}
                    </div>
                    <div className="px-3 py-1 flex gap-1 items-center flex-wrap bg-white dark:bg-surface-dark">
                      {mapping.erpMaeCodes.map((code: string, i: number) => (
                        <Badge key={i} variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[9px] h-4 py-0">{code}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {!isLoadingData && (!erpMappings || erpMappings.length === 0) && (
                  <div className="p-8 text-center text-muted-foreground italic bg-white dark:bg-surface-dark text-xs">
                    Nenhum mapeamento no banco. Importe um Excel na aba de Configuração.
                  </div>
                )}
              </div>

              {/* Tabela de Gestores (Estática conforme modelo) */}
              <div className="grid grid-cols-[220px_1fr] border-t-2 border-gray-400">
                <div className="bg-gray-600 text-white text-center py-2 font-bold text-sm">Gestores</div>
                <div className="bg-gray-600 text-white text-center py-2 font-bold text-sm">Detalhamento por Cliente</div>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-800">
                {[
                  { name: "Ana Paula Alcantara Rauber", values: [81, 99, 15, 12, 0, 0] },
                  { name: "Alexandre Postingher Lutke", values: [100, 100, 7, 42, 2, 0] },
                  { name: "Fabio Trevisan", values: [71, 92, 48, 41, 0, 0] }
                ].map((gestor, idx) => (
                  <div key={idx} className="grid grid-cols-[220px_repeat(6,_1fr)] text-sm border-b border-gray-300 dark:border-gray-700">
                    <div className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-medium px-3 py-1 flex items-center text-xxs border-r border-white dark:border-gray-700">
                      {gestor.name}
                    </div>
                    {gestor.values.map((val, vIdx) => (
                      <div key={vIdx} className={`text-center py-1 font-bold border-r border-white dark:border-gray-700 flex items-center justify-center text-xs ${val >= 90 ? 'bg-secondary text-white' : val > 0 ? 'bg-amber-400 text-white' : 'bg-gray-300 text-white dark:bg-gray-500'}`}>
                        {val}%
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="configuracao" className="mt-0">
            <Card className="shadow-lg border-primary/20">
              <CardHeader className="bg-primary text-white rounded-t-lg">
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileSpreadsheet className="h-6 w-6" />
                  Importação de Base ERP (Real)
                </CardTitle>
                <CardDescription className="text-white/90">
                  Importe dados reais do seu Excel para mapear Conglomerados e ERPs.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-xl p-12 bg-muted/5 relative">
                  
                  {/* O input só aparece e cobre a área se não houver arquivo selecionado */}
                  {!selectedFile && (
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".xlsx, .xls"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  )}
                  
                  {selectedFile ? (
                    <div className="flex flex-col items-center z-20">
                      <div className="bg-secondary/10 p-6 rounded-full mb-4">
                        <CheckCircle2 className="h-10 w-10 text-secondary" />
                      </div>
                      <h3 className="text-lg font-bold mb-1">{selectedFile.name}</h3>
                      <p className="text-sm text-muted-foreground mb-6">Arquivo pronto para processamento.</p>
                      <div className="flex gap-3">
                         <Button 
                           onClick={() => { setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; }}
                           variant="outline"
                           className="gap-2"
                         >
                           <X className="h-4 w-4" /> Cancelar
                         </Button>
                         <Button 
                          onClick={handleImport}
                          className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 px-8"
                          disabled={isImporting}
                        >
                          {isImporting ? <Loader2 className="animate-spin h-4 w-4" /> : <Upload className="h-4 w-4" />}
                          {isImporting ? "Salvando..." : "Confirmar Importação"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center">
                      <div className="bg-primary/10 p-6 rounded-full mb-4">
                        <FileUp className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">Selecione sua planilha Excel</h3>
                      <p className="text-sm text-muted-foreground mb-4 max-w-md">
                        Mapeamento automático: <strong>Coluna C</strong> para Conglomerado e <strong>Coluna E</strong> para ERPs.
                      </p>
                      <Badge variant="outline" className="text-xxs border-primary/20 text-primary">
                        Suporta múltiplos ERPs separados por vírgula na Coluna E
                      </Badge>
                    </div>
                  )}
                </div>

                {erpMappings && erpMappings.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="font-bold text-primary flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Últimos Registros no Banco (Cloud)
                      </h4>
                      <Badge variant="secondary">{erpMappings.length} Registros</Badge>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="text-xxs uppercase">Conglomerado</TableHead>
                            <TableHead className="text-xxs uppercase">ERP's Vinculados</TableHead>
                            <TableHead className="text-right text-xxs uppercase">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {erpMappings.slice(0, 5).map((row: any) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-bold text-xs">{row.conglomerado}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {row.erpMaeCodes.map((code: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-[10px] bg-secondary/5 text-secondary border-secondary/20">
                                      {code}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge className="bg-secondary text-white text-[9px]">Sincronizado</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
