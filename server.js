#!/usr/bin/env node
/**
 * Paymenter MCP Server
 * Model Context Protocol (MCP) JSON-RPC 2.0 Server over stdio
 * Targeted for Paymenter v1.2.0+ Admin API.
 * 
 * Zero external runtime dependencies: Built purely with native Node.js APIs (Node.js v20+).
 */

const readline = require('readline');
const process = require('process');

// Configuration from environment variables
const rawPaymenterUrl = (process.env.PAYMENTER_URL || process.env.PAYMENTER_BASE_URL || 'http://localhost/api').replace(/\/+$/, '');
const PAYMENTER_URL = rawPaymenterUrl.endsWith('/api') ? rawPaymenterUrl : `${rawPaymenterUrl}/api`;
const PAYMENTER_API_TOKEN = process.env.PAYMENTER_API_TOKEN || process.env.PAYMENTER_TOKEN || '';

/**
 * Log message to stderr to preserve clean stdio JSON-RPC on stdout.
 */
function logDebug(...args) {
  if (process.env.DEBUG) {
    process.stderr.write(`[DEBUG] ${args.join(' ')}\n`);
  }
}

/**
 * Deserializes JSON:API compound documents and resolves relationships against included array.
 */
function hydrateCompoundDocument(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const data = payload.data;
  const included = payload.included;
  if (!Array.isArray(included) || included.length === 0) return payload;

  const lookup = new Map();
  for (const item of included) {
    if (item && item.type && item.id !== undefined) {
      lookup.set(`${item.type}:${item.id}`, item);
    }
  }

  function resolveResource(resource) {
    if (!resource || typeof resource !== 'object') return resource;
    const rels = resource.relationships;
    if (!rels || typeof rels !== 'object') return resource;

    const hydratedRels = {};
    for (const [relName, relObj] of Object.entries(rels)) {
      if (!relObj || typeof relObj !== 'object') continue;
      const relData = relObj.data;
      if (Array.isArray(relData)) {
        hydratedRels[relName] = relData.map(r => {
          if (r && r.type && r.id !== undefined) {
            return lookup.get(`${r.type}:${r.id}`) || r;
          }
          return r;
        });
      } else if (relData && relData.type && relData.id !== undefined) {
        hydratedRels[relName] = lookup.get(`${relData.type}:${relData.id}`) || relData;
      } else {
        hydratedRels[relName] = relData;
      }
    }

    return {
      ...resource,
      hydrated_relationships: hydratedRels
    };
  }

  const hydratedData = Array.isArray(data) ? data.map(resolveResource) : resolveResource(data);
  return {
    ...payload,
    data: hydratedData
  };
}

/**
 * Central HTTP client for interacting with Paymenter Admin API.
 */
