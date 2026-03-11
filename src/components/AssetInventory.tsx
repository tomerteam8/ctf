import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { AssetType } from '../data/types';
import { useIsMobile, HEADER_H_DESKTOP, HEADER_H_MOBILE } from '../hooks/useIsMobile';

const assetIcons: Record<AssetType, string> = {
  api_key: '\u{1F511}', credentials: '\u{1F464}', db_credentials: '\u{1F5C4}',
  logic_flaw: '\u{1F41B}', token: '\u{1F3AB}', certificate: '\u{1F4DC}',
  admin_password: '\u{1F480}',
};

type Tab = 'assets' | 'goals';

export default function AssetInventory() {
  const assets = useGameStore((s) => s.assets);
  const achievements = useGameStore((s) => s.achievements);
  const selectedNodeId = useGameStore((s) => s.selectedNodeId);
  const executingAction = useGameStore((s) => s.executingAction);
  const setPendingPromptText = useGameStore((s) => s.setPendingPromptText);
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('assets');
  const isMobile = useIsMobile();
  const headerH = isMobile ? HEADER_H_MOBILE : HEADER_H_DESKTOP;
  const topOffset = headerH + (isMobile ? 16 : 8);
  // On mobile always stay above the 50vh NodePanel so the two panels never overlap
  const drawerHeight = isMobile ? `calc(50vh - ${topOffset}px)` : `calc(100vh - ${topOffset}px)`;

  const grouped = assets.reduce<Record<string, typeof assets>>((acc, a) => {
    (acc[a.type] ||= []).push(a);
    return acc;
  }, {});

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '6px 0',
    background: active ? 'rgba(0,240,255,0.12)' : 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid #00f0ff' : '2px solid transparent',
    color: active ? '#00f0ff' : '#94a3b8',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ position: 'fixed', left: 0, top: topOffset, zIndex: 40 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(17,24,39,0.95)', border: '1px solid #2a3a5c', borderLeft: 'none',
          borderRadius: '0 8px 8px 0', padding: '8px 14px', cursor: 'pointer', color: '#e2e8f0',
        }}
      >
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', fontWeight: 700 }}>Assets</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#00ff88' }}>{assets.length}</div>
        {achievements.length > 0 && (
          <div style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', marginTop: 2 }}>🏆 {achievements.length}</div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed', left: 0, top: topOffset, height: drawerHeight,
              width: isMobile ? 240 : 300,
              background: 'rgba(17,24,39,0.97)', backdropFilter: 'blur(12px)',
              borderRight: '1px solid #2a3a5c', zIndex: 41,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            {/* Header — sticky */}
            <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8', fontWeight: 700 }}>
                {tab === 'assets' ? 'Asset Inventory' : 'Achievements'}
              </span>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>
                {'\u2715'}
              </button>
            </div>

            {/* Tabs — sticky */}
            <div style={{ display: 'flex', margin: '10px 16px 0', borderBottom: '1px solid #2a3a5c', flexShrink: 0 }}>
              <button style={tabStyle(tab === 'assets')} onClick={() => setTab('assets')}>
                Assets {assets.length > 0 && <span style={{ color: '#00ff88' }}>{assets.length}</span>}
              </button>
              <button style={tabStyle(tab === 'goals')} onClick={() => setTab('goals')}>
                Goals {achievements.length > 0 && <span style={{ color: '#fbbf24' }}>{achievements.length}</span>}
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {tab === 'assets' ? (
                assets.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No assets yet. Execute actions to find them.</p>
                ) : (
                  Object.entries(grouped).map(([type, items]) => (
                    <div key={type} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span>{assetIcons[type as AssetType] || '\u{1F4E6}'}</span>
                        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', fontWeight: 700 }}>
                          {type.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: 10, background: 'rgba(0,240,255,0.2)', color: '#00f0ff', padding: '1px 6px', borderRadius: 4 }}>
                          {items.length}
                        </span>
                      </div>
                      {items.map((asset) => (
                        <motion.div
                          key={asset.id}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            if (selectedNodeId && !executingAction) {
                              setPendingPromptText(`Use ${asset.name}: ${asset.value}`);
                            }
                          }}
                          title={executingAction ? 'Wait for action to complete' : selectedNodeId ? 'Click to use in prompt' : 'Select a node first'}
                          style={{
                            padding: 10, marginBottom: 6, borderRadius: 8,
                            background: 'rgba(26,34,53,0.5)', border: '1px solid #2a3a5c',
                            cursor: selectedNodeId && !executingAction ? 'pointer' : 'default',
                            opacity: executingAction ? 0.5 : 1,
                            transition: 'border-color 0.2s',
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{asset.name}</div>
                          <div style={{ fontSize: 10, color: '#00ff88', fontFamily: 'monospace', marginTop: 4, wordBreak: 'break-all' }}>{asset.value}</div>
                        </motion.div>
                      ))}
                    </div>
                  ))
                )
              ) : (
                achievements.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No achievements yet. Complete attack actions to unlock them.</p>
                ) : (
                  achievements.map((ach) => (
                    <motion.div
                      key={ach.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      style={{
                        padding: 10, marginBottom: 8, borderRadius: 8,
                        background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14 }}>🏆</span>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>{ach.name}</div>
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{ach.description}</div>
                    </motion.div>
                  ))
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
