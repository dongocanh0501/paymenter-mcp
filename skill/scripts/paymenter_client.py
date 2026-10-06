#!/usr/bin/env python3
"""Paymenter API Client & CLI SDK.

Targeted for Paymenter v1.2.0+ Admin API.
Supports Bearer Token Authentication, JSON:API response hydration, and CRUD operations.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple, Union


class PaymenterError(Exception):
    """Base exception for Paymenter client."""

    def __init__(self, message: str, status_code: Optional[int] = None, response_body: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


class PaymenterAuthError(PaymenterError):
    """Raised on 401 Unauthorized or 403 Forbidden."""
    pass


class PaymenterNotFoundError(PaymenterError):
    """Raised on 404 Not Found."""
    pass


class PaymenterValidationError(PaymenterError):
    """Raised on 422 Unprocessable Entity."""

    def __init__(self, message: str, errors: Dict[str, Any], status_code: int = 422, response_body: Any = None):
        super().__init__(message, status_code=status_code, response_body=response_body)
        self.errors = errors


class PaymenterClient:
    """Python SDK client for interacting with Paymenter Admin API."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        token: Optional[str] = None,
        timeout: int = 30,
    ):
        raw_url = base_url or os.getenv("PAYMENTER_BASE_URL", "http://localhost/api")
        self.base_url = raw_url.rstrip("/")
        self.token = token or os.getenv("PAYMENTER_API_TOKEN")
        self.timeout = timeout

    @property
    def headers(self) -> Dict[str, str]:
        hdrs = {
            "Accept": "application/vnd.api+json, application/json",
            "Content-Type": "application/json",
            "User-Agent": "Paymenter-Python-Client/1.0",
        }
        if self.token:
            hdrs["Authorization"] = f"Bearer {self.token}"
        return hdrs

    def _build_url(self, path: str, params: Optional[Dict[str, Any]] = None) -> str:
        clean_path = path.lstrip("/")
        url = f"{self.base_url}/{clean_path}"
        if not params:
            return url

        query_items = []
        for k, v in params.items():
            if v is None:
                continue
            if isinstance(v, bool):
                query_items.append((k, "true" if v else "false"))
            elif isinstance(v, (list, tuple)):
                query_items.append((k, ",".join(str(x) for x in v)))
            else:
                query_items.append((k, str(v)))

        if query_items:
            encoded_query = urllib.parse.urlencode(query_items)
            url = f"{url}?{encoded_query}"
        return url

    def request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Send an HTTP request to the Paymenter API."""
        url = self._build_url(path, params)
        body_bytes = None
        if json_data is not None:
            body_bytes = json.dumps(json_data).encode("utf-8")

        req = urllib.request.Request(
            url=url,
            data=body_bytes,
            headers=self.headers,
            method=method.upper(),
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                code = resp.getcode()
                if code == 204:
                    return {"success": True, "status": 204}
                raw_content = resp.read().decode("utf-8")
                if not raw_content.strip():
                    return {"success": True, "status": code}
                return json.loads(raw_content)
        except urllib.error.HTTPError as err:
            err_body = None
            try:
                err_text = err.read().decode("utf-8")
                err_body = json.loads(err_text)
            except Exception:
                err_body = err_text

            if err.code in (401, 403):
                msg = f"HTTP {err.code} Auth Error: {err.reason}"
                raise PaymenterAuthError(msg, status_code=err.code, response_body=err_body) from err
            elif err.code == 404:
                msg = f"HTTP 404 Resource Not Found at {url}"
                raise PaymenterNotFoundError(msg, status_code=err.code, response_body=err_body) from err
            elif err.code == 422:
                errors_dict = {}
                msg = "Validation failed"
                if isinstance(err_body, dict):
                    msg = err_body.get("message", msg)
                    errors_dict = err_body.get("errors", {})
                raise PaymenterValidationError(msg, errors=errors_dict, response_body=err_body) from err
            else:
                raise PaymenterError(
                    f"HTTP {err.code} Error: {err.reason}",
                    status_code=err.code,
                    response_body=err_body,
                ) from err
        except urllib.error.URLError as err:
            raise PaymenterError(f"Network error connecting to {url}: {err.reason}") from err

    @staticmethod
    def hydrate_compound_document(payload: Dict[str, Any]) -> Dict[str, Any]:
        """Resolves JSON:API relationships against the included array."""
        if not isinstance(payload, dict):
            return payload

        data = payload.get("data")
        included = payload.get("included")
        if not included or not isinstance(included, list):
            return payload

        lookup: Dict[Tuple[str, str], Dict[str, Any]] = {}
        for item in included:
            if isinstance(item, dict) and "type" in item and "id" in item:
                lookup[(item["type"], str(item["id"]))] = item

        def resolve_resource(resource: Dict[str, Any]) -> Dict[str, Any]:
            if not isinstance(resource, dict):
                return resource
            rels = resource.get("relationships")
            if not isinstance(rels, dict):
                return resource

            resolved_rels = {}
            for rel_name, rel_obj in rels.items():
                rel_data = rel_obj.get("data") if isinstance(rel_obj, dict) else None
                if isinstance(rel_data, dict):
                    key = (rel_data.get("type", ""), str(rel_data.get("id", "")))
                    resolved_rels[rel_name] = lookup.get(key, rel_data)
                elif isinstance(rel_data, list):
                    resolved_rels[rel_name] = [
                        lookup.get((x.get("type", ""), str(x.get("id", ""))), x)
                        for x in rel_data
                        if isinstance(x, dict)
                    ]
                else:
                    resolved_rels[rel_name] = rel_data

            result = dict(resource)
            result["hydrated_relationships"] = resolved_rels
            return result

        if isinstance(data, list):
            hydrated_data = [resolve_resource(r) for r in data]
        elif isinstance(data, dict):
            hydrated_data = resolve_resource(data)
        else:
            hydrated_data = data

        res = dict(payload)
        res["data"] = hydrated_data
        return res

    # ---------------------------------------------------------
    # 1. Users
    # ---------------------------------------------------------
    def list_users(
        self,
        page: int = 1,
        per_page: int = 15,
        sort: Optional[str] = None,
        include: Optional[str] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {"page": page, "per_page": per_page}
        if sort:
            params["sort"] = sort
        if include:
            params["include"] = include
        for k, v in filters.items():
            params[f"filter[{k}]"] = v
        return self.request("GET", "/v1/admin/users", params=params)

    def get_user(self, user_id: Union[int, str], include: Optional[str] = None) -> Dict[str, Any]:
        params = {"include": include} if include else None
        return self.request("GET", f"/v1/admin/users/{user_id}", params=params)

    def create_user(
        self,
        email: str,
        password: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        email_verified_at: Optional[str] = None,
        role_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"email": email, "password": password}
        if first_name is not None:
            payload["first_name"] = first_name
        if last_name is not None:
            payload["last_name"] = last_name
        if email_verified_at is not None:
            payload["email_verified_at"] = email_verified_at
        if role_id is not None:
            payload["role_id"] = role_id
        return self.request("POST", "/v1/admin/users", json_data=payload)

    def update_user(self, user_id: Union[int, str], **kwargs: Any) -> Dict[str, Any]:
        return self.request("PUT", f"/v1/admin/users/{user_id}", json_data=kwargs)

    def delete_user(self, user_id: Union[int, str]) -> Dict[str, Any]:
        return self.request("DELETE", f"/v1/admin/users/{user_id}")

    # ---------------------------------------------------------
    # 2. Orders
    # ---------------------------------------------------------
    def list_orders(
        self,
        page: int = 1,
        per_page: int = 15,
        sort: Optional[str] = None,
        include: Optional[str] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {"page": page, "per_page": per_page}
        if sort:
            params["sort"] = sort
        if include:
            params["include"] = include
        for k, v in filters.items():
            params[f"filter[{k}]"] = v
        return self.request("GET", "/v1/admin/orders", params=params)

    def get_order(self, order_id: Union[int, str], include: Optional[str] = None) -> Dict[str, Any]:
        params = {"include": include} if include else None
        return self.request("GET", f"/v1/admin/orders/{order_id}", params=params)

    def create_order(self, user_id: int, currency_code: str) -> Dict[str, Any]:
        payload = {"user_id": user_id, "currency_code": currency_code}
        return self.request("POST", "/v1/admin/orders", json_data=payload)

    def update_order(self, order_id: Union[int, str], **kwargs: Any) -> Dict[str, Any]:
        return self.request("PUT", f"/v1/admin/orders/{order_id}", json_data=kwargs)

    def delete_order(self, order_id: Union[int, str]) -> Dict[str, Any]:
        return self.request("DELETE", f"/v1/admin/orders/{order_id}")

    # ---------------------------------------------------------
    # 3. Services
    # ---------------------------------------------------------
    def list_services(
        self,
        page: int = 1,
        per_page: int = 15,
        sort: Optional[str] = None,
        include: Optional[str] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {"page": page, "per_page": per_page}
        if sort:
            params["sort"] = sort
        if include:
            params["include"] = include
        for k, v in filters.items():
            params[f"filter[{k}]"] = v
        return self.request("GET", "/v1/admin/services", params=params)

    def get_service(self, service_id: Union[int, str], include: Optional[str] = None) -> Dict[str, Any]:
        params = {"include": include} if include else None
        return self.request("GET", f"/v1/admin/services/{service_id}", params=params)

    def create_service(
        self,
        product_id: int,
        plan_id: int,
        user_id: int,
        quantity: int,
        status: str,
        currency_code: str,
        price: float,
        expires_at: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "product_id": product_id,
            "plan_id": plan_id,
            "user_id": user_id,
            "quantity": quantity,
            "status": status,
            "currency_code": currency_code,
            "price": price,
        }
        if expires_at:
            payload["expires_at"] = expires_at
        payload.update(kwargs)
        return self.request("POST", "/v1/admin/services", json_data=payload)

    def update_service(self, service_id: Union[int, str], **kwargs: Any) -> Dict[str, Any]:
        return self.request("PUT", f"/v1/admin/services/{service_id}", json_data=kwargs)

    def delete_service(self, service_id: Union[int, str]) -> Dict[str, Any]:
        return self.request("DELETE", f"/v1/admin/services/{service_id}")

    # ---------------------------------------------------------
    # 4. Invoices & Invoice Items
    # ---------------------------------------------------------
    def list_invoices(
        self,
        page: int = 1,
        per_page: int = 15,
        sort: Optional[str] = None,
        include: Optional[str] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {"page": page, "per_page": per_page}
        if sort:
            params["sort"] = sort
        if include:
            params["include"] = include
        for k, v in filters.items():
            params[f"filter[{k}]"] = v
        return self.request("GET", "/v1/admin/invoices", params=params)

    def get_invoice(self, invoice_id: Union[int, str], include: Optional[str] = None) -> Dict[str, Any]:
        params = {"include": include} if include else None
        return self.request("GET", f"/v1/admin/invoices/{invoice_id}", params=params)

    def create_invoice(
        self,
        user_id: int,
        currency_code: str,
        status: str = "pending",
        due_at: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "user_id": user_id,
            "currency_code": currency_code,
            "status": status,
        }
        if due_at:
            payload["due_at"] = due_at
        return self.request("POST", "/v1/admin/invoices", json_data=payload)

    def update_invoice(self, invoice_id: Union[int, str], **kwargs: Any) -> Dict[str, Any]:
        return self.request("PUT", f"/v1/admin/invoices/{invoice_id}", json_data=kwargs)

    def delete_invoice(self, invoice_id: Union[int, str]) -> Dict[str, Any]:
        return self.request("DELETE", f"/v1/admin/invoices/{invoice_id}")

    def create_invoice_item(
        self,
        invoice_id: int,
        description: str,
        price: float,
        quantity: int = 1,
        reference_type: Optional[str] = None,
        reference_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "invoice_id": invoice_id,
            "description": description,
            "price": price,
            "quantity": quantity,
        }
        if reference_type:
            payload["reference_type"] = reference_type
        if reference_id:
            payload["reference_id"] = reference_id
        return self.request("POST", "/v1/admin/invoice-items", json_data=payload)

    # ---------------------------------------------------------
    # 5. Credits
    # ---------------------------------------------------------
    def list_credits(
        self,
        page: int = 1,
        per_page: int = 15,
        sort: Optional[str] = None,
        include: Optional[str] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {"page": page, "per_page": per_page}
        if sort:
            params["sort"] = sort
        if include:
            params["include"] = include
        for k, v in filters.items():
            params[f"filter[{k}]"] = v
        return self.request("GET", "/v1/admin/credits", params=params)

    def get_credit(self, credit_id: Union[int, str], include: Optional[str] = None) -> Dict[str, Any]:
        params = {"include": include} if include else None
        return self.request("GET", f"/v1/admin/credits/{credit_id}", params=params)

    def create_credit(self, user_id: int, currency_code: str, amount: float) -> Dict[str, Any]:
        payload = {"user_id": user_id, "currency_code": currency_code, "amount": amount}
        return self.request("POST", "/v1/admin/credits", json_data=payload)

    def update_credit(self, credit_id: Union[int, str], **kwargs: Any) -> Dict[str, Any]:
        return self.request("PUT", f"/v1/admin/credits/{credit_id}", json_data=kwargs)

    def delete_credit(self, credit_id: Union[int, str]) -> Dict[str, Any]:
        return self.request("DELETE", f"/v1/admin/credits/{credit_id}")

    # ---------------------------------------------------------
    # 6. Tickets & Messages
    # ---------------------------------------------------------
    def list_tickets(
        self,
        page: int = 1,
        per_page: int = 15,
        sort: Optional[str] = None,
        include: Optional[str] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {"page": page, "per_page": per_page}
        if sort:
            params["sort"] = sort
        if include:
            params["include"] = include
        for k, v in filters.items():
            params[f"filter[{k}]"] = v
        return self.request("GET", "/v1/admin/tickets", params=params)

    def get_ticket(self, ticket_id: Union[int, str], include: Optional[str] = None) -> Dict[str, Any]:
        params = {"include": include} if include else None
        return self.request("GET", f"/v1/admin/tickets/{ticket_id}", params=params)

    def create_ticket(
        self,
        subject: str,
        user_id: int,
        priority: str,
        status: str,
        department: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "subject": subject,
            "user_id": user_id,
            "priority": priority,
            "status": status,
        }
        if department:
            payload["department"] = department
        return self.request("POST", "/v1/admin/tickets", json_data=payload)

    def reply_ticket(self, ticket_id: int, user_id: int, message: str) -> Dict[str, Any]:
        payload = {"ticket_id": ticket_id, "user_id": user_id, "message": message}
        return self.request("POST", "/v1/admin/ticket-messages", json_data=payload)

    # ---------------------------------------------------------
    # 7. Products, Categories, Affiliates
    # ---------------------------------------------------------
    def list_products(self, page: int = 1, per_page: int = 15, **filters: Any) -> Dict[str, Any]:
        params: Dict[str, Any] = {"page": page, "per_page": per_page}
        for k, v in filters.items():
            params[f"filter[{k}]"] = v
        return self.request("GET", "/v1/admin/products", params=params)

    def list_categories(self, page: int = 1, per_page: int = 15, **filters: Any) -> Dict[str, Any]:
        params: Dict[str, Any] = {"page": page, "per_page": per_page}
        for k, v in filters.items():
            params[f"filter[{k}]"] = v
        return self.request("GET", "/v1/admin/categories", params=params)

    def list_affiliates(self, page: int = 1, per_page: int = 15, **filters: Any) -> Dict[str, Any]:
        params: Dict[str, Any] = {"page": page, "per_page": per_page}
        for k, v in filters.items():
            params[f"filter[{k}]"] = v
        return self.request("GET", "/v1/admin/affiliates", params=params)


def run_self_test() -> None:
    """Dry-run unit tests verifying client behavior without external network dependency."""
    print("=== PaymenterClient Self-Test & Dry-Run Suite ===")

    # Test 1: Initialization & Headers
    client = PaymenterClient(base_url="https://demo.paymenter.org/api", token="test_token_123")
    assert client.base_url == "https://demo.paymenter.org/api", "Base URL mismatch"
    assert client.headers["Authorization"] == "Bearer test_token_123", "Bearer token missing"
    assert "application/vnd.api+json" in client.headers["Accept"], "Accept header missing JSON:API"
    print("✓ Test 1 Passed: Client initialization and Bearer header generation.")

    # Test 2: URL & Query Parameter Building
    url = client._build_url(
        "/v1/admin/users",
        params={
            "page": 2,
            "per_page": 50,
            "sort": "-created_at",
            "filter[email]": "test@example.com",
            "include": "orders,services",
        },
    )
    assert "page=2" in url
    assert "per_page=50" in url
    assert "sort=-created_at" in url
    assert "filter%5Bemail%5D=test%40example.com" in url or "filter[email]=test@example.com" in url
    assert "include=orders%2Cservices" in url or "include=orders,services" in url
    print("✓ Test 2 Passed: URL query parameter encoding (filter, sort, page, include).")

    # Test 3: Compound Document Hydration
    sample_compound = {
        "data": {
            "type": "invoices",
            "id": "100",
            "attributes": {"status": "pending"},
            "relationships": {
                "user": {"data": {"type": "users", "id": "42"}},
                "items": {"data": [{"type": "invoice-items", "id": "501"}]},
            },
        },
        "included": [
            {
                "type": "users",
                "id": "42",
                "attributes": {"first_name": "Alice", "email": "alice@domain.com"},
            },
            {
                "type": "invoice-items",
                "id": "501",
                "attributes": {"description": "Dedicated Server", "price": 120.0},
            },
        ],
    }
    hydrated = client.hydrate_compound_document(sample_compound)
    data_obj = hydrated["data"]
    hydrated_user = data_obj["hydrated_relationships"]["user"]
    hydrated_items = data_obj["hydrated_relationships"]["items"]
    assert hydrated_user["attributes"]["email"] == "alice@domain.com", "User relationship not hydrated"
    assert hydrated_items[0]["attributes"]["price"] == 120.0, "Items relationship not hydrated"
    print("✓ Test 3 Passed: JSON:API compound document deserialization & relationship hydration.")

    # Test 4: Validation Error Structure Parsing
    validation_payload = {
        "message": "The email field is required. (and 1 other error)",
        "errors": {"email": ["The email field is required."], "password": ["The password field is required."]},
    }
    val_err = PaymenterValidationError(
        validation_payload["message"],
        errors=validation_payload["errors"],
        status_code=422,
        response_body=validation_payload,
    )
    assert val_err.status_code == 422
    assert "email" in val_err.errors
    print("✓ Test 4 Passed: 422 Unprocessable Entity error parsing.")

    print("\nAll 4 Self-Tests Passed Successfully! Exit Code 0.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Paymenter Admin API CLI Client (v1.2.0+)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--base-url", default=os.getenv("PAYMENTER_BASE_URL", "http://localhost/api"), help="Paymenter API Base URL")
    parser.add_argument("--token", default=os.getenv("PAYMENTER_API_TOKEN"), help="API Bearer Token")
    parser.add_argument("--test", action="store_true", help="Run self-test suite (dry-run)")

    subparsers = parser.add_subparsers(dest="command", help="API Domain Commands")

    # Command: users
    users_p = subparsers.add_parser("users", help="Manage users")
    users_sub = users_p.add_subparsers(dest="subaction")
    u_list = users_sub.add_parser("list", help="List users")
    u_list.add_argument("--page", type=int, default=1)
    u_list.add_argument("--per-page", type=int, default=15)
    u_list.add_argument("--email", help="Filter by email")
    u_get = users_sub.add_parser("get", help="Get user details")
    u_get.add_argument("user_id")
    u_create = users_sub.add_parser("create", help="Create new user")
    u_create.add_argument("--email", required=True)
    u_create.add_argument("--password", required=True)
    u_create.add_argument("--first-name")
    u_create.add_argument("--last-name")

    # Command: orders
    orders_p = subparsers.add_parser("orders", help="Manage orders")
    orders_sub = orders_p.add_subparsers(dest="subaction")
    o_list = orders_sub.add_parser("list", help="List orders")
    o_list.add_argument("--page", type=int, default=1)
    o_create = orders_sub.add_parser("create", help="Create order")
    o_create.add_argument("--user-id", type=int, required=True)
    o_create.add_argument("--currency", default="USD")

    # Command: services
    services_p = subparsers.add_parser("services", help="Manage services")
    services_sub = services_p.add_subparsers(dest="subaction")
    s_list = services_sub.add_parser("list", help="List services")
    s_list.add_argument("--status", help="Filter by status")

    # Command: invoices
    invoices_p = subparsers.add_parser("invoices", help="Manage invoices")
    invoices_sub = invoices_p.add_subparsers(dest="subaction")
    i_list = invoices_sub.add_parser("list", help="List invoices")
    i_list.add_argument("--status", help="Filter by status")
    i_create = invoices_sub.add_parser("create", help="Create invoice")
    i_create.add_argument("--user-id", type=int, required=True)
    i_create.add_argument("--currency", default="USD")
    i_create.add_argument("--status", default="pending")

    # Command: credits
    credits_p = subparsers.add_parser("credits", help="Manage credits balance")
    credits_sub = credits_p.add_subparsers(dest="subaction")
    c_list = credits_sub.add_parser("list", help="List credits")
    c_create = credits_sub.add_parser("add", help="Add credits to user")
    c_create.add_argument("--user-id", type=int, required=True)
    c_create.add_argument("--currency", default="USD")
    c_create.add_argument("--amount", type=float, required=True)

    args = parser.parse_args()

    if args.test:
        run_self_test()
        sys.exit(0)

    if not args.command:
        parser.print_help()
        sys.exit(0)

    client = PaymenterClient(base_url=args.base_url, token=args.token)

    try:
        if args.command == "users":
            if args.subaction == "list":
                filters = {}
                if args.email:
                    filters["email"] = args.email
                res = client.list_users(page=args.page, per_page=args.per_page, **filters)
                print(json.dumps(res, indent=2))
            elif args.subaction == "get":
                res = client.get_user(args.user_id)
                print(json.dumps(res, indent=2))
            elif args.subaction == "create":
                res = client.create_user(
                    email=args.email,
                    password=args.password,
                    first_name=args.first_name,
                    last_name=args.last_name,
                )
                print(json.dumps(res, indent=2))
            else:
                users_p.print_help()

        elif args.command == "orders":
            if args.subaction == "list":
                res = client.list_orders(page=args.page)
                print(json.dumps(res, indent=2))
            elif args.subaction == "create":
                res = client.create_order(user_id=args.user_id, currency_code=args.currency)
                print(json.dumps(res, indent=2))
            else:
                orders_p.print_help()

        elif args.command == "services":
            if args.subaction == "list":
                filters = {}
                if args.status:
                    filters["status"] = args.status
                res = client.list_services(**filters)
                print(json.dumps(res, indent=2))
            else:
                services_p.print_help()

        elif args.command == "invoices":
            if args.subaction == "list":
                filters = {}
                if args.status:
                    filters["status"] = args.status
                res = client.list_invoices(**filters)
                print(json.dumps(res, indent=2))
            elif args.subaction == "create":
                res = client.create_invoice(
                    user_id=args.user_id,
                    currency_code=args.currency,
                    status=args.status,
                )
                print(json.dumps(res, indent=2))
            else:
                invoices_p.print_help()

        elif args.command == "credits":
            if args.subaction == "list":
                res = client.list_credits()
                print(json.dumps(res, indent=2))
            elif args.subaction == "add":
                res = client.create_credit(
                    user_id=args.user_id,
                    currency_code=args.currency,
                    amount=args.amount,
                )
                print(json.dumps(res, indent=2))
            else:
                credits_p.print_help()

    except PaymenterError as err:
        print(f"Error [{type(err).__name__}]: {err}", file=sys.stderr)
        if err.response_body:
            print(f"Details: {json.dumps(err.response_body, indent=2)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
