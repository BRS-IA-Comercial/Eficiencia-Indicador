import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Inicialização segura para o lado do servidor
function getDb() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

// GET /api/clientes
// Endpoint consumido pelo organograma (mesma origem dash.brsupply.com.br).
// Retorna lista compacta dos clientes do cubo_metrics com ROB ao vivo e
// flags de automação, sem o peso do histórico completo.
export async function GET(request: Request) {
  const apiKey = request.headers.get('x-api-key');
  const VALID_KEY = process.env.SYNC_API_KEY;

  if (apiKey !== VALID_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const firestore = getDb();
    // Carrega cubo_metrics (ERPs) e erp_mappings (sistemaEntrada por conglomerado)
    const [metricsSnap, mappingsSnap] = await Promise.all([
      getDocs(collection(firestore, 'cubo_metrics')),
      getDocs(collection(firestore, 'erp_mappings')),
    ]);

    // Indexa erp_mappings por docId E por conglomerado (nome), pra dar match
    // tanto pelo id quanto pelo nome do conglomerado.
    const mappingById: Record<string, any> = {};
    const mappingByConglom: Record<string, any> = {};
    mappingsSnap.forEach((mSnap) => {
      const m = mSnap.data() as any;
      mappingById[mSnap.id] = m;
      const congNome = String(m.conglomerado || '').toLowerCase();
      if (congNome) mappingByConglom[congNome] = m;
    });

    const clientes: any[] = [];
    metricsSnap.forEach((docSnap) => {
      const d = docSnap.data() as any;
      const erpCode = docSnap.id;
      const congNome = String(d.conglomerado || '');
      const mapping = mappingById[congNome] || mappingByConglom[congNome.toLowerCase()];
      // Sistema do ERP (override por ERP) ou do conglomerado
      const erpOverride = mapping?.erpSistemasOverrides?.[erpCode];
      const congSistema = mapping?.sistemaEntrada || '';
      const sistemaEntrada = String(erpOverride || congSistema || '');
      clientes.push({
        erp: erpCode,
        cliente: String(d.cliente || ''),
        conglomerado: congNome,
        executivo: String(d.executivo || ''),
        carteira: String(d.carteira || ''),
        robCurrent: Number(d.robCurrent) || 0,
        // ROB rolante de 30 dias (= Historico_30D.ROB, mesmo valor que o
        // dashboard usa como "ROB Média"). Estável no início do mês, ao
        // contrário de robCurrent (soma do mês-calendário). Usado pelo
        // organograma na classificação dos clientes digitais.
        robAvg30d: Number(d.avgRob3M ?? d.Historico_30D?.ROB) || 0,
        ordersCurrent: Number(d.ordersCurrent) || 0,
        isAtivo: d.isAtivo !== false,
        // Sistema de entrada (E1) — resultado da junção cubo_metrics ↔ erp_mappings
        sistemaEntrada,
        flags: {
          flagGeraOVAuto: d.flagGeraOVAuto === true,
          etapa2Ativo: d.etapa2Ativo === true,
          etapa3Ativo: d.etapa3Ativo === true,
          utilizaJanela: String(d.utilizaJanela || 'NAO').toUpperCase(),
          trocaAutomatica: String(d.trocaAutomatica || '').toUpperCase(),
        },
      });
    });

    return NextResponse.json({
      clientes,
      count: clientes.length,
      ts: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
