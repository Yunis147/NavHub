import { useEffect, useState } from 'react';
import { getMapImageBuffer } from '../services/api';
import { parsePgm } from '../lib/pgm';
import { Icon } from './Icon';

export function MapThumbnail({ name }: { name: string }) {
  const [image, setImage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setImage(null);
    setFailed(false);
    getMapImageBuffer(name).then(buffer => {
      if (!active) return;
      const pixels = parsePgm(buffer);
      const canvas = document.createElement('canvas');
      canvas.width = pixels.width;
      canvas.height = pixels.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Map preview unavailable');
      context.putImageData(pixels, 0, 0);
      setImage(canvas.toDataURL('image/png'));
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [name]);
  return <div className="map-card-preview">{image ? <img src={image} alt={`Occupancy map preview of ${name}`} /> : <div className="thumbnail-placeholder"><Icon name="map" size={35} /><span>{failed ? 'Preview unavailable' : 'Loading preview…'}</span></div>}<span className="micro-badge">SAVED MAP</span></div>;
}
