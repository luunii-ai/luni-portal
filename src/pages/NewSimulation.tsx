import { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Upload, Camera, Check, ArrowRight, ArrowLeft, UserPlus, Users, Building2, Scissors, AlertTriangle } from 'lucide-react';
import { brandMark } from '@/assets/brandAssets';
import { fetchProcedures } from '@/controllers/proceduresApi';
import { fetchPatients, ensurePatient, recordPatientPhotoConsent, checkPatientPhone } from '@/controllers/patientsApi';
import type { Patient } from '@/data/mockData';
import patientBeforeImg from '@/assets/patient-before.jpg';
import {
  enhanceImage,
  enhancePreview,
  finalizePreview,
  enhanceErrorMessage,
  mapProcedureIdsToApiTipos,
  intensityPercentToApiLabel,
} from '@/controllers/enhanceApi';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { storeEnhanceAfterImage, storeEnhanceMeta } from '@/lib/enhanceResultStorage';
import { persistSimulationFlow } from '@/lib/simulationFlowStorage';
import { buildEnhanceRegionsText } from '@/lib/enhanceProcedureRegions';
import { formatBrazilPhoneInput, phoneDigitsOnly } from '@/lib/phoneFormat';
import { usePhoneReuseConfirmation } from '@/hooks/usePhoneReuseConfirmation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { legalDocumentLinkProps } from '@legal/linkProps';
import { cn } from '@/lib/utils';
import {
  MAMMOPLASTY_PROCEDURE_ID,
  plasticSurgeryProcedures,
  type PracticeProfile,
} from '@/data/plasticSurgeryProcedures';

type PatientMode = 'new' | 'existing';

type PreviewZoomPayload = { src: string; caption: string };

