import { useEffect, useState } from 'react';
import { listMaps, deleteMap, type MapInfo } from '../services/api';
import { MapEditor } from '../components/MapEditor';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHeading, EmptyState } from '../components/WorkspaceUI';
import { MapThumbnail } from '../components/MapThumbnail';

export default function MapsPage() {
  const [maps, setMaps] = useState<MapInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMap, setEditingMap] = useState<string | null>(null);
  const [thumbnailRevisions, setThumbnailRevisions] = useState<Record<string, number>>({});

  const loadMaps = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMaps();
      setMaps(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load maps');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaps();
  }, []);

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the map '${name}'? This will also delete all associated waypoints.`)) {
      return;
    }
    try {
      await deleteMap(name);
      await loadMaps();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete map');
    }
  };

  return (
    <div className="workspace-page maps-page">
      {editingMap && <MapEditor mapName={editingMap} onClose={() => { setThumbnailRevisions(revisions => ({ ...revisions, [editingMap]: (revisions[editingMap] || 0) + 1 })); setEditingMap(null); }} />}
      <PageHeading eyebrow="YOUR ENVIRONMENT, ORGANIZED" title="A world of possibilities" description="Your saved spaces. Ready for the next mission.">
        <button type="button" onClick={() => void loadMaps()} disabled={loading} className="button secondary"><Icon name="refresh" size={15} />Refresh</button>
        <Link className="button primary" to="/mapping"><Icon name="plus" size={16} />Create a map</Link>
      </PageHeading>
      <div className="library-stats">
        <div className="panel library-stat"><Icon name="layers" size={22} /><div><span>Saved environments</span><strong>{loading || error ? '—' : String(maps.length).padStart(2, '0')} <small>maps</small></strong></div></div>
        <div className="panel library-stat"><Icon name="map" size={22} /><div><span>Map format</span><strong>PGM <small>+ YAML</small></strong></div></div>
        <div className="panel library-stat"><Icon name="edit" size={22} /><div><span>Built-in editor</span><strong>Pixel <small>precision</small></strong></div></div>
      </div>
      <div className="library-toolbar"><h2>Map library <span>{!loading && !error && `(${maps.length})`}</span></h2><span>Most recent first</span></div>
      {loading ? <div className="panel library-empty"><div className="empty-state" role="status"><div className="loading-indicator" /><h3>Loading your environments</h3><p>Retrieving saved maps from NavHub.</p></div></div> : error ? <div className="panel library-empty library-error" role="alert"><EmptyState icon="offline" title="Your map library is unavailable" description="We couldn't load saved maps. Make sure the NavHub server is running, then try again."><button type="button" onClick={() => void loadMaps()} className="button secondary"><Icon name="refresh" size={15} />Try again</button><p className="error-detail">{error}</p></EmptyState></div> : maps.length === 0 ? <div className="panel library-empty"><EmptyState icon="map" title="Your first map starts with a little exploration" description="Start a mapping session, drive around your environment, and save your map. It will be waiting right here."><Link to="/mapping" className="button primary">Start exploring<Icon name="arrow" size={16} /></Link></EmptyState></div> : <div className="map-library-grid">{maps.map(map => <article key={map.name} className="panel map-card">
        <MapThumbnail key={`${map.name}-${thumbnailRevisions[map.name] || 0}`} name={map.name} />
        <div className="map-card-body">
          <div className="map-card-title"><h3>{map.name}</h3><Icon name="map" size={17} className="text-slate-400" /></div>
          <div className="map-card-meta"><div><span>Resolution</span><strong>{map.resolution.toFixed(3)} m/px</strong></div><div><span>Map origin</span><strong>[{map.origin.map(x => x.toFixed(2)).join(', ')}]</strong></div></div>
          <div className="map-card-footer"><button type="button" onClick={() => setEditingMap(map.name)} className="button secondary"><Icon name="edit" size={14} />Edit Map</button><button type="button" onClick={() => void handleDelete(map.name)} className="button danger" aria-label={`Delete map ${map.name}`}><Icon name="trash" size={14} />Delete</button></div>
          <div className="map-card-date"><Icon name="clock" size={11} />Created {new Date(map.createdAt).toLocaleString()}</div>
        </div>
      </article>)}</div>}
      <div className="workspace-footnote"><span>Maps stay on your NavHub server</span><span>Saved maps · Editable obstacles · Persistent waypoints</span></div>
    </div>
  );
}
