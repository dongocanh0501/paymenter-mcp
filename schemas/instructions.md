# Paymenter MCP Server Instructions & Architecture Guidelines

Paymenter MCP Server provides a complete administrative interface for **Paymenter v1.2.0+** — an open-source hosting billing, customer relationship, and automated provisioning platform. It connects directly to the Paymenter Admin API using HTTP Bearer Token authentication and JSON:API v1.0 specifications.

---

## 1. Six Critical Operational Principles

### 1. Hard Deletes Are Irreversible
Calls that permanently remove data (`paymenter_delete_user`, `paymenter_delete_order`, `paymenter_delete_service`, `paymenter_delete_invoice`, `paymenter_delete_ticket`) remove the database record and all dependent entities immediately. Whenever possible, prefer status transitions over hard deletion:
- For services: call `paymenter_suspend_service` or `paymenter_cancel_service` (status: `suspended` or `cancelled`).
- For invoices: call `paymenter_update_invoice` with status `cancelled`.
- For tickets: call `paymenter_reply_ticket` or update status to `closed`.

### 2. Admin Privileges & Bearer Authentication
All endpoints require a valid administrative API token (`Authorization: Bearer <API_TOKEN>`).
- If a tool returns HTTP 401 (Unauthorized), the token is missing, expired, or invalid.
- If a tool returns HTTP 403 (Forbidden), the token belongs to an account without Administrator role permissions.
- Validate connectivity and credential validity first with `paymenter_health_check`.

### 3. Sideloading Relations via JSON:API `include`
Paymenter adheres strictly to the JSON:API v1.0 standard. Sideloading linked entities in a single request prevents slow N+1 query loops:
- `paymenter_get_invoice` / `paymenter_list_invoices`: pass `include: "user,items"` to obtain the customer profile and invoice line items.
- `paymenter_get_order` / `paymenter_list_orders`: pass `include: "services,user"`.
- `paymenter_get_service` / `paymenter_list_services`: pass `include: "coupon,user,order,product,invoices,properties"`.
- `paymenter_get_ticket` / `paymenter_list_tickets`: pass `include: "messages,user,assigned_to"`.
- `paymenter_get_user` / `paymenter_list_users`: pass `include: "properties,orders,services,invoices,tickets,credits,role"`.

### 4. Currency Codes & Pricing Standards
- **Currency Code**: Always provide 3-letter uppercase ISO 4217 currency codes (e.g., `USD`, `EUR`, `VND`, `GBP`). Never supply symbols like `$`, `€`, or `₫`.
- **Prices & Amounts**: Provide exact numeric float or integer values (e.g., `25.00`, `150.50`). Never wrap monetary amounts in quotation marks or currency symbols.

### 5. Pagination & Result Traversal
- Collection tools (`paymenter_list_*`) default to `page: 1` and `per_page: 15`.
- Maximum `per_page` allowed by Paymenter is `100`.
- Sort parameters support descending order with a hyphen prefix (e.g., `sort: "-created_at"`, `sort: "-id"`).
- Always inspect the `meta` object in the response to confirm `total`, `current_page`, and `last_page`.

### 6. Service Lifecycle Management
Service states follow the strict state machine:
`pending` ➔ `active` ➔ `suspended` ➔ `cancelled`
- **Provisioning**: When creating a service (`paymenter_create_service`), ensure valid `product_id`, `plan_id`, and `user_id` are provided.
- **Renewal**: When renewing (`paymenter_renew_service`), calculate or specify `new_expires_at` in ISO 8601 format (`YYYY-MM-DDTHH:MM:SSZ`).
- **Suspension**: Use `paymenter_suspend_service` with a descriptive reason. Reactivate via `paymenter_unsuspend_service`.

---

## 2. Tool Classification & Suggested Entry Points

The 35 tools are structured into 7 functional domains:

1. **System & Discovery (3 tools)**:
   - `paymenter_health_check`: Start here to verify API reachability and token rights.
   - `paymenter_search`: Global multi-entity lookup (users, orders, services, invoices, tickets).
   - `paymenter_get_dashboard_summary`: High-level operational overview & statistics.
2. **Users & Identity (6 tools)**:
   - `paymenter_list_users`, `paymenter_get_user`, `paymenter_create_user`, `paymenter_update_user`, `paymenter_delete_user`, `paymenter_get_user_overview`.
3. **Orders & Provisioning (8 tools)**:
   - `paymenter_list_orders`, `paymenter_get_order`, `paymenter_create_order`, `paymenter_delete_order`.
   - `paymenter_list_services`, `paymenter_get_service`, `paymenter_create_service`, `paymenter_update_service`.
4. **Service Lifecycle Operations (4 tools)**:
   - `paymenter_suspend_service`, `paymenter_unsuspend_service`, `paymenter_renew_service`, `paymenter_cancel_service`.
5. **Billing, Invoices & Credits (7 tools)**:
   - `paymenter_list_invoices`, `paymenter_get_invoice`, `paymenter_create_invoice`, `paymenter_update_invoice`, `paymenter_delete_invoice`.
   - `paymenter_create_invoice_item`: Attach line items to pending or draft invoices.
   - `paymenter_manage_credit`: Deposit, deduct, set, or fetch prepaid wallet balances.
6. **Support Tickets & Communication (4 tools)**:
   - `paymenter_list_tickets`, `paymenter_get_ticket`, `paymenter_create_ticket`, `paymenter_reply_ticket`.
7. **Catalog & Marketing (3 tools)**:
   - `paymenter_list_products`, `paymenter_list_categories`, `paymenter_manage_affiliate`.
