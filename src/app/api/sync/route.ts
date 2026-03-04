import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Endpoint de Sincronização para Scripts PowerShell.
 * Recebe o payload do Cubo SQL e salva no Firestore.
 */
export async function POST(request: Request) {
  const { firestore } = initializeFirebase();
  
  // Verificação de Segurança Simples
  const apiKey = request.headers.get('x-api-key');
  // Em produção, use uma variável de ambiente: process.env.SYNC_API_KEY
  const VALID_KEY = 'fluxo-vision-master-key-2025';

  if (apiKey !== VALID_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const metrics = body.data || [];
    const cuboRef = collection(firestore, 'cubo_metrics');

    let count = 0;
    // Processa os dados vindos do script PowerShell
    for (const item of metrics) {
      await addDoc(cuboRef, {
        executivo: item.nome,
        cliente: item.cliente,
        mes: item.month,
        qtdIA: item.totalOrders || item.orders || 0,
        qtdTotal: item.ordersOp || 0,
        hoursSaved: item.hoursSaved || 0,
        fte: item.fte || 0,
        financialGain: item.financialGain || 0,
        grupo: item.grupo,
        origem: item.origem,
        fase: item.fase,
        dataImpl: item.implDate,
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
