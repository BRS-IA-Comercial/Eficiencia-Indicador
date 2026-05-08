"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle, User, TrendingDown, ArrowDown, ChevronDown, ChevronUp, 
  ChevronsDown, ChevronsUp, Building2, Cpu, Package, ArrowRight, 
  CalendarDays, ShoppingCart, CheckCircle2, Calendar, ArrowUpDown, ArrowUp,
  Files
} from "lucide-react";

interface RupturasTabProps {
  periodo: string;
  setPeriodo: (v: "30D" | "60D" | "90D") => void;
  rupturasRanking: any[];
  formatNumber: (val: number) => string;
  formatName: (fullName: string) => string;
}

export function RupturasTab({
  periodo,
  setPeriodo,
  rupturasRanking,
  formatNumber,
  formatName
}: RupturasTabProps) {
  
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'trocasManual', direction: 'desc' });

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50 shrink-0" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 shrink-0" /> : <ArrowDown className="h-3 w-3 ml-1 shrink-0" />;
  };

  const statsCalculated = useMemo(() => {
    const execMap = new Map();
    
    // Variáveis Globais para os 6 Cards
    let sumPedidosTotal = 0;
    let sumPedidosRuptura = 0;
    let sumTrocasAuto = 0;
    let sumTrocasManual = 0;
    let sumPedidosManual = 0;
    let sumPedidosAuto = 0;
    let sumPedidos100Auto = 0;
    let sumItens100Auto = 0;

    rupturasRanking.forEach(row => {
      let itensList = [];
      if (Array.isArray(row.itensDetalhados)) {
        itensList = row.itensDetalhados;
      } else if (row.itensDetalhados && typeof row.itensDetalhados === 'object') {
        itensList = row.itensDetalhados.pedido ? [row.itensDetalhados] : Object.values(row.itensDetalhados);
      }
      row.itensDetalhados = itensList;

      // Somatórios base
      sumPedidosTotal += row.pedidosTotal || 0;
      sumPedidosRuptura += row.pedidosRuptura || 0;
      sumTrocasAuto += row.trocasAuto || 0;
      sumTrocasManual += row.trocasManual || 0;

      // Lógica de cálculo Direta (Se vier do Backend) ou Fallback (Calculado em memória)
      let pMan = row.pedidosTrocaManual;
      let pAuto = row.pedidosTrocaAuto;
      let p100 = row.pedidos100Auto;
      let i100 = row.itens100Auto;

      if (pMan === undefined) {
        const setMan = new Set();
        const setAuto = new Set();
        let countI100 = 0;
        
        row.itensDetalhados.forEach((it: any) => {
          if (it.tipo === 'MANUAL') setMan.add(it.pedido);
          if (it.tipo === 'AUTO') setAuto.add(it.pedido);
        });

        pMan = setMan.size;
        pAuto = setAuto.size;
        
        let countP100 = 0;
        setAuto.forEach((id: any) => {
          if (!setMan.has(id)) countP100++;
        });
        p100 = countP100;

        row.itensDetalhados.forEach((it: any) => {
          if (it.tipo === 'AUTO' && !setMan.has(it.pedido)) countI100 += (Number(it.qtd) || 1);
        });
        i100 = countI100;

        // Fallback de aproximação caso a lista não traga o detalhe inteiro (limite de 1MB)
        if (pMan === 0 && row.trocasManual > 0) pMan = Math.min(row.pedidosRuptura, row.trocasManual);
        if (pAuto === 0 && row.trocasAuto > 0) pAuto = Math.min(row.pedidosRuptura, row.trocasAuto);
        if (p100 === 0 && row.trocasAuto > 0 && row.trocasManual === 0) p100 = row.pedidosRuptura;
        if (i100 === 0 && row.trocasAuto > 0 && row.trocasManual === 0) i100 = row.trocasAuto;
      }

      sumPedidosManual += pMan;
      sumPedidosAuto += pAuto;
      sumPedidos100Auto += p100;
      sumItens100Auto += i100;

      // Agrupamento hierárquico
      if (!execMap.has(row.executivo)) {
        execMap.set(row.executivo, {
          name: row.executivo, pedidosTotal: 0, pedidosRuptura: 0, trocasAuto: 0, trocasManual: 0,
          clientesMap: new Map()
        });
      }
      
      const exec = execMap.get(row.executivo);
      exec.pedidosTotal += row.pedidosTotal;
      exec.pedidosRuptura += row.pedidosRuptura;
      exec.trocasAuto += row.trocasAuto;
      exec.trocasManual += row.trocasManual;

      if (!exec.clientesMap.has(row.cliente)) {
        exec.clientesMap.set(row.cliente, {
          name: row.cliente, pedidosTotal: 0, pedidosRuptura: 0, trocasAuto: 0, trocasManual: 0,
          erps: []
        });
      }

      const cli = exec.clientesMap.get(row.cliente);
      cli.pedidosTotal += row.pedidosTotal;
      cli.pedidosRuptura += row.pedidosRuptura;
      cli.trocasAuto += row.trocasAuto;
      cli.trocasManual += row.trocasManual;

      cli.erps.push({ ...row });
    });

    const sortFn = (a: any, b: any) => {
      if (sortConfig.key === 'name') {
          const nameA = String(a.name || a.erpCode || "");
          const nameB = String(b.name || b.erpCode || "");
          return sortConfig.direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      const aVal = Number(a[sortConfig.key]) || 0;
      const bVal = Number(b[sortConfig.key]) || 0;
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    };

    return {
      executivos: Array.from(execMap.values()).map(exec => ({
        ...exec,
        pctRuptura: exec.pedidosTotal > 0 ? Math.round((exec.pedidosRuptura / exec.pedidosTotal) * 100) : 0,
        pctManual: (exec.trocasAuto + exec.trocasManual) > 0 ? Math.round((exec.trocasManual / (exec.trocasAuto + exec.trocasManual)) * 100) : 0,
        clientes: Array.from(exec.clientesMap.values()).map((cli: any) => ({
          ...cli,
          pctRuptura: cli.pedidosTotal > 0 ? Math.round((cli.pedidosRuptura / cli.pedidosTotal) * 100) : 0,
          pctManual: (cli.trocasAuto + cli.trocasManual) > 0 ? Math.round((cli.trocasManual / (cli.trocasAuto + cli.trocasManual)) * 100) : 0,
          erps: cli.erps.sort(sortFn)
        })).sort(sortFn)
      })).sort(sortFn),
      globais: {
        pedidosTotal: sumPedidosTotal,
        pedidosRuptura: sumPedidosRuptura,
        itensRuptura: sumTrocasAuto + sumTrocasManual,
        trocasManual: sumTrocasManual,
        trocasAuto: sumTrocasAuto,
        pedidosManual: sumPedidosManual,
        pedidosAuto: sumPedidosAuto,
        pedidos100Auto: sumPedidos100Auto,
        itens100Auto: sumItens100Auto
      }
    };
  }, [rupturasRanking, sortConfig]);

  const { globais } = statsCalculated;

  // Cálculos de Porcentagem dos Cards
  const pctPedidosRuptura = globais.pedidosTotal > 0 ? Math.round((globais.pedidosRuptura / globais.pedidosTotal) * 100) : 0;
  
  const pctPedidosManual = globais.pedidosRuptura > 0 ? Math.round((globais.pedidosManual / globais.pedidosRuptura) * 100) : 0;
  const pctItensManual = globais.itensRuptura > 0 ? Math.round((globais.trocasManual / globais.itensRuptura) * 100) : 0;

  const pctPedidosAuto = globais.pedidosRuptura > 0 ? Math.round((globais.pedidosAuto / globais.pedidosRuptura) * 100) : 0;
  const pctItensAuto = globais.itensRuptura > 0 ? Math.round((globais.trocasAuto / globais.itensRuptura) * 100) : 0;

  const pctPedidos100Auto = globais.pedidosRuptura > 0 ? Math.round((globais.pedidos100Auto / globais.pedidosRuptura) * 100) : 0;
  const pctItens100Auto = globais.itensRuptura > 0 ? Math.round((globais.itens100Auto / globais.itensRuptura) * 100) : 0;

  const gridTemplate = `minmax(250px, 350px) repeat(5, minmax(130px, 1fr))`;

  const getBadgeStyle = (pct: number) => {
    if (pct >= 50) return 'bg-red-50 text-red-600 border-red-300';
    if (pct > 0) return 'bg-amber-50 text-amber-600 border-amber-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const toggleItem = (id: string, currentState: boolean) => setExpandedItems(prev => ({ ...prev, [id]: !currentState }));
  const expandAll = () => {
    const all: Record<string, boolean> = {};
    statsCalculated.executivos.forEach(exec => {
      all[exec.name] = true;
      exec.clientes.forEach((cli: any) => {
        all[`${exec.name}-${cli.name}`] = true;
      });
    });
    setExpandedItems(all);
  };
  const collapseAll = () => setExpandedItems({});

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* 6 CARDS ANALÍTICOS (PEDIDOS VS ITENS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        <Card className="p-4 shadow-sm border-l-4 border-gray-400 bg-white" title="Volume total de pedidos faturados.">
          <div className="flex justify-between items-center">
             <p className="text-[10px] font-bold text-muted-foreground uppercase">1. Total de Pedidos</p>
             <Files className="h-4 w-4 text-gray-400 opacity-50" />
          </div>
          <h3 className="text-2xl font-black text-gray-800 mt-2">{formatNumber(globais.pedidosTotal)}</h3>
        </Card>
        
        <Card className="p-4 shadow-sm border-l-4 border-primary bg-white" title="Pedidos que sofreram ao menos uma ruptura de estoque.">
          <div className="flex justify-between items-center">
             <p className="text-[10px] font-bold text-primary uppercase">2. Pedidos com Ruptura</p>
             <AlertTriangle className="h-4 w-4 text-primary opacity-50" />
          </div>
          <h3 className="text-2xl font-black text-gray-800 mt-2">{formatNumber(globais.pedidosRuptura)}</h3>
          <p className="text-[10px] font-bold text-primary mt-0.5">{pctPedidosRuptura}% da base total de pedidos</p>
        </Card>

        <Card className="p-4 shadow-sm border-l-4 border-amber-400 bg-white" title="Soma total de itens que precisaram ser substituídos (Manuais + Automáticos).">
          <div className="flex justify-between items-center">
             <p className="text-[10px] font-bold text-amber-600 uppercase">3. Itens em Ruptura</p>
             <Package className="h-4 w-4 text-amber-500 opacity-50" />
          </div>
          <h3 className="text-2xl font-black text-gray-800 mt-2">{formatNumber(globais.itensRuptura)}</h3>
          <p className="text-[10px] font-bold text-amber-600/70 mt-0.5">Soma de trocas manuais e automáticas</p>
        </Card>

        <Card className="p-4 shadow-sm border-l-4 border-red-500 bg-white" title="Pedidos e Itens que exigiram ação manual humana.">
          <div className="flex justify-between items-center mb-3">
             <p className="text-[10px] font-bold text-red-600 uppercase">4. Trocas Manuais</p>
             <TrendingDown className="h-4 w-4 text-red-500 opacity-50" />
          </div>
          <div className="grid grid-cols-2 gap-2 border-t pt-2">
             <div>
                <span className="block text-[9px] text-muted-foreground uppercase tracking-widest">Qtd. Pedidos</span>
                <span className="text-sm font-black text-gray-800">{formatNumber(globais.pedidosManual)}</span>
                <span className="text-[10px] font-bold text-red-500 ml-1">({pctPedidosManual}%)</span>
             </div>
             <div>
                <span className="block text-[9px] text-muted-foreground uppercase tracking-widest">Qtd. Itens</span>
                <span className="text-sm font-black text-gray-800">{formatNumber(globais.trocasManual)}</span>
                <span className="text-[10px] font-bold text-red-500 ml-1">({pctItensManual}%)</span>
             </div>
          </div>
        </Card>

        <Card className="p-4 shadow-sm border-l-4 border-secondary bg-white" title="Pedidos que tiveram intervenção do robô e o volume de itens salvos por ele.">
          <div className="flex justify-between items-center mb-3">
             <p className="text-[10px] font-bold text-secondary uppercase">5. Trocas Automáticas</p>
             <Cpu className="h-4 w-4 text-secondary opacity-50" />
          </div>
          <div className="grid grid-cols-2 gap-2 border-t pt-2">
             <div>
                <span className="block text-[9px] text-muted-foreground uppercase tracking-widest">Qtd. Pedidos</span>
                <span className="text-sm font-black text-gray-800">{formatNumber(globais.pedidosAuto)}</span>
                <span className="text-[10px] font-bold text-secondary ml-1">({pctPedidosAuto}%)</span>
             </div>
             <div>
                <span className="block text-[9px] text-muted-foreground uppercase tracking-widest">Qtd. Itens</span>
                <span className="text-sm font-black text-gray-800">{formatNumber(globais.trocasAuto)}</span>
                <span className="text-[10px] font-bold text-secondary ml-1">({pctItensAuto}%)</span>
             </div>
          </div>
        </Card>

        <Card className="p-4 shadow-sm border-l-4 border-green-500 bg-white" title="Pedidos onde o robô resolveu a ruptura de ponta a ponta, sem que nenhum item sobrasse para os humanos.">
          <div className="flex justify-between items-center mb-3">
             <p className="text-[10px] font-bold text-green-600 uppercase">6. Resolvidos 100% Auto</p>
             <CheckCircle2 className="h-4 w-4 text-green-500 opacity-50" />
          </div>
          <div className="grid grid-cols-2 gap-2 border-t pt-2">
             <div>
                <span className="block text-[9px] text-muted-foreground uppercase tracking-widest">Qtd. Pedidos</span>
                <span className="text-sm font-black text-gray-800">{formatNumber(globais.pedidos100Auto)}</span>
                <span className="text-[10px] font-bold text-green-600 ml-1">({pctPedidos100Auto}%)</span>
             </div>
             <div>
                <span className="block text-[9px] text-muted-foreground uppercase tracking-widest">Qtd. Itens</span>
                <span className="text-sm font-black text-gray-800">{formatNumber(globais.itens100Auto)}</span>
                <span className="text-[10px] font-bold text-green-600 ml-1">({pctItens100Auto}%)</span>
             </div>
          </div>
        </Card>
      </div>

      <div className="bg-surface-light shadow-xl rounded-lg border min-w-[1000px] overflow-x-auto">
        
        {/* HEADER COM ORDENAÇÃO E TOOLTIPS */}
        <div className="grid text-sm border-b bg-white rounded-t-lg" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="p-3 font-bold text-muted-foreground uppercase text-xxs tracking-widest border-r border-gray-100 cursor-pointer hover:bg-gray-50 flex items-center justify-between transition-colors select-none" onClick={() => handleSort('name')} title="Organização hierárquica por Executivo > Cliente > Cód. ERP Mãe">
            <div className="flex items-center gap-2"><User className="h-3 w-3" /> Hierarquia / Cliente</div>
            {getSortIcon('name')}
          </div>
          
          <div className="bg-primary/90 text-white p-2 text-center font-bold text-[8px] flex flex-col items-center justify-center border-r border-white/20 uppercase cursor-pointer hover:bg-primary transition-colors select-none" onClick={() => handleSort('pedidosTotal')} title="Volume total de pedidos faturados no período selecionado">
            <div className="flex items-center justify-center w-full gap-1">Vol. Pedidos ({periodo}) {getSortIcon('pedidosTotal')}</div>
          </div>
          
          <div className="bg-primary/90 text-white p-2 text-center font-bold text-[8px] flex flex-col items-center justify-center border-r border-white/20 bg-black/[0.04] uppercase cursor-pointer hover:bg-primary transition-colors select-none" onClick={() => handleSort('pedidosRuptura')} title="Quantidade de pedidos que tiveram falta de estoque e precisaram de troca">
            <div className="flex items-center justify-center w-full gap-1">Pedidos C/ Ruptura {getSortIcon('pedidosRuptura')}</div>
          </div>
          
          <div className="bg-primary/90 text-white p-2 text-center font-bold text-[8px] flex flex-col items-center justify-center border-r border-white/20 uppercase cursor-pointer hover:bg-primary transition-colors select-none" onClick={() => handleSort('trocasAuto')} title="Quantidade de itens substituídos automaticamente">
            <div className="flex items-center justify-center w-full gap-1">Trocas Sistema {getSortIcon('trocasAuto')}</div>
          </div>
          
          <div className="bg-primary/90 text-white p-2 text-center font-bold text-[8px] flex flex-col items-center justify-center border-r border-white/20 bg-black/[0.04] uppercase cursor-pointer hover:bg-primary transition-colors select-none" onClick={() => handleSort('trocasManual')} title="Quantidade de itens substituídos manualmente por um humano">
            <div className="flex items-center justify-center w-full gap-1">Trocas Manuais {getSortIcon('trocasManual')}</div>
          </div>
          
          <div className="bg-primary/90 text-white p-2 text-center font-bold text-[8px] flex flex-col items-center justify-center uppercase cursor-pointer hover:bg-primary transition-colors select-none" onClick={() => handleSort('pctManual')} title="Percentual de esforço humano em relação ao total de trocas efetuadas">
            <div className="flex items-center justify-center w-full gap-1">% Esforço Manual {getSortIcon('pctManual')}</div>
          </div>
        </div>

        {/* TOOLBAR COM FILTRO DE PERÍODO */}
        <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between sticky left-0 z-20">
          <div className="flex items-center gap-4">
            <span className="font-bold text-xxs uppercase tracking-widest flex items-center gap-2">
              <TrendingDown className="h-3 w-3 text-primary" /> Ranking de Ofensores
            </span>
            <div className="flex items-center border-l border-gray-600 pl-2 ml-1">
              <Select value={periodo} onValueChange={(v: "30D" | "60D" | "90D") => setPeriodo(v)}>
                <SelectTrigger className="h-7 border-none bg-transparent hover:bg-white/5 focus:ring-0 px-2 shadow-none transition-colors rounded group gap-1.5 outline-none cursor-pointer">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <Calendar className="h-3 w-3 text-gray-400 group-hover:text-gray-300" />
                    <span className="text-gray-400 font-medium group-hover:text-gray-300">Período:</span>
                    <span className="text-white font-bold ml-0.5"><SelectValue /></span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30D">Últimos 30 Dias</SelectItem>
                  <SelectItem value="60D">Últimos 60 Dias</SelectItem>
                  <SelectItem value="90D">Últimos 90 Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-[10px] bg-white/10 hover:bg-white/20 text-white border-white/20" onClick={expandAll}><ChevronsDown className="h-3 w-3 mr-1" /> Expandir Tudo</Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] bg-white/10 hover:bg-white/20 text-white border-white/20" onClick={collapseAll}><ChevronsUp className="h-3 w-3 mr-1" /> Recolher Tudo</Button>
          </div>
        </div>

        <div className="max-h-[750px] overflow-y-auto bg-white relative">
          
          {/* TOTAL GLOBAL */}
          <div className="grid border-b-2 border-gray-300 bg-gray-200/80 sticky top-0 z-10 backdrop-blur-sm" style={{ gridTemplateColumns: gridTemplate }}>
            <div className="p-3 pl-4 flex items-center border-r border-gray-300/50">
              <div className="flex flex-col flex-1 min-w-0 pr-2">
                <span className="font-black text-lg text-gray-800 uppercase tracking-tight">TOTAL GLOBAL</span>
                <span className="text-xs font-bold text-muted-foreground/70 mt-0.5">{rupturasRanking.length} ERPs Afetados</span>
              </div>
              <Badge variant="outline" className={`ml-3 shrink-0 text-lg px-3 py-1 font-black shadow-md ${getBadgeStyle(pctItensManual)}`} title={`${pctItensManual}% de todo o trabalho de ruptura foi feito por humanos.`}>
                {pctItensManual}% MANUAL
              </Badge>
            </div>
            
            <div className="flex flex-col items-center justify-center p-2 border-r border-gray-300/50" title={`Foram faturados ${formatNumber(globais.pedidosTotal)} pedidos no período de ${periodo}.`}>
              <span className="font-bold text-sm text-gray-800">{formatNumber(globais.pedidosTotal)}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center p-2 border-r border-gray-300/50 bg-black/[0.02]" title={`Destes pedidos, ${formatNumber(globais.pedidosRuptura)} sofreram com falta de estoque.`}>
              <span className="font-bold text-sm text-gray-800">{formatNumber(globais.pedidosRuptura)}</span>
              <span className="text-[9px] text-muted-foreground font-black">Impacto Geral</span>
            </div>

            <div className="flex flex-col items-center justify-center p-2 border-r border-gray-300/50" title={`${formatNumber(globais.trocasAuto)} trocas de itens foram resolvidas de forma automática pelo robô.`}>
              <span className="font-bold text-sm text-secondary">{formatNumber(globais.trocasAuto)}</span>
              <span className="text-[9px] text-green-600 font-bold">{pctItensAuto}% de eficácia</span>
            </div>

            <div className="flex flex-col items-center justify-center p-2 border-r border-gray-300/50 bg-black/[0.02]" title={`Um total de ${formatNumber(globais.trocasManual)} trocas precisaram de intervenção manual da equipe.`}>
              <span className="font-black text-lg text-amber-600">{formatNumber(globais.trocasManual)}</span>
            </div>

            <div className="flex flex-col items-center justify-center p-2" title={`${pctItensManual}% de Esforço Operacional Humano no período.`}>
              <span className={`font-black text-sm ${pctItensManual >= 50 ? 'text-red-600' : 'text-amber-600'}`}>{pctItensManual}%</span>
            </div>
          </div>

          <div className="flex flex-col">
            {statsCalculated.executivos.length === 0 ? (
               <div className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground">
                 <AlertTriangle className="h-10 w-10 mb-3 opacity-20" />
                 <span className="font-bold text-lg">Nenhuma ruptura encontrada.</span>
               </div>
            ) : (
              statsCalculated.executivos.map((exec) => {
                const isExecExpanded = expandedItems[exec.name] ?? false;

                return (
                  <div key={exec.name} className="flex flex-col">
                    {/* NÍVEL 1: EXECUTIVO */}
                    <div className="grid bg-gray-100/50 hover:bg-gray-100 cursor-pointer border-b border-gray-200" style={{ gridTemplateColumns: gridTemplate }} onClick={() => toggleItem(exec.name, isExecExpanded)}>
                      <div className="p-3 pl-4 flex items-center min-w-0 border-r border-gray-200 border-l-4 border-primary">
                        <User className="h-5 w-5 text-primary shrink-0 mr-3" />
                        <span className="font-black text-sm text-gray-800 uppercase truncate" title={`Executivo: ${exec.name}`}>{formatName(exec.name)}</span>
                        <div className="ml-auto shrink-0 pl-2">{isExecExpanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</div>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200" title={`Total de pedidos: ${formatNumber(exec.pedidosTotal)}`}>
                        <span className="font-bold text-xs text-gray-700">{formatNumber(exec.pedidosTotal)}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200 bg-black/[0.02]" title={`${exec.pedidosRuptura} pedidos de clientes desta carteira sofreram ruptura.`}>
                        <span className="font-bold text-xs text-gray-800">{formatNumber(exec.pedidosRuptura)}</span>
                        <span className="text-[9px] text-muted-foreground font-semibold">{exec.pctRuptura}% da base</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200" title={`${formatNumber(exec.trocasAuto)} itens trocados automaticamente.`}>
                        <span className="font-bold text-xs text-secondary">{formatNumber(exec.trocasAuto)}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200 bg-black/[0.02]" title={`${formatNumber(exec.trocasManual)} itens trocados manualmente pela equipe.`}>
                        <span className="font-black text-sm text-amber-600">{formatNumber(exec.trocasManual)}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2" title={`A carteira deste executivo tem ${exec.pctManual}% de esforço manual em rupturas.`}>
                        <Badge variant="outline" className={`text-[10px] font-bold ${getBadgeStyle(exec.pctManual)}`}>{exec.pctManual}% MANUAL</Badge>
                      </div>
                    </div>

                    {isExecExpanded && exec.clientes.map((cli: any) => {
                      const cliId = `${exec.name}-${cli.name}`;
                      const isCliExpanded = expandedItems[cliId] ?? false;

                      return (
                        <div key={cliId} className="flex flex-col">
                          {/* NÍVEL 2: CLIENTE */}
                          <div className="grid bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-100" style={{ gridTemplateColumns: gridTemplate }} onClick={() => toggleItem(cliId, isCliExpanded)}>
                            <div className="p-3 border-r border-gray-200 flex items-center min-w-0" style={{ paddingLeft: '24px' }}>
                              <div className="border-l-2 border-secondary pl-3 flex items-center gap-3 w-full min-w-0">
                                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="font-bold text-[10px] text-gray-600 uppercase truncate" title={`Cliente: ${cli.name}`}>{cli.name}</span>
                                <div className="ml-auto shrink-0 pl-2">{isCliExpanded ? <ChevronUp className="h-4 w-4 text-secondary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</div>
                              </div>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200" title={`Total de pedidos faturados: ${formatNumber(cli.pedidosTotal)}`}>
                              <span className="font-bold text-xs text-gray-700">{formatNumber(cli.pedidosTotal)}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200 bg-black/[0.02]" title={`${cli.pedidosRuptura} pedidos deste cliente tiveram falta de item.`}>
                              <span className="font-bold text-xs text-gray-800">{formatNumber(cli.pedidosRuptura)}</span>
                              <span className="text-[9px] text-muted-foreground font-semibold">{cli.pctRuptura}% da base</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200" title={`Trocas sistêmicas: ${formatNumber(cli.trocasAuto)} itens.`}>
                              <span className="font-bold text-xs text-secondary">{formatNumber(cli.trocasAuto)}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200 bg-black/[0.02]" title={`Trocas manuais (ofensor): ${formatNumber(cli.trocasManual)} itens.`}>
                              <span className="font-black text-sm text-amber-600">{formatNumber(cli.trocasManual)}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2" title={`As rupturas deste cliente exigem ${cli.pctManual}% de intervenção manual.`}>
                              <Badge variant="outline" className={`text-[10px] font-bold ${getBadgeStyle(cli.pctManual)}`}>{cli.pctManual}% MANUAL</Badge>
                            </div>
                          </div>

                          {isCliExpanded && cli.erps.map((erp: any, idx: number) => {
                            const erpId = `${cliId}-${erp.erpCode}`;
                            const isErpExpanded = expandedItems[erpId] ?? false;
                            
                            // 🚀 FILTRO NO FRONTEND: Exibir apenas Itens Manuais no analítico
                            const itensManuais = (erp.itensDetalhados || []).filter((it: any) => it.tipo === 'MANUAL');
                            const hasItens = itensManuais.length > 0;

                            return (
                              <div key={`${erpId}-${idx}`} className="flex flex-col">
                                {/* NÍVEL 3: ERP */}
                                <div className={`grid bg-white cursor-pointer border-b border-gray-100 ${hasItens ? 'hover:bg-primary/5' : ''}`} style={{ gridTemplateColumns: gridTemplate }} onClick={() => hasItens && toggleItem(erpId, isErpExpanded)}>
                                  <div className="p-3 border-r bg-gray-50/10 flex items-center min-w-0" style={{ paddingLeft: '48px' }}>
                                    <div className="border-l-2 border-gray-200 pl-3 flex items-center gap-2 w-full min-w-0">
                                      <Cpu className="h-3 w-3 text-muted-foreground shrink-0" />
                                      <div className="flex flex-col truncate flex-1">
                                        <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Cód. ERP Mãe</span>
                                        <span className="text-[11px] font-bold text-primary truncate" title={erp.erpCode}>{erp.erpCode}</span>
                                      </div>
                                      {hasItens && <div className="ml-auto shrink-0 pl-2">{isErpExpanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</div>}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200" title={`Pedidos faturados sob este código ERP: ${formatNumber(erp.pedidosTotal)}`}>
                                    <span className="font-bold text-xs text-gray-700">{formatNumber(erp.pedidosTotal)}</span>
                                  </div>
                                  <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200 bg-black/[0.02]" title={`${erp.pedidosRuptura} pedidos deste ERP tiveram ruptura.`}>
                                    <span className="font-bold text-xs text-gray-800">{formatNumber(erp.pedidosRuptura)}</span>
                                    <span className="text-[9px] text-muted-foreground font-semibold">{erp.pctRuptura}% da base</span>
                                  </div>
                                  <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200" title={`${formatNumber(erp.trocasAuto)} itens trocados via robô para este ERP.`}>
                                    <span className="font-bold text-xs text-secondary">{formatNumber(erp.trocasAuto)}</span>
                                  </div>
                                  <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200 bg-black/[0.02]" title={`Atenção: ${formatNumber(erp.trocasManual)} itens trocados à mão neste ERP.`}>
                                    <span className="font-black text-sm text-amber-600">{formatNumber(erp.trocasManual)}</span>
                                  </div>
                                  <div className="flex flex-col items-center justify-center p-2" title={`Nível de esforço manual isolado deste ERP: ${erp.pctManual}%`}>
                                    <Badge variant="outline" className={`text-[10px] font-bold ${getBadgeStyle(erp.pctManual)}`}>{erp.pctManual}% MANUAL</Badge>
                                  </div>
                                </div>

                                {/* NÍVEL 4: TABELA DE ITENS (DETALHADA - APENAS MANUAIS) */}
                                {isErpExpanded && hasItens && (
                                  <div className="bg-slate-50 border-b p-6 shadow-inner animate-in fade-in zoom-in-95 duration-200" style={{ paddingLeft: '72px' }}>
                                    <div className="flex items-center gap-2 mb-4">
                                      <Package className="h-5 w-5 text-primary" />
                                      <h4 className="text-sm font-black text-gray-800 tracking-tight">Detalhamento de Itens Substituídos (Apenas Intervenções Manuais)</h4>
                                    </div>
                                    <div className="overflow-x-auto bg-white rounded-lg border shadow-sm">
                                      <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-100/80 text-[10px] text-muted-foreground uppercase border-b">
                                          <tr>
                                            <th className="px-4 py-3 font-bold" title="Data exata e número do Pedido afetado">Data / Pedido</th>
                                            <th className="px-4 py-3 font-bold text-center" title="Como a substituição foi realizada no sistema">Tipo</th>
                                            <th className="px-4 py-3 font-bold" title="Item original que estava com falta de estoque">Item Original (Com Ruptura)</th>
                                            <th className="px-4 py-3 text-center w-10"></th>
                                            <th className="px-4 py-3 font-bold" title="Item que foi entregue no lugar do original">Novo Item (Substituto)</th>
                                            <th className="px-4 py-3 font-bold text-center" title="Quantidade de unidades/caixas do produto que foram substituídas">Qtd. de Itens</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                          {itensManuais.map((item: any, iIdx: number) => (
                                            <tr key={iIdx} className="hover:bg-gray-50 transition-colors">
                                              <td className="px-4 py-3">
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3"/>{item.data}</span>
                                                  <span className="font-bold text-xs text-gray-800 flex items-center gap-1"><ShoppingCart className="h-3 w-3 text-primary"/>{item.pedido}</span>
                                                </div>
                                              </td>
                                              <td className="px-4 py-3 text-center">
                                                <Badge variant="outline" className={`text-[9px] font-bold ${item.tipo === 'AUTO' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{item.tipo}</Badge>
                                              </td>
                                              <td className="px-4 py-3">
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="font-mono text-[9px] font-bold text-red-500 uppercase tracking-wider">{item.codOriginal}</span>
                                                  <span className="text-xs font-semibold text-gray-500 line-through decoration-red-300 decoration-2">{item.original}</span>
                                                </div>
                                              </td>
                                              <td className="px-4 py-3 text-center text-muted-foreground"><ArrowRight className="h-4 w-4 mx-auto text-gray-300" /></td>
                                              <td className="px-4 py-3">
                                                <div className="flex flex-col gap-0.5 bg-primary/5 p-1.5 rounded border border-primary/10">
                                                  <span className="font-mono text-[9px] font-bold text-primary uppercase tracking-wider">{item.codSubstituto}</span>
                                                  <span className="text-xs font-bold text-gray-800">{item.substituto}</span>
                                                </div>
                                              </td>
                                              <td className="px-4 py-3 text-center font-mono font-bold text-gray-700">{item.qtd}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}