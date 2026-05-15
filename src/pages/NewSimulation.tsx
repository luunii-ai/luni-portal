import { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Upload, Camera, Check, ArrowRight, ArrowLeft, UserPlus, Users, Building2, Scissors } from 'lucide-react';
import { brandMark } from '@/assets/brandAssets';
import { fetchProcedures } from '@/controllers/proceduresApi';
import { fetchPatients } from '@/controllers/patientsApi';
import type { Patient } from '@/data/mockData';
import patientBeforeImg from '@/assets/patient-before.jpg';
import {
  enhanceImage,
  enhanceErrorMessage,
  mapProcedureIdsToApiTipos,
  intensityPercentToApiLabel,
} from '@/controllers/enhanceApi';
import { toast } from '@/components/ui/use-toast';
import { storeEnhanceAfterImage, storeEnhanceMeta } from '@/lib/enhanceResultStorage';
import { persistSimulationFlow } from '@/lib/simulationFlowStorage';
import { formatBrazilPhoneInput, phoneDigitsOnly } from '@/lib/phoneFormat';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  MAMMOPLASTY_PROCEDURE_ID,
  plasticSurgeryProcedures,
  type PracticeProfile,
} from '@/data/plasticSurgeryProcedures';

type PatientMode = 'new' | 'existing';

