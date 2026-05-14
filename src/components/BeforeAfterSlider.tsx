import { useState, useRef, useCallback } from 'react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}

const imgLayerClass =
  'absolute inset-0 h-full w-full object-contain object-center pointer-events-none select-none';

const BeforeAfterSlider = ({
  beforeImage,
  afterImage,
  beforeLabel = 'Antes',
  afterLabel = 'Depois',
}: BeforeAfterSliderProps) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  }, []);

  const handleMouseDown = () => {
    isDragging.current = true;
  };
  const handleMouseUp = () => {
    isDragging.current = false;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) handleMove(e.clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  /** Recorta pela direita: só a faixa esquerda (0…sliderPosition%) mostra o “antes”, alinhado ao “depois” por baixo. */
  const beforeClipPath = `inset(0 ${100 - sliderPosition}% 0 0)`;

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[min(52vh,420px)] w-full max-w-full flex-1 cursor-col-resize select-none overflow-hidden rounded-xl bg-secondary/40 touch-none xl:min-h-0"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
    >
      {/* Depois: camada base — mesmo enquadramento que o “antes” */}
      <img
        src={afterImage}
        alt="Depois"
        draggable={false}
        className={`${imgLayerClass} z-0`}
      />

      {/* Antes: mesma caixa e object-fit; clip-path revela só a metade esquerda (até o slider) */}
      <div
        className="absolute inset-0 z-[1] overflow-hidden"
        style={{ clipPath: beforeClipPath, WebkitClipPath: beforeClipPath }}
      >
        <img
          src={beforeImage}
          alt="Antes"
          draggable={false}
          className={imgLayerClass}
        />
      </div>

      {/* Linha do slider */}
      <div
        className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-primary-foreground"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div
          className="pointer-events-auto absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full bg-card shadow-elevated active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-primary">
            <path
              d="M5 3L2 8L5 13"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M11 3L14 8L11 13"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full bg-card/80 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
        {beforeLabel}
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-20 rounded-full gradient-primary px-3 py-1 text-xs font-medium text-primary-foreground">
        {afterLabel}
      </div>
    </div>
  );
};

export default BeforeAfterSlider;
