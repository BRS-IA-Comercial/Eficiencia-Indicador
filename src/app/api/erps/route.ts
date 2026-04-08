import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Inicialização segura para o lado do servidor
function getDb() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

export async function GET(request: Request) {
  const apiKey = request.headers.get('x-api-key');
  const VALID_KEY = process.env.SYNC_API_KEY;

  if (apiKey !== VALID_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const firestore = getDb();
    const mappingsRef = collection(firestore, 'erp_mappings');
    const snapshot = await getDocs(mappingsRef);
    
    let allErps: string[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.erpMaeCodes && Array.isArray(data.erpMaeCodes)) {
        allErps = [...allErps, ...data.erpMaeCodes];
      }
    });

    const uniqueErps = [...new Set(allErps)];

    return NextResponse.json({ erps: uniqueErps });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}