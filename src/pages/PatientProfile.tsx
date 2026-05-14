import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, PlusCircle, Calendar, FileText, Trash2 } from 'lucide-react';
import patientBefore from '@/assets/patient-before.jpg';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Simulation } from '@/data/mockData';
import { fetchPatient, patchPatient, deletePatient } from '@/controllers/patientsApi';
import { fetchSimulations, deleteSimulation, patchSimulationSale } from '@/controllers/simulationsApi';
import { fetchProcedures } from '@/controllers/proceduresApi';
import { getApiErrorMessage } from '@/controllers/apiErrors';
import { toast } from '@/components/ui/use-toast';
import { formatBrazilPhoneInput, phoneDigitsOnly } from '@/lib/phoneFormat';
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

const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saveError, setSaveError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [simToDelete, setSimToDelete] = useState<{ id: string; procedure: string } | null>(null);
  const [patientDeleteOpen, setPatientDeleteOpen] = useState(false);
  const [deletingSim, setDeletingSim] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState(false);
  const [togglingSimId, setTogglingSimId] = useState<string | null>(null);

  const { data: patient, isLoading: loadingPatient, isError: patientError } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => fetchPatient(id!),
    enabled: Boolean(id),
  });

  const { data: patientSims = [], isLoading: loadingSims } = useQuery({
    queryKey: ['simulations', 'patient', id],
    queryFn: () => fetchSimulations({ patientId: id }),
    enabled: Boolean(id),
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ['procedures'],
    queryFn: fetchProcedures,
  });

  useEffect(() => {
    if (!patient) return;
    setNotes(patient.notes || '');
    setEditName(patient.name);
    setEditEmail(patient.email || '');
    setEditPhone(formatBrazilPhoneInput(patient.phone || ''));
  }, [patient]);

  const getProcedureId = (procedureName: string, procedureId?: string) => {
    if (procedureId) return procedureId;
    return procedures.find((p) => p.name === procedureName)?.id || 'botox';
  };

  const savePatientProfile = async () => {
    if (!id) return;
    const name = editName.trim();
    if (!name) {
      setProfileError('Informe o nome do paciente.');
      toast({
        title: 'Nome obrigatório',
        description: 'Preencha o nome antes de salvar.',
        variant: 'destructive',
      });
      return;
    }
    setProfileError('');
    setSavingProfile(true);
    try {
      await patchPatient(id, {
        name,
        email: editEmail.trim(),
        phone: phoneDigitsOnly(editPhone),
      });
      await queryClient.invalidateQueries({ queryKey: ['patient', id] });
      await queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({ title: 'Dados do paciente salvos' });
    } catch (e) {
      const msg = getApiErrorMessage(e, 'Não foi possível salvar os dados.');
      setProfileError(msg);
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveNotes = async () => {
    if (!id) return;
    setSaveError('');
    try {
      await patchPatient(id, { notes });
      await queryClient.invalidateQueries({ queryKey: ['patient', id] });
      toast({ title: 'Anotações salvas' });
    } catch (e) {
      setSaveError(getApiErrorMessage(e, 'Não foi possível salvar anotações.'));
    }
  };

  const handleToggleSale = (sim: Simulation) => {
    if (!id || togglingSimId) return;
    const next = !sim.saleCompleted;
    setTogglingSimId(sim.id);
    queryClient.setQueryData<Simulation[]>(['simulations', 'patient', id], (prev = []) =>
      prev.map((s) => (s.id === sim.id ? { ...s, saleCompleted: next } : s)),
    );
    patchSimulationSale(sim.id, next)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      })
      .catch((e) => {
        queryClient.setQueryData<Simulation[]>(['simulations', 'patient', id], (prev = []) =>
          prev.map((s) => (s.id === sim.id ? { ...s, saleCompleted: !next } : s)),
        );
        toast({
          title: 'Erro ao atualizar venda',
          description: getApiErrorMessage(e, 'Tente novamente.'),
          variant: 'destructive',
        });
      })
      .finally(() => setTogglingSimId(null));
  };

  const handleConfirmDeleteSimulation = async () => {
    if (!simToDelete || !id) return;
    setDeletingSim(true);
    try {
      await deleteSimulation(simToDelete.id);
      await queryClient.invalidateQueries({ queryKey: ['simulations', 'patient', id] });
      await queryClient.invalidateQueries({ queryKey: ['simulations'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['patients'] });
      await queryClient.invalidateQueries({ queryKey: ['patient', id] });
      toast({ title: 'Simulação excluída' });
      setSimToDelete(null);
    } catch (e) {
      toast({
        title: 'Erro ao excluir',
        description: getApiErrorMessage(e, 'Tente novamente.'),
        variant: 'destructive',
      });
    } finally {
      setDeletingSim(false);
    }
  };

  const handleConfirmDeletePatient = async () => {
    if (!id) return;
    setDeletingPatient(true);
    try {
      await deletePatient(id);
      await queryClient.invalidateQueries({ queryKey: ['patients'] });
      await queryClient.invalidateQueries({ queryKey: ['simulations'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Paciente excluído' });
      setPatientDeleteOpen(false);
      navigate('/pacientes');
    } catch (e) {
      toast({
        title: 'Erro ao excluir paciente',
        description: getApiErrorMessage(e, 'Tente novamente.'),
        variant: 'destructive',
      });
    } finally {
      setDeletingPatient(false);
    }
  };

  if (loadingPatient) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }
  if (patientError || !patient) {
    return <p className="text-muted-foreground">Paciente não encontrado.</p>;
  }

  return (
    <div className="space-y-6">
      <Link
        to="/pacientes"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Pacientes
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
          <div>
            <h2 className="font-display text-sm font-semibold text-foreground mb-3">Dados do paciente</h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full gradient-primary text-xl font-bold text-primary-foreground"
                aria-hidden
              >
                {((editName || '?').trim().charAt(0) || '?').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 space-y-3 w-full">
                <div>
                  <label htmlFor="patient-name" className="text-xs text-muted-foreground mb-1 block">
                    Nome completo *
                  </label>
                  <input
                    id="patient-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="patient-email" className="text-xs text-muted-foreground mb-1 block">
                    E-mail
                  </label>
                  <input
                    id="patient-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="opcional"
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="patient-phone" className="text-xs text-muted-foreground mb-1 block">
                    Telefone
                  </label>
                  <input
                    id="patient-phone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(formatBrazilPhoneInput(e.target.value))}
                    placeholder="opcional"
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
                  />
                </div>
                {profileError && <p className="text-xs text-destructive">{profileError}</p>}
                <button
                  type="button"
                  onClick={() => void savePatientProfile()}
                  disabled={savingProfile}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {savingProfile ? 'Salvando…' : 'Salvar dados'}
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <FileText className="w-4 h-4 text-primary" />
              Anotações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-32 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none"
            />
            {saveError && <p className="text-xs text-destructive mt-1">{saveError}</p>}
            <button
              type="button"
              onClick={saveNotes}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              Salvar anotações
            </button>
          </div>

          <Link
            to="/nova-simulacao"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-primary hover:opacity-90 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Nova Simulação
          </Link>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-2">Zona de perigo</p>
            <button
              type="button"
              onClick={() => setPatientDeleteOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Excluir paciente
            </button>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Pedimos confirmação antes de excluir: as simulações somem para sempre.
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-card rounded-xl shadow-card">
          <div className="p-5 border-b border-border">
            <h2 className="font-display font-semibold text-foreground">Histórico de Simulações</h2>
          </div>
          {loadingSims ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Carregando…</div>
          ) : patientSims.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma simulação registrada.</div>
          ) : (
            <div className="divide-y divide-border">
              {patientSims.map((sim) => (
                <div
                  key={sim.id}
                  className="flex items-stretch gap-0 hover:bg-secondary/50 transition-colors"
                >
                  <Link
                    to={
                      sim.enhancePairId
                        ? `/resultado-simulacao?pairId=${encodeURIComponent(sim.enhancePairId)}`
                        : '/resultado-simulacao'
                    }
                    state={{
                      procedure: getProcedureId(sim.procedure, sim.procedureId),
                      intensity: sim.intensity,
                      image: sim.image,
                      activePointIds: sim.activePointIds,
                      patientId: patient.id,
                      pairId: sim.enhancePairId,
                      patient: {
                        name: sim.patientName,
                        phone: sim.patientPhone,
                        email: sim.patientEmail,
                      },
                    }}
                    className="flex min-w-0 flex-1 items-center justify-between px-5 py-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden">
                        <img
                          src={sim.image || patientBefore}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{sim.procedure}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3 shrink-0" />
                          {new Date(sim.date).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <p className="text-xs text-muted-foreground">Intensidade: {sim.intensity}%</p>
                      {/* {sim.points != null && sim.points > 0 && (
                        <p className="text-xs text-primary font-medium">{sim.points} pontos</p>
                      )} */}
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleToggleSale(sim)}
                    disabled={togglingSimId === sim.id}
                    title={sim.saleCompleted ? 'Marcar como sem venda' : 'Marcar como venda realizada'}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-4 text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ color: sim.saleCompleted ? 'rgb(22 163 74)' : undefined }}
                  >
                    {sim.saleCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="hidden sm:inline whitespace-nowrap">
                      {sim.saleCompleted ? 'Venda' : 'Sem venda'}
                    </span>
                  </button>
                  <button
                    type="button"
                    title="Excluir simulação"
                    onClick={() => setSimToDelete({ id: sim.id, procedure: sim.procedure })}
                    className="shrink-0 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={Boolean(simToDelete)} onOpenChange={(open) => !open && setSimToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta simulação?</AlertDialogTitle>
            <AlertDialogDescription>
              {simToDelete?.procedure} será removida do histórico deste paciente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSim}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingSim}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeleteSimulation();
              }}
            >
              {deletingSim ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={patientDeleteOpen}
        onOpenChange={(open) => {
          if (!open) setPatientDeleteOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o paciente {patient.name}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  {patientSims.length > 0 ? (
                    <>
                      {patientSims.length === 1
                        ? 'Há 1 simulação no histórico. '
                        : `Há ${patientSims.length} simulações no histórico. `}
                      <span className="text-foreground font-medium">
                        Todas serão apagadas permanentemente
                      </span>
                      , sem possibilidade de recuperação.
                    </>
                  ) : (
                    <span>
                      O cadastro do paciente será excluído.{' '}
                      <span className="text-foreground font-medium">Esta ação é permanente</span> e não pode ser
                      desfeita.
                    </span>
                  )}
                </p>
                <p>Confirme somente se tiver certeza.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPatient}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingPatient}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeletePatient();
              }}
            >
              {deletingPatient ? 'Excluindo…' : 'Excluir permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PatientProfile;
