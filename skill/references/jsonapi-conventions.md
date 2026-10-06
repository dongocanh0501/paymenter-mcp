# JSON:API Conventions & Integration Standards in Paymenter

Tài liệu này đặc tả quy chuẩn giao tiếp, định dạng payload, cơ chế truy vấn (querying), sideloading và giải mã compound documents theo chuẩn **JSON:API** (v1.0) được áp dụng trên Paymenter (phiên bản v1.2.0 trở lên).

---

## 1. Cấu Trúc Tổng Quan (Specification Overview)

Paymenter tuân thủ kiến trúc RESTful dựa trên đặc tả JSON:API:
* **Mime Type chuẩn:** `application/vnd.api+json`
* **Headers yêu cầu trên mọi Request:**
  ```http
  Authorization: Bearer <API_TOKEN>
  Accept: application/vnd.api+json, application/json
  Content-Type: application/json
  ```
* **Top-Level Document Keys:**
  - `data`: Chứa dữ liệu tài nguyên chính (Object hoặc Array).
  - `included`: Chứa các tài nguyên liên quan được sideload (khi có tham số `include`).
  - `meta`: Chứa siêu dữ liệu phân trang (`current_page`, `per_page`, `from`, `to`, `path`).
  - `links`: Chứa liên kết phân trang (`first`, `last`, `prev`, `next`).
  - `errors`: Mảng các đối tượng lỗi khi request thất bại.

---

## 2. Định Dạng Phản Hồi (Response Structure)

### 2.1. Bản Ghi Đơn Lẻ (Single Resource Object)
Mỗi đối tượng tài nguyên trong `data` luôn bao gồm ít nhất:
* `id`: Định danh duy nhất (chuỗi hoặc số nguyên).
* `type`: Kiểu tài nguyên (danh từ số nhiều, ví dụ: `users`, `orders`, `invoices`, `services`).
* `attributes`: Đối tượng chứa toàn bộ thuộc tính dữ liệu của tài nguyên.
* `relationships`: (Tùy chọn) Đối tượng chứa liên kết định danh tới các tài nguyên khác.

```json
{
  "data": {
    "type": "invoices",
    "id": "1042",
    "attributes": {
      "status": "pending",
      "currency_code": "USD",
      "due_at": "2026-10-15T00:00:00.000000Z",
      "created_at": "2026-10-06T08:00:00.000000Z",
      "updated_at": "2026-10-06T08:00:00.000000Z"
    },
    "relationships": {
      "user": {
        "data": {
          "type": "users",
          "id": "58"
        }
      },
      "items": {
        "data": [
          {
            "type": "invoice-items",
            "id": "201"
          }
        ]
      }
    }
  }
}
```

### 2.2. Danh Sách Bản Ghi (Collection with Pagination)
Khi truy vấn danh sách (GET Collection), response trả về mảng `data` cùng với `meta` và `links`:

```json
{
  "data": [
    {
      "type": "users",
      "id": "58",
      "attributes": {
        "first_name": "Nguyen",
        "last_name": "An",
        "email": "an.nguyen@example.com",
        "email_verified_at": "2026-10-01T10:00:00.000000Z",
        "created_at": "2026-10-01T09:30:00.000000Z",
        "updated_at": "2026-10-06T08:00:00.000000Z"
      },
      "relationships": {
        "orders": {
          "data": [
            { "type": "orders", "id": "12" }
          ]
        }
      }
    }
  ],
  "links": {
    "first": "http://localhost/api/v1/admin/users?page=1",
    "last": "http://localhost/api/v1/admin/users?page=5",
    "prev": null,
    "next": "http://localhost/api/v1/admin/users?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "to": 15,
    "per_page": 15,
    "path": "http://localhost/api/v1/admin/users"
  }
}
```

---

## 3. Cú Pháp Truy Vấn (Querying Conventions)

### 3.1. Lọc Dữ Liệu (Filtering: `filter[...]`)
Paymenter hỗ trợ lọc theo từng trường thông qua cú pháp query parameter: `filter[<field>]=<value>`.

Ví dụ:
* Lọc người dùng theo email:
  `GET /v1/admin/users?filter[email]=admin@example.com`
* Lọc hóa đơn theo trạng thái và mã tiền tệ:
  `GET /v1/admin/invoices?filter[status]=paid&filter[currency_code]=USD`
* Lọc dịch vụ theo số lượng và trạng thái:
  `GET /v1/admin/services?filter[status]=active&filter[quantity]=1`
* Lọc ticket theo phòng ban và độ ưu tiên:
  `GET /v1/admin/tickets?filter[department]=Technical&filter[priority]=high`

### 3.2. Sắp Xếp (Sorting: `sort`)
Sử dụng tham số `sort` với tên thuộc tính:
* Tăng dần (Ascending): `sort=created_at`
* Giảm dần (Descending): Dấu trừ `-` đứng trước tên trường, ví dụ: `sort=-created_at`
* Đa trường (Multiple fields): Phân cách bằng dấu phẩy `,`, ví dụ: `sort=-created_at,id`

