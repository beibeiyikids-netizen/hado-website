# HADO Store — bước 1: URL callback

Đây là máy chủ khởi tạo callback, chưa phải ứng dụng quản lý shop hoàn chỉnh.

## Render
- Runtime: Node
- Build command: `npm run check`
- Start command: `npm start`
- Chọn Free nếu đang có sẵn trên tài khoản; không chọn gói tính phí khi chưa được duyệt.
- Health check: `/health`
- Redirect URL: địa chỉ HTTPS thực tế Render cấp + `/tiktok/callback`.

## Các bước tiếp theo
1. Đăng ký URL callback thật trong TikTok Shop Partner Center.
2. Cấu hình `TIKTOK_APP_KEY`, `TIKTOK_APP_SECRET`, `TIKTOK_SERVICE_ID`, `ADMIN_PASSWORD` trong Environment của Render, không đưa vào GitHub hoặc chat.
3. Hoàn tất kho lưu token mã hóa bền vững trước khi đổi mã xác thực lấy token. Phiên bản này chủ động không đổi mã hoặc lưu token.
4. Triển khai quyền và chức năng API sản phẩm, đơn hàng, tồn kho; kiểm thử trên shop thử nghiệm trước khi cập nhật dữ liệu thật.

Kết nối chưa hoạt động chỉ nhờ có URL. Khi chưa cấu hình đủ, callback trả HTTP 503 và thông báo rõ ràng. State một lần gắn với cookie HttpOnly được kiểm tra khi có cấu hình. Không ghi mã xác thực, bí mật hay token vào log ứng dụng. Kiểm tra chính sách log của hosting trước khi cấp quyền thật.

Tài liệu TikTok: https://partner.us.tiktokshop.com/docv2/page/create-your-app
