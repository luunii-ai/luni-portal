import { useState } from 'react';
import { botoxFacialPoints } from '@/data/mockData';
import { apiCoordToPercent, type EnhanceApiPoint } from '@/controllers/enhanceApi';

interface FacialPointsOverlayProps {
  image: string;
  activePoints: number[];
  onTogglePoint?: (pointId: number) => void;
  /** Pontos retornados pela API (coordenadas normalizadas 0–1). */
  apiPoints?: EnhanceApiPoint[];
  activeApiIndices?: number[];
  onToggleApiIndex?: (index: number) => void;
}

const FacialPointsOverlay = ({
  image,
  activePoints,
  onTogglePoint,
  apiPoints,
  activeApiIndices = [],
  onToggleApiIndex,
}: FacialPointsOverlayProps) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [hoveredApiIndex, setHoveredApiIndex] = useState<number | null>(null);

  const regions = Array.from(new Set(botoxFacialPoints.map((p) => p.region)));
  const useApi = Boolean(apiPoints?.length);

  if (useApi && apiPoints) {
    return (
      <div className="space-y-4">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-secondary">
          <img src={image} alt="Pontos faciais" className="h-full w-full object-cover" draggable={false} />

          {apiPoints.map((point, index) => {
            const isActive = activeApiIndices.includes(index);
            const isHovered = hoveredApiIndex === index;
            const left = apiCoordToPercent(point.x);
            const top = apiCoordToPercent(point.y);
            return (
              <button
                key={index}
                type="button"
                className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 transform rounded-full border-2 transition-all ${
                  isActive
                    ? 'scale-110 border-primary-foreground bg-primary shadow-primary'
                    : 'border-card/80 bg-muted-foreground/50 hover:scale-110'
                }`}
                style={{ left: `${left}%`, top: `${top}%` }}
                onMouseEnter={() => setHoveredApiIndex(index)}
                onMouseLeave={() => setHoveredApiIndex(null)}
                onClick={() => onToggleApiIndex?.(index)}
              >
                {isHovered && (
                  <div className="absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background">
                    {point.pixel_x !== undefined && point.pixel_y !== undefined
                      ? `(${point.pixel_x.toFixed(0)}, ${point.pixel_y.toFixed(0)}) px`
                      : `Ponto ${index + 1} — (${left.toFixed(1)}%, ${top.toFixed(1)}%)`}
                    <div className="absolute left-1/2 top-full -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-3 rounded-xl bg-card p-4 shadow-card">
          <h4 className="font-display text-sm font-semibold text-foreground">Pontos da simulação (IA)</h4>
          <p className="text-xs text-muted-foreground">
            Coordenadas enviadas pelo back-end. Toque para incluir ou excluir do cálculo financeiro.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {apiPoints.map((_, index) => {
              const isActive = activeApiIndices.includes(index);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onToggleApiIndex?.(index)}
                  className={`rounded-full border px-2 py-1 text-[11px] transition-all ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-secondary text-secondary-foreground hover:border-primary/50'
                  }`}
                >
                  Ponto {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-secondary">
        <img src={image} alt="Pontos faciais" className="h-full w-full object-cover" />

        {botoxFacialPoints.map((point) => {
          const isActive = activePoints.includes(point.id);
          const isHovered = hoveredPoint === point.id;
          return (
            <button
              key={point.id}
              type="button"
              className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 transform rounded-full border-2 transition-all ${
                isActive
                  ? 'scale-110 border-primary-foreground bg-primary shadow-primary'
                  : 'border-card/80 bg-muted-foreground/50 hover:scale-110'
              }`}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              onMouseEnter={() => setHoveredPoint(point.id)}
              onMouseLeave={() => setHoveredPoint(null)}
              onClick={() => onTogglePoint?.(point.id)}
            >
              {isHovered && (
                <div className="absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background">
                  {point.name}
                  <div className="absolute left-1/2 top-full -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-3 rounded-xl bg-card p-4 shadow-card">
        <h4 className="font-display text-sm font-semibold text-foreground">Pontos de Aplicação</h4>
        {regions.map((region) => (
          <div key={region}>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{region}</p>
            <div className="flex flex-wrap gap-1.5">
              {botoxFacialPoints
                .filter((p) => p.region === region)
                .map((point) => {
                  const isActive = activePoints.includes(point.id);
                  return (
                    <button
                      key={point.id}
                      type="button"
                      onClick={() => onTogglePoint?.(point.id)}
                      className={`rounded-full border px-2 py-1 text-[11px] transition-all ${
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-secondary text-secondary-foreground hover:border-primary/50'
                      }`}
                    >
                      {point.name}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FacialPointsOverlay;
