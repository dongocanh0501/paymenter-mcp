# Paymenter MCP Server 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-2024--11--05-orange.svg)](https://modelcontextprotocol.io/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](#features)

Enterprise-grade **Model Context Protocol (MCP)** Server for **[Paymenter](https://paymenter.org)** (v1.2.0+) — the open-source hosting and cloud billing platform.

Equips AI agents (Google Antigravity, Claude Desktop, Cursor, Cline) with **35 specialized tools** to manage hosting infrastructure, client billing, provisioning lifecycle, support tickets, and prepaid balances autonomously.

---

## 🏛️ Architecture Overview

```text
┌────────────┐                    
│AgentRequest│                    
└┬───────────┘                    
┌▽────────────────────┐           
│MCP Router (35 Tools)│           
└┬────────────────────┘           
┌▽───────────────────────────────┐
│Lazy Schema Validator (draft-07)│
└┬───────────────────────────────┘
┌▽────────────────────┐           
│Paymenter HTTP Client│           
└┬────────────────────┘           
┌▽─────────────────────────┐      
│JSON:API Sideload Hydrator│      
└┬─────────────────────────┘      
┌▽────────────┐                   
│AgentResponse│                   
└─────────────┘                   
```

---

## ✨ Key Features

* **⚡ Zero External Dependencies**: Built 100% on native Node.js APIs (`http`, `https`, `readline`). Starts in `<50ms` with zero `npm install` requirements.
* **🎯 35 Specialized Tools**: Full coverage across Users, Orders, Services Provisioning, Invoices, Credits, Support Tickets, Affiliates, and Catalog.
* **📦 JSON:API Compound Document Hydration**: Automatically resolves and maps related resources from the `included` array (orders, services, invoices, users, tickets) so LLMs receive coherent, hydrated entities instead of raw relational IDs.
* **🧠 Antigravity Modern Lazy-Loading Standard**: Includes 35 standalone JSON Schema Draft-07 files (`schemas/*.json`) and `instructions.md`, saving **~85% context tokens** upon initialization.
* **🛡️ Self-Test Ratchet Suite**: Built-in verification (`--test` flag) guaranteeing 100% offline protocol validation with Exit Code 0.

---

## 🧰 35 Tools Catalog

| Category | Tool Name | Description |
| :--- | :--- | :--- |
| **System & Health** | `paymenter_health_check` | Verify API connectivity, latency, auth token validity, and Paymenter server version. |
| | `paymenter_search` | Global cross-entity search across Users, Orders, Services, Tickets, and Invoices. |
| | `paymenter_get_dashboard_summary` | Executive metrics (active services count, unpaid invoices, pending tickets, users). |
| **User Management** | `paymenter_list_users` | List & filter users (`filter[email]`, `first_name`, `last_name`, pagination, sort). |
| | `paymenter_get_user` | Fetch single user profile by ID (sideload `role`, `credits`). |
| | `paymenter_create_user` | Create new client account (`email`, `password`, `first_name`, `last_name`, `role_id`). |
| | `paymenter_update_user` | Update client details, email verification status, or role. |
| | `paymenter_delete_user` | Permanently remove client account from database. |
| | `paymenter_get_user_overview` | 360° client snapshot in 1 call (Profile + Credits + Services + Invoices + Tickets). |
| **Orders & Services** | `paymenter_list_orders` | List client orders (`filter[id]`, `currency_code`, sideload `services`, `user`). |
| | `paymenter_get_order` | Retrieve order details and constituent service instances. |
| | `paymenter_create_order` | Generate new order (`user_id`, `currency_code`). |
| | `paymenter_delete_order` | Cancel and delete order. |
| | `paymenter_list_services` | List hosting/VPS instances (`filter[status]`, `expires_at`, `price`, `subscription_id`). |
| | `paymenter_get_service` | Detailed service configuration, package specs, and expiry date. |
| | `paymenter_create_service` | Provision new service instance (`product_id`, `plan_id`, `user_id`, `quantity`, `price`). |
| | `paymenter_update_service` | Modify service attributes, expiration, or billing cycle. |
| **Lifecycle Actions** | `paymenter_suspend_service` | Lock/suspend active service instance with reason. |
| | `paymenter_unsuspend_service` | Re-activate suspended service instance. |
| | `paymenter_renew_service` | Extend expiration date (`expires_at`) and create renewal invoice. |
| | `paymenter_cancel_service` | Terminate and mark service as cancelled. |
| **Billing & Credits** | `paymenter_list_invoices` | List invoices (`filter[user_id]`, `status`: `pending`/`paid`/`cancelled`). |
| | `paymenter_get_invoice` | Fetch invoice breakdown and line items (`include=items`). |
| | `paymenter_create_invoice` | Generate new billing invoice (`user_id`, `currency_code`, `status`, `due_at`). |
| | `paymenter_update_invoice` | Update invoice status or due date. |
| | `paymenter_delete_invoice` | Delete invoice from billing system. |
| | `paymenter_create_invoice_item`| Add line item to invoice (`invoice_id`, `description`, `price`, `quantity`). |
| | `paymenter_manage_credit` | Add or debit client prepaid wallet credit (`user_id`, `amount`, `currency_code`). |
| **Support Desk** | `paymenter_list_tickets` | List tickets (`filter[status]`, `filter[priority]`, `filter[department]`). |
| | `paymenter_get_ticket` | View ticket discussion thread (`include=messages`). |
| | `paymenter_create_ticket` | Open new support ticket (`subject`, `user_id`, `priority`, `department`). |
| | `paymenter_reply_ticket` | Post message reply and optionally update status (`replied`/`closed`). |
| **Catalog & Affiliates** | `paymenter_list_products` | Browse hosting packages, server specifications, and pricing. |
| | `paymenter_list_categories` | Browse product service categories. |
| | `paymenter_manage_affiliate` | Manage referral affiliate codes (`code`), rewards, and commission rates. |

---

## 🚀 Quickstart & Setup

### 1. Prerequisites
* **Node.js**: v18.0.0 or higher (no external npm dependencies required).
* **Paymenter Instance**: v1.2.0 or higher with an API Bearer token.

### 2. Environment Variables
* `PAYMENTER_URL`: Base API endpoint (default: `http://localhost/api`).
* `PAYMENTER_API_TOKEN`: Admin Bearer API token generated in Paymenter Admin Settings.

```bash
export PAYMENTER_URL="https://billing.yourdomain.com/api"
export PAYMENTER_API_TOKEN="your_paymenter_api_bearer_token_here"
```

### 3. Verify Offline Self-Tests
```bash
node server.js --test
```
*Expected Output:*
```text
=== Paymenter MCP Server Self-Test Suite ===
1. Testing method "initialize"... PASSED
2. Testing method "ping"... PASSED
3. Testing notification "notifications/initialized"... PASSED
4. Testing method "tools/list"... PASSED (Exactly 35 tools registered)
5. Verifying schema structure of all 35 tools... PASSED
6. Testing "tools/call" for "paymenter_health_check"... PASSED
7. Testing "tools/call" error handling for non-existent tool... PASSED
8. Testing "tools/call" error handling for missing arguments... PASSED
9. Testing JSON:API compound document hydration... PASSED
>>> All 9 MCP Self-Tests Passed Successfully! Exit Code 0. <<<
```

---

## 🔌 Client Configurations

### Google Antigravity CLI / IDE
Add to your `~/.gemini/antigravity-cli/settings.json` (or project `.agents/settings.json`):
```json
{
  "mcpServers": {
    "paymenter": {
      "command": "node",
      "args": ["/path/to/paymenter-mcp/server.js"],
      "env": {
        "PAYMENTER_URL": "https://billing.yourdomain.com/api",
        "PAYMENTER_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

### Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "paymenter": {
      "command": "node",
      "args": ["/path/to/paymenter-mcp/server.js"],
      "env": {
        "PAYMENTER_URL": "https://billing.yourdomain.com/api",
        "PAYMENTER_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

### Cursor IDE
Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "paymenter": {
      "command": "node",
      "args": ["/path/to/paymenter-mcp/server.js"],
      "env": {
        "PAYMENTER_URL": "https://billing.yourdomain.com/api",
        "PAYMENTER_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

---

## 📁 Repository Structure

```
paymenter-mcp/
├── package.json                          # Node.js project manifest (zero npm dependencies)
├── server.js                             # Self-contained MCP server (JSON-RPC 2.0 stdio, 35 tools)
├── schemas/                              # Modern Antigravity Lazy-Loaded JSON schemas
│   ├── instructions.md                   # Operational guidelines & relationship rules
│   ├── paymenter_health_check.json
│   ├── paymenter_list_users.json
│   └── ... (all 35 draft-07 schemas)
├── skill/                                # Antigravity agent skill module
│   ├── SKILL.md                          # Comprehensive agent skill guide
│   ├── references/
│   │   ├── api-endpoints.md              # 22 endpoints technical reference
│   │   └── jsonapi-conventions.md        # JSON:API v1.0 specifications
│   └── scripts/
│       └── paymenter_client.py           # Standalone Python client SDK
├── .gitignore
├── LICENSE                               # MIT License
└── README.md                             # Documentation & user guide
```

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE). Contributions, bug reports, and pull requests are welcome!
