# Hash Storage Dashboard - Frontend Assessment

Dự án này là một ứng dụng Dashboard xử lý dữ liệu lớn trực tiếp trên trình duyệt. Để giải quyết bài toán hiệu năng, hệ thống được thiết kế theo kiến trúc Micro-frontend / Worker-offloading, tách biệt hoàn toàn logic tính toán nặng và I/O Database ra khỏi UI Thread.

## 1. Hướng dẫn khởi chạy (Getting Started)

Yêu cầu môi trường: Node.js (>=18)

```bash
# Cài đặt thư viện
npm install

# Khởi chạy môi trường Dev
npm run dev
```

Lưu ý: Ứng dụng sử dụng biến môi trường `VITE_WORKER_URL=/worker/` để định tuyến đến trang Worker độc lập. Cấu hình này đã được setup sẵn trong file `.env`.

## 2. Kiến trúc & Luồng xử lý (Architecture)

Hệ thống được thiết kế mô phỏng lại mô hình Client-Server thu nhỏ ngay bên trong trình duyệt, mang tư duy của kiến trúc Microservices:

**Client Service (Main App):** Đóng vai trò UI/UX, gửi request và nhận response. Hoàn toàn không chứa logic tính toán hay truy cập trực tiếp vào Database.

**Compute & Data Service (Worker Page):** Đóng vai trò "Backend" độc lập, chuyên trách xử lý các tác vụ nặng (Hash Keccak-256) và quản lý Database (IndexedDB). Chạy trong một Context riêng biệt (thông qua hidden iframe) để không block Main Thread.

**Communication:** Hai service này giao tiếp với nhau thông qua một Message Bus (`postMessage`), đảm bảo tính Decoupling (tách biệt hoàn toàn) và không gây nghẽn luồng chính (Main Thread).

## 3. Giao tiếp chéo Context (The Message Broker)

Vì hai context nằm tách biệt, giao tiếp duy nhất giữa chúng là API `postMessage`. Tuy nhiên, bản chất của `postMessage` là giao tiếp một chiều (fire-and-forget). Để React component có thể gọi worker mượt mà theo kiểu async/await như gọi API thực tế, tôi đã tự build một lớp Message Broker:

**Correlation ID:** Mỗi request gửi từ React sang Worker được gán một `uuid` duy nhất.

**Promise Mapping:** Ở lớp Broker, tôi lưu trữ hàm `resolve/reject` của Promise vào một `Map` nội bộ, với key chính là `uuid` đó.

**Callback Matching:** Khi Worker xử lý xong và `postMessage` trả kết quả về kèm đúng `uuid` gốc, Broker sẽ móc hàm `resolve` tương ứng ra thực thi. Điều này giúp kiểm soát chặt chẽ luồng bất đồng bộ, đảm bảo không bị lẫn lộn dữ liệu khi spam hàng nghìn request cùng lúc.

Ngoài ra, hệ thống tích hợp sẵn cơ chế Retry Timeout (giống mô hình RabbitMQ). Nếu request/batch bị nghẽn quá 10s, Broker sẽ tự động retry (tối đa 3 lần với backoff delay) trước khi đánh dấu là Error (DLQ).

## 4. Xử lý bài toán 100.000 Items (Performance Tuning)

Đây là điểm nghẽn lớn nhất của hệ thống. Để đảm bảo trình duyệt không bị treo khi người dùng trigger 100k records:

**Batch Processing & I/O Optimization:** Thay vì gửi 100.000 request lẻ tẻ làm tràn Message Queue, Main App sẽ chia nhỏ dữ liệu thành các chunk (100 items/batch) để gửi đi. Ở phía Worker, dữ liệu không được insert từng dòng mà dùng 1 Transaction duy nhất của IndexedDB để bulk-insert, giúp tốc độ ghi đĩa tăng lên theo cấp số nhân.

**Virtual Scrolling:** Dù dưới Database có hàng trăm ngàn dòng, việc render toàn bộ ra DOM là điều tối kỵ. Tôi sử dụng `@tanstack/react-virtual` cho ResultTable. DOM thực tế chỉ render chính xác số lượng row đang lọt vào viewport của màn hình.

**Event Debouncing:** Tính năng Search được bọc một lớp debounce (500ms). Toàn bộ data đã được load vào RAM (React state) — mỗi lần gõ phím sẽ trigger lại `useMemo` re-filter trên toàn bộ mảng records. Debounce giúp chỉ chạy computation này sau 500ms người dùng ngừng gõ, tránh re-render liên tục khi đang nhập.

## 5. Giao diện (UI Layer)

Giao diện được thiết kế theo phong cách **Obsidian Logic** — một dark-mode premium dashboard lấy cảm hứng từ các developer tool như Vercel và Linear.

**Tech stack UI:**
- **Tailwind CSS v3** — styling toàn bộ UI với custom color token palette Obsidian (deep navy `#0c0c1d`, indigo `#c0c1ff`, v.v.)
- **Material Symbols Outlined** (Google Fonts) — icon system
- **Inter** — font UI chính; **Space Grotesk** — font monospace cho hash values và technical data

**Layout:**
- **Fixed Sidebar** — điều hướng Dashboard / Registry / Workers / Security / Usage
- **Fixed Topbar** — tabs Explorer / Collections / Compute / Logs, trạng thái Ready, nút Clear All
- **Glassmorphism Input Card** — nhập payload, HASH button gradient, Quick Generate (100 / 1K / 10K / 100K), System Load bar
- **Active Registries Table** — filter tabs All / Success / Pending / Error, ô tìm kiếm, virtual-scroll table
- **Stats Grid** — 3 thẻ: Total Hashed, Success Rate, Errors

**Status badge colors:**
- `SUCCESS` → xanh lá (`text-green-400`)
- `PENDING` → vàng amber (`text-amber-400`)
- `ERROR` / `FAILED` → đỏ (`text-red-400`)

## 6. Cấu trúc thư mục (Folder Structure)

```
├── worker/                 # Scope độc lập của Worker
│   ├── index.html
│   ├── worker.js           # Logic xử lý Hashing (Keccak-256)
│   └── db.js               # IndexedDB Wrapper
├── src/
│   ├── components/
│   │   ├── InputPanel.jsx  # Glassmorphism input + Quick Generate
│   │   └── ResultTable/    # Virtual-scroll table + filter/search
│   ├── hooks/              # Custom hooks (useWorker, useHashRecords, useDebounce)
│   ├── services/
│   │   └── messageBroker.js # Luồng giao tiếp chéo context
│   └── utils/
├── tailwind.config.js      # Obsidian Logic color tokens
└── postcss.config.js
```
