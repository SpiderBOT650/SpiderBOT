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
      user_id_num       VARCHAR(10)  UNIQUE NOT NULL,
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
  console.log('✅ SpiderBOT DB Ready');
}

// ── Auth Middleware ──
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

// ── API Routes ──
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: '모든 필드를 입력해주세요' });

  try {
    const hashed = await bcrypt.hash(password, 10);
    // 10자리 고유 랜덤 숫자 생성 (1000000000 ~ 9999999999)
    const randomIDNum = String(Math.floor(1000000000 + Math.random() * 9000000000));
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 86400000); // 24시간 후 만료

    await pool.query(
      'INSERT INTO users (user_id_num, username, email, password_hash, verification_token, token_expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [randomIDNum, username.trim(), email.toLowerCase().trim(), hashed, token, expires]
    );

    const base = process.env.BASE_URL || `http://localhost:${PORT}`;
    await sendEmail({
      from: process.env.FROM_EMAIL || 'SpiderBOT <onboarding@resend.dev>',
      to: email,
      subject: '[SpiderBOT] 계정 이메일 인증 안내',
      html: `<p>인증 링크: <a href="${base}/api/verify?token=${token}">여기 클릭</a></p>`
    });

    res.json({ message: '회원가입 완료! 인증 메일을 확인해주세요.' });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: '이미 사용 중인 아이디 또는 이메일입니다.' });
    res.status(500).json({ error: '서버 가입 에러' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const r = await pool.query('SELECT * FROM users WHERE username=$1', [username.trim()]);
    if (!r.rows.length) return res.status(400).json({ error: '가입되지 않은 회원입니다' });
    
    const user = r.rows[0];
    if (!await bcrypt.compare(password, user.password_hash)) return res.status(400).json({ error: '비밀번호가 일치하지 않습니다' });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
    res.json({ token, username: user.username, verified: user.email_verified });
  } catch (e) {
    res.status(500).json({ error: '로그인 서버 오류' });
  }
});

// 프로필 데이터 연동 API
app.get('/api/user', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT user_id_num, username, email, plan, balance, total_profit, created_at FROM users WHERE id=$1', [req.user.id]);
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: '데이터 조회 실패' });
  }
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
