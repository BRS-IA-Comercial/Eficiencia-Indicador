"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users } from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LabelList
} from "recharts";

interface EvolucaoTabProps {
  historicoEvolucao: any[];
  hcConfig: any;
  activeAverageStages: number[];
  formatNumber: (val: number) => string;
  currentRealTimeData?: any; 
}

export function EvolucaoTab({ historicoEvolucao, hcConfig, activeAverageStages, formatNumber, currentRealTimeData }: EvolucaoTabProps) {
  
  const stagesLabels = ["Entrada", "Rupturas", "Programação", "Ger. OV", "Liberação", "Ocorrências"];

  const formatMonthLabel = (mesStr: string) => {
    const [year, month] = mesStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' })
      .format(date).replace('.', '').toLowerCase();
  };

  const getThresholdColor = (val: number) => {
    if (val >= 95) return "#10b981"; 
    if (val >= 80) return "#f59e0b"; 
    return "#000000"; 
  };

  // Renderizador de Saving com lógica invertida (-X = Ganho Verde / +X = Perda Vermelha)
  const renderSaving = (gainHC: number) => {
    if (Math.abs(gainHC) < 0.01) return <span className="text-sm font-black text-gray-500">0.00</span>;
    const inv = -gainHC; 
    if (inv < 0) return <span className="text-sm font-black text-emerald-500">{inv.toFixed(2)}</span>;
    return <span className="text-sm font-black text-red-500">+{inv.toFixed(2)}</span>;
  };

  const chartData = useMemo(() => {
    const activeGestoresNames = currentRealTimeData?.records?.map((r: any) => r.gestor) || [];
    const fullHistory = [...(historicoEvolucao || [])];
    
    if (currentRealTimeData && !fullHistory.find(h => h.id === currentRealTimeData.mes)) {
      fullHistory.push({
        id: currentRealTimeData.mes,
        records: currentRealTimeData.records,
        isRealTime: true
      });
    }

    if (fullHistory.length === 0) return [];

    return fullHistory
      .map(mes => {
        if (!mes.records || mes.records.length === 0) return null;
        const filteredRecords = activeGestoresNames.length > 0 
          ? mes.records.filter((r: any) => activeGestoresNames.includes(r.gestor))
          : mes.records;
        if (filteredRecords.length === 0) return null;

        const isCurrent = mes.id === currentRealTimeData?.mes;
        let totalGeralNoMes = 0;

        filteredRecords.forEach((rec: any) => {
          if (isCurrent && rec.mediaPonderada !== undefined) {
             totalGeralNoMes += rec.mediaPonderada;
          } else {
             let somaAtivas = 0;
             activeAverageStages.forEach(idx => somaAtivas += (Number(rec[`etapa${idx + 1}`]) || 0));
             totalGeralNoMes += (somaAtivas / (activeAverageStages.length || 1));
          }
        });

        const numRecs = filteredRecords.length;
        
        return {
          mes: mes.id,
          mesLabel: isCurrent ? "Atual" : formatMonthLabel(mes.id),
          "Geral": (isCurrent && currentRealTimeData?.globalPct !== undefined) 
                     ? currentRealTimeData.globalPct 
                     : Math.round(totalGeralNoMes / numRecs)
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.mes.localeCompare(b!.mes));
  }, [historicoEvolucao, currentRealTimeData, activeAverageStages]);

  const hcAnalysis = useMemo(() => {
    if (!currentRealTimeData || !historicoEvolucao || historicoEvolucao.length === 0 || !hcConfig) return null;

    const baseMonth = historicoEvolucao.sort((a, b) => a.id.localeCompare(b.id))[0];
    const horasMensais = Number(hcConfig.horasMes) || 176; 

    const getAvgManualTimeE1 = (channels: any[]) => {
      if (!channels || channels.length === 0) return 15;
      let totalTime = 0;
      let totalManualOrders = 0;
      channels.forEach(chan => {
        const time = Number(hcConfig?.tempos?.etapa1?.[chan.name]) || 0;
        if (time > 0) { 
          totalTime += (chan.orders * time);
          totalManualOrders += chan.orders;
        }
      });
      return totalManualOrders > 0 ? totalTime / totalManualOrders : 15;
    };

    const calculateRow = (currRec: any) => {
      const baseRec = baseMonth.records.find((r: any) => r.gestor === currRec.gestor);
      const row = { gestor: currRec.gestor, totalNec: 0, totalBaseNec: 0, totalGain: 0, stages: [] as any[] };

      // Etapas do Gestor
      stagesLabels.forEach((_, i) => {
        const volData = currRec.volumes[i] || { pedidos: 0, itens: 0, canais: [] };
        const currentAutPct = currRec[`etapa${i + 1}`] || 0;
        const baseAutPct = baseRec ? (baseRec[`etapa${i + 1}`] || 0) : 0;

        let minutesPerUnit = 0;
        let volume = volData.pedidos;
        if (i === 0) { minutesPerUnit = getAvgManualTimeE1(volData.canais); }
        else if (i === 1) { minutesPerUnit = Number(hcConfig?.tempos?.etapa2_rupturas) || 1; volume = volData.itens; }
        else if (i === 2) { minutesPerUnit = Number(hcConfig?.tempos?.etapa3_programacao) || 3; }
        else if (i === 3) { minutesPerUnit = Number(hcConfig?.tempos?.etapa4_geracaoOV) || 0.5; }
        else if (i === 4) { minutesPerUnit = Number(hcConfig?.tempos?.etapa5_liberacao) || 1; }
        else if (i === 5) { minutesPerUnit = Number(hcConfig?.tempos?.etapa6_ocorrencias) || 10; }

        const hcNec = (volume * ((100 - currentAutPct) / 100) * minutesPerUnit) / 60 / horasMensais;
        const hcBaseNec = (volume * ((100 - baseAutPct) / 100) * minutesPerUnit) / 60 / horasMensais;
        const hcGain = hcBaseNec - hcNec;

        if (activeAverageStages.includes(i)) {
          row.totalNec += hcNec;
          row.totalBaseNec += hcBaseNec;
          row.totalGain += hcGain;
        }
        row.stages.push({ hcNec, hcBaseNec, hcGain, active: activeAverageStages.includes(i) });
      });

      return row;
    };

    const rows = currentRealTimeData.records.map(calculateRow);

    const global = { gestor: "TOTAL GLOBAL", totalNec: 0, totalBaseNec: 0, totalGain: 0, stages: [] as any[] };
    stagesLabels.forEach((_, i) => {
      let stgNec = 0, stgBaseNec = 0, stgGain = 0;
      rows.forEach(r => { stgNec += r.stages[i].hcNec; stgBaseNec += r.stages[i].hcBaseNec; stgGain += r.stages[i].hcGain; });
      global.stages.push({ hcNec: stgNec, hcBaseNec: stgBaseNec, hcGain: stgGain, active: activeAverageStages.includes(i) });
      if (activeAverageStages.includes(i)) {
        global.totalNec += stgNec;
        global.totalBaseNec += stgBaseNec;
        global.totalGain += stgGain;
      }
    });

    return { global, rows };
  }, [currentRealTimeData, historicoEvolucao, hcConfig, activeAverageStages]);

  const hcStats = useMemo(() => {
    if (chartData.length === 0) return { evolucaoAbsoluta: 0, statusAtual: 0 };
    const inicial = chartData[0]!["Geral"];
    const atual = chartData[chartData.length - 1]!["Geral"];
    return { evolucaoAbsoluta: atual - inicial, statusAtual: atual };
  }, [chartData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* INDICADORES TOPO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-primary shadow-sm flex flex-col justify-center">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Status Geral</p>
                <h3 className="text-4xl font-black text-gray-800">{hcStats.statusAtual}%</h3>
              </div>
              <TrendingUp className="h-12 w-12 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-emerald-500 shadow-sm flex flex-col justify-center bg-emerald-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">HC Poupado (Economia)</p>
                <h3 className="text-4xl font-black text-emerald-600">
                  {hcAnalysis ? (hcAnalysis.global.totalGain > 0 ? `-${hcAnalysis.global.totalGain.toFixed(1)}` : `+${(-hcAnalysis.global.totalGain).toFixed(1)}`) : '--'}
                </h3>
              </div>
              <Users className="h-12 w-12 text-emerald-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* CARD DO GRÁFICO (Evolução Geral) */}
        <Card className="border-l-4 border-orange-500 shadow-sm flex flex-col">
          <CardContent className="pt-4 pb-2 px-4 h-full flex flex-col min-h-[140px]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Evolução Geral ({chartData.length} Meses)</p>
            </div>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 15, right: 15, left: 15, bottom: 5 }}>
                  <XAxis dataKey="mesLabel" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#666'}} dy={5} padding={{ left: 15, right: 15 }} />
                  <YAxis type="number" domain={[0, 110]} hide />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="Geral" 
                    stroke="#000000" 
                    strokeWidth={3} 
                    dot={(props: any) => { 
                      const { cx, cy, payload } = props; 
                      return <circle cx={cx} cy={cy} r={5} fill={getThresholdColor(payload.Geral)} stroke="#fff" strokeWidth={2} />;
                    }}
                  >
                    <LabelList dataKey="Geral" position="top" offset={10} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#333' }} formatter={(v: number) => `${v}%`} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABELA DE ROI / HC FOCADA */}
      {hcAnalysis && (
        <Card className="shadow-lg mt-4 border-t-4 border-t-emerald-500 overflow-hidden">
          <CardHeader className="bg-emerald-50/50 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black flex items-center gap-2 text-emerald-800">
                <Users className="h-5 w-5 text-emerald-600" /> Detalhamento de Retorno sobre Investimento (Headcount)
              </CardTitle>
              <p className="text-[10px] text-muted-foreground mt-1">
                Considera 1 HC = {hcConfig?.horasMes || 176} horas.
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left">
              <thead className="bg-emerald-50/40 border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="p-4 font-bold text-gray-600 sticky left-0 bg-emerald-50 z-10 w-64 shadow-[1px_0_0_#e5e7eb]">HIERARQUIA DE ATENDIMENTO</th>
                  <th className="p-4 font-bold text-emerald-800 text-center border-r border-emerald-200/50 bg-emerald-100/50">RESUMO GLOBAL (HC)</th>
                  {stagesLabels.map((label, i) => (
                    <th key={i} className={`p-4 text-center border-l font-bold ${activeAverageStages.includes(i) ? 'text-gray-600' : 'opacity-30'}`}>
                      {label.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[12px]">
                
                {/* LINHA TOTAL GLOBAL */}
                <tr className="bg-gray-800 text-white shadow-sm">
                  <td className="p-4 font-bold sticky left-0 bg-gray-800 z-10 shadow-[1px_0_0_#1f2937]">TOTAL CONSOLIDADO</td>
                  <td className="p-3 bg-gray-700 min-w-[180px] border-r border-gray-600">
                    <div className="flex flex-col gap-1 text-[11px] text-gray-400 font-medium">
                      <div className="flex justify-between"><span>HC Nec. Base:</span> <span className="font-semibold text-gray-200 text-[12px]">{hcAnalysis.global.totalBaseNec.toFixed(1)}</span></div>
                      <div className="flex justify-between"><span>HC Nec. Atual:</span> <span className="font-semibold text-white text-[12px]">{hcAnalysis.global.totalNec.toFixed(1)}</span></div>
                      <div className="flex justify-between items-center mt-1 pt-1 border-t border-gray-600">
                         <span className="text-emerald-400 font-bold">HC Saving:</span> 
                         {renderSaving(hcAnalysis.global.totalGain)}
                      </div>
                    </div>
                  </td>
                  {hcAnalysis.global.stages.map((stg, i) => (
                    <td key={i} className={`p-3 text-center border-l border-gray-700 ${stg.active ? '' : 'bg-gray-800/80'}`}>
                      {stg.active ? (
                        <div className="flex flex-col gap-1 text-[11px] items-center">
                          <div className="font-semibold text-gray-200 text-[12px]">{stg.hcBaseNec.toFixed(2)}</div>
                          <div className="font-semibold text-white text-[12px]">{stg.hcNec.toFixed(2)}</div>
                          <div className="mt-1 pt-1 border-t border-gray-600 w-full text-center">
                            {renderSaving(stg.hcGain)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500 font-black text-lg">--</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* LINHAS DOS GESTORES */}
                {hcAnalysis.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors bg-white">
                    <td className="p-4 sticky left-0 bg-white z-10 shadow-[1px_0_0_#e5e7eb] font-bold text-gray-700">
                      {row.gestor}
                    </td>
                    <td className="p-3 text-left bg-emerald-50/50 min-w-[180px] border-r border-emerald-100">
                      <div className="flex flex-col gap-1 text-[11px] text-gray-500 font-medium">
                        <div className="flex justify-between"><span>HC Nec. Base:</span> <span className="font-semibold text-gray-700 text-[12px]">{row.totalBaseNec.toFixed(1)}</span></div>
                        <div className="flex justify-between"><span>HC Nec. Atual:</span> <span className="font-semibold text-black text-[12px]">{row.totalNec.toFixed(1)}</span></div>
                        <div className="flex justify-between items-center mt-1 pt-1 border-t border-emerald-200/50">
                           <span className="text-emerald-700 font-bold">HC Saving:</span> 
                           {renderSaving(row.totalGain)}
                        </div>
                      </div>
                    </td>
                    {row.stages.map((stg, i) => (
                      <td key={i} className={`p-3 text-center border-l border-gray-100 ${stg.active ? '' : 'bg-gray-50/50'}`}>
                        {stg.active ? (
                          <div className="flex flex-col gap-1 text-[11px] items-center">
                            <div className="font-semibold text-gray-700 text-[12px]">{stg.hcBaseNec.toFixed(2)}</div>
                            <div className="font-semibold text-black text-[12px]">{stg.hcNec.toFixed(2)}</div>
                            <div className="mt-1 pt-1 border-t border-emerald-100 w-full text-center">
                              {renderSaving(stg.hcGain)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300 font-black text-lg">--</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}

              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}