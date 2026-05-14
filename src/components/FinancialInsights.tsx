import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, Edit2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { PricingBaseDto } from '@/controllers/pricingBasesApi';

interface FinancialInsightsProps {
  points: number;
  costPerPoint: number;
  pricePerPoint: number;
  /** Sem card externo (uso dentro de coluna já com borda) */
  embedded?: boolean;
  /** Esconde o título "Insights Financeiros" (ex.: quando o modal já tem cabeçalho) */
  omitHeader?: boolean;
  /** Dados da simulação base salva no simulador de precificação */
  pricingBase?: PricingBaseDto | null;
  /** Chamado quando o usuário seleciona um cenário diferente (pontos) */
  onPointsChange?: (points: number) => void;
}

function sumAdditionalCosts(costs: PricingBaseDto['additionalCosts']): number {
  return (costs?.supplies ?? 0) + (costs?.ppeAndHygiene ?? 0) + (costs?.cardFee ?? 0) + (costs?.fixedClinicShare ?? 0);
}

function deriveFromBase(base: PricingBaseDto) {
  const additionalTotal = sumAdditionalCosts(base.additionalCosts);
  const isBotox = base.procedureId === 'botox';
  const costPerUnit = isBotox
    ? (base.botoxVialPrice ?? 0) / Math.max(base.botoxPointsPerVial ?? 1, 1)
    : (base.costPerUnit ?? 0);
  const marginRatio = (base.desiredMargin ?? 0) / 100;
  const baseEstimatedCost = (base.estimatedUnits ?? 0) * costPerUnit + additionalTotal;
  const baseTotalPrice = baseEstimatedCost * (1 + marginRatio);
  const pricePerUnit = (base.estimatedUnits ?? 0) > 0 ? baseTotalPrice / (base.estimatedUnits ?? 1) : 0;
  return { costPerUnit, pricePerUnit, additionalTotal, baseTotalPrice };
}

const SCENARIO_POINTS = [20, 30, 40] as const;

