import { useState, useMemo, useEffect } from 'react';
import { useLocation, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Save, PlusCircle, DollarSign } from 'lucide-react';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import FacialPointsOverlay from '@/components/FacialPointsOverlay';
import FinancialInsights from '@/components/FinancialInsights';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { botoxFacialPoints, type Procedure } from '@/data/mockData';
import { toast } from '@/components/ui/use-toast';
import { createSimulation } from '@/controllers/simulationsApi';
import { ensurePatient } from '@/controllers/patientsApi';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProcedures } from '@/controllers/proceduresApi';
import { getApiErrorMessage } from '@/controllers/apiErrors';
import { downloadEnhanceAfterAsBlob, fetchEnhancePairImages } from '@/controllers/enhancePairApi';
import { fetchPricingBase } from '@/controllers/pricingBasesApi';
import { getStoredEnhanceAfterImage, getStoredEnhanceMeta } from '@/lib/enhanceResultStorage';
import { formatBrazilPhoneInput, phoneDigitsOnly } from '@/lib/phoneFormat';
import { readSimulationFlow, clearSimulationFlow } from '@/lib/simulationFlowStorage';
import patientBefore from '@/assets/patient-before.jpg';
import patientAfter from '@/assets/patient-after.jpg';
import { plasticProcedureDisplayName, type PracticeProfile } from '@/data/plasticSurgeryProcedures';

function isLikelyMongoObjectId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return /^[a-f0-9]{24}$/i.test(id.trim());
}

function safeSimulationFilenameBase(name: string): string {
  return (
    name
      .trim()
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'simulacao'
  );
}

function extFromMime(mime: string): string {
  if (mime.includes('jpeg') || mime === 'image/jpg') return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'png';
}

/** Baixa somente a imagem “depois” (resultado da simulação), não o par antes/depois. */
async function downloadSimulationAfterImage(afterImageUrl: string, patientLabel: string): Promise<void> {
  const base = safeSimulationFilenameBase(patientLabel);
  if (afterImageUrl.startsWith('data:')) {
    const mimeMatch = /^data:([^;]+);/i.exec(afterImageUrl);
    const mime = mimeMatch?.[1]?.trim() || 'image/png';
    const a = document.createElement('a');
    a.href = afterImageUrl;
    a.download = `simulacao-${base}.${extFromMime(mime)}`;
    a.rel = 'noopener';
    a.click();
    return;
  }
  const res = await fetch(afterImageUrl);
  if (!res.ok) throw new Error('fetch failed');
  const blob = await res.blob();
  const ext = extFromMime(blob.type || 'image/png');
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `simulacao-${base}.${ext}`;
  a.rel = 'noopener';
  a.click();
  URL.revokeObjectURL(objectUrl);
}

/** Oculta o painel “Pontos de correção” na UI; mantém estado para FinancialInsights e save. */
const SHOW_CORRECTION_POINTS_PANEL = false;

type ResultLocationState = {
  practiceProfile?: PracticeProfile;
  procedure?: string;
  procedures?: string[];
  intensity?: number;
  image?: string;
  patientId?: string;
  patientMode?: 'new' | 'existing';
  selectedPatientId?: string;
  pairId?: string;
  r2OriginalUrl?: string;
  r2AfterUrl?: string;
  afterImage?: string;
  enhanceAfterFromSession?: boolean;
  enhanceMetaFromSession?: boolean;
  activePointIds?: number[];
  patientDraft?: { name?: string; email?: string; phone?: string };
  patient?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  /** Detalhes / resultado desejado opcionais vindos do fluxo de simulação. */
  detalhes?: string;
};

function resolveIntensity(raw: ResultLocationState | null | undefined): number {
  const v = raw?.intensity;
  return typeof v === 'number' && !Number.isNaN(v) ? v : 50;
}

const SimulationResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshMe } = useAuth();
  const [searchParams] = useSearchParams();

  const locationState = (location.state ?? {}) as ResultLocationState;
  const pairIdFromSearch = (searchParams.get('pairId') || '').trim() || undefined;
  const pairIdFromLocation = (locationState.pairId || '').trim() || undefined;
  const storedFlow = readSimulationFlow(pairIdFromSearch, pairIdFromLocation);
  const state: ResultLocationState = {
    ...(storedFlow ?? {}),
    ...locationState,
  };

  const pairId = (pairIdFromSearch || state.pairId || '').trim() || undefined;
  const intensityShown = resolveIntensity(state);

  const {
    data: pairImages,
    isLoading: pairLoading,
    isError: pairError,
  } = useQuery({
    queryKey: ['enhancePair', pairId],
    queryFn: () => fetchEnhancePairImages(pairId!),
    enabled: Boolean(pairId),
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ['procedures'],
    queryFn: fetchProcedures,
  });

  const procedureIds =
    state?.procedures?.length ? state.procedures : state?.procedure ? [state.procedure] : ['botox'];

  const primaryProcedureId = (procedureIds[0] || 'botox').trim();

  const { data: pricingBase = null } = useQuery({
    queryKey: ['pricingBase', primaryProcedureId],
    queryFn: () => fetchPricingBase(primaryProcedureId),
    enabled: Boolean(primaryProcedureId),
  });
  const proc: Procedure | undefined = procedures.find((p) => p.id === primaryProcedureId);

  const procedureNamesLabel =
    procedureIds
      .map((id) => procedures.find((p) => p.id === id)?.name ?? plasticProcedureDisplayName(id))
      .filter(Boolean)
      .join(' · ') ||
    proc?.name ||
    plasticProcedureDisplayName(primaryProcedureId) ||
    'Procedimento';
  const defaultPoints = Math.max(proc?.defaultPoints || 0, 20);
  const effectiveCostPerPoint = proc?.costPerPoint && proc.costPerPoint > 0 ? proc.costPerPoint : 15;
  const effectivePricePerPoint = proc?.pricePerPoint && proc.pricePerPoint > 0 ? proc.pricePerPoint : 45;

  const initialPoints = state?.activePointIds?.length
    ? state.activePointIds
    : botoxFacialPoints.slice(0, defaultPoints).map((p) => p.id);
  const [activePoints, setActivePoints] = useState<number[]>(initialPoints);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [insightPoints, setInsightPoints] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const apiPoints = useMemo(() => {
    if (!state?.enhanceMetaFromSession) return null;
    const m = getStoredEnhanceMeta();
    return m?.points?.length ? m.points : null;
  }, [state?.enhanceMetaFromSession]);

  const hasApiPoints = Boolean(apiPoints?.length);
  const [activeApiIndices, setActiveApiIndices] = useState<number[]>([]);

  useEffect(() => {
    if (apiPoints?.length) {
      setActiveApiIndices(apiPoints.map((_, i) => i));
    } else {
      setActiveApiIndices([]);
    }
  }, [apiPoints]);

  const pointsForFinance = hasApiPoints ? activeApiIndices.length : activePoints.length;

  const togglePoint = (pointId: number) => {
    setActivePoints((prev) =>
      prev.includes(pointId) ? prev.filter((id) => id !== pointId) : [...prev, pointId],
    );
  };

  const toggleApiIndex = (index: number) => {
    setActiveApiIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const beforeImg =
    pairImages?.originalUrl ??
    state?.r2OriginalUrl ??
    state?.image ??
    patientBefore;
  const storedAfter =
    state?.enhanceAfterFromSession === true ? getStoredEnhanceAfterImage() : null;
  const afterImg =
    pairImages?.afterUrl ??
    state?.r2AfterUrl ??
    (storedAfter && storedAfter.length > 0 ? storedAfter : null) ??
    state?.afterImage ??
    patientAfter;
  const draft = state?.patientDraft ?? {
    name: state?.patient?.name,
    email: state?.patient?.email,
    phone: phoneDigitsOnly(state?.patient?.phone ?? ''),
  };
  const patientDisplayName = (draft.name || '').trim() || 'Paciente sem nome';
  const patientPhoneLabel = formatBrazilPhoneInput(draft.phone || '');

  const handleSaveSimulation = async () => {
    setSaving(true);
    try {
      const resolvedPatientId =
        state?.patientMode === 'existing' && isLikelyMongoObjectId(state?.selectedPatientId)
          ? state.selectedPatientId.trim()
          : isLikelyMongoObjectId(state?.patientId)
            ? state.patientId.trim()
            : undefined;

      const phoneForApi = phoneDigitsOnly(draft.phone || '');
      let patientIdToUse = resolvedPatientId;

      if (!patientIdToUse) {
        const ensured = await ensurePatient({
          name: (draft.name || 'Paciente').trim() || 'Paciente',
          email: (draft.email ?? '').trim(),
          phone: phoneForApi,
        });
        patientIdToUse = ensured.id;
      }

      await createSimulation({
        patientId: patientIdToUse,
        patientName: (draft.name || '').trim(),
        patientPhone: phoneForApi || undefined,
        patientEmail: (draft.email ?? '').trim() || undefined,
        procedure:
          procedureNamesLabel ||
          proc?.name ||
          plasticProcedureDisplayName(primaryProcedureId) ||
          'Procedimento',
        procedureId: primaryProcedureId,
        date: new Date().toISOString(),
        intensity: intensityShown,
        points: pointsForFinance,
        costPerPoint: effectiveCostPerPoint,
        image: beforeImg,
        enhancePairId: pairId,
        activePointIds: hasApiPoints ? activeApiIndices : activePoints,
      });
      await queryClient.invalidateQueries({ queryKey: ['simulations'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['patients'] });
      void refreshMe();
      clearSimulationFlow();
      toast({
        title: 'Simulação salva',
        description: 'Simulação salva com sucesso.',
      });
      navigate('/pacientes');
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: getApiErrorMessage(err, 'Tente novamente.'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (pairError && pairId) {
      toast({
        title: 'Imagens no armazenamento',
        description: 'Não foi possível carregar o par de fotos. Usando visualização local se disponível.',
        variant: 'destructive',
      });
    }
  }, [pairError, pairId]);

  const handleDownloadSimulationImage = () => {
    void (async () => {
      /** Vinda do R2: fetch direto no browser quebra CORS; o backend lê o objeto e entrega o blob. */
      if (pairId) {
        try {
          const blob = await downloadEnhanceAfterAsBlob(pairId);
          const base = safeSimulationFilenameBase(patientDisplayName);
          const ext = extFromMime(blob.type || 'image/png');
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = `simulacao-${base}.${ext}`;
          a.rel = 'noopener';
          a.click();
          URL.revokeObjectURL(objectUrl);
        } catch (err) {
          toast({
            title: 'Não foi possível baixar',
            description: getApiErrorMessage(err, 'Tente de novo em instantes.'),
            variant: 'destructive',
          });
        }
        return;
      }

      if (!afterImg) {
        toast({
          title: 'Sem imagem de simulação',
          description: 'Não há imagem de resultado para baixar.',
          variant: 'destructive',
        });
        return;
      }
      try {
        await downloadSimulationAfterImage(afterImg, patientDisplayName);
      } catch {
        toast({
          title: 'Não foi possível baixar',
          description: 'Tente de novo em instantes. Se a imagem veio de outro site, o navegador pode bloquear o download.',
          variant: 'destructive',
        });
      }
    })();
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="ds-label-mono mb-1">Resultado</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Resultado da simulação
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {procedureNamesLabel} — Intensidade: {intensityShown}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cliente: {patientDisplayName}
            {patientPhoneLabel ? ` · ${patientPhoneLabel}` : ''}
            {(draft.email || '').trim() ? ` · ${(draft.email || '').trim()}` : ''}
          </p>
          {(state.detalhes || '').trim() ? (
            <p className="mt-2 text-xs text-muted-foreground max-w-xl">
              <span className="font-medium text-foreground/80">Detalhes desejados: </span>
              {(state.detalhes || '').trim()}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
          <button
            type="button"
            onClick={handleDownloadSimulationImage}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary ds-transition-surface"
            title="Baixar apenas a imagem da simulação (resultado depois do procedimento)"
          >
            <Download className="w-4 h-4" />
            Baixar
          </button>
          <Link
            to="/nova-simulacao"
            className="flex items-center gap-2 px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-primary hover:opacity-90 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Nova Simulação
          </Link>
        </div>
      </div>

      <div
        className={`grid gap-4 grid-cols-1 xl:items-stretch ${SHOW_CORRECTION_POINTS_PANEL ? 'xl:grid-cols-2' : ''}`}
      >
        <div className="ds-feature-card flex min-h-[420px] flex-col p-3 shadow-card ds-transition-surface sm:p-4 xl:h-[780px] xl:min-h-0">
          <h3 className="shrink-0 font-display text-sm font-semibold text-foreground">
            Resultado interativo
          </h3>
          {pairId && pairLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando fotos do armazenamento…</p>
          )}
          <div
            className={`flex min-h-0 flex-1 flex-col overflow-y-auto py-1 scrollbar-transparent sm:py-2 ${pairId && pairLoading ? 'hidden' : ''}`}
          >
            <BeforeAfterSlider beforeImage={beforeImg} afterImage={afterImg} />
          </div>
          <p className="shrink-0 rounded-lg border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-center text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            Resultado simulado por IA. Projeção ilustrativa — não garante resultado clínico.
          </p>
          <p className="shrink-0 pt-1 text-center text-xs text-muted-foreground">
            Arraste o controle para comparar antes e depois
          </p>
        </div>

        {SHOW_CORRECTION_POINTS_PANEL && (
          <div className="ds-feature-card flex min-h-[420px] flex-col p-4 shadow-card ds-transition-surface xl:h-[780px] xl:min-h-0">
            <h3 className="mb-2 shrink-0 font-display text-sm font-semibold text-foreground">
              Pontos de correção
            </h3>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 scrollbar-transparent">
              <FacialPointsOverlay
                image={afterImg}
                activePoints={activePoints}
                onTogglePoint={togglePoint}
                apiPoints={apiPoints ?? undefined}
                activeApiIndices={hasApiPoints ? activeApiIndices : undefined}
                onToggleApiIndex={hasApiPoints ? toggleApiIndex : undefined}
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setFinanceOpen(true)}
        title="Insights financeiros (uso interno)"
        className="fixed bottom-24 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/95 text-muted-foreground shadow-md backdrop-blur-sm transition-all hover:border-primary/40 hover:text-primary hover:shadow-lg sm:bottom-8 sm:right-8 md:h-12 md:w-12"
        aria-label="Abrir insights financeiros para uso interno"
      >
        <DollarSign className="h-5 w-5" strokeWidth={2} />
      </button>

      <Dialog
        open={financeOpen}
        onOpenChange={(open) => {
          setFinanceOpen(open);
          if (!open) setInsightPoints(null);
        }}
      >
        <DialogContent className="max-h-[min(90vh,860px)] max-w-2xl overflow-y-auto border-border bg-card p-5 sm:p-6">
          <DialogHeader className="space-y-1 pr-8 text-left">
            <DialogTitle className="font-display text-lg">Insights financeiros</DialogTitle>
            <DialogDescription className="text-left text-xs text-muted-foreground">
              Uso interno — não exiba este painel ao cliente durante a consulta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <FinancialInsights
              embedded
              omitHeader
              points={pointsForFinance}
              costPerPoint={effectiveCostPerPoint}
              pricePerPoint={effectivePricePerPoint}
              pricingBase={pricingBase}
              onPointsChange={setInsightPoints}
            />
            {(() => {
              const resumoPoints = insightPoints ?? pointsForFinance;
              const resumoCostPerPoint = pricingBase
                ? (() => {
                    const isBotox = pricingBase.procedureId === 'botox';
                    return isBotox
                      ? (pricingBase.botoxVialPrice ?? 0) / Math.max(pricingBase.botoxPointsPerVial ?? 1, 1)
                      : (pricingBase.costPerUnit ?? 0);
                  })()
                : effectiveCostPerPoint;
              const resumoPricePerPoint = pricingBase
                ? (() => {
                    const isBotox = pricingBase.procedureId === 'botox';
                    const costPerUnit = isBotox
                      ? (pricingBase.botoxVialPrice ?? 0) / Math.max(pricingBase.botoxPointsPerVial ?? 1, 1)
                      : (pricingBase.costPerUnit ?? 0);
                    const additionalTotal =
                      (pricingBase.additionalCosts?.supplies ?? 0) +
                      (pricingBase.additionalCosts?.ppeAndHygiene ?? 0) +
                      (pricingBase.additionalCosts?.cardFee ?? 0) +
                      (pricingBase.additionalCosts?.fixedClinicShare ?? 0);
                    const estimatedUnits = pricingBase.estimatedUnits ?? 0;
                    const baseCost = estimatedUnits * costPerUnit + additionalTotal;
                    const totalPrice = baseCost * (1 + (pricingBase.desiredMargin ?? 0) / 100);
                    return estimatedUnits > 0 ? totalPrice / estimatedUnits : effectivePricePerPoint;
                  })()
                : effectivePricePerPoint;
              return (
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <h4 className="mb-2 font-display text-xs font-semibold text-foreground">Resumo da Aplicação</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Pontos selecionados</span>
                      <span className="font-bold text-foreground">{resumoPoints}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Custo por ponto</span>
                      <span className="font-medium text-foreground">R$ {resumoCostPerPoint.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Preço por ponto (cobrado)</span>
                      <span className="font-medium text-foreground">R$ {resumoPricePerPoint.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 border-t border-border pt-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-foreground">Total a cobrar</span>
                        <span className="font-bold text-primary">R$ {(resumoPoints * resumoPricePerPoint).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex justify-center w-full">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSaveSimulation()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-primary text-primary-foreground text-sm font-medium shadow-primary hover:opacity-90 transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando…' : 'Salvar simulação'}
        </button>
      </div>
    </div>
  );
};

export default SimulationResult;