const previewThumbButtonClass =
  'group relative flex w-full cursor-zoom-in justify-center overflow-hidden rounded-lg bg-muted/30 p-2 text-center transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function PreviewZoomDialog({
  payload,
  onOpenChange,
}: {
  payload: PreviewZoomPayload | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = Boolean(payload?.src);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[calc(100vw-1rem)] max-w-none flex-col gap-3 overflow-auto border bg-background p-4 sm:w-[min(94vw,56rem)] sm:max-w-[min(94vw,56rem)] sm:p-6 lg:gap-4">
        <DialogHeader className="shrink-0 space-y-0 text-left">
          <DialogTitle className="font-display text-lg font-semibold leading-tight">{payload?.caption ?? 'Visualização ampliada'}</DialogTitle>
        </DialogHeader>
        {payload?.src ? (
          <div className="flex min-h-0 flex-1 justify-center rounded-lg bg-muted/25 p-1 sm:p-2">
            <img
              src={payload.src}
              alt=""
              className="max-h-[min(82vh,calc(100vh-11rem))] w-full object-contain"
            />
          </div>
        ) : null}
        <p className="sr-only">Feche o diálogo para continuar ou pressione Escape.</p>
      </DialogContent>
    </Dialog>
  );
}

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
  const [detalhesResultado, setDetalhesResultado] = useState('');
  const [intensity, setIntensity] = useState(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string>('image/png');
  const [previewIntensity, setPreviewIntensity] = useState<number | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<PreviewZoomPayload | null>(null);
  const [patientMode, setPatientMode] = useState<PatientMode>('new');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientConsentAck, setPatientConsentAck] = useState(false);
  const [enhancePatientId, setEnhancePatientId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const phoneReuseConfirmedRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const { user, refreshMe } = useAuth();
  const { confirmIfPhoneExists, phoneReuseDialog } = usePhoneReuseConfirmation();
  const [phoneConflictHint, setPhoneConflictHint] = useState<{
    existingName: string;
    simulationCount: number;
  } | null>(null);
  const hasSimulationCredit = (user?.simulationCreditsRemaining ?? 0) > 0;
  const hasPreviewCredit = (user?.previewCreditsRemaining ?? 0) > 0;
  const flowLocked = !hasSimulationCredit;
  const previewIsValid = previewImage !== null && previewIntensity === intensity;

  useEffect(() => {
    if (flowLocked) setStep(1);
  }, [flowLocked]);

  useEffect(() => {
    phoneReuseConfirmedRef.current = null;
  }, [patientPhone, patientMode]);

  useEffect(() => {
    if (patientMode !== 'new' || step !== 1) {
      setPhoneConflictHint(null);
      return;
    }
    const digits = phoneDigitsOnly(patientPhone);
    if (digits.length < 10) {
      setPhoneConflictHint(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void checkPatientPhone(digits).then(({ exists, patient }) => {
        if (cancelled) return;
        if (exists && patient) {
          setPhoneConflictHint({
            existingName: patient.name,
            simulationCount: patient.proceduresSimulated ?? 0,
          });
        } else {
          setPhoneConflictHint(null);
        }
      });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [patientPhone, patientMode, step]);

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

  const resolvePatientForEnhance = async (): Promise<string | null> => {
    if (!patientConsentAck) {
      toast({
        title: 'Consentimento necessário',
        description: 'Confirme que o paciente autorizou o uso da foto para simulação estética.',
        variant: 'destructive',
      });
      return null;
    }

    if (patientMode === 'new') {
      if (!patientName.trim() || !phoneDigitsOnly(patientPhone)) {
        toast({
          title: 'Dados do cliente',
          description: 'Informe nome e telefone com DDD antes de gerar.',
          variant: 'destructive',
        });
        return null;
      }
      const ensured = await ensurePatient({
        name: patientName.trim(),
        email: patientEmail.trim(),
        phone: phoneDigitsOnly(patientPhone),
        recordPhotoConsent: true,
      });
      setSelectedPatientId(ensured.id);
      setEnhancePatientId(ensured.id);
      return ensured.id;
    }

    if (!selectedPatientId) {
      toast({
        title: 'Selecione um paciente',
        description: 'Escolha um paciente na lista para continuar.',
        variant: 'destructive',
      });
      return null;
    }

    const updated = await recordPatientPhotoConsent(selectedPatientId);
    setEnhancePatientId(updated.id);
    return updated.id;
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

    if (!patientConsentAck) {
      toast({
        title: 'Consentimento necessário',
        description: 'Confirme que o paciente autorizou o uso da foto para simulação estética.',
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
      const patientIdForEnhance = await resolvePatientForEnhance();
      if (!patientIdForEnhance) {
        setIsGenerating(false);
        return;
      }

      let afterDataUrl: string;
      let resultPairId: string | undefined;
      let resultR2OriginalUrl: string | undefined;
      let resultR2AfterUrl: string | undefined;
      let resultPoints: import('@/controllers/enhanceApi').EnhanceApiPoint[] = [];
      let resultMarkedImageUrl: string | null = null;
      let resultMarkedDataUrl: string | null = null;

      if (previewIsValid && uploadedImage) {
        // Aceitar o preview: apenas salvar no R2 sem chamar o agente novamente
        const finalizeResult = await finalizePreview({
          originalDataUrl: uploadedImage,
          originalMime: imageFile.type || 'image/jpeg',
          afterDataUrl: previewImage!,
          afterMime: previewMime,
        });
        afterDataUrl = previewImage!;
        resultPairId = finalizeResult.pairId;
        resultR2OriginalUrl = finalizeResult.r2OriginalUrl;
        resultR2AfterUrl = finalizeResult.r2AfterUrl;
      } else {
        // Fluxo normal: chamar agente e debitar crédito de simulação
        const result = await enhanceImage({
          file: imageFile,
          tipo_procedimento: tiposApi,
          regioes: enhanceRegioesText.trim(),
          intensidade: intensityPercentToApiLabel(intensity),
          intensidadePct: intensity,
          practiceProfile: practiceProfile ?? 'clinic',
          detalhes: detalhesResultado.trim() || undefined,
          patientId: patientIdForEnhance,
        });
        afterDataUrl = result.afterDataUrl;
        resultPairId = result.pairId;
        resultR2OriginalUrl = result.r2OriginalUrl;
        resultR2AfterUrl = result.r2AfterUrl;
        resultPoints = result.points;
        resultMarkedImageUrl = result.markedImageUrl;
        resultMarkedDataUrl = result.markedDataUrl;
      }

      const storedOk = storeEnhanceAfterImage(afterDataUrl);
      storeEnhanceMeta({
        points: resultPoints,
        markedImageUrl: resultMarkedImageUrl,
      });

      const phoneDigits = phoneDigitsOnly(patientPhone);
      const flowSnapshot = {
        pairId: resultPairId,
        practiceProfile: practiceProfile ?? undefined,
        patientDraft: {
          name: patientName.trim(),
          email: patientEmail.trim(),
          phone: phoneDigits,
        },
        patientMode,
        selectedPatientId:
          patientMode === 'existing' && selectedPatientId ? selectedPatientId : undefined,
        patientId: patientIdForEnhance,
        intensity,
        procedures: selectedProcedures,
        procedure: selectedProcedures[0],
        enhanceAfterFromSession: storedOk,
        enhanceMetaFromSession: true,
        r2OriginalUrl: resultR2OriginalUrl,
        r2AfterUrl: resultR2AfterUrl,
        ...(storedOk ? {} : { afterImage: afterDataUrl }),
        ...(resultPairId ? {} : { image: uploadedImage ?? undefined }),
        ...(detalhesResultado.trim() ? { detalhes: detalhesResultado.trim() } : {}),
      };
      persistSimulationFlow(flowSnapshot);
      void refreshMe();

      navigate(
        {
          pathname: '/resultado-simulacao',
          search: resultPairId ? `?pairId=${encodeURIComponent(resultPairId)}` : '',
        },
        {
          state: {
            practiceProfile: practiceProfile ?? undefined,
            procedures: selectedProcedures,
            procedure: selectedProcedures[0],
            intensity,
            ...(resultPairId ? {} : { image: uploadedImage }),
            patientMode,
            selectedPatientId:
              patientMode === 'existing' && selectedPatientId ? selectedPatientId : undefined,
            ...(patientMode === 'existing' && selectedPatientId
              ? { patientId: selectedPatientId }
              : { patientId: patientIdForEnhance }),
            pairId: resultPairId,
            r2OriginalUrl: resultR2OriginalUrl,
            r2AfterUrl: resultR2AfterUrl,
            enhanceAfterFromSession: storedOk,
            enhanceMetaFromSession: true,
            ...(storedOk ? {} : { afterImage: afterDataUrl }),
            patientDraft: flowSnapshot.patientDraft,
            patient: {
              name: patientName.trim(),
              phone: phoneDigits,
              email: patientEmail.trim(),
            },
            ...(detalhesResultado.trim() ? { detalhes: detalhesResultado.trim() } : {}),
          },
        },
      );
    } catch (err) {
      toast({
        title: 'Falha na simulação',
        description: enhanceErrorMessage(err),
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    if (!imageFile || selectedProcedures.length === 0) return;
    if (!hasPreviewCredit) {
      toast({
        title: 'Pré-visualizações esgotadas',
        description: `Você usou todas as ${user?.previewMonthlyQuota ?? 0} pré-visualizações do mês.`,
        variant: 'destructive',
      });
      return;
    }

    const tiposApi = mapProcedureIdsToApiTipos(selectedProcedures);
    if (!tiposApi.length) return;

    setIsGeneratingPreview(true);
    try {
      const patientIdForEnhance = await resolvePatientForEnhance();
      if (!patientIdForEnhance) return;

      const result = await enhancePreview({
        file: imageFile,
        tipo_procedimento: tiposApi,
        regioes: enhanceRegioesText.trim(),
        intensidade: intensityPercentToApiLabel(intensity),
        intensidadePct: intensity,
        practiceProfile: practiceProfile ?? 'clinic',
        detalhes: detalhesResultado.trim() || undefined,
        patientId: patientIdForEnhance,
      });
      const mime = result.afterDataUrl.match(/^data:([^;]+);/)?.[1] ?? 'image/png';
      setPreviewImage(result.afterDataUrl);
      setPreviewMime(mime);
      setPreviewIntensity(intensity);
      void refreshMe();
    } catch (err) {
      toast({
        title: 'Falha na pré-visualização',
        description: enhanceErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const intensityLabel = intensity < 33 ? 'Sutil' : intensity < 66 ? 'Moderado' : 'Dramático';
  const toggleProcedure = (id: string) => {
    if (flowLocked) return;
    setSelectedProcedures((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleAdvanceStep = async () => {
    if (
      step === 1 &&
      patientMode === 'new' &&
      phoneDigitsOnly(patientPhone) &&
      phoneReuseConfirmedRef.current !== phoneDigitsOnly(patientPhone)
    ) {
      const phoneOk = await confirmIfPhoneExists(patientPhone, patientName);
      if (!phoneOk) return;
      phoneReuseConfirmedRef.current = phoneDigitsOnly(patientPhone);
    }
    setStep(step + 1);
  };

  const resetToProfileSelection = () => {
    setPracticeProfile(null);
    setStep(1);
    setSelectedProcedures([]);
    setMammoplastiaSiliconeAck(false);
    setDetalhesResultado('');
    setIntensity(50);
    setPreviewImage(null);
    setPreviewIntensity(null);
    setPatientConsentAck(false);
    setEnhancePatientId(null);
  };

  useEffect(() => {
    if (!selectedProcedures.includes(MAMMOPLASTY_PROCEDURE_ID)) {
      setMammoplastiaSiliconeAck(false);
    }
  }, [selectedProcedures]);

  const enhanceRegioesText = useMemo(() => {
    if (!practiceProfile || selectedProcedures.length === 0) return '';
    return buildEnhanceRegionsText(selectedProcedures, {
      practiceProfile,
      clinicProcedures,
    });
  }, [practiceProfile, selectedProcedures, clinicProcedures]);

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
    { num: 3, label: 'Expectativa' },
    { num: 4, label: 'Intensidade' },
    { num: 5, label: 'Gerar' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PreviewZoomDialog
        payload={previewZoom}
        onOpenChange={(open) => {
          if (!open) setPreviewZoom(null);
        }}
      />
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
                  {phoneConflictHint && (
                    <Alert className="sm:col-span-2 border-amber-500/60 bg-amber-500/10 text-foreground">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertTitle className="text-amber-950 dark:text-amber-100">
                        Telefone já cadastrado
                      </AlertTitle>
                      <AlertDescription className="text-amber-950/90 dark:text-amber-50/90">
                        Este número pertence ao paciente{' '}
                        <span className="font-medium">{phoneConflictHint.existingName}</span>
                        {phoneConflictHint.simulationCount > 0 ? (
                          <>
                            {' '}
                            ({phoneConflictHint.simulationCount}{' '}
                            {phoneConflictHint.simulationCount === 1 ? 'simulação' : 'simulações'} no
                            histórico)
                          </>
                        ) : null}
                        . Se você continuar com{' '}
                        <span className="font-medium">{patientName.trim() || 'outro nome'}</span>, as
                        simulações serão agrupadas no mesmo cadastro — o que pode misturar históricos de
                        pessoas diferentes. Ao clicar em Próximo, confirme se deseja seguir.
                      </AlertDescription>
                    </Alert>
                  )}
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

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
                <input
                  type="checkbox"
                  checked={patientConsentAck}
                  onChange={(e) => setPatientConsentAck(e.target.checked)}
                  disabled={flowLocked}
                  className="mt-1 h-4 w-4 rounded border-input"
                />
                <span className="text-sm leading-snug text-foreground">
                  <span className="font-medium">Confirmo que o paciente autorizou o uso da foto</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    A imagem será processada por IA e armazenada na luni para simulação estética
                    ilustrativa.{' '}
                    <Link to="/legal/consentimento-paciente" {...legalDocumentLinkProps} className="text-primary hover:underline">
                      Ver modelo de consentimento
                    </Link>
                  </span>
                </span>
              </label>
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

        {/* Step 3: detalhes opcionais — regiões vêm do catálogo de procedimentos */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-display text-lg font-semibold text-foreground">Expectativa e detalhes</h2>
            <p className="text-sm text-muted-foreground">
              As <span className="font-medium text-foreground">regiões tratadas</span> são definidas automaticamente pelos procedimentos que você escolheu — não é preciso repetir.
              Use o campo abaixo só se quiser refinar o resultado (formato, lateralidade, sutileza, etc.).
            </p>
            {enhanceRegioesText.trim() ? (
              <p className="rounded-lg border border-border bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Áreas-alvo enviadas para a IA:</span>{' '}
                {enhanceRegioesText}
              </p>
            ) : null}
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
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setIntensity(v);
                      if (previewImage !== null) {
                        setPreviewImage(null);
                        setPreviewIntensity(null);
                      }
                    }}
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

            {/* Preview section */}
            {(user?.previewMonthlyQuota ?? 0) > 0 && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Pré-visualização</p>
                  <span className="text-xs text-muted-foreground">
                    {user?.previewCreditsRemaining ?? 0}/{user?.previewMonthlyQuota ?? 0} restantes
                  </span>
                </div>

                {previewImage && (
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                        Antes
                      </p>
                      <button
                        type="button"
                        aria-label="Ampliar imagem antes da pré-visualização"
                        className={previewThumbButtonClass + ' border-border'}
                        disabled={!uploadedImage}
                        onClick={() => uploadedImage && setPreviewZoom({ src: uploadedImage, caption: 'Antes' })}
                      >
                        <img
                          src={uploadedImage ?? ''}
                          alt=""
                          className="mx-auto max-h-[min(18rem,45vh)] w-full object-contain"
                        />
                        <span className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100">
                          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-medium text-foreground shadow-sm">
                            Toque para ampliar
                          </span>
                        </span>
                      </button>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                        Depois
                      </p>
                      <button
                        type="button"
                        aria-label="Ampliar pré-visualização (depois)"
                        className={previewThumbButtonClass + ' border-primary/30'}
                        onClick={() => setPreviewZoom({ src: previewImage, caption: 'Depois (prévia)' })}
                      >
                        <img
                          src={previewImage}
                          alt=""
                          className="mx-auto max-h-[min(18rem,45vh)] w-full object-contain"
                        />
                        <span className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100">
                          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-medium text-foreground shadow-sm">
                            Toque para ampliar
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {isGeneratingPreview ? (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-sm text-muted-foreground">Gerando prévia…</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handlePreview()}
                    disabled={!hasPreviewCredit || flowLocked || isGenerating}
                    className="w-full rounded-lg border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {!hasPreviewCredit
                      ? 'Pré-visualizações esgotadas'
                      : previewImage
                        ? 'Gerar nova prévia (−1 crédito)'
                        : 'Ver prévia desta intensidade (−1 crédito)'}
                  </button>
                )}
              </div>
            )}
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
              <p className="text-sm text-muted-foreground">
                Regiões (automáticas):{' '}
                <span className="font-medium text-foreground">{enhanceRegioesText.trim() || '—'}</span>
              </p>
              {detalhesResultado.trim() ? (
                <p className="text-sm text-muted-foreground">
                  Detalhes desejados:{' '}
                  <span className="font-medium text-foreground">{detalhesResultado.trim()}</span>
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">Intensidade: <span className="font-medium text-foreground">{intensityLabel} ({intensity}%)</span></p>
            </div>
            {previewIsValid ? (
              <div className="flex gap-3 justify-center">
                <div className="space-y-1">
                  <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                    Antes
                  </p>
                  <button
                    type="button"
                    aria-label="Ampliar foto antes"
                    className={previewThumbButtonClass + ' border-border'}
                    disabled={!uploadedImage}
                    onClick={() => uploadedImage && setPreviewZoom({ src: uploadedImage, caption: 'Antes' })}
                  >
                    <img
                      src={uploadedImage ?? ''}
                      alt=""
                      className="mx-auto h-44 w-full max-w-[12rem] object-contain sm:h-52 sm:max-w-[14rem]"
                    />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-center text-[10px] uppercase tracking-widest text-primary">
                    Prévia aprovada
                  </p>
                  <button
                    type="button"
                    aria-label="Ampliar prévia aprovada"
                    className={previewThumbButtonClass + ' border-2 border-primary/40'}
                    onClick={() => setPreviewZoom({ src: previewImage!, caption: 'Prévia aprovada' })}
                  >
                    <img
                      src={previewImage!}
                      alt=""
                      className="mx-auto h-44 w-full max-w-[12rem] object-contain sm:h-52 sm:max-w-[14rem]"
                    />
                  </button>
                </div>
              </div>
            ) : uploadedImage ? (
              <button
                type="button"
                aria-label="Ampliar foto do paciente"
                className={cn(previewThumbButtonClass, 'mx-auto border-border')}
                onClick={() => uploadedImage && setPreviewZoom({ src: uploadedImage, caption: 'Foto do paciente' })}
              >
                <img
                  src={uploadedImage}
                  alt=""
                  className="mx-auto h-52 w-auto max-w-full object-cover sm:h-56"
                />
              </button>
            ) : null}

            {previewIsValid && (
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                A pré-visualização aprovada será salva sem consumir créditos de simulação.
              </p>
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
                {previewIsValid ? 'Confirmar e Salvar Resultado' : 'Gerar Simulação com IA'}
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
              onClick={() => void handleAdvanceStep()}
              disabled={
                flowLocked ||
                isGenerating ||
                (step === 1 &&
                  (!uploadedImage ||
                    !patientConsentAck ||
                    (patientMode === 'new' && (!patientName.trim() || !patientPhone.trim())) ||
                    (patientMode === 'existing' && !selectedPatientId))) ||
                (step === 2 &&
                  (practiceProfile === 'clinic'
                    ? loadingClinicProcedures ||
                      clinicProceduresError ||
                      clinicProcedures.length === 0 ||
                      selectedProcedures.length === 0
                    : selectedProcedures.length === 0 ||
                      (mammoplastiaSelected && !mammoplastiaSiliconeAck)))
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

      {phoneReuseDialog}

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
