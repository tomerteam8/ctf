import type { CustomNodeElementProps } from 'react-d3-tree';
import { useGameStore } from '../store/gameStore';

const typeIcons: Record<string, string> = {
  internet_server: '\u{1F310}', web_page: '\u{1F4C4}',
  database: '\u{1F5C4}', api: '\u26A1', network: '\u{1F5A7}',
};

const dotColor = (status: string, inProgress: boolean) => {
  if (inProgress) return '#fbbf24';
  return status === 'compromised' ? '#ff3366' : status === 'locked' ? '#ff3366' : status === 'available' ? '#00f0ff' : '#00ff88';
};

const zoneColor: Record<string, string> = {
  Perimeter: '#f59e0b',
  Corporate: '#3b82f6',
  'Dev/CI': '#fbbf24',
  Development: '#fbbf24',
  Management: '#a855f7',
};

function borderAndBg(status: string, inProgress: boolean) {
  if (inProgress) return { borderColor: 'rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.05)', animation: 'pulse-yellow 2s ease-in-out infinite' };
  if (status === 'locked') return { borderColor: 'rgba(255,51,102,0.5)', background: 'rgba(255,51,102,0.05)', animation: 'pulse-red 3s ease-in-out infinite' };
  if (status === 'available') return { borderColor: 'rgba(0,240,255,0.5)', background: 'rgba(0,240,255,0.05)', animation: 'pulse-cyan 2s ease-in-out infinite' };
  if (status === 'compromised') return { borderColor: 'rgba(255,51,102,0.8)', background: 'rgba(255,51,102,0.1)', animation: 'pulse-red 1.5s ease-in-out infinite' };
  return { borderColor: 'rgba(0,255,136,0.5)', background: 'rgba(0,255,136,0.05)', animation: 'pulse-green 1.5s ease-in-out infinite' };
}

export default function TreeNodeCard({ nodeDatum, toggleNode }: CustomNodeElementProps) {
  const attrs = nodeDatum.attributes as Record<string, string> | undefined;
  const nodeId = attrs?.nodeId ?? '';
  const status = attrs?.status ?? 'locked';
  const type = attrs?.type ?? '';
  const title = nodeDatum.name;
  const baseUrl = attrs?.baseUrl ?? '';
  const zone = attrs?.zone ?? '';
  const actionCount = Number(attrs?.actionCount ?? 0);
  const completedCount = Number(attrs?.completedCount ?? 0);
  const difficulty = attrs?.difficulty ?? 'normal';
  const completed = status === 'completed' || status === 'compromised';
  const inProgress = !completed && completedCount > 0 && completedCount < actionCount;
  const remaining = actionCount - completedCount;

  const isSelected = useGameStore((s) => s.selectedNodeId === nodeId);
  const selectNode = useGameStore((s) => s.selectNode);

  const hasChildren = !!(nodeDatum.children && nodeDatum.children.length > 0);
  const isCollapsed = !!(nodeDatum.__rd3t as { collapsed?: boolean })?.collapsed;
  const hiddenCount = nodeDatum.children?.length ?? 0;

  const { borderColor, background, animation } = borderAndBg(status, inProgress);

  const cardW = completed ? 150 : 187;
  const cardH = completed ? 70 : 110;

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    padding: completed ? '8px 12px' : '13px 17px',
    borderRadius: completed ? 8 : 10,
    border: '2px solid',
    borderColor,
    background,
    animation,
    cursor: 'pointer',
    minWidth: completed ? 120 : 154,
    maxWidth: cardW,
    textAlign: 'center',
    transition: 'all 0.3s',
    userSelect: 'none',
    opacity: completed ? 0.6 : 1,
    boxSizing: 'border-box',
  };

  if (isSelected) {
    cardStyle.outline = '2px solid #00f0ff';
    cardStyle.outlineOffset = 2;
    cardStyle.transform = 'scale(1.05)';
    cardStyle.opacity = 1;
  }

  // foreignObject dimensions — generous to avoid clipping
  const foW = cardW + 40;
  const foH = cardH + 50;

  return (
    <g data-node-id={nodeId}>
      <foreignObject
        x={-foW / 2}
        y={-foH / 2}
        width={foW}
        height={foH}
        style={{ overflow: 'visible' }}
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'flex-start', paddingTop: 4 }}
        >
          {/* Card */}
          <div
            onClick={(e) => { e.stopPropagation(); selectNode(nodeId); }}
            style={cardStyle}
          >
            <div style={{ fontSize: completed ? 18 : 20, marginBottom: completed ? 2 : 4 }}>
              {typeIcons[type] || '\u{1F4E6}'}
            </div>
            <div style={{ fontSize: completed ? 11 : 12, fontWeight: 700, color: '#e2e8f0' }}>
              {title}
            </div>
            {!completed && (
              <div style={{ fontSize: 9, color: zoneColor[zone] || '#94a3b8', marginTop: 3, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {baseUrl}
              </div>
            )}
            {/* Status dot */}
            <div style={{
              position: 'absolute', top: -5, right: -5,
              width: completed ? 10 : 12, height: completed ? 10 : 12,
              borderRadius: '50%', background: dotColor(status, inProgress), border: '2px solid #0a0e17',
            }} />
            {!completed && difficulty !== 'hard' && (
              <div style={{ fontSize: 9, color: inProgress ? '#fbbf24' : '#94a3b8', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {inProgress ? `${remaining} left` : `${actionCount} action${actionCount !== 1 ? 's' : ''}`}
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          {hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleNode(); }}
              style={{
                marginTop: 4,
                width: 20, height: 20,
                borderRadius: '50%',
                border: '1px solid rgba(0,240,255,0.3)',
                background: 'rgba(10,14,23,0.8)',
                color: '#94a3b8',
                fontSize: 10,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              title={isCollapsed ? 'Expand subtree' : 'Collapse subtree'}
            >
              <span style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.2s', display: 'block', lineHeight: 1 }}>
                ▼
              </span>
            </button>
          )}

          {/* Collapsed indicator */}
          {hasChildren && isCollapsed && (
            <div style={{
              marginTop: 4,
              fontSize: 9,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              {hiddenCount} hidden
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
}
