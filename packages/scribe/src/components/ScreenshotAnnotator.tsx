'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ArrowRight,
  Circle,
  MousePointer2,
  Square,
  Type,
  Undo2,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Separator } from '@kit/ui/separator';

import type { AnnotationInput, AnnotationType } from '../types';

type Tool = AnnotationType | 'select';

interface ScreenshotAnnotatorProps {
  imageUrl: string;
  annotations: AnnotationInput[];
  onChange: (annotations: AnnotationInput[]) => void;
  color?: string;
}

interface DrawState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export function ScreenshotAnnotator({
  imageUrl,
  annotations,
  onChange,
  color = '#ff0000',
}: ScreenshotAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [drawState, setDrawState] = useState<DrawState>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  // Load image and render
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      render();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Re-render on annotation changes
  useEffect(() => {
    render();
  }, [annotations, drawState]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to image size
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Draw existing annotations
    for (const ann of annotations) {
      drawAnnotation(ctx, ann);
    }

    // Draw current annotation being created
    if (drawState.isDrawing && tool !== 'select') {
      const tempAnn: AnnotationInput = {
        annotationType: tool as AnnotationType,
        x: Math.min(drawState.startX, drawState.currentX),
        y: Math.min(drawState.startY, drawState.currentY),
        width: Math.abs(drawState.currentX - drawState.startX),
        height: Math.abs(drawState.currentY - drawState.startY),
        color,
        strokeWidth: 3,
        opacity: 0.8,
      };
      drawAnnotation(ctx, tempAnn);
    }
  }, [annotations, drawState, tool, color]);

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool === 'select') return;

      const { x, y } = getCanvasCoords(e);
      setDrawState({
        isDrawing: true,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
      });
    },
    [tool, getCanvasCoords],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawState.isDrawing) return;

      const { x, y } = getCanvasCoords(e);
      setDrawState((prev) => ({
        ...prev,
        currentX: x,
        currentY: y,
      }));
    },
    [drawState.isDrawing, getCanvasCoords],
  );

  const handleMouseUp = useCallback(() => {
    if (!drawState.isDrawing || tool === 'select') return;

    const width = Math.abs(drawState.currentX - drawState.startX);
    const height = Math.abs(drawState.currentY - drawState.startY);

    // Minimum size threshold
    if (width < 5 && height < 5) {
      setDrawState((prev) => ({ ...prev, isDrawing: false }));
      return;
    }

    const newAnnotation: AnnotationInput = {
      annotationType: tool as AnnotationType,
      x: Math.min(drawState.startX, drawState.currentX),
      y: Math.min(drawState.startY, drawState.currentY),
      width,
      height,
      color,
      strokeWidth: 3,
      opacity: 1,
      sortOrder: annotations.length,
    };

    onChange([...annotations, newAnnotation]);
    setDrawState((prev) => ({ ...prev, isDrawing: false }));
  }, [drawState, tool, color, annotations, onChange]);

  const handleUndo = useCallback(() => {
    if (annotations.length > 0) {
      onChange(annotations.slice(0, -1));
    }
  }, [annotations, onChange]);

  const toolItems: { tool: Tool; icon: React.ReactNode; label: string }[] = [
    { tool: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Select' },
    { tool: 'rectangle', icon: <Square className="h-4 w-4" />, label: 'Rectangle' },
    { tool: 'circle', icon: <Circle className="h-4 w-4" />, label: 'Circle' },
    { tool: 'arrow', icon: <ArrowRight className="h-4 w-4" />, label: 'Arrow' },
    { tool: 'text', icon: <Type className="h-4 w-4" />, label: 'Text' },
  ];

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1 rounded-md border p-1">
        {toolItems.map((item) => (
          <Button
            key={item.tool}
            variant={tool === item.tool ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTool(item.tool)}
            title={item.label}
            className="h-8 w-8 p-0"
          >
            {item.icon}
          </Button>
        ))}

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleUndo}
          disabled={annotations.length === 0}
          title="Undo"
          className="h-8 w-8 p-0"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div className="overflow-hidden rounded-md border">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
}

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  ann: AnnotationInput,
) {
  ctx.save();
  ctx.globalAlpha = ann.opacity ?? 1;
  ctx.strokeStyle = ann.color ?? '#ff0000';
  ctx.fillStyle = ann.color ?? '#ff0000';
  ctx.lineWidth = ann.strokeWidth ?? 3;

  const x = ann.x;
  const y = ann.y;
  const w = ann.width ?? 0;
  const h = ann.height ?? 0;

  switch (ann.annotationType) {
    case 'rectangle':
      ctx.strokeRect(x, y, w, h);
      break;

    case 'circle': {
      const rx = w / 2;
      const ry = h / 2;
      ctx.beginPath();
      ctx.ellipse(x + rx, y + ry, rx, ry, 0, 0, 2 * Math.PI);
      ctx.stroke();
      break;
    }

    case 'arrow': {
      const endX = x + w;
      const endY = y + h;
      const angle = Math.atan2(endY - y, endX - x);
      const headLen = 15;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLen * Math.cos(angle - Math.PI / 6),
        endY - headLen * Math.sin(angle - Math.PI / 6),
      );
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLen * Math.cos(angle + Math.PI / 6),
        endY - headLen * Math.sin(angle + Math.PI / 6),
      );
      ctx.stroke();
      break;
    }

    case 'highlight':
      ctx.globalAlpha = 0.3;
      ctx.fillRect(x, y, w, h);
      break;

    case 'blur':
      ctx.filter = 'blur(8px)';
      ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
      ctx.fillRect(x, y, w, h);
      ctx.filter = 'none';
      break;

    case 'text':
      ctx.font = `${ann.fontSize ?? 14}px sans-serif`;
      ctx.fillText(ann.textContent ?? '', x, y + (ann.fontSize ?? 14));
      break;

    case 'click_indicator': {
      const radius = 20;
      ctx.beginPath();
      ctx.arc(x + radius, y + radius, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#ff4444';
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}
