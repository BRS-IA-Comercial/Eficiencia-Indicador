import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc, getDocs, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

function getDb() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key');
  const VALID_KEY = process.env.SYNC_API_KEY;

  if (apiKey !== VALID_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const firestore = getDb();
    const body = await request.json();

    if (body.action === "cleanup") {
      const validIds = body.validIds || [];
      if (validIds.length === 0) return NextResponse.json({ success: false, message: "Lista vazia." });

      const snapshot = await getDocs(collection(firestore, 'cubo_metrics'));
      let deletedCount = 0, opCount = 0;
      let batch = writeBatch(firestore);

      for (const docSnap of snapshot.docs) {
        if (!validIds.includes(docSnap.id)) {
          batch.delete(docSnap.ref);
          deletedCount++; opCount++;
          if (opCount >= 400) { await batch.commit(); batch = writeBatch(firestore); opCount = 0; }
        }
      }
      if (opCount > 0) await batch.commit();
      return NextResponse.json({ success: true, message: `${deletedCount} removidos.` });
    }

    const metrics = body.data || [];
    let count = 0;

    const snapshot = await getDocs(collection(firestore, 'cubo_metrics'));
    const dadosAntigos: Record<string, any> = {};
    snapshot.forEach(docSnap => { dadosAntigos[docSnap.id] = docSnap.data(); });
    
    let batch = writeBatch(firestore);
    let operationCount = 0;

    const commitBatchIfNeeded = async () => {
      if (operationCount >= 400) {
        await batch.commit();
        batch = writeBatch(firestore);
        operationCount = 0;
      }
    };

    for (const item of metrics) {
      const rawId = String(item.cdExtCliente || item.cliente || "Desconhecido").trim();
      if (rawId === "Desconhecido") continue;
      const uniqueId = rawId.replace(/\//g, "-").replace(/\\/g, "-");

      try {
        const old = dadosAntigos[uniqueId];
        if (old) {
          const checkChange = (campo: string, nomeAmigavel: string, valorNovoBool: boolean) => {
            const valorAntigoBool = old[campo] === true || old[campo] === "SIM" || old[campo] === "1";
            if (valorAntigoBool !== valorNovoBool) {
              
              const isSLA = item.utilizaJanela === "NAO";
              const perfilAtendimento = isSLA ? "SLA" : "JANELA";

              batch.set(doc(collection(firestore, "automation_logs")), {
                erpCode: uniqueId,
                cliente: String(item.cliente || "Desconhecido"),
                carteira: String(item.carteira || "Desconhecida"),
                executivo: String(item.nome || "Não Informado"),
                perfil: perfilAtendimento,
                campo: nomeAmigavel,
                de: valorAntigoBool ? "Automático" : "Manual",
                para: valorNovoBool ? "Automático" : "Manual",
                tipo: valorNovoBool ? "UPGRADE" : "DOWNGRADE",
                data: serverTimestamp()
              });
              operationCount++;
            }
          };

          checkChange('etapa2Ativo', 'Programação de Entrega', item.etapa2Ativo === true);
          checkChange('flagGeraOVAuto', 'Geração de OV', item.flagGeraOVAuto === true);
          checkChange('etapa3Ativo', 'Liberação de Pedidos', item.etapa3Ativo === true);
          await commitBatchIfNeeded();
        }
      } catch (histError) {
        console.error(`Erro ao gerar log para ${uniqueId}`, histError);
      }

      // 👇 AS VARIÁVEIS NOVAS DA RUPTURA ESTÃO AQUI 👇
      batch.set(doc(firestore, 'cubo_metrics', uniqueId), {
        executivo: String(item.nome || 'Não Informado'),
        carteira: String(item.carteira || 'Sem Carteira'),
        cliente: String(item.cliente || 'Sem Nome'),
        conglomerado: String(item.conglomerado || item.cliente || 'Não Mapeado'),
        flagGeraOVAuto: item.flagGeraOVAuto === true,
        etapa2Ativo: item.etapa2Ativo === true,
        etapa3Ativo: item.etapa3Ativo === true,
        utilizaJanela: String(item.utilizaJanela || ''),
        ordersCurrent: Number(item.ordersCurrent) || 0,
        
        trocasAuto: Number(item.trocasAuto) || 0,
        trocasManual: Number(item.trocasManual) || 0,
        avgRuptura3M: Number(item.avgRuptura3M) || 0,
        topRupturas: item.topRupturas || [],

        multiCdEnderecos: String(item.multiCdEnderecos || ""),
        multiCdPedidos: String(item.multiCdPedidos || ""),
        naoLiberarPedidoSemOC: String(item.naoLiberarPedidoSemOC || ""),
        robCurrent: Number(item.robCurrent) || 0,
        avgOrders3M: Number(item.avgOrders3M) || 0,
        avgRob3M: Number(item.avgRob3M) || 0,
        isAtivo: item.isAtivo !== false,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      operationCount++; count++;
      await commitBatchIfNeeded();
    }

    if (operationCount > 0) await batch.commit();

    return NextResponse.json({ success: true, message: `${count} registros sincronizados.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, isDebugError: true, errorMessage: error.message, errorStack: error.stack }, { status: 200 }); 
  }
}