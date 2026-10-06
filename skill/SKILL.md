---
name: paymenter-dev
description: "Comprehensive development and integration skill for Paymenter — the open-source payment and billing gateway platform for hosting and digital services. Use when developing, integrating, configuring, debugging, or automating with Paymenter Admin API (v1.2.0+): Bearer authentication, JSON:API conventions, Users sync, Orders, Services provisioning, Invoices & line items, Credits prepaid balance, and Support Tickets."
compatibility: "Universal for backend integrations (Python, Node.js, PHP, Go, cURL, Bash). Targets Paymenter Admin API v1.2.0+."
---

# Paymenter Dev & Integration Skill

## 1. Giới Thiệu & Kiến Trúc Tổng Quan

Kỹ năng này cung cấp hướng dẫn kỹ thuật chi tiết, quy chuẩn kiến trúc và bộ công cụ tự động hóa để tích hợp hệ thống phần mềm, website thương mại điện tử, CRM, bot quản lý máy chủ với **Paymenter** — nền tảng mã nguồn mở chuyên về thanh toán, quản lý hóa đơn (billing), và cấp phát dịch vụ lưu trữ số (hosting, VPS, tên miền, bản quyền).

### Thông Số Nền Tảng Cốt Lõi:
* **Hỗ trợ phiên bản:** Yêu cầu Paymenter v1.2.0 trở lên.
* **Base URL mặc định:** `http://localhost/api` (hoặc domain triển khai thực tế, ví dụ: `https://billing.example.com/api`).
* **Cơ chế xác thực (Authentication):** HTTP Bearer Token.
  - Header: `Authorization: Bearer <API_TOKEN>`
  - API Token được cấp phát trực tiếp trong giao diện Admin Dashboard của Paymenter.
* **Chuẩn dữ liệu (Data Format):** Tuân thủ đặc tả **JSON:API (v1.0)**:
  - `Accept: application/vnd.api+json, application/json`
  - `Content-Type: application/json` (cho các request `POST`, `PUT`)
  - Response luôn bọc tài nguyên trong cấu trúc `data`, `meta`, `links`, và `included`.
* **Quy mô nghiệp vụ:** Bao gồm 22 endpoints quản trị chia thành 11 phân hệ: Users, Orders, Products, Categories, Services, Invoices, Invoice Items, Credits, Tickets, Ticket Messages, Affiliates.

---

## 2. Khi Nào Kích Hoạt Kỹ Năng Này (When to Use)

Kích hoạt kỹ năng này khi thực hiện các tác vụ sau:
1. **Xác thực & Kết nối API:** Cấu hình Bearer token, khởi tạo HTTP client, kiểm tra tính sẵn sàng của Paymenter backend.
2. **Đồng bộ Người dùng (Users Sync):** Đồng bộ danh tính khách hàng từ SSO, CRM bên ngoài, Telegram Bot, hoặc WooCommerce vào Paymenter.
3. **Vòng đời Cấp phát Dịch vụ (Service Provisioning):** Xử lý đơn hàng (`/orders`), tạo dịch vụ (`/services`) tự động sau khi thanh toán, quản lý trạng thái (`pending` -> `active` -> `suspended` -> `cancelled`).
4. **Quản lý Hóa đơn & Bán hàng (Invoices & Line Items):** Tạo hóa đơn định kỳ, thêm mục phí (`/invoice-items`), cập nhật trạng thái thanh toán (`paid`), tính hạn thanh toán (`due_at`).
5. **Ví Số Dư & Tín Dụng Khách Hàng (Credits / Wallet):** Nạp tiền trước, kiểm tra số dư (`/credits`), trừ tiền từ số dư khả dụng khi thanh toán tự động.
6. **Hệ Thống Chăm Sóc Khách Hàng (Support Tickets):** Mở ticket (`/tickets`), chuyển giao phòng ban, tự động trả lời (`/ticket-messages`), tích hợp bot hỗ trợ trực tuyến.
7. **Debug & Xử lý sự cố:** Khắc phục lỗi xác thực 401/403, lỗi dữ liệu đầu vào 422 Unprocessable Entity, và giải mã compound documents (`included`).

---

## 3. Quy Tắc Chuẩn JSON:API

