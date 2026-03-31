# 🍔 SPRFood - Website bán đồ ăn

## 📌 Giới thiệu
SPRFood là một website bán đồ ăn cho cửa hàng, cho phép người dùng xem menu, thêm vào giỏ hàng và đặt món trực tuyến.  
Project được xây dựng nhằm mục đích học tập và thực hành phát triển web fullstack.

---

## 🛠️ Công nghệ sử dụng

### 🔹 Frontend
- HTML
- CSS
- JavaScript

### 🔹 Backend
- Java 21
- Spring Boot 3.x
- Spring Security (JWT)
- JPA / Hibernate

### 🔹 Database
- MySQL

---

## 🧰 Công cụ & môi trường
- Java 21
- Maven
- MySQL 8
- Docker (chạy MySQL container)
- MySQL Workbench (quản lý database)
- :contentReference[oaicite:1]{index=1} (phát triển Frontend)
- Postman (test API)

---

## ⚙️ Chức năng chính
- 👤 Đăng ký / đăng nhập
- 🔐 Xác thực người dùng bằng JWT
- 🍔 Xem danh sách món ăn
- 🛒 Thêm món vào giỏ hàng
- 📦 Đặt hàng
- 🛠️ Quản lý sản phẩm (Admin)

---

## 🐳 Chạy MySQL bằng Docker
```bash
docker run -d \
  --name mysql-sprfood \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -p 3306:3306 \
  mysql:8
