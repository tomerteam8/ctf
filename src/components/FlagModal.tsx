import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

const flagContent: Record<string, { emoji: string; title: string; description: string }> = {
  sqli_user_type: {
    emoji: '🚩',
    title: 'Flag Captured',
    description: 'You exploited a SQL injection in the password change endpoint to escalate your account to employee status, unlocking staff discounts and enabling near-free purchases on the platform.',
  },
  chat_social_engineer: {
    emoji: '🚩',
    title: 'Flag Captured',
    description: 'You social-engineered a support agent into manually upgrading your account to employee status, unlocking staff discounts and enabling near-free purchases on the platform.',
  },
};

function getTakeoverDescription(capturedFlags: string[]): string {
  const usedSqli = capturedFlags.includes('sqli_user_type');
  const usedSE = capturedFlags.includes('chat_social_engineer');
  const escalationMethod = usedSqli && usedSE
    ? 'SQL injection and social engineering to escalate privileges'
    : usedSE
      ? 'social engineering a support agent to escalate privileges'
      : 'SQL injection privilege escalation';
  return `You chained account registration, ${escalationMethod}, SSRF via the supplier catalog import tool to create a rogue admin account, and command injection on the ping diagnostic service to spawn a reverse shell. You now have full remote code execution on the management server — complete takeover achieved. Congratulations!`;
}

export default function FlagModal() {
  const capturedFlag = useGameStore((s) => s.capturedFlag);
  const capturedFlags = useGameStore((s) => s.capturedFlags);
  const clearFlag = useGameStore((s) => s.clearFlag);

  const content = capturedFlag
    ? capturedFlag.id === 'ping_command_injection'
      ? { emoji: '💀', title: 'Complete Takeover', description: getTakeoverDescription(capturedFlags) }
      : flagContent[capturedFlag.id]
    : null;

  return (
    <AnimatePresence>
      {capturedFlag && content && (
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
              {content.emoji}
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
              {content.title}
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
              {content.description}
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
              {capturedFlag.value}
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
