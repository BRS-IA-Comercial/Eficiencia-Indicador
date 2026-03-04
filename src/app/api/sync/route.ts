
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Endpoint de Sincronização para Scripts PowerShell.
 * Recebe o payload do Cubo SQL e atualiza no Firestore.
 * Prioriza o uso de IDs únicos (Código do Cliente) para evitar duplicidade.
 */
export async function POST(request: Request) {
  const { firestore } = initializeFirebase();
  
  const apiKey = request.headers.get('x-api-key');
  const VALID_KEY = 'fluxo-vision-master-key-2025';

  if (apiKey !== VALID_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const metrics = body.data || [];
    
    let count = 0;
    for (const item of metrics) {
      // Usamos o CdExtCliente (ou cliente se o código não for enviado) como ID estável
      // Recomendação: No PowerShell, adicione o CdExtCliente ao objeto enviado.
      const uniqueId = String(item.cdExtCliente || item.cliente || "Desconhecido").trim();
      
      if (uniqueId === "Desconhecido") continue;

      const metricRef = doc(firestore, 'cubo_metrics', uniqueId);
      
      await setDoc(metricRef, {
        executivo: item.nome || 'Não Informado',
        cliente: item.cliente || 'Sem Nome',
        conglomerado: item.conglomerado || item.cliente || 'Não Mapeado',
        mes: item.month || '',
        qtdIA: item.totalOrders || item.orders || 0,
        qtdTotal: item.ordersOp || 0,
        hoursSaved: item.hoursSaved || 0,
        fte: item.fte || 0,
        financialGain: item.financialGain || 0,
        grupo: item.grupo || '',
        origem: item.origem || '',
        fase: item.fase || '',
        dataImpl: item.implDate || '',
        updatedAt: serverTimestamp()
      }, { merge: true }); // Merge garante que mudanças de executivo apenas atualizem o campo
      
      count++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `${count} registros sincronizados/atualizados com sucesso.`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
