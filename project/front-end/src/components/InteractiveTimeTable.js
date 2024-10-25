import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// InteractiveTimeTable 컴포넌트 정의
const InteractiveTimeTable = () => {
  // 상태 변수 정의
  const [timetableData, setTimetableData] = useState(null);
  const [remainingCredits, setRemainingCredits] = useState(null);
  const [totalCredits, setTotalCredits] = useState(null);
  const [alternativeCourses, setAlternativeCourses] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // 컴포넌트 마운트 시 시간표 데이터 로드
  useEffect(() => {
    const state = location.state;
    if (state && state.timetable && Array.isArray(state.timetable) && state.timetable.length > 0) {
      console.log('받은 시간표 데이터:', state.timetable);
      setTimetableData(state.timetable);
      setRemainingCredits(state.remainingCredits);
      setTotalCredits(state.totalCredits);
      setAlternativeCourses(state.alternativeCourses);
    } else {
      console.log('유효하지 않은 시간표 데이터:', state);
      navigate('/generate-timetable', { state: { error: '시간표 생성에 실패했습니다. 다시 시도해주세요.' } });
    }
  }, [location, navigate]);


  
  // 시간표 렌더링 함수
  const renderTimetable = () => {
    if (!timetableData || !Array.isArray(timetableData) || timetableData.length === 0) {
      return <p>시간표 데이터가 없거나 올바르지 않습니다.</p>;
    }

    const days = ['월', '화', '수', '목', '금'];
    const times = Array.from({ length: 13 }, (_, i) => i + 9); // 9시부터 21시까지

    return (
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>시간</th>
            {days.map(day => <th key={day} style={styles.th}>{day}</th>)}
          </tr>
        </thead>
        <tbody>
          {times.map(time => (
            <tr key={time}>
              <td style={styles.td}>{`${time}:00`}</td>
              {days.map(day => {
                const course = timetableData.find(c => 
                  c.day === day && 
                  parseInt(c.start_time.split(':')[0]) <= time &&
                  parseInt(c.end_time.split(':')[0]) > time
                );
                return (
                  <td key={`${day}-${time}`} style={styles.td}>
                    {course ? course.name : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // 과목 목록 렌더링 함수
  const renderCourseList = () => {
    if (!timetableData || !Array.isArray(timetableData) || timetableData.length === 0) {
      return <p>과목 목록 데이터가 없거나 올바르지 않습니다.</p>;
    }

    return (
      <ul style={styles.courseList}>
        {timetableData.map((course, index) => (
          <li key={index} style={styles.courseItem}>
            {course.name} - {course.day} {course.start_time}~{course.end_time}
          </li>
        ))}
      </ul>
    );
  };

  // 남은 학점 정보 렌더링 함수
  const renderRemainingCredits = () => {
    if (!remainingCredits) {
      return <p>남은 학점 정보가 없습니다.</p>;
    }

    return (
      <div style={styles.creditsInfo}>
        <h3>남은 학점</h3>
        <p>기초문해: {remainingCredits.basic_literacy}</p>
        <p>핵심교양: {remainingCredits.core_liberal_arts}</p>
        <p>기초과학: {remainingCredits.basic_science}</p>
        <p>전공필수: {remainingCredits.required_major}</p>
        <p>전공선택: {remainingCredits.elective_major}</p>
      </div>
    );
  };

  // 컴포넌트 렌더링
  const renderAlternativeCourses = () => {
    if (!alternativeCourses) {
      return null;
    }

    return (
      <div style={styles.alternativeCourses}>
        <h3>대체 과목</h3>
        {Object.entries(alternativeCourses).map(([course, alternatives]) => (
          <div key={course}>
            <h4>{course}</h4>
            <ul>
              {alternatives.map((alt, index) => (
                <li key={index}>
                  {alt.name} - {alt.day} {alt.start_time}~{alt.end_time} (교수: {alt.professor}, 학점: {alt.credits})
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>생성된 시간표</h1>
      {renderTimetable()}
      <h2 style={styles.subtitle}>과목 목록</h2>
      {renderCourseList()}
      {renderRemainingCredits()}
      <p>총 이수 학점: {totalCredits}</p>
      {renderAlternativeCourses()}
      <button onClick={() => navigate('/generate-timetable')} style={styles.button}>
        시간표 다시 생성하기
      </button>
    </div>
  );
};

// 스타일 정의
const styles = {
  container: {
    padding: '20px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  title: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  subtitle: {
    marginTop: '30px',
    marginBottom: '10px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    border: '1px solid #ddd',
    padding: '8px',
    backgroundColor: '#f2f2f2',
  },
  td: {
    border: '1px solid #ddd',
    padding: '8px',
    textAlign: 'center',
  },
  courseList: {
    listStyleType: 'none',
    padding: 0,
  },
  courseItem: {
    marginBottom: '8px',
  },
  creditsInfo: {
    marginTop: '30px',
    padding: '15px',
    backgroundColor: '#f2f2f2',
    borderRadius: '5px',
  },
  button: {
    display: 'block',
    width: '200px',
    margin: '20px auto',
    padding: '10px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};

export default InteractiveTimeTable;