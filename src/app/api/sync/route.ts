
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';

/**
 * Endpoint de Sincronização para Scripts PowerShell.
 * Recebe o payload do Cubo SQL e salva no Firestore.
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
    const cuboRef = collection(firestore, 'cubo_metrics');

    // Em uma implementação de produção, você poderia usar um batch ou 
    // atualizar registros existentes em vez de apenas adicionar novos.
    let count = 0;
    for (const item of metrics) {
      await addDoc(cuboRef, {
        executivo: item.nome || 'Não Informado',
        cliente: item.cliente || 'Não Informado',
        conglomerado: item.conglomerado || item.cliente || 'Não Informado',
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
      });
      count++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `${count} métricas sincronizadas com sucesso.`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('API Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