Paymenter áp dụng chuẩn JSON:API để đảm bảo tính nhất quán cao trong mô hình dữ liệu:

### 3.1. Cấu Trúc Tài Nguyên Đơn (Single Resource)
Mỗi đối tượng luôn chứa các trường chuẩn:
* `type`: Định danh loại thực thể (vd: `users`, `orders`, `invoices`, `services`).
* `id`: Khóa chính định danh thực thể.
* `attributes`: Chứa các trường dữ liệu của thực thể.
* `relationships`: Tham chiếu định danh tới các thực thể liên quan (`data: {type, id}`).

### 3.2. Sắp Xếp & Lọc Dữ Liệu
* **Lọc:** Sử dụng cú pháp `filter[tên_trường]=giá_trị`.
  - Ví dụ: `GET /v1/admin/users?filter[email]=user@example.com`
  - Ví dụ: `GET /v1/admin/invoices?filter[status]=pending&filter[currency_code]=USD`
* **Sắp xếp:** Sử dụng tham số `sort`.
  - Tăng dần: `sort=created_at`
  - Giảm dần: `sort=-created_at`
* **Phân trang:** `page=1&per_page=20` (siêu dữ liệu nằm trong `meta` và `links`).

### 3.3. Sideloading với `include` (Compound Documents)
Để tránh gọi nhiều request (bài toán N+1), truyền danh sách quan hệ vào query parameter `include`:
* `GET /v1/admin/invoices/10?include=user,items`
Response sẽ trả về các đối tượng quan hệ trong mảng cấp cao `included`. Client SDK cần ánh xạ khóa `(type, id)` từ `included` vào các thuộc tính của `data`.

