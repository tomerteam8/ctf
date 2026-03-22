import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import type { PentestNode } from '../data/types';
import { useGameStore } from '../store/gameStore';

const typeIcons: Record<string, string> = {
  internet_server: '\u{1F310}',
  web_page: '\u{1F4C4}',
  database: '\u{1F5C4}',
  api: '\u{26A1}',
  network: '\u{1F5A7}',
};

const zoneColor: Record<string, string> = {
  Perimeter: '#f59e0b',
  Corporate: '#3b82f6',
  'Dev/CI': '#fbbf24',
  Development: '#fbbf24',
  Management: '#a855f7',
};

const statusColors: Record<string, string> = {
  locked: 'border-red/50 bg-red/5',
  available: 'border-cyan/50 bg-cyan/5',
  completed: 'border-green/50 bg-green/5',
};

const statusGlow: Record<string, string> = {
  locked: 'animate-pulse-red',
  available: 'animate-pulse-cyan',
  completed: 'animate-pulse-green',
};

function NodeCard({ data }: NodeProps) {
  const node = data.node as PentestNode;
  const selectedNodeId = useGameStore((s) => s.selectedNodeId);
  const isSelected = selectedNodeId === node.id;

  if (!node.discovered) return null;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-cyan !border-cyan/50 !w-2 !h-2" />
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`
          relative px-4 py-3 rounded-lg border-2 cursor-pointer
          min-w-[160px] max-w-[200px]
          transition-all duration-300
          ${statusColors[node.status]}
          ${statusGlow[node.status]}
          ${isSelected ? 'ring-2 ring-cyan scale-105' : 'hover:scale-102'}
        `}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{typeIcons[node.type] || '\u{1F4E6}'}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            {node.type.replace('_', ' ')}
          </span>
        </div>
        <div className="text-sm font-bold text-text-primary truncate">{node.title}</div>
        <div className="text-[10px] mt-1 truncate font-mono" style={{ color: zoneColor[node.zone ?? ''] || undefined }}>{node.baseUrl}</div>
        <div className="absolute -top-1 -right-1">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              node.status === 'locked'
                ? 'bg-red'
                : node.status === 'available'
                ? 'bg-cyan'
                : 'bg-green'
            }`}
          />
        </div>
        {node.possibleActions.length > 0 && (
          <div className="text-[10px] text-text-secondary mt-2">
            {node.possibleActions.length} action{node.possibleActions.length > 1 ? 's' : ''}
          </div>
        )}
      </motion.div>
      <Handle type="source" position={Position.Bottom} className="!bg-cyan !border-cyan/50 !w-2 !h-2" />
    </>
  );
}

export default memo(NodeCard);