async function apiRequest(method, path, queryParams = null, body = null) {
  const cleanPath = path.replace(/^\/+/, '');
  const urlObj = new URL(`${PAYMENTER_URL}/${cleanPath}`);

  if (queryParams && typeof queryParams === 'object') {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value === undefined || value === null) continue;
      if (typeof value === 'object' && !Array.isArray(value)) {
        for (const [subKey, subVal] of Object.entries(value)) {
          if (subVal !== undefined && subVal !== null) {
            urlObj.searchParams.append(`${key}[${subKey}]`, String(subVal));
          }
        }
      } else if (Array.isArray(value)) {
        urlObj.searchParams.append(key, value.join(','));
      } else {
        urlObj.searchParams.append(key, String(value));
      }
    }
  }

  const headers = {
    'Accept': 'application/vnd.api+json, application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Paymenter-MCP-Server/1.0'
  };

  if (PAYMENTER_API_TOKEN) {
    headers['Authorization'] = `Bearer ${PAYMENTER_API_TOKEN}`;
  }

  const requestOptions = {
    method: method.toUpperCase(),
    headers: headers
  };

  if (body && ['POST', 'PUT', 'PATCH'].includes(requestOptions.method)) {
    requestOptions.body = JSON.stringify(body);
  }

  logDebug(`HTTP ${requestOptions.method} ${urlObj.toString()}`);

  const response = await fetch(urlObj.toString(), requestOptions);

  if (response.status === 204) {
    return { success: true, status: 204 };
  }

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (err) {
    json = { raw: text };
  }

  if (!response.ok) {
    const errorMsg = json?.message || `HTTP ${response.status} ${response.statusText}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.responseBody = json;
    throw err;
  }

  return hydrateCompoundDocument(json);
}

/**
 * Specification of all 35 tools.
 */
const TOOLS = [
  // 1. System & Discovery (3 tools)
  {
    name: 'paymenter_health_check',
    description: 'Check connectivity to Paymenter API and verify administrative API token authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        check_connectivity: {
          type: 'boolean',
          description: 'Perform actual HTTP ping request to test network and token validity'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_search',
    description: 'Universal search across multiple Paymenter entities (users, orders, services, invoices, tickets) matching a search query.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term or keyword to match against entities'
        },
        entities: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['users', 'orders', 'services', 'invoices', 'tickets']
          },
          description: 'Target entities to search. Defaults to all.'
        },
        limit: {
          type: 'integer',
          description: 'Maximum results per entity (1-50, default 10)'
        }
      },
      required: ['query'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_get_dashboard_summary',
    description: 'Fetch key operational metrics and statistics: total users, active services, pending invoices, open tickets.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },

  // 2. Users & Identity (6 tools)
  {
    name: 'paymenter_list_users',
    description: 'List customer accounts with pagination, sorting, and filtering.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'integer', description: 'Page number (default 1)' },
        per_page: { type: 'integer', description: 'Items per page (default 15, max 100)' },
        sort: { type: 'string', description: 'Sort field (e.g. id, -id, email, -created_at)' },
        include: { type: 'string', description: 'Relations to sideload (e.g. orders, services, invoices, credits, role)' },
        email: { type: 'string', description: 'Filter by email' },
        first_name: { type: 'string', description: 'Filter by first name' },
        last_name: { type: 'string', description: 'Filter by last name' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_get_user',
    description: 'Retrieve detailed profile information for a specific user by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: ['integer', 'string'], description: 'The unique numeric ID of the user' },
        include: { type: 'string', description: 'Relations to sideload (e.g. orders, services, invoices, tickets, credits, role)' }
      },
      required: ['user_id'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_create_user',
    description: 'Register and create a new customer account in Paymenter.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'User email address' },
        password: { type: 'string', description: 'Account initial password' },
        first_name: { type: 'string', description: 'First name' },
        last_name: { type: 'string', description: 'Last name' },
        email_verified_at: { type: 'string', description: 'ISO 8601 timestamp for email verification' },
        role_id: { type: 'integer', description: 'Role ID (e.g. administrator role ID)' }
      },
      required: ['email', 'password'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_update_user',
    description: 'Update profile or credentials of an existing user.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: ['integer', 'string'], description: 'The unique numeric ID of the user' },
        email: { type: 'string', description: 'Updated email address' },
        password: { type: 'string', description: 'Updated password' },
        first_name: { type: 'string', description: 'Updated first name' },
        last_name: { type: 'string', description: 'Updated last name' },
        email_verified_at: { type: 'string', description: 'Updated verification timestamp' },
        role_id: { type: 'integer', description: 'Updated role ID' }
      },
      required: ['user_id'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_delete_user',
    description: 'Permanently delete a user account from Paymenter (irreversible).',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: ['integer', 'string'], description: 'The unique numeric ID of the user to delete' }
      },
      required: ['user_id'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_get_user_overview',
    description: 'Fetch consolidated user overview including active services, open tickets, recent invoices, and credit balance.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: ['integer', 'string'], description: 'The unique numeric ID of the user' }
      },
      required: ['user_id'],
      additionalProperties: false
    }
  },

  // 3. Orders & Provisioning (8 tools)
  {
    name: 'paymenter_list_orders',
    description: 'List customer orders with pagination, sorting, and relations.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'integer', description: 'Page number' },
        per_page: { type: 'integer', description: 'Items per page' },
        sort: { type: 'string', description: 'Sort field' },
        include: { type: 'string', description: 'Relations (services, user)' },
        currency_code: { type: 'string', description: 'Filter by currency code (e.g. USD)' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_get_order',
    description: 'Get order details by order ID.',
    inputSchema: {
      type: 'object',
      properties: {
        order_id: { type: ['integer', 'string'], description: 'Order ID' },
        include: { type: 'string', description: 'Relations (services, user)' }
      },
      required: ['order_id'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_create_order',
    description: 'Create a new order for a user.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'integer', description: 'Target user ID' },
        currency_code: { type: 'string', description: '3-letter ISO currency code (e.g. USD)' }
      },
      required: ['user_id', 'currency_code'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_delete_order',
    description: 'Permanently delete an order by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        order_id: { type: ['integer', 'string'], description: 'Order ID to delete' }
      },
      required: ['order_id'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_list_services',
    description: 'List provisioned hosting/digital services.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'integer', description: 'Page number' },
        per_page: { type: 'integer', description: 'Items per page' },
        sort: { type: 'string', description: 'Sort field' },
        include: { type: 'string', description: 'Relations (coupon, user, order, product, invoices, properties)' },
        status: { type: 'string', enum: ['pending', 'active', 'suspended', 'cancelled'], description: 'Filter by status' },
        user_id: { type: 'integer', description: 'Filter by user ID' },
        product_id: { type: 'integer', description: 'Filter by product ID' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_get_service',
    description: 'Get detailed service provision record by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        service_id: { type: ['integer', 'string'], description: 'Service ID' },
        include: { type: 'string', description: 'Relations' }
      },
      required: ['service_id'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_create_service',
    description: 'Provision and assign a new digital/hosting service to a customer.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'integer', description: 'Product ID' },
        plan_id: { type: 'integer', description: 'Plan/billing cycle ID' },
        user_id: { type: 'integer', description: 'User ID' },
        quantity: { type: 'integer', description: 'Quantity (default 1)' },
        status: { type: 'string', enum: ['pending', 'active', 'suspended', 'cancelled'], description: 'Initial status' },
        currency_code: { type: 'string', description: '3-letter ISO currency code (e.g. USD)' },
        price: { type: 'number', description: 'Recurring price' },
        expires_at: { type: 'string', description: 'ISO 8601 expiration timestamp' },
        order_id: { type: 'integer', description: 'Linked order ID' },
        subscription_id: { type: 'string', description: 'Gateway subscription ID' },
        coupon_id: { type: 'integer', description: 'Coupon ID applied' }
      },
      required: ['product_id', 'plan_id', 'user_id', 'quantity', 'status', 'currency_code', 'price'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_update_service',
    description: 'Update properties or metadata of a service.',
    inputSchema: {
      type: 'object',
      properties: {
        service_id: { type: ['integer', 'string'], description: 'Service ID' },
        status: { type: 'string', enum: ['pending', 'active', 'suspended', 'cancelled'], description: 'New status' },
        expires_at: { type: 'string', description: 'New expiration timestamp' },
        price: { type: 'number', description: 'Updated price' },
        quantity: { type: 'integer', description: 'Updated quantity' },
        currency_code: { type: 'string', description: 'Updated currency code' }
      },
      required: ['service_id'],
      additionalProperties: false
    }
  },

  // 4. Service Lifecycle Operations (4 tools)
  {
    name: 'paymenter_suspend_service',
    description: 'Suspend an active service (e.g. for overdue invoice or abuse).',
    inputSchema: {
      type: 'object',
      properties: {
        service_id: { type: ['integer', 'string'], description: 'Service ID' },
        reason: { type: 'string', description: 'Reason for suspension' }
      },
      required: ['service_id'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_unsuspend_service',
    description: 'Reactivate a suspended service to active status.',
    inputSchema: {
      type: 'object',
      properties: {
        service_id: { type: ['integer', 'string'], description: 'Service ID' }
      },
      required: ['service_id'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_renew_service',
    description: 'Renew a service by extending its expiration date.',
    inputSchema: {
      type: 'object',
      properties: {
        service_id: { type: ['integer', 'string'], description: 'Service ID' },
        new_expires_at: { type: 'string', description: 'Extended ISO 8601 expiration timestamp' }
      },
      required: ['service_id', 'new_expires_at'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_cancel_service',
    description: 'Cancel a service gracefully.',
    inputSchema: {
      type: 'object',
      properties: {
        service_id: { type: ['integer', 'string'], description: 'Service ID' },
        reason: { type: 'string', description: 'Reason for cancellation' }
      },
      required: ['service_id'],
      additionalProperties: false
    }
  },

  // 5. Billing, Invoices & Credits (7 tools)
  {
    name: 'paymenter_list_invoices',
    description: 'List invoices with status, user filtering, and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'integer', description: 'Page number' },
        per_page: { type: 'integer', description: 'Items per page' },
        sort: { type: 'string', description: 'Sort field' },
        include: { type: 'string', description: 'Relations (user, items)' },
        status: { type: 'string', enum: ['pending', 'paid', 'cancelled'], description: 'Filter by status' },
        user_id: { type: 'integer', description: 'Filter by user ID' },
        currency_code: { type: 'string', description: 'Filter by currency' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_get_invoice',
    description: 'Get invoice details and line items by invoice ID.',
    inputSchema: {
      type: 'object',
      properties: {
        invoice_id: { type: ['integer', 'string'], description: 'Invoice ID' },
        include: { type: 'string', description: 'Relations (user, items)' }
      },
      required: ['invoice_id'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_create_invoice',
    description: 'Create a new invoice for a customer.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'integer', description: 'Target user ID' },
        currency_code: { type: 'string', description: '3-letter ISO currency code (e.g. USD)' },
        status: { type: 'string', enum: ['pending', 'paid', 'cancelled'], description: 'Initial status (default pending)' },
        due_at: { type: 'string', description: 'Due date in ISO 8601 format' }
      },
      required: ['user_id', 'currency_code'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_update_invoice',
    description: 'Update invoice status or due date.',
    inputSchema: {
      type: 'object',
      properties: {
        invoice_id: { type: ['integer', 'string'], description: 'Invoice ID' },
        status: { type: 'string', enum: ['pending', 'paid', 'cancelled'], description: 'New status' },
        due_at: { type: 'string', description: 'New due date' },
        currency_code: { type: 'string', description: 'Updated currency' },
        user_id: { type: 'integer', description: 'Updated user ID' }
      },
      required: ['invoice_id'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_delete_invoice',
    description: 'Permanently delete an invoice record.',
    inputSchema: {
      type: 'object',
      properties: {
        invoice_id: { type: ['integer', 'string'], description: 'Invoice ID to delete' }
      },
      required: ['invoice_id'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_create_invoice_item',
    description: 'Add a line item or charge to an existing invoice.',
    inputSchema: {
      type: 'object',
      properties: {
        invoice_id: { type: 'integer', description: 'Parent invoice ID' },
        description: { type: 'string', description: 'Item description' },
        price: { type: 'number', description: 'Unit price' },
        quantity: { type: 'integer', description: 'Quantity (default 1)' },
        reference_type: { type: 'string', description: 'Polymorphic model type (e.g. App\\Models\\Service)' },
        reference_id: { type: 'integer', description: 'Polymorphic model ID' }
      },
      required: ['invoice_id', 'description', 'price', 'quantity'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_manage_credit',
    description: 'Manage user prepaid credits wallet: list, get, deposit, update, or delete balances.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get', 'deposit', 'update', 'delete'], description: 'Operation to perform' },
        user_id: { type: 'integer', description: 'User ID (required for deposit, filter for list)' },
        credit_id: { type: ['integer', 'string'], description: 'Credit record ID (required for get, update, delete)' },
        currency_code: { type: 'string', description: '3-letter currency code (e.g. USD)' },
        amount: { type: 'number', description: 'Credit amount to add or set' }
      },
      required: ['action'],
      additionalProperties: false
    }
  },

  // 6. Support Tickets & Communication (4 tools)
  {
    name: 'paymenter_list_tickets',
    description: 'List customer support tickets with filters.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'integer', description: 'Page number' },
        per_page: { type: 'integer', description: 'Items per page' },
        sort: { type: 'string', description: 'Sort field' },
        include: { type: 'string', description: 'Relations (messages, user, assigned_to)' },
        status: { type: 'string', enum: ['open', 'replied', 'closed'], description: 'Filter by status' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Filter by priority' },
        user_id: { type: 'integer', description: 'Filter by user ID' },
        department: { type: 'string', description: 'Filter by department' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_get_ticket',
    description: 'Get ticket details and message thread by ticket ID.',
    inputSchema: {
      type: 'object',
      properties: {
        ticket_id: { type: ['integer', 'string'], description: 'Ticket ID' },
        include: { type: 'string', description: 'Relations (messages, user, assigned_to)' }
      },
      required: ['ticket_id'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_create_ticket',
    description: 'Open a new customer support ticket.',
    inputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Ticket subject line' },
        user_id: { type: 'integer', description: 'Author customer user ID' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Ticket priority' },
        status: { type: 'string', enum: ['open', 'replied', 'closed'], description: 'Initial status (default open)' },
        department: { type: 'string', description: 'Department name (e.g. Billing, Technical)' }
      },
      required: ['subject', 'user_id', 'priority', 'status'],
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_reply_ticket',
    description: 'Post a reply message to an existing support ticket thread.',
    inputSchema: {
      type: 'object',
      properties: {
        ticket_id: { type: 'integer', description: 'Target ticket ID' },
        user_id: { type: 'integer', description: 'Sender user ID (admin or customer)' },
        message: { type: 'string', description: 'Response message body' }
      },
      required: ['ticket_id', 'user_id', 'message'],
      additionalProperties: false
    }
  },

  // 7. Catalog & Marketing (3 tools)
  {
    name: 'paymenter_list_products',
    description: 'List available products/plans in the catalog.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'integer', description: 'Page number' },
        per_page: { type: 'integer', description: 'Items per page' },
        sort: { type: 'string', description: 'Sort field' },
        include: { type: 'string', description: 'Relations (category, plans)' },
        category_id: { type: 'integer', description: 'Filter by category ID' },
        name: { type: 'string', description: 'Filter by product name' },
        slug: { type: 'string', description: 'Filter by slug' },
        hidden: { type: 'boolean', description: 'Filter hidden products' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_list_categories',
    description: 'List product categories in Paymenter.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'integer', description: 'Page number' },
        per_page: { type: 'integer', description: 'Items per page' },
        sort: { type: 'string', description: 'Sort field' },
        include: { type: 'string', description: 'Relations (products, parent, children)' },
        name: { type: 'string', description: 'Filter by category name' },
        slug: { type: 'string', description: 'Filter by slug' },
        parent_id: { type: 'integer', description: 'Filter by parent category ID' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'paymenter_manage_affiliate',
    description: 'Manage affiliate partner accounts: list, get, create, update, or delete.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get', 'create', 'update', 'delete'], description: 'Operation to perform' },
        affiliate_id: { type: ['integer', 'string'], description: 'Affiliate ID (required for get, update, delete)' },
        user_id: { type: 'integer', description: 'User ID (required for create)' },
        code: { type: 'string', description: 'Unique affiliate promo code' },
        enabled: { type: 'boolean', description: 'Whether affiliate program is enabled' },
        reward: { type: 'number', description: 'Commission reward rate or fixed amount' }
      },
      required: ['action'],
      additionalProperties: false
    }
  }
];

/**
 * Tool Execution Handler
 */
async function executeTool(name, args = {}) {
  switch (name) {
    // 1. System & Discovery
    case 'paymenter_health_check': {
      const checkConn = args.check_connectivity !== false;
      if (!checkConn) {
        return {
          status: 'configured',
          base_url: PAYMENTER_URL,
          has_token: !!PAYMENTER_API_TOKEN,
          timestamp: new Date().toISOString()
        };
      }
      try {
        const startTime = Date.now();
        const res = await apiRequest('GET', '/v1/admin/users', { per_page: 1 });
        const latencyMs = Date.now() - startTime;
        return {
          status: 'healthy',
          base_url: PAYMENTER_URL,
          authenticated: true,
          latency_ms: latencyMs,
          users_total: res?.meta?.total ?? 'accessible',
          timestamp: new Date().toISOString()
        };
      } catch (err) {
        return {
          status: 'unreachable_or_unauthorized',
          base_url: PAYMENTER_URL,
          authenticated: false,
          error: err.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    case 'paymenter_search': {
      const query = String(args.query || '').trim();
      if (!query) throw new Error('Search query is required');
      const entities = Array.isArray(args.entities) && args.entities.length > 0
        ? args.entities
        : ['users', 'orders', 'services', 'invoices', 'tickets'];
      const limit = Math.min(Math.max(parseInt(args.limit, 10) || 10, 1), 50);

      const results = {};
      const promises = entities.map(async (entity) => {
        try {
          switch (entity) {
            case 'users': {
              const res = await apiRequest('GET', '/v1/admin/users', { per_page: limit, 'filter[email]': query });
              results.users = res.data || [];
              break;
            }
            case 'orders': {
              const res = await apiRequest('GET', '/v1/admin/orders', { per_page: limit, 'filter[id]': query });
              results.orders = res.data || [];
              break;
            }
            case 'services': {
              const res = await apiRequest('GET', '/v1/admin/services', { per_page: limit });
              const items = Array.isArray(res.data) ? res.data : [];
              results.services = items.filter(s => JSON.stringify(s).toLowerCase().includes(query.toLowerCase())).slice(0, limit);
              break;
            }
            case 'invoices': {
              const res = await apiRequest('GET', '/v1/admin/invoices', { per_page: limit, 'filter[id]': query });
              results.invoices = res.data || [];
              break;
            }
            case 'tickets': {
              const res = await apiRequest('GET', '/v1/admin/tickets', { per_page: limit });
              const items = Array.isArray(res.data) ? res.data : [];
              results.tickets = items.filter(t => JSON.stringify(t).toLowerCase().includes(query.toLowerCase())).slice(0, limit);
              break;
            }
          }
        } catch (err) {
          results[entity] = { error: err.message };
        }
      });

      await Promise.all(promises);
      return { query, results };
    }

    case 'paymenter_get_dashboard_summary': {
      const [users, services, invoices, tickets] = await Promise.allSettled([
        apiRequest('GET', '/v1/admin/users', { per_page: 1 }),
        apiRequest('GET', '/v1/admin/services', { per_page: 1, 'filter[status]': 'active' }),
        apiRequest('GET', '/v1/admin/invoices', { per_page: 1, 'filter[status]': 'pending' }),
        apiRequest('GET', '/v1/admin/tickets', { per_page: 1, 'filter[status]': 'open' })
      ]);

      return {
        timestamp: new Date().toISOString(),
        total_users: users.status === 'fulfilled' ? (users.value?.meta?.total ?? 'N/A') : `Error: ${users.reason?.message}`,
        active_services: services.status === 'fulfilled' ? (services.value?.meta?.total ?? 'N/A') : `Error: ${services.reason?.message}`,
        pending_invoices: invoices.status === 'fulfilled' ? (invoices.value?.meta?.total ?? 'N/A') : `Error: ${invoices.reason?.message}`,
        open_tickets: tickets.status === 'fulfilled' ? (tickets.value?.meta?.total ?? 'N/A') : `Error: ${tickets.reason?.message}`
      };
    }

    // 2. Users & Identity
    case 'paymenter_list_users': {
      const params = {
        page: args.page || 1,
        per_page: args.per_page || 15
      };
      if (args.sort) params.sort = args.sort;
      if (args.include) params.include = args.include;
      if (args.email) params['filter[email]'] = args.email;
      if (args.first_name) params['filter[first_name]'] = args.first_name;
      if (args.last_name) params['filter[last_name]'] = args.last_name;
      return await apiRequest('GET', '/v1/admin/users', params);
    }

    case 'paymenter_get_user': {
      if (!args.user_id) throw new Error('user_id is required');
      const params = args.include ? { include: args.include } : null;
      return await apiRequest('GET', `/v1/admin/users/${args.user_id}`, params);
    }

    case 'paymenter_create_user': {
      if (!args.email || !args.password) throw new Error('email and password are required');
      const payload = {
        email: args.email,
        password: args.password
      };
      if (args.first_name !== undefined) payload.first_name = args.first_name;
      if (args.last_name !== undefined) payload.last_name = args.last_name;
      if (args.email_verified_at !== undefined) payload.email_verified_at = args.email_verified_at;
      if (args.role_id !== undefined) payload.role_id = args.role_id;
      return await apiRequest('POST', '/v1/admin/users', null, payload);
    }

    case 'paymenter_update_user': {
      if (!args.user_id) throw new Error('user_id is required');
      const payload = {};
      const fields = ['email', 'password', 'first_name', 'last_name', 'email_verified_at', 'role_id'];
      for (const f of fields) {
        if (args[f] !== undefined) payload[f] = args[f];
      }
      return await apiRequest('PUT', `/v1/admin/users/${args.user_id}`, null, payload);
    }

    case 'paymenter_delete_user': {
      if (!args.user_id) throw new Error('user_id is required');
      return await apiRequest('DELETE', `/v1/admin/users/${args.user_id}`);
    }

    case 'paymenter_get_user_overview': {
      if (!args.user_id) throw new Error('user_id is required');
      const [user, services, invoices, credits, tickets] = await Promise.allSettled([
        apiRequest('GET', `/v1/admin/users/${args.user_id}`, { include: 'role' }),
        apiRequest('GET', '/v1/admin/services', { 'filter[user_id]': args.user_id }),
        apiRequest('GET', '/v1/admin/invoices', { 'filter[user_id]': args.user_id, sort: '-id', per_page: 5 }),
        apiRequest('GET', '/v1/admin/credits', { 'filter[user_id]': args.user_id }),
        apiRequest('GET', '/v1/admin/tickets', { 'filter[user_id]': args.user_id, sort: '-id', per_page: 5 })
      ]);

      return {
        user: user.status === 'fulfilled' ? user.value?.data : null,
        services: services.status === 'fulfilled' ? services.value?.data : [],
        recent_invoices: invoices.status === 'fulfilled' ? invoices.value?.data : [],
        credits: credits.status === 'fulfilled' ? credits.value?.data : [],
        recent_tickets: tickets.status === 'fulfilled' ? tickets.value?.data : []
      };
    }

    // 3. Orders & Provisioning
    case 'paymenter_list_orders': {
      const params = {
        page: args.page || 1,
        per_page: args.per_page || 15
      };
      if (args.sort) params.sort = args.sort;
      if (args.include) params.include = args.include;
      if (args.currency_code) params['filter[currency_code]'] = args.currency_code;
      return await apiRequest('GET', '/v1/admin/orders', params);
    }

    case 'paymenter_get_order': {
      if (!args.order_id) throw new Error('order_id is required');
      const params = args.include ? { include: args.include } : null;
      return await apiRequest('GET', `/v1/admin/orders/${args.order_id}`, params);
    }

    case 'paymenter_create_order': {
      if (!args.user_id || !args.currency_code) throw new Error('user_id and currency_code are required');
      const payload = {
        user_id: Number(args.user_id),
        currency_code: String(args.currency_code).toUpperCase()
      };
      return await apiRequest('POST', '/v1/admin/orders', null, payload);
    }

    case 'paymenter_delete_order': {
      if (!args.order_id) throw new Error('order_id is required');
      return await apiRequest('DELETE', `/v1/admin/orders/${args.order_id}`);
    }

    case 'paymenter_list_services': {
      const params = {
        page: args.page || 1,
        per_page: args.per_page || 15
      };
      if (args.sort) params.sort = args.sort;
      if (args.include) params.include = args.include;
      if (args.status) params['filter[status]'] = args.status;
      if (args.user_id) params['filter[user_id]'] = args.user_id;
      if (args.product_id) params['filter[product_id]'] = args.product_id;
      return await apiRequest('GET', '/v1/admin/services', params);
    }

    case 'paymenter_get_service': {
      if (!args.service_id) throw new Error('service_id is required');
      const params = args.include ? { include: args.include } : null;
      return await apiRequest('GET', `/v1/admin/services/${args.service_id}`, params);
    }

    case 'paymenter_create_service': {
      const required = ['product_id', 'plan_id', 'user_id', 'quantity', 'status', 'currency_code', 'price'];
      for (const req of required) {
        if (args[req] === undefined) throw new Error(`${req} is required`);
      }
      const payload = {
        product_id: Number(args.product_id),
        plan_id: Number(args.plan_id),
        user_id: Number(args.user_id),
        quantity: Number(args.quantity),
        status: String(args.status),
        currency_code: String(args.currency_code).toUpperCase(),
        price: Number(args.price)
      };
      if (args.expires_at) payload.expires_at = args.expires_at;
      if (args.order_id) payload.order_id = Number(args.order_id);
      if (args.subscription_id) payload.subscription_id = String(args.subscription_id);
      if (args.coupon_id) payload.coupon_id = Number(args.coupon_id);
      return await apiRequest('POST', '/v1/admin/services', null, payload);
    }

    case 'paymenter_update_service': {
      if (!args.service_id) throw new Error('service_id is required');
      const payload = {};
      const fields = ['status', 'expires_at', 'price', 'quantity', 'currency_code'];
      for (const f of fields) {
        if (args[f] !== undefined) payload[f] = args[f];
      }
      return await apiRequest('PUT', `/v1/admin/services/${args.service_id}`, null, payload);
    }

    // 4. Service Lifecycle Operations
    case 'paymenter_suspend_service': {
      if (!args.service_id) throw new Error('service_id is required');
      const payload = { status: 'suspended' };
      return await apiRequest('PUT', `/v1/admin/services/${args.service_id}`, null, payload);
    }

    case 'paymenter_unsuspend_service': {
      if (!args.service_id) throw new Error('service_id is required');
      const payload = { status: 'active' };
      return await apiRequest('PUT', `/v1/admin/services/${args.service_id}`, null, payload);
    }

    case 'paymenter_renew_service': {
      if (!args.service_id || !args.new_expires_at) throw new Error('service_id and new_expires_at are required');
      const payload = { expires_at: args.new_expires_at };
      return await apiRequest('PUT', `/v1/admin/services/${args.service_id}`, null, payload);
    }

    case 'paymenter_cancel_service': {
      if (!args.service_id) throw new Error('service_id is required');
      const payload = { status: 'cancelled' };
      return await apiRequest('PUT', `/v1/admin/services/${args.service_id}`, null, payload);
    }

    // 5. Billing, Invoices & Credits
    case 'paymenter_list_invoices': {
      const params = {
        page: args.page || 1,
        per_page: args.per_page || 15
      };
      if (args.sort) params.sort = args.sort;
      if (args.include) params.include = args.include;
      if (args.status) params['filter[status]'] = args.status;
      if (args.user_id) params['filter[user_id]'] = args.user_id;
      if (args.currency_code) params['filter[currency_code]'] = args.currency_code;
      return await apiRequest('GET', '/v1/admin/invoices', params);
    }

    case 'paymenter_get_invoice': {
      if (!args.invoice_id) throw new Error('invoice_id is required');
      const params = args.include ? { include: args.include } : null;
      return await apiRequest('GET', `/v1/admin/invoices/${args.invoice_id}`, params);
    }

    case 'paymenter_create_invoice': {
      if (!args.user_id || !args.currency_code) throw new Error('user_id and currency_code are required');
      const payload = {
        user_id: Number(args.user_id),
        currency_code: String(args.currency_code).toUpperCase(),
        status: args.status || 'pending'
      };
      if (args.due_at) payload.due_at = args.due_at;
      return await apiRequest('POST', '/v1/admin/invoices', null, payload);
    }

    case 'paymenter_update_invoice': {
      if (!args.invoice_id) throw new Error('invoice_id is required');
      const payload = {};
      const fields = ['status', 'due_at', 'currency_code', 'user_id'];
      for (const f of fields) {
        if (args[f] !== undefined) payload[f] = args[f];
      }
      return await apiRequest('PUT', `/v1/admin/invoices/${args.invoice_id}`, null, payload);
    }

    case 'paymenter_delete_invoice': {
      if (!args.invoice_id) throw new Error('invoice_id is required');
      return await apiRequest('DELETE', `/v1/admin/invoices/${args.invoice_id}`);
    }

    case 'paymenter_create_invoice_item': {
      if (!args.invoice_id || !args.description || args.price === undefined || !args.quantity) {
        throw new Error('invoice_id, description, price, and quantity are required');
      }
      const payload = {
        invoice_id: Number(args.invoice_id),
        description: String(args.description),
        price: Number(args.price),
        quantity: Number(args.quantity)
      };
      if (args.reference_type) payload.reference_type = args.reference_type;
      if (args.reference_id) payload.reference_id = Number(args.reference_id);
      return await apiRequest('POST', '/v1/admin/invoice-items', null, payload);
    }

    case 'paymenter_manage_credit': {
      const action = String(args.action || 'list').toLowerCase();
      switch (action) {
        case 'list': {
          const params = {};
          if (args.user_id) params['filter[user_id]'] = args.user_id;
          if (args.currency_code) params['filter[currency_code]'] = args.currency_code;
          return await apiRequest('GET', '/v1/admin/credits', params);
        }
        case 'get': {
          if (!args.credit_id) throw new Error('credit_id is required for get action');
          return await apiRequest('GET', `/v1/admin/credits/${args.credit_id}`);
        }
        case 'deposit': {
          if (!args.user_id || !args.currency_code || args.amount === undefined) {
            throw new Error('user_id, currency_code, and amount are required for deposit');
          }
          const payload = {
            user_id: Number(args.user_id),
            currency_code: String(args.currency_code).toUpperCase(),
            amount: Number(args.amount)
          };
          return await apiRequest('POST', '/v1/admin/credits', null, payload);
        }
        case 'update': {
          if (!args.credit_id) throw new Error('credit_id is required for update action');
          const payload = {};
          if (args.currency_code) payload.currency_code = String(args.currency_code).toUpperCase();
          if (args.amount !== undefined) payload.amount = Number(args.amount);
          return await apiRequest('PUT', `/v1/admin/credits/${args.credit_id}`, null, payload);
        }
        case 'delete': {
          if (!args.credit_id) throw new Error('credit_id is required for delete action');
          return await apiRequest('DELETE', `/v1/admin/credits/${args.credit_id}`);
        }
        default:
          throw new Error(`Unsupported credit action: ${action}`);
      }
    }

    // 6. Support Tickets & Communication
    case 'paymenter_list_tickets': {
      const params = {
        page: args.page || 1,
        per_page: args.per_page || 15
      };
      if (args.sort) params.sort = args.sort;
      if (args.include) params.include = args.include;
      if (args.status) params['filter[status]'] = args.status;
      if (args.priority) params['filter[priority]'] = args.priority;
      if (args.user_id) params['filter[user_id]'] = args.user_id;
      if (args.department) params['filter[department]'] = args.department;
      return await apiRequest('GET', '/v1/admin/tickets', params);
    }

    case 'paymenter_get_ticket': {
      if (!args.ticket_id) throw new Error('ticket_id is required');
      const params = args.include ? { include: args.include } : null;
      return await apiRequest('GET', `/v1/admin/tickets/${args.ticket_id}`, params);
    }

    case 'paymenter_create_ticket': {
      if (!args.subject || !args.user_id || !args.priority || !args.status) {
        throw new Error('subject, user_id, priority, and status are required');
      }
      const payload = {
        subject: String(args.subject),
        user_id: Number(args.user_id),
        priority: String(args.priority),
        status: String(args.status)
      };
      if (args.department) payload.department = String(args.department);
      return await apiRequest('POST', '/v1/admin/tickets', null, payload);
    }

    case 'paymenter_reply_ticket': {
      if (!args.ticket_id || !args.user_id || !args.message) {
        throw new Error('ticket_id, user_id, and message are required');
      }
      const payload = {
        ticket_id: Number(args.ticket_id),
        user_id: Number(args.user_id),
        message: String(args.message)
      };
      return await apiRequest('POST', '/v1/admin/ticket-messages', null, payload);
    }

    // 7. Catalog & Marketing
    case 'paymenter_list_products': {
      const params = {
        page: args.page || 1,
        per_page: args.per_page || 15
      };
      if (args.sort) params.sort = args.sort;
      if (args.include) params.include = args.include;
      if (args.category_id) params['filter[category_id]'] = args.category_id;
      if (args.name) params['filter[name]'] = args.name;
      if (args.slug) params['filter[slug]'] = args.slug;
      if (args.hidden !== undefined) params['filter[hidden]'] = args.hidden;
      return await apiRequest('GET', '/v1/admin/products', params);
    }

    case 'paymenter_list_categories': {
      const params = {
        page: args.page || 1,
        per_page: args.per_page || 15
      };
      if (args.sort) params.sort = args.sort;
      if (args.include) params.include = args.include;
      if (args.name) params['filter[name]'] = args.name;
      if (args.slug) params['filter[slug]'] = args.slug;
      if (args.parent_id) params['filter[parent_id]'] = args.parent_id;
      return await apiRequest('GET', '/v1/admin/categories', params);
    }

    case 'paymenter_manage_affiliate': {
      const action = String(args.action || 'list').toLowerCase();
      switch (action) {
        case 'list': {
          const params = {};
          if (args.user_id) params['filter[user_id]'] = args.user_id;
          if (args.code) params['filter[code]'] = args.code;
          return await apiRequest('GET', '/v1/admin/affiliates', params);
        }
        case 'get': {
          if (!args.affiliate_id) throw new Error('affiliate_id is required for get action');
          return await apiRequest('GET', `/v1/admin/affiliates/${args.affiliate_id}`);
        }
        case 'create': {
          if (!args.user_id || !args.code) throw new Error('user_id and code are required for create action');
          const payload = {
            user_id: Number(args.user_id),
            code: String(args.code)
          };
          if (args.enabled !== undefined) payload.enabled = Boolean(args.enabled);
          if (args.reward !== undefined) payload.reward = Number(args.reward);
          return await apiRequest('POST', '/v1/admin/affiliates', null, payload);
        }
        case 'update': {
          if (!args.affiliate_id) throw new Error('affiliate_id is required for update action');
          const payload = {};
          if (args.code) payload.code = String(args.code);
          if (args.enabled !== undefined) payload.enabled = Boolean(args.enabled);
          if (args.reward !== undefined) payload.reward = Number(args.reward);
          return await apiRequest('PUT', `/v1/admin/affiliates/${args.affiliate_id}`, null, payload);
        }
        case 'delete': {
          if (!args.affiliate_id) throw new Error('affiliate_id is required for delete action');
          return await apiRequest('DELETE', `/v1/admin/affiliates/${args.affiliate_id}`);
        }
        default:
          throw new Error(`Unsupported affiliate action: ${action}`);
      }
    }

    default:
      throw new Error(`Tool not implemented: ${name}`);
  }
}

/**
 * Handle a single JSON-RPC 2.0 message
 */
async function handleMessage(message) {
  if (!message || typeof message !== 'object') {
    return {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' }
    };
  }

  const { jsonrpc, id, method, params } = message;

  // Validate JSON-RPC 2.0 version
  if (jsonrpc !== '2.0') {
    return {
      jsonrpc: '2.0',
      id: id || null,
      error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' }
    };
  }

  // Handle Notifications (no response expected)
  if (method === 'notifications/initialized') {
    logDebug('Client sent notifications/initialized');
    return null;
  }

  // Handle Methods
  switch (method) {
    case 'initialize': {
      return {
        jsonrpc: '2.0',
        id: id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'paymenter-mcp-server',
            version: '1.0.0'
          },
          capabilities: {
            tools: {
              listChanged: false
            }
          }
        }
      };
    }

    case 'ping': {
      return {
        jsonrpc: '2.0',
        id: id,
        result: {}
      };
    }

    case 'tools/list': {
      return {
        jsonrpc: '2.0',
        id: id,
        result: {
          tools: TOOLS
        }
      };
    }

    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (!toolName) {
        return {
          jsonrpc: '2.0',
          id: id,
          result: {
            content: [{ type: 'text', text: 'Error: Tool name is required in params' }],
            isError: true
          }
        };
      }

      const toolExists = TOOLS.some(t => t.name === toolName);
      if (!toolExists) {
        return {
          jsonrpc: '2.0',
          id: id,
          result: {
            content: [{ type: 'text', text: `Error: Tool '${toolName}' not found` }],
            isError: true
          }
        };
      }

      try {
        const executionResult = await executeTool(toolName, toolArgs);
        const textOutput = typeof executionResult === 'string'
          ? executionResult
          : JSON.stringify(executionResult, null, 2);

        return {
          jsonrpc: '2.0',
          id: id,
          result: {
            content: [{ type: 'text', text: textOutput }],
            isError: false
          }
        };
      } catch (err) {
        const errorMessage = err?.message || String(err);
        return {
          jsonrpc: '2.0',
          id: id,
          result: {
            content: [{ type: 'text', text: `Paymenter API Error: ${errorMessage}` }],
            isError: true
          }
        };
      }
    }

    default: {
      return {
        jsonrpc: '2.0',
        id: id,
        error: { code: -32601, message: `Method not found: ${method}` }
      };
    }
  }
}

/**
 * Self-Test Suite (--test)
 */
async function runSelfTest() {
  process.stdout.write('=== Paymenter MCP Server Self-Test Suite ===\n\n');

  // Test 1: JSON-RPC initialize
  process.stdout.write('1. Testing method "initialize"... ');
  const initReq = { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} };
  const initRes = await handleMessage(initReq);
  if (initRes?.result?.serverInfo?.name === 'paymenter-mcp-server') {
    process.stdout.write('PASSED (Server Name: paymenter-mcp-server)\n');
  } else {
    throw new Error(`initialize failed: ${JSON.stringify(initRes)}`);
  }

  // Test 2: Method "ping"
  process.stdout.write('2. Testing method "ping"... ');
  const pingReq = { jsonrpc: '2.0', id: 2, method: 'ping' };
  const pingRes = await handleMessage(pingReq);
  if (pingRes?.result && !pingRes.error) {
    process.stdout.write('PASSED\n');
  } else {
    throw new Error(`ping failed: ${JSON.stringify(pingRes)}`);
  }

  // Test 3: Notification "notifications/initialized"
  process.stdout.write('3. Testing notification "notifications/initialized"... ');
  const notifReq = { jsonrpc: '2.0', method: 'notifications/initialized' };
  const notifRes = await handleMessage(notifReq);
  if (notifRes === null) {
    process.stdout.write('PASSED (Correctly yielded no response)\n');
  } else {
    throw new Error(`notification failed: ${JSON.stringify(notifRes)}`);
  }

  // Test 4: Method "tools/list" and count validation
  process.stdout.write('4. Testing method "tools/list"... ');
  const listReq = { jsonrpc: '2.0', id: 4, method: 'tools/list' };
  const listRes = await handleMessage(listReq);
  const tools = listRes?.result?.tools;
  if (Array.isArray(tools) && tools.length === 35) {
    process.stdout.write(`PASSED (Exactly ${tools.length} tools registered)\n`);
  } else {
    throw new Error(`tools/list count mismatch. Expected 35, got: ${tools?.length}`);
  }

  // Test 5: Verify all 35 tools schema conformity
  process.stdout.write('5. Verifying schema structure of all 35 tools... ');
  for (const t of tools) {
    if (!t.name || !t.description || !t.inputSchema || t.inputSchema.type !== 'object') {
      throw new Error(`Tool ${t.name} has invalid schema structure`);
    }
  }
  process.stdout.write('PASSED (All 35 tools schemas valid)\n');

  // Test 6: Mock tools/call - paymenter_health_check (offline mode)
  process.stdout.write('6. Testing "tools/call" for "paymenter_health_check" (offline config check)... ');
  const healthCall = {
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: {
      name: 'paymenter_health_check',
      arguments: { check_connectivity: false }
    }
  };
  const healthRes = await handleMessage(healthCall);
  if (healthRes?.result?.isError === false && healthRes?.result?.content?.[0]?.text) {
    process.stdout.write('PASSED\n');
  } else {
    throw new Error(`health_check call failed: ${JSON.stringify(healthRes)}`);
  }

  // Test 7: Mock tools/call - Error Handling (Unknown tool)
  process.stdout.write('7. Testing "tools/call" error handling for non-existent tool... ');
  const unknownCall = {
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: {
      name: 'paymenter_unknown_fake_tool',
      arguments: {}
    }
  };
  const unknownRes = await handleMessage(unknownCall);
  if (unknownRes?.result?.isError === true && unknownRes?.result?.content?.[0]?.text.includes('not found')) {
    process.stdout.write('PASSED (Returned formatted isError: true)\n');
  } else {
    throw new Error(`unknown tool test failed: ${JSON.stringify(unknownRes)}`);
  }

  // Test 8: Mock tools/call - Validation error (missing required arguments)
  process.stdout.write('8. Testing "tools/call" error handling for missing arguments (paymenter_create_order)... ');
  const missingArgCall = {
    jsonrpc: '2.0',
    id: 8,
    method: 'tools/call',
    params: {
      name: 'paymenter_create_order',
      arguments: {}
    }
  };
  const missingArgRes = await handleMessage(missingArgCall);
  if (missingArgRes?.result?.isError === true && missingArgRes?.result?.content?.[0]?.text.includes('required')) {
    process.stdout.write('PASSED (Caught validation and returned isError: true)\n');
  } else {
    throw new Error(`missing arg test failed: ${JSON.stringify(missingArgRes)}`);
  }

  // Test 9: Compound document hydration unit test
  process.stdout.write('9. Testing JSON:API compound document hydration... ');
  const sampleDoc = {
    data: {
      type: 'invoices',
      id: '99',
      attributes: { status: 'paid' },
      relationships: {
        user: { data: { type: 'users', id: '1' } }
      }
    },
    included: [
      {
        type: 'users',
        id: '1',
        attributes: { email: 'admin@paymenter.org' }
      }
    ]
  };
  const hydrated = hydrateCompoundDocument(sampleDoc);
  if (hydrated?.data?.hydrated_relationships?.user?.attributes?.email === 'admin@paymenter.org') {
    process.stdout.write('PASSED\n');
  } else {
    throw new Error(`compound document hydration failed: ${JSON.stringify(hydrated)}`);
  }

  process.stdout.write('\n>>> All 9 MCP Self-Tests Passed Successfully! Exit Code 0. <<<\n');
  process.exit(0);
}

/**
 * Main Server Entry Point
 */
async function main() {
  if (process.argv.includes('--test')) {
    await runSelfTest();
    return;
  }

  // Setup stdio line reader
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false
  });

  logDebug('Paymenter MCP Server running on stdio');

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const message = JSON.parse(trimmed);
      const response = await handleMessage(message);
      if (response !== null && response !== undefined) {
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    } catch (err) {
      logDebug('Failed to parse incoming line as JSON:', err.message);
      const errorResponse = {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: `Parse error: ${err.message}` }
      };
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
  });

  rl.on('close', () => {
    logDebug('Stdin closed, shutting down server');
    process.exit(0);
  });
}

// Run
main().catch((err) => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
