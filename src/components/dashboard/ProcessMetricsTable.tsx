
"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight, ArrowDownRight, Zap, User, Clock } from "lucide-react";

interface MetricRow {
  stage: string;
  automated: number;
  manual: number;
  pending: number;
  avgTime: string;
  efficiency: number;
  trend: "up" | "down" | "stable";
}

const data: MetricRow[] = [
  { stage: "Entrada de Pedidos", automated: 450, manual: 50, pending: 12, avgTime: "2m", efficiency: 94, trend: "up" },
  { stage: "Validação", automated: 480, manual: 20, pending: 5, avgTime: "1m", efficiency: 98, trend: "up" },
  { stage: "Verificação de Estoque", automated: 500, manual: 0, pending: 2, avgTime: "30s", efficiency: 100, trend: "stable" },
  { stage: "Separação (Picking)", automated: 120, manual: 380, pending: 45, avgTime: "15m", efficiency: 82, trend: "down" },
  { stage: "Embalagem (Packing)", automated: 80, manual: 420, pending: 30, avgTime: "8m", efficiency: 88, trend: "up" },
  { stage: "Envio", automated: 490, manual: 10, pending: 8, avgTime: "3m", efficiency: 96, trend: "up" },
  { stage: "Pós-Venda", automated: 150, manual: 350, pending: 15, avgTime: "45m", efficiency: 75, trend: "down" },
];

export function ProcessMetricsTable() {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          Visão Geral do Pipeline de Fulfillment
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">Métricas em Tempo Real</Badge>
        </h3>
        <div className="flex gap-4 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-primary" /> Automatizado
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-accent" /> Manual
          </div>
        </div>
      </div>
      <Table>
        <TableHeader className="bg-muted/10">
          <TableRow>
            <TableHead className="w-[200px]">Etapa</TableHead>
            <TableHead>Divisão de Execução</TableHead>
            <TableHead className="text-center">Pendente</TableHead>
            <TableHead className="text-center">Tempo Médio</TableHead>
            <TableHead className="w-[150px]">Eficiência</TableHead>
            <TableHead className="text-right">Tendência</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.stage} className="hover:bg-accent/5 transition-colors">
              <TableCell className="font-medium">{row.stage}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2 w-full max-w-[200px]">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden flex">
                    <div 
                      className="bg-primary h-full transition-all duration-500" 
                      style={{ width: `${(row.automated / (row.automated + row.manual)) * 100}%` }} 
                    />
                    <div 
                      className="bg-accent h-full transition-all duration-500" 
                      style={{ width: `${(row.manual / (row.automated + row.manual)) * 100}%` }} 
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {Math.round((row.automated / (row.automated + row.manual)) * 100)}% Auto
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={row.pending > 20 ? "destructive" : "secondary"} className="rounded-md">
                  {row.pending}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {row.avgTime}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold">
                    <span>{row.efficiency}%</span>
                  </div>
                  <Progress value={row.efficiency} className="h-1" />
                </div>
              </TableCell>
              <TableCell className="text-right">
                {row.trend === "up" ? (
                  <ArrowUpRight className="inline h-4 w-4 text-primary" />
                ) : row.trend === "down" ? (
                  <ArrowDownRight className="inline h-4 w-4 text-destructive" />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
