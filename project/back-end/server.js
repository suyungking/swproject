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

app.delete('/api/timetables/:timetableId', async (req, res) => {
  const { timetableId } = req.params;

  try {
    const [result] = await db.query('DELETE FROM saved_timetables WHERE id = ?', [timetableId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '삭제할 시간표를 찾을 수 없습니다.' });
    }

    res.json({ success: true, message: '시간표가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('시간표 삭제 중 오류 발생:', error);
    res.status(500).json({ success: false, message: '시간표 삭제에 실패했습니다.', error: error.message });
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

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { major, basic_literacy, core_liberal_arts, basic_science, required_major, elective_major, graduation_credits } = req.body;

  try {
    const [result] = await db.query(
      'UPDATE users SET major = ?, basic_literacy = ?, core_liberal_arts = ?, basic_science = ?, required_major = ?, elective_major = ?, graduation_credits = ? WHERE id = ?',
      [major, basic_literacy, core_liberal_arts, basic_science, required_major, elective_major, graduation_credits, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ success: true, message: '사용자 정보가 성공적으로 업데이트되었습니다.' });
  } catch (error) {
    console.error('사용자 정보 업데이트 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.', error: error.message });
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

app.post('/api/save-timetable', async (req, res) => {
  const { userId, timetableData, remainingCredits, totalCredits, alternativeCourses } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: '사용자 ID가 제공되지 않았습니다.' });
  }

  try {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        'INSERT INTO saved_timetables (user_id, timetable_data, remaining_credits, total_credits, alternative_courses) VALUES (?, ?, ?, ?, ?)',
        [userId, JSON.stringify(timetableData), JSON.stringify(remainingCredits), totalCredits, JSON.stringify(alternativeCourses)]
      );

      await connection.commit();

      res.json({ success: true, message: '시간표가 성공적으로 저장되었습니다.', timetableId: result.insertId });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('시간표 저장 중 오류 발생:', error);
    res.status(500).json({ success: false, message: '시간표 저장에 실패했습니다.', error: error.message });
  }
});


// 사용자의 시간표 목록 조회
app.get('/api/timetables/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('요청된 사용자 ID:', userId);

    const [timetables] = await db.query(
      'SELECT * FROM saved_timetables WHERE user_id = ?',
      [userId]
    );
    
    console.log('데이터베이스 쿼리 결과:', JSON.stringify(timetables, null, 2));

    if (timetables.length === 0) {
      console.log('사용자의 저장된 시간표가 없습니다.');
      return res.json([]);
    }

    const formattedTimetables = timetables.map(timetable => {
      try {
        return {
          id: timetable.id,
          name: `시간표 ${timetable.id}`,
          created_at: timetable.created_at,
          courses: Array.isArray(timetable.timetable_data) ? timetable.timetable_data : JSON.parse(timetable.timetable_data),
          remainingCredits: typeof timetable.remaining_credits === 'object' ? timetable.remaining_credits : JSON.parse(timetable.remaining_credits),
          totalCredits: timetable.total_credits,
          alternativeCourses: timetable.alternative_courses ? (typeof timetable.alternative_courses === 'object' ? timetable.alternative_courses : JSON.parse(timetable.alternative_courses)) : null
        };
      } catch (error) {
        console.error('시간표 데이터 파싱 오류:', error, 'Raw data:', timetable.timetable_data);
        return null;
      }
    }).filter(timetable => timetable !== null);

    console.log('형식화된 시간표:', JSON.stringify(formattedTimetables, null, 2));
    res.json(formattedTimetables);
  } catch (error) {
    console.error('시간표 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
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