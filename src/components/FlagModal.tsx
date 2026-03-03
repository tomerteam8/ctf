import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

export default function FlagModal() {
  const capturedFlag = useGameStore((s) => s.capturedFlag);
  const clearFlag = useGameStore((s) => s.clearFlag);

  return (
    <AnimatePresence>
      {capturedFlag && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={clearFlag}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(8px)', zIndex: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <motion.div
            initial={{ scale: 0.3, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #0a0e17 0%, #111827 50%, #0a0e17 100%)',
              border: '2px solid #00ff88',
              borderRadius: 16,
              padding: '48px 40px',
              maxWidth: 520,
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 0 60px rgba(0,255,136,0.15), 0 0 120px rgba(0,255,136,0.05)',
            }}
          >
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
              style={{ fontSize: 72, marginBottom: 16 }}
            >
              🚩
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#00ff88',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Flag Captured
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                fontSize: 13,
                color: '#94a3b8',
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              You exploited a SQL injection in the password change endpoint to modify the discount_rate column, granting near-free purchases on the platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                background: '#0a0e17',
                border: '1px solid #2a3a5c',
                borderRadius: 10,
                padding: '16px 20px',
                fontFamily: 'monospace',
                fontSize: 16,
                fontWeight: 700,
                color: '#00ff88',
                letterSpacing: '0.05em',
                wordBreak: 'break-all',
                marginBottom: 24,
              }}
            >
              {capturedFlag}
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              onClick={clearFlag}
              style={{
                padding: '12px 32px',
                borderRadius: 8,
                background: 'rgba(0,255,136,0.15)',
                border: '1px solid rgba(0,255,136,0.3)',
                color: '#00ff88',
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                cursor: 'pointer',
              }}
            >
              Continue Hacking
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
