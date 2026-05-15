import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calculator, DollarSign, TrendingUp, Save } from 'lucide-react';
import { fetchProcedures } from '@/controllers/proceduresApi';
import { fetchPricingBase, savePricingBase } from '@/controllers/pricingBasesApi';
import { toast } from '@/components/ui/use-toast';

const DEFAULTS_BY_PROCEDURE: Record<string, { estimatedUnits: number; costPerUnit: number }> = {
  botox: { estimatedUnits: 20, costPerUnit: 15 },
  'lip-filler': { estimatedUnits: 2, costPerUnit: 220 },
  jawline: { estimatedUnits: 3, costPerUnit: 260 },
  'cheek-filler': { estimatedUnits: 2, costPerUnit: 240 },
  nose: { estimatedUnits: 1, costPerUnit: 260 },
  'bigode-chines': { estimatedUnits: 2, costPerUnit: 240 },
  mento: { estimatedUnits: 1, costPerUnit: 260 },
};
const DEFAULT_BOTOX_VIAL_PRICE = 600;
const DEFAULT_BOTOX_POINTS_PER_VIAL = 100;

type AdditionalCosts = {
  supplies: number;
  ppeAndHygiene: number;
  cardFee: number;
  fixedClinicShare: number;
};

const DEFAULT_ADDITIONAL_COSTS_BY_PROCEDURE: Record<string, AdditionalCosts> = {
  botox: { supplies: 10, ppeAndHygiene: 5, cardFee: 20, fixedClinicShare: 50 },
  'lip-filler': { supplies: 15, ppeAndHygiene: 8, cardFee: 25, fixedClinicShare: 60 },
  jawline: { supplies: 15, ppeAndHygiene: 8, cardFee: 30, fixedClinicShare: 70 },
  'cheek-filler': { supplies: 15, ppeAndHygiene: 8, cardFee: 25, fixedClinicShare: 60 },
  nose: { supplies: 12, ppeAndHygiene: 8, cardFee: 20, fixedClinicShare: 60 },
  'bigode-chines': { supplies: 15, ppeAndHygiene: 8, cardFee: 25, fixedClinicShare: 60 },
  mento: { supplies: 12, ppeAndHygiene: 8, cardFee: 25, fixedClinicShare: 60 },
};

const getDefaultAdditionalCosts = (procedureId: string): AdditionalCosts =>
  DEFAULT_ADDITIONAL_COSTS_BY_PROCEDURE[procedureId] || { supplies: 10, ppeAndHygiene: 5, cardFee: 20, fixedClinicShare: 50 };

