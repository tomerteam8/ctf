import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, Handle, Position } from '@xyflow/react';
import type { Node, Edge, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { sampleNodes, networkDevices, networkEdges } from '../data/gameData';
import type { PentestNode, NetworkDevice } from '../data/types';

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const sp = { fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function Icon({ type, color, size = 22 }: { type: string; color: string; size?: number }) {
  const s = { ...sp, stroke: color, width: size, height: size, viewBox: '0 0 24 24' };
  switch (type) {
    case 'waf':        return <svg {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>;
    case 'webserver':  return <svg {...s}><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/></svg>;
    case 'ftp':        return <svg {...s}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><polyline points="12,12 15,15 12,18"/><line x1="8" y1="15" x2="15" y2="15"/></svg>;
    case 'smtp':       return <svg {...s}><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/></svg>;
    case 'redis':      return <svg {...s}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><line x1="3.27" y1="6.96" x2="12" y2="12.01"/><line x1="20.73" y1="6.96" x2="12" y2="12.01"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
    case 'graphql':    return <svg {...s}><polygon points="12,2 22,8 22,16 12,22 2,16 2,8"/><circle cx="12" cy="12" r="2" fill={color}/></svg>;
    case 'search':     return <svg {...s}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case 'admin':      return <svg {...s}><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
    case 'ping':       return <svg {...s}><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>;
    case 'exchange':   return <svg {...s}><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/><path d="M16 17h4M18 15l2 2-2 2"/></svg>;
    case 'session':    return <svg {...s}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case 'jenkins':    return <svg {...s}><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>;
    case 'confluence': return <svg {...s}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg>;
    case 'jira':       return <svg {...s}><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="12" y1="7" x2="12" y2="17"/></svg>;
    case 'grafana':    return <svg {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>;
    case 'mssql':      return <svg {...s}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;
    case 'postgres':   return <svg {...s}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M21 5v6"/><path d="M21 15a3 3 0 0 0-3 3v2"/></svg>;
    case 'docker':     return <svg {...s}><path d="M2 15c.6.5 1.2 1 2.5 1 1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1c1.3 0 1.9-.5 2.5-1"/><path d="M22 10.5a5 5 0 0 0-4.9-4H15V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8"/><rect x="2" y="10" width="20" height="8" rx="2"/></svg>;
    case 'kubernetes': return <svg {...s}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2" fill={color}/><line x1="12" y1="2" x2="12" y2="10"/><line x1="12" y1="14" x2="12" y2="22"/><line x1="2" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="14.83" y2="9.17"/><line x1="9.17" y1="14.83" x2="4.93" y2="19.07"/></svg>;
    case 'aws':        return <svg {...s}><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/><polyline points="7,12 12,17 17,12"/></svg>;
    case 'ep-admin':   return <svg {...s}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
    case 'ep-it':      return <svg {...s}><polyline points="4,17 10,11 4,5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
    case 'ep-manager': return <svg {...s}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>;
    case 'ep-finance': return <svg {...s}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case 'ep-dev':     return <svg {...s}><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>;
    default:           return <svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
  }
}

// ── Device node (lives inside a zone) ─────────────────────────────────────────
interface DeviceData {
  label: string; ip: string; port?: string; iconType: string;
  color: string; bg: string; isTarget?: boolean; services?: string;
}

function DeviceNode({ data }: NodeProps) {
  const d = data as unknown as DeviceData;
  return (
    <div style={{
      width: 128, padding: '7px 8px 6px',
      background: d.isTarget ? 'rgba(255,51,102,0.10)' : d.bg,
      border: `1.5px solid ${d.isTarget ? '#ff336677' : d.color + '55'}`,
      borderRadius: 7,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      boxShadow: d.isTarget ? '0 0 10px rgba(255,51,102,0.12)' : 'none',
      position: 'relative',
    }}>
      <Handle type="target" position={Position.Top}    style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Left}   id="left"  style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="target" position={Position.Right}  id="right" style={{ opacity: 0, width: 1, height: 1 }} />
      <Icon type={d.iconType} color={d.isTarget ? '#ff6688' : d.color} size={22} />
      <div style={{ fontSize: 9, fontWeight: 700, color: d.isTarget ? '#fca5a5' : '#e2e8f0', textAlign: 'center', lineHeight: 1.2, marginTop: 1 }}>
        {d.label}
      </div>
      <div style={{ fontSize: 7, color: '#475569', fontFamily: 'monospace' }}>{d.ip}</div>
      {d.port && (
        <div style={{ fontSize: 6, color: d.isTarget ? '#ff3366' : d.color, background: `${d.isTarget ? '#ff336618' : d.color + '18'}`, padding: '1px 5px', borderRadius: 3 }}>
          :{d.port}
        </div>
      )}
      {d.isTarget && (
        <div style={{
          position: 'absolute', top: -5, right: -5,
          width: 8, height: 8, borderRadius: '50%',
          background: '#ff3366', boxShadow: '0 0 5px #ff3366',
          animation: 'blink 1.5s ease-in-out infinite',
        }} />
      )}
    </div>
  );
}

// ── Zone node (draggable square container) ────────────────────────────────────
interface ZoneData { label: string; subnet: string; color: string; bg: string }

function ZoneNode({ data }: NodeProps) {
  const d = data as unknown as ZoneData;
  return (
    <div style={{
      width: '100%', height: '100%',
      background: d.bg,
      border: `1.5px solid ${d.color}44`,
      borderRadius: 10,
    }}>
      <Handle type="target" position={Position.Top}    style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Left}   id="left"  style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="target" position={Position.Right}  id="right" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Right}  id="right-s" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="target" position={Position.Left}   id="left-t"  style={{ opacity: 0, width: 1, height: 1 }} />
      <div style={{
        position: 'absolute', top: 8, left: 12, right: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: d.color }}>
          {d.label}
        </span>
        <span style={{ fontSize: 7, color: `${d.color}88`, fontFamily: 'monospace', letterSpacing: '0.06em' }}>
          {d.subnet}
        </span>
      </div>
    </div>
  );
}

// ── Firewall node (square) ────────────────────────────────────────────────────
interface FwData { label: string; rules: string[] }

function FirewallNode({ data }: NodeProps) {
  const d = data as unknown as FwData;
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
      <Handle type="target" position={Position.Top}    style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Left}   id="left"  style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="target" position={Position.Right}  id="right" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Right}  id="right-s" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="target" position={Position.Left}   id="left-t"  style={{ opacity: 0, width: 1, height: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 14 }}>🔥</span>
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

