
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Endpoint de Sincronização para Scripts PowerShell.
 * Recebe o payload do Cubo SQL e atualiza no Firestore.
 * Utiliza o nome do cliente como ID para evitar duplicidade.
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
      const clientName = String(item.cliente || "Desconhecido").trim();
      
      // Criamos um ID fixo baseado no nome do cliente
      const metricRef = doc(firestore, 'cubo_metrics', clientName);
      
      await setDoc(metricRef, {
        executivo: item.nome || 'Não Informado',
        cliente: clientName,
        conglomerado: item.conglomerado || clientName,
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
      }, { merge: true }); // Merge: true garante que só os novos campos sejam alterados
      
      count++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `${count} clientes atualizados/sincronizados.`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('API Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
