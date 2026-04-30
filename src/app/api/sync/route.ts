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
      const rawId = String(item.CdExtCliente || item.cdExtCliente || item.Cliente || item.cliente || "Desconhecido").trim();
      if (rawId === "Desconhecido") continue;
      const uniqueId = rawId.replace(/\//g, "-").replace(/\\/g, "-");

      try {
        const old = dadosAntigos[uniqueId];
        if (old) {
          const checkChange = (campo: string, nomeAmigavel: string, valorNovoBool: boolean) => {
            const valorAntigoBool = old[campo] === true || old[campo] === "SIM" || old[campo] === "1";
            if (valorAntigoBool !== valorNovoBool) {
              
              const isSLA = item.UtilizaJanelaCorte === "NAO" || item.utilizaJanela === "NAO";
              const perfilAtendimento = isSLA ? "SLA" : "JANELA";

              batch.set(doc(collection(firestore, "automation_logs")), {
                erpCode: uniqueId,
                cliente: String(item.Cliente || item.cliente || "Desconhecido"),
                carteira: String(item.NmCarteira || item.carteira || "Desconhecida"),
                executivo: String(item.Executivo || item.nome || "Não Informado"),
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

          checkChange('etapa2Ativo', 'Programação de Entrega', (item.Etapa2Ativo === true || item.etapa2Ativo === true));
          checkChange('flagGeraOVAuto', 'Geração de OV', (item.FlagGeraOVAuto === true || item.flagGeraOVAuto === true));
          checkChange('etapa3Ativo', 'Liberação de Pedidos', (item.Etapa3Ativo === true || item.etapa3Ativo === true));
          await commitBatchIfNeeded();
        }
      } catch (histError) {
        console.error(`Erro ao gerar log para ${uniqueId}`, histError);
      }

      batch.set(doc(firestore, 'cubo_metrics', uniqueId), {
        executivo: String(item.Executivo || item.nome || 'Não Informado'),
        carteira: String(item.NmCarteira || item.carteira || 'Sem Carteira'),
        cliente: String(item.Cliente || item.cliente || 'Sem Nome'),
        conglomerado: String(item.Conglomerado || item.conglomerado || item.Cliente || item.cliente || 'Não Mapeado'),
        
        flagGeraOVAuto: item.FlagGeraOVAuto === true || item.flagGeraOVAuto === true,
        etapa2Ativo: item.Etapa2Ativo === true || item.etapa2Ativo === true,
        etapa3Ativo: item.Etapa3Ativo === true || item.etapa3Ativo === true,
        
        // 👇 CORREÇÃO: Lê a string real ou fallback
        utilizaJanela: String(item.UtilizaJanelaCorte ?? item.utilizaJanela ?? "NAO").toUpperCase(),
        trocaAutomatica: String(item.TrocaAutomatica ?? item.trocaAutomatica ?? "").toUpperCase(),
        multiCdEnderecos: String(item.MultiCDEnderecos ?? item.multiCdEnderecos ?? "NAO").toUpperCase(),
        fatMultiCD: String(item.FatMultiCD ?? item.fatMultiCD ?? "NAO").toUpperCase(), // Novo campo!
        naoLiberarPedidoSemOC: String(item.NaoLiberarPedidoSemOC ?? item.naoLiberarPedidoSemOC ?? "NAO").toUpperCase(),
        
        ordersCurrent: Number(item.Orders_Current) || 0,
        robCurrent: Number(item.ROB_Current) || 0,
        
        Historico_30D: item.Historico_30D || {},
        Historico_60D: item.Historico_60D || {},
        Historico_90D: item.Historico_90D || {},

        trocasAuto: Number(item.Historico_30D?.trocasAuto) || 0,
        trocasManual: Number(item.Historico_30D?.trocasManual) || 0,
        avgRuptura3M: Number(item.Historico_30D?.pedidosComRuptura) || 0,
        avgOrders3M: Number(item.Historico_30D?.Orders) || 0,
        avgRob3M: Number(item.Historico_30D?.ROB) || 0,

        isAtivo: item.Situacao === "Ativo" || item.isAtivo !== false,
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