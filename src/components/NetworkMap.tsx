import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, Handle, Position } from '@xyflow/react';
import type { Node, Edge, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { networkDevices, networkEdges } from '../data/gameData';
import type { NetworkDevice } from '../data/types';

// ── Colors ───────────────────────────────────────────────────────────────────

const CVE_COLOR = '#fbbf24';        // amber-400 — faint yellow for CVE nodes
const CVE_BORDER = '#fbbf2466';
const CVE_GLOW = '0 0 8px rgba(251,191,36,0.15)';

function bgColor(hex: string, alpha = 0.06): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── SVG Icons ────────────────────────────────────────────────────────────────

const sp = { fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function Icon({ type, color, size = 22 }: { type: string; color: string; size?: number }) {
  const s = { ...sp, stroke: color, width: size, height: size, viewBox: '0 0 24 24' };
  switch (type) {
    case 'waf':       return <svg {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>;
    case 'webserver': return <svg {...s}><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/></svg>;
    case 'postgres':  return <svg {...s}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M21 5v6"/><path d="M21 15a3 3 0 0 0-3 3v2"/></svg>;
    case 'redis':     return <svg {...s}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><line x1="3.27" y1="6.96" x2="12" y2="12.01"/><line x1="20.73" y1="6.96" x2="12" y2="12.01"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
    case 'smtp':      return <svg {...s}><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/></svg>;
    case 'hr':        return <svg {...s}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'ticket':    return <svg {...s}><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="12" y1="7" x2="12" y2="17"/></svg>;
    case 'wiki':      return <svg {...s}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg>;
    case 'printer':   return <svg {...s}><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
    case 'jenkins':   return <svg {...s}><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>;
    case 'git':       return <svg {...s}><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M6 9v12"/></svg>;
    case 'package':   return <svg {...s}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
    case 'directory': return <svg {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'grafana':   return <svg {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>;
    case 'backup':    return <svg {...s}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
    case 'heartbeat': return <svg {...s}><polyline points="2,12 6,12 8,8 10,16 12,12 14,12"/><circle cx="18" cy="12" r="4"/><path d="m17 12 1 1 2-2"/></svg>;
    default:          return <svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
  }
}

// ── Shared handle style (invisible) ──────────────────────────────────────────

const H: React.CSSProperties = { opacity: 0, width: 1, height: 1 };

// ── Device node ──────────────────────────────────────────────────────────────

interface DeviceData {
  label: string; ip: string; port?: string; iconType: string;
  color: string; bg: string; services?: string; hasCVE?: boolean;
}

function DeviceNode({ data }: NodeProps) {
  const d = data as unknown as DeviceData;
  const cve = d.hasCVE;

  return (
    <div style={{
      width: 128, padding: '7px 8px 6px',
      background: d.bg,
      border: `1.5px solid ${d.color}55`,
      borderRadius: 7,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      position: 'relative',
      outline: cve ? `2px solid ${CVE_BORDER}` : 'none',
      outlineOffset: 2,
      boxShadow: cve ? CVE_GLOW : 'none',
    }}>
      {/* Center handles */}
      <Handle type="target" position={Position.Top}    style={H} />
      <Handle type="source" position={Position.Bottom} style={H} />
      <Handle type="source" position={Position.Left}   id="left"    style={H} />
      <Handle type="target" position={Position.Right}  id="right"   style={H} />
      <Handle type="source" position={Position.Right}  id="right-s" style={H} />
      <Handle type="target" position={Position.Left}   id="left-t"  style={H} />
      {/* Offset handles for spaced connections */}
      <Handle type="target" position={Position.Top}    id="top-l"   style={{ ...H, left: '38%' }} />
      <Handle type="target" position={Position.Top}    id="top-r"   style={{ ...H, left: '62%' }} />
      <Handle type="source" position={Position.Top}    id="top-s"   style={{ ...H, left: '62%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-l" style={{ ...H, left: '38%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-r" style={{ ...H, left: '62%' }} />
      <Icon type={d.iconType} color={d.color} size={22} />
      <div style={{ fontSize: 9, fontWeight: 700, color: '#e2e8f0', textAlign: 'center', lineHeight: 1.2, marginTop: 1 }}>
        {d.label}
      </div>
      <div style={{ fontSize: 7, color: '#475569', fontFamily: 'monospace' }}>{d.ip}</div>
      {d.port && (
        <div style={{
          fontSize: 6,
          color: d.color,
          background: d.color + '18',
          padding: '1px 5px', borderRadius: 3,
        }}>
          :{d.port}
        </div>
      )}
      {d.services && (
        <div style={{ fontSize: 6, color: '#64748b', marginTop: 1, textAlign: 'center' }}>
          {d.services}
        </div>
      )}
    </div>
  );
}

// ── Zone background node ─────────────────────────────────────────────────────

interface ZoneData { label: string; subtitle: string; color: string; bg: string }

function ZoneBackground({ data }: NodeProps) {
  const d = data as unknown as ZoneData;
  return (
    <div style={{
      width: '100%', height: '100%',
      background: d.bg,
      border: `1.5px dashed ${d.color}33`,
      borderRadius: 10,
      pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute', top: 8, left: 12, right: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: d.color }}>
          {d.label}
        </span>
        <span style={{ fontSize: 7, color: `${d.color}88`, fontFamily: 'monospace', letterSpacing: '0.06em' }}>
          {d.subtitle}
        </span>
      </div>
    </div>
  );
}

// ── Protection node ──────────────────────────────────────────────────────────

interface ProtectionData { label: string; rules: string[] }

function ProtectionNode({ data }: NodeProps) {
  const d = data as unknown as ProtectionData;
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'rgba(255,51,102,0.07)',
      border: '1.5px solid rgba(255,51,102,0.35)',
      borderRadius: 10,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 6, padding: '8px 10px',
    }}>
      {/* Center handles */}
      <Handle type="target" position={Position.Top}    style={H} />
      <Handle type="source" position={Position.Bottom} style={H} />
      <Handle type="source" position={Position.Left}   id="left"    style={H} />
      <Handle type="target" position={Position.Right}  id="right"   style={H} />
      <Handle type="source" position={Position.Right}  id="right-s" style={H} />
      <Handle type="target" position={Position.Left}   id="left-t"  style={H} />
      {/* Offset handles for spaced connections */}
      <Handle type="target" position={Position.Top}    id="top-l"      style={{ ...H, left: '38%' }} />
      <Handle type="target" position={Position.Top}    id="top-r"      style={{ ...H, left: '62%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-1"   style={{ ...H, left: '20%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-2"   style={{ ...H, left: '40%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-3"   style={{ ...H, left: '60%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-4"   style={{ ...H, left: '80%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-5"   style={{ ...H, left: '92%' }} />
      <Handle type="target" position={Position.Bottom} id="bottom-tl"  style={{ ...H, left: '38%' }} />
      <Handle type="target" position={Position.Bottom} id="bottom-tr"  style={{ ...H, left: '62%' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 14 }}>🛡</span>
        <span style={{ fontSize: 8, fontWeight: 800, color: '#ff3366', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center' }}>
          {d.label}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
        {d.rules.map((r, i) => (
          <div key={i} style={{
            fontSize: 6.5, color: '#64748b', background: 'rgba(255,51,102,0.06)',
            padding: '2px 5px', borderRadius: 3, textAlign: 'center', letterSpacing: '0.04em',
          }}>
            {r}
          </div>
        ))}
      </div>
    </div>
  );
}

const nodeTypes = { device: DeviceNode, zoneBackground: ZoneBackground, protection: ProtectionNode };

// ── Data lookup ──────────────────────────────────────────────────────────────

const deviceMap = new Map<string, NetworkDevice>();
for (const d of networkDevices) deviceMap.set(d.id, d);

function toDeviceData(dev: NetworkDevice): DeviceData {
  return {
    label: dev.label, ip: dev.ip, port: dev.port,
    iconType: dev.iconType, color: dev.color,
    bg: bgColor(dev.color), services: dev.services,
    hasCVE: dev.hasCVE,
  };
}

// ── Zone definitions ─────────────────────────────────────────────────────────
//
// To add/remove nodes: edit the deviceIds array and adjust width/height.
// Grid layout is automatic — devices fill left-to-right, top-to-bottom.

interface ZoneDef {
  id: string; label: string; subtitle: string; color: string;
  x: number; y: number; width: number; height: number;
  deviceIds: string[]; cols: number;
}

const PAD_X = 20;
const PAD_Y = 40;
const CELL_W = 148;
const CELL_H = 100;

function zoneSize(cols: number, rows: number): { width: number; height: number } {
  return { width: PAD_X * 2 + cols * CELL_W, height: PAD_Y + rows * CELL_H + 15 };
}

const ZONES: ZoneDef[] = [
  {
    id: 'zone-perimeter', label: 'Perimeter', subtitle: 'shop.target.com  ·  203.0.113.0/24',
    color: '#f59e0b', x: 185, y: 200, ...zoneSize(4, 1),
    deviceIds: ['web-app', 'database', 'cache', 'mail-relay'], cols: 4,
  },
  {
    id: 'zone-devci', label: 'Development', subtitle: 'dev.target.com  ·  10.20.1.0/24',
    color: '#fbbf24', x: 50, y: 700, ...zoneSize(2, 2),
    deviceIds: ['jenkins', 'dev-portal', 'gitlab', 'nexus'], cols: 2,
  },
  {
    id: 'zone-corporate', label: 'Corporate', subtitle: 'corp.target.com  ·  192.168.1.0/24',
    color: '#3b82f6', x: 640, y: 700, ...zoneSize(2, 2),
    deviceIds: ['corp-portal', 'helpdesk', 'wiki', 'printer'], cols: 2,
  },
  {
    id: 'zone-management', label: 'Management', subtitle: 'mgmt.target.com  ·  10.30.1.0/24',
    color: '#a855f7', x: 185, y: 1280, ...zoneSize(5, 1),
    deviceIds: ['active-directory', 'monitoring', 'backups', 'microservice-check', 'mgmt-db'], cols: 5,
  },
];

// ── Protection nodes (between zones) ─────────────────────────────────────────

const PROTECTIONS: { id: string; x: number; y: number; w: number; h: number }[] = [
  { id: 'cloudflare',  x: 400, y: 30,   w: 190, h: 120 },
  { id: 'deploy-gw',   x: 120, y: 470,  w: 190, h: 130 },
  { id: 'internal-fw', x: 700, y: 470,  w: 190, h: 130 },
  { id: 'app-proxy',   x: 400, y: 700,  w: 190, h: 120 },
  { id: 'pam-vault',   x: 420, y: 1070, w: 190, h: 120 },
];

// ── Build nodes ──────────────────────────────────────────────────────────────

const NODES: Node[] = [];

// Zone backgrounds + devices
for (const zone of ZONES) {
  NODES.push({
    id: zone.id, type: 'zoneBackground',
    position: { x: zone.x, y: zone.y },
    style: { width: zone.width, height: zone.height, zIndex: -1 },
    data: { label: zone.label, subtitle: zone.subtitle, color: zone.color, bg: bgColor(zone.color, 0.04) },
    draggable: false, selectable: false,
  });

  zone.deviceIds.forEach((devId, i) => {
    const dev = deviceMap.get(devId);
    if (!dev) return;
    NODES.push({
      id: devId, type: 'device',
      position: {
        x: zone.x + PAD_X + (i % zone.cols) * CELL_W,
        y: zone.y + PAD_Y + Math.floor(i / zone.cols) * CELL_H,
      },
      data: toDeviceData(dev) as unknown as Record<string, unknown>,
      draggable: true, selectable: false,
    });
  });
}

// Protection nodes
for (const p of PROTECTIONS) {
  const dev = deviceMap.get(p.id)!;
  NODES.push({
    id: p.id, type: 'protection',
    position: { x: p.x, y: p.y },
    style: { width: p.w, height: p.h },
    data: { label: dev.label, rules: dev.rules ?? [] },
    draggable: true, selectable: false,
  });
}

// ── Build edges ──────────────────────────────────────────────────────────────

const seg  = (color: string) => ({ type: 'smoothstep' as const, style: { stroke: color, strokeWidth: 2 } });
const dash = (color: string) => ({ type: 'smoothstep' as const, animated: true, style: { stroke: color, strokeWidth: 1.5, strokeDasharray: '5 3' } });

function edgeStyle(sourceId: string, targetId: string) {
  // Internet → Perimeter
  if (sourceId === 'cloudflare') return seg('#f97316');

  // Perimeter → Protection
  if (sourceId === 'web-app' && targetId === 'deploy-gw') return dash('#fbbf24');
  if (sourceId === 'web-app' && targetId === 'internal-fw') return dash('#3b82f6');

  // Deploy GW ↔ Dev
  if (sourceId === 'deploy-gw' && targetId === 'dev-portal') return seg('#fbbf24');
  if (sourceId === 'dev-portal' && targetId === 'deploy-gw') return dash('#fbbf24');

  // Internal FW → Corporate
  if (sourceId === 'internal-fw') return seg('#3b82f6');

  // App Gateway (cross-zone Dev ↔ Corporate)
  if (sourceId === 'dev-portal' && targetId === 'app-proxy') return dash('#10b981');
  if (sourceId === 'app-proxy') return seg('#10b981');

  // PAM Vault
  if (sourceId === 'pam-vault') return seg('#a855f7');
  if (targetId === 'pam-vault') return dash('#a855f7');

  return seg('#64748b');
}

// Handle overrides — space out connections that share a side
function edgeHandles(sourceId: string, targetId: string): { sourceHandle?: string; targetHandle?: string } {
  // web-app bottom: 2 outgoing — deploy-gw (left), internal-fw (right)
  if (sourceId === 'web-app' && targetId === 'deploy-gw')  return { sourceHandle: 'bottom-l' };
  if (sourceId === 'web-app' && targetId === 'internal-fw') return { sourceHandle: 'bottom-r' };

  // deploy-gw ↔ dev-portal: 2 connections on deploy-gw bottom / dev-portal top
  if (sourceId === 'deploy-gw'  && targetId === 'dev-portal') return { sourceHandle: 'bottom-l', targetHandle: 'top-l' };
  if (sourceId === 'dev-portal' && targetId === 'deploy-gw')  return { sourceHandle: 'top-s',    targetHandle: 'bottom-tr' };

  // dev-portal → app-proxy: horizontal right→left
  if (sourceId === 'dev-portal' && targetId === 'app-proxy') return { sourceHandle: 'right-s', targetHandle: 'left-t' };

  // app-proxy → corp-portal: horizontal right→left
  if (sourceId === 'app-proxy' && targetId === 'corp-portal') return { sourceHandle: 'right-s', targetHandle: 'left-t' };

  // pam-vault top: 2 incoming — dev-portal (left), corp-portal (right)
  if (sourceId === 'dev-portal'  && targetId === 'pam-vault') return { targetHandle: 'top-l' };
  if (sourceId === 'corp-portal' && targetId === 'pam-vault') return { targetHandle: 'top-r' };

  // pam-vault bottom: 4 outgoing — AD, monitoring, backups, microservice-check (left→right)
  if (sourceId === 'pam-vault' && targetId === 'active-directory')  return { sourceHandle: 'bottom-1' };
  if (sourceId === 'pam-vault' && targetId === 'monitoring')        return { sourceHandle: 'bottom-2' };
  if (sourceId === 'pam-vault' && targetId === 'backups')           return { sourceHandle: 'bottom-3' };
  if (sourceId === 'pam-vault' && targetId === 'microservice-check') return { sourceHandle: 'bottom-4' };
  if (sourceId === 'pam-vault' && targetId === 'mgmt-db')           return { sourceHandle: 'bottom-5' };

  return {};
}

const EDGES: Edge[] = networkEdges.map((e) => ({
  id: e.id,
  source: e.source,
  target: e.target,
  ...edgeStyle(e.source, e.target),
  ...edgeHandles(e.source, e.target),
}));

// ── Main component ───────────────────────────────────────────────────────────

export default function NetworkMap() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0e17' }}>
      <ReactFlow
        nodes={NODES}
        edges={EDGES}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.08 }}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
        minZoom={0.15}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#1a2744" />
        <Controls
          style={{ background: 'rgba(17,24,39,0.9)', border: '1px solid #2a3a5c', borderRadius: 8 }}
          showInteractive={false}
        />
        <MiniMap
          style={{ background: 'rgba(10,14,23,0.9)', border: '1px solid #2a3a5c', borderRadius: 8 }}
          nodeColor={(node) => {
            if (node.type === 'protection') return '#ff336644';
            if (node.type === 'zoneBackground') return ((node.data as Record<string, unknown>).color as string) + '33';
            if (node.type === 'device') {
              const d = node.data as Record<string, unknown>;
              return d.hasCVE ? CVE_COLOR : (d.color as string);
            }
            return '#1e293b';
          }}
          maskColor="rgba(10,14,23,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
