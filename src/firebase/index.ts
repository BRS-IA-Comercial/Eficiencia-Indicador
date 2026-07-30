'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './config';

export function initializeFirebase() {
  const isNewApp = getApps().length === 0;
  const firebaseApp = isNewApp ? initializeApp(firebaseConfig) : getApp();
  // Em redes corporativas o proxy/firewall costuma bloquear o WebChannel de streaming
  // do Firestore (onSnapshot fica pendurado). initializeFirestore com auto-detect de
  // long-polling faz o SDK cair para long-polling quando detecta a interferencia.
  // So pode ser chamado uma unica vez por app; nas remontagens reutiliza a instancia.
  const firestore = isNewApp
    ? initializeFirestore(firebaseApp, {
        experimentalAutoDetectLongPolling: true,
        useFetchStreams: false,
      })
    : getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);

  return { firebaseApp, firestore, auth };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
