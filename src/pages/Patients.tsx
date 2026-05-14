import { Link } from 'react-router-dom';
import { Search, PlusCircle, Eye, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPatients, deletePatient } from '@/controllers/patientsApi';
import { getApiErrorMessage } from '@/controllers/apiErrors';
import { toast } from '@/components/ui/use-toast';
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

const Patients = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [patientToDelete, setPatientToDelete] = useState<{
    id: string;
    name: string;
    simulationsCount: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { data: patients = [], isLoading, isError } = useQuery({
    queryKey: ['patients', search],
    queryFn: () => fetchPatients(search),
  });

  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;
    setDeleting(true);
    try {
      await deletePatient(patientToDelete.id);
      await queryClient.invalidateQueries({ queryKey: ['patients'] });
      await queryClient.invalidateQueries({ queryKey: ['simulations'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Paciente excluído' });
      setPatientToDelete(null);
    } catch (e) {
      toast({
        title: 'Erro ao excluir',
        description: getApiErrorMessage(e, 'Tente novamente.'),
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Pacientes</h1>
        <Link
          to="/nova-simulacao"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-primary hover:opacity-90 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Nova Simulação
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar paciente..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
        />
      </div>

      {isError && (
        <p className="text-sm text-destructive">Não foi possível carregar pacientes.</p>
      )}

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">
                Nome
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">
                Última Visita
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">
                Simulações
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            )}
            {!isLoading &&
              patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{patient.name}</p>
                        <p className="text-xs text-muted-foreground">{patient.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    {patient.lastVisit
                      ? new Date(patient.lastVisit).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-foreground font-medium">{patient.proceduresSimulated}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/pacientes/${patient.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary bg-sidebar-accent hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        <Eye className="w-3 h-3" />
                        Ver
                      </Link>
                      <Link
                        to="/nova-simulacao"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:bg-secondary transition-all"
                      >
                        <PlusCircle className="w-3 h-3" />
                        Simular
                      </Link>
                      <button
                        type="button"
                        title="Excluir paciente"
                        onClick={() =>
                          setPatientToDelete({
                            id: patient.id,
                            name: patient.name,
                            simulationsCount: patient.proceduresSimulated ?? 0,
                          })
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={Boolean(patientToDelete)} onOpenChange={(open) => !open && setPatientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o paciente {patientToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  {patientToDelete && patientToDelete.simulationsCount > 0 ? (
                    <>
                      {patientToDelete.simulationsCount === 1
                        ? 'Há 1 simulação vinculada a este cadastro. '
                        : `Há ${patientToDelete.simulationsCount} simulações vinculadas. `}
                      <span className="text-foreground font-medium">
                        Todas elas serão apagadas permanentemente
                      </span>
                      , junto com os dados do paciente.
                    </>
                  ) : (
                    <span>
                      O cadastro será removido.{' '}
                      <span className="text-foreground font-medium">Esta ação é permanente</span> e não pode
                      ser desfeita.
                    </span>
                  )}
                </p>
                <p>Confirme somente se tiver certeza.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {deleting ? 'Excluindo…' : 'Excluir permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Patients;