> [!NOTE]
> Đọc tài liệu chi tiết về cơ chế JSON:API tại [jsonapi-conventions.md](file:///home/dongocanh/.agents/skills/paymenter-dev/references/jsonapi-conventions.md).

---

## 4. 5 Quy Trình Vận Hành Chuẩn (Core Workflows)

### Workflow 1: Đồng Bộ Người Dùng & Quản Trị Danh Tính (User Sync)

Quy trình đồng bộ người dùng từ ứng dụng ngoài hoặc đăng ký mới vào Paymenter.

```text
┌──────────────┐
│CRM_Or_Webhook│
└┬─────────────┘
┌▽──────────┐   
│Create_User│   
└┬──────────┘   
┌▽──────────┐   
│Assign_Role│   
└┬──────────┘   
┌▽───────────┐  
│Verify_Email│  
└┬───────────┘  
┌▽──────────┐   
│Active_User│   
└───────────┘
```

#### Các bước thực hiện:
1. Kiểm tra tài khoản đã tồn tại chưa:
   `GET /v1/admin/users?filter[email]=customer@domain.com`
2. Nếu chưa tồn tại, tạo người dùng mới:
   `POST /v1/admin/users`
   ```json
   {
     "email": "customer@domain.com",
     "password": "SecureRandomPassword123!",
     "first_name": "Minh",
     "last_name": "Tran",
     "email_verified_at": "2026-10-06T00:00:00Z"
   }
   ```
3. Lưu lại `user.id` trả về để sử dụng cho các tác vụ đơn hàng và cấp phát tiếp theo.

---

### Workflow 2: Tạo Đơn Hàng & Vòng Đời Cấp Phát Dịch Vụ (Order & Provisioning)

Quy trình hoàn chỉnh từ lúc khách đặt hàng, thanh toán đến khi dịch vụ được kích hoạt.

```text
┌───────────┐      
│Place_Order│      
└┬──────────┘      
┌▽───────────┐     
│Create_Order│     
└┬───────────┘     
┌▽───────────────┐ 
│Generate_Invoice│ 
└┬───────────────┘ 
┌▽────────────────┐
│Add_Invoice_Items│
└┬────────────────┘
┌▽─────────────┐   
│Settle_Payment│   
└┬─────────────┘   
┌▽────────────────┐
│Provision_Service│
└─────────────────┘
```

#### Các bước thực hiện:
1. **Khởi tạo đơn hàng:**
   `POST /v1/admin/orders`
   Payload: `{"user_id": 58, "currency_code": "USD"}`
2. **Khởi tạo hóa đơn liên kết:**
   `POST /v1/admin/invoices`
   Payload: `{"user_id": 58, "currency_code": "USD", "status": "pending", "due_at": "2026-10-10T00:00:00Z"}`
3. **Thêm dòng chi tiết dịch vụ:**
   `POST /v1/admin/invoice-items`
   Payload: `{"invoice_id": 1042, "description": "VPS Cloud Pro - 1 Month", "price": 25.00, "quantity": 1}`
4. **Ghi nhận thanh toán thành công:**
   `PUT /v1/admin/invoices/1042` -> `{"status": "paid"}`
5. **Kích hoạt cấp phát dịch vụ thực tế:**
   `POST /v1/admin/services`
   ```json
   {
     "product_id": 12,
     "plan_id": 3,
     "user_id": 58,
     "order_id": 150,
     "quantity": 1,
     "status": "active",
     "currency_code": "USD",
     "price": 25.00,
     "expires_at": "2026-11-06T00:00:00Z"
   }
   ```

---

### Workflow 3: Quản Lý Hóa Đơn Định Kỳ & Mục Hàng (Invoices & Billing)

Quy trình chu kỳ thanh toán định kỳ hàng tháng cho các dịch vụ đang hoạt động.

```text
┌─────────────┐    
│Billing_Cycle│    
└┬────────────┘    
┌▽───────────────┐ 
│Generate_Invoice│ 
└┬───────────────┘ 
┌▽─────────────┐   
│Add_Line_Items│   
└┬─────────────┘   
┌▽──────────────┐  
│Notify_Customer│  
└┬──────────────┘  
┌▽────────────────┐
│Mark_Invoice_Paid│
└─────────────────┘
```

#### Các bước thực hiện:
1. Quét danh sách dịch vụ sắp hết hạn:
   `GET /v1/admin/services?filter[status]=active`
2. Tạo hóa đơn gia hạn mới:
   `POST /v1/admin/invoices` -> `{"user_id": 58, "currency_code": "USD", "status": "pending"}`
3. Gắn tham chiếu dịch vụ vào dòng hóa đơn:
   `POST /v1/admin/invoice-items`
   ```json
   {
     "invoice_id": 1045,
     "description": "Renewal: VPS Cloud Pro",
     "price": 25.00,
     "quantity": 1,
     "reference_type": "App\\Models\\Service",
     "reference_id": 204
   }
   ```
4. Khi nhận được tiền từ cổng thanh toán hoặc webhook ngân hàng:
   `PUT /v1/admin/invoices/1045` -> `{"status": "paid"}`
5. Gia hạn thời điểm hết hạn dịch vụ thêm 30 ngày:
   `PUT /v1/admin/services/204` -> `{"expires_at": "2026-12-06T00:00:00Z"}`

---

### Workflow 4: Quản Lý Số Dư Tín Dụng Trả Trước (Credits / Prepaid Balance)

Cho phép khách nạp quỹ vào tài khoản và tự động thanh toán hóa đơn bằng số dư có sẵn.

```text
┌───────────────┐        
│Deposit_Request│        
└┬──────────────┘        
┌▽─────────────┐         
│Verify_Gateway│         
└┬─────────────┘         
┌▽─────────────────┐     
│Credit_User_Wallet│     
└┬─────────────────┘     
┌▽──────────────────────┐
│Pay_Invoice_With_Credit│
└───────────────────────┘
```

#### Các bước thực hiện:
1. Khách hàng nạp $100 qua cổng thanh toán. Sau khi cổng xác nhận thành công, cộng số dư cho user:
   `POST /v1/admin/credits`
   ```json
   {
     "user_id": 58,
     "currency_code": "USD",
     "amount": 100.00
   }
   ```
2. Kiểm tra số dư ví hiện tại của người dùng:
   `GET /v1/admin/credits?filter[user_id]=58`
3. Cập nhật số dư (nếu trừ phí trực tiếp):
   `PUT /v1/admin/credits/12` -> `{"amount": 75.00}`

---

### Workflow 5: Tiếp Nhận & Phản Hồi Phiếu Hỗ Trợ (Support Tickets & Messages)

Quy trình tự động hóa CSKH, tiếp nhận yêu cầu từ khách và phản hồi qua bot hoặc staff.

```text
┌───────────┐       
│User_Ticket│       
└┬──────────┘       
┌▽──────────┐       
│Open_Ticket│       
└┬──────────┘       
┌▽─────────────────┐
│Staff_Notification│
└┬─────────────────┘
┌▽────────────────┐ 
│Post_Ticket_Reply│ 
└┬────────────────┘ 
┌▽───────────┐      
│Close_Ticket│      
└────────────┘
```

#### Các bước thực hiện:
1. Tiếp nhận và tạo ticket mới thay mặt user:
   `POST /v1/admin/tickets`
   ```json
   {
     "subject": "Không thể truy cập máy chủ VPS",
     "user_id": 58,
     "priority": "high",
     "status": "open",
     "department": "Technical Support"
   }
   ```
2. Gửi phản hồi đầu tiên hoặc tin nhắn từ bot/kỹ thuật viên:
   `POST /v1/admin/ticket-messages`
   ```json
   {
     "ticket_id": 45,
     "user_id": 1,
     "message": "Chào bạn, đội ngũ kỹ thuật đang kiểm tra kết nối mạng của cụm máy chủ và sẽ phản hồi trong 15 phút."
   }
   ```
3. Sau khi sự cố được khắc phục, đóng ticket:
   `PUT /v1/admin/tickets/45` -> `{"status": "closed"}`

---

## 5. Xử Lý Sự Cố & Mã Lỗi (Troubleshooting & Error Codes)

| Mã HTTP | Tên Lỗi | Nguyên Nhân Phổ Biến | Giải Pháp Khắc Phục |
|---|---|---|---|
| **401** | Unauthorized | Token bị thiếu, sai format, hoặc đã bị thu hồi trong Admin | Kiểm tra header `Authorization: Bearer <token>`, tạo token mới trong Paymenter UI. |
| **403** | Forbidden | Token hợp lệ nhưng tài khoản không có quyền Admin | Kiểm tra quyền của tài khoản (Role permissions) trong `/v1/admin/users`. |
| **404** | Not Found | ID tài nguyên không tồn tại trong DB hoặc sai endpoint | Kiểm tra lại ID trong URL (ví dụ: `/v1/admin/invoices/9999`). |
| **422** | Unprocessable Entity | Dữ liệu gửi lên thiếu trường bắt buộc hoặc sai định dạng | Đọc trường `errors` trong response JSON để xác định trường bị lỗi. |
| **500** | Internal Server Error | Lỗi cơ sở dữ liệu hoặc cấu hình máy chủ Paymenter | Kiểm tra log Laravel tại `storage/logs/laravel.log`. |

### Định dạng chi tiết mã lỗi 422:
```json
{
  "message": "The email field is required. (and 1 other error)",
  "errors": {
    "email": [
      "The email field is required."
    ],
    "password": [
      "The password must be at least 8 characters."
    ]
  }
}
```

---

## 6. Bộ Tài Liệu Tham Chiếu & Công Cụ SDK Đi Kèm

Hệ thống kỹ năng được trang bị đầy đủ tài liệu và công cụ thực thi:
* **Tài liệu 22 Endpoints chi tiết:** [api-endpoints.md](file:///home/dongocanh/.agents/skills/paymenter-dev/references/api-endpoints.md)
* **Quy chuẩn JSON:API & Compound Documents:** [jsonapi-conventions.md](file:///home/dongocanh/.agents/skills/paymenter-dev/references/jsonapi-conventions.md)
* **SDK Python & CLI Tool:** [paymenter_client.py](file:///home/dongocanh/.agents/skills/paymenter-dev/scripts/paymenter_client.py)
  - Chạy kiểm tra tự động (Self-test):
    ```bash
    /home/dongocanh/.agents/skills/paymenter-dev/scripts/paymenter_client.py --test
    ```
  - Liệt kê người dùng:
    ```bash
    /home/dongocanh/.agents/skills/paymenter-dev/scripts/paymenter_client.py --token "YOUR_TOKEN" users list
    ```
  - Tạo đơn hàng:
    ```bash
    /home/dongocanh/.agents/skills/paymenter-dev/scripts/paymenter_client.py --token "YOUR_TOKEN" orders create --user-id 1 --currency USD
    ```
