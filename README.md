# Iowa Liquor Sales Bot — Azure Bot Service

> **Seminar:** Creating and Deploying a Bot to Azure Bot Service  
> **Lớp:** Điện toán đám mây - IS402  
> **Thành viên nhóm:**
> | MSSV | Họ và tên |
> |------|-----------|
> | 22520613 | Huỳnh Bá Khang |
> | 22520594 | Trà Minh Hy |

---

## Giới thiệu

**Iowa Liquor Sales Bot** là một chatbot thông minh được xây dựng trên nền tảng **Azure Bot Service** sử dụng **Node.js**, giúp người dùng tra cứu và phân tích dữ liệu doanh thu bán rượu tại bang Iowa, Mỹ, năm 2022.

Dữ liệu được lưu trữ trong **Azure SQL Database** với hơn **2.5 triệu bản ghi** giao dịch thực tế.

---

## Kiến trúc hệ thống

```
Người dùng 
    ↕
Azure Bot Service (Bot Channel)
    ↕
Azure App Service (Node.js - Restify)
    ↕
Azure SQL Database (Iowa Liquor Sales 2022)
```

---

## Chức năng chính

### 1. Xem doanh thu theo khu vực
Tra cứu tổng doanh thu bán rượu theo **Quận (County)** → **Thành phố (City)** → **Cửa hàng (Store)**.

- Hỗ trợ bộ lọc theo **khoảng thời gian** (tháng bắt đầu / tháng kết thúc, năm 2022).
- Có thể bỏ qua bộ lọc thời gian để xem toàn bộ dữ liệu.

### 2. Top 5 rượu bán nhiều nhất
Hiển thị danh sách 5 sản phẩm rượu bán được nhiều chai nhất trong khoảng thời gian đã chọn.

### 3. Top 5 rượu bán ít nhất
Hiển thị danh sách 5 sản phẩm rượu bán được ít chai nhất trong khoảng thời gian đã chọn.

> **Lưu ý:** Mỗi chức năng đều hỗ trợ lọc theo tháng (có thể bỏ qua).

---

## Cấu trúc dự án

```
AzureBot-NodeJS/
├── bots/
│   └── bot.js          # Logic điều hướng hội thoại chính
├── database/
│   └── dbHelper.js     # Lớp giúp kết nối và truy vấn Azure SQL
├── config.js           # Cấu hình Bot và Database từ biến môi trường
├── index.js            # Điểm khởi động (Restify server + CloudAdapter)
├── testDb.js           # Script kiểm tra kết nối Database
└── package.json        # Danh sách thư viện phụ thuộc
```

---

## Cài đặt & Chạy thử (Locally)

### Yêu cầu
- Node.js >= 18
- Bot Framework Emulator (để test cục bộ)

### Bước 1: Cài đặt thư viện
```bash
npm install
```

### Bước 2: Tạo file `.env` với nội dung
```env
MicrosoftAppId=<App ID của Bot>
MicrosoftAppPassword=<App Password của Bot>
MicrosoftAppType=SingleTenant
MicrosoftAppTenantId=<Tenant ID>
SQL_SERVER=<Azure SQL Server hostname>
SQL_DATABASE=<Tên Database>
SQL_USERNAME=<Username SQL>
SQL_PASSWORD=<Password SQL>
```

### Bước 3: Chạy Bot
```bash
npm start
```

---

## Triển khai lên Azure

```bash
# Đẩy code lên Azure App Service
git push azure main:master
```

---

## Công nghệ sử dụng

| Công nghệ | Mục đích |
|-----------|----------|
| **Node.js** | Runtime |
| **Restify** | HTTP Server |
| **botbuilder** | Azure Bot Framework SDK |
| **mssql** | Kết nối Azure SQL Database |
| **dotenv** | Quản lý biến môi trường |
| **Azure Bot Service** | Kênh giao tiếp chatbot |
| **Azure App Service** | Hosting ứng dụng Node.js |
| **Azure SQL Database** | Lưu trữ dữ liệu bán hàng |
