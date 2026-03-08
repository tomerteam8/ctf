export type Difficulty = 'easy' | 'normal' | 'hard';
export type NodeType = 'internet_server' | 'web_page' | 'database' | 'api' | 'network';
export type NodeStatus = 'locked' | 'available' | 'completed';
export type ActionCategory = 'recon' | 'exploit' | 'enumeration' | 'analysis';
export type AssetType = 'api_key' | 'credentials' | 'db_credentials' | 'logic_flaw' | 'token' | 'certificate';

export interface Action {
  id: string;
  name: string;
  description: string;
  requiredAssets: AssetType[];
  revealsNodes: string[];
  revealsAssets?: { type: AssetType; name: string; value: string }[];
  category: ActionCategory;
  showAsHint?: boolean;
  hint?: string;
}

export type InfoSeverity = 'critical' | 'high' | 'medium' | 'info';

export interface ServiceDetail {
  label: string;
  value: string;
  severity?: InfoSeverity;
}

export interface PentestNode {
  id: string;
  parentId: string | string[] | null;
  title: string;
  data: string;
  baseUrl: string;
  type: NodeType;
  possibleActions: Action[];
  discovered: boolean;
  status: NodeStatus;
  serviceInfo?: ServiceDetail[];
  ring?: number;
  ip?: string;
  port?: string;
  zone?: string;
}

export interface NetworkDevice {
  id: string;
  label: string;
  ip: string;
  port?: string;
  ring: number;
  zone: string;
  color: string;
  iconType: string;
  services?: string;
  kind: 'device' | 'firewall';
  rules?: string[];
  isTarget?: boolean;
  hasCVE?: boolean;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
}

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  value: string;
  discoveredAt: string;
  discoveredBy: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  revealedNodes: string[];
  revealedAssets: Asset[];
  logs?: string[];
  matchedActionId?: string | null;
}

export interface LLMResponse {
  matchedActionId: string | null;
  success: boolean;
  logs: string[];
  message: string;
  revealedNodes: string[];
  revealedAssets: { type: AssetType; name: string; value: string }[];
}
