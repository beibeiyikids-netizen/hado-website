'use strict';
const http = require('node:http');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const sessions = new Map();
const ttl = 10 * 60 * 1000;
const configured = () => ['TIKTOK_APP_KEY', 'TIKTOK_APP_SECRET', 'TIKTOK_SERVICE_ID', 'ADMIN_PASSWORD'].every(k => process.env[k]);
const equal = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const html = (title, body) => `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | HADO Store</title><style>body{font:17px system-ui;background:#f4f6fa;color:#162334;max-width:720px;margin:8vh auto;padding:24px}main{background:white;padding:36px;border-radius:20px}h1{color:#075e61}a{color:#075e61}p{line-height:1.7}</style><main><h1>${title}</h1>${body}</main></html>`;
function reply(res, status, title, body, headers = {}) {
  res.writeHead(status, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",...headers});
  res.end(html(title, body));
}
function admin(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !req.headers.authorization?.startsWith('Basic ')) return false;
  const supplied = Buffer.from(req.headers.authorization.slice(6), 'base64').toString();
  return equal(supplied, `admin:${expected}`);
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method !== 'GET') return reply(res, 405, 'Phương thức không hỗ trợ', '<p>Chỉ hỗ trợ GET.</p>');
    if (url.pathname === '/health') { res.writeHead(200, {'Content-Type':'application/json'}); return res.end('{"ok":true}'); }
    if (url.pathname === '/') return reply(res, 200, 'HADO Store', '<p>Cổng kết nối TikTok Shop cho sản phẩm, đơn hàng và tồn kho.</p><p>Máy chủ đã chạy. Các chức năng quản lý shop chưa được kích hoạt.</p><p><a href="/connect">Kết nối TikTok Shop</a></p>');
    if (url.pathname === '/connect') {
      if (!configured()) return reply(res, 503, 'Chưa cấu hình TikTok Shop', '<p>URL callback đã sẵn sàng tại <strong>/tiktok/callback</strong>. Cần cấu hình thông tin ứng dụng trên máy chủ trước khi cấp quyền.</p>');
      if (!admin(req)) return reply(res, 401, 'Đăng nhập quản trị', '<p>Cần tài khoản quản trị để kết nối shop.</p>', {'WWW-Authenticate':'Basic realm="HADO Store", charset="UTF-8"'});
      if (sessions.size >= 100) return reply(res, 429, 'Vui lòng thử lại', '<p>Quá nhiều phiên kết nối đang chờ.</p>');
      const state = randomBytes(32).toString('hex');
      const browser = randomBytes(32).toString('hex');
      sessions.set(state, { browser, expires: Date.now() + ttl });
      const target = new URL('https://services.tiktokshop.com/open/authorize');
      target.searchParams.set('service_id', process.env.TIKTOK_SERVICE_ID);
      target.searchParams.set('state', state);
      res.writeHead(302, {'Location':target.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Set-Cookie':`hado_oauth=${browser}; Path=/tiktok/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600`});
      return res.end();
    }
    if (url.pathname === '/tiktok/callback') {
      if (!configured()) return reply(res, 503, 'Callback đã hoạt động', '<p>Cần cấu hình App Key, App Secret, Service ID và mật khẩu quản trị trước khi kết nối shop.</p>');
      const state = url.searchParams.get('state');
      const session = sessions.get(state);
      const browser = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('hado_oauth='))?.slice(11);
      if (!session || session.expires < Date.now() || !browser || !equal(session.browser, browser)) return reply(res, 400, 'Phiên không hợp lệ', '<p>Phiên xác thực hết hạn hoặc không khớp. Hãy bắt đầu lại từ trang kết nối.</p>');
      sessions.delete(state);
      const code = url.searchParams.get('code');
      if (url.searchParams.has('error') || !code) return reply(res, 400, 'Chưa cấp quyền', '<p>TikTok Shop chưa trả về mã xác thực hợp lệ.</p>');
      // Do not exchange or retain tokens until durable encrypted storage is configured.
      return reply(res, 503, 'Đã nhận phản hồi xác thực', '<p>Callback và kiểm tra phiên đã hoạt động. Cần hoàn tất kho lưu trữ token bảo mật trước khi kích hoạt kết nối dữ liệu shop.</p>', {'Set-Cookie':'hado_oauth=; Path=/tiktok/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});
    }
    return reply(res, 404, 'Không tìm thấy', '<p>Đường dẫn không tồn tại.</p>');
  } catch {
    if (!res.headersSent) reply(res, 500, 'Không thể xử lý', '<p>Vui lòng thử lại sau.</p>');
    else res.end();
  }
});
const cleanup = setInterval(() => { for (const [key, value] of sessions) if (value.expires < Date.now()) sessions.delete(key); }, 60000);
cleanup.unref();
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('HADO callback service started'));