const sumAdditionalCosts = (costs: AdditionalCosts) =>
  costs.supplies + costs.ppeAndHygiene + costs.cardFee + costs.fixedClinicShare;

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const formatCurrencyPrecise = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PricingSimulator = () => {
  const queryClient = useQueryClient();

  const { data: procedures = [], isLoading: proceduresLoading } = useQuery({
    queryKey: ['procedures'],
    queryFn: fetchProcedures,
  });

  const [selectedProcedureId, setSelectedProcedureId] = useState('botox');
  const [desiredMargin, setDesiredMargin] = useState(35);
  const [estimatedUnits, setEstimatedUnits] = useState(20);
  const [actualUnits, setActualUnits] = useState(20);
  const [costPerUnit, setCostPerUnit] = useState(15);
  const [botoxVialPrice, setBotoxVialPrice] = useState(DEFAULT_BOTOX_VIAL_PRICE);
  const [botoxPointsPerVial, setBotoxPointsPerVial] = useState(DEFAULT_BOTOX_POINTS_PER_VIAL);
  const [monthlyPatients, setMonthlyPatients] = useState(30);
  const [errorRate, setErrorRate] = useState(15);
  const [showAdditionalCosts, setShowAdditionalCosts] = useState(false);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCosts>(() => getDefaultAdditionalCosts('botox'));

  const { data: savedBase } = useQuery({
    queryKey: ['pricingBase', selectedProcedureId],
    queryFn: () => fetchPricingBase(selectedProcedureId),
  });

  // Hydrate form fields from saved base when it loads or when procedure changes.
  useEffect(() => {
    if (!savedBase) return;
    setDesiredMargin(savedBase.desiredMargin ?? 35);
    setEstimatedUnits(savedBase.estimatedUnits ?? 20);
    setActualUnits(savedBase.actualUnits ?? 20);
    setCostPerUnit(savedBase.costPerUnit ?? 15);
    if (savedBase.botoxVialPrice != null) setBotoxVialPrice(savedBase.botoxVialPrice);
    if (savedBase.botoxPointsPerVial != null) setBotoxPointsPerVial(savedBase.botoxPointsPerVial);
    setMonthlyPatients(savedBase.monthlyPatients ?? 30);
    if (savedBase.additionalCosts) setAdditionalCosts(savedBase.additionalCosts as AdditionalCosts);
  }, [savedBase]);

  const saveMutation = useMutation({
    mutationFn: () =>
      savePricingBase(selectedProcedureId, {
        desiredMargin,
        estimatedUnits,
        actualUnits,
        costPerUnit,
        botoxVialPrice: selectedProcedureId === 'botox' ? botoxVialPrice : null,
        botoxPointsPerVial: selectedProcedureId === 'botox' ? botoxPointsPerVial : null,
        monthlyPatients,
        additionalCosts,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pricingBase', selectedProcedureId] });
      toast({ title: 'Base salva', description: 'Simulação base atualizada com sucesso.' });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar', description: 'Não foi possível salvar a simulação base.', variant: 'destructive' });
    },
  });

  const selectedProcedure =
    procedures.find((p) => p.id === selectedProcedureId) || procedures[0];
  const unitLabel = selectedProcedureId === 'botox' ? 'pontos' : 'unidades';
  const unitShortLabel = selectedProcedureId === 'botox' ? 'pt' : 'unid';

  const onProcedureChange = (nextProcedureId: string) => {
    // Reset to defaults first; if a saved base exists for the new procedure,
    // the useEffect watching `savedBase` will overwrite these values.
    setSelectedProcedureId(nextProcedureId);
    const defaults = DEFAULTS_BY_PROCEDURE[nextProcedureId] || { estimatedUnits: 1, costPerUnit: 200 };
    setEstimatedUnits(defaults.estimatedUnits);
    setActualUnits(defaults.estimatedUnits);
    setCostPerUnit(defaults.costPerUnit);
    setAdditionalCosts(getDefaultAdditionalCosts(nextProcedureId));
    if (nextProcedureId === 'botox') {
      setBotoxVialPrice(DEFAULT_BOTOX_VIAL_PRICE);
      setBotoxPointsPerVial(DEFAULT_BOTOX_POINTS_PER_VIAL);
    }
  };

  const safePointsPerVial = Math.max(botoxPointsPerVial, 1);
  const derivedBotoxCostPerPoint = botoxVialPrice / safePointsPerVial;
  const effectiveCostPerUnit = selectedProcedureId === 'botox' ? derivedBotoxCostPerPoint : costPerUnit;

  const safeMargin = Math.max(desiredMargin, 0);
  const marginRatio = safeMargin / 100;
  const additionalCostTotal = sumAdditionalCosts(additionalCosts);
  const estimatedProcedureCost = estimatedUnits * effectiveCostPerUnit + additionalCostTotal;
  const actualProcedureCost = actualUnits * effectiveCostPerUnit + additionalCostTotal;
  const totalProcedurePrice = estimatedProcedureCost * (1 + marginRatio);
  const chargedPricePerUnit = estimatedUnits > 0 ? totalProcedurePrice / estimatedUnits : 0;
  const recommendedPricePerUnit = chargedPricePerUnit;

  const estimatedProfit = totalProcedurePrice - estimatedProcedureCost;
  const estimatedMargin = estimatedProcedureCost > 0 ? (estimatedProfit / estimatedProcedureCost) * 100 : 0;
  const actualProfit = totalProcedurePrice - actualProcedureCost;
  const actualMargin = actualProcedureCost > 0 ? (actualProfit / actualProcedureCost) * 100 : 0;

  const effectiveErrorRate = actualUnits !== estimatedUnits ? errorRate : 0;
  const patientsWithError = Math.round(monthlyPatients * (effectiveErrorRate / 100));
  const patientsWithoutError = monthlyPatients - patientsWithError;
  const monthlyRevenue = monthlyPatients * totalProcedurePrice;
  const monthlyCostIdeal = monthlyPatients * estimatedProcedureCost;
  const monthlyProfitIdeal = monthlyPatients * estimatedProfit;
  const monthlyCostReal = patientsWithoutError * estimatedProcedureCost + patientsWithError * actualProcedureCost;
  const monthlyProfitReal = monthlyRevenue - monthlyCostReal;
  const monthlyLoss = monthlyProfitIdeal - monthlyProfitReal;

  const projectionMinExtra = selectedProcedureId === 'botox' ? 20 : 1;
  const projectionMaxExtra = selectedProcedureId === 'botox' ? 40 : 2;
  const quickProjectionMinActual = estimatedUnits + projectionMinExtra;
  const quickProjectionMaxActual = estimatedUnits + projectionMaxExtra;

  const quickProjectionMinCost = quickProjectionMinActual * effectiveCostPerUnit + additionalCostTotal;
  const quickProjectionMinProfit = totalProcedurePrice - quickProjectionMinCost;
  const quickProjectionMinMargin = quickProjectionMinCost > 0 ? (quickProjectionMinProfit / quickProjectionMinCost) * 100 : 0;
  const quickProjectionMinMarginLoss = safeMargin - quickProjectionMinMargin;

  const quickProjectionMaxCost = quickProjectionMaxActual * effectiveCostPerUnit + additionalCostTotal;
  const quickProjectionMaxProfit = totalProcedurePrice - quickProjectionMaxCost;
  const quickProjectionMaxMargin = quickProjectionMaxCost > 0 ? (quickProjectionMaxProfit / quickProjectionMaxCost) * 100 : 0;
  const quickProjectionMaxMarginLoss = safeMargin - quickProjectionMaxMargin;

  const totalSuggestions = useMemo(() => {
    const breakEvenUnits = estimatedUnits;
    const breakEvenCost = breakEvenUnits * effectiveCostPerUnit + additionalCostTotal;
    const breakEvenTotal = breakEvenCost;
    const breakEvenProfit = breakEvenTotal - breakEvenCost;
    const breakEvenMargin = breakEvenCost > 0 ? (breakEvenProfit / breakEvenCost) * 100 : 0;
    const breakEvenRealCost = actualProcedureCost;
    const breakEvenRealProfit = breakEvenTotal - breakEvenRealCost;
    const breakEvenRealMargin = breakEvenRealCost > 0 ? (breakEvenRealProfit / breakEvenRealCost) * 100 : 0;

    const recommendedTotal = totalProcedurePrice;
    const recommendedCost = estimatedProcedureCost;
    const recommendedProfit = recommendedTotal - recommendedCost;
    const recommendedMargin = recommendedCost > 0 ? (recommendedProfit / recommendedCost) * 100 : 0;
    const recommendedRealCost = actualProcedureCost;
    const recommendedRealProfit = recommendedTotal - recommendedRealCost;
    const recommendedRealMargin = recommendedRealCost > 0 ? (recommendedRealProfit / recommendedRealCost) * 100 : 0;

    const premiumMargin = safeMargin + 30;
    const premiumTotal = estimatedProcedureCost * (1 + premiumMargin / 100);
    const premiumCost = estimatedProcedureCost;
    const premiumProfit = premiumTotal - premiumCost;
    const premiumResultMargin = premiumCost > 0 ? (premiumProfit / premiumCost) * 100 : 0;
    const premiumRealCost = actualProcedureCost;
    const premiumRealProfit = premiumTotal - premiumRealCost;
    const premiumRealMargin = premiumRealCost > 0 ? (premiumRealProfit / premiumRealCost) * 100 : 0;

    return {
      breakEven: {
        total: breakEvenTotal,
        unitsUsed: breakEvenUnits,
        profit: breakEvenProfit,
        margin: breakEvenMargin,
        realCost: breakEvenRealCost,
        realProfit: breakEvenRealProfit,
        realMargin: breakEvenRealMargin,
      },
      recommended: {
        total: recommendedTotal,
        unitsUsed: estimatedUnits,
        profit: recommendedProfit,
        margin: recommendedMargin,
        realCost: recommendedRealCost,
        realProfit: recommendedRealProfit,
        realMargin: recommendedRealMargin,
      },
      premium: {
        total: premiumTotal,
        unitsUsed: estimatedUnits,
        profit: premiumProfit,
        margin: premiumResultMargin,
        realCost: premiumRealCost,
        realProfit: premiumRealProfit,
        realMargin: premiumRealMargin,
      },
    };
  }, [
    actualUnits,
    actualProcedureCost,
    additionalCostTotal,
    estimatedProcedureCost,
    estimatedUnits,
    effectiveCostPerUnit,
    safeMargin,
    totalProcedurePrice,
  ]);

  if (proceduresLoading) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center text-muted-foreground">Carregando procedimentos…</div>
    );
  }
  if (procedures.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center text-destructive text-sm">
        Não foi possível carregar os procedimentos. Verifique a API.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <p className="ds-label-mono mb-1">Financeiro</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Simulador de precificação
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Simule margem desejada, preço total do procedimento e impacto de erro de aplicação
        </p>
      </div>

      <div className="ds-feature-card space-y-4 p-6 shadow-card ds-transition-surface">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            Configuração Rápida
          </h3>
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? 'Salvando…' : savedBase ? 'Atualizar base' : 'Salvar como base'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField
            label="Procedimento"
            value={selectedProcedureId}
            options={procedures.map((p) => ({ value: p.id, label: p.name }))}
            onChange={onProcedureChange}
          />
          <InputField label="Margem desejada (%)" value={desiredMargin} onChange={setDesiredMargin} min={0} max={1000} />
          {selectedProcedureId === 'botox' ? (
            <>
              <InputField label="Valor do frasco de Botox (R$)" value={botoxVialPrice} onChange={setBotoxVialPrice} min={1} max={50000} />
              <InputField label="Pontos por frasco" value={botoxPointsPerVial} onChange={setBotoxPointsPerVial} min={1} max={1000} />
              <ReadOnlyField label="Custo por ponto (auto)" value={formatCurrencyPrecise(effectiveCostPerUnit)} />
            </>
          ) : (
            <InputField label={`Custo por ${unitShortLabel} (R$)`} value={costPerUnit} onChange={setCostPerUnit} min={1} max={5000} />
          )}
          <ReadOnlyField label={`Valor cobrado por ${unitShortLabel} (auto)`} value={formatCurrencyPrecise(chargedPricePerUnit)} />
          <InputField label={`${unitLabel} estimados`} value={estimatedUnits} onChange={setEstimatedUnits} min={1} max={300} />
          <InputField label={`${unitLabel} reais`} value={actualUnits} onChange={setActualUnits} min={0} max={300} />
          <InputField label="Pacientes/mês" value={monthlyPatients} onChange={setMonthlyPatients} min={1} max={500} />
        </div>

        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">{selectedProcedure?.name}</strong>: cálculo baseado em {unitLabel} + custos da clínica.
            </p>
            <button
              type="button"
              onClick={() => setShowAdditionalCosts((prev) => !prev)}
              className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
            >
              {showAdditionalCosts ? 'Ocultar composição' : 'Detalhar composição'}
            </button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Custos adicionais por procedimento</span>
            <span className="font-semibold text-foreground">{formatCurrency(additionalCostTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Custo por {unitShortLabel} usado no cálculo
            </span>
            <span className="font-semibold text-foreground">{formatCurrencyPrecise(effectiveCostPerUnit)}</span>
          </div>
          {selectedProcedureId === 'botox' && (
            <div className="rounded-lg bg-sidebar-accent p-2.5 space-y-1 text-xs text-muted-foreground">
              <p>
                Cálculo automático: {formatCurrency(botoxVialPrice)} / {safePointsPerVial} pontos ={' '}
                <strong className="text-foreground">{formatCurrencyPrecise(derivedBotoxCostPerPoint)} por ponto</strong>.
              </p>
              <p className="text-xs text-muted-foreground">
                Valor cobrado por ponto (auto):{' '}
                <strong className="text-foreground">{formatCurrencyPrecise(chargedPricePerUnit)}</strong> com margem de {safeMargin}%.
              </p>
            </div>
          )}
          {showAdditionalCosts && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <InputField
                label="Seringa/agulha/insumos (R$)"
                value={additionalCosts.supplies}
                onChange={(v) => setAdditionalCosts((prev) => ({ ...prev, supplies: v }))}
                min={0}
                max={5000}
              />
              <InputField
                label="Luva/algodão/álcool (R$)"
                value={additionalCosts.ppeAndHygiene}
                onChange={(v) => setAdditionalCosts((prev) => ({ ...prev, ppeAndHygiene: v }))}
                min={0}
                max={5000}
              />
              <InputField
                label="Taxa de cartão (R$)"
                value={additionalCosts.cardFee}
                onChange={(v) => setAdditionalCosts((prev) => ({ ...prev, cardFee: v }))}
                min={0}
                max={5000}
              />
              <InputField
                label="Rateio de custo fixo da clínica (R$)"
                value={additionalCosts.fixedClinicShare}
                onChange={(v) => setAdditionalCosts((prev) => ({ ...prev, fixedClinicShare: v }))}
                min={0}
                max={5000}
              />
            </div>
          )}
        </div>
      </div>

      <div className="ds-feature-card space-y-4 p-6 shadow-card ds-transition-surface">
          <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Projeção Mensal
          </h3>
          <InputField
            label="Pacientes/mês (usado na projeção)"
            value={monthlyPatients}
            onChange={setMonthlyPatients}
            min={1}
            max={500}
          />
          {/* <InputField
            label={`Taxa de variação mensal (%)${actualUnits === estimatedUnits ? ' (sem efeito enquanto real = estimado)' : ''}`}
            value={errorRate}
            onChange={setErrorRate}
            min={0}
            max={100}
          /> */}
          <div className="space-y-2">
            <MetricRow label="Preço por procedimento usado" value={formatCurrencyPrecise(totalProcedurePrice)} />
            <MetricRow label="Pacientes/mês usados no cálculo" value={`${monthlyPatients}`} />
            <MetricRow label="Faturamento mensal" value={formatCurrency(monthlyRevenue)} />
            <MetricRow label="Custo base (estimado)" value={formatCurrency(monthlyCostIdeal)} />
            <MetricRow label="Custo com variação real" value={formatCurrency(monthlyCostReal)} highlight={monthlyCostReal > monthlyCostIdeal ? 'danger' : 'success'} />
            <div className="border-t border-border my-2" />
            <MetricRow label="Lucro base (estimado)" value={formatCurrency(monthlyProfitIdeal)} highlight="success" />
            <MetricRow label="Lucro com variação real" value={formatCurrency(monthlyProfitReal)} highlight={monthlyProfitReal < monthlyProfitIdeal ? 'warning' : 'success'} />
            <MetricRow label="Impacto mensal da variação" value={formatCurrency(monthlyLoss)} highlight={monthlyLoss > 0 ? 'danger' : 'success'} />
            <MetricRow label={`Pacientes com variação (${effectiveErrorRate}%)`} value={`${patientsWithError} de ${monthlyPatients}`} />
          </div>
          <p className="text-xs text-muted-foreground">
            Fórmula do faturamento: {formatCurrencyPrecise(totalProcedurePrice)} x {monthlyPatients} ={' '}
            <strong className="text-foreground">{formatCurrency(monthlyRevenue)}</strong>.
          </p>
      </div>

      <div className="ds-feature-card space-y-4 p-6 shadow-card ds-transition-surface">
        <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Sugestão de Preço Total do Procedimento
        </h3>
        <p className="text-xs text-muted-foreground">
          A recomendação abaixo usa margem desejada sobre o custo de {safeMargin}%, {estimatedUnits} {unitLabel} estimados e{' '}
          {formatCurrency(additionalCostTotal)} de custos adicionais da clínica.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PriceCard
            title="Mínimo (Break-even)"
            value={totalSuggestions.breakEven.total}
            subtitle="Cobre custo, margem 0%"
            variant="danger"
            unitsUsed={totalSuggestions.breakEven.unitsUsed}
            unitShortLabel={unitShortLabel}
            costPerUnit={effectiveCostPerUnit}
            additionalCostTotal={additionalCostTotal}
            profit={totalSuggestions.breakEven.profit}
            margin={totalSuggestions.breakEven.margin}
            estimatedUnits={estimatedUnits}
            actualUnits={actualUnits}
            realCost={totalSuggestions.breakEven.realCost}
            realProfit={totalSuggestions.breakEven.realProfit}
            realMargin={totalSuggestions.breakEven.realMargin}
          />
          <PriceCard
            title="Recomendado"
            value={totalSuggestions.recommended.total}
            subtitle={`Custo + ${safeMargin}% de margem`}
            variant="primary"
            highlighted
            unitsUsed={totalSuggestions.recommended.unitsUsed}
            unitShortLabel={unitShortLabel}
            costPerUnit={effectiveCostPerUnit}
            additionalCostTotal={additionalCostTotal}
            profit={totalSuggestions.recommended.profit}
            margin={totalSuggestions.recommended.margin}
            estimatedUnits={estimatedUnits}
            actualUnits={actualUnits}
            realCost={totalSuggestions.recommended.realCost}
            realProfit={totalSuggestions.recommended.realProfit}
            realMargin={totalSuggestions.recommended.realMargin}
          />
          <PriceCard
            title="Premium"
            value={totalSuggestions.premium.total}
            subtitle={`Sempre +30 p.p. de margem (${safeMargin + 30}%)`}
            variant="success"
            unitsUsed={totalSuggestions.premium.unitsUsed}
            unitShortLabel={unitShortLabel}
            costPerUnit={effectiveCostPerUnit}
            additionalCostTotal={additionalCostTotal}
            profit={totalSuggestions.premium.profit}
            margin={totalSuggestions.premium.margin}
            estimatedUnits={estimatedUnits}
            actualUnits={actualUnits}
            realCost={totalSuggestions.premium.realCost}
            realProfit={totalSuggestions.premium.realProfit}
            realMargin={totalSuggestions.premium.realMargin}
          />
        </div>
      </div>

      <div className="ds-feature-card space-y-4 p-6 shadow-card ds-transition-surface">
        <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          Simulação Rápida pela Margem
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MetricBox label={`Valor ideal por ${unitShortLabel}`} value={formatCurrencyPrecise(recommendedPricePerUnit)} />
          <MetricBox label="Valor total para cobrar no procedimento" value={formatCurrency(totalProcedurePrice)} />
          <MetricBox label="Custo total base (produto + clínica)" value={formatCurrency(estimatedProcedureCost)} />
          <MetricBox label="Lucro base no procedimento" value={formatCurrency(estimatedProfit)} />
          <MetricBox label="Margem base no procedimento" value={`${estimatedMargin.toFixed(1)}%`} />
          <MetricBox label="Lucro com pontos reais" value={formatCurrency(actualProfit)} />
          <MetricBox label="Margem com pontos reais" value={`${actualMargin.toFixed(1)}%`} />
        </div>

        <div className="rounded-lg border border-border p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">
            Exemplo de variação baseado em {estimatedUnits} {unitLabel} estimados
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <MetricRow label={`Cenário +${projectionMinExtra} ${unitLabel}`} value={`${quickProjectionMinActual} ${unitLabel}`} />
            <MetricRow label={`Lucro no cenário +${projectionMinExtra}`} value={formatCurrency(quickProjectionMinProfit)} highlight={quickProjectionMinProfit < 0 ? 'danger' : 'warning'} />
            <MetricRow label={`Margem no cenário +${projectionMinExtra}`} value={`${quickProjectionMinMargin.toFixed(1)}%`} highlight={quickProjectionMinMargin < 0 ? 'danger' : 'warning'} />
            <MetricRow label={`Redução da margem (+${projectionMinExtra})`} value={`${quickProjectionMinMarginLoss.toFixed(1)} p.p.`} highlight={quickProjectionMinMarginLoss > 0 ? 'danger' : undefined} />
            <MetricRow label={`Cenário +${projectionMaxExtra} ${unitLabel}`} value={`${quickProjectionMaxActual} ${unitLabel}`} />
            <MetricRow label={`Lucro no cenário +${projectionMaxExtra}`} value={formatCurrency(quickProjectionMaxProfit)} highlight={quickProjectionMaxProfit < 0 ? 'danger' : 'warning'} />
            <MetricRow label={`Margem no cenário +${projectionMaxExtra}`} value={`${quickProjectionMaxMargin.toFixed(1)}%`} highlight={quickProjectionMaxMargin < 0 ? 'danger' : 'warning'} />
            <MetricRow label={`Redução da margem (+${projectionMaxExtra})`} value={`${quickProjectionMaxMarginLoss.toFixed(1)} p.p.`} highlight={quickProjectionMaxMarginLoss > 0 ? 'danger' : undefined} />
          </div>
        </div>
      </div>
    </div>
  );
};

