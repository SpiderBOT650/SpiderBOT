require('dotenv').config();
const express  = require('express');
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { Resend } = require('resend');
const cors     = require('cors');
const path     = require('path');

const app = express();

// ── DB ──
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

// ── Resend (lazy) ──
let _resend = null;
function sendEmail(opts) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY 없음 — 이메일 건너뜀');
    return Promise.resolve({ error: 'no key' });
  }
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend.emails.send(opts);
}

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── DB Init ──
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                SERIAL PRIMARY KEY,
      username          VARCHAR(50)  UNIQUE NOT NULL,
      email             VARCHAR(255) UNIQUE NOT NULL,
      password_hash     VARCHAR(255) NOT NULL,
      email_verified    BOOLEAN      DEFAULT FALSE,
      verification_token VARCHAR(255),
      token_expires_at  TIMESTAMP,
      plan              VARCHAR(50)  DEFAULT 'none',
      balance           BIGINT       DEFAULT 0,
      total_profit      BIGINT       DEFAULT 0,
      created_at        TIMESTAMP    DEFAULT NOW()
    )
  `);
}
initDB().catch(e => console.error('DB init error:', e.message));

// ── Auth middleware ──
function auth(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    next();
  } catch {
    res.status(401).json({ error: '인증이 만료되었습니다' });
  }
}

// ── Email template ──
function emailHTML(username, url) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0C0B18;font-family:Arial,sans-serif">
<div style="max-width:480px;margin:40px auto;padding:20px">
  <div style="background:#1A1733;border-radius:20px;padding:40px;border:1px solid rgba(139,92,246,0.3)">
    <h1 style="margin:0 0 4px;font-size:28px;color:#A855F7;letter-spacing:4px">SpiderBOT</h1>
    <p style="margin:0 0 28px;font-size:11px;color:#5A5680;letter-spacing:2px">AI TRADING BOT PLATFORM</p>
    <h2 style="margin:0 0 12px;font-size:18px;color:#fff">이메일 인증 요청</h2>
    <p style="margin:0 0 8px;font-size:14px;color:#9B97B8;line-height:1.7">안녕하세요 <strong style="color:#C084FC">${username}</strong>님,</p>
    <p style="margin:0 0 28px;font-size:14px;color:#9B97B8;line-height:1.7">SpiderBOT에 가입해 주셔서 감사합니다.<br>아래 버튼을 눌러 이메일 인증을 완료해주세요.</p>
    <a href="${url}" style="display:block;background:linear-gradient(135deg,#7C3AED,#A855F7);color:#fff;text-align:center;padding:15px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">✅ 이메일 인증하기</a>
    <p style="margin:20px 0 0;font-size:12px;color:#5A5680;text-align:center">이 링크는 24시간 후 만료됩니다</p>
  </div>
  <p style="text-align:center;font-size:11px;color:#3A3760;margin-top:16px">© 2025 SpiderBOT. All rights reserved.</p>
</div></body></html>`;
}

// ════════════════════════
// API ROUTES
// ════════════════════════

// 회원가입
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: '모든 항목을 입력해주세요' });
  if (username.length < 3 || username.length > 20)
    return res.status(400).json({ error: '아이디는 3~20자여야 합니다' });
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return res.status(400).json({ error: '아이디는 영문·숫자·밑줄만 가능합니다' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: '이메일 형식이 올바르지 않습니다' });
  if (password.length < 8)
    return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다' });
  if (!/[!@#$%^&*()\-_=+\[\]{};':",.<>/?\\|]/.test(password))
    return res.status(400).json({ error: '비밀번호에 특수문자를 포함해야 합니다' });

  try {
    const hash  = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex');
    const exp   = new Date(Date.now() + 86400000);

    await pool.query(
      `INSERT INTO users (username,email,password_hash,verification_token,token_expires_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [username, email.toLowerCase(), hash, token, exp]
    );

    const base = process.env.BASE_URL || 'http://localhost:3000';
    await sendEmail({
      from:    process.env.FROM_EMAIL || 'SpiderBOT <onboarding@resend.dev>',
      to:      email,
      subject: '[SpiderBOT] 이메일 인증을 완료해주세요',
      html:    emailHTML(username, `${base}/api/verify?token=${token}`),
    });

    res.json({ message: `${email}로 인증 메일을 발송했습니다.` });
  } catch (e) {
    if (e.code === '23505') {
      if (e.constraint?.includes('username')) return res.status(400).json({ error: '이미 사용 중인 아이디입니다' });
      if (e.constraint?.includes('email'))    return res.status(400).json({ error: '이미 사용 중인 이메일입니다' });
    }
    console.error(e);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 이메일 인증
app.get('/api/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect('/?error=invalid');
  try {
    const r = await pool.query(
      `UPDATE users SET email_verified=TRUE,verification_token=NULL,token_expires_at=NULL
       WHERE verification_token=$1 AND token_expires_at > NOW() RETURNING username`,
      [token]
    );
    if (!r.rowCount) return res.redirect('/?error=expired');
    res.redirect(`/?verified=true&u=${encodeURIComponent(r.rows[0].username)}`);
  } catch (e) {
    console.error(e);
    res.redirect('/?error=server');
  }
});

// 로그인
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요' });
  try {
    const r = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (!r.rows.length)
      return res.status(400).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    const user = r.rows[0];
    if (!user.email_verified)
      return res.status(400).json({ error: '이메일 인증이 필요합니다', code: 'NOT_VERIFIED' });
    if (!await bcrypt.compare(password, user.password_hash))
      return res.status(400).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, plan: user.plan } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 내 정보
app.get('/api/me', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id,username,email,plan,balance,total_profit,created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: '사용자 없음' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 인증 메일 재발송
app.post('/api/resend-verify', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: '이메일을 입력해주세요' });
  try {
    const r = await pool.query(
      'SELECT * FROM users WHERE email=$1 AND email_verified=FALSE',
      [email.toLowerCase()]
    );
    if (!r.rows.length)
      return res.status(400).json({ error: '미인증 계정을 찾을 수 없습니다' });
    const user  = r.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const exp   = new Date(Date.now() + 86400000);
    await pool.query(
      'UPDATE users SET verification_token=$1,token_expires_at=$2 WHERE id=$3',
      [token, exp, user.id]
    );
    const base = process.env.BASE_URL || 'http://localhost:3000';
    await sendEmail({
      from:    process.env.FROM_EMAIL || 'SpiderBOT <onboarding@resend.dev>',
      to:      email,
      subject: '[SpiderBOT] 인증 메일 재발송',
      html:    emailHTML(user.username, `${base}/api/verify?token=${token}`),
    });
    res.json({ message: '인증 메일을 재발송했습니다' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 헬스체크
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// SPA fallback
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 로컬 실행용 (Vercel에서는 module.exports만 사용)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 SpiderBOT on http://localhost:${PORT}`));
}

module.exports = app;
