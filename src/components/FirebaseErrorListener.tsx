'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.error('Contexto do Erro Firestore:', error.context);
      
      toast({
        variant: 'destructive',
        title: 'Erro de Permissão no Banco',
        description: `Não foi possível realizar a operação de ${error.context.operation} no caminho ${error.context.path}. Verifique suas Regras de Segurança no Console do Firebase.`,
      });
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
}
