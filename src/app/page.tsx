
"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2,
  Loader2,
  FileUp,
  Database,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  User,
  Building2,
  Cpu
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useFirebaseApp } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import * as XLSX from "xlsx";

export default function OrderFulfillmentDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [host, setHost] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const db = useFirestore();
  const app = useFirebaseApp();
  const { toast } = useToast();

  const projectId = app.options.projectId;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHost(window.location.host);
    }
  }, []);

  const erpMappingsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "erp_mappings"), orderBy("importedAt", "desc"));
  }, [db]);

  const cuboMetricsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "cubo_metrics"), orderBy("updatedAt", "desc"));
  }, [db]);

  const { data: erpMappings, loading: isLoadingMappings } = useCollection(erpMappingsQuery);
  const { data: cuboMetrics, loading: isLoadingMetrics } = useCollection(cuboMetricsQuery);

  const groupedData = useMemo(() => {
    if (!cuboMetrics || !erpMappings) return [];

    const executives: Record<string, any> = {};
    const conglomerateToErp: Record<string, string[]> = {};
    
    // Mapeia os dados do Excel (Conglomerado -> Lista de ERPs)
    erpMappings.forEach((m: any) => {
      conglomerateToErp[m.conglomerado] = m.erpMaeCodes;
    });

    // Agrupa dados do Cubo (Executivo -> Conglomerado)
    cuboMetrics.forEach((m: any) => {
      const execName = m.executivo || "Não Definido";
      const congName = m.conglomerado || m.cliente || "Não Mapeado";

      if (!executives[execName]) {
        executives[execName] = { name: execName, conglomerates: new Set() };
      }
      executives[execName].conglomerates.add(congName);
    });

    return Object.values(executives).map(exec => ({
      ...exec,
      conglomerates: Array.from(exec.conglomerates).map((congName: any) => ({
        name: congName,
        erps: conglomerateToErp[congName] || []
      }))
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [cuboMetrics, erpMappings]);

  const toggleItem = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    groupedData.forEach(exec => {
      all[exec.name] = true;
      exec.conglomerates.forEach((cong: any) => {
        all[`${exec.name}-${cong.name}`] = true;
      });
    });
    setExpandedItems(all);
  };

  const collapseAll = () => setExpandedItems({});

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!db || !selectedFile) return;
    setIsImporting(true);
    
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      let count = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const conglomerado = String(row[2] || "").trim();
        const erpMaeRaw = row[4];

        if (conglomerado && erpMaeRaw) {
          const erpCodes = String(erpMaeRaw).split(",").map(c => c.trim()).filter(c => c !== "");
          const payload = {
            conglomerado: conglomerado,
            erpMaeCodes: erpCodes,
            importedAt: serverTimestamp()
          };

          // Usamos o NOME do conglomerado como ID fixo para evitar duplicatas
          const mappingRef = doc(db, "erp_mappings", conglomerado);
          
          setDoc(mappingRef, payload, { merge: true }).catch(async () => {
            const permissionError = new FirestorePermissionError({
              path: mappingRef.path,
              operation: 'write',
              requestResourceData: payload,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
          });
          count++;
        }
      }

      toast({ title: "Sucesso!", description: `${count} conglomerados atualizados no mapeamento.` });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao processar arquivo." });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-body p-4">
      <div className="max-w-[1600px] mx-auto space-y-4">
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList className="bg-white dark:bg-surface-dark shadow-sm border">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" /> Dashboard de Processos
              </TabsTrigger>
              <TabsTrigger value="configuracao" className="gap-2">
                <SettingsIcon className="h-4 w-4" /> Sincronização & API
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-4">
               <Badge variant="outline" className="bg-white gap-2 px-3 py-1 border-primary/20 text-primary">
                  <Database className="h-3 w-3" /> {projectId}
               </Badge>
            </div>
          </div>

          <TabsContent value="dashboard" className="mt-0 space-y-4">
            <div className="bg-surface-light dark:bg-surface-dark shadow-xl rounded-lg overflow-hidden border border-border-light dark:border-border-dark min-w-[1200px]">
              <header className="bg-primary text-white text-center py-3 font-bold text-xl uppercase tracking-wide border-b border-white dark:border-gray-700">
                Acompanhamento Operacional por Executivo
              </header>

              <div className="grid grid-cols-[300px_repeat(6,_1fr)] text-sm border-b">
                <div className="bg-white dark:bg-surface-dark p-3 font-bold text-muted-foreground uppercase text-xxs tracking-widest flex items-center gap-2">
                  <User className="h-3 w-3" /> Hierarquia de Atendimento
                </div>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-primary/90 text-white p-2 text-center font-bold text-[10px] flex flex-col items-center justify-center border-l border-white/20">
                    <span className="opacity-70">ETAPA</span>
                    <span className="text-lg">{i}</span>
                  </div>
                ))}
              </div>

              <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
                <span className="font-bold text-xxs uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="h-3 w-3 text-primary" /> Visão Consolidada Cubo + Excel
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] bg-white/10 hover:bg-white/20 text-white border-white/20" onClick={expandAll}>
                    <ChevronsDown className="h-3 w-3 mr-1" /> Expandir Tudo
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] bg-white/10 hover:bg-white/20 text-white border-white/20" onClick={collapseAll}>
                    <ChevronsUp className="h-3 w-3 mr-1" /> Recolher Tudo
                  </Button>
                </div>
              </div>
              
              <div className="max-h-[750px] overflow-y-auto bg-white dark:bg-surface-dark divide-y divide-gray-100 dark:divide-gray-800">
                {(isLoadingMappings || isLoadingMetrics) && (
                  <div className="p-12 text-center text-muted-foreground animate-pulse">
                    <Loader2 className="animate-spin inline mr-2 h-5 w-5" /> Sincronizando dados em tempo real...
                  </div>
                )}
                
                {groupedData.map((exec) => {
                  const isExecExpanded = !!expandedItems[exec.name];
                  return (
                    <div key={exec.name} className="flex flex-col">
                      <div 
                        className="flex items-center justify-between p-4 bg-gray-100/50 dark:bg-gray-900/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 border-l-4 border-primary transition-all"
                        onClick={() => toggleItem(exec.name)}
                      >
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-primary" />
                          <span className="font-black text-base text-gray-800 dark:text-gray-100 uppercase tracking-tight">
                            {exec.name}
                          </span>
                        </div>
                        {isExecExpanded ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                      </div>

                      {isExecExpanded && (
                        <div className="divide-y divide-gray-50 dark:divide-gray-800 animate-in slide-in-from-top-1 duration-200">
                          {exec.conglomerates.map((cong: any) => {
                            const congId = `${exec.name}-${cong.name}`;
                            const isCongExpanded = !!expandedItems[congId];
                            return (
                              <div key={congId} className="flex flex-col ml-4 border-l-2 border-gray-200 dark:border-gray-700">
                                <div 
                                  className="flex items-center justify-between p-3 bg-white dark:bg-surface-dark cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                  onClick={() => toggleItem(congId)}
                                >
                                  <div className="flex items-center gap-3">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-bold text-sm text-gray-700 dark:text-gray-300 uppercase">
                                      {cong.name}
                                    </span>
                                  </div>
                                  {isCongExpanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                </div>

                                {isCongExpanded && (
                                  <div className="animate-in slide-in-from-top-1 duration-150">
                                    {cong.erps.length > 0 ? (
                                      cong.erps.map((code: string, i: number) => (
                                        <div key={i} className="grid grid-cols-[300px_repeat(6,_1fr)] border-t border-gray-100 dark:border-gray-800 hover:bg-primary/5 group transition-colors">
                                          <div className="p-3 pl-12 flex items-center gap-2 border-r bg-gray-50/30 dark:bg-gray-900/10">
                                            <Cpu className="h-3 w-3 text-muted-foreground" />
                                            <div className="flex flex-col">
                                              <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Cód. ERP Mãe</span>
                                              <span className="text-xs font-bold text-primary">{code}</span>
                                            </div>
                                          </div>
                                          {[1, 2, 3, 4, 5, 6].map((step) => (
                                            <div key={step} className="p-3 flex items-center justify-center border-r last:border-r-0">
                                              <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-bold text-gray-400 group-hover:text-primary transition-colors">0%</span>
                                                <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden mt-1">
                                                  <div className="bg-primary h-full w-0 transition-all duration-500" />
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="p-3 pl-12 text-[10px] text-muted-foreground italic bg-yellow-50/30">
                                        Nenhum ERP mapeado para este conglomerado.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="configuracao" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-lg border-primary/20">
                <CardHeader className="bg-primary text-white rounded-t-lg">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <FileSpreadsheet className="h-6 w-6" /> Mapeamento Excel
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 bg-muted/5 relative flex flex-col items-center justify-center text-center">
                    {!selectedFile && (
                      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx, .xls" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    )}
                    {selectedFile ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="h-10 w-10 text-secondary mb-3" />
                        <h3 className="font-bold">{selectedFile.name}</h3>
                        <div className="flex gap-2 mt-4">
                           <Button onClick={() => setSelectedFile(null)} variant="outline" size="sm">Limpar</Button>
                           <Button onClick={handleImport} disabled={isImporting} size="sm">
                            {isImporting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />} Confirmar Importação
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <FileUp className="h-10 w-10 text-primary mb-3" />
                        <h3 className="font-bold">Planilha de Conglomerados</h3>
                        <p className="text-xs text-muted-foreground">Coluna C: Conglomerado | Coluna E: ERPs</p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-primary/20">
                <CardHeader className="bg-gray-800 text-white rounded-t-lg">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Database className="h-6 w-6" /> Automação PowerShell (Cubo)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                    <h4 className="font-bold mb-2">Instruções para o Servidor</h4>
                    <p className="text-xs mb-3">O script envia dados vinculados ao Cliente. Se o Executivo mudar no SQL, o Dashboard atualizará automaticamente.</p>
                    <code className="block bg-gray-900 text-green-400 p-3 rounded text-xxs mb-4 select-all">
                      POST https://{host || '...'}/api/sync
                    </code>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Header de Autenticação:</p>
                      <code className="block bg-gray-100 p-2 rounded text-[10px] border">x-api-key: fluxo-vision-master-key-2025</code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
