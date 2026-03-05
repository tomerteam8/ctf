import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { AssetType } from '../data/types';

const assetIcons: Record<AssetType, string> = {
  api_key: '\u{1F511}', credentials: '\u{1F464}', db_credentials: '\u{1F5C4}',
  logic_flaw: '\u{1F41B}', token: '\u{1F3AB}', certificate: '\u{1F4DC}',
};

export default function AssetInventory() {
  const assets = useGameStore((s) => s.assets);
  const selectedNodeId = useGameStore((s) => s.selectedNodeId);
  const executingAction = useGameStore((s) => s.executingAction);
  const setPendingPromptText = useGameStore((s) => s.setPendingPromptText);
  const [isOpen, setIsOpen] = useState(false);

  const grouped = assets.reduce<Record<string, typeof assets>>((acc, a) => {
    (acc[a.type] ||= []).push(a);
    return acc;
  }, {});

  return (
    <div style={{ position: 'fixed', left: 0, top: 64, zIndex: 40 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(17,24,39,0.95)', border: '1px solid #2a3a5c', borderLeft: 'none',
          borderRadius: '0 8px 8px 0', padding: '8px 14px', cursor: 'pointer', color: '#e2e8f0',
        }}
      >
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', fontWeight: 700 }}>Assets</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#00ff88' }}>{assets.length}</div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed', left: 0, top: 64, height: 'calc(100vh - 64px)', width: 300,
              background: 'rgba(17,24,39,0.97)', backdropFilter: 'blur(12px)',
              borderRight: '1px solid #2a3a5c', overflowY: 'auto',
            }}
          >
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8', fontWeight: 700 }}>
                  Asset Inventory
                </span>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>
                  {'\u2715'}
                </button>
              </div>

              {assets.length === 0 ? (
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
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
