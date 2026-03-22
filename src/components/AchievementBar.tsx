import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

export default function AchievementBar() {
  const achievements = useGameStore((s) => s.achievements);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', left: 0, top: 116, zIndex: 40 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(17,24,39,0.95)', border: '1px solid #2a3a5c', borderLeft: 'none',
          borderRadius: '0 8px 8px 0', padding: '8px 14px', cursor: 'pointer', color: '#e2e8f0',
        }}
      >
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', fontWeight: 700 }}>Goals</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fbbf24' }}>{achievements.length}</div>
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
                  Achievements
                </span>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>
                  {'\u2715'}
                </button>
              </div>

              {achievements.length === 0 ? (
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
                      <span style={{ fontSize: 14 }}>{'🏆'}</span>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>{ach.name}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{ach.description}</div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
