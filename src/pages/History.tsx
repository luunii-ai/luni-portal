import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, Circle, Filter, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Simulation } from '@/data/mockData';
import { fetchProcedures } from '@/controllers/proceduresApi';
import { fetchSimulations, deleteSimulation, patchSimulationSale } from '@/controllers/simulationsApi';
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
import patientAfter from '@/assets/patient-after.jpg';

const dayOnlyTs = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

const inputDateTs = (yyyyMmDd: string) => {
  const [y, m, day] = yyyyMmDd.split('-').map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day).getTime();
};

const History = () => {
  const queryClient = useQueryClient();
  const [filterProcedure, setFilterProcedure] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [simToDelete, setSimToDelete] = useState<{ id: string; patientName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: procedures = [] } = useQuery({
    queryKey: ['procedures'],
    queryFn: fetchProcedures,
  });

  const { data: allSimulations = [], isLoading, isError } = useQuery({
    queryKey: ['simulations', 'history'],
    queryFn: () => fetchSimulations(),
  });

  const filtered = useMemo(() => {
    let list = allSimulations;
    if (filterProcedure !== 'all') {
      list = list.filter((s) => s.procedure === filterProcedure);
    }
    const fromTs = dateFrom ? inputDateTs(dateFrom) : null;
    const toTs = dateTo ? inputDateTs(dateTo) : null;
    if (fromTs !== null) {
      list = list.filter((s) => dayOnlyTs(s.date) >= fromTs);
    }
    if (toTs !== null) {
      list = list.filter((s) => dayOnlyTs(s.date) <= toTs);
    }
    return list;
  }, [allSimulations, filterProcedure, dateFrom, dateTo]);

  const getProcedureId = (procedureName: string, procedureId?: string) => {
    if (procedureId) return procedureId;
    return procedures.find((p) => p.name === procedureName)?.id || 'botox';
  };

  const clearDates = () => {
    setDateFrom('');
    setDateTo('');
  };

  const handleToggleSale = (sim: Simulation) => {
    if (togglingId) return;
    const next = !sim.saleCompleted;
    setTogglingId(sim.id);
    queryClient.setQueryData<Simulation[]>(['simulations', 'history'], (prev = []) =>
      prev.map((s) => (s.id === sim.id ? { ...s, saleCompleted: next } : s)),
    );
    patchSimulationSale(sim.id, next)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      })
      .catch((e) => {
        queryClient.setQueryData<Simulation[]>(['simulations', 'history'], (prev = []) =>
          prev.map((s) => (s.id === sim.id ? { ...s, saleCompleted: !next } : s)),
        );
        toast({
          title: 'Erro ao atualizar venda',
          description: getApiErrorMessage(e, 'Tente novamente.'),
          variant: 'destructive',
        });
      })
      .finally(() => setTogglingId(null));
  };

  const handleConfirmDeleteSimulation = async () => {
    if (!simToDelete) return;
    setDeleting(true);
    try {
      await deleteSimulation(simToDelete.id);
      await queryClient.invalidateQueries({ queryKey: ['simulations'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({ title: 'Registro removido', description: 'A simulação foi excluída do histórico.' });
      setSimToDelete(null);
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
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="ds-label-mono mb-1">Registros</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Histórico
          </h1>
        </div>
        <div className="flex flex-col gap-3 sm:items-end w-full sm:w-auto">
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            <Filter className="w-4 h-4 text-muted-foreground hidden sm:block shrink-0" />
            <select
              value={filterProcedure}
              onChange={(e) => setFilterProcedure(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary min-w-[10rem]"
            >
              <option value="all">Todos os procedimentos</option>
              {procedures.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-end justify-center sm:justify-end gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="hist-date-from" className="text-[11px] text-muted-foreground">
                Data inicial
              </label>
              <input
                id="hist-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary w-[11.5rem]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="hist-date-to" className="text-[11px] text-muted-foreground">
                Data final
              </label>
              <input
                id="hist-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary w-[11.5rem]"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={clearDates}
                className="px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors mb-0.5"
              >
                Limpar datas
              </button>
            )}
          </div>
        </div>
      </div>

      {isError && (
        <p className="text-sm text-destructive text-center">Não foi possível carregar o histórico.</p>
      )}

      <div className="grid grid-cols-1 justify-items-start gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {isLoading && (
          <p className="col-span-full text-sm text-muted-foreground py-12 text-center">Carregando…</p>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground py-12 text-center">
            Nenhuma simulação encontrada com esses filtros.
          </p>
        )}
        {filtered.map((sim) => (
          <div
            key={sim.id}
            className="ds-feature-card group relative w-full max-w-[20.5rem] overflow-hidden shadow-card ds-transition-surface hover:border-primary/30 hover:shadow-elevated sm:max-w-[16rem]"
          >
            <Link
              to={
                sim.enhancePairId
                  ? `/resultado-simulacao?pairId=${encodeURIComponent(sim.enhancePairId)}`
                  : '/resultado-simulacao'
              }
              state={{
                procedure: getProcedureId(sim.procedure, sim.procedureId),
                procedures: sim.procedureId ? [sim.procedureId] : undefined,
                intensity: sim.intensity,
                image: sim.image,
                activePointIds: sim.activePointIds,
                patientId: sim.patientId,
                pairId: sim.enhancePairId,
                patient: {
                  name: sim.patientName,
                  phone: sim.patientPhone,
                  email: sim.patientEmail,
                },
              }}
              className="block"
            >
              <div className="ds-feature-card-glow -right-6 top-8 bg-primary/12 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="aspect-[4/5] w-full overflow-hidden bg-secondary">
                <img src={sim.image || patientAfter} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="relative z-10 space-y-1 p-2.5">
                <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
                  {sim.patientName}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{sim.procedure}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(sim.date).toLocaleDateString('pt-BR')}
                  </div>
                  {sim.points != null && sim.points > 0 && (
                    <span className="text-xs font-medium text-primary bg-sidebar-accent px-2 py-0.5 rounded-full">
                      {sim.points} pts
                    </span>
                  )}
                </div>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => handleToggleSale(sim)}
              disabled={togglingId === sim.id}
              title={sim.saleCompleted ? 'Marcar como sem venda' : 'Marcar como venda realizada'}
              className="relative z-10 mx-2.5 mb-2.5 flex w-[calc(100%-1.25rem)] items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{
                borderColor: sim.saleCompleted ? 'rgb(34 197 94 / 0.4)' : undefined,
                backgroundColor: sim.saleCompleted ? 'rgb(34 197 94 / 0.08)' : undefined,
                color: sim.saleCompleted ? 'rgb(22 163 74)' : undefined,
              }}
            >
              {sim.saleCompleted ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className={sim.saleCompleted ? 'text-green-700' : 'text-muted-foreground'}>
                {sim.saleCompleted ? 'Venda realizada' : 'Sem venda'}
              </span>
            </button>
            <button
              type="button"
              title="Excluir registro"
              onClick={() => setSimToDelete({ id: sim.id, patientName: sim.patientName })}
              className="absolute top-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/95 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-destructive/15 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <AlertDialog open={Boolean(simToDelete)} onOpenChange={(open) => !open && setSimToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir simulação?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove o registro de <span className="font-medium text-foreground">{simToDelete?.patientName}</span>{' '}
              do histórico. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeleteSimulation();
              }}
            >
              {deleting ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default History;
