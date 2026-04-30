"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  LayoutDashboard, Settings as SettingsIcon, FileSpreadsheet, Upload, CheckCircle2,
  Loader2, FileUp, Database, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp,
  User, Building2, Cpu, Server, Terminal, Clock, Target, SlidersHorizontal, AlertCircle, Briefcase, Code, Filter, X, Search,
  ArrowUpDown, ArrowUp, ArrowDown, Layers, Lock, KeyRound, History, ArrowUpRight, ArrowDownRight, Activity, Calendar, Menu,
  MessageSquare, Edit3, AlertTriangle, TrendingDown, BookOpen, Info, HelpCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFirestore, useCollection, useFirebaseApp } from "@/firebase";
import { collection, doc, writeBatch, setDoc, getDocs, serverTimestamp, query, orderBy, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const SENHA_ADMIN = "admin123"; 

const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(Math.round(val));

const formatName = (fullName: string) => {
  if (!fullName || fullName.toUpperCase() === "NÃO DEFINIDO" || fullName.toUpperCase() === "NÃO INFORMADO") return fullName;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

const getPctColorClass = (pct: number, meta: number) => {
  if (meta > 0) {
    if (pct >= (meta * 0.95)) return "text-secondary"; 
    if (pct >= (meta * 0.80)) return "text-amber-500"; 
    return "text-gray-900 dark:text-white"; 
  }
  if (pct >= 95) return "text-secondary"; 
  if (pct >= 80) return "text-amber-500"; 
  return "text-gray-900 dark:text-white"; 
};

const getOverallAutomationPct = (stages: any[], activeAverageStages: number[]) => {
  if (!stages || stages.length === 0 || !activeAverageStages || activeAverageStages.length === 0) return 0;
  
  let sumPct = 0;
  let count = 0;
  
  stages.forEach((stg: any, idx: number) => {
    if (activeAverageStages.includes(idx)) {
      if (stg.metaOrders > 0) {
        const pct = (stg.activeOrders / stg.metaOrders) * 100;
        sumPct += Math.min(pct, 100); 
        count++;
      } else if (stg.totalOrders > 0) {
        sumPct += 100;
        count++;
      }
    }
  });
  
  return count > 0 ? Math.round(sumPct / count) : 0;
};

const getBadgeStyle = (pct: number) => {
  if (pct >= 95) return 'bg-secondary/10 text-secondary border-secondary/30';
  if (pct >= 80) return 'bg-amber-50 text-amber-600 border-amber-300';
  return 'bg-gray-100 text-gray-700 border-gray-300';
};

// COMPONENTE VISUAL PARA A DUPLA COLUNA DA ETAPA 2
const renderStage2Content = (stage: any, weightedPct: number, metaPct: number, isGlobal: boolean = false) => {
  const tAuto = stage.trocasAuto || 0;
  const tMan = stage.trocasManual || 0;
  const tTotal = tAuto + tMan;
  const pctAut = tTotal > 0 ? Math.round((tAuto / tTotal) * 100) : 0;
  const pctMan = tTotal > 0 ? Math.round((tMan / tTotal) * 100) : 0;

  const textSize = isGlobal ? 'text-sm' : 'text-[11px]';
  const labelSize = isGlobal ? 'text-[10px]' : 'text-[8px]';

  return (
    <div className="flex w-full h-full divide-x divide-gray-300/50">
      <div className="flex-1 flex flex-col items-center justify-center px-1 pt-1 pb-3 text-center bg-transparent">
        <span className={`${labelSize} font-black text-muted-foreground/50 uppercase tracking-tighter mb-0.5`}>Flag</span>
        <span className={`${textSize} font-bold text-muted-foreground/80 leading-none mb-1`}>
          {isGlobal ? `Meta: ${metaPct}%` : `${metaPct}%`}
        </span>
        <span className={`${textSize} font-black ${getPctColorClass(weightedPct, metaPct)} leading-none`}>
          {isGlobal ? `Real: ${weightedPct}%` : `${weightedPct}%`}
        </span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-1 pt-1 pb-3 text-center bg-transparent">
        <span className={`${labelSize} font-black text-muted-foreground/50 uppercase tracking-tighter mb-0.5`}>Trocas</span>
        <span className={`${textSize} font-black text-secondary leading-none`} title="Trocas Automáticas">Aut: {pctAut}%</span>
        <span className={`${textSize} font-black text-amber-600 mt-1 leading-none`} title="Trocas Manuais">Man: {pctMan}%</span>
      </div>
    </div>
  );
};

// COMPONENTE VISUAL PARA ALINHAMENTO PADRÃO DAS OUTRAS ETAPAS
const renderStandardStage = (weightedPct: number, metaPct: number, isGlobal: boolean = false) => {
  const textSize = isGlobal ? 'text-sm' : 'text-[11px]';
  const labelSize = isGlobal ? 'text-[10px]' : 'text-[8px]';

  return (
    <div className="flex flex-col items-center justify-center w-full h-full px-1 pt-1 pb-3 text-center">
      <span className={`${labelSize} font-black opacity-0 uppercase tracking-tighter mb-0.5 select-none`}>-</span>
      <span className={`${textSize} font-bold text-muted-foreground/80 leading-none mb-1`}>
        {isGlobal ? `Meta: ${metaPct}%` : `${metaPct}%`}
      </span>
      <span className={`${textSize} font-black ${getPctColorClass(weightedPct, metaPct)} leading-none`}>
        {isGlobal ? `Real: ${weightedPct}%` : `${weightedPct}%`}
      </span>
    </div>
  );
};

const ENTRADA_SISTEMAS: Record<string, boolean> = {
  "Supply Manager": true,
  "Pré Pedidos Manual": false,
  "Painel Pré Pedidos Manual": false,
  "Pré Pedidos Automático": true,
  "Painel Pré Pedidos Automático": true,
  "PDF": false,
  "PDF IA": true,
  "PDF - IA": true,
  "Importação Excel": false,
  "Importação Excel IA": true,
  "Webservice": false
};

function MultiSelectDropdown({ title, options, selected, onChange, isOpen, onToggle, formatLabel }: any) {
  const [search, setSearch] = useState("");

  useEffect(() => { if (!isOpen) setSearch(""); }, [isOpen]);

  const filtered = options.filter((o: string) => o.toLowerCase().includes(search.toLowerCase()));
  const isAllFilteredSelected = filtered.length > 0 && filtered.every((opt: string) => selected.includes(opt));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set([...selected, ...filtered]);
      onChange(Array.from(newSelected));
    } else {
      const newSelected = selected.filter((s: string) => !filtered.includes(s));
      onChange(newSelected);
    }
  };

  const getTriggerText = () => {
    if (selected.length === 0) return `${title} (Todos)`;
    if (selected.length === 1) return formatLabel ? formatLabel(selected[0]) : selected[0];
    return `${selected.length} selecionados`;
  };

  return (
    <div className="relative flex-1 min-w-[130px] max-w-[180px]">
      <div 
        onClick={onToggle} 
        className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-md cursor-pointer border transition-colors w-full ${selected.length > 0 ? 'bg-primary/5 border-primary/30 text-primary font-semibold' : 'bg-transparent border-gray-200 hover:bg-gray-50 text-gray-700'}`}
        title={selected.join(", ")}
      >
        <span className="truncate mr-2">{getTriggerText()}</span>
        <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onToggle}></div>
          <div className="absolute top-full mt-1 left-0 w-64 bg-white border border-gray-200 shadow-xl rounded-lg z-50 flex flex-col max-h-[350px] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b bg-gray-50/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder={`Buscar em ${title.toLowerCase()}...`} 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  className="w-full text-xs border rounded-md pl-8 pr-2 py-1.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 bg-white" 
                />
              </div>
            </div>
            
            <div className="overflow-y-auto p-1.5 flex flex-col gap-0.5">
              <label className="flex items-center gap-2 text-xs cursor-pointer px-2 py-1.5 hover:bg-gray-100 rounded-md transition-colors border-b border-gray-100 mb-1">
                <input 
                  type="checkbox" 
                  className="accent-primary h-3.5 w-3.5 cursor-pointer rounded-sm"
                  checked={isAllFilteredSelected} 
                  onChange={(e) => handleSelectAll(e.target.checked)} 
                />
                <span className="font-bold text-gray-700">(Selecionar Todos)</span>
              </label>
              
              {filtered.map((opt: string) => (
                <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer px-2 py-1.5 hover:bg-gray-100 rounded-md transition-colors">
                  <input 
                    type="checkbox" 
                    className="accent-primary h-3.5 w-3.5 cursor-pointer rounded-sm"
                    checked={selected.includes(opt)} 
                    onChange={(e) => {
                      if (e.target.checked) onChange([...selected, opt]);
                      else onChange(selected.filter((x: string) => x !== opt));
                    }} 
                  />
                  <span className="truncate text-gray-600" title={opt}>{formatLabel ? formatLabel(opt) : opt}</span>
                </label>
              ))}
              
              {filtered.length === 0 && (
                <div className="text-xs text-muted-foreground p-3 text-center italic">Nenhum resultado encontrado.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type LogGroupMode = 'executivo' | 'cliente' | 'data';
type ObsMode = 'view' | 'auth' | 'edit';

type ActionPlan = {
  id: string;
  etapaIdx: number;
  acao: string;
  responsavel: string;
  prazo: string;
};

export default function OrderFulfillmentDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [periodo, setPeriodo] = useState<"30D" | "60D" | "90D">("30D");

  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  
  const [expandedObs, setExpandedObs] = useState<Record<string, boolean>>({});
  const [obsMode, setObsMode] = useState<Record<string, ObsMode>>({});
  const [obsPassword, setObsPassword] = useState("");
  const [obsError, setObsError] = useState(false);

  const [showProfile, setShowProfile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);

  // Filtros
  const [filterExecutivos, setFilterExecutivos] = useState<string[]>([]);
  const [filterCarteiras, setFilterCarteiras] = useState<string[]>([]);
  const [filterClientes, setFilterClientes] = useState<string[]>([]);
  const [filterMultiCD, setFilterMultiCD] = useState<string[]>([]);
  const [filterRegraOC, setFilterRegraOC] = useState<string[]>([]);
  const [filterPerfil, setFilterPerfil] = useState<string[]>([]); 
  
  const [filterEtapa1, setFilterEtapa1] = useState<string[]>([]);
  const [filterEtapa2, setFilterEtapa2] = useState<string[]>([]);
  const [filterEtapa3, setFilterEtapa3] = useState<string[]>([]);
  const [filterEtapa4, setFilterEtapa4] = useState<string[]>([]);
  const [filterEtapa5, setFilterEtapa5] = useState<string[]>([]);
  const [filterEtapa6, setFilterEtapa6] = useState<string[]>([]);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const [groupByPortfolio, setGroupByPortfolio] = useState(true);
  const [logGroupMode, setLogGroupMode] = useState<LogGroupMode>('executivo');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'rob', direction: 'desc' });
  const [host, setHost] = useState<string>("");
  const [sistemasOverrides, setSistemasOverrides] = useState<Record<string, string>>({});
  
  const [isConfigAuthenticated, setIsConfigAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  // Configurações e Planos de Ação
  const [activeAverageStages, setActiveAverageStages] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  const [entrySystems, setEntrySystems] = useState<Record<string, boolean>>({
    "Supply Manager": true,
    "Pré Pedidos Manual": false,
    "Painel Pré Pedidos Manual": false,
    "Pré Pedidos Automático": true,
    "Painel Pré Pedidos Automático": true,
    "PDF": false,
    "PDF IA": true,
    "PDF - IA": true,
    "Importação Excel": false,
    "Importação Excel IA": true,
    "Webservice": false
  });

  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [apEtapa, setApEtapa] = useState("0");
  const [apAcao, setApAcao] = useState("");
  const [apResp, setApResp] = useState("");
  const [apPrazo, setApPrazo] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const db = useFirestore();
  const app = useFirebaseApp();
  const { toast } = useToast();
  const projectId = app.options.projectId;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStages = localStorage.getItem('activeAverageStages');
      if (savedStages) {
        try { setActiveAverageStages(JSON.parse(savedStages)); } catch (e) {}
      }
      const savedSystems = localStorage.getItem('entrySystemsConfig');
      if (savedSystems) {
        try { setEntrySystems(JSON.parse(savedSystems)); } catch (e) {}
      }
      const savedAp = localStorage.getItem('actionPlansConfig');
      if (savedAp) {
        try { setActionPlans(JSON.parse(savedAp)); } catch (e) {}
      }
    }
  }, []);

  const toggleAverageStage = (idx: number) => {
    setActiveAverageStages(prev => {
      if (prev.length === 1 && prev.includes(idx)) return prev;
      const next = prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx].sort();
      if (typeof window !== "undefined") localStorage.setItem('activeAverageStages', JSON.stringify(next));
      return next;
    });
  };

  const updateEntrySystem = (name: string, isAuto: boolean) => {
    setEntrySystems(prev => {
      const next = { ...prev, [name]: isAuto };
      if (typeof window !== "undefined") localStorage.setItem('entrySystemsConfig', JSON.stringify(next));
      return next;
    });
  };

  const removeEntrySystem = (name: string) => {
    setEntrySystems(prev => {
      const next = { ...prev };
      delete next[name];
      if (typeof window !== "undefined") localStorage.setItem('entrySystemsConfig', JSON.stringify(next));
      return next;
    });
  };

  const handleAddActionPlan = () => {
    if (!apAcao.trim() || !apResp.trim() || !apPrazo.trim()) {
      toast({ variant: "destructive", title: "Atenção", description: "Preencha a ação, o responsável e o prazo para adicionar o plano." });
      return;
    }
    const newPlan: ActionPlan = {
      id: Date.now().toString(),
      etapaIdx: parseInt(apEtapa),
      acao: apAcao.trim(),
      responsavel: apResp.trim(),
      prazo: apPrazo
    };
    setActionPlans(prev => {
      const next = [...prev, newPlan];
      if (typeof window !== "undefined") localStorage.setItem('actionPlansConfig', JSON.stringify(next));
      return next;
    });
    setApAcao("");
    setApResp("");
    setApPrazo("");
    toast({ title: "Sucesso", description: "Plano de ação adicionado!" });
  };

  const removeActionPlan = (id: string) => {
    setActionPlans(prev => {
      const next = prev.filter(p => p.id !== id);
      if (typeof window !== "undefined") localStorage.setItem('actionPlansConfig', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => { if (typeof window !== "undefined") setHost(window.location.host); }, []);

  const erpMappingsQuery = useMemo(() => query(collection(db, "erp_mappings"), orderBy("importedAt", "desc")), [db]);
  const cuboMetricsQuery = useMemo(() => query(collection(db, "cubo_metrics"), orderBy("updatedAt", "desc")), [db]);
  const logsQuery = useMemo(() => query(collection(db, "automation_logs"), orderBy("data", "desc"), limit(400)), [db]);

  const { data: erpMappings, loading: isLoadingMappings } = useCollection(erpMappingsQuery);
  const { data: cuboMetrics, loading: isLoadingMetrics } = useCollection(cuboMetricsQuery);
  const { data: automationLogs, loading: isLoadingLogs } = useCollection(logsQuery);

  const lastSyncDate = useMemo(() => {
    if (!cuboMetrics || cuboMetrics.length === 0) return null;
    let latest: Date | null = null;
    cuboMetrics.forEach((m: any) => {
      if (m.updatedAt?.toDate) {
        const d = m.updatedAt.toDate();
        if (!latest || d > latest) latest = d;
      }
    });
    return latest;
  }, [cuboMetrics]);

  const dateRangeText = useMemo(() => {
    if (!lastSyncDate) return "Carregando...";
    const end = lastSyncDate;
    const start = new Date(end);
    const dias = parseInt(periodo.replace("D", ""));
    start.setDate(start.getDate() - dias);
    const formatDate = (d: Date) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
    return `${formatDate(start)} a ${formatDate(end)}`;
  }, [lastSyncDate, periodo]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === SENHA_ADMIN) {
      setIsConfigAuthenticated(true);
      setPasswordError(false);
      toast({ title: "Acesso Liberado", description: "Área restrita desbloqueada com sucesso." });
    } else {
      setPasswordError(true);
      toast({ variant: "destructive", title: "Acesso Negado", description: "Senha incorreta." });
    }
  };

  const handleUpdateSistema = async (conglomeradoId: string, novoSistema: string) => {
    if (!conglomeradoId || conglomeradoId === "undefined") return;
    setSistemasOverrides(prev => ({ ...prev, [conglomeradoId]: novoSistema }));
    if (!db) return;
    try {
      const ref = doc(db, "erp_mappings", conglomeradoId);
      await setDoc(ref, { sistemaEntrada: novoSistema }, { merge: true });
      toast({ title: "Conglomerado Atualizado", description: `Sistema padrão salvo com sucesso.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao atualizar o sistema do conglomerado." });
    }
  };

  const handleUpdateErpSistema = async (conglomeradoId: string, erpCode: string, novoSistema: string) => {
    if (!conglomeradoId || conglomeradoId === "undefined") return;
    const overrideKey = `${conglomeradoId}_${erpCode}`;
    setSistemasOverrides(prev => ({ ...prev, [overrideKey]: novoSistema }));
    
    if (!db) return;
    try {
      const ref = doc(db, "erp_mappings", conglomeradoId);
      await setDoc(ref, { 
        erpSistemasOverrides: { [erpCode]: novoSistema } 
      }, { merge: true }); 
      
      toast({ title: "ERP Atualizado", description: novoSistema ? "Exceção criada com sucesso." : "O ERP voltou a herdar do Conglomerado." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao atualizar o sistema do ERP." });
    }
  };

  const handleUpdateObservacao = async (conglomeradoId: string, erpCode: string, novaObs: string) => {
    if (!conglomeradoId || conglomeradoId === "undefined" || !db) return;
    try {
      const ref = doc(db, "erp_mappings", conglomeradoId);
      await setDoc(ref, { 
        erpObservacoes: { [erpCode]: novaObs } 
      }, { merge: true }); 
      toast({ title: "Anotação Salva", description: "A observação foi gravada com sucesso." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar observação." });
    }
  };

  const handleUpdateExcecao = async (conglomeradoId: string, erpCode: string, currentExcecoes: any, stepIndex: number, isException: boolean) => {
    if (!conglomeradoId || conglomeradoId === "undefined" || !db) return;
    const newExcecoes = { ...(currentExcecoes || {}), [stepIndex]: isException };
    try {
      const ref = doc(db, "erp_mappings", conglomeradoId);
      await setDoc(ref, { 
        erpExcecoes: { [erpCode]: newExcecoes } 
      }, { merge: true }); 
      toast({ title: "Exceção Atualizada", description: "Regra salva com sucesso. Os totais serão recalculados." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar a exceção." });
    }
  };

  const sortNodes = (nodes: any[]) => {
    return [...nodes].sort((a, b) => {
      let aValue: any = 0; let bValue: any = 0;
      
      if (sortConfig.key === 'name') {
        aValue = a.name || a.code || "";
        bValue = b.name || b.code || "";
        return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else if (sortConfig.key === 'pedidos') {
        aValue = a.stats?.avgOrders3M || 0; bValue = b.stats?.avgOrders3M || 0;
      } else if (sortConfig.key === 'rob') {
        aValue = a.stats?.avgRob3M || 0; bValue = b.stats?.avgRob3M || 0;
      } else if (sortConfig.key.startsWith('etapa')) {
        const idx = parseInt(sortConfig.key.replace('etapa', ''));
        aValue = a.stats?.stages[idx]?.totalOrders > 0 ? (a.stats.stages[idx].activeOrders / a.stats.stages[idx].totalOrders) : 0;
        bValue = b.stats?.stages[idx]?.totalOrders > 0 ? (b.stats.stages[idx].activeOrders / b.stats.stages[idx].totalOrders) : 0;
      }
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    });
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filterOptions = useMemo(() => {
    if (!cuboMetrics || !erpMappings) return { executivos: [], carteiras: [], clientes: [] };
    const execs = new Set<string>();
    const carts = new Set<string>();
    const clis = new Set<string>();

    const metricMap: Record<string, any> = {};
    cuboMetrics.forEach((m: any) => { metricMap[m.id] = m; });

    erpMappings.forEach((m: any) => {
      const congName = m.conglomerado;
      const erpCodes = (m.erpMaeCodes || []).filter((code: string) => metricMap[code]);
      if (erpCodes.length > 0) {
        const execName = metricMap[erpCodes[0]].executivo || "Não Definido";
        const cartName = metricMap[erpCodes[0]].carteira || "Sem Carteira";
        execs.add(execName);
        carts.add(cartName);
        clis.add(congName);
      }
    });

    return {
      executivos: Array.from(execs).sort(),
      carteiras: Array.from(carts).sort(),
      clientes: Array.from(clis).sort()
    };
  }, [cuboMetrics, erpMappings]);

  // Opções Dinâmicas para os Filtros
  const { multiCDOptions, regraOCOptions, perfilOptions, etapa1Options, etapa2Options, autoManualOptions } = useMemo(() => {
    if (!cuboMetrics || !erpMappings) {
      return { multiCDOptions: [], regraOCOptions: [], perfilOptions: [], etapa1Options: [], etapa2Options: [], autoManualOptions: [] };
    }

    const mCD = new Set<string>();
    const rOC = new Set<string>();
    const perf = new Set<string>();
    const e1 = new Set<string>();
    const e2 = new Set<string>();
    const autoMan = new Set<string>();

    const metricMap: Record<string, any> = {};
    cuboMetrics.forEach((m: any) => { metricMap[m.id] = m; });

    erpMappings.forEach((m: any) => {
      const docId = m.id || m.conglomerado;
      const sistemaConglomerado = sistemasOverrides[docId] !== undefined ? sistemasOverrides[docId] : (m.sistemaEntrada || ""); 

      const erpCodes = (m.erpMaeCodes || []).filter((code: string) => metricMap[code]);
      
      erpCodes.forEach((code: string) => {
        const metric = metricMap[code];
        if (metric?.isAtivo === false) return; // Só conta os ativos

        // Multi CD
        const isEnd = metric?.multiCdEnderecos === "SIM" || metric?.multiCdEnderecos === "TRUE" || metric?.multiCdEnderecos === "1" || metric?.multiCdEnderecos === true;
        const isManual = metric?.fatMultiCD === "SIM" || metric?.fatMultiCD === "TRUE" || metric?.fatMultiCD === "1" || metric?.fatMultiCD === true;
        mCD.add(isEnd ? "Multi CD | Automático" : (isManual ? "Multi CD Pedido | Manual" : "Não é Multi CD"));
        
        // Regra OC
        const exigeOC = metric?.naoLiberarPedidoSemOC === "SIM" || metric?.naoLiberarPedidoSemOC === "TRUE" || metric?.naoLiberarPedidoSemOC === "1";
        rOC.add(exigeOC ? "Precisa de OC" : "Livre (Sem OC)");

        // Perfil
        const isSLA = String(metric?.utilizaJanela).toUpperCase() === "NAO";
        perf.add(isSLA ? "SLA" : "JANELA");

        // Etapas
        const erpOverrideKey = `${docId}_${code}`;
        const erpSistemaProprio = sistemasOverrides[erpOverrideKey] !== undefined ? sistemasOverrides[erpOverrideKey] : (m.erpSistemasOverrides?.[code] || "");
        const erpExcecoesDb = m.erpExcecoes?.[code] || {}; 
        const sistemaFinal = erpSistemaProprio ? erpSistemaProprio : sistemaConglomerado;

        const getStageLabel = (idx: number, isActive: boolean, forcedException: boolean = false) => {
           if (erpExcecoesDb[idx] === true || forcedException) return "N/A (Exceção)";
           return isActive ? "AUTOMÁTICO" : "MANUAL";
        };

        e1.add(erpExcecoesDb[0] === true ? "N/A (Exceção)" : (sistemaFinal || "Não Definido"));
        e2.add(erpExcecoesDb[1] === true || metric?.trocaAutomatica === "NAO" ? "N/A (Exceção)" : "Aceita Troca"); 
        
        autoMan.add(getStageLabel(2, metric?.etapa2Ativo || false)); // E3
        autoMan.add(getStageLabel(3, metric?.flagGeraOVAuto || false)); // E4
        autoMan.add(getStageLabel(4, metric?.etapa3Ativo || false)); // E5
        autoMan.add(getStageLabel(5, false)); // E6
      });
    });

    return {
      multiCDOptions: Array.from(mCD).sort(),
      regraOCOptions: Array.from(rOC).sort(),
      perfilOptions: Array.from(perf).sort(),
      etapa1Options: Array.from(e1).sort(),
      etapa2Options: Array.from(e2).sort(),
      autoManualOptions: Array.from(autoMan).sort()
    };
  }, [cuboMetrics, erpMappings, sistemasOverrides]);

  const groupedAndFilteredLogs = useMemo(() => {
    if (!automationLogs || automationLogs.length === 0) return [];

    const metricMap: Record<string, any> = {};
    if (cuboMetrics) {
      cuboMetrics.forEach((m: any) => { metricMap[m.id] = m; });
    }

    const groups: Record<string, Record<string, any[]>> = {};

    automationLogs.forEach((log: any) => {
      const currentMetric = metricMap[log.erpCode];
      const exec = log.executivo || (currentMetric?.executivo) || "Não Informado";
      const cart = log.carteira || (currentMetric?.carteira) || "Sem Carteira";
      const cli = log.cliente || (currentMetric?.cliente) || "Sem Nome";
      
      const isSLA = currentMetric?.utilizaJanela === "NAO";
      const perfilAtendimento = isSLA ? "SLA" : "JANELA";
      const logPerfil = log.perfil || perfilAtendimento;

      const dateObj = log.data?.toDate ? log.data.toDate() : new Date();
      const dateStr = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dateObj);

      if (filterExecutivos.length > 0 && !filterExecutivos.includes(exec)) return;
      if (filterCarteiras.length > 0 && !filterCarteiras.includes(cart)) return;
      if (filterClientes.length > 0 && !filterClientes.includes(cli)) return;
      if (filterPerfil.length > 0 && !filterPerfil.includes(logPerfil)) return;

      let l1Key = exec;
      let l2Key = cli;

      if (logGroupMode === 'cliente') {
        l1Key = cli;
        l2Key = dateStr;
      } else if (logGroupMode === 'data') {
        l1Key = dateStr;
        l2Key = exec;
      }

      if (!groups[l1Key]) groups[l1Key] = {};
      if (!groups[l1Key][l2Key]) groups[l1Key][l2Key] = [];

      groups[l1Key][l2Key].push({ ...log, executivoReal: exec, carteiraReal: cart, clienteReal: cli, dateObj, dateStr, perfilReal: logPerfil });
    });

    return Object.keys(groups).sort((a, b) => {
      if (logGroupMode === 'data') {
        const [d1, m1, y1] = a.split('/');
        const [d2, m2, y2] = b.split('/');
        const timeA = new Date(`${y1}-${m1}-${d1}`).getTime();
        const timeB = new Date(`${y2}-${m2}-${d2}`).getTime();
        return timeB - timeA; 
      }
      return a.localeCompare(b);
    }).map(l1 => ({
      name: l1,
      subgroups: Object.keys(groups[l1]).sort().map(l2 => ({
        name: l2,
        logs: groups[l1][l2].sort((a: any, b: any) => b.dateObj.getTime() - a.dateObj.getTime())
      }))
    }));
  }, [automationLogs, cuboMetrics, filterExecutivos, filterCarteiras, filterClientes, filterPerfil, logGroupMode]);

  const getL1Icon = () => logGroupMode === 'executivo' ? <User className="h-4 w-4 text-primary" /> : logGroupMode === 'cliente' ? <Building2 className="h-4 w-4 text-primary" /> : <Calendar className="h-4 w-4 text-primary" />;
  const getL2Icon = () => logGroupMode === 'executivo' ? <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> : logGroupMode === 'cliente' ? <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />;

  const toggleLogItem = (id: string, currentState: boolean) => {
    setExpandedLogs(prev => ({ ...prev, [id]: !currentState }));
  };

  const expandAllLogs = () => {
    const all: Record<string, boolean> = {};
    groupedAndFilteredLogs.forEach(l1 => {
      all[`l1-${l1.name}`] = true;
      l1.subgroups.forEach(l2 => {
        all[`l2-${l1.name}-${l2.name}`] = true;
      });
    });
    setExpandedLogs(all);
  };

  const collapseAllLogs = () => setExpandedLogs({});

  const { executives: groupedData, globalStats } = useMemo(() => {
    if (!cuboMetrics || !erpMappings) return { executives: [], globalStats: null };

    const execMap: Record<string, { name: string, portfolios: Record<string, { name: string, conglomerates: any[] }> }> = {};
    const metricMap: Record<string, any> = {};
    
    let globalOrders3M = 0, globalRob3M = 0, globalOrdersCur = 0, globalRobCur = 0, globalErpsCount = 0;
    
    const globalStages = Array(6).fill(null).map(() => ({ active: 0, total: 0, activeOrders: 0, metaOrders: 0, totalOrders: 0, rupturedOrders: 0, baseOrders: 0, trocasAuto: 0, trocasManual: 0 }));
    
    cuboMetrics.forEach((m: any) => { metricMap[m.id] = m; });

    erpMappings.forEach((m: any) => {
      const congName = m.conglomerado;
      const docId = m.id || congName; 
      
      const sistemaConglomerado = sistemasOverrides[docId] !== undefined ? sistemasOverrides[docId] : (m.sistemaEntrada || ""); 

      const erpCodes = (m.erpMaeCodes || []).filter((code: string) => metricMap[code]);
      if (erpCodes.length === 0) return;

      let execName = metricMap[erpCodes[0]].executivo || "Não Definido";
      let cartName = metricMap[erpCodes[0]].carteira || "Sem Carteira";

      if (filterExecutivos.length > 0 && !filterExecutivos.includes(execName)) return;
      if (filterCarteiras.length > 0 && !filterCarteiras.includes(cartName)) return;
      if (filterClientes.length > 0 && !filterClientes.includes(congName)) return;

      if (!execMap[execName]) execMap[execName] = { name: execName, portfolios: {} };
      if (!execMap[execName].portfolios[cartName]) execMap[execName].portfolios[cartName] = { name: cartName, conglomerates: [] };

      let congOrders3M = 0, congRob3M = 0, congOrdersCur = 0, congRobCur = 0, congErpsCount = 0;
      const stageStatsCong = Array(6).fill(null).map(() => ({ active: 0, total: 0, activeOrders: 0, metaOrders: 0, totalOrders: 0, rupturedOrders: 0, baseOrders: 0, trocasAuto: 0, trocasManual: 0 }));
      const systemWeights: Record<string, number> = {};
      const erps: any[] = [];

      erpCodes.forEach((code: string) => {
        const metric = metricMap[code];
        const isAtivo = metric?.isAtivo !== false;

        const isEnd = metric?.multiCdEnderecos === "SIM" || metric?.multiCdEnderecos === "TRUE" || metric?.multiCdEnderecos === "1" || metric?.multiCdEnderecos === true;
        const isManual = metric?.fatMultiCD === "SIM" || metric?.fatMultiCD === "TRUE" || metric?.fatMultiCD === "1" || metric?.fatMultiCD === true;
        const multiCdLabel = isEnd ? "Multi CD | Automático" : (isManual ? "Multi CD Pedido | Manual" : "Não é Multi CD");
        
        const exigeOC = metric?.naoLiberarPedidoSemOC === "SIM" || metric?.naoLiberarPedidoSemOC === "TRUE" || metric?.naoLiberarPedidoSemOC === "1";
        const ocLabel = exigeOC ? "Precisa de OC" : "Livre (Sem OC)";

        const isSLA = String(metric?.utilizaJanela).toUpperCase() === "NAO";
        const profileLabel = isSLA ? "SLA" : "JANELA";

        if (filterMultiCD.length > 0 && !filterMultiCD.includes(multiCdLabel)) return;
        if (filterRegraOC.length > 0 && !filterRegraOC.includes(ocLabel)) return;
        if (filterPerfil.length > 0 && !filterPerfil.includes(profileLabel)) return;
        
        const erpOverrideKey = `${docId}_${code}`;
        const erpSistemaDb = m.erpSistemasOverrides?.[code] || "";
        const erpSistemaProprio = sistemasOverrides[erpOverrideKey] !== undefined ? sistemasOverrides[erpOverrideKey] : (m.erpSistemasOverrides?.[code] || "");
        const erpObservacaoDb = m.erpObservacoes?.[code] || "";
        const erpExcecoesDb = m.erpExcecoes?.[code] || {}; 

        const sistemaFinal = erpSistemaProprio ? erpSistemaProprio : sistemaConglomerado;
        const isEtapa1Auto = sistemaFinal ? entrySystems[sistemaFinal] || false : false;

        const getStageLabel = (idx: number, isActive: boolean, forcedException: boolean = false) => {
           if (erpExcecoesDb[idx] === true || forcedException) return "N/A (Exceção)";
           return isActive ? "AUTOMÁTICO" : "MANUAL";
        };

        const etapa1Label = erpExcecoesDb[0] === true ? "N/A (Exceção)" : (sistemaFinal || "Não Definido");
        const etapa2Label = erpExcecoesDb[1] === true || metric?.trocaAutomatica === "NAO" ? "N/A (Exceção)" : "Aceita Troca"; 
        const etapa3Label = getStageLabel(2, metric?.etapa2Ativo || false);
        const etapa4Label = getStageLabel(3, metric?.flagGeraOVAuto || false);
        const etapa5Label = getStageLabel(4, metric?.etapa3Ativo || false);
        const etapa6Label = getStageLabel(5, false);

        if (filterEtapa1.length > 0 && !filterEtapa1.includes(etapa1Label)) return;
        if (filterEtapa2.length > 0 && !filterEtapa2.includes(etapa2Label)) return;
        if (filterEtapa3.length > 0 && !filterEtapa3.includes(etapa3Label)) return;
        if (filterEtapa4.length > 0 && !filterEtapa4.includes(etapa4Label)) return;
        if (filterEtapa5.length > 0 && !filterEtapa5.includes(etapa5Label)) return;
        if (filterEtapa6.length > 0 && !filterEtapa6.includes(etapa6Label)) return;

        congErpsCount++;
        globalErpsCount++;

        let ord3M = 0, rob3M = 0, ordCur = 0, robCur = 0, rup3M = 0;
        let stagesForStats = Array(6).fill(null).map(() => ({ totalOrders: 0, activeOrders: 0, metaOrders: 0, rupturedOrders: 0, baseOrders: 0, trocasAuto: 0, trocasManual: 0, isException: false }));

        const hist = metric?.[`Historico_${periodo}`] || {
            Orders: metric?.avgOrders3M || 0,
            ROB: metric?.avgRob3M || 0,
            trocasAuto: metric?.trocasAuto || 0,
            trocasManual: metric?.trocasManual || 0,
            pedidosComRuptura: metric?.avgRuptura3M || 0
        };

        if (isAtivo) {
          ord3M = hist.Orders || 0; 
          rob3M = hist.ROB || 0;
          ordCur = metric?.ordersCurrent || 0; 
          robCur = metric?.robCurrent || 0;
          rup3M = hist.pedidosComRuptura || 0; 

          congOrders3M += ord3M; congRob3M += rob3M; congOrdersCur += ordCur; congRobCur += robCur;
          globalOrders3M += ord3M; globalRob3M += rob3M; globalOrdersCur += ordCur; globalRobCur += robCur;

          if (sistemaFinal) {
            systemWeights[sistemaFinal] = (systemWeights[sistemaFinal] || 0) + ord3M;
          }

          const isEtapa2Auto = metric?.trocaAutomatica !== "NAO"; 

          const stagesActive = [
            isEtapa1Auto, 
            isEtapa2Auto,                     
            metric?.etapa2Ativo || false,      
            metric?.flagGeraOVAuto || false,   
            metric?.etapa3Ativo || false,      
            false                              
          ];

          stagesActive.forEach((isActive, i) => {
            let isException = erpExcecoesDb[i] === true;
            
            if (i === 1 && metric?.trocaAutomatica === "NAO") {
              isException = true; 
            }

            let tOrd = ord3M;
            let aOrd = isActive ? ord3M : 0;
            let rupOrd = 0;

            if (i === 1) {
              rupOrd = rup3M; 
              stageStatsCong[i].trocasAuto += hist.trocasAuto || 0;
              stageStatsCong[i].trocasManual += hist.trocasManual || 0;
              globalStages[i].trocasAuto += hist.trocasAuto || 0;
              globalStages[i].trocasManual += hist.trocasManual || 0;
            }

            let mOrd = isException ? 0 : tOrd; 

            stageStatsCong[i].totalOrders += tOrd;
            globalStages[i].totalOrders += tOrd;
            
            stageStatsCong[i].activeOrders += aOrd;
            globalStages[i].activeOrders += aOrd;
            
            stageStatsCong[i].metaOrders += mOrd;
            globalStages[i].metaOrders += mOrd;

            stageStatsCong[i].rupturedOrders += rupOrd;
            globalStages[i].rupturedOrders += rupOrd;
            
            stageStatsCong[i].baseOrders += ord3M;
            globalStages[i].baseOrders += ord3M;

            if (!isException && isActive) {
              stageStatsCong[i].active += 1;
              globalStages[i].active += 1;
            }

            stagesForStats[i] = { totalOrders: tOrd, activeOrders: aOrd, metaOrders: mOrd, rupturedOrders: rupOrd, baseOrders: ord3M, trocasAuto: (i===1 ? hist.trocasAuto||0 : 0), trocasManual: (i===1 ? hist.trocasManual||0 : 0), isException: isException };
          });
        }
        
        erps.push({ 
          code, name: code, metric: { ...metric, avgOrders3M: ord3M, avgRob3M: rob3M, avgRuptura3M: rup3M, trocasAuto: hist.trocasAuto, trocasManual: hist.trocasManual }, isAtivo, 
          sistemaFinal, erpSistemaProprio, isEtapa1Auto, 
          observacao: erpObservacaoDb,
          excecoes: erpExcecoesDb,
          stats: { avgOrders3M: ord3M, avgRob3M: rob3M, stages: stagesForStats } 
        });
      });

      if (erps.length === 0) return;

      let predominantSystem = "";
      let maxWeight = -1;
      Object.entries(systemWeights).forEach(([sys, weight]) => {
        if (weight > maxWeight) {
          maxWeight = weight;
          predominantSystem = sys;
        }
      });

      execMap[execName].portfolios[cartName].conglomerates.push({
        id: docId, 
        name: congName, 
        sistemaEntrada: sistemaConglomerado, 
        predominantSystem, 
        erps: sortNodes(erps),
        stats: { avgOrders3M: congOrders3M, avgRob3M: congRob3M, ordersCurrent: congOrdersCur, robCurrent: congRobCur, totalErps: congErpsCount, stages: stageStatsCong }
      });
    });

    const executives = Object.values(execMap).map(exec => {
      let execOrders3M = 0, execRob3M = 0, execOrdersCur = 0, execRobCur = 0, execTotalErps = 0;
      const stageStatsExec = Array(6).fill(null).map(() => ({ active: 0, total: 0, activeOrders: 0, metaOrders: 0, totalOrders: 0, rupturedOrders: 0, baseOrders: 0, trocasAuto: 0, trocasManual: 0 }));

      const portfolios = Object.values(exec.portfolios).map(port => {
        let portOrders3M = 0, portRob3M = 0, portOrdersCur = 0, portRobCur = 0, portTotalErps = 0;
        const stageStatsPort = Array(6).fill(null).map(() => ({ active: 0, total: 0, activeOrders: 0, metaOrders: 0, totalOrders: 0, rupturedOrders: 0, baseOrders: 0, trocasAuto: 0, trocasManual: 0 }));

        port.conglomerates.forEach(cong => {
          portOrders3M += cong.stats.avgOrders3M; portRob3M += cong.stats.avgRob3M;
          portOrdersCur += cong.stats.ordersCurrent; portRobCur += cong.stats.robCurrent;
          portTotalErps += cong.stats.totalErps;

          execOrders3M += cong.stats.avgOrders3M; execRob3M += cong.stats.avgRob3M;
          execOrdersCur += cong.stats.ordersCurrent; execRobCur += cong.stats.robCurrent;
          execTotalErps += cong.stats.totalErps;

          cong.stats.stages.forEach((stg: any, i: number) => {
            stageStatsPort[i].total += stg.total; stageStatsPort[i].active += stg.active;
            stageStatsPort[i].totalOrders += stg.totalOrders; 
            stageStatsPort[i].activeOrders += stg.activeOrders;
            stageStatsPort[i].metaOrders += stg.metaOrders;
            stageStatsPort[i].rupturedOrders += stg.rupturedOrders; 
            stageStatsPort[i].baseOrders += stg.baseOrders;
            stageStatsPort[i].trocasAuto += stg.trocasAuto || 0;
            stageStatsPort[i].trocasManual += stg.trocasManual || 0;

            stageStatsExec[i].total += stg.total; stageStatsExec[i].active += stg.active;
            stageStatsExec[i].totalOrders += stg.totalOrders; 
            stageStatsExec[i].activeOrders += stg.activeOrders;
            stageStatsExec[i].metaOrders += stg.metaOrders;
            stageStatsExec[i].rupturedOrders += stg.rupturedOrders; 
            stageStatsExec[i].baseOrders += stg.baseOrders;
            stageStatsExec[i].trocasAuto += stg.trocasAuto || 0;
            stageStatsExec[i].trocasManual += stg.trocasManual || 0;
          });
        });

        return { name: port.name, conglomerates: sortNodes(port.conglomerates), stats: { avgOrders3M: portOrders3M, avgRob3M: portRob3M, ordersCurrent: portOrdersCur, robCurrent: portRobCur, totalErps: portTotalErps, stages: stageStatsPort } };
      }).filter(port => port.stats.totalErps > 0);

      const allConglomerates: any[] = [];
      portfolios.forEach(p => p.conglomerates.forEach((c: any) => allConglomerates.push(c)));

      return { 
        name: exec.name, 
        portfolios: sortNodes(portfolios), 
        conglomerates: sortNodes(allConglomerates), 
        stats: { avgOrders3M: execOrders3M, avgRob3M: execRob3M, ordersCurrent: execOrdersCur, robCurrent: execRobCur, totalErps: execTotalErps, stages: stageStatsExec } 
      };
    }).filter(exec => exec.stats.totalErps > 0);

    return { executives: sortNodes(executives), globalStats: { avgOrders3M: globalOrders3M, avgRob3M: globalRob3M, ordersCurrent: globalOrdersCur, robCurrent: globalRobCur, totalErps: globalErpsCount, stages: globalStages } };
  }, [cuboMetrics, erpMappings, filterExecutivos, filterCarteiras, filterClientes, filterMultiCD, filterRegraOC, filterPerfil, filterEtapa1, filterEtapa2, filterEtapa3, filterEtapa4, filterEtapa5, filterEtapa6, sortConfig, sistemasOverrides, periodo, entrySystems]);

  const rupturasRanking = useMemo(() => {
    if (!groupedData) return [];
    
    let allErps: any[] = [];
    
    groupedData.forEach(exec => {
      exec.portfolios.forEach((port: any) => {
        port.conglomerates.forEach((cong: any) => {
          cong.erps.forEach((erp: any) => {
            const isExceptionEtapa2 = erp.excecoes?.[1] === true || erp.metric?.trocaAutomatica === "NAO"; 
            
            const hist = erp.metric?.[`Historico_${periodo}`] || {
                Orders: erp.metric?.avgOrders3M || 0,
                trocasAuto: erp.metric?.trocasAuto || 0,
                trocasManual: erp.metric?.trocasManual || 0,
                pedidosComRuptura: erp.metric?.avgRuptura3M || 0
            };
            
            const tManual = hist.trocasManual || 0;
            const tAuto = hist.trocasAuto || 0;
            const tTotal = tManual + tAuto;
            const pedidosRup = hist.pedidosComRuptura || 0;
            const pedidosTotal = hist.Orders || 0;

            if ((tManual > 0 || pedidosRup > 0) && !isExceptionEtapa2) {
              allErps.push({
                executivo: exec.name,
                cliente: cong.name,
                erpCode: erp.code,
                pedidosTotal: pedidosTotal,
                pedidosRuptura: pedidosRup,
                trocasAuto: tAuto,
                trocasManual: tManual,
                trocasTotal: tTotal,
                pctRuptura: pedidosTotal > 0 ? Math.round((pedidosRup / pedidosTotal) * 100) : 0,
                pctManual: tTotal > 0 ? Math.round((tManual / tTotal) * 100) : 0
              });
            }
          });
        });
      });
    });

    return allErps.sort((a, b) => b.trocasManual - a.trocasManual);
  }, [groupedData, periodo]);

  const hasActiveFilter = filterExecutivos.length > 0 || filterCarteiras.length > 0 || filterClientes.length > 0 || filterMultiCD.length > 0 || filterRegraOC.length > 0 || filterPerfil.length > 0 || filterEtapa1.length > 0 || filterEtapa2.length > 0 || filterEtapa3.length > 0 || filterEtapa4.length > 0 || filterEtapa5.length > 0 || filterEtapa6.length > 0;
  
  const activeFilterCount = filterExecutivos.length + filterCarteiras.length + filterClientes.length + filterMultiCD.length + filterRegraOC.length + filterPerfil.length + filterEtapa1.length + filterEtapa2.length + filterEtapa3.length + filterEtapa4.length + filterEtapa5.length + filterEtapa6.length;

  const toggleItem = (id: string, currentState: boolean) => {
    setExpandedItems(prev => ({ ...prev, [id]: !currentState }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = { ...expandedItems };
    groupedData.forEach(exec => {
      all[exec.name] = true;
      if (groupByPortfolio) {
        exec.portfolios.forEach((port: any) => {
          const portId = `${exec.name}-${port.name}`;
          all[portId] = true;
          port.conglomerates.forEach((cong: any) => all[`${portId}-${cong.name}`] = true);
        });
      } else {
        exec.conglomerates.forEach((cong: any) => all[`${exec.name}-${cong.name}`] = true);
      }
    });
    setExpandedItems(all);
  };

  const collapseAll = () => {
    const all: Record<string, boolean> = { ...expandedItems };
    groupedData.forEach(exec => {
      all[exec.name] = false;
      if (groupByPortfolio) {
        exec.portfolios.forEach((port: any) => {
          const portId = `${exec.name}-${port.name}`;
          all[portId] = false;
          port.conglomerates.forEach((cong: any) => all[`${portId}-${cong.name}`] = false);
        });
      } else {
        exec.conglomerates.forEach((cong: any) => all[`${exec.name}-${cong.name}`] = false);
      }
    });
    setExpandedItems(all);
  };

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
      
      let batch = writeBatch(db);
      const existingDocs = await getDocs(collection(db, "erp_mappings"));
      const newConglomerates = new Set<string>();
      let count = 0;
      let batchCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue; 

        const conglomeradoOriginal = String(row[2] || "").trim(); 
        const erpMaeRaw = row[4];                                 
        const sistemaRaw = String(row[5] || "").trim();            

        if (conglomeradoOriginal && erpMaeRaw) {
          const idSeguro = conglomeradoOriginal.replace(/\//g, "-").replace(/\\/g, "-");
          const erpCodes = String(erpMaeRaw).split(",").map(c => c.trim()).filter(c => c !== "");
          const mappingRef = doc(db, "erp_mappings", idSeguro);
          
          const dataToSave: any = { 
            conglomerado: conglomeradoOriginal, 
            erpMaeCodes: erpCodes, 
            importedAt: serverTimestamp() 
          };

          if (sistemaRaw !== "") {
            dataToSave.sistemaEntrada = sistemaRaw;
          }
          
          batch.set(mappingRef, dataToSave, { merge: true });
          
          newConglomerates.add(idSeguro);
          count++;
          batchCount++;

          if (batchCount >= 400) {
            await batch.commit();
            batch = writeBatch(db); 
            batchCount = 0;
          }
        }
      }

      for (const d of existingDocs.docs) {
        if (!newConglomerates.has(d.id)) {
          batch.delete(d.ref);
          batchCount++;
          
          if (batchCount >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      toast({ title: "Sincronização Perfeita!", description: `${count} conglomerados processados e base limpa.` });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("🔥 ERRO DETALHADO NA IMPORTAÇÃO:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao processar arquivo. Veja o erro no Console (F12)." });
    } finally {
      setIsImporting(false);
    }
  };

  const stages = ["Entrada de Pedidos", "Tratamento de Rupturas", "Programação de Entrega", "Geração de OV", "Liberação de Pedidos", "Ocorrências de Entrega"];
  
  const gridTemplate = showProfile 
    ? `minmax(250px, 350px) 70px 90px 70px 90px 100px minmax(130px, 1fr) minmax(240px, 2fr) repeat(4, minmax(130px, 1fr)) 45px`
    : `minmax(250px, 350px) 50px minmax(130px, 1fr) minmax(240px, 2fr) repeat(4, minmax(130px, 1fr)) 45px`;

  const renderPasswordScreen = () => (
    <div className="flex items-center justify-center min-h-[500px]">
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="bg-primary text-white rounded-t-lg text-center py-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white/20 rounded-full">
              <Lock className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Área Restrita</CardTitle>
          <p className="text-sm opacity-80 mt-2">Digite a senha corporativa para acessar as configurações e a auditoria.</p>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input 
                  type="password" 
                  placeholder="Senha de Administrador" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 text-sm border rounded-lg outline-none transition-colors ${passwordError ? 'border-red-500 focus:ring-red-500' : 'focus:border-primary focus:ring-1 focus:ring-primary'}`}
                />
              </div>
              {passwordError && <p className="text-xs text-red-500 text-center font-semibold">Senha Incorreta. Tente novamente.</p>}
            </div>
            <Button type="submit" className="w-full py-6 text-lg font-bold">Desbloquear Acesso</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  const getActiveTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Operacional';
      case 'rupturas': return 'Análise de Rupturas';
      case 'historico': return 'Auditoria de Automação';
      case 'configuracao': return 'Configurações de Painel';
      case 'documentacao': return 'Guia e Documentação';
      default: return 'Visão Geral';
    }
  };

  const obsContext = {
    expandedObs, setExpandedObs,
    obsMode, setObsMode,
    obsPassword, setObsPassword,
    obsError, setObsError,
    isConfigAuthenticated, setIsConfigAuthenticated,
    handleUpdateObservacao,
    handleUpdateExcecao,
    activeAverageStages
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-body p-4">
      <div className="max-w-[1600px] mx-auto space-y-4">
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border mb-4">
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Button 
                  onClick={() => setShowNavMenu(!showNavMenu)} 
                  variant="outline" 
                  size="icon" 
                  className="h-10 w-10 text-gray-600 hover:text-primary border-gray-200"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                
                {showNavMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNavMenu(false)}></div>
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white shadow-xl rounded-lg border border-gray-200 z-50 p-2 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 pt-2 pb-1">Navegação</div>
                      <button 
                        onClick={() => { setActiveTab('dashboard'); setShowNavMenu(false); }} 
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'dashboard' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}
                      >
                        <LayoutDashboard className="h-4 w-4" /> Dashboard Operacional
                      </button>
                      <button 
                        onClick={() => { setActiveTab('rupturas'); setShowNavMenu(false); }} 
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'rupturas' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}
                      >
                        <AlertTriangle className="h-4 w-4" /> Análise de Rupturas
                      </button>
                      <button 
                        onClick={() => { setActiveTab('historico'); setShowNavMenu(false); }} 
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'historico' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}
                      >
                        <History className="h-4 w-4" /> Histórico de Mudanças
                      </button>
                      <button 
                        onClick={() => { setActiveTab('configuracao'); setShowNavMenu(false); }} 
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'configuracao' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}
                      >
                        <SettingsIcon className="h-4 w-4" /> Configurações Gerais
                      </button>
                      <button 
                        onClick={() => { setActiveTab('documentacao'); setShowNavMenu(false); }} 
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'documentacao' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}
                      >
                        <BookOpen className="h-4 w-4" /> Guia e Documentação
                      </button>
                    </div>
                  </>
                )}
              </div>
              <h2 className="font-black text-xl text-gray-800 tracking-tight">{getActiveTabTitle()}</h2>
            </div>

            <div className="flex items-center gap-3">
              {activeTab === 'dashboard' && (
                <div className="flex items-center gap-2 bg-gray-50 border rounded-md px-3 py-1.5 h-10">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-muted-foreground whitespace-nowrap mr-2">Agrupar Carteira:</span>
                  <Button variant={groupByPortfolio ? "default" : "outline"} size="sm" className="h-6 px-3 text-[10px]" onClick={() => setGroupByPortfolio(true)}>Sim</Button>
                  <Button variant={!groupByPortfolio ? "default" : "outline"} size="sm" className="h-6 px-3 text-[10px]" onClick={() => setGroupByPortfolio(false)}>Não</Button>
                </div>
              )}

              <Button 
                onClick={() => setShowFilters(!showFilters)} 
                variant={showFilters || hasActiveFilter ? "default" : "outline"} 
                className="h-10 gap-2 relative transition-all"
              >
                <Filter className="h-4 w-4" />
                <span className="font-bold hidden sm:inline">Filtros</span>
                
                {hasActiveFilter && !showFilters && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="bg-white p-3 rounded-lg shadow-sm border mb-4 flex flex-wrap gap-2 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 w-full text-xs font-bold text-muted-foreground uppercase tracking-widest pb-1 border-b mb-1">
                <Filter className="h-3 w-3" /> Filtrar Resultados Visíveis
              </div>
              
              <MultiSelectDropdown 
                title="Executivos" 
                options={filterOptions.executivos} 
                selected={filterExecutivos} 
                onChange={setFilterExecutivos} 
                isOpen={openDropdown === 'exec'} 
                onToggle={() => setOpenDropdown(openDropdown === 'exec' ? null : 'exec')}
                formatLabel={formatName}
              />
              
              <MultiSelectDropdown 
                title="Carteiras" 
                options={filterOptions.carteiras} 
                selected={filterCarteiras} 
                onChange={setFilterCarteiras} 
                isOpen={openDropdown === 'cart'} 
                onToggle={() => setOpenDropdown(openDropdown === 'cart' ? null : 'cart')}
              />

              <MultiSelectDropdown 
                title="Clientes" 
                options={filterOptions.clientes} 
                selected={filterClientes} 
                onChange={setFilterClientes} 
                isOpen={openDropdown === 'cli'} 
                onToggle={() => setOpenDropdown(openDropdown === 'cli' ? null : 'cli')}
              />

              <MultiSelectDropdown 
                title="Multi CD" 
                options={multiCDOptions} 
                selected={filterMultiCD} 
                onChange={setFilterMultiCD} 
                isOpen={openDropdown === 'mcd'} 
                onToggle={() => setOpenDropdown(openDropdown === 'mcd' ? null : 'mcd')}
              />

              <MultiSelectDropdown 
                title="Regra OC" 
                options={regraOCOptions} 
                selected={filterRegraOC} 
                onChange={setFilterRegraOC} 
                isOpen={openDropdown === 'oc'} 
                onToggle={() => setOpenDropdown(openDropdown === 'oc' ? null : 'oc')}
              />

              <MultiSelectDropdown 
                title="Perfil" 
                options={perfilOptions} 
                selected={filterPerfil} 
                onChange={setFilterPerfil} 
                isOpen={openDropdown === 'perfil'} 
                onToggle={() => setOpenDropdown(openDropdown === 'perfil' ? null : 'perfil')}
              />

              <div className="w-full h-px bg-gray-100 my-1"></div>
              <div className="flex items-center gap-2 w-full text-xs font-bold text-muted-foreground uppercase tracking-widest pb-1 border-b mb-1">
                <Layers className="h-3 w-3" /> Filtrar por Etapas
              </div>

              <MultiSelectDropdown 
                title="E1: Entrada" 
                options={etapa1Options} 
                selected={filterEtapa1} 
                onChange={setFilterEtapa1} 
                isOpen={openDropdown === 'e1'} 
                onToggle={() => setOpenDropdown(openDropdown === 'e1' ? null : 'e1')}
              />
              <MultiSelectDropdown 
                title="E2: Rupturas" 
                options={etapa2Options} 
                selected={filterEtapa2} 
                onChange={setFilterEtapa2} 
                isOpen={openDropdown === 'e2'} 
                onToggle={() => setOpenDropdown(openDropdown === 'e2' ? null : 'e2')}
              />
              <MultiSelectDropdown 
                title="E3: Programação" 
                options={autoManualOptions} 
                selected={filterEtapa3} 
                onChange={setFilterEtapa3} 
                isOpen={openDropdown === 'e3'} 
                onToggle={() => setOpenDropdown(openDropdown === 'e3' ? null : 'e3')}
              />
              <MultiSelectDropdown 
                title="E4: Ger. OV" 
                options={autoManualOptions} 
                selected={filterEtapa4} 
                onChange={setFilterEtapa4} 
                isOpen={openDropdown === 'e4'} 
                onToggle={() => setOpenDropdown(openDropdown === 'e4' ? null : 'e4')}
              />
              <MultiSelectDropdown 
                title="E5: Liberação" 
                options={autoManualOptions} 
                selected={filterEtapa5} 
                onChange={setFilterEtapa5} 
                isOpen={openDropdown === 'e5'} 
                onToggle={() => setOpenDropdown(openDropdown === 'e5' ? null : 'e5')}
              />
              <MultiSelectDropdown 
                title="E6: Ocorrências" 
                options={autoManualOptions} 
                selected={filterEtapa6} 
                onChange={setFilterEtapa6} 
                isOpen={openDropdown === 'e6'} 
                onToggle={() => setOpenDropdown(openDropdown === 'e6' ? null : 'e6')}
              />

              {hasActiveFilter && (
                <button 
                  onClick={() => { 
                    setFilterExecutivos([]); 
                    setFilterCarteiras([]); 
                    setFilterClientes([]); 
                    setFilterMultiCD([]); 
                    setFilterRegraOC([]); 
                    setFilterPerfil([]); 
                    setFilterEtapa1([]);
                    setFilterEtapa2([]);
                    setFilterEtapa3([]);
                    setFilterEtapa4([]);
                    setFilterEtapa5([]);
                    setFilterEtapa6([]);
                  }}
                  className="ml-auto hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors text-red-500 border border-red-100 hover:border-red-300 flex items-center gap-1.5"
                  title="Limpar Todos os Filtros"
                >
                  <X className="h-3.5 w-3.5" /> <span className="text-xs font-bold uppercase">Limpar</span>
                </button>
              )}
            </div>
          )}

          <TabsContent value="dashboard" className="mt-0 space-y-4">
            <div className="bg-surface-light dark:bg-surface-dark shadow-xl rounded-lg border border-border-light dark:border-border-dark min-w-[1300px] overflow-x-auto">
              
              <div className="grid text-sm border-b bg-white rounded-t-lg" style={{ gridTemplateColumns: gridTemplate }}>
                <div className="p-3 font-bold text-muted-foreground uppercase text-xxs tracking-widest flex items-center justify-between border-r border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => requestSort('name')}>
                  <div className="flex items-center gap-2"><User className="h-3 w-3" /> Hierarquia de Atendimento</div>
                  {getSortIcon('name')}
                </div>
                
                <div className="bg-gray-100 p-2 flex items-center justify-center border-r cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => setShowProfile(!showProfile)}>
                  {showProfile ? <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground text-center">Perfil</span> : <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />}
                </div>

                {showProfile && (
                  <>
                    <div className="bg-gray-100 border-r flex flex-col items-center justify-center p-2 cursor-pointer hover:bg-gray-200 transition-colors">
                      <div className="font-bold text-[10px] uppercase text-muted-foreground flex items-center justify-center gap-1 w-full" title="Regra de Múltiplos CDs">Multi CD</div>
                    </div>
                    <div className="bg-gray-100 border-r flex flex-col items-center justify-center p-2 cursor-pointer hover:bg-gray-200 transition-colors">
                      <div className="font-bold text-[10px] uppercase text-muted-foreground flex items-center justify-center gap-1 w-full" title="Exige Ordem de Compra para liberar?">Regra OC</div>
                    </div>
                    <div className="bg-gray-100 border-r flex flex-col items-center justify-center p-2 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('pedidos')}>
                      <div className="font-bold text-[10px] uppercase text-muted-foreground flex items-center justify-center gap-1 w-full">Pedidos {getSortIcon('pedidos')}</div>
                      <span className="text-[8px] text-muted-foreground/70 whitespace-nowrap">({periodo}/Atual)</span>
                    </div>
                    <div className="bg-gray-100 border-r flex flex-col items-center justify-center p-2 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('rob')}>
                      <div className="font-bold text-[10px] uppercase text-muted-foreground flex items-center justify-center gap-1 w-full">ROB {getSortIcon('rob')}</div>
                      <span className="text-[8px] text-muted-foreground/70 whitespace-nowrap">({periodo}/Atual)</span>
                    </div>
                  </>
                )}

                {stages.map((label, i) => {
                  const colBg = i % 2 !== 0 ? 'bg-black/[0.04]' : '';
                  return (
                    <div key={i} className={`bg-primary/90 text-white p-2 text-center font-bold text-[8px] flex flex-col items-center justify-center border-r border-white/20 cursor-pointer hover:bg-primary transition-colors ${colBg}`} onClick={() => requestSort(`etapa${i}`)}>
                      <div className="opacity-70 flex items-center justify-center gap-1 w-full">ETAPA {i + 1} {getSortIcon(`etapa${i}`)}</div>
                      <span className="text-[10px] uppercase">{label}</span>
                    </div>
                  );
                })}

                <div className="bg-gray-100 p-2 flex items-center justify-center border-r hover:bg-gray-200 transition-colors" title="Anotações e Justificativas">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between sticky left-0 z-20">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-xxs uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="h-3 w-3 text-primary" /> Visão Consolidada
                  </span>
                  
                  {lastSyncDate && (
                    <>
                      <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 border-l border-gray-600 pl-4" title="Última sincronização do banco de dados (Cubo)">
                        <Clock className="h-3 w-3" /> Atualizado em: {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(lastSyncDate)}
                      </span>
                      <div className="flex items-center border-l border-gray-600 pl-2 ml-1">
                        <Select value={periodo} onValueChange={(v: "30D" | "60D" | "90D") => setPeriodo(v)}>
                          <SelectTrigger className="h-7 border-none bg-transparent hover:bg-white/5 focus:ring-0 focus:ring-offset-0 px-2 shadow-none transition-colors rounded group gap-1.5 outline-none cursor-pointer">
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <Calendar className="h-3 w-3 text-gray-400 group-hover:text-gray-300 transition-colors" />
                              <span className="text-gray-400 font-medium group-hover:text-gray-300 transition-colors">Período Analisado:</span>
                              <span className="text-white font-bold ml-0.5">
                                <SelectValue />
                              </span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30D">Últimos 30 Dias</SelectItem>
                            <SelectItem value="60D">Últimos 60 Dias</SelectItem>
                            <SelectItem value="90D">Últimos 90 Dias</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-[10px] text-gray-400 font-medium hidden sm:inline opacity-70 ml-1">
                          ({dateRangeText})
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] bg-white/10 hover:bg-white/20 text-white border-white/20" onClick={expandAll}><ChevronsDown className="h-3 w-3 mr-1" /> Expandir Tudo</Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] bg-white/10 hover:bg-white/20 text-white border-white/20" onClick={collapseAll}><ChevronsUp className="h-3 w-3 mr-1" /> Recolher Tudo</Button>
                </div>
              </div>
              
              <div className="max-h-[750px] overflow-y-auto bg-white dark:bg-surface-dark relative">
                {(isLoadingMappings || isLoadingMetrics) && (
                  <div className="p-12 text-center text-muted-foreground animate-pulse"><Loader2 className="animate-spin inline mr-2 h-5 w-5" /> Sincronizando dados em tempo real...</div>
                )}

                {globalStats && groupedData.length > 0 && (
                  <div className="grid border-b-2 border-gray-300 bg-gray-200/80 sticky top-0 z-10 backdrop-blur-sm" style={{ gridTemplateColumns: gridTemplate }}>
                    <div className="p-3 pl-4 flex items-center border-r border-gray-300/50">
                      <div className="flex flex-col flex-1 min-w-0 pr-2">
                        <span className="font-black text-lg text-gray-800 uppercase tracking-tight truncate">
                          {hasActiveFilter ? 'TOTAL FILTRADO' : 'TOTAL GLOBAL'}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground/70 mt-0.5">{globalStats.totalErps} ERPs</span>
                      </div>
                      <Badge variant="outline" className={`ml-3 shrink-0 text-lg px-3 py-1 font-black shadow-md ${getBadgeStyle(getOverallAutomationPct(globalStats.stages, activeAverageStages))}`}>
                        {getOverallAutomationPct(globalStats.stages, activeAverageStages)}% AUTO
                      </Badge>
                      <div className="shrink-0 pl-2 w-[24px]"></div>
                    </div>
                    <div className="p-2 border-r border-gray-300/50"></div>
                    
                    {showProfile && (
                      <>
                        <div className="p-2 border-r border-gray-300/50"></div>
                        <div className="p-2 border-r border-gray-300/50"></div>
                        <div className="flex flex-col items-center justify-center p-2 border-r border-gray-300/50">
                          <span className="font-bold text-sm text-gray-800">{formatNumber(globalStats.avgOrders3M)}</span>
                          <span className="text-[10px] text-muted-foreground font-semibold">{formatNumber(globalStats.ordersCurrent)}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 border-r border-gray-300/50">
                          <span className="font-bold text-sm text-gray-800">{formatNumber(globalStats.avgRob3M)}</span>
                          <span className="text-[10px] text-muted-foreground font-semibold">{formatNumber(globalStats.robCurrent)}</span>
                        </div>
                      </>
                    )}

                    {globalStats.stages.map((stage: any, i: number) => {
                      const weightedPct = stage.totalOrders > 0 ? Math.round((stage.activeOrders / stage.totalOrders) * 100) : 0;
                      const metaPct = stage.totalOrders > 0 ? Math.round((stage.metaOrders / stage.totalOrders) * 100) : 0;
                      const colBg = i % 2 !== 0 ? 'bg-black/[0.04]' : '';
                      const stageActions = actionPlans.filter(p => p.etapaIdx === i);
                      
                      return (
                        <div key={i} className={`relative flex flex-col items-center justify-center border-r border-gray-300/50 last:border-r-0 h-full w-full group ${colBg}`}>
                          
                          {/* BOLINHA INDICADORA DE PLANOS DE AÇÃO */}
                          {stageActions.length > 0 && (
                            <div className="absolute top-1.5 right-1.5 z-10">
                              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-secondary text-[8px] text-white font-bold shadow-md cursor-pointer">
                                {stageActions.length}
                              </span>
                            </div>
                          )}
                          
                          {/* TOOLTIP DE AÇÕES FLUTUANTE */}
                          {stageActions.length > 0 && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-gray-800 text-white p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                              <div className="text-[10px] font-bold mb-2 border-b border-gray-600 pb-1.5 flex items-center gap-1 uppercase tracking-widest text-secondary">
                                <Target className="h-3 w-3" /> Planos de Ação ({stages[i]})
                              </div>
                              <div className="flex flex-col gap-2 mt-2">
                                {stageActions.map(act => (
                                  <div key={act.id} className="flex flex-col bg-white/10 p-2 rounded border border-white/5">
                                    <span className="text-[11px] font-bold text-white leading-tight">{act.acao}</span>
                                    <div className="flex justify-between text-[9px] text-gray-300 mt-2 font-medium">
                                      <span className="flex items-center gap-1"><User className="h-2.5 w-2.5 text-secondary"/> {act.responsavel}</span>
                                      <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5 text-secondary"/> {act.prazo.split('-').reverse().join('/')}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 border-[6px] border-transparent border-b-gray-800"></div>
                            </div>
                          )}

                          {i === 1 ? (
                            renderStage2Content(stage, weightedPct, metaPct, true)
                          ) : (
                            renderStandardStage(weightedPct, metaPct, true)
                          )}
                        </div>
                      );
                    })}
                    
                    <div className="p-2 border-r border-gray-300/50 last:border-r-0"></div>
                  </div>
                )}
                
                <div className="flex flex-col">
                  {groupedData.length === 0 && hasActiveFilter && (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground">
                      <Filter className="h-10 w-10 mb-3 opacity-20" />
                      <span className="font-bold text-lg">Nenhum resultado encontrado.</span>
                      <span className="text-sm">Tente limpar ou ajustar os filtros selecionados.</span>
                    </div>
                  )}
                  {groupedData.map((exec) => {
                    const isExecExpanded = expandedItems[exec.name] ?? hasActiveFilter;
                    
                    return (
                      <div key={exec.name} className="flex flex-col">
                        <div className="grid bg-gray-100/50 hover:bg-gray-100 cursor-pointer border-b border-gray-200" style={{ gridTemplateColumns: gridTemplate }} onClick={() => toggleItem(exec.name, isExecExpanded)}>
                          <div className="p-3 pl-4 flex items-center min-w-0 border-r border-gray-200 border-l-4 border-primary">
                            <User className="h-5 w-5 text-primary shrink-0 mr-3" />
                            <div className="flex flex-col flex-1 min-w-0 justify-center">
                              <span className="font-black text-sm text-gray-800 uppercase tracking-tight truncate" title={exec.name}>{formatName(exec.name)}</span>
                              <span className="text-[9px] font-bold text-muted-foreground/70 mt-0.5">{exec.stats.totalErps} ERPs</span>
                            </div>
                            <Badge variant="outline" className={`ml-3 text-[10px] font-black shadow-sm shrink-0 ${getBadgeStyle(getOverallAutomationPct(exec.stats.stages, activeAverageStages))}`}>
                              {getOverallAutomationPct(exec.stats.stages, activeAverageStages)}% AUTO
                            </Badge>
                            
                            <div className="ml-auto shrink-0 pl-2">{isExecExpanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</div>
                          </div>
                          <div className="p-2 border-r border-gray-200"></div>
                          
                          {showProfile && (
                            <>
                              <div className="p-2 border-r border-gray-200"></div>
                              <div className="p-2 border-r border-gray-200"></div>
                              <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200">
                                <span className="font-bold text-xs text-gray-700">{formatNumber(exec.stats.avgOrders3M)}</span>
                                <span className="text-[9px] text-muted-foreground font-semibold">{formatNumber(exec.stats.ordersCurrent)}</span>
                              </div>
                              <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200">
                                <span className="font-bold text-xs text-gray-700 truncate w-full text-center" title={formatNumber(exec.stats.avgRob3M)}>{formatNumber(exec.stats.avgRob3M)}</span>
                                <span className="text-[9px] text-muted-foreground font-semibold truncate w-full text-center" title={formatNumber(exec.stats.robCurrent)}>{formatNumber(exec.stats.robCurrent)}</span>
                              </div>
                            </>
                          )}

                          {exec.stats.stages.map((stage: any, i: number) => {
                            const weightedPct = stage.totalOrders > 0 ? Math.round((stage.activeOrders / stage.totalOrders) * 100) : 0;
                            const metaPct = stage.totalOrders > 0 ? Math.round((stage.metaOrders / stage.totalOrders) * 100) : 0;
                            const colBg = i % 2 !== 0 ? 'bg-black/[0.04]' : '';

                            return (
                              <div key={i} className={`flex flex-col items-center justify-center border-r border-gray-200 h-full w-full ${colBg}`}>
                                {i === 1 ? (
                                  renderStage2Content(stage, weightedPct, metaPct, false)
                                ) : (
                                  renderStandardStage(weightedPct, metaPct, false)
                                )}
                              </div>
                            );
                          })}
                          
                          <div className="p-2 border-r border-gray-200 last:border-r-0"></div>
                        </div>

                        {isExecExpanded && (
                          <div className="flex flex-col">
                            {groupByPortfolio && exec.portfolios.map((port: any) => {
                              const portId = `${exec.name}-${port.name}`;
                              const isPortExpanded = expandedItems[portId] ?? hasActiveFilter;
                              
                              return (
                                <div key={portId} className="flex flex-col">
                                  <div className="grid bg-white hover:bg-gray-50 cursor-pointer border-b border-gray-100" style={{ gridTemplateColumns: gridTemplate }} onClick={() => toggleItem(portId, isPortExpanded)}>
                                    <div className="p-3 border-r border-gray-100 flex items-center min-w-0" style={{ paddingLeft: '24px' }}>
                                      <div className="border-l-2 border-secondary pl-3 flex items-center w-full min-w-0">
                                        <Briefcase className="h-4 w-4 text-secondary shrink-0 mr-3" />
                                        <div className="flex flex-col flex-1 min-w-0 justify-center pr-2">
                                          <span className="font-bold text-[11px] text-gray-700 uppercase truncate" title={port.name}>{port.name}</span>
                                          <span className="text-[8px] font-bold text-muted-foreground/70 mt-0.5">{port.stats.totalErps} ERPs</span>
                                        </div>
                                        <Badge variant="outline" className={`shrink-0 text-[9px] font-bold shadow-sm ${getBadgeStyle(getOverallAutomationPct(port.stats.stages, activeAverageStages))}`}>
                                          {getOverallAutomationPct(port.stats.stages, activeAverageStages)}% AUTO
                                        </Badge>
                                        
                                        <div className="ml-auto shrink-0 pl-2">{isPortExpanded ? <ChevronUp className="h-4 w-4 text-secondary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</div>
                                      </div>
                                    </div>
                                    <div className="p-2 border-r border-gray-100"></div>
                                    
                                    {showProfile && (
                                      <>
                                        <div className="p-2 border-r border-gray-100"></div>
                                        <div className="p-2 border-r border-gray-100"></div>
                                        <div className="flex flex-col items-center justify-center p-2 border-r border-gray-100">
                                          <span className="font-bold text-xs text-gray-700">{formatNumber(port.stats.avgOrders3M)}</span>
                                          <span className="text-[9px] text-muted-foreground font-semibold">{formatNumber(port.stats.ordersCurrent)}</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-2 border-r border-gray-100">
                                          <span className="font-bold text-xs text-gray-700 truncate w-full text-center" title={formatNumber(port.stats.avgRob3M)}>{formatNumber(port.stats.avgRob3M)}</span>
                                          <span className="text-[9px] text-muted-foreground font-semibold truncate w-full text-center" title={formatNumber(port.stats.robCurrent)}>{formatNumber(port.stats.robCurrent)}</span>
                                        </div>
                                      </>
                                    )}

                                    {port.stats.stages.map((stage: any, i: number) => {
                                      const weightedPct = stage.totalOrders > 0 ? Math.round((stage.activeOrders / stage.totalOrders) * 100) : 0;
                                      const metaPct = stage.totalOrders > 0 ? Math.round((stage.metaOrders / stage.totalOrders) * 100) : 0;
                                      const colBg = i % 2 !== 0 ? 'bg-black/[0.04]' : '';

                                      return (
                                        <div key={i} className={`flex flex-col items-center justify-center border-r border-gray-100 h-full w-full ${colBg}`}>
                                          {i === 1 ? (
                                            renderStage2Content(stage, weightedPct, metaPct, false)
                                          ) : (
                                            renderStandardStage(weightedPct, metaPct, false)
                                          )}
                                        </div>
                                      );
                                    })}

                                    <div className="p-2 border-r border-gray-100 last:border-r-0"></div>
                                  </div>

                                  {isPortExpanded && (
                                    <div className="flex flex-col">
                                      {port.conglomerates.map((cong: any) => renderConglomerate(cong, portId, expandedItems, toggleItem, showProfile, hasActiveFilter, gridTemplate, false, handleUpdateSistema, handleUpdateErpSistema, obsContext, entrySystems))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {!groupByPortfolio && exec.conglomerates.map((cong: any) => 
                              renderConglomerate(cong, exec.name, expandedItems, toggleItem, showProfile, hasActiveFilter, gridTemplate, true, handleUpdateSistema, handleUpdateErpSistema, obsContext, entrySystems)
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rupturas" className="mt-0">
            {!isConfigAuthenticated ? renderPasswordScreen() : (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="shadow-sm border-l-4 border-l-amber-500">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Trabalho Manual ({periodo})</p>
                        <h3 className="text-2xl font-black text-gray-800 mt-1">{formatNumber(rupturasRanking.reduce((acc, curr) => acc + curr.trocasManual, 0))} <span className="text-sm font-medium text-gray-500">trocas</span></h3>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-full"><Activity className="h-5 w-5 text-amber-500" /></div>
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm border-l-4 border-l-primary">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pedidos Afetados ({periodo})</p>
                        <h3 className="text-2xl font-black text-gray-800 mt-1">{formatNumber(rupturasRanking.reduce((acc, curr) => acc + curr.pedidosRuptura, 0))} <span className="text-sm font-medium text-gray-500">pedidos</span></h3>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-full"><AlertTriangle className="h-5 w-5 text-primary" /></div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-l-4 border-l-secondary">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Eficiência do Sistema</p>
                        <h3 className="text-2xl font-black text-gray-800 mt-1">
                          {(() => {
                            const tManual = rupturasRanking.reduce((acc, curr) => acc + curr.trocasManual, 0);
                            const tAuto = rupturasRanking.reduce((acc, curr) => acc + curr.trocasAuto, 0);
                            const total = tManual + tAuto;
                            return total > 0 ? `${Math.round((tAuto / total) * 100)}%` : '0%';
                          })()}
                          <span className="text-sm font-medium text-gray-500 ml-1">Automático</span>
                        </h3>
                      </div>
                      <div className="p-3 bg-secondary/10 rounded-full"><Cpu className="h-5 w-5 text-secondary" /></div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="shadow-lg border-primary/20 border-t-4 border-t-primary bg-white">
                  <CardHeader className="bg-white border-b px-6 py-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
                        <TrendingDown className="h-6 w-6 text-primary" /> Ranking de Ofensores (Esforço Manual)
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Clientes ordenados pela quantidade de trocas feitas manualmente nos últimos {periodo.replace('D', ' dias')}.</p>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-muted-foreground uppercase bg-gray-50/80 border-b">
                          <tr>
                            <th className="px-6 py-3 font-bold">Hierarquia</th>
                            <th className="px-6 py-3 font-bold">Cliente</th>
                            <th className="px-6 py-3 font-bold text-center">Vol. Pedidos ({periodo})</th>
                            <th className="px-6 py-3 font-bold text-center">Ped. c/ Ruptura</th>
                            <th className="px-6 py-3 font-bold text-center text-primary">Trocas Sistema</th>
                            <th className="px-6 py-3 font-bold text-center text-amber-600 bg-amber-50/50">Trocas Manuais</th>
                            <th className="px-6 py-3 font-bold text-center">% Esforço Manual</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rupturasRanking.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                Nenhuma ruptura encontrada para os filtros atuais ou as rupturas estão marcadas como Exceção.
                              </td>
                            </tr>
                          ) : (
                            rupturasRanking.map((row: any, idx: number) => (
                              <tr key={`${row.erpCode}-${idx}`} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-500 font-medium">
                                  {formatName(row.executivo)}
                                </td>
                                <td className="px-6 py-3 max-w-[200px] truncate" title={row.cliente}>
                                  <span className="font-bold text-gray-800">{row.cliente}</span>
                                  <span className="block text-[10px] text-primary font-mono mt-0.5">{row.erpCode}</span>
                                </td>
                                <td className="px-6 py-3 text-center font-semibold text-gray-600">
                                  {formatNumber(row.pedidosTotal)}
                                </td>
                                <td className="px-6 py-3 text-center">
                                  <div className="flex flex-col items-center justify-center">
                                    <span className="font-bold text-gray-800">{formatNumber(row.pedidosRuptura)}</span>
                                    <span className="text-[9px] text-muted-foreground font-semibold">{row.pctRuptura}% da base</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-center font-bold text-primary">
                                  {formatNumber(row.trocasAuto)}
                                </td>
                                <td className="px-6 py-3 text-center font-black text-amber-600 bg-amber-50/20 text-lg">
                                  {formatNumber(row.trocasManual)}
                                </td>
                                <td className="px-6 py-3 text-center">
                                  <Badge variant="outline" className={`text-[10px] font-bold ${row.pctManual >= 50 ? 'bg-red-50 text-red-600 border-red-200' : row.pctManual > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                    {row.pctManual}% MANUAL
                                  </Badge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="historico" className="mt-0">
            {!isConfigAuthenticated ? renderPasswordScreen() : (
              <Card className="shadow-lg border-primary/20 border-t-4 border-t-primary bg-white">
                <CardHeader className="bg-white border-b px-6 py-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
                      <Activity className="h-6 w-6 text-primary" /> Auditoria e Linha do Tempo
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Registra automaticamente quando um cliente perde ou ganha configurações de automação via ERP.</p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5 bg-gray-50 border rounded-md px-2 py-1 shadow-sm">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-1">Visão:</span>
                      <Button variant={logGroupMode === 'executivo' ? "default" : "outline"} size="sm" className="h-6 px-3 text-[10px]" onClick={() => setLogGroupMode('executivo')}>Por Executivo</Button>
                      <Button variant={logGroupMode === 'cliente' ? "default" : "outline"} size="sm" className="h-6 px-3 text-[10px]" onClick={() => setLogGroupMode('cliente')}>Por Cliente</Button>
                      <Button variant={logGroupMode === 'data' ? "default" : "outline"} size="sm" className="h-6 px-3 text-[10px]" onClick={() => setLogGroupMode('data')}>Por Data</Button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-6 px-3 text-[9px] uppercase tracking-wider" onClick={expandAllLogs}>Expandir Tudo</Button>
                      <Button variant="outline" size="sm" className="h-6 px-3 text-[9px] uppercase tracking-wider" onClick={collapseAllLogs}>Recolher Tudo</Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 bg-gray-50/30">
                  {isLoadingLogs ? (
                    <div className="py-12 text-center text-muted-foreground animate-pulse flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin h-6 w-6" /> Carregando histórico...
                    </div>
                  ) : groupedAndFilteredLogs.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center border bg-white rounded-lg shadow-sm">
                      <History className="h-10 w-10 mb-3 opacity-20" />
                      Nenhuma mudança de automação encontrada para os filtros selecionados.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groupedAndFilteredLogs.map((l1Group) => {
                        const isL1Expanded = expandedLogs[`l1-${l1Group.name}`];
                        
                        const totalUpgradesL1 = l1Group.subgroups.reduce((acc, sub) => acc + sub.logs.filter((log: any) => log.tipo === "UPGRADE").length, 0);
                        const totalDowngradesL1 = l1Group.subgroups.reduce((acc, sub) => acc + sub.logs.filter((log: any) => log.tipo === "DOWNGRADE").length, 0);

                        return (
                          <div key={l1Group.name} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <div onClick={() => toggleLogItem(`l1-${l1Group.name}`, isL1Expanded)} className="bg-gray-100 hover:bg-gray-200 cursor-pointer p-3 font-bold text-sm text-gray-800 flex items-center justify-between border-l-4 border-primary transition-colors">
                              <div className="flex items-center gap-2">
                                {getL1Icon()} {logGroupMode === 'executivo' ? formatName(l1Group.name) : l1Group.name}
                              </div>
                              <div className="flex items-center gap-2">
                                {totalUpgradesL1 > 0 && (
                                  <Badge variant="outline" className="text-[10px] font-mono bg-green-50 text-green-600 border-green-200 gap-1 px-1.5 shadow-sm" title={`${totalUpgradesL1} automações ganhas`}>
                                    <ArrowUpRight className="h-3 w-3" /> {totalUpgradesL1}
                                  </Badge>
                                )}
                                {totalDowngradesL1 > 0 && (
                                  <Badge variant="outline" className="text-[10px] font-mono bg-red-50 text-red-600 border-red-200 gap-1 px-1.5 shadow-sm" title={`${totalDowngradesL1} automações perdidas`}>
                                    <ArrowDownRight className="h-3 w-3" /> {totalDowngradesL1}
                                  </Badge>
                                )}
                                {isL1Expanded ? <ChevronUp className="h-4 w-4 text-primary ml-1" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />}
                              </div>
                            </div>
                            
                            {isL1Expanded && (
                              <div className="flex flex-col">
                                {l1Group.subgroups.map((l2Group) => {
                                  const isL2Expanded = expandedLogs[`l2-${l1Group.name}-${l2Group.name}`];
                                  
                                  const totalUpgradesL2 = l2Group.logs.filter((log: any) => log.tipo === "UPGRADE").length;
                                  const totalDowngradesL2 = l2Group.logs.filter((log: any) => log.tipo === "DOWNGRADE").length;

                                  return (
                                    <div key={l2Group.name} className="border-t border-gray-100">
                                      <div onClick={() => toggleLogItem(`l2-${l1Group.name}-${l2Group.name}`, isL2Expanded)} className="bg-gray-50/80 hover:bg-gray-100 cursor-pointer p-2 pl-8 text-xs font-bold text-gray-700 flex items-center justify-between transition-colors">
                                        <div className="flex items-center gap-2">
                                          {getL2Icon()} {logGroupMode === 'data' ? formatName(l2Group.name) : l2Group.name}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="flex gap-2">
                                            {totalUpgradesL2 > 0 && <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3"/>{totalUpgradesL2}</span>}
                                            {totalDowngradesL2 > 0 && <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5"><ArrowDownRight className="h-3 w-3"/>{totalDowngradesL2}</span>}
                                          </div>
                                          {isL2Expanded ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                        </div>
                                      </div>

                                      {isL2Expanded && (
                                        <div className="overflow-x-auto bg-white border-t border-gray-100">
                                          <table className="w-full text-sm text-left">
                                            <thead className="text-[9px] text-muted-foreground uppercase bg-white border-b">
                                              <tr>
                                                <th className="px-8 py-2 font-bold">Data / Hora</th>
                                                <th className="px-6 py-2 font-bold">Cód. ERP</th>
                                                <th className="px-6 py-2 font-bold text-center">Perfil</th>
                                                <th className="px-6 py-2 font-bold">Etapa Alterada</th>
                                                <th className="px-6 py-2 font-bold text-center">Status Anterior</th>
                                                <th className="px-6 py-2 font-bold text-center">Novo Status</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {l2Group.logs.map((log: any) => {
                                                const isUpgrade = log.tipo === "UPGRADE";
                                                return (
                                                  <tr key={log.id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                                                    <td className="px-8 py-3 whitespace-nowrap text-xs text-gray-600 font-mono">
                                                      {log.dateStr} <span className="text-[10px] text-gray-400 ml-1">{new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(log.dateObj)}</span>
                                                    </td>
                                                    <td className="px-6 py-3 font-mono text-[11px] text-primary font-bold">
                                                      {log.erpCode}
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                      {log.perfilReal === "SLA" ? (
                                                        <div className="flex items-center justify-center gap-1 text-blue-500 font-bold text-[9px] uppercase tracking-wider">
                                                          <Target className="h-3 w-3" /> SLA
                                                        </div>
                                                      ) : log.perfilReal === "JANELA" ? (
                                                        <div className="flex items-center justify-center gap-1 text-amber-500 font-bold text-[9px] uppercase tracking-wider">
                                                          <Clock className="h-3 w-3" /> JANELA
                                                        </div>
                                                      ) : (
                                                        <span className="text-[9px] text-gray-400 font-bold">N/D</span> 
                                                      )}
                                                    </td>
                                                    <td className="px-6 py-3 font-bold text-xs text-gray-700">
                                                      {log.campo}
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                      <span className="text-[9px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded border">
                                                        {log.de}
                                                      </span>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                      <div className="flex items-center justify-center">
                                                        {isUpgrade ? (
                                                          <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-secondary bg-secondary/10 px-2 py-1 rounded border border-secondary/20 tracking-wider">
                                                            <ArrowUpRight className="h-3 w-3" /> {log.para}
                                                          </div>
                                                        ) : (
                                                          <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 tracking-wider">
                                                            <ArrowDownRight className="h-3 w-3" /> {log.para}
                                                          </div>
                                                        )}
                                                      </div>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
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
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="configuracao" className="mt-0">
            {!isConfigAuthenticated ? renderPasswordScreen() : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500 pb-12">
                <Card className="shadow-lg border-primary/20">
                  <CardHeader className="bg-primary text-white rounded-t-lg">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <FileSpreadsheet className="h-6 w-6" /> Mapeamento Excel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 bg-muted/5 relative flex flex-col items-center justify-center text-center hover:bg-muted/10 transition-colors">
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
                          <CheckCircle2 className="h-10 w-10 text-secondary mb-3" />
                          <h3 className="font-bold">{selectedFile.name}</h3>
                          <div className="flex gap-2 mt-4 relative z-20">
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
                          <p className="text-xs text-muted-foreground mt-2">Clique ou arraste seu arquivo .xlsx aqui.</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">Lê a Coluna C (Conglomerado), Coluna E (ERPs) e Coluna F (Sistema de Entrada).</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-primary/20">
                  <CardHeader className="bg-white border-b px-6 py-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
                        <Target className="h-6 w-6 text-primary" /> Cálculo da Média Global
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Selecione quais etapas devem compor o Índice de Automação (Média %) dos painéis.</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {stages.map((label, idx) => (
                        <label key={idx} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${activeAverageStages.includes(idx) ? 'bg-primary/5 border-primary/30' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                          <input
                            type="checkbox"
                            className="accent-primary h-4 w-4 cursor-pointer"
                            checked={activeAverageStages.includes(idx)}
                            onChange={() => toggleAverageStage(idx)}
                            disabled={activeAverageStages.length === 1 && activeAverageStages.includes(idx)}
                          />
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold ${activeAverageStages.includes(idx) ? 'text-primary' : 'text-gray-600'}`}>Etapa {idx + 1}</span>
                            <span className="text-[10px] text-muted-foreground">{label}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-primary/20 lg:col-span-2">
                  <CardHeader className="bg-white border-b px-6 py-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
                        <Target className="h-6 w-6 text-primary" /> Planos de Ação por Etapa
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Cadastre ações em andamento para alavancar a automação. Elas aparecerão como dicas (tooltips) na linha de Total Global.</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Etapa Afetada</label>
                        <select value={apEtapa} onChange={e => setApEtapa(e.target.value)} className="w-full text-xs border border-gray-300 rounded-md px-3 h-9 outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white cursor-pointer font-medium text-gray-700 shadow-sm">
                          {stages.map((s, i) => <option key={i} value={i}>Etapa {i+1}: {s}</option>)}
                        </select>
                      </div>
                      <div className="flex-[2] space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ação em Andamento</label>
                        <input type="text" value={apAcao} onChange={e => setApAcao(e.target.value)} placeholder="Ex: Mapeamento da nova API de pedidos..." className="w-full text-xs border border-gray-300 rounded-md px-3 h-9 outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium text-gray-700 shadow-sm" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Responsável</label>
                        <input type="text" value={apResp} onChange={e => setApResp(e.target.value)} placeholder="Ex: João Silva" className="w-full text-xs border border-gray-300 rounded-md px-3 h-9 outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium text-gray-700 shadow-sm" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Prazo Estimado</label>
                        <input type="date" value={apPrazo} onChange={e => setApPrazo(e.target.value)} className="w-full text-xs border border-gray-300 rounded-md px-3 h-9 outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white font-medium text-gray-700 shadow-sm cursor-pointer" />
                      </div>
                      <div className="flex items-end">
                        <Button size="sm" className="h-9 w-full md:w-auto px-6 text-xs font-bold shadow-sm" onClick={handleAddActionPlan}>Adicionar Plano</Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {actionPlans.length === 0 && <div className="text-sm text-muted-foreground italic col-span-full py-4 text-center">Nenhuma ação em andamento cadastrada até o momento.</div>}
                      {actionPlans.map(act => (
                        <div key={act.id} className="border border-gray-200 rounded-xl p-4 relative group hover:border-primary/50 transition-colors bg-white shadow-sm hover:shadow-md">
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={() => removeActionPlan(act.id)} title="Excluir Plano">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <Badge variant="outline" className="text-[9px] mb-3 bg-gray-50/80 text-gray-600 border-gray-200 shadow-none font-bold uppercase tracking-widest px-2 py-0.5">Etapa {act.etapaIdx + 1}</Badge>
                          <p className="text-sm font-black text-gray-800 leading-tight mb-4 pr-6">{act.acao}</p>
                          <div className="flex flex-col gap-1.5 border-t pt-3">
                            <div className="flex justify-between items-center text-[11px] text-gray-600 font-medium">
                              <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-primary" /> Responsável:</span>
                              <span className="font-bold text-gray-800">{act.responsavel}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] text-gray-600 font-medium">
                              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-primary" /> Prazo:</span>
                              <span className="font-bold text-gray-800">{act.prazo.split('-').reverse().join('/')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-primary/20">
                  <CardHeader className="bg-white border-b px-6 py-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
                        <Database className="h-6 w-6 text-primary" /> Sistemas de Entrada (Etapa 1)
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Gerencie quais ferramentas são aceitas e se são consideradas Automáticas ou Manuais.</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
                        {Object.entries(entrySystems).sort().map(([name, isAuto]) => (
                          <div key={name} className="flex items-center justify-between p-2 bg-gray-50 border rounded-md group">
                            <span className="text-sm font-medium text-gray-700">{name}</span>
                            <div className="flex items-center gap-3">
                              <Button 
                                variant={isAuto ? "default" : "outline"} 
                                size="sm" 
                                className="h-7 text-[10px] uppercase font-bold"
                                onClick={() => updateEntrySystem(name, !isAuto)}
                              >
                                {isAuto ? "Automático" : "Manual"}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeEntrySystem(name)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t flex gap-2">
                        <input 
                          id="newSystemName"
                          type="text" 
                          placeholder="Nome do novo sistema..."
                          className="flex-1 text-sm border rounded-md px-3 h-9 outline-none focus:ring-1 focus:ring-primary"
                        />
                        <Button size="sm" onClick={() => {
                          const input = document.getElementById('newSystemName') as HTMLInputElement;
                          if (input.value.trim()) {
                            updateEntrySystem(input.value.trim(), false);
                            input.value = "";
                          }
                        }}>
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-primary/20">
                  <CardHeader className="bg-gray-800 text-white rounded-t-lg flex flex-row items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Server className="h-6 w-6" /> Automação & IIS
                    </CardTitle>
                    <Badge variant="outline" className="bg-white/10 text-white border-none shadow-none font-mono text-[10px] flex items-center gap-1.5 opacity-80">
                      <Database className="h-3 w-3" /> Base: {projectId}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/20 border rounded-lg">
                        <h4 className="font-bold text-sm flex items-center gap-2 mb-2">
                          <Terminal className="h-4 w-4 text-primary" /> Tarefa PowerShell (Sincronização)
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          O script varre a base SQL e preenche o painel. A configuração manual da Etapa 1 (Sistemas) não é perdida, pois fica gravada na tabela de mapeamento no Firebase.
                        </p>
                      </div>

                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <h4 className="font-bold text-sm flex items-center gap-2 mb-2">
                          <Code className="h-4 w-4 text-primary" /> Deploy no IIS
                        </h4>
                        <ol className="text-xs space-y-1 list-decimal ml-4 text-muted-foreground">
                          <li>Instale Node.js e URL Rewrite no Windows Server.</li>
                          <li>Rode <code className="bg-muted px-1 rounded text-primary">npm run build</code> localmente.</li>
                          <li>O IIS vai gerenciar as rotas da aplicação perfeitamente.</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="documentacao" className="mt-0">
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
              
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <BookOpen className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-800">Guia de Uso do Painel</h2>
                    <p className="text-muted-foreground mt-1">Entenda como ler, interpretar e utilizar os indicadores de automação.</p>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none text-gray-700">
                  <p>
                    Este Dashboard foi desenhado para medir a eficiência da jornada do pedido de ponta a ponta. 
                    Ele responde a uma pergunta simples: <strong>Qual a porcentagem do nosso esforço que é resolvido automaticamente por sistemas?</strong>
                  </p>
                  <p>
                    O painel utiliza a métrica de <strong>"Pedidos Atendidos"</strong> como peso (ou "Trocas", no caso de Rupturas) para garantir que clientes muito grandes puxem a média da automação mais do que clientes pequenos, refletindo o esforço real da operação.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-sm">
                  <CardHeader className="bg-gray-50 border-b pb-4">
                    <CardTitle className="text-lg flex items-center gap-2"><Info className="h-5 w-5 text-muted-foreground"/> A Regra de Cores</CardTitle>
                    <CardDescription>Como ler os termômetros de automação visualmente.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-3 rounded-full bg-secondary shrink-0"></div>
                      <p className="text-sm"><strong className="text-secondary">Verde (&ge; 95% da Meta):</strong> Operação excelente. A automação está a cumprir com a meta expectável para a carteira.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-3 rounded-full bg-amber-500 shrink-0"></div>
                      <p className="text-sm"><strong className="text-amber-600">Amarelo (&ge; 80% da Meta):</strong> Atenção. O nível de automação está marginalmente abaixo do ideal e exige monitorização.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-3 rounded-full bg-gray-900 shrink-0"></div>
                      <p className="text-sm"><strong className="text-gray-900">Preto (Abaixo de 80% da Meta):</strong> Crítico. O esforço manual está muito alto em relação ao possível e requer um plano de ação imediato.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="bg-gray-50 border-b pb-4">
                    <CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5 text-muted-foreground"/> Períodos Analisados</CardTitle>
                    <CardDescription>Qual é a janela de tempo que alimenta a tela?</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ul className="space-y-3 text-sm text-gray-700 list-disc ml-4">
                      <li>
                        A coluna de <strong>Pedidos</strong> exibe o número grande correspondente à Média Mensal dos <strong className="text-black">Últimos 30 Dias</strong>. O número menor abaixo é a quantidade faturada no Mês Atual em curso.
                      </li>
                      <li>
                        A coluna de <strong>ROB</strong> segue a mesma lógica matemática: Média dos últimos 30 dias no topo, Mês atual embaixo.
                      </li>
                      <li>
                        As <strong>Trocas e Rupturas (Etapa 2)</strong> contam as ocorrências exatas registadas também nos últimos 30 dias, para manter o peso alinhado com a média de pedidos.
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm">
                <CardHeader className="bg-gray-50 border-b pb-4">
                  <CardTitle className="text-lg flex items-center gap-2"><Layers className="h-5 w-5 text-muted-foreground"/> Dicionário das 6 Etapas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 divide-y">
                    
                    <div className="p-6 flex flex-col md:flex-row gap-6">
                      <div className="md:w-1/4 shrink-0">
                        <div className="bg-primary text-white font-bold text-xs uppercase px-3 py-1 inline-block rounded-md mb-2">Etapa 1</div>
                        <h4 className="font-bold text-gray-800">Entrada de Pedidos</h4>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Mede a porta de entrada da operação. Se o pedido entra via <em>Supply Manager</em>, <em>Webservice</em>, <em>API</em> ou <em>Leitura IA</em>, consideramos Automático. Se for inserção manual clássica, fica 0%.</p>
                        <p className="mt-2 text-xs bg-gray-50 p-2 rounded border border-gray-200"><HelpCircle className="h-3 w-3 inline mr-1"/> Esta etapa permite a alteração manual da ferramenta utilizada direto no painel, caso não herde do conglomerado.</p>
                      </div>
                    </div>

                    <div className="p-6 flex flex-col md:flex-row gap-6 bg-amber-50/20">
                      <div className="md:w-1/4 shrink-0">
                        <div className="bg-primary text-white font-bold text-xs uppercase px-3 py-1 inline-block rounded-md mb-2">Etapa 2</div>
                        <h4 className="font-bold text-gray-800">Tratamento de Rupturas</h4>
                      </div>
                      <div className="text-sm text-gray-600 space-y-2">
                        <p><strong>A Matemática (% AUTO):</strong> Pondera o volume de pedidos dos clientes que Aceitam Troca Automática em relação à carteira. Expandindo a linha do cliente, você visualiza o histórico de trocas automáticas vs manuais.</p>
                        <p><strong>O Problema Base (% COM RUPTURA):</strong> É o número pequeno cinza. Ele divide a quantidade de pedidos que sofreram ruptura pela média total de pedidos do cliente. Serve para indicar se o problema afeta a base toda ou apenas uma fatia pequena.</p>
                      </div>
                    </div>

                    <div className="p-6 flex flex-col md:flex-row gap-6">
                      <div className="md:w-1/4 shrink-0">
                        <div className="bg-primary text-white font-bold text-xs uppercase px-3 py-1 inline-block rounded-md mb-2">Etapa 3 a 6</div>
                        <h4 className="font-bold text-gray-800">Cubo de Automações</h4>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Estas etapas lêem as flags sistémicas ativas para os ERPs:</p>
                        <ul className="list-disc ml-4 mt-2 space-y-1">
                          <li><strong>Programação de Entrega:</strong> Depende do cruzamento do Perfil de Atendimento (SLA vs Janela) com as flags ativas no SQL.</li>
                          <li><strong>Geração de OV:</strong> Lê a flag de "Gera OV Automático" no cadastro do cliente.</li>
                          <li><strong>Liberação de Pedidos:</strong> Lê a flag de "Liberação Automática".</li>
                          <li><strong>Ocorrências:</strong> Etapa reservada para futuro mapeamento de tracking logístico.</li>
                        </ul>
                      </div>
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

function renderConglomerate(cong: any, parentId: string, expandedItems: any, toggleItem: any, showProfile: boolean, hasActiveFilter: boolean, gridTemplate: string, isFlat: boolean = false, handleUpdateSistema: any, handleUpdateErpSistema: any, obsContext: any, entrySystems: Record<string, boolean>) {
  const congId = `${parentId}-${cong.name}`;
  const isCongExpanded = expandedItems[congId] ?? hasActiveFilter;
  const congPad = isFlat ? '24px' : '48px';
  const erpPad = isFlat ? '48px' : '72px';
  const congBorder = isFlat ? 'border-secondary' : 'border-gray-300';

  const handleToggleObs = (erpCode: string) => {
    const isOpening = !obsContext.expandedObs[erpCode];
    obsContext.setExpandedObs((prev: any) => ({ ...prev, [erpCode]: isOpening }));
    if (isOpening) { 
        obsContext.setObsMode((prev: any) => ({ ...prev, [erpCode]: 'view' }));
    }
  };

  const handleAction = (erpCode: string, action: 'view' | 'edit') => {
      if (action === 'edit') {
          if (obsContext.isConfigAuthenticated) {
              obsContext.setObsMode((prev: any) => ({ ...prev, [erpCode]: 'edit' }));
          } else {
              obsContext.setObsMode((prev: any) => ({ ...prev, [erpCode]: 'auth' }));
          }
      } else {
          obsContext.setObsMode((prev: any) => ({ ...prev, [erpCode]: 'view' }));
      }
  };

  const handleAuth = (erpCode: string) => {
      if (obsContext.obsPassword === SENHA_ADMIN) {
          obsContext.setIsConfigAuthenticated(true);
          obsContext.setObsPassword("");
          obsContext.setObsError(false);
          obsContext.setObsMode((prev: any) => ({ ...prev, [erpCode]: 'edit' }));
      } else {
          obsContext.setObsError(true);
      }
  };

  return (
    <div key={congId} className="flex flex-col">
      <div className="grid bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-100" style={{ gridTemplateColumns: gridTemplate }} onClick={() => toggleItem(congId, isCongExpanded)}>
        
        <div className="p-3 border-r border-gray-200 flex items-center min-w-0" style={{ paddingLeft: congPad }}>
          <div className={`border-l-2 ${congBorder} pl-3 flex items-center gap-3 w-full min-w-0`}>
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col flex-1 min-w-0 justify-center pr-2">
              <span className="font-bold text-[10px] text-gray-600 uppercase truncate" title={cong.name}>{cong.name}</span>
              <span className="text-[8px] font-bold text-muted-foreground/70 mt-0.5">{cong.stats.totalErps} ERPs</span>
            </div>
            <Badge variant="outline" className={`shrink-0 text-[9px] font-bold shadow-sm ${getBadgeStyle(getOverallAutomationPct(cong.stats.stages, obsContext.activeAverageStages || [0,1,2,3,4,5]))}`}>
              {getOverallAutomationPct(cong.stats.stages, obsContext.activeAverageStages || [0,1,2,3,4,5])}% AUTO
            </Badge>
            <div className="shrink-0">{isCongExpanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</div>
          </div>
        </div>
        <div className="p-2 border-r border-gray-200"></div>

        {showProfile && (
          <>
            <div className="p-2 border-r border-gray-200"></div>
            <div className="p-2 border-r border-gray-200"></div>
            <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200">
              <span className="font-bold text-xs text-gray-700">{formatNumber(cong.stats.avgOrders3M)}</span>
              <span className="text-[9px] text-muted-foreground font-semibold">{formatNumber(cong.stats.ordersCurrent)}</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 border-r border-gray-200">
              <span className="font-bold text-xs text-gray-700 truncate w-full text-center" title={formatNumber(cong.stats.avgRob3M)}>{formatNumber(cong.stats.avgRob3M)}</span>
              <span className="text-[9px] text-muted-foreground font-semibold truncate w-full text-center" title={formatNumber(cong.stats.robCurrent)}>{formatNumber(cong.stats.robCurrent)}</span>
            </div>
          </>
        )}

        {cong.stats.stages.map((stage: any, i: number) => {
          const weightedPct = stage.totalOrders > 0 ? Math.round((stage.activeOrders / stage.totalOrders) * 100) : 0;
          const metaPct = stage.totalOrders > 0 ? Math.round((stage.metaOrders / stage.totalOrders) * 100) : 0;
          const colBg = i % 2 !== 0 ? 'bg-black/[0.04]' : '';
          
          return (
            <div key={i} className={`relative flex flex-col items-center justify-center border-r border-gray-200 h-full w-full ${colBg}`}>
              {i === 1 ? (
                renderStage2Content(stage, weightedPct, metaPct, false)
              ) : (
                <>
                  {renderStandardStage(weightedPct, metaPct, false)}
                  {i === 0 && (
                    <select
                      onClick={(e) => e.stopPropagation()} 
                      onChange={(e) => handleUpdateSistema(cong.id, e.target.value)} 
                      value={cong.sistemaEntrada || ""}
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] max-w-[80px] w-full bg-transparent outline-none cursor-pointer text-muted-foreground/80 hover:text-primary transition-colors border-b border-dashed border-transparent hover:border-primary text-center appearance-none truncate"
                      title="Alterar Sistema Padrão"
                    >
                      <option value="" className="text-gray-400 font-normal">
                        {cong.predominantSystem ? `Maioria: ${cong.predominantSystem}` : 'Não Definido'}
                      </option>
                      {Object.keys(entrySystems).sort().map(sys => (
                        <option key={sys} value={sys}>{sys}</option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </div>
          );
        })}
        
        <div className="p-2 border-r border-gray-200 last:border-r-0"></div>
      </div>

      {isCongExpanded && (
        <div className="flex flex-col">
          {cong.erps.map((erp: any, j: number) => {
            const isAtivo = erp.isAtivo;
            const isExpanded = obsContext.expandedObs[erp.code];
            const mode = obsContext.obsMode[erp.code] || 'view';
            const hasObs = !!erp.observacao;

            return (
              <React.Fragment key={j}>
                <div className={`grid border-b border-gray-100 transition-colors ${isAtivo ? 'bg-white hover:bg-primary/5' : 'bg-gray-100/50 opacity-60 grayscale'}`} style={{ gridTemplateColumns: gridTemplate }}>
                  
                  <div className="p-3 border-r bg-gray-50/10 flex items-center min-w-0" style={{ paddingLeft: erpPad }}>
                    <div className="border-l-2 border-gray-200 pl-3 flex items-center gap-2 w-full min-w-0">
                      <Cpu className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div className="flex flex-col truncate flex-1">
                        <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Cód. ERP Mãe</span>
                        <span className="text-[11px] font-bold text-primary truncate" title={erp.code}>{erp.code}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 border-r flex flex-col items-center justify-center bg-gray-50/20">
                    {(() => {
                      const isSLA = String(erp.metric?.utilizaJanela).toUpperCase() === "NAO";
                      const profileLabel = isSLA ? "SLA" : "JANELA";
                      const ProfileIcon = isSLA ? Target : Clock;
                      const colorClass = isSLA ? "text-blue-500" : "text-amber-500";
                      return (
                        <div className="flex items-center gap-1.5" title={`Atendimento: ${profileLabel}`}>
                          <ProfileIcon className={`h-3.5 w-3.5 ${colorClass} shrink-0`} />
                          {showProfile && <span className={`text-[8px] font-black uppercase whitespace-nowrap ${colorClass}`}>{profileLabel}</span>}
                        </div>
                      );
                    })()}
                  </div>

                  {showProfile && (
                    <>
                      <div className="p-2 border-r bg-gray-50/10 flex flex-col items-center justify-center overflow-hidden">
                        {(() => {
                          const isEnd = erp.metric?.multiCdEnderecos === "SIM" || erp.metric?.multiCdEnderecos === "TRUE" || erp.metric?.multiCdEnderecos === "1" || erp.metric?.multiCdEnderecos === true;
                          const isManual = erp.metric?.fatMultiCD === "SIM" || erp.metric?.fatMultiCD === "TRUE" || erp.metric?.fatMultiCD === "1" || erp.metric?.fatMultiCD === true;
                          
                          if (isEnd) return <Badge variant="outline" className="text-[8px] border-purple-200 text-purple-700 bg-purple-50 px-1 py-0 h-4 whitespace-nowrap">Multi CD | Automático</Badge>;
                          if (isManual) return <Badge variant="outline" className="text-[8px] border-indigo-200 text-indigo-700 bg-indigo-50 px-1 py-0 h-4 whitespace-nowrap">Multi CD Pedido | Manual</Badge>;
                          
                          return <span className="text-[8px] text-muted-foreground/50 font-semibold whitespace-nowrap">Não é Multi CD</span>;
                        })()}
                      </div>

                      <div className="p-2 border-r bg-gray-50/10 flex flex-col items-center justify-center overflow-hidden">
                        {(() => {
                          const exigeOC = erp.metric?.naoLiberarPedidoSemOC === "SIM" || erp.metric?.naoLiberarPedidoSemOC === "TRUE" || erp.metric?.naoLiberarPedidoSemOC === "1";
                          if (exigeOC) return <Badge variant="outline" className="text-[8px] border-amber-500 text-amber-600 bg-amber-50 px-1 py-0 h-4 whitespace-nowrap" title="Exige Ordem de Compra para liberar">Precisa de OC</Badge>;
                          return <span className="text-[8px] text-muted-foreground/50 font-semibold whitespace-nowrap" title="Não exige Ordem de Compra">Livre (Sem OC)</span>;
                        })()}
                      </div>

                      <div className="p-2 border-r bg-gray-50/10 flex flex-col items-center justify-center">
                        <span className="font-bold text-[11px] text-gray-700">{formatNumber(erp.metric?.avgOrders3M || 0)}</span>
                        <span className="text-[8px] text-muted-foreground">{formatNumber(erp.metric?.ordersCurrent || 0)}</span>
                      </div>
                      <div className="p-2 border-r bg-gray-50/10 flex flex-col items-center justify-center">
                        <span className="font-bold text-[11px] text-gray-700 truncate w-full text-center" title={formatNumber(erp.metric?.avgRob3M || 0)}>{formatNumber(erp.metric?.avgRob3M || 0)}</span>
                        <span className="text-[8px] text-muted-foreground truncate w-full text-center" title={formatNumber(erp.metric?.robCurrent || 0)}>{formatNumber(erp.metric?.robCurrent || 0)}</span>
                      </div>
                    </>
                  )}

                  {!isAtivo ? (
                    <div style={{ gridColumn: showProfile ? '7 / -1' : '3 / -1' }} className="p-3 flex items-center justify-center bg-gray-50/30">
                      <div className="flex items-center gap-2 text-red-500 font-bold text-[10px] uppercase bg-red-50 px-3 py-1 rounded-full">
                        <AlertCircle className="h-3 w-3" /> Inativo na Carteira
                      </div>
                    </div>
                  ) : (
                    <>
                      {[1, 2, 3, 4, 5, 6].map((step) => {
                        const i = step - 1;
                        const isException = erp.stats.stages[i].isException;
                        const colBg = i % 2 !== 0 ? 'bg-black/[0.04]' : '';

                        let isStepActive = false;
                        let titleText = "MANUAL";
                        let percentage = 0;
                        let statusText = "MANUAL";
                        
                        if (step === 1) {
                          isStepActive = erp.isEtapa1Auto;
                          titleText = erp.sistemaFinal || "Não Definido";
                          percentage = isStepActive ? 100 : 0;
                          statusText = isStepActive ? "AUTOMÁTICO" : "MANUAL";
                        } else if (step === 2) {
                          const aceitaTroca = erp.metric?.trocaAutomatica !== "NAO";
                          isStepActive = aceitaTroca;
                          percentage = isStepActive ? 100 : 0;
                          statusText = isStepActive ? "AUTOMÁTICO" : "MANUAL";
                          titleText = "Configuração do Cliente";
                        } else if (step === 3) {
                          isStepActive = erp.metric?.etapa2Ativo;
                          percentage = isStepActive ? 100 : 0;
                          statusText = isStepActive ? "AUTOMÁTICO" : "MANUAL";
                          titleText = statusText;
                        } else if (step === 4) {
                          isStepActive = erp.metric?.flagGeraOVAuto;
                          percentage = isStepActive ? 100 : 0;
                          statusText = isStepActive ? "AUTOMÁTICO" : "MANUAL";
                          titleText = statusText;
                        } else if (step === 5) {
                          isStepActive = erp.metric?.etapa3Ativo;
                          percentage = isStepActive ? 100 : 0;
                          statusText = isStepActive ? "AUTOMÁTICO" : "MANUAL";
                          titleText = statusText;
                        } else if (step === 6) {
                          isStepActive = false;
                          percentage = isStepActive ? 100 : 0;
                          statusText = isStepActive ? "AUTOMÁTICO" : "MANUAL";
                          titleText = statusText;
                        }

                        let barColor = 'bg-gray-800 dark:bg-gray-200'; 
                        if (percentage >= 95) barColor = 'bg-secondary';
                        else if (percentage >= 80) barColor = 'bg-amber-500';
                        
                        if (step === 2) {
                          return (
                            <div key={step} className={`flex flex-col items-center justify-center border-r h-full w-full ${colBg}`}>
                              {isException ? (
                                <div className="flex flex-col items-center justify-center py-1 text-center w-full">
                                  <span className="text-[7.5px] font-black opacity-0 uppercase tracking-tighter mb-0.5 select-none">-</span>
                                  <Badge variant="outline" className="text-[9px] font-bold text-gray-400 bg-gray-50/80 border-dashed" title="Ignorado no cálculo da meta geral">N/A (Exceção)</Badge>
                                </div>
                              ) : (
                                <div className="flex w-full h-full divide-x divide-gray-300/50">
                                  <div className="flex-1 flex flex-col items-center justify-center px-1 py-1 overflow-hidden text-center">
                                    <span className="text-[7.5px] font-black text-muted-foreground/50 uppercase tracking-tighter mb-0.5">Flag</span>
                                    <span className={`text-[8px] font-bold ${percentage >= 95 ? 'text-secondary' : percentage >= 80 ? 'text-amber-500' : 'text-gray-800'} transition-colors w-full truncate`} title={titleText}>
                                      {statusText}
                                    </span>
                                  </div>
                                  <div className="flex-1 flex flex-col items-center justify-center px-1 py-1 overflow-hidden text-center bg-black/[0.03]">
                                    <span className="text-[7.5px] font-black text-muted-foreground/50 uppercase tracking-tighter mb-0.5">Qtd Trocas</span>
                                    <span className="text-[8px] text-muted-foreground/80 font-bold mt-0.5 truncate w-full" title={`Histórico: ${erp.metric?.trocasAuto || 0} Auto / ${erp.metric?.trocasManual || 0} Manuais`}>
                                      <span className="text-secondary">{erp.metric?.trocasAuto || 0}</span> / <span className="text-amber-600">{erp.metric?.trocasManual || 0}</span>
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div key={step} className={`relative px-1 pt-1 pb-3 flex flex-col items-center justify-center border-r h-full w-full ${colBg}`}>
                            <span className="text-[7.5px] font-black opacity-0 uppercase tracking-tighter mb-0.5 select-none">-</span>
                            {isException ? (
                              <Badge variant="outline" className="text-[9px] font-bold text-gray-400 bg-gray-50/80 border-dashed" title="Ignorado no cálculo da meta geral">N/A (Exceção)</Badge>
                            ) : (
                              <div className="flex flex-col items-center justify-center w-full max-w-[85px] h-full">
                                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1.5" title={titleText}>
                                  <div className={`${barColor} h-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                                </div>

                                {step === 1 ? (
                                  <select
                                    onClick={(e) => e.stopPropagation()} 
                                    onChange={(e) => handleUpdateErpSistema(cong.id, erp.code, e.target.value)} 
                                    value={erp.erpSistemaProprio || ""}
                                    className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold ${percentage >= 95 ? 'text-secondary' : percentage >= 80 ? 'text-amber-500' : 'text-gray-800'} w-full max-w-[80px] bg-transparent outline-none cursor-pointer hover:text-primary transition-colors border-b border-dashed border-transparent hover:border-primary text-center appearance-none truncate`}
                                    title={`Atual: ${titleText} (${statusText})`}
                                  >
                                    <option value="" className="text-gray-400 font-normal">
                                      {cong.sistemaEntrada ? cong.sistemaEntrada : 'Herdar do Pai'}
                                    </option>
                                    {Object.keys(entrySystems).sort().map(sys => (
                                      <option key={sys} value={sys} className="text-gray-800 font-normal">{sys}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="flex flex-col items-center justify-center w-full overflow-hidden">
                                    <span className={`text-[8px] font-bold ${percentage >= 95 ? 'text-secondary' : percentage >= 80 ? 'text-amber-500' : 'text-gray-800'} transition-colors text-center w-full truncate`} title={titleText}>
                                      {statusText}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div className="p-2 flex items-center justify-center border-r last:border-r-0 bg-gray-50/10">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleToggleObs(erp.code); }}
                          className={`p-1.5 rounded transition-colors ${hasObs || Object.keys(erp.excecoes || {}).some(k => erp.excecoes[k] === true) ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'hover:bg-gray-200 text-gray-400'}`}
                          title="Anotações e Exceções de Metas"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {isExpanded && (
                  <div style={{ gridColumn: '1 / -1' }} className="w-full bg-slate-50 border-b border-gray-200 p-6 shadow-inner relative flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    
                    {mode === 'view' && (
                      <div className="w-full max-w-3xl mx-auto flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary"/> Anotações e Exceções ({erp.code})
                          </span>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleAction(erp.code, 'edit')}>
                              <Edit3 className="h-3.5 w-3.5 mr-1.5"/> Editar
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={() => handleToggleObs(erp.code)}>
                              <X className="h-4 w-4"/>
                            </Button>
                          </div>
                        </div>

                        {Object.keys(erp.excecoes || {}).some(k => erp.excecoes[k] === true) ? (
                          <div className="flex gap-2 flex-wrap mt-1">
                            <span className="text-xs font-bold text-gray-500 mr-2 flex items-center"><Filter className="h-3 w-3 mr-1"/> Ignorado nas Metas:</span>
                            {["Entrada", "Rupturas", "Programação", "Ger. OV", "Liberação", "Ocorrências"].map((lbl, idx) => {
                              const isExc = erp.excecoes?.[idx];
                              return isExc ? <Badge key={idx} variant="outline" className="text-[9px] bg-red-50 text-red-600 border-red-200">{lbl}</Badge> : null;
                            })}
                          </div>
                        ) : null}

                        <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-md text-sm text-gray-700 min-h-[60px] whitespace-pre-wrap leading-relaxed mt-2">
                          {erp.observacao || <span className="italic text-gray-400 font-medium">Nenhuma observação registrada para este cliente ainda. Clique em editar para adicionar.</span>}
                        </div>
                      </div>
                    )}

                    {mode === 'auth' && (
                      <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto py-2">
                        <div className="bg-primary/10 p-3 rounded-full mb-1"><Lock className="h-5 w-5 text-primary" /></div>
                        <span className="text-sm font-bold text-gray-700">Autenticação Necessária</span>
                        <p className="text-xs text-center text-muted-foreground">Digite a senha corporativa para liberar a edição.</p>
                        <div className="w-full relative mt-2">
                          <input 
                            type="password" 
                            value={obsContext.obsPassword} 
                            onChange={e => obsContext.setObsPassword(e.target.value)} 
                            className={`w-full border p-2 pl-3 rounded-md text-sm outline-none transition-colors ${obsContext.obsError ? 'border-red-500 focus:ring-red-500' : 'focus:border-primary focus:ring-1 focus:ring-primary'}`} 
                            placeholder="Senha" 
                          />
                        </div>
                        {obsContext.obsError && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Senha Incorreta</span>}
                        <div className="flex gap-2 w-full mt-2">
                          <Button variant="outline" className="flex-1 h-8 text-xs" onClick={() => handleAction(erp.code, 'view')}>Cancelar</Button>
                          <Button variant="default" className="flex-1 h-8 text-xs" onClick={() => handleAuth(erp.code)}>Confirmar</Button>
                        </div>
                      </div>
                    )}

                    {mode === 'edit' && (
                      <div className="w-full max-w-3xl mx-auto flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-700 flex items-center gap-2"><Edit3 className="h-4 w-4 text-primary"/> Editando Anotações e Exceções</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={() => handleToggleObs(erp.code)}><X className="h-4 w-4"/></Button>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-md p-4 mt-1">
                          <span className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-2"><Filter className="h-3.5 w-3.5"/> Exceções (Remover da Meta)</span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-2">
                            {["Etapa 1 (Entrada)", "Etapa 2 (Rupturas)", "Etapa 3 (Programação)", "Etapa 4 (Ger. OV)", "Etapa 5 (Liberação)", "Etapa 6 (Ocorrências)"].map((lbl, idx) => (
                              <label key={idx} className="flex items-center gap-2 text-[10px] font-bold text-gray-500 cursor-pointer hover:text-primary transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="accent-primary h-3.5 w-3.5 cursor-pointer"
                                  checked={erp.excecoes?.[idx] === true}
                                  onChange={(e) => obsContext.handleUpdateExcecao(cong.id, erp.code, erp.excecoes, idx, e.target.checked)}
                                />
                                {lbl}
                              </label>
                            ))}
                          </div>
                        </div>

                        <textarea 
                          defaultValue={erp.observacao} 
                          id={`obs-${erp.code}`}
                          className="w-full p-4 border rounded-md text-sm mt-1 focus:ring-1 focus:ring-primary focus:border-primary outline-none min-h-[100px] shadow-sm leading-relaxed"
                          placeholder="Digite os motivos, gargalos operacionais ou ações necessárias referentes à automação deste cliente..."
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <Button variant="outline" size="sm" onClick={() => handleAction(erp.code, 'view')}>Cancelar</Button>
                          <Button variant="default" size="sm" onClick={() => {
                            const newVal = (document.getElementById(`obs-${erp.code}`) as HTMLTextAreaElement).value;
                            obsContext.handleUpdateObservacao(cong.id, erp.code, newVal);
                            obsContext.setObsMode((prev: any) => ({ ...prev, [erp.code]: 'view' }));
                          }}>Salvar Alterações</Button>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}