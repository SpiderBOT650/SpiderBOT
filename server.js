require('dotenv').config();
const express  = require('express');
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { Resend } = require('resend');
const cors     = require('cors');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── DB ──
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ── Resend ──
let _resend = null;
function sendEmail(opts) {
  if (!process.env.RESEND_API_KEY) return Promise.resolve();
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend.emails.send(opts);
}

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
  console.log('✅ DB ready');
}

// ── Auth ──
function auth(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret'); next(); }
  catch { res.status(401).json({ error: '인증이 만료되었습니다' }); }
}

// ── Email ──
function emailHTML(username, url) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>SpiderBOT Verification</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #07060F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #07060F; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" id="email-card" style="max-width: 500px; background-color: #0E0C1E; border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 16px; padding: 32px; border-collapse: separate; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
              
              <tr>
                <td align="center" style="padding-bottom: 24px;">
                  <span style="font-size: 28px; font-weight: 800; color: #FFFFFF; letter-spacing: 2px; text-transform: uppercase;">
                    🕷️ <span style="color: #A855F7;">Spider</span>BOT
                  </span>
                </td>
              </tr>

              <tr>
                <td>
                  <div style="height: 2px; background: linear-gradient(90deg, #7C3AED, #00E676); margin-bottom: 24px;"></div>
                </td>
              </tr>

              <tr>
                <td align="left" style="padding-bottom: 16px;">
                  <h1 style="font-size: 20px; font-weight: 700; color: #FFFFFF; margin: 0;">
                    보안 이메일 인증 안내
                  </h1>
                </td>
              </tr>

              <tr>
                <td align="left" style="padding-bottom: 28px;">
                  <p style="font-size: 14px; color: #9B97B8; line-height: 1.6; margin: 0;">
                    안녕하세요, <strong style="color: #FFFFFF;">${username}</strong> 회원님.<br>
                    SpiderBOT AI 트레이딩 플랫폼 가입을 환영합니다. 아래의 인증 버튼을 클릭하여 계정 활성화를 완료하고 봇 가동을 시작하세요.
                  </p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding-bottom: 28px;">
                  <a href="${url}" target="_blank" style="display: inline-block; background-color: #7C3AED; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                    계정 인증하기
                  </a>
                </td>
              </tr>

              <tr>
                <td align="left" style="background-color: #141228; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                  <p style="font-size: 12px; color: #5A5680; line-height: 1.5; margin: 0;">
                    💡 버튼이 클릭되지 않으시나요? 아래 주소를 복사하여 브라우저 주소창에 붙여넣어 주세요:<br>
                    <a href="${url}" target="_blank" style="color: #00E676; text-decoration: none; word-break: break-all;">${url}</a>
                  </p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding-top: 24px; border-top: 1px solid rgba(90, 86, 128, 0.2);">
                  <p style="font-size: 11px; color: #5A5680; margin: 0;">
                    본 메일은 발신 전용입니다. 문의 사항은 플랫폼 내 고객센터를 이용해 주세요.<br>
                    © 2026 SpiderBOT Platform. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ════════════════════
// API
// ════════════════════

app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: '모든 항목을 입력해주세요' });
  if (username.length < 3 || username.length > 20) return res.status(400).json({ error: '아이디는 3~20자여야 합니다' });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: '아이디는 영문·숫자·밑줄만 가능합니다' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: '이메일 형식이 올바르지 않습니다' });
  if (password.length < 8) return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다' });
  if (!/[!@#$%^&*()\-_=+\[\]{};':",.<>/?\\|]/.test(password)) return res.status(400).json({ error: '비밀번호에 특수문자를 포함해야 합니다' });
  try {
    const hash  = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex');
    const exp   = new Date(Date.now() + 86400000);
    await pool.query(
      `INSERT INTO users (username,email,password_hash,verification_token,token_expires_at) VALUES ($1,$2,$3,$4,$5)`,
      [username, email.toLowerCase(), hash, token, exp]
    );
    const base = process.env.BASE_URL || `http://localhost:${PORT}`;
    await sendEmail({
      from: process.env.FROM_EMAIL || 'SpiderBOT <onboarding@resend.dev>',
      to: email,
      subject: '[SpiderBOT] 이메일 인증을 완료해주세요',
      html: emailHTML(username, `${base}/api/verify?token=${token}`),
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
  } catch (e) { console.error(e); res.redirect('/?error=server'); }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요' });
  try {
    const r = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (!r.rows.length) return res.status(400).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    const user = r.rows[0];
    if (!user.email_verified) return res.status(400).json({ error: '이메일 인증이 필요합니다', code: 'NOT_VERIFIED' });
    if (!await bcrypt.compare(password, user.password_hash)) return res.status(400).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, plan: user.plan } });
  } catch (e) { console.error(e); res.status(500).json({ error: '서버 오류가 발생했습니다' }); }
});

app.get('/api/me', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT id,username,email,plan,balance,total_profit,created_at FROM users WHERE id=$1', [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: '사용자 없음' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: '서버 오류' }); }
});

app.post('/api/resend-verify', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: '이메일을 입력해주세요' });
  try {
    const r = await pool.query('SELECT * FROM users WHERE email=$1 AND email_verified=FALSE', [email.toLowerCase()]);
    if (!r.rows.length) return res.status(400).json({ error: '미인증 계정을 찾을 수 없습니다' });
    const user  = r.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const exp   = new Date(Date.now() + 86400000);
    await pool.query('UPDATE users SET verification_token=$1,token_expires_at=$2 WHERE id=$3', [token, exp, user.id]);
    const base = process.env.BASE_URL || `http://localhost:${PORT}`;
    await sendEmail({
      from: process.env.FROM_EMAIL || 'SpiderBOT <onboarding@resend.dev>',
      to: email,
      subject: '[SpiderBOT] 인증 메일 재발송',
      html: emailHTML(user.username, `${base}/api/verify?token=${token}`),
    });
    res.json({ message: '인증 메일을 재발송했습니다' });
  } catch (e) { console.error(e); res.status(500).json({ error: '서버 오류가 발생했습니다' }); }
});

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// SPA fallback
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Start ──
initDB()
  .then(() => app.listen(PORT, () => console.log(`🚀 SpiderBOT on port ${PORT}`)))
  .catch(e => { console.error('DB error:', e.message); process.exit(1); });