const InputField = ({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    />
  </div>
);

const ReadOnlyField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <div className="w-full h-10 rounded-lg border border-input bg-secondary/40 px-3 text-sm text-foreground flex items-center">
      {value}
    </div>
  </div>
);

const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const PriceCard = ({
  title,
  value,
  subtitle,
  variant,
  highlighted,
  unitsUsed,
  unitShortLabel,
  costPerUnit,
  additionalCostTotal,
  profit,
  margin,
  estimatedUnits,
  actualUnits,
  realCost,
  realProfit,
  realMargin,
}: {
  title: string;
  value: number;
  subtitle: string;
  variant: 'danger' | 'primary' | 'success';
  highlighted?: boolean;
  unitsUsed: number;
  unitShortLabel: string;
  costPerUnit: number;
  additionalCostTotal: number;
  profit: number;
  margin: number;
  estimatedUnits: number;
  actualUnits: number;
  realCost: number;
  realProfit: number;
  realMargin: number;
}) => {
  const valueClass = {
    danger: 'text-destructive',
    primary: 'text-primary',
    success: 'text-success',
  }[variant];
  const productCost = unitsUsed * costPerUnit;
  const totalCost = productCost + additionalCostTotal;
  const realProfitDelta = realProfit - profit;
  const realMarginDelta = realMargin - margin;
  const isRealBetter = actualUnits < estimatedUnits;
  const isRealWorse = actualUnits > estimatedUnits;
  const impactTone = isRealBetter ? 'success' : isRealWorse ? 'danger' : undefined;

  const impactMessage = isRealBetter
    ? `Voce ira faturar mais: ${formatCurrency(realProfitDelta)} de lucro extra e +${realMarginDelta.toFixed(1)} p.p. na margem.`
    : isRealWorse
      ? `Voce ira reduzir sua margem: ${Math.abs(realMarginDelta).toFixed(1)} p.p. e ${formatCurrency(Math.abs(realProfitDelta))} a menos de lucro.`
      : 'Pontos reais iguais aos estimados: sem variacao de lucro e margem.';

  return (
    <div
      className={`rounded-lg p-4 text-center ${
        highlighted ? 'border-2 border-primary bg-primary/[0.07]' : 'border border-border'
      }`}
    >
      <p
        className={`text-[10px] uppercase tracking-wide mb-1 font-semibold ${
          highlighted ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        {title}
      </p>
      <p className={`text-xl font-bold ${highlighted ? 'text-primary' : valueClass}`}>{formatCurrency(value)}</p>
      <p className={`text-[10px] mt-1 ${highlighted ? 'text-primary' : 'text-muted-foreground'}`}>{subtitle}</p>
      <div className="border-t border-border/70 mt-3 pt-3 space-y-1 text-left">
        <p className="text-[11px] text-muted-foreground">
          Custo produto: {unitsUsed} {unitShortLabel} x {formatCurrencyPrecise(costPerUnit)} ={' '}
          <strong className="text-foreground">{formatCurrency(productCost)}</strong>
        </p>
        <p className="text-[11px] text-muted-foreground">
          Custos adicionais: <strong className="text-foreground">{formatCurrency(additionalCostTotal)}</strong>
        </p>
        <p className="text-[11px] text-muted-foreground">
          Custo total: <strong className="text-foreground">{formatCurrency(totalCost)}</strong>
        </p>
        <p className="text-[11px] text-muted-foreground">
          Lucro: <strong className={profit >= 0 ? 'text-foreground' : 'text-destructive'}>{formatCurrency(profit)}</strong>
        </p>
        <p className="text-[11px] text-muted-foreground">
          Margem final: <strong className={margin >= 0 ? 'text-foreground' : 'text-destructive'}>{margin.toFixed(1)}%</strong>
        </p>
        <div className="border-t border-border/60 pt-2 mt-2" />
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md border border-border/70 p-2">
            <p className="text-muted-foreground mb-1">Estimado ({estimatedUnits} {unitShortLabel})</p>
            <p className="text-muted-foreground">Custo: <strong className="text-foreground">{formatCurrency(totalCost)}</strong></p>
            <p className="text-muted-foreground">Lucro: <strong className={profit >= 0 ? 'text-foreground' : 'text-destructive'}>{formatCurrency(profit)}</strong></p>
            <p className="text-muted-foreground">Margem: <strong className={margin >= 0 ? 'text-foreground' : 'text-destructive'}>{margin.toFixed(1)}%</strong></p>
          </div>
          <div className="rounded-md border border-border/70 p-2">
            <p className="text-muted-foreground mb-1">Real ({actualUnits} {unitShortLabel})</p>
            <p className="text-muted-foreground">Custo: <strong className="text-foreground">{formatCurrency(realCost)}</strong></p>
            <p className="text-muted-foreground">Lucro: <strong className={realProfit >= 0 ? 'text-foreground' : 'text-destructive'}>{formatCurrency(realProfit)}</strong></p>
            <p className="text-muted-foreground">Margem: <strong className={realMargin >= 0 ? 'text-foreground' : 'text-destructive'}>{realMargin.toFixed(1)}%</strong></p>
          </div>
        </div>
        <p className={`text-[11px] mt-2 ${impactTone === 'success' ? 'text-success' : impactTone === 'danger' ? 'text-destructive' : 'text-muted-foreground'}`}>
          {impactMessage}
        </p>
      </div>
    </div>
  );
};

const MetricBox = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border p-3">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-lg font-bold text-foreground">{value}</p>
  </div>
);

const MetricRow = ({ label, value, highlight }: { label: string; value: string; highlight?: 'success' | 'warning' | 'danger' }) => {
  const colorMap = { success: 'text-success', warning: 'text-warning', danger: 'text-destructive' };
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${highlight ? colorMap[highlight] : 'text-foreground'}`}>{value}</span>
    </div>
  );
};

export default PricingSimulator;
