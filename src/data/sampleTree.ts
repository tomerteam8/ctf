import type { PentestNode } from './types';

export const sampleNodes: PentestNode[] = [
  // =========================================================================
  // ROOT
  // =========================================================================
  {
    id: 'root',
    parentId: null,
    title: 'Target Website',
    data: 'E-commerce platform. Begin reconnaissance to discover attack surfaces.',
    baseUrl: 'https://shop.target.com',
    type: 'internet_server',
    possibleActions: [
      {
        id: 'nmap_scan',
        name: 'Nmap Port Scan',
        description: 'Scan for open ports and running services on the target.',
        requiredAssets: [],
        revealsNodes: ['web_app', 'ftp_server', 'mail_server', 'redis_cache'],
        category: 'recon',
      },
      {
        id: 'whois_lookup',
        name: 'WHOIS Lookup',
        description: 'Gather domain registration info and related infrastructure.',
        requiredAssets: [],
        revealsNodes: [],
        revealsAssets: [
          { type: 'certificate', name: 'SSL Certificate', value: 'CN=*.target.com, O=Target Corp' },
        ],
        category: 'recon',
      },
    ],
    discovered: true,
    status: 'available',
  },

  // =========================================================================
  // NMAP RESULTS — real target
  // =========================================================================
  {
    id: 'web_app',
    parentId: 'root',
    title: 'Web Application',
    data: 'Main e-commerce frontend. User accounts, product listings, and checkout flow.',
    baseUrl: 'https://shop.target.com/app',
    type: 'web_page',
    possibleActions: [
      {
        id: 'dir_enum',
        name: 'Directory Enumeration',
        description: 'Brute-force discover hidden directories, endpoints, and API routes.',
        requiredAssets: [],
        revealsNodes: ['password_change', 'graphql_api', 'file_upload', 'search_api', 'payment_webhook'],
        category: 'enumeration',
      },
      {
        id: 'tech_fingerprint',
        name: 'Technology Fingerprint',
        description: 'Identify frameworks, libraries, and server technologies in use.',
        requiredAssets: [],
        revealsNodes: [],
        revealsAssets: [
          { type: 'token', name: 'Session Token Pattern', value: 'JWT with HS256, weak secret suspected' },
        ],
        category: 'recon',
      },
    ],
    discovered: false,
    status: 'locked',
  },

  // =========================================================================
  // NMAP RESULTS — decoys
  // =========================================================================
  {
    id: 'ftp_server',
    parentId: 'root',
    title: 'FTP Service',
    data: 'vsftpd 3.0.5 running on port 21. Anonymous login banner detected. Could contain backup files, deployment scripts, or database dumps.',
    baseUrl: 'ftp://shop.target.com:21',
    type: 'internet_server',
    possibleActions: [
      {
        id: 'ftp_anon_login',
        name: 'Anonymous FTP Login',
        description: 'Attempt anonymous login to access publicly shared files.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'ftp_brute',
        name: 'FTP Credential Brute Force',
        description: 'Brute-force FTP credentials using common username/password combinations.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'ftp_version_exploit',
        name: 'vsftpd Version Exploit',
        description: 'Check for known CVEs in vsftpd 3.0.5 and attempt exploitation.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
    ],
    discovered: false,
    status: 'locked',
  },
  {
    id: 'mail_server',
    parentId: 'root',
    title: 'SMTP Mail Server',
    data: 'Postfix SMTP server on port 25. Handles corporate email for target.com. Open relay testing and user enumeration may be possible.',
    baseUrl: 'smtp://mail.target.com:25',
    type: 'internet_server',
    possibleActions: [
      {
        id: 'smtp_user_enum',
        name: 'SMTP User Enumeration',
        description: 'Use VRFY and EXPN commands to enumerate valid email addresses and internal usernames.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'enumeration',
      },
      {
        id: 'smtp_relay_test',
        name: 'Open Relay Test',
        description: 'Test if the SMTP server is an open relay that can be abused for phishing.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'smtp_starttls_strip',
        name: 'STARTTLS Downgrade',
        description: 'Attempt to strip TLS encryption from SMTP sessions to intercept credentials.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
    ],
    discovered: false,
    status: 'locked',
  },
  {
    id: 'redis_cache',
    parentId: 'root',
    title: 'Redis Instance',
    data: 'Redis 7.2 on port 6379. Potentially exposed caching layer. Unauthenticated Redis instances can lead to RCE via module loading or SSH key injection.',
    baseUrl: 'redis://shop.target.com:6379',
    type: 'database',
    possibleActions: [
      {
        id: 'redis_noauth',
        name: 'Redis No-Auth Access',
        description: 'Attempt to connect without authentication and run INFO to enumerate the instance.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'redis_rce',
        name: 'Redis RCE via Module Load',
        description: 'Attempt to load a malicious Redis module to achieve remote code execution.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'redis_ssh_write',
        name: 'Redis SSH Key Injection',
        description: 'Write an SSH public key to the authorized_keys file via Redis CONFIG SET.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
    ],
    discovered: false,
    status: 'locked',
  },

  // =========================================================================
  // DIR ENUM RESULTS — real target
  // =========================================================================
  {
    id: 'password_change',
    parentId: 'web_app',
    title: 'Password Change Endpoint',
    data: 'User password change API. Accepts user_type field in the request body alongside password fields. The backend runs a raw SQL UPDATE on the users table — columns include user_type (values: "user", "employee").',
    baseUrl: 'https://shop.target.com/api/change-password',
    type: 'api',
    possibleActions: [
      {
        id: 'sqli_user_type',
        name: 'SQL Injection — User Type Escalation',
        description: 'The endpoint blindly passes user_type into a SQL UPDATE statement. Inject into the user_type field to set it to "employee", escalating privileges.',
        requiredAssets: [],
        revealsNodes: ['employee_portal'],
        revealsAssets: [
          { type: 'credentials', name: 'Employee Access', value: 'user_type changed from "user" to "employee" via SQLi on change-password endpoint' },
        ],
        category: 'exploit',
      },
      {
        id: 'sqli_discount',
        name: 'SQL Injection — Purchase Discounts',
        description: 'Abuse the same SQL injection to modify the discount_rate column in the users table, granting unauthorized discounts on purchases.',
        requiredAssets: [],
        revealsNodes: [],
        revealsAssets: [
          { type: 'logic_flaw', name: 'Unauthorized Discount', value: 'discount_rate set to 99 via SQLi — near-free purchases for the compromised account' },
        ],
        category: 'exploit',
      },
      {
        id: 'param_analysis',
        name: 'Parameter Analysis',
        description: 'Analyze request parameters and error messages to understand the backend SQL query structure.',
        requiredAssets: [],
        revealsNodes: [],
        revealsAssets: [
          { type: 'db_credentials', name: 'SQL Query Structure', value: 'UPDATE users SET password=$1, user_type=$2, discount_rate=$3 WHERE id=$4' },
        ],
        category: 'analysis',
      },
    ],
    discovered: false,
    status: 'locked',
  },

  // =========================================================================
  // DIR ENUM RESULTS — decoys
  // =========================================================================
  {
    id: 'graphql_api',
    parentId: 'web_app',
    title: 'GraphQL API',
    data: 'GraphQL endpoint with GraphiQL playground enabled. Introspection queries may expose the full schema including internal types, mutations, and sensitive fields.',
    baseUrl: 'https://shop.target.com/graphql',
    type: 'api',
    possibleActions: [
      {
        id: 'graphql_introspect',
        name: 'GraphQL Introspection',
        description: 'Run an introspection query to dump the full schema and discover internal mutations.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'enumeration',
      },
      {
        id: 'graphql_sqli',
        name: 'GraphQL SQL Injection',
        description: 'Inject SQL payloads into GraphQL query arguments to extract data from the backend database.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'graphql_dos',
        name: 'GraphQL Nested Query DoS',
        description: 'Craft deeply nested queries to exhaust server resources and test for rate limiting.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
    ],
    discovered: false,
    status: 'locked',
  },
  {
    id: 'file_upload',
    parentId: 'web_app',
    title: 'File Upload Endpoint',
    data: 'Product image upload API accepting multipart form data. File uploads are a classic vector for web shells, path traversal, and stored XSS.',
    baseUrl: 'https://shop.target.com/api/upload',
    type: 'api',
    possibleActions: [
      {
        id: 'upload_webshell',
        name: 'Web Shell Upload',
        description: 'Upload a PHP/JSP web shell disguised as an image to achieve remote code execution.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'upload_path_traversal',
        name: 'Path Traversal via Filename',
        description: 'Use directory traversal sequences in the filename to write files outside the upload directory.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'upload_xxe',
        name: 'XXE via SVG Upload',
        description: 'Upload a crafted SVG file with embedded XML External Entity payloads to read server files.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
    ],
    discovered: false,
    status: 'locked',
  },
  {
    id: 'search_api',
    parentId: 'web_app',
    title: 'Product Search API',
    data: 'Full-text search endpoint with query parameter reflecting user input. Potential for SQL injection, XSS, or NoSQL injection depending on backend implementation.',
    baseUrl: 'https://shop.target.com/api/search?q=',
    type: 'api',
    possibleActions: [
      {
        id: 'search_sqli',
        name: 'SQL Injection via Search',
        description: 'Inject SQL payloads through the search query parameter to extract database contents.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'search_xss',
        name: 'Reflected XSS via Search',
        description: 'Inject JavaScript payloads through the search parameter to test for reflected cross-site scripting.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'search_nosql',
        name: 'NoSQL Injection',
        description: 'Test for MongoDB/NoSQL injection by injecting operator-based payloads into the query parameter.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
    ],
    discovered: false,
    status: 'locked',
  },
  {
    id: 'payment_webhook',
    parentId: 'web_app',
    title: 'Payment Webhook',
    data: 'Stripe payment webhook handler. Processes POST requests with payment confirmations. Improper signature verification could allow forged payment events and order manipulation.',
    baseUrl: 'https://shop.target.com/api/webhooks/payment',
    type: 'api',
    possibleActions: [
      {
        id: 'webhook_forge',
        name: 'Forge Payment Event',
        description: 'Send a crafted Stripe webhook payload with a forged signature to mark orders as paid.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'webhook_replay',
        name: 'Webhook Replay Attack',
        description: 'Replay a previously captured webhook event to trigger duplicate payment processing.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'webhook_idor',
        name: 'IDOR via Order ID',
        description: 'Manipulate the order_id in the webhook payload to associate payments with different user accounts.',
        requiredAssets: [],
        revealsNodes: [],
        category: 'exploit',
      },
    ],
    discovered: false,
    status: 'locked',
  },

  // =========================================================================
  // SQLI RESULT — real target
  // =========================================================================
  {
    id: 'employee_portal',
    parentId: 'password_change',
    title: 'Employee Portal',
    data: 'Internal employee-only endpoint exposed to authenticated users with user_type="employee". Provides access to inventory management, order processing, and internal tools.',
    baseUrl: 'https://shop.target.com/internal/employee',
    type: 'web_page',
    possibleActions: [
      {
        id: 'ssrf_probe',
        name: 'SSRF Probe',
        description: 'The employee portal has a URL fetch feature (e.g. for importing supplier data). Test for Server-Side Request Forgery to discover internal services.',
        requiredAssets: ['credentials'],
        revealsNodes: ['admin_create_endpoint', 'internal_monitoring', 'internal_wiki', 'internal_jenkins'],
        revealsAssets: [
          { type: 'api_key', name: 'Internal Service Map', value: 'SSRF on /internal/employee/fetch — discovered internal endpoints including /internal/admin/create at 10.0.0.5:8080' },
        ],
        category: 'exploit',
      },
      {
        id: 'employee_enum',
        name: 'Employee Feature Enumeration',
        description: 'Enumerate available features and internal tools accessible through the employee portal.',
        requiredAssets: ['credentials'],
        revealsNodes: [],
        revealsAssets: [
          { type: 'token', name: 'Internal Auth Token', value: 'Bearer eyJhbG...internal-svc-token used for inter-service communication' },
        ],
        category: 'enumeration',
      },
    ],
    discovered: false,
    status: 'locked',
  },

  // =========================================================================
  // SSRF RESULTS — real target
  // =========================================================================
  {
    id: 'admin_create_endpoint',
    parentId: 'employee_portal',
    title: 'Admin Creation Endpoint',
    data: 'Internal-only endpoint at 10.0.0.5:8080/internal/admin/create. Intended for provisioning admin accounts from the internal network. No authentication — relies on network-level access control only.',
    baseUrl: 'http://10.0.0.5:8080/internal/admin/create',
    type: 'api',
    possibleActions: [
      {
        id: 'ssrf_create_admin',
        name: 'SSRF — Create Admin User',
        description: 'Use the employee portal SSRF to send a POST request to the internal admin creation endpoint. Since it has no auth, the request succeeds and a new admin account is created.',
        requiredAssets: ['api_key'],
        revealsNodes: [],
        revealsAssets: [
          { type: 'credentials', name: 'Admin Account', value: 'Created admin user attacker@target.com:admin123 with full platform access via SSRF to /internal/admin/create' },
        ],
        category: 'exploit',
      },
    ],
    discovered: false,
    status: 'locked',
  },

  // =========================================================================
  // SSRF RESULTS — decoys
  // =========================================================================
  {
    id: 'internal_monitoring',
    parentId: 'employee_portal',
    title: 'Grafana Dashboard',
    data: 'Internal Grafana instance at 10.0.0.12:3000. Exposes infrastructure metrics, database query performance, and server health. Default credentials are commonly left unchanged on internal tools.',
    baseUrl: 'http://10.0.0.12:3000',
    type: 'web_page',
    possibleActions: [
      {
        id: 'grafana_default_creds',
        name: 'Grafana Default Credentials',
        description: 'Attempt login with admin:admin and other default Grafana credentials.',
        requiredAssets: ['api_key'],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'grafana_ssrf_access',
        name: 'SSRF to Grafana API',
        description: 'Use the employee portal SSRF to access Grafana API endpoints and extract dashboard data or data source credentials.',
        requiredAssets: ['api_key'],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'grafana_cve',
        name: 'Grafana Path Traversal (CVE-2021-43798)',
        description: 'Test for the known Grafana path traversal vulnerability to read arbitrary files from the server.',
        requiredAssets: ['api_key'],
        revealsNodes: [],
        category: 'exploit',
      },
    ],
    discovered: false,
    status: 'locked',
  },
  {
    id: 'internal_wiki',
    parentId: 'employee_portal',
    title: 'Confluence Wiki',
    data: 'Internal Confluence instance at 10.0.0.20:8090. Corporate knowledge base likely containing architecture diagrams, credentials in runbooks, and deployment procedures.',
    baseUrl: 'http://10.0.0.20:8090',
    type: 'web_page',
    possibleActions: [
      {
        id: 'confluence_rce',
        name: 'Confluence OGNL Injection (CVE-2022-26134)',
        description: 'Exploit the critical Confluence OGNL injection vulnerability for remote code execution.',
        requiredAssets: ['api_key'],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'confluence_search',
        name: 'Search for Credentials in Wiki',
        description: 'Use SSRF to search Confluence pages for hardcoded passwords, API keys, and connection strings.',
        requiredAssets: ['api_key'],
        revealsNodes: [],
        category: 'enumeration',
      },
    ],
    discovered: false,
    status: 'locked',
  },
  {
    id: 'internal_jenkins',
    parentId: 'employee_portal',
    title: 'Jenkins CI Server',
    data: 'Jenkins automation server at 10.0.0.30:8080. CI/CD pipelines often contain deployment credentials, cloud keys, and have script consoles that allow direct code execution.',
    baseUrl: 'http://10.0.0.30:8080',
    type: 'internet_server',
    possibleActions: [
      {
        id: 'jenkins_script_console',
        name: 'Jenkins Script Console RCE',
        description: 'Access the Groovy script console to execute arbitrary commands on the Jenkins server.',
        requiredAssets: ['api_key'],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'jenkins_cred_dump',
        name: 'Jenkins Credential Dump',
        description: 'Extract stored credentials from Jenkins using the credentials API or by reading credentials.xml.',
        requiredAssets: ['api_key'],
        revealsNodes: [],
        category: 'exploit',
      },
      {
        id: 'jenkins_pipeline_secrets',
        name: 'Pipeline Environment Secrets',
        description: 'Enumerate pipeline configurations to find hardcoded secrets, cloud access keys, and database passwords.',
        requiredAssets: ['api_key'],
        revealsNodes: [],
        category: 'enumeration',
      },
    ],
    discovered: false,
    status: 'locked',
  },
];
