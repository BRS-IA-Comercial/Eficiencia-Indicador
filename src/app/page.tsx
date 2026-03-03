
"use client";

import React, { Fragment } from "react";
import { Brain, LayoutDashboard, Settings as SettingsIcon, Save, UserPlus, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function OrderFulfillmentDashboard() {
  return (
    <div className="min-h-screen p-4 bg-background-light dark:bg-background-dark font-body">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Navegação por Abas */}
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
              <span className="flex items-center gap-1"><TrendingUp className="h-4 w-4 text-secondary" /> Meta Global: 90%</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Vision Fluxo v2.0</span>
            </div>
          </div>

          {/* ABA DASHBOARD (Visualização Atual) */}
          <TabsContent value="dashboard" className="mt-0">
            <div className="bg-surface-light dark:bg-surface-dark shadow-xl rounded-lg overflow-hidden border border-border-light dark:border-border-dark">
              <header className="bg-primary text-white text-center py-3 font-bold text-xl uppercase tracking-wide border-b border-white dark:border-gray-700">
                Etapas do Processo de Atendimento de Pedidos
              </header>

              {/* Linha das Etapas */}
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

              {/* Sub-Header (Forma / %) */}
              <div className="grid grid-cols-[220px_repeat(12,_1fr)] text-sm">
                <div className="bg-white dark:bg-surface-dark border-r border-b border-gray-200 dark:border-gray-700"></div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Fragment key={`sub-header-${i}`}>
                    <div className="bg-gray-600 text-white text-[10px] text-center py-1 border-r border-b border-gray-400">
                      Forma
                    </div>
                    <div className="bg-gray-600 text-white text-[10px] text-center py-1 border-r border-b border-white last:border-r-0">
                      %
                    </div>
                  </Fragment>
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
                  <div className="bg-secondary text-white text-[10px] flex items-center justify-center text-center p-1 border-r border-b border-white dark:border-gray-700 leading-tight">
                    PDF - IA <Brain className="h-3 w-3 ml-1" />
                  </div>
                  <div className="bg-secondary text-white font-bold flex items-center justify-center text-lg border-r border-b border-white dark:border-gray-700">5,2%</div>
                  <div className="bg-secondary text-white text-[10px] flex items-center justify-center text-center p-1 border-r border-b border-white dark:border-gray-700 leading-tight">Painel Pré Pedidos Automático</div>
                  <div className="bg-secondary text-white font-bold flex items-center justify-center text-lg border-r border-b border-white dark:border-gray-700">0,0%</div>
                </div>

                {[
                  { label: "Automático", value: "95,3%" },
                  { label: "Automático", value: "28,5%" },
                  { label: "Automático", value: "35,3%" },
                  { label: "Agente Rupturas", value: "1,9%" },
                  { label: "Agente Atendimento IA", value: "0,0%", icon: true },
                ].map((item, idx) => (
                  <div key={`auto-${idx}`} className="col-span-2 bg-secondary text-white flex flex-col justify-center items-center border-r border-b border-white dark:border-gray-700 last:border-r-0">
                    <span className="text-xs mb-1 flex items-center flex-col text-center leading-tight">
                      {item.icon && <Brain className="h-4 w-4 mb-1" />}
                      {item.label}
                    </span>
                    <span className="text-2xl font-bold">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Linha Processos Manuais */}
              <div className="grid grid-cols-[220px_repeat(12,_1fr)] text-sm">
                <div className="bg-neutral text-white font-bold flex items-center justify-center text-center p-2 border-r border-b border-white dark:border-gray-700 text-lg">
                  Processos Manuais
                </div>

                <div className="col-span-2 grid grid-cols-2 grid-rows-4">
                  <div className="bg-neutral text-white text-[10px] flex items-center justify-center text-center p-1 border-r border-b border-gray-400 dark:border-gray-600 leading-tight">Painel Pré Pedidos Manual</div>
                  <div className="bg-neutral text-white font-bold flex items-center justify-center text-lg border-r border-b border-white dark:border-gray-700">7,9%</div>
                  <div className="bg-neutral text-white text-[10px] flex items-center justify-center text-center p-1 border-r border-b border-gray-400 dark:border-gray-600">PDF</div>
                  <div className="bg-neutral text-white font-bold flex items-center justify-center text-lg border-r border-b border-white dark:border-gray-700">1,3%</div>
                  <div className="bg-neutral text-white text-[10px] flex items-center justify-center text-center p-1 border-r border-b border-gray-400 dark:border-gray-600">Importação Excel</div>
                  <div className="bg-neutral text-white font-bold flex items-center justify-center text-lg border-r border-b border-white dark:border-gray-700">5,8%</div>
                  <div className="bg-neutral text-white text-[10px] flex items-center justify-center text-center p-1 border-r border-b border-gray-400 dark:border-gray-600">Webservice</div>
                  <div className="bg-neutral text-white font-bold flex items-center justify-center text-lg border-r border-b border-white dark:border-gray-700">0,7%</div>
                </div>

                {["4,7%", "71,5%", "64,7%", "98,1%", "100,0%"].map((val, idx) => (
                  <div key={`manual-${idx}`} className="col-span-2 bg-neutral text-white flex flex-col justify-center items-center border-r border-b border-white dark:border-gray-700 last:border-r-0">
                    <span className="text-xs mb-1">Manual</span>
                    <span className="text-2xl font-bold">{val}</span>
                  </div>
                ))}
              </div>

              {/* Linha Peso da Etapa */}
              <div className="grid grid-cols-[220px_repeat(12,_1fr)] text-sm">
                <div className="bg-gray-500 text-white font-bold flex items-center justify-end pr-4 text-center p-2 border-r border-b border-white dark:border-gray-700 text-lg">
                  Peso da Etapa
                </div>
                {[
                  { n: 425, p: "6,2%" },
                  { n: 122, p: "1,8%" },
                  { n: 632, p: "9,2%" },
                  { n: 285, p: "4,1%" },
                  { n: 3080, p: "44,7%" },
                  { n: 2345, p: "34,0%" },
                ].map((item, idx) => (
                  <Fragment key={`weight-${idx}`}>
                    <div className="col-span-1 bg-gray-500 text-white flex items-center justify-center font-bold border-r border-b border-white dark:border-gray-700">
                      {item.n}
                    </div>
                    <div className="col-span-1 bg-gray-500 text-white flex items-center justify-center font-bold text-lg border-r border-b border-white dark:border-gray-700 last:border-r-0">
                      {item.p}
                    </div>
                  </Fragment>
                ))}
              </div>

              {/* Linha Totais de Automação */}
              <div className="grid grid-cols-[220px_repeat(6,_1fr)] text-sm font-bold text-xl text-black">
                <div className="bg-white dark:bg-surface-dark border-r border-b border-gray-300 dark:border-gray-700"></div>
                {["84,4%", "95,3%", "28,5%", "35,3%", "1,9%", "0,0%"].map((val, idx) => (
                  <div key={`total-${idx}`} className="bg-[#00FF40] text-center py-2 border-r border-b border-white dark:border-gray-700 last:border-r-0">
                    {val}
                  </div>
                ))}
              </div>

              {/* Título Gestores */}
              <div className="grid grid-cols-[220px_1fr] border-b border-gray-400 dark:border-gray-600">
                <div className="bg-gray-600 text-white text-center py-2 font-bold text-sm flex items-center justify-center">Gestores</div>
                <div className="bg-gray-600 text-white text-center py-2 font-bold text-lg">Detalhamento do Processo de Atendimento por Gestor/Cliente</div>
              </div>

              {/* Lista de Gestores (Simplificada para o exemplo) */}
              {[
                { name: "Ana Paula Alcantara Rauber", values: ["81%", "99%", "15%", "12%", "0%", "0%"] },
                { name: "Alexandre Postingher Lutke", values: ["100%", "100%", "7%", "42%", "2%", "0%"] },
                { name: "Fabio Trevisan", values: ["71%", "92%", "48%", "41%", "0%", "0%"] },
                { name: "Gianne Pizani", values: ["59%", "100%", "12%", "25%", "0%", "0%"] },
                { name: "Gilmar Heisser de Andrade", values: ["100%", "98%", "69%", "49%", "21%", "0%"] },
              ].map((manager, idx) => (
                <div key={`manager-${idx}`} className="grid grid-cols-[220px_repeat(6,_1fr)] text-sm border-b border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-medium px-3 py-1 flex items-center text-xs border-r border-white dark:border-gray-700">
                    {manager.name}
                  </div>
                  {manager.values.map((val, vIdx) => (
                    <div key={`val-${idx}-${vIdx}`} className="bg-gray-300 dark:bg-gray-500 text-white text-center py-1 font-bold border-r border-white dark:border-gray-700 flex items-center justify-center last:border-r-0">
                      {val}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ABA CONFIGURAÇÃO (Nova Interface Admin) */}
          <TabsContent value="configuracao" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Coluna 1: Configurações Gerais */}
              <div className="md:col-span-2 space-y-6">
                <Card className="shadow-lg border-primary/20">
                  <CardHeader className="bg-primary text-white">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <SettingsIcon className="h-5 w-5" />
                      Parâmetros do Pipeline
                    </CardTitle>
                    <CardDescription className="text-white/80">Configure os pesos e metas para cada etapa do processo de fulfillment.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[
                        "Entrada de Pedidos",
                        "Programação",
                        "Liberação SIC",
                        "Geração OV",
                        "Tratamento Rupturas",
                        "Ocorrências Entrega"
                      ].map((step, idx) => (
                        <div key={idx} className="space-y-2">
                          <Label className="text-xs uppercase font-bold text-muted-foreground">{step} (Peso %)</Label>
                          <Input type="number" placeholder="Ex: 15" className="border-primary/20 focus:ring-primary" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-8 flex justify-end">
                      <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
                        <Save className="h-4 w-4" />
                        Salvar Alterações
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-secondary/20">
                  <CardHeader className="bg-secondary text-white">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Agentes de IA
                    </CardTitle>
                    <CardDescription className="text-white/80">Gerencie a sensibilidade e o nível de automação da inteligência artificial.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                      <div>
                        <p className="font-bold text-sm text-foreground">Agente Vision (PDF)</p>
                        <p className="text-xs text-muted-foreground">Nível de confiança mínimo para processamento automático.</p>
                      </div>
                      <div className="w-24">
                        <Input type="text" defaultValue="95%" className="text-center font-bold" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                      <div>
                        <p className="font-bold text-sm text-foreground">Agente de Rupturas</p>
                        <p className="text-xs text-muted-foreground">Threshold para decisão automática de substituição.</p>
                      </div>
                      <div className="w-24">
                        <Input type="text" defaultValue="88%" className="text-center font-bold" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Coluna 2: Gestores e Acesso */}
              <div className="space-y-6">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">Gestores de Fluxo</CardTitle>
                    <CardDescription>Lista de administradores responsáveis pelo pipeline.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {[
                      "Ana Paula Alcantara Rauber",
                      "Alexandre Postingher Lutke",
                      "Fabio Trevisan",
                      "Gianne Pizani",
                      "Gilmar Heisser de Andrade"
                    ].map((name, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded transition-colors group">
                        <span className="text-sm font-medium">{name}</span>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10">Remover</Button>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full mt-4 border-dashed border-2 gap-2 text-primary border-primary/20 hover:bg-primary/5">
                      <UserPlus className="h-4 w-4" />
                      Adicionar Gestor
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/10">
                  <CardContent className="p-6 text-center">
                    <p className="text-xs font-bold text-primary uppercase mb-2">Logs do Sistema</p>
                    <p className="text-sm text-muted-foreground italic leading-relaxed">Última alteração de pesos realizada em 24/05/2024 às 14:32 por Fabio Trevisan.</p>
                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>
        </Tabs>
        
      </div>
    </div>
  );
}
