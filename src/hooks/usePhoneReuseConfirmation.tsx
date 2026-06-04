import { useCallback, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { checkPatientPhone } from '@/controllers/patientsApi';
import { phoneDigitsOnly } from '@/lib/phoneFormat';

type PendingPhoneConfirm = {
  existingName: string;
  simulationCount: number;
  newName: string;
};

/**
 * Pede confirmação quando o telefone já pertence a outro cadastro de paciente
 * (agrupa simulações no mesmo número).
 */
export function usePhoneReuseConfirmation() {
  const [pending, setPending] = useState<PendingPhoneConfirm | null>(null);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirmIfPhoneExists = useCallback(async (phone: string, newName: string): Promise<boolean> => {
    const digits = phoneDigitsOnly(phone);
    if (!digits) return true;

    try {
      const { exists, patient } = await checkPatientPhone(digits);
      if (!exists || !patient) return true;

      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setPending({
          existingName: patient.name,
          simulationCount: patient.proceduresSimulated ?? 0,
          newName: newName.trim() || 'este paciente',
        });
      });
    } catch {
      return true;
    }
  }, []);

  const finish = (confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setPending(null);
  };

  const dialog = (
    <AlertDialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) finish(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Telefone já cadastrado</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                O número informado já está vinculado ao paciente{' '}
                <span className="font-medium text-foreground">{pending?.existingName}</span>
                {pending && pending.simulationCount > 0 ? (
                  <>
                    {' '}
                    ({pending.simulationCount}{' '}
                    {pending.simulationCount === 1 ? 'simulação' : 'simulações'} no histórico)
                  </>
                ) : null}
                .
              </p>
              <p>
                Se você continuar registrando{' '}
                <span className="font-medium text-foreground">{pending?.newName}</span> com este
                telefone, a nova simulação será agrupada no mesmo cadastro. Todas as simulações
                desse número ficarão juntas — inclusive de pessoas com nomes diferentes — o que pode
                misturar históricos.
              </p>
              <p className="font-medium text-foreground">Deseja continuar mesmo assim?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => finish(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => finish(true)}>Sim, continuar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirmIfPhoneExists, phoneReuseDialog: dialog };
}
