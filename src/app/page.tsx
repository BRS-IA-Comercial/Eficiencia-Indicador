
"use client";

import { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { Header } from "@/components/dashboard/Header";
import { ProcessMetricsTable } from "@/components/dashboard/ProcessMetricsTable";
import { OrderIntakeAI } from "@/components/dashboard/OrderIntakeAI";
import { DeliveryAssistant } from "@/components/dashboard/DeliveryAssistant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Box, ClipboardList, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} />
        <SidebarInset>
          <Header />
          <main className="flex-1 p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto w-full">
            {activeTab === "dashboard" && (
              <div className="space-y-8 animate-in fade-in duration-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">FluxoPedidos Vision</h1>
                    <p className="text-muted-foreground">Métricas de fulfillment em tempo real e controle de execução.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="hover:shadow-md transition-all border-l-4 border-l-primary">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total de Pedidos Hoje</CardTitle>
                      <Box className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">1.284</div>
                      <p className="text-xs text-muted-foreground">+12,5% em relação a ontem</p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-all border-l-4 border-l-accent">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Taxa de Automação</CardTitle>
                      <Activity className="h-4 w-4 text-accent-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">84,2%</div>
                      <p className="text-xs text-muted-foreground">+5,4% de melhoria</p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-all border-l-4 border-l-primary/40">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tarefas Manuais Pendentes</CardTitle>
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">156</div>
                      <p className="text-xs text-muted-foreground">32 prioridades críticas</p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-all border-l-4 border-l-primary">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tempo Médio de Ciclo</CardTitle>
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">42m 12s</div>
                      <p className="text-xs text-muted-foreground">-8m vs última semana</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <Tabs defaultValue="overview" className="w-full">
                    <div className="flex justify-between items-center mb-4">
                      <TabsList className="bg-secondary/50 p-1">
                        <TabsTrigger value="overview">Visão do Pipeline</TabsTrigger>
                        <TabsTrigger value="manual">Detalhamento Manual</TabsTrigger>
                        <TabsTrigger value="auto">Estatísticas de Automação</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="overview">
                      <ProcessMetricsTable />
                    </TabsContent>
                    <TabsContent value="manual">
                      <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-xl text-muted-foreground italic">
                        Carregando detalhes do processamento manual...
                      </div>
                    </TabsContent>
                    <TabsContent value="auto">
                      <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-xl text-muted-foreground italic">
                        Carregando métricas de performance do motor de automação...
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}

            {activeTab === "intake" && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold tracking-tight">Entrada de Pedidos IA</h2>
                  <p className="text-muted-foreground">Extraia e valide documentos de pedido automaticamente.</p>
                </div>
                <OrderIntakeAI />
              </div>
            )}

            {activeTab === "delivery" && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold tracking-tight">IA de Ocorrências de Entrega</h2>
                  <p className="text-muted-foreground">Sugestões inteligentes para exceções logísticas.</p>
                </div>
                <DeliveryAssistant />
              </div>
            )}

            {["history", "settings", "support"].includes(activeTab) && (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
                 <div className="bg-secondary p-6 rounded-full">
                    <Box className="h-12 w-12 text-primary animate-pulse" />
                 </div>
                 <div>
                   <h3 className="text-xl font-bold uppercase tracking-widest">Seção de {activeTab === 'history' ? 'Histórico' : activeTab === 'settings' ? 'Configurações' : 'Suporte'}</h3>
                   <p className="text-muted-foreground max-w-xs mx-auto">Este módulo está em desenvolvimento para completar a visão total do dashboard.</p>
                 </div>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
