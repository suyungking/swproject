import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const InteractiveTimeTable = () => {
  const [timetableData, setTimetableData] = useState(null);
  const [remainingCredits, setRemainingCredits] = useState(null);
  const [totalCredits, setTotalCredits] = useState(null);
  const [alternativeCourses, setAlternativeCourses] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

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

  const timeSlots = [
    { period: 1, start: '09:00', end: '09:50' },
    { period: 2, start: '10:00', end: '10:50' },
    { period: 3, start: '11:00', end: '11:50' },
    { period: 4, start: '12:00', end: '12:50' },
    { period: 5, start: '13:00', end: '13:50' },
    { period: 6, start: '14:00', end: '14:50' },
    { period: 7, start: '15:00', end: '15:50' },
    { period: 8, start: '16:00', end: '16:50' },
    { period: 9, start: '17:00', end: '17:50' },
    { period: 10, start: '18:00', end: '18:45' },
    { period: 11, start: '18:45', end: '19:30' },
    { period: 12, start: '19:35', end: '20:20' },
    { period: 13, start: '20:20', end: '21:05' },
    { period: 14, start: '21:10', end: '21:55' },
    { period: 15, start: '21:55', end: '22:40' }
  ];

  const days = ['월', '화', '수', '목', '금'];

  const renderTimetable = () => {
    if (!timetableData || !Array.isArray(timetableData) || timetableData.length === 0) {
      return <p style={styles.error}>시간표 데이터가 없거나 올바르지 않습니다.</p>;
    }
  
    const maxEndTime = Math.max(...timetableData.map(course => parseFloat(course.end_time)));
    const displayedTimeSlots = timeSlots.filter(slot => slot.period <= Math.ceil(maxEndTime));
    const headerCellHeight = 40; // 요일 헤더 셀의 높이
  
    return (
      <div style={styles.timetableContainer}>
        <div style={styles.timeColumn}>
          <div style={styles.headerCell}>교시</div>
          {displayedTimeSlots.map((slot) => (
            <div key={slot.period} style={styles.timeSlot}>
              <div>{slot.period}</div>
              <div style={styles.timeInfo}>{slot.start}</div>
            </div>
          ))}
        </div>
        {days.map((day) => (
          <div key={day} style={styles.dayColumn}>
            <div style={styles.headerCell}>{day}</div>
            {timetableData
              .filter(course => course.day === `(${day})`)
              .map((course, index) => {
                const startSlot = Math.floor(parseFloat(course.start_time)) - 1;
                const endSlot = Math.floor(parseFloat(course.end_time)) - 1;
                const isHalfStart = parseFloat(course.start_time) % 1 !== 0;
                const isHalfEnd = parseFloat(course.end_time) % 1 !== 0;
  
                // 요일 헤더 셀 높이를 고려하여 각 과목의 위치를 조정
                const top = headerCellHeight + startSlot * 40 + (isHalfStart ? 20 : 0);
                const height = Math.max((endSlot - startSlot) * 40 + (isHalfEnd ? 20 : 40), 40);
  
                return (
                  <div
                    key={index}
                    style={{
                      ...styles.courseCell,
                      top: `${top}px`, // top 위치 조정
                      height: `${height}px`, // height 설정
                      backgroundColor: getRandomColor(),
                    }}
                  >
                    <div style={styles.courseName}>{course.name}</div>
                    <div style={styles.courseInfo}>{course.professor}</div>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    );
  };

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

  const getRandomColor = () => {
    const colors = ['#FFE6E6', '#E6F3FF', '#E6FFE6', '#FFE6F3', '#E6FFFF', '#FFF3E6'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  if (!timetableData) {
    return <div style={styles.loadingMessage}>로딩 중...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>내 시간표</h1>
      {renderTimetable()}
      <h2 style={styles.subtitle}>과목 목록</h2>
      {renderCourseList()}
      {renderRemainingCredits()}
      <p style={styles.totalCredits}>총 이수 학점: {totalCredits}</p>
      {renderAlternativeCourses()}
      <div style={styles.buttonContainer}>
        <button onClick={() => navigate('/main')} style={styles.button}>
          메인 페이지로 돌아가기
        </button>
        <button onClick={() => navigate('/generate-timetable')} style={styles.button}>
          시간표 다시 생성하기
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1000px',
    margin: '0 auto',
    backgroundColor: '#f5f5f5',
    color: '#333333',
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    textAlign: 'center',
    marginBottom: '20px',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333333',
  },
  subtitle: {
    marginTop: '30px',
    marginBottom: '10px',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333333',
  },
  timetableContainer: {
    display: 'flex',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  timeColumn: {
    width: '80px',
    borderRight: '1px solid #e0e0e0',
  },
  dayColumn: {
    flex: 1,
    position: 'relative',
    borderRight: '1px solid #e0e0e0',
    minHeight: '600px',
  },
  headerCell: {
    padding: '10px',
    textAlign: 'center',
    fontWeight: 'bold',
    backgroundColor: '#333333',
    color: '#ffffff',
    borderBottom: '1px solid #e0e0e0',
    height: '20px',
  },
  timeSlot: {
    height: '40px',
    borderBottom: '1px solid #eeeeee',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#666666',
  },
  timeInfo: {
    fontSize: '10px',
    color: '#666666',
  },
  courseCell: {
    position: 'absolute',
    left: '1px',
    right: '1px',
    padding: '5px',
    fontSize: '12px',
    border: '1px solid #e0e0e0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    color: '#333333',
    borderRadius: '4px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  courseName: {
    fontWeight: 'bold',
    marginBottom: '2px',
    color: '#222222',
  },
  courseInfo: {
    fontSize: '10px',
    color: '#555555',
  },
  creditsInfo: {
    marginTop: '30px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '5px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  totalCredits: {
    marginTop: '20px',
    fontSize: '18px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333333',
  },
  alternativeCourses: {
    marginTop: '30px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '5px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '30px',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#333333',
    color: '#ffffff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'background-color 0.3s',
  },
  loadingMessage: {
    textAlign: 'center',
    fontSize: '18px',
    marginTop: '50px',
    color: '#666666',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
  },
};

export default InteractiveTimeTable;
