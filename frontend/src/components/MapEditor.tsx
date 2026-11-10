import { useEffect, useRef, useState, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva';
import type Konva from 'konva';
import { getMapImageBuffer, saveMapImageBuffer } from '../services/api';
import { parsePgm, encodePgm } from '../lib/pgm';
import { Icon } from './Icon';

interface MapEditorProps {
  mapName: string;
  onClose: () => void;
}

type Stroke = {
  tool: 'draw' | 'erase';
  points: number[];
  size: number;
};

export function MapEditor({ mapName, onClose }: MapEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);

  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [htmlImageElement, setHtmlImageElement] = useState<HTMLImageElement | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [brushSize, setBrushSize] = useState(10);
  const [brushMode, setBrushMode] = useState<'draw' | 'erase'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  savingRef.current = isSaving;

  // Keep keyboard focus inside the editor and return it to its opener on close.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.querySelector<HTMLButtonElement>('button')?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingRef.current) {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  // Layout limits for the Konva stage viewport
  const VIEWPORT_SIZE = 600;

  // Load map image as ArrayBuffer, parse to PGM, convert to HTMLImageElement
  useEffect(() => {
    let active = true;
    const loadImage = async () => {
      try {
        const buffer = await getMapImageBuffer(mapName);
        if (!active) return;
        const imgData = parsePgm(buffer);

        // Put ImageData onto a temporary canvas to get a data URL
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imgData.width;
        tempCanvas.height = imgData.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.putImageData(imgData, 0, 0);

        const dataUrl = tempCanvas.toDataURL('image/png');

        const img = new window.Image();
        img.src = dataUrl;
        img.onload = () => {
          if (!active) return;
          setImageSize({ width: img.width, height: img.height });
          setHtmlImageElement(img);
        };
      } catch (e) {
        if (!active) return;
        setParseError(e instanceof Error ? e.message : String(e));
      }
    };
    loadImage();
    return () => { active = false; };
  }, [mapName]);

  // Determine scale to fit the image into the 600px viewport
  const scale = useMemo(() => {
    if (!imageSize) return 1;
    return Math.min(VIEWPORT_SIZE / imageSize.width, VIEWPORT_SIZE / imageSize.height);
  }, [imageSize]);

  const handleMouseDown = () => {
    setIsDrawing(true);
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    // Account for scale to save coordinates relative to the original image!
    const unscaledX = pos.x / scale;
    const unscaledY = pos.y / scale;
    setStrokes([...strokes, { tool: brushMode, points: [unscaledX, unscaledY], size: brushSize }]);
  };

  const handleMouseMove = () => {
    if (!isDrawing) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const unscaledX = pos.x / scale;
    const unscaledY = pos.y / scale;

    const lastStroke = { ...strokes[strokes.length - 1] };
    lastStroke.points = lastStroke.points.concat([unscaledX, unscaledY]);

    // Replace last
    strokes.splice(strokes.length - 1, 1, lastStroke);
    setStrokes([...strokes]);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const save = async () => {
    if (!imageSize || !htmlImageElement) return;
    setIsSaving(true);
    setParseError(null);
    try {
      // 1. Create an offscreen canvas AT ORIGINAL RESOLUTION
      const offCanvas = document.createElement('canvas');
      offCanvas.width = imageSize.width;
      offCanvas.height = imageSize.height;
      const octx = offCanvas.getContext('2d', { willReadFrequently: true })!;
      octx.imageSmoothingEnabled = false;

      // 2. Draw the base map
      octx.drawImage(htmlImageElement, 0, 0);

      // 3. Replay strokes
      octx.lineCap = 'round';
      octx.lineJoin = 'round';
      strokes.forEach(stroke => {
        // Draw Obstacle = Black, Erase = White (Free)
        octx.strokeStyle = stroke.tool === 'draw' ? 'rgb(0, 0, 0)' : 'rgb(254, 254, 254)';
        octx.lineWidth = stroke.size;
        octx.beginPath();
        for (let i = 0; i < stroke.points.length; i += 2) {
          const x = stroke.points[i];
          const y = stroke.points[i+1];
          if (i === 0) octx.moveTo(x, y);
          else octx.lineTo(x, y);
        }
        octx.stroke();
      });

      // 4. Extract pixel data and encode to PGM
      const editedImgData = octx.getImageData(0, 0, offCanvas.width, offCanvas.height);
      const encodedBytes = encodePgm(editedImgData);

      // 5. Send to backend
      await saveMapImageBuffer(mapName, encodedBytes);

      onClose(); // Auto-close on success
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Failed to save map');
    } finally {
      setIsSaving(false);
    }
  };

  const undo = () => {
    if (strokes.length > 0) {
      setStrokes(strokes.slice(0, -1));
    }
  };

  return (
    <div className="editor-overlay">
      <div ref={dialogRef} className="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <header className="editor-header"><div><div className="eyebrow">MAP EDITOR</div><h2 id="editor-title">{mapName}</h2></div><button type="button" onClick={onClose} disabled={isSaving} className="button secondary"><Icon name="close" size={15} />Close</button></header>
        <div className="editor-layout">
          <div className="editor-canvas-panel">
            <div className="editor-canvas-label"><span>OCCUPANCY GRID</span><span>{imageSize ? `${imageSize.width} × ${imageSize.height} PX` : 'LOADING'}</span></div>
            <div className="editor-canvas-area">
              {htmlImageElement && imageSize ? <div style={{ width: imageSize.width * scale, height: imageSize.height * scale, flexShrink: 0 }}>
                <Stage ref={stageRef} width={imageSize.width * scale} height={imageSize.height * scale} scaleX={scale} scaleY={scale} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} onMouseLeave={handleMouseUp}>
                  <Layer><KonvaImage image={htmlImageElement} />{strokes.map((stroke, i) => <Line key={i} points={stroke.points} stroke={stroke.tool === 'draw' ? 'black' : '#FEFEFE'} strokeWidth={stroke.size} tension={0} lineCap="round" lineJoin="round" />)}</Layer>
                </Stage>
              </div> : parseError ? <div className="empty-state" role="alert"><Icon name="offline" size={26} /><p className="inline-error">{parseError}</p></div> : <div className="empty-state" role="status"><div className="loading-indicator" /><h3>Loading your map</h3><p>Preparing the saved occupancy grid for editing.</p></div>}
            </div>
          </div>
          <aside className="editor-tools" aria-label="Map editing tools">
            <div><h3>Brush tool</h3><div className="editor-brush-modes"><button type="button" onClick={() => setBrushMode('draw')} aria-pressed={brushMode === 'draw'} className={`button ${brushMode === 'draw' ? 'primary' : 'secondary'}`}><Icon name="edit" size={13} />Obstacle</button><button type="button" onClick={() => setBrushMode('erase')} aria-pressed={brushMode === 'erase'} className={`button ${brushMode === 'erase' ? 'primary' : 'secondary'}`}>Free space</button></div><div className="editor-brush-label"><label htmlFor="brush-size">Brush size</label><strong>{brushSize} px</strong></div><input id="brush-size" type="range" min="1" max="60" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} /><button type="button" onClick={undo} disabled={strokes.length === 0} className="button secondary full-width"><Icon name="rotateLeft" size={14} />Undo last stroke</button></div>
            <div className="editor-legend"><h3>Map legend</h3><div><i style={{ background: '#fefefe' }} />Free space</div><div><i style={{ background: '#000' }} />Obstacle</div><div><i style={{ background: '#cdcdcd' }} />Unknown</div><p>Edits are saved at the original pixel resolution. Map scale and origin are preserved.</p></div>
            {parseError && <p className="inline-error" role="alert">{parseError}</p>}
            <button type="button" onClick={() => void save()} disabled={isSaving || !htmlImageElement} className="button primary full-width"><Icon name="save" size={15} />{isSaving ? 'Saving map…' : 'Save Changes'}</button>
          </aside>
        </div>
      </div>
    </div>
  );
}
