import PentestTree from './components/PentestTree';
import NodePanel from './components/NodePanel';
import AssetInventory from './components/AssetInventory';
import ActionResultModal from './components/ActionResultModal';
import FlagModal from './components/FlagModal';
import Header from './components/Header';
import ParticleBackground from './components/ParticleBackground';

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <ParticleBackground />
      <Header />
      <div style={{ position: 'absolute', top: 56, left: 0, right: 0, bottom: 0 }}>
        <PentestTree />
      </div>
      <AssetInventory />
      <NodePanel />
      <ActionResultModal />
      <FlagModal />
    </div>
  );
}
