# Paymenter MCP Server 🚀

**[English](README.md)** | [🇻🇳 Tiếng Việt](README_VI.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-2024--11--05-orange.svg)](https://modelcontextprotocol.io/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](#key-features)
[![Paymenter Version](https://img.shields.io/badge/Paymenter-v1.2.0%2B-indigo.svg)](https://paymenter.org)
[![JSON:API Specification](https://img.shields.io/badge/Specification-JSON%3AAPI%20v1.0-blueviolet.svg)](https://jsonapi.org/)
[![GitHub Stars](https://img.shields.io/github/stars/dongocanh0501/paymenter-mcp?style=social)](https://github.com/dongocanh0501/paymenter-mcp/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/dongocanh0501/paymenter-mcp?style=social)](https://github.com/dongocanh0501/paymenter-mcp/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/dongocanh0501/paymenter-mcp)](https://github.com/dongocanh0501/paymenter-mcp/issues)

> **Enterprise Model Context Protocol (MCP) Server and Agent Skill for [Paymenter](https://paymenter.org)** (v1.2.0+).  
> Empowers AI Agents (Google Antigravity, Claude Desktop, Cursor, Cline) to autonomously govern cloud hosting infrastructure, provision VPS/servers, orchestrate client billing, automate support helpdesks, and manage wallet credits.

---

## 📑 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Why Paymenter MCP?](#-why-paymenter-mcp)
- [Key Features](#-key-features)
- [35 Tools Catalog](#-35-tools-catalog)
- [Quickstart & Verification](#-quickstart--verification)
- [Client Configurations](#-client-configurations)
  - [Google Antigravity CLI / IDE](#google-antigravity-cli--ide)
  - [Claude Desktop](#claude-desktop)
  - [Cursor IDE](#cursor-ide)
- [JSON:API Sideload Hydration](#-jsonapi-sideload-hydration)
- [Frequently Asked Questions (FAQ)](#-frequently-asked-questions-faq)
- [Repository Structure](#-repository-structure)
- [Contributing & Community](#-contributing--community)
- [License](#-license)

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

## 💡 Why Paymenter MCP?

| Capability | Manual API Integration | Paymenter MCP Server |
| :--- | :--- | :--- |
| **Agent Discovery** | Requires feeding 180KB OpenAPI JSON into context (~45k tokens) | **Lazy-Loaded Tool Schemas**: Zero token bloat at startup (~85% savings) |
| **Relational Data** | Raw JSON:API with scattered `included` array (requires manual lookup) | **Automatic Hydration**: Seamlessly maps nested entities into single coherent objects |
| **Runtime Portability**| Complex dependencies or Docker wrappers | **Zero Dependencies**: Pure Node.js built-ins (`http`, `readline`), starts in `<50ms` |
| **Error Handling** | Unformatted 422 HTTP validation crashes | Standard MCP `{ isError: true }` with clear parameter diagnostics |
| **Verification** | Blind runtime calls | Built-in offline test ratchet suite (`--test` flag) |

---

## ✨ Key Features

* **⚡ Zero External Dependencies**: 100% native Node.js (`http`, `https`, `readline`). Works out-of-the-box on Node.js 18+ without running `npm install`.
* **🎯 35 Specialized Tools**: Comprehensive management across 7 business domains (Users, Orders, Services, Invoices, Credits, Tickets, Catalog).
* **📦 JSON:API Compound Document Hydration**: Automatically resolves references between `data.relationships` and the `included` array so LLMs receive rich, context-complete payloads.
* **🧠 Modern Antigravity Lazy-Loading**: Includes 35 standalone JSON Schema Draft-07 files (`schemas/*.json`) and an operational `instructions.md`, preventing context window saturation.
* **🛡️ Self-Test Ratchet Suite**: Run `node server.js --test` anytime to execute 9 offline test suites with guaranteed Exit Code 0.

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

## 🚀 Quickstart & Verification

### 1. Prerequisites
* **Node.js**: v18.0.0 or higher.
* **Paymenter Instance**: v1.2.0 or higher with an API Bearer token.

### 2. Environment Variables
```bash
export PAYMENTER_URL="https://billing.yourdomain.com/api"
export PAYMENTER_API_TOKEN="your_paymenter_api_bearer_token_here"
```

### 3. Run Built-in Verification Suite
```bash
node server.js --test
```
*Output Evidence:*
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
Add to your `claude_desktop_config.json`:
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

## 📦 JSON:API Sideload Hydration

Paymenter utilizes the JSON:API v1.0 standard where related objects reside in an `included` array. Paymenter MCP Server intercepts and hydrates these relationships client-side:

```javascript
// Example: Querying service with user and order relations
// Raw JSON:API separates data.relationships and included array.
// Paymenter MCP Server returns unified, hydrated data:
{
  "id": "104",
  "type": "services",
  "attributes": {
    "status": "active",
    "expires_at": "2027-01-01T00:00:00Z"
  },
  "hydrated_relationships": {
    "user": {
      "id": "42",
      "email": "customer@example.com",
      "first_name": "Jane"
    },
    "order": {
      "id": "89",
      "currency_code": "USD"
    }
  }
}
```

---

## ❓ Frequently Asked Questions (FAQ)

#### Q1: What version of Paymenter is supported?
**A**: Paymenter MCP Server officially supports Paymenter **v1.2.0 and higher**, which features the modern Laravel JSON:API administrative backend.

#### Q2: Does this work if Paymenter is running in Docker?
**A**: **Yes!** As long as your Paymenter container exposes its web port (e.g. `http://localhost:8000/api` or `https://billing.domain.com/api`), the MCP server will interact seamlessly via standard HTTP.

#### Q3: What API token permissions are required?
**A**: The Bearer token should be generated with **Administrator privileges** inside the Paymenter admin control panel to access administrative routes (`/v1/admin/*`).

#### Q4: Why is this written in Zero-Dependency Node.js?
**A**: To maximize portability, reliability, and speed. AI coding assistants (Antigravity CLI, Claude Desktop, Cursor) can launch `server.js` instantly without risking broken dependencies or needing an active internet connection to run `npm install`.

#### Q5: Can I use this alongside the Antigravity Agent Skill?
**A**: **Yes!** The included [`skill/`](skill/) directory contains `SKILL.md` and reference guides designed specifically for Antigravity, providing deep domain knowledge while the MCP server executes the API operations.

#### Q6: How are rate limits handled?
**A**: Paymenter MCP Server gracefully handles HTTP `429 Too Many Requests` responses, returning formatted error diagnostics with retry suggestions directly to the calling LLM.

---

## 📁 Repository Structure

```
paymenter-mcp/
├── package.json                          # Node.js project manifest (zero dependencies)
├── server.js                             # Standalone MCP server (JSON-RPC 2.0 stdio, 35 tools)
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
├── .github/                              # GitHub templates
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
├── CONTRIBUTING.md                       # Contribution guidelines
├── .gitignore
├── LICENSE                               # MIT License
└── README.md                             # Documentation & user guide
```

---

## 🤝 Contributing & Community

Contributions are welcomed! Please read our [Contributing Guidelines](CONTRIBUTING.md) and check out our [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) and [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) templates.

If you find this project useful, please **give it a Star ⭐ on GitHub** to support open-source AI infrastructure!

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).  
Copyright (c) 2026 **Do Ngoc Anh** (`dongocanh0501`).