const nodeTypes = { device: DeviceNode, zone: ZoneNode, firewall: FirewallNode };

// ── Layout helpers ────────────────────────────────────────────────────────────
const G22 = [
  { x: 12, y: 42 }, { x: 152, y: 42 },
  { x: 12, y: 152 }, { x: 152, y: 152 },
];
const G32 = [
  { x: 10, y: 42 }, { x: 148, y: 42 }, { x: 286, y: 42 },
  { x: 79, y: 152 }, { x: 217, y: 152 },
];
const G13 = [
  { x: 10, y: 42 }, { x: 148, y: 42 }, { x: 286, y: 42 },
];

function devNode(
  id: string, parentId: string, pos: { x: number; y: number }, data: DeviceData
): Node {
  return {
    id, type: 'device', parentId, extent: 'parent' as const,
    position: pos, data: data as unknown as Record<string, unknown>,
    draggable: false, selectable: false,
  };
}

// ── Lookup maps from shared data ──────────────────────────────────────────────
const gameNodeMap = new Map<string, PentestNode>();
for (const n of sampleNodes) gameNodeMap.set(n.id, n);

const deviceMap = new Map<string, NetworkDevice>();
for (const d of networkDevices) deviceMap.set(d.id, d);

/** Helper: build bg color from a hex color */
function bg(color: string, alpha = 0.06): string {
  // Parse hex → rgba
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Mapping: game node ID → visual display properties for the network map */
const GAME_NODE_VIS: Record<string, { visualId: string; iconType: string; color: string; label?: string; services?: string }> = {
  root:                  { visualId: 'nginx',          iconType: 'webserver', color: '#00f0ff', label: 'Web Server',      services: 'nginx 1.24'    },
  graphql_api:           { visualId: 'graphql-api',    iconType: 'graphql',   color: '#e040fb',                           services: 'introspect on' },
  search_api:            { visualId: 'search-api',     iconType: 'search',    color: '#00f0ff',                           services: 'SQLi vuln'     },
  payment_webhook:       { visualId: 'payment-webhook',iconType: 'session',   color: '#00ff88', label: 'Pay Webhook',     services: 'Stripe replay' },
  ftp_server:            { visualId: 'ftp',            iconType: 'ftp',       color: '#f59e0b', label: 'FTP Server',      services: 'vsftpd 3.0'    },
  mail_server:           { visualId: 'smtp',           iconType: 'smtp',      color: '#f59e0b', label: 'SMTP Server',     services: 'Postfix 3.6'   },
  redis_cache:           { visualId: 'redis-cache',    iconType: 'redis',     color: '#ef4444', label: 'Redis Cache',     services: '\u26a0 NOAUTH' },
  admin_create_endpoint: { visualId: 'admin-ep',       iconType: 'admin',     color: '#ff3366', label: 'Admin Endpoint',  services: '/admin/create'  },
  ping_microservice:     { visualId: 'ping-svc',       iconType: 'ping',      color: '#ff3366', label: 'Ping Service',    services: 'RCE \u26a0 inject' },
  smtp_internal_relay:   { visualId: 'exchange',       iconType: 'exchange',  color: '#00f0ff', label: 'Exchange',        services: 'Internal relay' },
  redis_session_store:   { visualId: 'redis-session',  iconType: 'session',   color: '#00f0ff', label: 'Session Store',   services: 'Redis \u00b7 JWT' },
  internal_jenkins:      { visualId: 'jenkins',        iconType: 'jenkins',   color: '#fbbf24', label: 'Jenkins CI',      services: 'Script console' },
  internal_wiki:         { visualId: 'confluence',     iconType: 'confluence',color: '#3b82f6',                           services: 'CVE-2022-26134'},
  internal_monitoring:   { visualId: 'grafana',        iconType: 'grafana',   color: '#f97316',                           services: 'Default creds' },
  production_db_server:  { visualId: 'postgres',       iconType: 'postgres',  color: '#a855f7', label: 'PostgreSQL',      services: 'GraphQL DB'    },
  cloud_metadata:        { visualId: 'aws',            iconType: 'aws',       color: '#00ff88', label: 'AWS Gateway',     services: 'NAT \u00b7 us-east-1' },
};

/** Build a DeviceData from a game node + its visual config */
function gameDeviceData(nodeId: string): DeviceData {
  const node = gameNodeMap.get(nodeId)!;
  const vis = GAME_NODE_VIS[nodeId]!;
  return {
    label: vis.label ?? node.title,
    ip: node.ip ?? '',
    port: node.port,
    iconType: vis.iconType,
    color: vis.color,
    bg: bg(vis.color, vis.color === '#ef4444' ? 0.08 : 0.06),
    isTarget: true,
    services: vis.services,
  };
}

/** Build a DeviceData from a network device */
function infraDeviceData(devId: string): DeviceData {
  const dev = deviceMap.get(devId)!;
  return {
    label: dev.label,
    ip: dev.ip,
    port: dev.port,
    iconType: dev.iconType,
    color: dev.color,
    bg: bg(dev.color, dev.color === '#ef4444' ? 0.08 : dev.color === '#00ff88' ? 0.07 : 0.08),
    services: dev.services,
  };
}

// ── Build NODES from shared data ──────────────────────────────────────────────
const NODES: Node[] = [

  // ── Cloudflare (standalone) ─────────────────────────────────────────────────
  (() => {
    const dev = deviceMap.get('cloudflare')!;
    return {
      id: 'cloudflare', type: 'device' as const,
      position: { x: 840, y: 50 },
      data: { label: dev.label, ip: dev.ip, iconType: dev.iconType, color: dev.color, bg: bg(dev.color) },
      draggable: true, selectable: false,
    };
  })(),

  // ╔══════════════════════════════╗
  // ║  ZONE: ENDPOINTS             ║ 420×270
  // ╚══════════════════════════════╝
  {
    id: 'zone-endpoints', type: 'zone',
    position: { x: 20, y: 520 },
    style: { width: 420, height: 270 },
    data: { label: 'Endpoints', subnet: '192.168.1.0/24', color: '#3b82f6', bg: 'rgba(59,130,246,0.05)' },
    draggable: true, selectable: false,
  },
  devNode('ep-admin',   'zone-endpoints', G32[0], infraDeviceData('ep-admin')),
  devNode('ep-it',      'zone-endpoints', G32[1], infraDeviceData('ep-it')),
  devNode('ep-manager', 'zone-endpoints', G32[2], infraDeviceData('ep-manager')),
  devNode('ep-finance', 'zone-endpoints', G32[3], infraDeviceData('ep-finance')),
  devNode('ep-dev',     'zone-endpoints', G32[4], infraDeviceData('ep-dev')),

  // ╔══════════════════════════════╗
  // ║  ZONE: WEB SERVICES DMZ      ║ 295×270
  // ╚══════════════════════════════╝
  {
    id: 'zone-web-dmz', type: 'zone',
    position: { x: 480, y: 520 },
    style: { width: 295, height: 270 },
    data: { label: 'Web Services', subnet: '203.0.113.0/24', color: '#f59e0b', bg: 'rgba(245,158,11,0.05)' },
    draggable: true, selectable: false,
  },
  devNode('nginx',           'zone-web-dmz', G22[0], gameDeviceData('root')),
  devNode('graphql-api',     'zone-web-dmz', G22[1], gameDeviceData('graphql_api')),
  devNode('search-api',      'zone-web-dmz', G22[2], gameDeviceData('search_api')),
  devNode('payment-webhook', 'zone-web-dmz', G22[3], gameDeviceData('payment_webhook')),

  // ╔══════════════════════════════╗
  // ║  ZONE: NETWORK SERVICES DMZ  ║ 420×160
  // ╚══════════════════════════════╝
  {
    id: 'zone-net-dmz', type: 'zone',
    position: { x: 1000, y: 520 },
    style: { width: 420, height: 160 },
    data: { label: 'Network Services', subnet: '203.0.113.0/24', color: '#f59e0b', bg: 'rgba(245,158,11,0.05)' },
    draggable: true, selectable: false,
  },
  devNode('ftp',         'zone-net-dmz', G13[0], gameDeviceData('ftp_server')),
  devNode('smtp',        'zone-net-dmz', G13[1], gameDeviceData('mail_server')),
  devNode('redis-cache', 'zone-net-dmz', G13[2], gameDeviceData('redis_cache')),

  // ╔══════════════════════════════╗
  // ║  FW-VPN                      ║
  // ╚══════════════════════════════╝
  (() => {
    const fw = deviceMap.get('fw-vpn')!;
    return {
      id: 'fw-vpn', type: 'firewall' as const,
      position: { x: 165, y: 880 },
      style: { width: 220, height: 160 },
      data: { label: fw.label, rules: fw.rules ?? [] },
      draggable: true, selectable: false,
    };
  })(),

  // ╔══════════════════════════════╗
  // ║  FW-01 Perimeter             ║
  // ╚══════════════════════════════╝
  (() => {
    const fw = deviceMap.get('fw-01')!;
    return {
      id: 'fw-01', type: 'firewall' as const,
      position: { x: 809, y: 270 },
      style: { width: 220, height: 160 },
      data: { label: fw.label, rules: fw.rules ?? [] },
      draggable: true, selectable: false,
    };
  })(),

  // ╔══════════════════════════════╗
  // ║  ZONE: INTERNAL APP          ║ 295×270
  // ╚══════════════════════════════╝
  {
    id: 'zone-app', type: 'zone',
    position: { x: 670, y: 1130 },
    style: { width: 295, height: 270 },
    data: { label: 'Internal App', subnet: '10.0.1.0/24', color: '#00f0ff', bg: 'rgba(0,240,255,0.04)' },
    draggable: true, selectable: false,
  },
  devNode('admin-ep',      'zone-app', G22[0], gameDeviceData('admin_create_endpoint')),
  devNode('ping-svc',      'zone-app', G22[1], gameDeviceData('ping_microservice')),
  devNode('exchange',      'zone-app', G22[2], gameDeviceData('smtp_internal_relay')),
  devNode('redis-session', 'zone-app', G22[3], gameDeviceData('redis_session_store')),

  // ╔══════════════════════════════╗
  // ║  ZONE: INTERNAL TOOLS        ║ 295×270
  // ╚══════════════════════════════╝
  {
    id: 'zone-tools', type: 'zone',
    position: { x: 50, y: 1110 },
    style: { width: 295, height: 270 },
    data: { label: 'Internal Tools', subnet: '10.0.2.0/24', color: '#00f0ff', bg: 'rgba(0,240,255,0.04)' },
    draggable: true, selectable: false,
  },
  devNode('jenkins',    'zone-tools', G22[0], gameDeviceData('internal_jenkins')),
  devNode('confluence', 'zone-tools', G22[1], gameDeviceData('internal_wiki')),
  devNode('jira',       'zone-tools', G22[2], infraDeviceData('jira')),
  devNode('grafana',    'zone-tools', G22[3], gameDeviceData('internal_monitoring')),

  // ╔══════════════════════════════╗
  // ║  FW-02 Internal              ║
  // ╚══════════════════════════════╝
  (() => {
    const fw = deviceMap.get('fw-02')!;
    return {
      id: 'fw-02', type: 'firewall' as const,
      position: { x: 809, y: 880 },
      style: { width: 220, height: 160 },
      data: { label: fw.label, rules: fw.rules ?? [] },
      draggable: true, selectable: false,
    };
  })(),

  // ╔══════════════════════════════╗
  // ║  FW-03 / FW-04               ║
  // ╚══════════════════════════════╝
  (() => {
    const fw = deviceMap.get('fw-03')!;
    return {
      id: 'fw-03', type: 'firewall' as const,
      position: { x: 735, y: 1490 },
      style: { width: 220, height: 160 },
      data: { label: fw.label, rules: fw.rules ?? [] },
      draggable: true, selectable: false,
    };
  })(),
  (() => {
    const fw = deviceMap.get('fw-04')!;
    return {
      id: 'fw-04', type: 'firewall' as const,
      position: { x: 115, y: 1490 },
      style: { width: 220, height: 160 },
      data: { label: fw.label, rules: fw.rules ?? [] },
      draggable: true, selectable: false,
    };
  })(),

  // ╔══════════════════════════════╗
  // ║  ZONE: DATABASE              ║ 420×160
  // ╚══════════════════════════════╝
  {
    id: 'zone-db', type: 'zone',
    position: { x: 620, y: 1740 },
    style: { width: 420, height: 160 },
    data: { label: 'Database Zone', subnet: '10.0.3.0/24', color: '#a855f7', bg: 'rgba(168,85,247,0.05)' },
    draggable: true, selectable: false,
  },
  devNode('mssql',    'zone-db', G13[0], infraDeviceData('mssql')),
  devNode('postgres', 'zone-db', G13[1], gameDeviceData('production_db_server')),
  devNode('redis-db', 'zone-db', G13[2], infraDeviceData('redis-db')),

  // ╔══════════════════════════════╗
  // ║  ZONE: DEV / CLOUD           ║ 420×160
  // ╚══════════════════════════════╝
  {
    id: 'zone-dev', type: 'zone',
    position: { x: 50, y: 1740 },
    style: { width: 420, height: 160 },
    data: { label: 'Dev / Cloud', subnet: '10.0.4.0/24', color: '#00ff88', bg: 'rgba(0,255,136,0.04)' },
    draggable: true, selectable: false,
  },
  devNode('docker',     'zone-dev', G13[0], infraDeviceData('docker')),
  devNode('kubernetes', 'zone-dev', G13[1], infraDeviceData('kubernetes')),
  devNode('aws',        'zone-dev', G13[2], gameDeviceData('cloud_metadata')),
];

// ── Build EDGES from shared data ──────────────────────────────────────────────
const seg  = (color: string) => ({ type: 'smoothstep' as const, style: { stroke: color, strokeWidth: 2 } });
const dash = (color: string) => ({ type: 'smoothstep' as const, animated: true, style: { stroke: color, strokeWidth: 1.5, strokeDasharray: '5 3' } });
const atk  = () => ({ type: 'smoothstep' as const, animated: true, style: { stroke: '#ff3366', strokeWidth: 2, strokeDasharray: '4 3' } });

/**
 * Map source/target IDs from networkEdges to ReactFlow node IDs.
 * Game node IDs (underscored) → visual IDs used in the layout above.
 * Zone-level targets map to zone container IDs.
 */
const ID_TO_VISUAL: Record<string, string> = {};
for (const [gameId, vis] of Object.entries(GAME_NODE_VIS)) {
  ID_TO_VISUAL[gameId] = vis.visualId;
}
// networkDevice IDs are already used directly in the layout

function resolveId(id: string): string {
  return ID_TO_VISUAL[id] ?? id;
}

/** Determine edge style based on source/target */
function edgeStyle(sourceId: string, targetId: string) {
  // Firewall targets get dashed or attack style
  const isFw = (id: string) => id.startsWith('fw-');
  const srcDev = deviceMap.get(sourceId);
  const tgtDev = deviceMap.get(targetId);

  // Cloudflare → FW: solid orange
  if (sourceId === 'cloudflare') return seg('#f97316');
  // FW → targets: depends on direction
  if (isFw(sourceId)) {
    // FW-02 → internal app = attack path
    if (sourceId === 'fw-02') return atk();
    // FW-VPN → internal = dashed blue
    if (sourceId === 'fw-vpn') return dash('#3b82f6');
    // FW-01 → DMZ = solid amber
    if (sourceId === 'fw-01') return seg('#f59e0b');
    // FW-03 → DB = solid purple
    if (sourceId === 'fw-03') return seg('#a855f7');
    // FW-04 → Dev = solid green
    if (sourceId === 'fw-04') return seg('#00ff88');
    return seg('#00f0ff');
  }
  // → Firewall targets
  if (isFw(targetId)) {
    // Endpoints → VPN
    if (srcDev?.zone === 'Endpoints') return seg('#3b82f6');
    // DMZ → FW-02: dashed amber
    if (targetId === 'fw-02') return dash('#f59e0b');
    // Internal → FW: solid cyan
    return seg('#00f0ff');
  }
  // Default
  if (tgtDev?.zone === 'Database' || tgtDev?.zone === 'Dev / Cloud') return seg('#a855f7');
  return seg('#00f0ff');
}

const EDGES: Edge[] = networkEdges.map((e) => {
  const source = resolveId(e.source);
  const target = resolveId(e.target);
  return { id: e.id, source, target, ...edgeStyle(e.source, e.target) };
});

// ── Main component ────────────────────────────────────────────────────────────
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
            if (node.type === 'firewall') return '#ff336644';
            if (node.type === 'zone') return ((node.data as Record<string, unknown>).color as string) + '33';
            if (node.type === 'device') {
              const d = node.data as Record<string, unknown>;
              return d.isTarget ? '#ff3366' : d.color as string;
            }
            return '#1e293b';
          }}
          maskColor="rgba(10,14,23,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
