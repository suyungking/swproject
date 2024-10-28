import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import userAuthRoutes from './userAuth.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';




const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'admin',
  database: 'user_db'
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// userAuth 라우트에 데이터베이스 연결 전달
app.use('/api/auth', userAuthRoutes(db));

// 사용자의 시간표 목록 조회
app.get('/api/timetables/:userId', async (req, res) => {
  try {
    const [timetables] = await db.query('SELECT * FROM timetables WHERE user_id = ?', [req.params.userId]);
    res.json(timetables);
  } catch (error) {
    console.error('시간표 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
  }
});

// 특정 시간표의 강의 목록 조회
app.get('/api/courses/:timetableId', async (req, res) => {
  try {
    const [courses] = await db.query('SELECT * FROM courses WHERE timetable_id = ?', [req.params.timetableId]);
    res.json(courses);
  } catch (error) {
    console.error('강의 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
  }
});

// 사용자 정보 조회 (학점 정보 포함)
app.get('/api/user/:userId', async (req, res) => {
  try {
    const [user] = await db.query(
      'SELECT id, username, email, major, basic_literacy, core_liberal_arts, basic_science, required_major, elective_major, graduation_credits FROM users WHERE id = ?',
      [req.params.userId]
    );
    if (user.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    console.log('조회된 사용자 데이터:', user[0]);
    
    // 학점 정보가 null인 경우 '정보 없음'으로 변환
    const userInfo = {
      ...user[0],
      major: user[0].major || '정보 없음',
      basic_literacy: user[0].basic_literacy !== null ? `${user[0].basic_literacy} 학점` : '정보 없음',
      core_liberal_arts: user[0].core_liberal_arts !== null ? `${user[0].core_liberal_arts} 학점` : '정보 없음',
      basic_science: user[0].basic_science !== null ? `${user[0].basic_science} 학점` : '정보 없음',
      required_major: user[0].required_major !== null ? `${user[0].required_major} 학점` : '정보 없음',
      elective_major: user[0].elective_major !== null ? `${user[0].elective_major} 학점` : '정보 없음',
      graduation_credits: user[0].graduation_credits !== null ? `${user[0].graduation_credits} 학점` : '정보 없음'
    };
    
    res.json(userInfo);
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({ error: '서버 내부 오류', details: error.message });
  }
});

app.post('/api/generate-timetable', async (req, res) => {
  try {
    const timetableData = req.body;
    const response = await fetch('http://localhost:5001/generate-timetable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(timetableData),
    });

    if (!response.ok) {
      console.error(`Flask server responded with status: ${response.status}`);
      console.error(`Response text: ${await response.text()}`);
      throw new Error(`Flask server responded with status: ${response.status}`);
    }

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Error in generate-timetable:', error);
    res.status(500).json({ error: error.message });
  }
});




// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('서버 오류:', err);
  res.status(500).json({ message: '서버 오류가 발생했습니다.', error: err.message });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다`);
});

db.getConnection()
  .then(() => console.log('데이터베이스에 성공적으로 연결되었습니다.'))
  .catch(err => console.error('데이터베이스 연결 오류:', err));
