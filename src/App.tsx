import { useState, useEffect } from 'react';
import PentestTree from './components/PentestTree';
import NetworkMap from './components/NetworkMap';
import NodePanel from './components/NodePanel';
import AssetInventory from './components/AssetInventory';
import ActionResultModal from './components/ActionResultModal';
import FlagModal from './components/FlagModal';
import Header from './components/Header';
import ParticleBackground from './components/ParticleBackground';
import LoginModal from './components/LoginModal';
import AdminPanel from './components/AdminPanel';
import { useIsMobile, HEADER_H_DESKTOP, HEADER_H_MOBILE } from './hooks/useIsMobile';
import { useAuthStore } from './store/authStore';
import { useGameStore } from './store/gameStore';
import { fetchAppConfig, fetchGameState } from './services/auth';

export type AppView = 'graph' | 'network';

const isAdminRoute = window.location.pathname.includes('/admin');

export default function App() {
  const [view, setView] = useState<AppView>('graph');
  const isMobile = useIsMobile();
  const headerH = isMobile ? HEADER_H_MOBILE : HEADER_H_DESKTOP;

  const { token, appConfig, configLoaded, setAppConfig } = useAuthStore();
  const applyServerGameState = useGameStore((s) => s.applyServerGameState);

  useEffect(() => {
    fetchAppConfig()
      .then(setAppConfig)
      .catch(() => {
        setAppConfig({ requiresAuth: false, hasServerKey: false, provider: null, model: null });
      });
    fetchGameState().then(applyServerGameState);
  }, [setAppConfig, applyServerGameState]);

  if (isAdminRoute) {
    return <AdminPanel />;
  }

  const needsLogin = configLoaded && appConfig?.requiresAuth && !token;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <ParticleBackground />

      {needsLogin && <LoginModal />}

      {!needsLogin && (
        <>
          <Header view={view} onViewChange={setView} />
          <div style={{ position: 'absolute', top: headerH, left: 0, right: 0, bottom: 0 }}>
            {view === 'graph' ? <PentestTree /> : <NetworkMap />}
          </div>
          {view === 'graph' && (
            <>
              <AssetInventory />
              <NodePanel />
              <ActionResultModal />
              <FlagModal />
            </>
          )}
        </>
      )}
    </div>
  );
}
