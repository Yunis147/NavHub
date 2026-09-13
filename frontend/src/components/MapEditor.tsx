import { useEffect, useRef, useState, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva';
import type Konva from 'konva';
import { getMapImageBuffer, saveMapImageBuffer } from '../services/api';
import { parsePgm, encodePgm } from '../lib/pgm';

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

  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [htmlImageElement, setHtmlImageElement] = useState<HTMLImageElement | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [brushSize, setBrushSize] = useState(10);
  const [brushMode, setBrushMode] = useState<'draw' | 'erase'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-all">
      <div className="flex w-full max-w-5xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Map Editor</h3>
              <p className="text-sm text-slate-400 mt-1">Editing map: <span className="font-mono text-emerald-400">{mapName}</span></p>
            </div>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 gap-6 p-6">
          {/* Canvas area */}
          <div className="flex-1 flex flex-col rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shadow-inner">
            <div className="flex-1 flex items-center justify-center bg-slate-950 p-4 relative">
              {htmlImageElement && imageSize ? (
                <div className="bg-slate-900 ring-2 ring-slate-800 rounded-lg overflow-hidden shadow-xl"
                  style={{ width: imageSize.width * scale, height: imageSize.height * scale }}
                >
                  <Stage
                    ref={stageRef}
                    width={imageSize.width * scale}
                    height={imageSize.height * scale}
                    scaleX={scale}
                    scaleY={scale}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseUp} // Stop drawing if mouse leaves canvas
                  >
                    <Layer>
                      <KonvaImage image={htmlImageElement} />
                      {strokes.map((stroke, i) => (
                        <Line
                          key={i}
                          points={stroke.points}
                          stroke={stroke.tool === 'draw' ? 'black' : '#FEFEFE'}
                          strokeWidth={stroke.size}
                          tension={0}
                          lineCap="round"
                          lineJoin="round"
                        />
                      ))}
                    </Layer>
                  </Stage>
                </div>
              ) : parseError ? (
                <div className="flex flex-col items-center gap-2 text-red-400">
                  <svg className="h-12 w-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm">{parseError}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <svg className="h-10 w-10 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-sm font-medium animate-pulse">Loading Map Images...</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Tools */}
          <div className="w-56 space-y-5 rounded-xl bg-slate-800/80 border border-slate-700 p-5 overflow-y-auto">
            <div>
              <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                Brush Tool
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setBrushMode('draw')}
                    className={`flex-1 rounded-lg px-2 py-2.5 text-xs font-medium transition-all shadow-sm ${
                      brushMode === 'draw'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-500/50'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    ✏ Obstacle
                  </button>
                  <button
                    onClick={() => setBrushMode('erase')}
                    className={`flex-1 rounded-lg px-2 py-2.5 text-xs font-medium transition-all shadow-sm ${
                      brushMode === 'erase'
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/50'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    ⬜ Free
                  </button>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-slate-300 font-medium">Brush Size</label>
                    <span className="text-xs font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">{brushSize} px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>

                <button
                  onClick={undo}
                  disabled={strokes.length === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Undo Last Stroke
                </button>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-5">
              <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                Map Legend
              </div>
              <div className="space-y-2.5 text-xs font-medium text-slate-300">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-sm bg-white ring-1 ring-slate-400 shadow-sm" />
                  <span>Free space</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-sm bg-black ring-1 ring-slate-600 shadow-sm" />
                  <span>Obstacle</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-sm bg-[#CDCDCD] ring-1 ring-slate-600 shadow-sm" />
                  <span>Unknown</span>
                </div>
              </div>
            </div>

            {parseError && (
              <div className="rounded-lg bg-red-950/80 border border-red-900/50 p-3 text-xs text-red-400 font-medium">
                {parseError}
              </div>
            )}

            <div className="border-t border-slate-700 pt-5 mt-auto">
              <button
                onClick={() => void save()}
                disabled={isSaving || !htmlImageElement}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSaving ? 'Saving map...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