Ví dụ:
`GET /v1/admin/orders?sort=-id`

### 3.3. Phân Trang (Pagination: `page` & `per_page`)
* `page`: Số thứ tự trang hiện tại (bắt đầu từ `1`).
* `per_page`: Số lượng phần tử trả về trên mỗi trang (mặc định thường là 15 hoặc 20).

Ví dụ:
`GET /v1/admin/invoices?page=2&per_page=50`

---

## 4. Cơ Chế Sideloading & Compound Documents (`include`)

### 4.1. Khái Niệm Compound Documents
Nhằm giải quyết bài toán N+1 requests, Paymenter cho phép nạp đồng thời các đối tượng quan hệ (Relationships) trong một HTTP request duy nhất bằng tham số `include`.
Khi tham số `include` được cung cấp, response sẽ chứa trường cấp cao `included` là một danh sách phẳng các đối tượng phụ thuộc.

### 4.2. Cú Pháp Request
Phân cách các quan hệ bằng dấu phẩy `,`:
```http
GET /v1/admin/invoices/1042?include=user,items HTTP/1.1
Host: localhost
Authorization: Bearer YOUR_API_TOKEN
Accept: application/vnd.api+json
```

### 4.3. Cấu Trúc Compound Document Trả Về
```json
{
  "data": {
    "type": "invoices",
    "id": "1042",
    "attributes": {
      "status": "pending",
      "currency_code": "USD"
    },
    "relationships": {
      "user": {
        "data": { "type": "users", "id": "58" }
      },
      "items": {
        "data": [
          { "type": "invoice-items", "id": "201" }
        ]
      }
    }
  },
  "included": [
    {
      "type": "users",
      "id": "58",
      "attributes": {
        "first_name": "Nguyen",
        "last_name": "An",
        "email": "an.nguyen@example.com"
      }
    },
    {
      "type": "invoice-items",
      "id": "201",
      "attributes": {
        "description": "VPS Cloud Starter (1 Month)",
        "price": 15.00,
        "quantity": 1
      }
    }
  ]
}
```

### 4.4. Thuật Toán Giải Mã Compound Documents (Client-Side Hydration)
Để liên kết dữ liệu trong client SDK:
1. Xây dựng một **Lookup Dictionary / Map** từ mảng `included` với khóa là tuple `(type, id)`:
   ```python
   included_map = {
       (item["type"], str(item["id"])): item
       for item in response.get("included", [])
   }
   ```
2. Với mỗi đối tượng trong `data`, duyệt qua trường `relationships`:
   - Nếu `relationship["data"]` là Object `{type, id}` (To-One): Tra cứu trong `included_map` và gán đối tượng hoàn chỉnh vào thuộc tính tương ứng.
   - Nếu `relationship["data"]` là Array `[{type, id}, ...]` (To-Many): Duyệt từng phần tử, tra cứu trong `included_map` và gom lại thành danh sách đối tượng hoàn chỉnh.

---

## 5. Định Dạng Request Body (POST / PUT)

Trong Paymenter API v1.2+, các endpoint tạo mới (`POST`) và cập nhật (`PUT`) tiếp nhận payload dạng JSON phẳng (Flat JSON Object) tương thích trực tiếp với Laravel Form Request:

```json
// POST /v1/admin/orders
{
  "user_id": 58,
  "currency_code": "USD"
}
```

```json
// POST /v1/admin/services
{
  "product_id": 10,
  "plan_id": 2,
  "user_id": 58,
  "quantity": 1,
  "status": "active",
  "currency_code": "USD",
  "price": 15.00,
  "expires_at": "2026-11-06T00:00:00Z"
}
```

---

## 6. Xử Lý Lỗi (Error Handling)

### 6.1. Mã Lỗi 422 - Lỗi Xác Thực Đầu Vào (Unprocessable Entity)
Khi dữ liệu gửi lên không đúng định dạng hoặc thiếu các trường bắt buộc, API trả về mã HTTP 422:

```json
{
  "message": "The user id field is required. (and 1 other error)",
  "errors": {
    "user_id": [
      "The user id field is required."
    ],
    "currency_code": [
      "The currency code must be a valid 3-letter ISO code."
    ]
  }
}
```

### 6.2. Mã Lỗi 401 & 403 - Xác Thực & Phân Quyền
* `401 Unauthorized`: Token không tồn tại, hết hạn, hoặc cú pháp Header `Authorization: Bearer <token>` bị sai.
* `403 Forbidden`: Token hợp lệ nhưng tài khoản/Role không có quyền truy cập endpoint quản trị admin.

### 6.3. Mã Lỗi 404 - Không Tìm Thấy Bản Ghi
Xảy ra khi `id` truyền vào đường dẫn URL (như `/v1/admin/users/9999`) không tồn tại trong cơ sở dữ liệu. Response trả về:
```json
{
  "message": "Resource not found"
}
```
