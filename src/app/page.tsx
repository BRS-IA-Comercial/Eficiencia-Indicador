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
  RefreshCw,
  Database,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  TrendingUp,
  DollarSign,
  Clock,
  Users
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useFirebaseApp } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

export default function OrderFulfillmentDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const db = useFirestore();
  const app = useFirebaseApp();
  const { toast } = useToast();

  const projectId = app.options.projectId;

  const erpMappingsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "erp_mappings"), orderBy("importedAt", "desc"));
  }, [db]);

  const productivityQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "cubo_metrics"), orderBy("updatedAt", "desc"), limit(50));
  }, [db]);

  const { data: erpMappings, loading: isLoadingMappings } = useCollection(erpMappingsQuery);
  const { data: cuboMetrics, loading: isLoadingMetrics } = useCollection(productivityQuery);

  // Cálculos de ROI baseados nos dados do Cubo
  const stats = useMemo(() => {
    if (!cuboMetrics) return { totalSaving: 0, totalFte: 0, totalHours: 0 };
    return cuboMetrics.reduce((acc, curr: any) => ({
      totalSaving: acc.totalSaving + (curr.financialGain || 0),
      totalFte: acc.totalFte + (curr.fte || 0),
      totalHours: acc.totalHours + (curr.hoursSaved || 0),
    }), { totalSaving: 0, totalFte: 0, totalHours: 0 });
  }, [cuboMetrics]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    if (!erpMappings) return;
    const all = erpMappings.reduce((acc: any, curr: any) => {
      acc[curr.id] = true;
      return acc;
    }, {});
    setExpandedRows(all);
  };

  const collapseAll = () => {
    setExpandedRows({});
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!db || !selectedFile) return;

    setIsImporting(true);
    
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      const erpMappingsRef = collection(db, "erp_mappings");
      let count = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const conglomerado = row[2];
        const erpMaeRaw = row[4];

        if (conglomerado && erpMaeRaw) {
          const erpCodes = String(erpMaeRaw)
            .split(",")
            .map(code => code.trim())
            .filter(code => code !== "");
          
          const payload = {
            conglomerado: String(conglomerado),
            erpMaeCodes: erpCodes,
            importedAt: serverTimestamp()
          };

          addDoc(erpMappingsRef, payload)
            .catch(async (serverError) => {
              const permissionError = new FirestorePermissionError({
                path: erpMappingsRef.path,
                operation: 'create',
                requestResourceData: payload,
              } satisfies SecurityRuleContext);
              errorEmitter.emit('permission-error', permissionError);
            });
          
          count++;
        }
      }

      toast({
        title: "Sucesso!",
        description: `${count} registros estão sendo sincronizados.`,
      });
      
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro fatal",
        description: "Não foi possível processar o arquivo.",
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
              <TabsTrigger value="produtividade" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Produtividade (ROI)
              </TabsTrigger>
              <TabsTrigger value="configuracao" className="gap-2">
                <SettingsIcon className="h-4 w-4" />
                Configuração
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-4">
               <Badge variant="outline" className="bg-white gap-2 px-3 py-1 border-primary/20 text-primary">
                  <Database className="h-3 w-3" />
                  ID Projeto: <span className="font-bold">{projectId}</span>
               </Badge>
               <div className="text-xxs font-bold text-muted-foreground uppercase tracking-widest bg-white dark:bg-surface-dark px-3 py-1 rounded border">
                Fluxo Vision v4.0 - ROI Master
              </div>
            </div>
          </div>

          <TabsContent value="dashboard" className="mt-0 space-y-4">
            {/* Cards de ROI Rápidos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-primary text-white border-none shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xxs font-bold uppercase opacity-80">Saving Financeiro IA</p>
                      <h3 className="text-2xl font-black">R$ {stats.totalSaving.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <DollarSign className="h-8 w-8 opacity-40" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-secondary text-white border-none shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xxs font-bold uppercase opacity-80">Produtividade Gerada</p>
                      <h3 className="text-2xl font-black">{stats.totalFte.toFixed(2)} FTE</h3>
                    </div>
                    <Users className="h-8 w-8 opacity-40" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 text-white border-none shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xxs font-bold uppercase opacity-80">Horas Salvas (S&OP)</p>
                      <h3 className="text-2xl font-black">{stats.totalHours.toFixed(1)} h</h3>
                    </div>
                    <Clock className="h-8 w-8 opacity-40" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark shadow-xl rounded-lg overflow-hidden border border-border-light dark:border-border-dark min-w-[1200px]">
              <header className="bg-primary text-white text-center py-3 font-bold text-xl uppercase tracking-wide border-b border-white dark:border-gray-700">
                Processo de Atendimento de Pedidos - Visão Geral
              </header>

              {/* ... (Cabeçalhos do Dashboard - Mantidos os mesmos) ... */}
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

              <div className="bg-gray-600 text-white px-4 py-2 flex items-center justify-between border-t border-b border-gray-400">
                <span className="font-bold text-xs uppercase tracking-tighter">
                  Conglomerados e ERPs Sincronizados
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-6 text-[9px] bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1"
                    onClick={expandAll}
                  >
                    <ChevronsDown className="h-3 w-3" /> Expandir Tudo
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-6 text-[9px] bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1"
                    onClick={collapseAll}
                  >
                    <ChevronsUp className="h-3 w-3" /> Recolher Tudo
                  </Button>
                </div>
              </div>
              
              <div className="max-h-[600px] overflow-y-auto bg-white dark:bg-surface-dark divide-y divide-gray-200 dark:divide-gray-700">
                {isLoadingMappings && (
                  <div className="p-8 text-center text-muted-foreground italic text-xs animate-pulse">
                    <Loader2 className="animate-spin inline mr-2 h-4 w-4" /> Sincronizando dados mestre...
                  </div>
                )}
                {erpMappings?.map((mapping: any) => {
                  const isExpanded = !!expandedRows[mapping.id];
                  return (
                    <div key={mapping.id} className="transition-colors">
                      <div 
                        className="flex items-center justify-between p-3 cursor-pointer group bg-gray-50/50 hover:bg-gray-100 dark:bg-surface-dark dark:hover:bg-gray-800 transition-all border-b border-gray-100 dark:border-gray-800"
                        onClick={() => toggleRow(mapping.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-primary rounded-full shadow-sm" />
                          <span className="font-black text-sm text-gray-800 dark:text-gray-100 uppercase tracking-tight">
                            {mapping.conglomerado}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground border-gray-200 bg-white dark:bg-surface-dark px-2">
                            {mapping.erpMaeCodes.length} ERPs Vinculados
                          </Badge>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-primary" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="animate-in slide-in-from-top-2 duration-300">
                          {mapping.erpMaeCodes.map((code: string, i: number) => (
                            <div key={i} className="grid grid-cols-[220px_repeat(12,_1fr)] border-b border-gray-100 dark:border-gray-800 hover:bg-accent/5 transition-colors">
                              <div className="bg-white dark:bg-surface-dark p-3 border-r border-gray-100 dark:border-gray-800 flex flex-col justify-center">
                                <span className="text-[9px] text-muted-foreground font-black uppercase mb-0.5 tracking-tighter">Cód. ERP Mãe</span>
                                <span className="text-xs font-bold text-primary truncate">{code}</span>
                              </div>
                              
                              {Array.from({ length: 6 }).map((_, stepIdx) => (
                                <React.Fragment key={`erp-data-${i}-${stepIdx}`}>
                                  <div className="bg-gray-50/30 dark:bg-surface-dark/30 border-r border-gray-100 dark:border-gray-800 flex items-center justify-center text-[10px] text-muted-foreground italic">—</div>
                                  <div className="bg-white dark:bg-surface-dark border-r border-gray-100 dark:border-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400">0%</div>
                                </React.Fragment>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="produtividade" className="mt-0">
            <Card className="shadow-lg border-primary/20">
              <CardHeader className="bg-gray-800 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  Métricas de Produtividade (FTE & ROI)
                </CardTitle>
                <CardDescription className="text-white/70">
                  Dados consolidados dos cubos SQL internos da companhia.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-xxs uppercase font-black">Executivo</TableHead>
                        <TableHead className="text-xxs uppercase font-black">Cliente / Conglomerado</TableHead>
                        <TableHead className="text-xxs uppercase font-black">Origem</TableHead>
                        <TableHead className="text-center text-xxs uppercase font-black">Pedidos IA</TableHead>
                        <TableHead className="text-center text-xxs uppercase font-black">Horas Salvas</TableHead>
                        <TableHead className="text-center text-xxs uppercase font-black">FTE</TableHead>
                        <TableHead className="text-right text-xxs uppercase font-black">ROI (R$)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingMetrics ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                             <Loader2 className="animate-spin h-6 w-6 mx-auto mb-2 text-primary" />
                             <span className="text-xs text-muted-foreground">Sincronizando com Cubos SQL...</span>
                          </TableCell>
                        </TableRow>
                      ) : cuboMetrics?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs italic">
                            Nenhuma métrica sincronizada. Envie os dados do seu script SQL para este aplicativo.
                          </TableCell>
                        </TableRow>
                      ) : cuboMetrics?.map((metric: any) => (
                        <TableRow key={metric.id} className="hover:bg-accent/5">
                          <TableCell className="font-bold text-xs">{metric.executivo}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium">{metric.cliente}</span>
                              <span className="text-[9px] text-muted-foreground uppercase">{metric.conglomerado || metric.grupo}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] uppercase border-primary/20 text-primary">
                              {metric.origem}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs">{metric.qtdIA}</TableCell>
                          <TableCell className="text-center text-xs">{metric.hoursSaved}h</TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-secondary text-white text-[9px]">{metric.fte} FTE</Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-xs text-primary">
                            R$ {metric.financialGain.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs">
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Como Sincronizar seu Script PowerShell
              </h4>
              <p className="mb-2">Seu script PowerShell agora pode enviar dados diretamente para o Firestore. Use o seguinte comando no final do seu script:</p>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-[10px] overflow-x-auto">
{`# Exemplo de envio via PowerShell
$jsonPayload = $payloadFinal | ConvertTo-Json -Depth 10 -Compress
# Você precisará de uma API Route (ex: /api/sync) ou usar o SDK do Firebase Admin no servidor.`}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="configuracao" className="mt-0">
            {/* ... (Conteúdo de Configuração Mantido) ... */}
            <Card className="shadow-lg border-primary/20">
              <CardHeader className="bg-primary text-white rounded-t-lg">
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileSpreadsheet className="h-6 w-6" />
                  Importação de Mapeamento ERP
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-xl p-12 bg-muted/5 relative">
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
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="h-10 w-10 text-secondary mb-4" />
                      <h3 className="text-lg font-bold mb-1">{selectedFile.name}</h3>
                      <div className="flex gap-3 mt-4">
                         <Button onClick={() => setSelectedFile(null)} variant="outline">Cancelar</Button>
                         <Button onClick={handleImport} disabled={isImporting} className="bg-primary font-bold">
                          {isImporting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                          Confirmar Importação Real
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center">
                      <FileUp className="h-10 w-10 text-primary mb-4" />
                      <h3 className="text-lg font-bold">Selecione sua planilha de Mapeamento</h3>
                      <p className="text-sm text-muted-foreground">Coluna C (Conglomerado) e Coluna E (ERPs)</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}