const NewSimulation = () => {
  const [practiceProfile, setPracticeProfile] = useState<PracticeProfile | null>(null);
  const [step, setStep] = useState(1);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [mammoplastiaSiliconeAck, setMammoplastiaSiliconeAck] = useState(false);
  const [regioes, setRegioes] = useState('');
  const [detalhesResultado, setDetalhesResultado] = useState('');
  const [intensity, setIntensity] = useState(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [patientMode, setPatientMode] = useState<PatientMode>('new');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, refreshMe } = useAuth();
  const hasSimulationCredit = (user?.simulationCreditsRemaining ?? 0) > 0;
  const flowLocked = !hasSimulationCredit;

  useEffect(() => {
    if (flowLocked) setStep(1);
  }, [flowLocked]);

  const {
    data: clinicProcedures = [],
    isPending: loadingClinicProcedures,
    isError: clinicProceduresError,
  } = useQuery({
    queryKey: ['procedures', 'clinic'],
    queryFn: () => fetchProcedures('clinic'),
    enabled: practiceProfile === 'clinic',
  });

  const { data: allPatients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ['patients', 'newSimList'],
    queryFn: () => fetchPatients(),
  });

  const mammoplastiaSelected =
    practiceProfile === 'surgeon' && selectedProcedures.includes(MAMMOPLASTY_PROCEDURE_ID);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return allPatients;
    return allPatients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q),
    );
  }, [allPatients, patientSearch]);

  const selectExistingPatient = (p: Patient) => {
    if (flowLocked) return;
    setSelectedPatientId(p.id);
    setPatientName(p.name);
    setPatientPhone(formatBrazilPhoneInput(p.phone || ''));
    setPatientEmail(p.email || '');
  };

  const clearPatientSelection = () => {
    setSelectedPatientId(null);
    setPatientName('');
    setPatientPhone('');
    setPatientEmail('');
  };

  const setModeNew = () => {
    if (flowLocked) return;
    setPatientMode('new');
    clearPatientSelection();
  };

  const setModeExisting = () => {
    if (flowLocked) return;
    setPatientMode('existing');
    clearPatientSelection();
    setPatientSearch('');
  };

  const setPreviewAndFile = (file: File, previewDataUrl: string) => {
    setImageFile(file);
    setUploadedImage(previewDataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (flowLocked) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setPreviewAndFile(file, dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadSampleImage = async () => {
    if (flowLocked) return;
    try {
      const res = await fetch(patientBeforeImg);
      const blob = await res.blob();
      const file = new File([blob], 'exemplo.jpg', { type: blob.type || 'image/jpeg' });
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviewAndFile(file, ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } catch {
      toast({
        title: 'Não foi possível carregar a foto de exemplo',
        variant: 'destructive',
      });
    }
  };

  const clearImage = () => {
    if (flowLocked) return;
    setUploadedImage(null);
    setImageFile(null);
  };

  const handleGenerate = async () => {
    if (!imageFile || selectedProcedures.length === 0) {
      toast({
        title: 'Dados incompletos',
        description: 'Selecione uma foto e ao menos um procedimento.',
        variant: 'destructive',
      });
      return;
    }

    if (patientMode === 'new') {
      if (!patientName.trim() || !phoneDigitsOnly(patientPhone)) {
        toast({
          title: 'Dados do cliente',
          description: 'Informe nome e telefone com DDD antes de gerar.',
          variant: 'destructive',
        });
        return;
      }
    } else if (!selectedPatientId) {
      toast({
        title: 'Selecione um paciente',
        description: 'Escolha um paciente na lista para continuar.',
        variant: 'destructive',
      });
      return;
    }

    const tiposApi = mapProcedureIdsToApiTipos(selectedProcedures);
    if (tiposApi.length === 0) {
      toast({
        title: 'Dados incompletos',
        description: 'Nenhum tipo de procedimento válido para enviar.',
        variant: 'destructive',
      });
      return;
    }

    if (mammoplastiaSelected && !mammoplastiaSiliconeAck) {
      toast({
        title: 'Confirmação necessária',
        description:
          'Para mamoplastia, marque a confirmação de simulação com prótese de silicone antes de gerar.',
        variant: 'destructive',
      });
      return;
    }

    if (!hasSimulationCredit) {
      toast({
        title: 'Simulações esgotadas',
        description: 'Você atingiu o limite de simulações do mês. Ajuste seu plano em Configurações ou aguarde a renovação do período.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await enhanceImage({
        file: imageFile,
        tipo_procedimento: tiposApi,
        regioes: regioes.trim(),
        intensidade: intensityPercentToApiLabel(intensity),
        practiceProfile: practiceProfile ?? 'clinic',
        detalhes: detalhesResultado.trim() || undefined,
      });

      const storedOk = storeEnhanceAfterImage(result.afterDataUrl);
      storeEnhanceMeta({
        points: result.points,
        markedImageUrl: result.markedImageUrl,
      });

      const phoneDigits = phoneDigitsOnly(patientPhone);
      const flowSnapshot = {
        pairId: result.pairId,
        practiceProfile: practiceProfile ?? undefined,
        patientDraft: {
          name: patientName.trim(),
          email: patientEmail.trim(),
          phone: phoneDigits,
        },
        patientMode,
        selectedPatientId:
          patientMode === 'existing' && selectedPatientId ? selectedPatientId : undefined,
        patientId:
          patientMode === 'existing' && selectedPatientId ? selectedPatientId : undefined,
        intensity,
        procedures: selectedProcedures,
        procedure: selectedProcedures[0],
        enhanceAfterFromSession: storedOk,
        enhanceMetaFromSession: true,
        r2OriginalUrl: result.r2OriginalUrl,
        r2AfterUrl: result.r2AfterUrl,
        ...(storedOk ? {} : { afterImage: result.afterDataUrl }),
        // Sem pairId as fotos vêm só do state; com pairId evitamos base64 em history.state (limite do browser).
        ...(result.pairId ? {} : { image: uploadedImage ?? undefined }),
        ...(detalhesResultado.trim() ? { detalhes: detalhesResultado.trim() } : {}),
      };
      persistSimulationFlow(flowSnapshot);
      void refreshMe();

      navigate({
        pathname: '/resultado-simulacao',
        search: result.pairId ? `?pairId=${encodeURIComponent(result.pairId)}` : '',
        state: {
          practiceProfile: practiceProfile ?? undefined,
          procedures: selectedProcedures,
          procedure: selectedProcedures[0],
          intensity,
          ...(result.pairId ? {} : { image: uploadedImage }),
          patientMode,
          selectedPatientId:
            patientMode === 'existing' && selectedPatientId ? selectedPatientId : undefined,
          ...(patientMode === 'existing' && selectedPatientId
            ? { patientId: selectedPatientId }
            : {}),
          pairId: result.pairId,
          r2OriginalUrl: result.r2OriginalUrl,
          r2AfterUrl: result.r2AfterUrl,
          enhanceAfterFromSession: storedOk,
          enhanceMetaFromSession: true,
          ...(storedOk ? {} : { afterImage: result.afterDataUrl }),
          patientDraft: flowSnapshot.patientDraft,
          patient: {
            name: patientName.trim(),
            phone: phoneDigits,
            email: patientEmail.trim(),
          },
          ...(detalhesResultado.trim() ? { detalhes: detalhesResultado.trim() } : {}),
        },
      });
    } catch (err) {
      toast({
        title: 'Falha na simulação',
        description: enhanceErrorMessage(err),
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const intensityLabel = intensity < 33 ? 'Sutil' : intensity < 66 ? 'Moderado' : 'Dramático';
  const toggleProcedure = (id: string) => {
    if (flowLocked) return;
    setSelectedProcedures((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const resetToProfileSelection = () => {
    setPracticeProfile(null);
    setStep(1);
    setSelectedProcedures([]);
    setMammoplastiaSiliconeAck(false);
    setDetalhesResultado('');
    setRegioes('');
    setIntensity(50);
  };

  useEffect(() => {
    if (!selectedProcedures.includes(MAMMOPLASTY_PROCEDURE_ID)) {
      setMammoplastiaSiliconeAck(false);
    }
  }, [selectedProcedures]);

  const selectedProcedureLabels = useMemo(() => {
    if (practiceProfile === 'surgeon') {
      return selectedProcedures
        .map((id) => plasticSurgeryProcedures.find((p) => p.id === id)?.name)
        .filter(Boolean)
        .join(' · ');
    }
    return selectedProcedures
      .map((id) => clinicProcedures.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(' · ');
  }, [practiceProfile, clinicProcedures, selectedProcedures]);

  const steps = [
    { num: 1, label: 'Enviar Foto' },
    { num: 2, label: 'Procedimento' },
    { num: 3, label: 'Regiões' },
    { num: 4, label: 'Intensidade' },
    { num: 5, label: 'Gerar' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <p className="ds-label-mono mb-1">Fluxo</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Nova simulação
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Siga os passos para gerar uma simulação estética
        </p>
        {!hasSimulationCredit && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground"
          >
            <p className="font-medium text-destructive">Limite de simulações atingido</p>
            <p className="mt-1 text-muted-foreground">
              Não é possível gerar novas simulações até o próximo período ou alteração de plano.{' '}
              <Link to="/configuracoes/assinatura" className="font-medium text-primary underline-offset-2 hover:underline">
                Ver assinatura
              </Link>
            </p>
          </div>
        )}
      </div>

      {practiceProfile === null ? (
        <div className="ds-feature-card p-8 shadow-elevated ds-transition-surface space-y-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Como você atua?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha o perfil para carregar os procedimentos adequados à simulação.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setPracticeProfile('clinic');
                setStep(1);
                setSelectedProcedures([]);
                setMammoplastiaSiliconeAck(false);
              }}
              disabled={flowLocked}
              className={cn(
                'rounded-2xl border-2 border-border p-6 text-left transition-all',
                'hover:border-primary/40 hover:bg-primary/5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                flowLocked && 'cursor-not-allowed opacity-50',
              )}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Building2 className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">Clínica estética</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Harmonização, preenchimentos, toxina botulínica e procedimentos minimamente invasivos.
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setPracticeProfile('surgeon');
                setStep(1);
                setSelectedProcedures([]);
                setMammoplastiaSiliconeAck(false);
              }}
              disabled={flowLocked}
              className={cn(
                'rounded-2xl border-2 border-border p-6 text-left transition-all',
                'hover:border-primary/40 hover:bg-primary/5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                flowLocked && 'cursor-not-allowed opacity-50',
              )}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Scissors className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">Cirurgião plástico</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Procedimentos cirúrgicos (lipo, rinoplastia, mamoplastia, otoplastia, entre outros).
              </p>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > s.num ? 'gradient-primary text-primary-foreground' :
                  step === s.num ? 'bg-primary text-primary-foreground' :
                  'bg-secondary text-muted-foreground'
                }`}>
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${step > s.num ? 'bg-primary' : 'bg-border'}`} />}
              </div>
            ))}
          </div>

          <div className="ds-feature-card p-8 shadow-elevated ds-transition-surface">
            <div className="-mt-1 mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => resetToProfileSelection()}
                disabled={isGenerating}
                className="text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                Alterar perfil de atuação
              </button>
            </div>
        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Enviar Foto do Paciente
            </h2>
            
            {!uploadedImage ? (
              <div
                role={flowLocked ? 'presentation' : 'button'}
                onClick={() => {
                  if (flowLocked) return;
                  fileInputRef.current?.click();
                }}
                onKeyDown={flowLocked ? undefined : (e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
                tabIndex={flowLocked ? -1 : 0}
                className={cn(
                  'border-2 border-dashed border-border rounded-xl p-12 text-center transition-all',
                  flowLocked
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:border-primary/50 hover:bg-secondary/50',
                )}
              >
                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm font-medium text-foreground">Clique para enviar ou arraste a foto</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG até 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={flowLocked}
                  aria-hidden
                />
              </div>
            ) : (
              <div className="relative rounded-xl bg-muted/40 overflow-hidden">
                <img src={uploadedImage} alt="Paciente" className="w-full max-h-80 object-contain object-center rounded-xl" />
                <button
                  type="button"
                  onClick={clearImage}
                  disabled={flowLocked}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-card/90 backdrop-blur-sm text-xs font-medium text-foreground hover:bg-card transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  Trocar foto
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => void loadSampleImage()}
              disabled={flowLocked}
              className="text-xs text-primary font-medium hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
            >
              Usar foto de exemplo
            </button>

            <div className="border-t border-border pt-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Cliente</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={setModeNew}
                  disabled={flowLocked}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    patientMode === 'new'
                      ? 'border-primary bg-sidebar-accent text-foreground'
                      : 'border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  Paciente novo
                </button>
                <button
                  type="button"
                  onClick={setModeExisting}
                  disabled={flowLocked}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    patientMode === 'existing'
                      ? 'border-primary bg-sidebar-accent text-foreground'
                      : 'border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Escolher paciente
                </button>
              </div>

              {patientMode === 'new' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Nome completo *</label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Ex.: Maria Silva"
                      disabled={flowLocked}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Telefone *</label>
                    <input
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(formatBrazilPhoneInput(e.target.value))}
                      placeholder="(11) 99999-9999"
                      disabled={flowLocked}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Email (opcional)</label>
                    <input
                      type="email"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      disabled={flowLocked}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              )}

              {patientMode === 'existing' && (
                <div className="space-y-3">
                  {!selectedPatientId ? (
                    <>
                      <label className="text-xs text-muted-foreground mb-1 block">Buscar paciente</label>
                      <input
                        type="search"
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        placeholder="Nome, e-mail ou telefone"
                        disabled={flowLocked}
                        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <div className="max-h-52 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                        {loadingPatients && (
                          <p className="p-3 text-xs text-muted-foreground text-center">Carregando…</p>
                        )}
                        {!loadingPatients && filteredPatients.length === 0 && (
                          <p className="p-3 text-xs text-muted-foreground text-center">
                            {allPatients.length === 0
                              ? 'Nenhum paciente cadastrado. Use “Paciente novo”.'
                              : 'Nenhum resultado.'}
                          </p>
                        )}
                        {!loadingPatients &&
                          filteredPatients.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => selectExistingPatient(p)}
                              disabled={flowLocked}
                              className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-secondary/80 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                              <span className="font-medium text-foreground">{p.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {[p.phone, p.email].filter(Boolean).join(' · ') || '—'}
                              </span>
                            </button>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
                      <p className="text-sm font-medium text-foreground">{patientName}</p>
                      <p className="text-xs text-muted-foreground">{patientPhone || '—'}</p>
                      <p className="text-xs text-muted-foreground">{patientEmail || '—'}</p>
                      <button
                        type="button"
                        onClick={clearPatientSelection}
                        disabled={flowLocked}
                        className="text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Trocar paciente
                      </button>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                {patientMode === 'new'
                  ? 'Campos com * são obrigatórios para continuar.'
                  : 'Selecione um paciente na lista para continuar.'}
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Procedure */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Procedimentos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {practiceProfile === 'surgeon'
                  ? 'Selecione um ou mais procedimentos cirúrgicos. Cada um será enviado à IA como tipo de procedimento.'
                  : (
                    <>
                      Selecione um ou mais. Cada um será enviado ao back-end como um campo{' '}
                      <span className="font-mono text-xs">tipo_procedimento</span>.
                    </>
                  )}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {practiceProfile === 'clinic' && loadingClinicProcedures ? (
                <p className="col-span-full text-sm text-muted-foreground py-6 text-center">
                  Carregando procedimentos da clínica…
                </p>
              ) : practiceProfile === 'clinic' && clinicProceduresError ? (
                <p className="col-span-full text-sm text-destructive py-6 text-center">
                  Não foi possível carregar os procedimentos. Verifique o back-end e tente novamente.
                </p>
              ) : practiceProfile === 'clinic' && clinicProcedures.length === 0 ? (
                <p className="col-span-full text-sm text-muted-foreground py-6 text-center rounded-xl border border-border bg-muted/20 px-4">
                  Nenhum procedimento de clínica disponível. Confirme se o back-end está atualizado e
                  reinicie o servidor (o catálogo é sincronizado na subida).
                </p>
              ) : (
                (practiceProfile === 'surgeon' ? plasticSurgeryProcedures : clinicProcedures).map((p) => {
                  const selected = selectedProcedures.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProcedure(p.id)}
                      disabled={flowLocked}
                      className={`rounded-xl border-2 p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border ${
                        selected
                          ? 'border-primary bg-sidebar-accent'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-[10px] font-bold ${
                            selected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/40 bg-background'
                          }`}
                          aria-hidden
                        >
                          {selected ? '✓' : ''}
                        </span>
                        <span className="text-2xl">{p.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            {mammoplastiaSelected && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
                <input
                  type="checkbox"
                  checked={mammoplastiaSiliconeAck}
                  onChange={(e) => setMammoplastiaSiliconeAck(e.target.checked)}
                  disabled={flowLocked}
                  className="mt-1 h-4 w-4 rounded border-input"
                />
                <span className="text-sm leading-snug text-foreground">
                  <span className="font-medium">Confirmo que a simulação é com prótese de silicone</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    O envio para a IA usará o tipo &quot;Mamoplastia (prótese de silicone)&quot;.
                  </span>
                </span>
              </label>
            )}
          </div>
        )}

        {/* Step 3: Regiões */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-display text-lg font-semibold text-foreground">Regiões do procedimento</h2>
            <p className="text-sm text-muted-foreground">
              Descreva as regiões a tratar (ex.: testa, lábios e perfil). Isso será enviado para a IA gerar o resultado.
            </p>
            <div>
              <label htmlFor="regioes-textarea" className="text-xs text-muted-foreground mb-1 block">
                Regiões *
              </label>
              <textarea
                id="regioes-textarea"
                value={regioes}
                onChange={(e) => setRegioes(e.target.value)}
                placeholder="Ex.: testa, lábios e perfil"
                rows={4}
                disabled={flowLocked}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y min-h-[100px] disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="detalhes-resultado-textarea" className="text-xs text-muted-foreground mb-1 block">
                Detalhes / resultado desejado
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Explique o resultado estético que o paciente espera (formato, volume, linhas, simetria). Opcional: a IA usa este texto para refinar o prompt quando preenchido.
              </p>
              <textarea
                id="detalhes-resultado-textarea"
                value={detalhesResultado}
                onChange={(e) => setDetalhesResultado(e.target.value)}
                placeholder={
                  practiceProfile === 'surgeon'
                    ? 'Ex.: nariz mais refinado na ponta, dorso reto, resultado natural'
                    : 'Ex.: preenchimento suave do sulco, projeção discreta do queixo, resultado natural'
                }
                rows={4}
                disabled={flowLocked}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y min-h-[100px] disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {/* Step 4: Intensity */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="font-display text-lg font-semibold text-foreground">Ajustar Intensidade</h2>
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Procedimento(s):{' '}
                <span className="font-medium text-foreground">
                  {selectedProcedureLabels || '—'}
                </span>
              </p>
              <div className="space-y-3">
                <div className="relative w-full h-2 bg-secondary rounded-full">
                  <div
                    className="absolute h-full rounded-full bg-primary transition-all"
                    style={{ width: `${intensity}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={intensity}
                    onChange={(e) => setIntensity(Number(e.target.value))}
                    disabled={flowLocked}
                    className="absolute inset-0 w-full h-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary border-2 border-primary-foreground shadow-md pointer-events-none transition-all"
                    style={{ left: `calc(${intensity}% - 10px)` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Sutil</span>
                  <span>Moderado</span>
                  <span>Dramático</span>
                </div>
                <p className="text-lg font-bold text-primary font-display">{intensityLabel} ({intensity}%)</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Generate */}
        {step === 5 && (
          <div className="space-y-6 text-center">
            <h2 className="font-display text-lg font-semibold text-foreground">Gerar Simulação</h2>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Cliente: <span className="font-medium text-foreground">{patientName || 'Não informado'}</span></p>
              <p className="text-sm text-muted-foreground">
                Procedimento(s):{' '}
                <span className="font-medium text-foreground">{selectedProcedureLabels || '—'}</span>
              </p>
              <p className="text-sm text-muted-foreground">Regiões: <span className="font-medium text-foreground">{regioes.trim() || '—'}</span></p>
              {detalhesResultado.trim() ? (
                <p className="text-sm text-muted-foreground">
                  Detalhes desejados:{' '}
                  <span className="font-medium text-foreground">{detalhesResultado.trim()}</span>
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">Intensidade: <span className="font-medium text-foreground">{intensityLabel} ({intensity}%)</span></p>
            </div>
            {uploadedImage && (
              <img src={uploadedImage} alt="Preview" className="w-48 h-48 object-cover rounded-xl mx-auto" />
            )}
            
            {isGenerating ? (
              <div className="space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full gradient-primary animate-pulse">
                  <img src={brandMark} alt="" className="h-9 w-9 object-contain" width={36} height={36} />
                </div>
                <p className="text-sm text-muted-foreground">Gerando simulação com IA...</p>
                <div className="w-48 h-1.5 bg-secondary rounded-full mx-auto overflow-hidden">
                  <div className="h-full gradient-primary rounded-full animate-[loading_2s_ease-in-out]" style={{ animation: 'loading 2.5s ease-in-out infinite' }} />
                </div>
              </div>
            ) : !hasSimulationCredit ? (
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Sem créditos de simulação disponíveis.{' '}
                <Link to="/configuracoes/assinatura" className="text-primary font-medium underline-offset-2 hover:underline">
                  Gerenciar assinatura
                </Link>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void handleGenerate()}
                className="px-8 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-primary hover:opacity-90 transition-all inline-flex items-center gap-2"
              >
                <img src={brandMark} alt="" className="h-4 w-4 object-contain brightness-0 invert" width={16} height={16} />
                Gerar Simulação com IA
              </button>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <button
            type="button"
            onClick={() => {
              if (step === 1) {
                resetToProfileSelection();
                return;
              }
              setStep(Math.max(1, step - 1));
            }}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 1 ? 'Trocar clínica / cirurgião' : 'Voltar'}
          </button>
          {step < 5 && (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={
                flowLocked ||
                isGenerating ||
                (step === 1 &&
                  (!uploadedImage ||
                    (patientMode === 'new' && (!patientName.trim() || !patientPhone.trim())) ||
                    (patientMode === 'existing' && !selectedPatientId))) ||
                (step === 2 &&
                  (practiceProfile === 'clinic'
                    ? loadingClinicProcedures ||
                      clinicProceduresError ||
                      clinicProcedures.length === 0 ||
                      selectedProcedures.length === 0
                    : selectedProcedures.length === 0 ||
                      (mammoplastiaSelected && !mammoplastiaSiliconeAck))) ||
                (step === 3 && !regioes.trim())
              }
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-primary hover:opacity-90 disabled:opacity-30 transition-all"
            >
              Próximo
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
        </>
      )}

      <style>{`
        @keyframes loading {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default NewSimulation;
