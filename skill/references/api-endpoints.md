# Paymenter API v1 Admin Endpoints Reference

Tài liệu tham chiếu chi tiết và toàn diện 22 endpoints thuộc 11 miền nghiệp vụ quản trị (Admin API) của Paymenter (yêu cầu Paymenter v1.2.0 trở lên).

---

## Bảng Mục Lục 11 Miền Nghiệp Vụ
1. [Users (Người Dùng)](#1-users) (5 endpoints)
2. [Orders (Đơn Hàng)](#2-orders) (5 endpoints)
3. [Products (Sản Phẩm)](#3-products) (2 endpoints)
4. [Categories (Danh Mục)](#4-categories) (2 endpoints)
5. [Services (Dịch Vụ Đã Cấp Phát)](#5-services) (5 endpoints)
6. [Invoices (Hóa Đơn)](#6-invoices) (5 endpoints)
7. [Invoice Items (Mục Chi Tiết Hóa Đơn)](#7-invoice-items) (5 endpoints)
8. [Credits (Số Dư Nạp Trước / Tín Dụng)](#8-credits) (5 endpoints)
9. [Tickets (Phiếu Hỗ Trợ)](#9-tickets) (5 endpoints)
10. [Ticket Messages (Tin Nhắn Phản Hồi)](#10-ticket-messages) (4 endpoints)
11. [Affiliates (Đối Tác Tiếp Thị Liên Kết)](#11-affiliates) (5 endpoints)

**Tổng số:** 22 endpoints (45 HTTP operations).

---

## 1. Users

### `GET /v1/admin/users`
* **Mục đích:** Liệt kê danh sách người dùng với phân trang, sắp xếp và lọc.
* **Query Parameters:**
  - `page` (integer, tùy chọn): Số trang (mặc định 1).
  - `per_page` (integer, tùy chọn): Số mục trên mỗi trang (mặc định 15).
  - `sort` (string, tùy chọn): Trường sắp xếp (vd: `id`, `-id`, `email`, `-created_at`).
  - `include` (string, tùy chọn): Danh sách quan hệ gom kèm (`properties`, `orders`, `services`, `invoices`, `tickets`, `credits`, `role`).
  - `filter[first_name]` (string, tùy chọn): Lọc theo tên.
  - `filter[last_name]` (string, tùy chọn): Lọc theo họ.
  - `filter[email]` (string, tùy chọn): Lọc theo địa chỉ email.
* **Response (HTTP 200):** JSON:API Collection chứa mảng `UserResource`, `links`, `meta`, `included`.

### `POST /v1/admin/users`
* **Mục đích:** Tạo tài khoản người dùng mới trong hệ thống.
* **Request Body (application/json):**
  - `email` (string, **bắt buộc**, định dạng email): Email của người dùng.
  - `password` (string, **bắt buộc**): Mật khẩu khởi tạo.
  - `first_name` (string, tùy chọn): Tên.
  - `last_name` (string, tùy chọn): Họ.
  - `email_verified_at` (string, tùy chọn, date-time ISO 8601): Thời điểm xác thực email.
  - `role_id` (integer, tùy chọn): ID của quyền/vai trò quản trị.
* **Response (HTTP 200):** `{"data": UserResource}`.

### `GET /v1/admin/users/{user}`
* **Mục đích:** Lấy thông tin chi tiết của một người dùng theo ID.
* **Path Parameters:**
  - `user` (integer/string, **bắt buộc**): ID của người dùng.
* **Query Parameters:**
  - `include` (string, tùy chọn): Quan hệ gom kèm (`properties`, `orders`, `services`, `invoices`, `tickets`, `credits`, `role`).
* **Response (HTTP 200):** `{"data": UserResource}`.

### `PUT /v1/admin/users/{user}`
* **Mục đích:** Cập nhật thông tin người dùng.
* **Path Parameters:** `user` (integer/string, **bắt buộc**).
* **Request Body (application/json):**
  - `first_name` (string, tùy chọn)
  - `last_name` (string, tùy chọn)
  - `email` (string, tùy chọn, định dạng email)
  - `password` (string, tùy chọn)
  - `email_verified_at` (string, tùy chọn, date-time ISO 8601)
  - `role_id` (integer, tùy chọn)
* **Response (HTTP 200):** `{"data": UserResource}`.

### `DELETE /v1/admin/users/{user}`
* **Mục đích:** Xóa tài khoản người dùng khỏi hệ thống.
* **Path Parameters:** `user` (integer/string, **bắt buộc**).
* **Response (HTTP 204):** Không có nội dung trả về (No Content).

---

## 2. Orders

### `GET /v1/admin/orders`
* **Mục đích:** Liệt kê danh sách đơn hàng.
* **Query Parameters:**
  - `page`, `per_page`, `sort`
  - `include`: `services`, `user`
  - `filter[id]` (string, tùy chọn): Lọc theo ID đơn hàng.
  - `filter[currency_code]` (string, tùy chọn): Lọc theo mã tiền tệ (vd: `USD`, `EUR`, `VND`).
* **Response (HTTP 200):** Collection `OrderResource`, `meta`, `links`.

### `POST /v1/admin/orders`
* **Mục đích:** Tạo đơn hàng mới.
* **Request Body (application/json):**
  - `user_id` (integer, **bắt buộc**): ID người dùng sở hữu đơn hàng.
  - `currency_code` (string, **bắt buộc**, 3 ký tự ISO): Mã đơn vị tiền tệ.
* **Response (HTTP 200):** `{"data": OrderResource}`.

### `GET /v1/admin/orders/{order}`
* **Mục đích:** Chi tiết một đơn hàng theo ID.
* **Path Parameters:** `order` (integer/string, **bắt buộc**).
* **Query Parameters:** `include`: `services`, `user`.
* **Response (HTTP 200):** `{"data": OrderResource}`.

### `PUT /v1/admin/orders/{order}`
* **Mục đích:** Cập nhật đơn hàng.
* **Request Body:**
  - `user_id` (integer, tùy chọn)
  - `currency_code` (string, tùy chọn)
* **Response (HTTP 200):** `{"data": OrderResource}`.

### `DELETE /v1/admin/orders/{order}`
* **Mục đích:** Xóa đơn hàng.
* **Response (HTTP 204):** No Content.

---

## 3. Products

### `GET /v1/admin/products`
* **Mục đích:** Liệt kê danh mục gói sản phẩm trong hệ thống Paymenter.
* **Query Parameters:**
  - `page`, `per_page`, `sort`
  - `include`: `category`, `plans`
  - `filter[name]` (string, tùy chọn): Tìm theo tên sản phẩm.
  - `filter[slug]` (string, tùy chọn): Tìm theo slug đường dẫn.
  - `filter[category_id]` (integer, tùy chọn): Lọc theo chuyên mục.
  - `filter[server_id]` (integer, tùy chọn): Lọc theo máy chủ quản lý.
  - `filter[hidden]` (boolean, tùy chọn): Lọc sản phẩm ẩn/hiện.
  - `filter[allow_quantity]` (boolean, tùy chọn): Lọc theo cho phép tùy chỉnh số lượng.
* **Response (HTTP 200):** Collection `ProductResource`, `meta`, `links`.

### `GET /v1/admin/products/{product}`
* **Mục đích:** Xem chi tiết một gói sản phẩm.
* **Path Parameters:** `product` (integer/string, **bắt buộc**).
* **Query Parameters:** `include`: `category`, `plans`.
* **Response (HTTP 200):** `{"data": ProductResource}`.

---

## 4. Categories

### `GET /v1/admin/categories`
* **Mục đích:** Liệt kê danh mục chuyên mục sản phẩm.
* **Query Parameters:**
  - `page`, `per_page`, `sort`
  - `include`: `products`, `parent`, `children`
  - `filter[name]` (string, tùy chọn): Lọc theo tên chuyên mục.
  - `filter[parent_id]` (integer, tùy chọn): Lọc theo danh mục cha.
  - `filter[slug]` (string, tùy chọn): Lọc theo slug.
* **Response (HTTP 200):** Collection `CategoryResource`.

### `GET /v1/admin/categories/{category}`
* **Mục đích:** Xem chi tiết chuyên mục.
* **Path Parameters:** `category` (integer/string, **bắt buộc**).
* **Query Parameters:** `include`: `products`, `parent`, `children`.
* **Response (HTTP 200):** `{"data": CategoryResource}`.

---

## 5. Services

### `GET /v1/admin/services`
* **Mục đích:** Liệt kê toàn bộ dịch vụ đã cấp phát (active, suspended, cancelled, pending).
* **Query Parameters:**
  - `page`, `per_page`, `sort`
  - `include`: `coupon`, `user`, `order`, `product`, `invoices`, `properties`
  - `filter[quantity]` (integer, tùy chọn): Lọc theo số lượng.
  - `filter[price]` (number, tùy chọn): Lọc theo đơn giá.
  - `filter[expires_at]` (string date-time, tùy chọn): Lọc theo ngày hết hạn.
  - `filter[subscription_id]` (string, tùy chọn): Lọc theo mã gói gia hạn định kỳ.
  - `filter[status]` (string, tùy chọn): Lọc theo trạng thái (`pending`, `active`, `suspended`, `cancelled`).
* **Response (HTTP 200):** Collection `ServiceResource`.

### `POST /v1/admin/services`
* **Mục đích:** Tạo mới hoặc cấp phát trực tiếp một dịch vụ cho người dùng.
* **Request Body (application/json):**
  - `product_id` (integer, **bắt buộc**): ID sản phẩm.
  - `plan_id` (integer, **bắt buộc**): ID gói thanh toán (chu kỳ tháng/năm).
  - `user_id` (integer, **bắt buộc**): ID người dùng nhận dịch vụ.
  - `quantity` (integer, **bắt buộc**): Số lượng.
  - `status` (string, **bắt buộc**): Trạng thái dịch vụ (`pending`, `active`, `suspended`, `cancelled`).
  - `currency_code` (string, **bắt buộc**): Mã tiền tệ ISO (vd: `USD`).
  - `price` (number, **bắt buộc**): Giá định kỳ của dịch vụ.
  - `expires_at` (string date-time ISO 8601, tùy chọn): Thời điểm hết hạn dịch vụ.
  - `suspend_hold_until` (string date-time ISO 8601, tùy chọn): Thời hạn ân hạn trước khi tạm đình chỉ.
  - `coupon_id` (integer, tùy chọn): ID mã giảm giá áp dụng.
  - `subscription_id` (string, tùy chọn): Định danh subscription trên cổng thanh toán.
  - `order_id` (integer, tùy chọn): ID đơn hàng liên kết.
* **Response (HTTP 200):** `{"data": ServiceResource}`.

### `GET /v1/admin/services/{service}`
* **Mục đích:** Xem chi tiết dịch vụ theo ID.
* **Path Parameters:** `service` (integer/string, **bắt buộc**).
* **Query Parameters:** `include`: `coupon`, `user`, `order`, `product`, `invoices`, `properties`.
* **Response (HTTP 200):** `{"data": ServiceResource}`.

### `PUT /v1/admin/services/{service}`
* **Mục đích:** Cập nhật trạng thái hoặc thời hạn dịch vụ (Active, Suspend, Cancel, Gia hạn).
* **Request Body:** Các trường tùy chọn: `product_id`, `plan_id`, `user_id`, `quantity`, `status`, `expires_at`, `suspend_hold_until`, `currency_code`, `price`, `coupon_id`, `subscription_id`, `order_id`.
* **Response (HTTP 200):** `{"data": ServiceResource}`.

### `DELETE /v1/admin/services/{service}`
* **Mục đích:** Hủy và xóa hoàn toàn bản ghi dịch vụ.
* **Response (HTTP 204):** No Content.

---

## 6. Invoices

### `GET /v1/admin/invoices`
* **Mục đích:** Liệt kê danh sách hóa đơn thanh toán.
* **Query Parameters:**
  - `page`, `per_page`, `sort`
  - `include`: `user`, `items`
  - `filter[id]` (string, tùy chọn): Lọc theo ID hóa đơn.
  - `filter[currency_code]` (string, tùy chọn): Lọc theo mã tiền tệ.
  - `filter[user_id]` (integer, tùy chọn): Lọc theo người dùng nhận hóa đơn.
  - `filter[status]` (string, tùy chọn): Trạng thái hóa đơn (`pending`, `paid`, `cancelled`).
* **Response (HTTP 200):** Collection `InvoiceResource`.

### `POST /v1/admin/invoices`
* **Mục đích:** Tạo hóa đơn mới cho người dùng.
* **Request Body (application/json):**
  - `user_id` (integer, **bắt buộc**): ID người dùng.
  - `currency_code` (string, **bắt buộc**): Mã tiền tệ ISO (vd: `USD`).
  - `status` (string, **bắt buộc**): Trạng thái ban đầu (`pending`, `paid`, `cancelled`).
  - `due_at` (string date-time ISO 8601, tùy chọn): Hạn thanh toán.
* **Response (HTTP 200):** `{"data": InvoiceResource}`.

### `GET /v1/admin/invoices/{invoice}`
* **Mục đích:** Xem chi tiết hóa đơn.
* **Path Parameters:** `invoice` (integer/string, **bắt buộc**).
* **Query Parameters:** `include`: `user`, `items`.
* **Response (HTTP 200):** `{"data": InvoiceResource}`.

### `PUT /v1/admin/invoices/{invoice}`
* **Mục đích:** Cập nhật hóa đơn (đổi trạng thái `paid`, dời hạn `due_at`).
* **Request Body:** `user_id` (tùy chọn), `currency_code` (tùy chọn), `due_at` (tùy chọn), `status` (tùy chọn).
* **Response (HTTP 200):** `{"data": InvoiceResource}`.

### `DELETE /v1/admin/invoices/{invoice}`
* **Mục đích:** Xóa hóa đơn.
* **Response (HTTP 204):** No Content.

---

## 7. Invoice Items

### `GET /v1/admin/invoice-items`
* **Mục đích:** Liệt kê các dòng chi tiết mục hàng trong hóa đơn.
* **Query Parameters:**
  - `page`, `per_page`, `sort`
  - `include`: `reference`, `invoice`
  - `filter[id]`, `filter[quantity]`, `filter[price]`, `filter[reference_type]`, `filter[reference_id]`
* **Response (HTTP 200):** Collection `InvoiceItemResource`.

### `POST /v1/admin/invoice-items`
* **Mục đích:** Thêm một dòng sản phẩm/dịch vụ vào hóa đơn.
* **Request Body (application/json):**
  - `invoice_id` (integer, **bắt buộc**): ID của hóa đơn cha.
  - `description` (string, **bắt buộc**): Mô tả mục chi phí.
  - `price` (number, **bắt buộc**): Đơn giá.
  - `quantity` (integer, **bắt buộc**): Số lượng.
  - `reference_type` (string, tùy chọn): Kiểu tham chiếu (vd: `App\Models\Service`).
  - `reference_id` (integer, tùy chọn): ID đối tượng tham chiếu.
* **Response (HTTP 200):** `{"data": InvoiceItemResource}`.

### `GET /v1/admin/invoice-items/{invoiceItem}`
* **Mục đích:** Xem chi tiết một dòng hóa đơn.
* **Path Parameters:** `invoiceItem` (integer/string, **bắt buộc**).
* **Query Parameters:** `include`: `reference`, `invoice`.
* **Response (HTTP 200):** `{"data": InvoiceItemResource}`.

### `PUT /v1/admin/invoice-items/{invoiceItem}`
* **Mục đích:** Sửa mô tả, số lượng, hoặc đơn giá dòng hóa đơn.
* **Request Body:** `description`, `quantity`, `price`, `reference_type`, `reference_id` (tùy chọn).
* **Response (HTTP 200):** `{"data": InvoiceItemResource}`.

### `DELETE /v1/admin/invoice-items/{invoiceItem}`
* **Mục đích:** Xóa dòng mục hàng khỏi hóa đơn.
* **Response (HTTP 204):** No Content.

---

## 8. Credits

### `GET /v1/admin/credits`
* **Mục đích:** Liệt kê các tài khoản tín dụng/số dư trả trước của khách hàng.
* **Query Parameters:**
  - `page`, `per_page`, `sort`
  - `include`: `user`
  - `filter[id]`, `filter[currency_code]`, `filter[user_id]`
* **Response (HTTP 200):** Collection `CreditResource`.

### `POST /v1/admin/credits`
* **Mục đích:** Nạp hoặc cộng thêm số dư tín dụng cho người dùng.
* **Request Body (application/json):**
  - `user_id` (integer, **bắt buộc**): ID người dùng.
  - `currency_code` (string, **bắt buộc**): Mã tiền tệ ISO (vd: `USD`).
  - `amount` (number, **bắt buộc**): Số tiền cần ghi có/nạp vào ví.
* **Response (HTTP 200):** `{"data": CreditResource}`.

### `GET /v1/admin/credits/{credit}`
* **Mục đích:** Xem chi tiết tài khoản tín dụng theo ID.
* **Path Parameters:** `credit` (integer/string, **bắt buộc**).
* **Query Parameters:** `include`: `user`.
* **Response (HTTP 200):** `{"data": CreditResource}`.

### `PUT /v1/admin/credits/{credit}`
* **Mục đích:** Cập nhật số dư tín dụng hoặc mã tiền tệ.
* **Request Body:** `currency_code` (tùy chọn), `amount` (tùy chọn).
* **Response (HTTP 200):** `{"data": CreditResource}`.

### `DELETE /v1/admin/credits/{credit}`
* **Mục đích:** Xóa bản ghi tài khoản tín dụng.
* **Response (HTTP 204):** No Content.

---

## 9. Tickets

### `GET /v1/admin/tickets`
* **Mục đích:** Liệt kê các phiếu hỗ trợ kỹ thuật / chăm sóc khách hàng.
* **Query Parameters:**
  - `page`, `per_page`, `sort`
  - `include`: `messages`, `user`, `assigned_to`
  - `filter[id]`, `filter[currency_code]`, `filter[user_id]`, `filter[status]`, `filter[priority]`, `filter[department]`
* **Response (HTTP 200):** Collection `TicketResource`.

### `POST /v1/admin/tickets`
* **Mục đích:** Tạo một ticket mới thay mặt khách hàng hoặc từ hệ thống quản trị.
* **Request Body (application/json):**
  - `subject` (string, **bắt buộc**): Tiêu đề yêu cầu hỗ trợ.
  - `user_id` (integer, **bắt buộc**): ID khách hàng.
  - `priority` (string, **bắt buộc**): Độ ưu tiên (`low`, `medium`, `high`).
  - `status` (string, **bắt buộc**): Trạng thái (`open`, `replied`, `closed`).
  - `department` (string, tùy chọn): Phòng ban xử lý (vd: `Billing`, `Technical`).
* **Response (HTTP 200):** `{"data": TicketResource}`.

### `GET /v1/admin/tickets/{ticket}`
* **Mục đích:** Xem chi tiết một ticket.
* **Path Parameters:** `ticket` (integer/string, **bắt buộc**).
* **Query Parameters:** `include`: `messages`, `user`, `assigned_to`.
* **Response (HTTP 200):** `{"data": TicketResource}`.

### `PUT /v1/admin/tickets/{ticket}`
* **Mục đích:** Cập nhật trạng thái ticket (đóng, chuyển giao, đổi phòng ban).
* **Request Body:** `subject`, `user_id`, `department`, `priority`, `status` (tùy chọn).
* **Response (HTTP 200):** `{"data": TicketResource}`.

### `DELETE /v1/admin/tickets/{ticket}`
* **Mục đích:** Xóa ticket.
* **Response (HTTP 204):** No Content.

---

## 10. Ticket Messages

### `GET /v1/admin/ticket-messages`
* **Mục đích:** Liệt kê các tin nhắn phản hồi của các ticket.
* **Query Parameters:**
  - `page`, `per_page`, `sort`
  - `include`: `user`, `ticket`, `attachments`
  - `filter[id]`, `filter[currency_code]`
* **Response (HTTP 200):** Collection `TicketMessageResource`.

### `POST /v1/admin/ticket-messages`
* **Mục đích:** Gửi tin nhắn phản hồi vào ticket (Admin trả lời hoặc ghi nhận tin nhắn từ user).
* **Request Body (application/json):**
  - `message` (string, **bắt buộc**): Nội dung tin nhắn phản hồi.
  - `user_id` (integer, **bắt buộc**): ID người gửi tin nhắn (Admin hoặc User).
  - `ticket_id` (integer, **bắt buộc**): ID ticket cần trả lời.
* **Response (HTTP 200):** `{"data": TicketMessageResource}`.

### `GET /v1/admin/ticket-messages/{ticketMessage}`
* **Mục đích:** Xem chi tiết một tin nhắn phản hồi.
* **Path Parameters:** `ticketMessage` (integer/string, **bắt buộc**).
* **Query Parameters:** `include`: `user`, `ticket`, `attachments`.
* **Response (HTTP 200):** `{"data": TicketMessageResource}`.

### `DELETE /v1/admin/ticket-messages/{ticketMessage}`
* **Mục đích:** Xóa một tin nhắn khỏi luồng trao đổi của ticket.
* **Response (HTTP 204):** No Content.

---

## 11. Affiliates

### `GET /v1/admin/affiliates`
* **Mục đích:** Liệt kê các tài khoản tiếp thị liên kết (Affiliate partners).
* **Query Parameters:**
  - `page`, `per_page`, `sort`
  - `include`: `user`, `orders`
  - `filter[affiliate_id]`, `filter[code]`, `filter[visitors]`, `filter[reward]`, `filter[discount]`
* **Response (HTTP 200):** Collection `AffiliateResource`.

### `POST /v1/admin/affiliates`
* **Mục đích:** Khởi tạo mã tiếp thị liên kết mới cho người dùng.
* **Request Body (application/json):**
  - `user_id` (integer, **bắt buộc**): ID người dùng tiếp thị.
  - `code` (string, **bắt buộc**): Mã giới thiệu duy nhất (vd: `PROMO2026`).
  - `enabled` (boolean, tùy chọn): Kích hoạt hay tạm ngưng.
  - `reward` (number, tùy chọn): Tỷ lệ % hoặc số tiền hoa hồng được hưởng.
* **Response (HTTP 200):** `{"data": AffiliateResource}`.

### `GET /v1/admin/affiliates/{affiliate}`
* **Mục đích:** Xem chi tiết một tài khoản affiliate.
* **Path Parameters:** `affiliate` (integer/string, **bắt buộc**).
* **Query Parameters:** `include`: `user`, `orders`.
* **Response (HTTP 200):** `{"data": AffiliateResource}`.

### `PUT /v1/admin/affiliates/{affiliate}`
* **Mục đích:** Cập nhật mã, trạng thái hoặc tỷ lệ hoa hồng affiliate.
* **Request Body:** `user_id`, `code`, `enabled`, `reward` (tùy chọn).
* **Response (HTTP 200):** `{"data": AffiliateResource}`.

### `DELETE /v1/admin/affiliates/{affiliate}`
* **Mục đích:** Xóa tài khoản affiliate.
* **Response (HTTP 204):** No Content.