const FinancialInsights = ({
  points,
  costPerPoint,
  pricePerPoint,
  embedded,
  omitHeader,
  pricingBase,
  onPointsChange,
}: FinancialInsightsProps) => {
  // Derived values from pricing base (if available).
  const derived = pricingBase ? deriveFromBase(pricingBase) : null;

  // Current scenario - editable points with base values or fallback to props
  const basePoints = derived ? (pricingBase?.estimatedUnits ?? points) : points;
  const [currentPoints, setCurrentPoints] = useState(basePoints);
  const [isEditingPoints, setIsEditingPoints] = useState(false);
  const [tempPoints, setTempPoints] = useState(String(basePoints));
  
  // Track initial base load to prevent overwriting user changes
  const lastBaseIdRef = useRef<string | null>(null);

  // Initialize only when pricingBase changes (not on every render)
  useEffect(() => {
    const baseId = pricingBase?._id ?? (pricingBase ? 'fallback' : 'null');
    if (baseId !== lastBaseIdRef.current) {
      lastBaseIdRef.current = baseId;
      const newPoints = derived ? (pricingBase?.estimatedUnits ?? points) : points;
      setCurrentPoints(newPoints);
      setTempPoints(String(newPoints));
    }
  }, [pricingBase?._id, derived]);

  // Calculate current scenario values
  const currentCostPerUnit = derived ? derived.costPerUnit : costPerPoint;
  const currentPricePerUnit = derived ? derived.pricePerUnit : pricePerPoint;
  const currentAdditionalTotal = derived ? derived.additionalTotal : 0;

  const totalCost = currentPoints * currentCostPerUnit + currentAdditionalTotal;
  const totalRevenue = currentPoints * currentPricePerUnit;
  const profit = totalRevenue - totalCost;
  const margin = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  // Error scenario state
  const errorRefPoints = derived ? (pricingBase!.estimatedUnits ?? currentPoints) : currentPoints;
  const [errorPoints, setErrorPoints] = useState(Math.round(errorRefPoints * 1.5));
  const errorMax = Math.round(errorRefPoints * 3);

  // Recalculate error using base values when available.
  const errorChargedRevenue = derived
    ? derived.baseTotalPrice
    : totalRevenue;
  const errorCost = derived
    ? errorPoints * derived.costPerUnit + derived.additionalTotal
    : errorPoints * costPerPoint;
  const errorProfit = errorChargedRevenue - errorCost;
  const errorMargin = errorCost > 0 ? (errorProfit / errorCost) * 100 : 0;
  const baseProfit = derived
    ? derived.baseTotalPrice - (errorRefPoints * derived.costPerUnit + derived.additionalTotal)
    : profit;
  const lostProfit = baseProfit - errorProfit;

  const handlePointsSubmit = () => {
    const val = parseInt(tempPoints, 10);
    if (!isNaN(val) && val > 0) {
      setCurrentPoints(val);
      onPointsChange?.(val);
    } else {
      setTempPoints(String(currentPoints));
    }
    setIsEditingPoints(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePointsSubmit();
    } else if (e.key === 'Escape') {
      setTempPoints(String(currentPoints));
      setIsEditingPoints(false);
    }
  };

  return (
    <div className={embedded ? 'space-y-3' : 'bg-card rounded-xl p-5 shadow-card space-y-4'}>
      {!omitHeader && (
        <h4 className={`font-display font-semibold text-foreground flex items-center gap-2 ${embedded ? 'text-sm' : ''}`}>
          <DollarSign className="w-4 h-4 text-primary shrink-0" />
          Insights Financeiros
        </h4>
      )}

      {/* Current scenario — editable points with base data */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Cenário Atual
          </p>
          <div className="flex items-center gap-2">
            {isEditingPoints ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={tempPoints}
                  onChange={(e) => setTempPoints(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handlePointsSubmit}
                  className="w-16 h-7 text-xs px-2"
                  autoFocus
                />
                <span className="text-xs text-muted-foreground">pts</span>
                <button
                  onClick={handlePointsSubmit}
                  className="p-1 rounded bg-primary text-primary-foreground hover:opacity-80"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTempPoints(String(currentPoints));
                  setIsEditingPoints(true);
                }}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {currentPoints} pts
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 w-30">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-baseline justify">
              <span className="text-[12px] text-muted-foreground mr-1">Custo: </span>
              <span className="text-[15px] font-semibold text-foreground">R$ {totalCost.toFixed(0)}</span>
            </div>
            <div className="flex items-baseline justify">
              <span className="text-[12px] text-muted-foreground mr-1">Valor: </span>
              <span className="text-[16px] font-bold text-primary">R$ {totalRevenue.toFixed(0)}</span>
            </div>
            <div className="flex items-baseline justify">
              <span className="text-[12px] text-muted-foreground mr-1">Lucro: </span>
              <span className={`text-[15px] font-semibold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                R$ {profit.toFixed(0)}
              </span>
            </div>
            <div className="flex items-baseline justify">
              <span className="text-[12px] text-muted-foreground mr-1">Margem</span>
              <span className="text-[15px] font-semibold text-primary">{margin.toFixed(1)}%</span>
            </div>
          </div>
          {derived && (
            <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-primary/20">
              Base: {pricingBase?.procedureId === 'botox' ? 'Botox' : 'Procedimento'} · Margem {pricingBase?.desiredMargin}%
            </p>
          )}
        </div>
      </div>

      {/* Comparative scenarios */}
      <div className="border-t border-border pt-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Target className="w-3 h-3" />
          Cenários comparativos
        </p>

        {!derived ? (
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
              <p className="text-xs font-semibold text-foreground">Nenhuma base salva</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Salve uma simulação base no Simulador de Precificação para habilitar comparativos dinâmicos.
            </p>
            <Link
              to="/simulador-precos"
              className="text-xs font-medium text-primary hover:underline"
            >
              Abrir simulador →
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-muted-foreground">
              Custo/ponto: <strong>R$ {derived.costPerUnit.toFixed(2)}</strong> · 
              Preço/ponto: <strong>R$ {derived.pricePerUnit.toFixed(2)}</strong> · 
              Custos adicionais: <strong>R$ {derived.additionalTotal.toFixed(0)}</strong>
            </p>
            
            <div className="grid grid-cols-3 gap-2">
              {SCENARIO_POINTS.map((n) => {
                const sCost = n * derived.costPerUnit + derived.additionalTotal;
                const sRevenue = n * derived.pricePerUnit;
                const sProfit = sRevenue - sCost;
                const sMargin = sCost > 0 ? (sProfit / sCost) * 100 : 0;
                const isClosest = n === currentPoints;

                return (
                  <button
                    key={n}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPoints(n);
                      setTempPoints(String(n));
                      onPointsChange?.(n);
                    }}
                    className={`rounded-lg p-3 text-center border transition-all hover:border-primary/50 ${
                      isClosest ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:bg-secondary/30'
                    }`}
                  >
                    <div className="flex justify-center mb-3">
                      <span className={`text-[11px] font-bold uppercase tracking-wide ${isClosest ? 'text-primary' : 'text-muted-foreground'}`}>
                        {n} pts
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 text-[11px]">
                      <div className="flex justify-between items-baseline">
                        <span className="text-muted-foreground mr-1">Custo</span>
                        <span className="font-semibold text-foreground text-[14px]">R$ {sCost.toFixed(0)}</span>
                      </div>

                      <div className="flex justify-between items-baseline">
                        <span className="text-muted-foreground mr-1">Valor</span>
                        <span className="font-bold text-primary text-[15px]">R$ {sRevenue.toFixed(0)}</span>
                      </div>

                      <div className="flex justify-between items-baseline">
                        <span className="text-muted-foreground mr-1">Lucro</span>
                        <span className={`font-semibold text-[14px] ${sProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          R$ {sProfit.toFixed(0)}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline pt-1.5 border-t border-border/40">
                        <span className="text-muted-foreground mr-1">Margem</span>
                        <span className={`font-semibold text-[14px] ${sMargin >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {sMargin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Trend note */}
            {(() => {
              const cost20 = 20 * derived.costPerUnit + derived.additionalTotal;
              const profit20 = 20 * derived.pricePerUnit - cost20;
              const cost40 = 40 * derived.costPerUnit + derived.additionalTotal;
              const profit40 = 40 * derived.pricePerUnit - cost40;
              const diff = profit40 - profit20;
              return (
                <div className={`rounded-lg p-2 ${diff > 0 ? 'bg-success/10' : 'bg-warning/10'}`}>
                  <div className="flex items-center gap-2">
                    {diff > 0 ? <TrendingUp className="w-3 h-3 text-success" /> : <TrendingDown className="w-3 h-3 text-warning" />}
                    <p className="text-[11px] text-muted-foreground">
                      De 20 → 40 pts: lucro {diff > 0 ? '+' : ''}{diff > 0 ? 'aumenta' : 'reduz'} <strong className={diff > 0 ? 'text-success' : 'text-destructive'}>R$ {Math.abs(diff).toFixed(0)}</strong>
                    </p>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Error scenario */}
      {derived && (
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs font-medium text-destructive uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Erro de Avaliação
          </p>
          <p className="text-[11px] text-muted-foreground">
            Estimativa: <strong>{pricingBase!.estimatedUnits} pts</strong> cobrados a <strong>R$ {derived.baseTotalPrice.toFixed(0)}</strong>
          </p>

          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Pts aplicados:</label>
            <div className="relative flex-1 h-2 bg-secondary rounded-full">
              <div
                className="absolute h-full rounded-full bg-destructive transition-all"
                style={{ width: `${Math.min(((errorPoints - errorRefPoints) / Math.max(errorMax - errorRefPoints, 1)) * 100, 100)}%` }}
              />
              <input
                type="range"
                min={errorRefPoints}
                max={errorMax}
                value={errorPoints}
                onChange={(e) => setErrorPoints(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-destructive border-2 border-destructive-foreground shadow-md pointer-events-none transition-all"
                style={{ left: `calc(${Math.min(((errorPoints - errorRefPoints) / Math.max(errorMax - errorRefPoints, 1)) * 100, 100)}% - 8px)` }}
              />
            </div>
            <span className="text-sm font-bold text-destructive min-w-[3ch]">{errorPoints}</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg p-2 border border-destructive/30 bg-destructive/5 text-center">
              <p className="text-[10px] text-muted-foreground">Custo</p>
              <p className="text-sm font-semibold text-foreground">R$ {errorCost.toFixed(0)}</p>
            </div>
            <div className="rounded-lg p-2 border border-destructive/30 bg-destructive/5 text-center">
              <p className="text-[10px] text-muted-foreground">Cobrado</p>
              <p className="text-sm font-semibold text-foreground">R$ {errorChargedRevenue.toFixed(0)}</p>
            </div>
            <div className="rounded-lg p-2 border border-destructive/30 bg-destructive/5 text-center">
              <p className="text-[10px] text-muted-foreground">Lucro</p>
              <p className={`text-sm font-semibold ${errorProfit >= 0 ? 'text-warning' : 'text-destructive'}`}>
                R$ {errorProfit.toFixed(0)}
              </p>
            </div>
            <div className="rounded-lg p-2 border border-destructive/30 bg-destructive/5 text-center">
              <p className="text-[10px] text-muted-foreground">Margem</p>
              <p className={`text-sm font-semibold ${errorMargin >= 0 ? 'text-warning' : 'text-destructive'}`}>
                {errorMargin.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialInsights;
