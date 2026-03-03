
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
  X
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
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const db = useFirestore();
  const { toast } = useToast();

  // Busca real dos dados do Firestore
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

  const handleImport = async () => {
    if (!db || !selectedFile) return;

    setIsImporting(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Converter para JSON (matriz de arrays para pegar as colunas C e E)
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        const erpMappingsRef = collection(db, "erp_mappings");
        let count = 0;

        // Pulando cabeçalho (assumindo que a linha 0 é o cabeçalho)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const conglomerado = row[2]; // Coluna C (índice 2)
          const erpMaeRaw = row[4];   // Coluna E (índice 4)

          if (conglomerado && erpMaeRaw) {
            const erpCodes = String(erpMaeRaw)
              .split(",")
              .map(code => code.trim())
              .filter(code => code !== "");
            
            // Gravação não-bloqueante no Firestore
            addDoc(erpMappingsRef, {
              conglomerado: String(conglomerado),
              erpMaeCodes: erpCodes,
              importedAt: serverTimestamp()
            }).catch(err => {
              console.error("Erro ao salvar documento:", err);
            });
            
            count++;
          }
        }

        toast({
          title: "Importação iniciada",
          description: `${count} registros estão sendo processados e salvos no cloud.`,
        });
        
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsImporting(false);
      };
      reader.readAsBinaryString(selectedFile);
    } catch (error) {
      console.error("Erro ao ler arquivo:", error);
      toast({
        variant: "destructive",
        title: "Erro na leitura",
        description: "Não foi possível processar o arquivo Excel.",
      });
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-background-light dark:bg-background-dark font-body">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        <Tabs defaultValue="dashboard" className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px] bg-white dark:bg-surface-dark shadow-sm border">
              <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="configuracao" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <SettingsIcon className="h-4 w-4" />
                Configuração
              </TabsTrigger>
            </TabsList>
            
            <div className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground">
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Vision Fluxo v3.0 - Cloud</span>
            </div>
          </div>

          <TabsContent value="dashboard" className="mt-0">
            <div className="bg-surface-light dark:bg-surface-dark shadow-xl rounded-lg overflow-hidden border border-border-light dark:border-border-dark">
              <header className="bg-primary text-white text-center py-3 font-bold text-xl uppercase tracking-wide border-b border-white dark:border-gray-700">
                Etapas do Processo de Atendimento de Pedidos
              </header>

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
                    <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-[10px]">{step.id}</span>
                    {step.label}
                  </div>
                ))}
              </div>

              <div className="p-8 text-center text-muted-foreground bg-white dark:bg-surface-dark border-b">
                Grade de Alta Densidade Ativa
                <div className="mt-2 text-xxs opacity-50 font-mono uppercase tracking-tighter">Firestore Syncing...</div>
              </div>

              <div className="bg-gray-600 text-white text-center py-2 font-bold text-sm">
                Conglomerados e ERPs Mapeados no Sistema
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {erpMappings?.map((mapping: any) => (
                  <div key={mapping.id} className="grid grid-cols-[220px_repeat(6,_1fr)] text-sm border-b border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-medium px-3 py-2 flex items-center text-xs border-r border-white dark:border-gray-700">
                      {mapping.conglomerado}
                    </div>
                    <div className="col-span-6 px-3 py-2 text-xs flex gap-2 items-center flex-wrap">
                      {mapping.erpMaeCodes.map((code: string, i: number) => (
                        <Badge key={i} variant="secondary" className="bg-secondary/10 text-secondary border-secondary/20 text-[10px] h-5">{code}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {isLoadingData && (
                  <div className="p-12 text-center text-muted-foreground">
                    <Loader2 className="animate-spin inline mr-2 h-5 w-5" /> 
                    Sincronizando com o Cloud...
                  </div>
                )}
                {!isLoadingData && (!erpMappings || erpMappings.length === 0) && (
                  <div className="p-12 text-center text-muted-foreground italic">
                    Nenhum mapeamento encontrado. Vá em Configuração para importar.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="configuracao" className="mt-0">
            <div className="grid grid-cols-1 gap-6">
              <Card className="shadow-lg border-primary/20">
                <CardHeader className="bg-primary text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <FileSpreadsheet className="h-6 w-6" />
                        Importação de Dados de ERP (Real)
                      </CardTitle>
                      <CardDescription className="text-white/80">
                        Selecione seu arquivo Excel para mapear Conglomerados e ERPs.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                      Modelo: Colunas C e E
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-xl p-12 bg-muted/5 relative">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".xlsx, .xls"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      disabled={isImporting}
                    />
                    
                    {selectedFile ? (
                      <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                        <div className="bg-secondary/10 p-6 rounded-full mb-4">
                          <CheckCircle2 className="h-10 w-10 text-secondary" />
                        </div>
                        <h3 className="text-lg font-bold mb-1">{selectedFile.name}</h3>
                        <p className="text-sm text-muted-foreground mb-6">Arquivo pronto para processamento.</p>
                        <div className="flex gap-3">
                           <Button 
                             onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; }}
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
                            {isImporting ? "Processando..." : "Confirmar Importação"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <div className="bg-primary/10 p-6 rounded-full mb-4">
                          <FileUp className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Clique ou arraste seu arquivo Excel</h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-md">
                          O sistema processará a <strong>Coluna C (Conglomerado)</strong> e a <strong>Coluna E (Cód ERP Mãe)</strong>.
                        </p>
                        <Badge variant="secondary" className="bg-accent/30 text-accent-foreground border-accent/20">
                          Suporta códigos separados por vírgula na Coluna E
                        </Badge>
                      </div>
                    )}
                  </div>

                  {erpMappings && erpMappings.length > 0 && (
                    <div className="mt-10 space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="font-bold text-primary flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5" />
                          Histórico de Mapeamentos (Cloud)
                        </h4>
                        <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">{erpMappings.length} Registros</span>
                      </div>
                      
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="w-[30%]">Conglomerado (Coluna C)</TableHead>
                              <TableHead>Códigos ERP Mãe (Coluna E)</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {erpMappings.slice(0, 10).map((row: any) => (
                              <TableRow key={row.id}>
                                <TableCell className="font-bold text-sm">{row.conglomerado}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {row.erpMaeCodes.map((code: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-[10px] border-primary/30 bg-primary/5 text-primary">
                                        {code}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge className="bg-secondary text-white text-[10px]">Ativo no Sistema</Badge>
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
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
