import express from 'express';
import bcrypt from 'bcrypt';

const router = express.Router();

export default function(db) {
  // 회원가입
  router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
      const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (existingUser.length > 0) {
        return res.status(400).json({ message: '이미 존재하는 이메일입니다.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);

      res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    } catch (error) {
      console.error('회원가입 오류:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.', details: error.message });
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (users.length === 0) {
        return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }
  
      const user = users[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }
  
      // 'id' 필드를 포함하여 응답
      res.json({ id: user.id, userId: user.id, username: user.username });
    } catch (error) {
      console.error('로그인 오류:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
    }
  });
  
  return router;
}