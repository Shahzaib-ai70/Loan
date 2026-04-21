import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

type SignaturePadProps = {
  value: string;
  onChange: (dataUrl: string) => void;
  showHeader?: boolean;
  showHelp?: boolean;
  title?: string;
  canvasHeightClassName?: string;
};

type Point = { x: number; y: number };

export function SignaturePad({
  value,
  onChange,
  showHeader = true,
  showHelp = true,
  title = 'Signature',
  canvasHeightClassName = 'h-40',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const lastPointRef = useRef<Point | null>(null);

  const ratio = useMemo(() => Math.max(1, Math.floor(window.devicePixelRatio || 1)), []);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0b4a90';

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = value;
      setHasInk(true);
    } else {
      ctx.clearRect(0, 0, width, height);
      setHasInk(false);
    }
  };

  useEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    resizeCanvas();
  }, [value]);

  const getPoint = (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const commit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasInk) {
      onChange('');
      return;
    }
    onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    lastPointRef.current = null;
    setHasInk(false);
    onChange('');
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const p = getPoint(e);
    lastPointRef.current = p;
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = getPoint(e);
    const last = lastPointRef.current;
    if (!last) {
      lastPointRef.current = p;
      return;
    }
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
    setHasInk(true);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(false);
    lastPointRef.current = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
    }
    commit();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold text-slate-900">{title}</div>
          <button
            type="button"
            className="text-xs font-bold uppercase tracking-wide text-[#0b4a90] hover:underline"
            onClick={clear}
          >
            Clear
          </button>
        </div>
      )}
      <div className={`${showHeader ? 'mt-3' : ''} rounded-lg border border-slate-200 bg-[#f8fbff]`}>
        <canvas
          ref={canvasRef}
          className={`${canvasHeightClassName} w-full touch-none`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </div>
      {showHelp && (
        <div className="mt-2 text-xs text-slate-500">
          Sign inside the box using mouse or finger.
        </div>
      )}
    </div>
  );
}
