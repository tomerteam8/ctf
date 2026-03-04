import { motion } from 'framer-motion';
import type { Action } from '../data/types';

const catColor: Record<string, string> = {
  recon: '#00f0ff', exploit: '#ff3366', enumeration: '#ff9900', analysis: '#a855f7',
};

export default function ActionCard({
  action,
  onClickHint,
}: {
  action: Action;
  nodeId: string;
  onClickHint: (text: string) => void;
}) {
  const color = catColor[action.category] || '#00f0ff';
  const hintText = action.hint || action.name;

  return (
    <motion.button
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onClickHint(hintText)}
      title={action.description}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 20,
        marginBottom: 6,
        marginRight: 6,
        border: `1px solid ${color}50`,
        background: `${color}15`,
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{hintText}</span>
      <span
        style={{
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color,
          opacity: 0.6,
        }}
      >
        {action.category}
      </span>
    </motion.button>
  );
}
