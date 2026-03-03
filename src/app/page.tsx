
"use client";

import React, { Fragment, useState } from "react";
import { 
  Brain, 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  FileSpreadsheet, 
  Upload, 
  Table as TableIcon,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Dados simulados baseados na imagem do Excel fornecida
const MOCK_ERP_DATA = [
  { id: "1657", conglomerado: "SEGER ES", erpMae: "0001187025" },
  { id: "1656", conglomerado: "BLAU FARMACEUTICA", erpMae: "0001068874" },
  { id: "1655", conglomerado: "TECVERDE", erpMae: "0001180186" },
  { id: "1654", conglomerado: "HAPVIDA", erpMae: "0001185388" },
  { id: "1653", conglomerado: "STRATOS", erpMae: "0001109747" },
  { id: "1652", conglomerado: "SOPRANO", erpMae: "0000027973" },
];

export default function OrderFulfillmentDashboard() {
  const [isImporting, setIsImporting] = useState(false);
  const [showData, setShowData] = useState(false);

  const handleImport = () => {
    setIsImporting(true);
    // Simulando processamento de Excel
    setTimeout(() => {
      setIsImporting(false);
      setShowData(true);
    }, 1500);
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
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Vision Fluxo v2.0</span>
            </div>
          </div>

          {/* ABA DASHBOARD - GRADE DE ALTA DENSIDADE */}
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
                  <div
                    key={step.id}
                    className="bg-primary text-white p-1 text-center font-semibold text-xs flex items-center justify-center gap-1 border-r border-white dark:border-gray-700 last:border-r-0"
                  >
                    <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                      {step.id}
                    </span>
                    {step.label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-[220px_repeat(12,_1fr)] text-sm">
                <div className="bg-white dark:bg-surface-dark border-r border-b border-gray-200 dark:border-gray-700"></div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <React.Fragment key={`sub-header-${i}`}>
                    <div className="bg-gray-600 text-white text-[10px] text-center py-1 border-r border-b border-gray-400">
                      Forma
                    </div>
                    <div className="bg-gray-600 text-white text-[10px] text-center py-1 border-r border-b border-white last:border-r-0">
                      %
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Linha Processos Automatizados */}
              <div className="grid grid-cols-[220px_repeat(12,_1fr)] text-sm">
                <div className="bg-secondary text-white font-bold flex items-center justify-center text-center p-2 border-r border-b border-white dark:border-gray-700 text-lg">
                  Processos Automatizados
                </div>
                <div className="col-span-2 grid grid-cols-2 grid-rows-3">
                  <div className="bg-secondary text-white text-[10px] flex items-center justify-center text-center p-1 border-r border-b border-white dark:border-gray-700">Painel de Liberação SIC</div>
                  <div className="bg-secondary text-white font-bold flex items-center justify-center text-lg border-r border-b border-white dark:border-gray-700">79,2%</div>
                  <div className="bg-secondary text-white text-[10px] flex items-center justify-center text-center p-1 border-r border-b border-white dark:border-gray-700">PDF - IA <Brain className="h-3 w-3 ml-1" /></div>
                  <div className="bg-secondary text-white font-bold flex items-center justify-center text-lg border-r border-b border-white dark:border-gray-700">5,2%</div>
                  <div className="bg-secondary text-white text-[10px] flex items-center justify-center text-center p-1 border-r border-b border-white dark:border-gray-700">Painel Pré Pedidos Automático</div>
                  <div className="bg-secondary text-white font-bold flex items-center justify-center text-lg border-r border-b border-white dark:border-gray-700">0,0%</div>
                </div>
                {["95,3%", "28,5%", "35,3%", "1,9%", "0,0%"].map((val, idx) => (
                  <div key={`auto-${idx}`} className="col-span-2 bg-secondary text-white flex flex-col justify-center items-center border-r border-b border-white dark:border-gray-700 last:border-r-0">
                    <span className="text-xs mb-1">{idx === 4 ? <Brain className="h-4 w-4" /> : "Automático"}</span>
                    <span className="text-2xl font-bold">{val}</span>
                  </div>
                ))}
              </div>

              {/* Linha Processos Manuais */}
              <div className="grid grid-cols-[220px_repeat(12,_1fr)] text-sm">
                <div className="bg-neutral text-white font-bold flex items-center justify-center text-center p-2 border-r border-b border-white dark:border-gray-700 text-lg">
                  Processos Manuais
                </div>
                <div className="col-span-2 grid grid-cols-2 grid-rows-4">
                  <div className="bg-neutral text-white text-[10px] flex items-center justify-center text-center p-1 border-r border-b border-gray-400">Manual</div>
                  <div className="bg-neutral text-white font-bold flex items-center justify-center text-lg border-r border-b border-white dark:border-gray-700">7,9%</div>
                  <div className="bg-neutral text-white text-[10px] flex items-center justify-center text-center p-1 border-r border-b border-gray-400">PDF</div>
                  <div className="bg-neutral text-white font-bold flex items-center justify-center text-lg border-r border-b border-white dark:border-gray-700">1,3%</div>
                  <div className="bg-neutral text-white text-[10px] flex items-center justify-center text-center p-1 border-r border-b border-gray-400">Excel</div>
                  <div className="bg-neutral text-white font-bold flex items-center justify-center text-lg border-r border-b border-white dark:border-gray-700">5,8%</div>
                  <div className="bg-neutral text-white text-[10px] flex items-center justify-center text-center p-1 border-r border-b border-gray-400">Web</div>
                  <div className="bg-neutral text-white font-bold flex items-center justify-center text-lg border-r border-b border-white dark:border-gray-700">0,7%</div>
                </div>
                {["4,7%", "71,5%", "64,7%", "98,1%", "100,0%"].map((val, idx) => (
                  <div key={`manual-${idx}`} className="col-span-2 bg-neutral text-white flex flex-col justify-center items-center border-r border-b border-white dark:border-gray-700 last:border-r-0">
                    <span className="text-xs mb-1">Manual</span>
                    <span className="text-2xl font-bold">{val}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-[220px_repeat(6,_1fr)] text-sm font-bold text-xl text-black">
                <div className="bg-white dark:bg-surface-dark border-r border-b border-gray-300"></div>
                {["84,4%", "95,3%", "28,5%", "35,3%", "1,9%", "0,0%"].map((val, idx) => (
                  <div key={`total-${idx}`} className="bg-[#00FF40] text-center py-2 border-r border-b border-white dark:border-gray-700 last:border-r-0">
                    {val}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ABA CONFIGURAÇÃO - FOCO EM IMPORTAÇÃO EXCEL */}
          <TabsContent value="configuracao" className="mt-0">
            <div className="grid grid-cols-1 gap-6">
              <Card className="shadow-lg border-primary/20">
                <CardHeader className="bg-primary text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <FileSpreadsheet className="h-6 w-6" />
                        Importação de Dados de ERP
                      </CardTitle>
                      <CardDescription className="text-white/80">
                        Selecione o arquivo Excel para atualizar os conglomerados e códigos ERP mãe.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                      Modelo: Colunas C e E
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-xl p-12 bg-muted/5">
                    <div className="bg-primary/10 p-6 rounded-full mb-4">
                      <Upload className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Arraste seu arquivo Excel aqui</h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                      O sistema processará automaticamente a <strong>Coluna C (Conglomerado)</strong> e a <strong>Coluna E (Cód ERP Mãe)</strong> do seu documento.
                    </p>
                    
                    <div className="flex gap-4">
                      <Button 
                        size="lg" 
                        className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 px-8"
                        onClick={handleImport}
                        disabled={isImporting}
                      >
                        {isImporting ? "Processando..." : "Importar ERP's"}
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <TableIcon className="h-4 w-4" />
                        Ver Modelo
                      </Button>
                    </div>
                  </div>

                  {showData && (
                    <div className="mt-10 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold flex items-center gap-2 text-primary">
                          <CheckCircle2 className="h-5 w-5" />
                          Dados Importados com Sucesso
                        </h4>
                        <span className="text-xs text-muted-foreground">Total: {MOCK_ERP_DATA.length} registros</span>
                      </div>
                      
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="w-[100px]">ID</TableHead>
                              <TableHead>Coluna C: Conglomerado</TableHead>
                              <TableHead>Coluna E: Cód ERP Mãe</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {MOCK_ERP_DATA.map((row) => (
                              <TableRow key={row.id}>
                                <TableCell className="font-mono text-xs">{row.id}</TableCell>
                                <TableCell className="font-bold">{row.conglomerado}</TableCell>
                                <TableCell className="font-mono text-primary font-bold">{row.erpMae}</TableCell>
                                <TableCell className="text-right">
                                  <Badge className="bg-secondary text-white">Mapeado</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {!showData && !isImporting && (
                    <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        <p className="font-bold">Nota de Importação:</p>
                        <p>Certifique-se de que o arquivo segue o padrão: a terceira coluna (C) deve conter o nome do cliente/conglomerado e a quinta coluna (E) o código identificador do ERP.</p>
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
