import { useState } from 'react';
import PentestTree from './components/PentestTree';
import NetworkMap from './components/NetworkMap';
import NodePanel from './components/NodePanel';
import AssetInventory from './components/AssetInventory';
import ActionResultModal from './components/ActionResultModal';
import FlagModal from './components/FlagModal';
import Header from './components/Header';
import ParticleBackground from './components/ParticleBackground';

export type AppView = 'graph' | 'network';

export default function App() {
  const [view, setView] = useState<AppView>('graph');

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <ParticleBackground />
      <Header view={view} onViewChange={setView} />
      <div style={{ position: 'absolute', top: 56, left: 0, right: 0, bottom: 0 }}>
        {view === 'graph' ? <PentestTree /> : <NetworkMap />}
      </div>
      {/* game overlays only shown in graph view */}
      {view === 'graph' && (
        <>
          <AssetInventory />
          <NodePanel />
          <ActionResultModal />
          <FlagModal />
        </>
      )}
    </div>
  );
}
