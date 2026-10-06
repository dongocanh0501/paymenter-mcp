# Paymenter MCP Server 🚀

[English](README.md) | **[🇻🇳 Tiếng Việt](README_VI.md)**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-2024--11--05-orange.svg)](https://modelcontextprotocol.io/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](#tính-năng-nổi-bật)
[![Paymenter Version](https://img.shields.io/badge/Paymenter-v1.2.0%2B-indigo.svg)](https://paymenter.org)
[![JSON:API Specification](https://img.shields.io/badge/Specification-JSON%3AAPI%20v1.0-blueviolet.svg)](https://jsonapi.org/)
[![GitHub Stars](https://img.shields.io/github/stars/dongocanh0501/paymenter-mcp?style=social)](https://github.com/dongocanh0501/paymenter-mcp/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/dongocanh0501/paymenter-mcp?style=social)](https://github.com/dongocanh0501/paymenter-mcp/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/dongocanh0501/paymenter-mcp)](https://github.com/dongocanh0501/paymenter-mcp/issues)

> **Máy chủ Model Context Protocol (MCP) và Kỹ năng Tác tử AI dành cho nền tảng [Paymenter](https://paymenter.org)** (v1.2.0+).  
> Trang bị cho các AI Agent (Google Antigravity, Claude Desktop, Cursor, Cline) **35 công cụ chuyên biệt** để tự động quản trị hạ tầng hosting, cấp phát máy chủ ảo (VPS), điều phối hóa đơn thanh toán, chăm sóc khách hàng qua ticket và quản lý số dư ví trả trước.

---

## 📑 Mục Lục

- [Kiến Trúc Tổng Quan](#-kiến-trúc-tổng-quan)
- [Tại Sao Nên Dùng Paymenter MCP?](#-tại-sao-nên-dùng-paymenter-mcp)
- [Tính Năng Nổi Bật](#-tính-năng-nổi-bật)
- [Danh Mục 35 Công Cụ Quản Trị](#-danh-mục-35-công-cụ-quản-trị)
- [Cài Đặt Nhanh & Kiểm Thử](#-cài-đặt-nhanh--kiểm-thử)
- [Hướng Dẫn Cấu Hình Ứng Dụng](#-hướng-dẫn-cấu-hình-ứng-dụng)
  - [Google Antigravity CLI / IDE](#google-antigravity-cli--ide)
  - [Claude Desktop](#claude-desktop)
  - [Cursor IDE](#cursor-ide)
- [Cơ Chế Giải Mã Quan Hệ JSON:API Sideloading](#-cơ-chế-giải-mã-quan-hệ-jsonapi-sideloading)
- [Câu Hỏi Thường Gặp (FAQ)](#-câu-hỏi-thường-gặp-faq)
- [Cấu Trúc Thư Mục](#-cấu-trúc-thư-mục)
- [Đóng Góp & Cộng Đồng](#-đóng-góp--cộng-đồng)
- [Giấy Phép Bản Quyền](#-giấy-phép-bản-quyền)

---

## 🏛️ Kiến Trúc Tổng Quan

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

## 💡 Tại Sao Nên Dùng Paymenter MCP?

| Tiêu Chí | Gọi REST API Thủ Công | Sử Dụng Paymenter MCP Server |
| :--- | :--- | :--- |
| **Mức tiêu thụ Token** | Phải nhồi toàn bộ 180KB OpenAPI JSON vào context (~45.000 tokens) | **Lazy-Loaded Tool Schemas**: Không tốn token ban đầu (tiết kiệm ~85% token khởi động) |
| **Dữ liệu quan hệ** | Chuẩn JSON:API tách rời mảng `included` (phải tra cứu ID thủ công) | **Tự Động Hydrate Quan Hệ**: Tự động ghép nối các thực thể lồng nhau thành object hoàn chỉnh |
| **Tính di động runtime**| Cần cài đặt nhiều gói npm hoặc môi trường Docker nặng nề | **Zero External Dependencies**: Thuần Node.js built-in (`http`, `readline`), khởi động `<50ms` |
| **Xử lý lỗi** | Lỗi 422 HTTP validation thô làm crash tác tử AI | Chuẩn MCP `{ isError: true }` định dạng rõ ràng tham số sai cho LLM sửa ngay |
| **Nghiệm thu** | Thử nghiệm mò mẫm | Tích hợp sẵn bộ tự kiểm thử ratchet offline (`--test` flag) đạt Exit Code 0 |

---

## ✨ Tính Năng Nổi Bật

* **⚡ Không Phụ Thuộc Thư Viện Ngoài (Zero External Dependencies)**: 100% sử dụng API gốc của Node.js (`http`, `https`, `readline`). Hoạt động ngay trên Node.js 18+ mà không cần chạy `npm install`.
* **🎯 35 Công Cụ Chuyên Biệt**: Bao quát đầy đủ 7 phân hệ nghiệp vụ quản trị (Khách hàng, Đơn hàng, Dịch vụ VPS/Hosting, Hóa đơn, Ví tín dụng, Ticket hỗ trợ, Danh mục sản phẩm).
* **📦 Tự Động Giải Mã Quan Hệ JSON:API**: Tự động giải mã và gắn kết dữ liệu liên quan từ mảng `included` vào đối tượng chính để mô hình ngôn ngữ lớn (LLM) hiểu trọn vẹn ngữ cảnh.
* **🧠 Chuẩn Lazy-Loading Antigravity Hiện Đại**: Cung cấp 35 tệp schema JSON riêng lẻ theo chuẩn Draft-07 (`schemas/*.json`) kèm tệp chỉ dẫn `instructions.md`, ngăn ngừa triệt để hiện tượng phình context window.
* **🛡️ Bộ Tự Kiểm Thử Ratchet Tích Hợp**: Lệnh `node server.js --test` tự động chạy 9 bài kiểm thử offline kiểm tra toàn diện giao thức JSON-RPC với Exit Code 0.

---

## 🧰 Danh Mục 35 Công Cụ Quản Trị

| Phân Hệ | Tên Công Cụ | Chức Năng Chi Tiết |
| :--- | :--- | :--- |
| **Hệ Thống & Sức Khỏe** | `paymenter_health_check` | Kiểm tra kết nối API, độ trễ mạng, tính hợp lệ của token và phiên bản Paymenter. |
| | `paymenter_search` | Tìm kiếm tổng hợp toàn hệ thống (Users, Orders, Services, Tickets, Invoices) qua từ khóa. |
| | `paymenter_get_dashboard_summary` | Thống kê tổng quan điều hành (số dịch vụ đang chạy, hóa đơn chưa thanh toán, ticket mở). |
| **Quản Trị Khách Hàng** | `paymenter_list_users` | Liệt kê & lọc danh sách người dùng (`filter[email]`, họ tên, phân trang, sắp xếp). |
| | `paymenter_get_user` | Lấy chi tiết hồ sơ người dùng theo ID (tự nạp `role`, `credits`). |
| | `paymenter_create_user` | Tạo tài khoản khách hàng mới (`email`, `password`, `first_name`, `last_name`, `role_id`). |
| | `paymenter_update_user` | Cập nhật thông tin khách hàng, trạng thái xác thực email hoặc vai trò quản trị. |
| | `paymenter_delete_user` | Xóa vĩnh viễn tài khoản người dùng khỏi cơ sở dữ liệu. |
| | `paymenter_get_user_overview` | Chụp nhanh 360° khách hàng trong 1 lần gọi (Hồ sơ + Ví tín dụng + Dịch vụ + Hóa đơn + Ticket). |
| **Đơn Hàng & Dịch Vụ** | `paymenter_list_orders` | Danh sách đơn hàng (`filter[id]`, loại tiền tệ `currency_code`, nạp kèm `services`, `user`). |
| | `paymenter_get_order` | Xem chi tiết đơn hàng và các dịch vụ cấu thành. |
| | `paymenter_create_order` | Khởi tạo đơn hàng mới cho khách hàng (`user_id`, `currency_code`). |
| | `paymenter_delete_order` | Hủy bỏ và xóa đơn hàng. |
| | `paymenter_list_services` | Danh sách dịch vụ hosting/VPS (`filter[status]`, `expires_at`, `price`, `subscription_id`). |
| | `paymenter_get_service` | Xem cấu hình chi tiết, gói dịch vụ máy chủ và ngày hết hạn. |
| | `paymenter_create_service` | Tự động cấp phát (provision) dịch vụ mới (`product_id`, `plan_id`, `user_id`, `price`). |
| | `paymenter_update_service` | Chỉnh sửa cấu hình, ngày gia hạn hoặc chu kỳ thanh toán của dịch vụ. |
| **Vòng Đời Dịch Vụ** | `paymenter_suspend_service` | Tạm khóa dịch vụ máy chủ (`status: suspended`) kèm lý do vi phạm hoặc quá hạn. |
| | `paymenter_unsuspend_service` | Mở khóa kích hoạt lại dịch vụ (`status: active`). |
| | `paymenter_renew_service` | Gia hạn dịch vụ (cộng dồn ngày `expires_at` và tự động lập hóa đơn gia hạn). |
| | `paymenter_cancel_service` | Hủy bỏ và chấm dứt dịch vụ (`status: cancelled`). |
| **Tài Chính & Hóa Đơn** | `paymenter_list_invoices` | Danh sách hóa đơn (`filter[user_id]`, trạng thái: `pending`/`paid`/`cancelled`). |
| | `paymenter_get_invoice` | Xem chi tiết hóa đơn và từng hạng mục dòng tiền (`include=items`). |
| | `paymenter_create_invoice` | Lập hóa đơn thanh toán mới (`user_id`, `currency_code`, `status`, `due_at`). |
| | `paymenter_update_invoice` | Cập nhật trạng thái thanh toán hoặc gia hạn ngày đến hạn. |
| | `paymenter_delete_invoice` | Xóa hóa đơn khỏi hệ thống thanh toán. |
| | `paymenter_create_invoice_item`| Thêm hạng mục phí chi tiết vào hóa đơn (`invoice_id`, `description`, `price`, `quantity`). |
| | `paymenter_manage_credit` | Nạp hoặc khấu trừ số dư ví tín dụng trả trước (`user_id`, `amount`, `currency_code`). |
| **Chăm Sóc & Tickets** | `paymenter_list_tickets` | Xem danh sách ticket hỗ trợ (`filter[status]`, `filter[priority]`, `filter[department]`). |
| | `paymenter_get_ticket` | Xem chi tiết cuộc trao đổi hỗ trợ kỹ thuật (`include=messages`). |
| | `paymenter_create_ticket` | Mở ticket hỗ trợ kỹ thuật mới (`subject`, `user_id`, `priority`, `department`). |
| | `paymenter_reply_ticket` | Phản hồi ticket và tùy chọn cập nhật trạng thái (`replied`/`closed`). |
| **Danh Mục & Tiếp Thị** | `paymenter_list_products` | Tra cứu danh mục sản phẩm, gói hosting/server và giá cước. |
| | `paymenter_list_categories` | Tra cứu danh mục phân loại dịch vụ. |
| | `paymenter_manage_affiliate` | Quản lý đối tác affiliate, mã giới thiệu (`code`), hoa hồng và kích hoạt. |

---

## 🚀 Cài Đặt Nhanh & Kiểm Thử

### 1. Yêu Cầu Môi Trường
* **Node.js**: Phiên bản 18.0.0 trở lên.
* **Hệ thống Paymenter**: Phiên bản v1.2.0 trở lên có quyền tạo Bearer Token.

### 2. Thiết Lập Biến Môi Trường
```bash
export PAYMENTER_URL="https://billing.domain-cua-ban.com/api"
export PAYMENTER_API_TOKEN="token_bearer_quan_tri_paymenter_tai_day"
```

### 3. Chạy Bộ Kiểm Thử Ratchet Offline
```bash
node server.js --test
```
*Bằng chứng kiểm thử thực tế:*
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

## 🔌 Hướng Dẫn Cấu Hình Ứng Dụng

### Google Antigravity CLI / IDE
Thêm vào tệp `~/.gemini/antigravity-cli/settings.json` (hoặc `.agents/settings.json` trong dự án):
```json
{
  "mcpServers": {
    "paymenter": {
      "command": "node",
      "args": ["/duong/dan/toi/paymenter-mcp/server.js"],
      "env": {
        "PAYMENTER_URL": "https://billing.domain-cua-ban.com/api",
        "PAYMENTER_API_TOKEN": "token_api_cua_ban"
      }
    }
  }
}
```

### Claude Desktop
Thêm vào tệp `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "paymenter": {
      "command": "node",
      "args": ["/duong/dan/toi/paymenter-mcp/server.js"],
      "env": {
        "PAYMENTER_URL": "https://billing.domain-cua-ban.com/api",
        "PAYMENTER_API_TOKEN": "token_api_cua_ban"
      }
    }
  }
}
```

### Cursor IDE
Thêm vào tệp `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "paymenter": {
      "command": "node",
      "args": ["/duong/dan/toi/paymenter-mcp/server.js"],
      "env": {
        "PAYMENTER_URL": "https://billing.domain-cua-ban.com/api",
        "PAYMENTER_API_TOKEN": "token_api_cua_ban"
      }
    }
  }
}
```

---

## 📦 Cơ Chế Giải Mã Quan Hệ JSON:API Sideloading

Paymenter sử dụng chuẩn JSON:API v1.0 trong đó các đối tượng liên quan được đặt trong mảng `included`. Máy chủ Paymenter MCP sẽ tự động phát hiện và hợp nhất các mối quan hệ này:

```javascript
// Ví dụ: Truy vấn dịch vụ kèm thông tin người dùng và đơn hàng
// Bản tin thô của JSON:API chia tách dữ liệu vào data và included.
// Paymenter MCP Server trả về cấu trúc hợp nhất tiện lợi:
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
      "email": "khachhang@example.com",
      "first_name": "Ngọc Ánh"
    },
    "order": {
      "id": "89",
      "currency_code": "VND"
    }
  }
}
```

---

## ❓ Câu Hỏi Thường Gặp (FAQ)

#### Q1: Máy chủ MCP này hỗ trợ phiên bản Paymenter nào?
**Đ**: Hỗ trợ chính thức Paymenter **v1.2.0 trở lên**, phiên bản sử dụng kiến trúc Laravel JSON:API quản trị hiện đại.

#### Q2: Hệ thống có hoạt động nếu Paymenter chạy trong Docker không?
**Đ**: **Hoàn toàn được!** Miễn là container Paymenter mở cổng web (ví dụ `http://localhost:8000/api` hoặc qua domain nội bộ), MCP server sẽ kết nối trực tiếp qua HTTP.

#### Q3: Cần cấp quyền gì cho API Bearer Token?
**Đ**: Cần tạo token mang quyền **Quản trị viên (Administrator)** trong bảng điều khiển admin của Paymenter để có quyền truy cập các đường dẫn quản trị (`/v1/admin/*`).

#### Q4: Vì sao máy chủ được viết thuần Node.js không cần cài thư viện ngoài?
**Đ**: Nhằm tối đa hóa tính di động, ổn định và tốc độ. Các trợ lý AI có thể khởi chạy `server.js` ngay lập tức mà không sợ đụng độ phiên bản thư viện hoặc phải có kết nối mạng để chạy `npm install`.

#### Q5: Có thể dùng kèm với Antigravity Agent Skill không?
**Đ**: **Có!** Thư mục [`skill/`](skill/) đi kèm chứa tệp `SKILL.md` và tài liệu tham khảo được thiết kế chuyên biệt cho Antigravity CLI, cung cấp hiểu biết nghiệp vụ sâu cho AI Agent trong khi MCP Server thực thi các cuộc gọi API.

#### Q6: Giới hạn tần suất gọi (Rate Limit) được xử lý ra sao?
**Đ**: Paymenter MCP Server xử lý lịch sự các mã lỗi HTTP `429 Too Many Requests`, đóng gói thông báo hướng dẫn thời gian thử lại trực tiếp cho mô hình LLM.

---

## 📁 Cấu Trúc Thư Mục

```
paymenter-mcp/
├── package.json                          # Cấu hình dự án Node.js (0 dependency)
├── server.js                             # Máy chủ MCP độc lập (JSON-RPC 2.0 stdio, 35 tools)
├── schemas/                              # 35 Schemas JSON chuẩn Draft-07 (Lazy-Loading)
│   ├── instructions.md                   # Chỉ dẫn vận hành & quy tắc quan hệ
│   ├── paymenter_health_check.json
│   ├── paymenter_list_users.json
│   └── ... (đủ 35 tệp schema)
├── skill/                                # Kỹ năng Agent Antigravity đi kèm
│   ├── SKILL.md                          # Tài liệu hướng dẫn kỹ năng cho tác tử AI
│   ├── references/                       # Đặc tả 22 endpoints & quy chuẩn JSON:API
│   │   ├── api-endpoints.md
│   │   └── jsonapi-conventions.md
│   └── scripts/                          # Python SDK độc lập
│       └── paymenter_client.py
├── .github/                              # Mẫu GitHub
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
├── CONTRIBUTING.md                       # Quy chuẩn đóng góp mã nguồn
├── .gitignore
├── LICENSE                               # Giấy phép MIT
├── README.md                             # Tài liệu tiếng Anh
└── README_VI.md                          # Tài liệu tiếng Việt
```

---

## 🤝 Đóng Góp & Cộng Đồng

Mọi đóng góp từ cộng đồng đều được hoan nghênh! Vui lòng đọc [Hướng Dẫn Đóng Góp](CONTRIBUTING.md) và sử dụng các mẫu [Báo Lỗi](.github/ISSUE_TEMPLATE/bug_report.md) hoặc [Đề Xuất Tính Năng](.github/ISSUE_TEMPLATE/feature_request.md).

Nếu bạn thấy dự án hữu ích, hãy **tặng một Ngôi Sao ⭐ trên GitHub** để ủng hộ hạ tầng AI mã nguồn mở nhé!

---

## 📄 Giấy Phép Bản Quyền

Kho lưu trữ này được phân phối theo [Giấy phép MIT](LICENSE).  
Bản quyền (c) 2026 **Đỗ Ngọc Ánh** (`dongocanh0501`).
