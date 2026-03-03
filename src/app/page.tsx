
"use client";

import { Fragment } from "react";
import { Brain } from "lucide-react";

export default function OrderFulfillmentDashboard() {
  return (
    <div className="min-h-screen p-4 overflow-x-auto">
      <div className="max-w-[1400px] mx-auto bg-surface-light dark:bg-surface-dark shadow-xl rounded-lg overflow-hidden border border-border-light dark:border-border-dark">
        {/* Header Principal */}
        <header className="bg-primary text-white text-center py-3 font-bold text-xl uppercase tracking-wide border-b border-white dark:border-gray-700">
          Etapas do Processo de Atendimento de Pedidos
        </header>

        {/* Linha das Etapas (Numeração) */}
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
          
          {/* Colunas Entrada de Pedidos (Subdivididas) */}
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

          {/* Outras colunas automatizadas */}
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

          {/* Subdivididos Manuais (Entrada) */}
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

          {/* Outras colunas manuais */}
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

        {/* Header Totais Gestores */}
        <div className="grid grid-cols-[220px_repeat(6,_1fr)] text-sm bg-gray-600 text-white font-bold text-xs">
          <div className="border-r border-b border-gray-500"></div>
          {["84,4%", "95,3%", "28,5%", "35,3%", "1,9%", "0,0%"].map((val, idx) => (
            <div key={`mgr-total-${idx}`} className="text-center py-1 border-r border-b border-gray-500 last:border-r-0">
              {val}
            </div>
          ))}
        </div>

        {/* Lista de Gestores */}
        {[
          { name: "Ana Paula Alcantara Rauber", values: ["81%", "99%", "15%", "12%", "0%", "0%"], special: { col: 1, type: "amber" } },
          { name: "Alexandre Postingher Lutke", values: ["100%", "100%", "7%", "42%", "2%", "0%"], indicators: [2, 3, 4] },
          { name: "Fabio Trevisan", values: ["71%", "92%", "48%", "41%", "0%", "0%"], indicators: [2, 3, 4] },
          { name: "Gianne Pizani", values: ["59%", "100%", "12%", "25%", "0%", "0%"], indicators: [0, 2, 3, 4] },
          { name: "Gilmar Heisser de Andrade", values: ["100%", "98%", "69%", "49%", "21%", "0%"], indicators: [0, 2, 3, 4] },
          { name: "Giovane Scherer", values: ["79%", "91%", "34%", "44%", "0%", "0%"], indicators: [0, 2, 3, 4] },
          { name: "Mauricio de Mello Gonçalves", values: ["81%", "97%", "60%", "47%", "0%", "0%"], special: { col: 0, type: "amber" }, indicators: [0, 2, 3, 4], bottomIndicator: true },
        ].map((manager, idx) => (
          <div key={`manager-${idx}`} className="grid grid-cols-[220px_repeat(6,_1fr)] text-sm border-b border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-medium px-3 py-1 flex items-center text-xs border-r border-white dark:border-gray-700">
              {manager.name}
            </div>
            {manager.values.map((val, vIdx) => {
              let bgColor = "bg-gray-300 dark:bg-gray-500";
              if (val === "100%" || val === "99%" || val === "98%" || val === "97%" || val === "92%" || val === "91%") {
                bgColor = "bg-secondary";
              }
              if (manager.special?.col === vIdx && manager.special.type === "amber") {
                bgColor = "bg-amber-400";
              }
              
              return (
                <div key={`val-${idx}-${vIdx}`} className={`${bgColor} text-white text-center py-1 font-bold border-r border-white dark:border-gray-700 flex items-center justify-center relative last:border-r-0`}>
                  {manager.indicators?.includes(vIdx) && (
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-green-800 absolute top-1 left-1"></div>
                  )}
                  {vIdx === 2 && manager.name === "Ana Paula Alcantara Rauber" && (
                    <div className="w-2 h-2 bg-green-700 transform rotate-45 absolute left-1 top-1"></div>
                  )}
                  {manager.bottomIndicator && vIdx === 2 && (
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-black absolute bottom-0 left-0"></div>
                  )}
                  {val}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
