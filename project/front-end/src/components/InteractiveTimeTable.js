import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const InteractiveTimeTable = () => {
  const [timetableData, setTimetableData] = useState(null);
  const [remainingCredits, setRemainingCredits] = useState(null);
  const [totalCredits, setTotalCredits] = useState(null);
  const [alternativeCourses, setAlternativeCourses] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
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

  const days = ['교시', '월', '화', '수', '목', '금'];
  const periods = useMemo(() => Array.from({ length: 15 }, (_, i) => i + 1), []);

  const getRandomColor = () => {
    const colors = ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFDFBA'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const parseTimeSlots = (timeSlots) => {
    if (typeof timeSlots !== 'string') {
      console.error('Invalid timeSlots:', timeSlots);
      return [];
    }
    return timeSlots.split('/').map(slot => {
      const [day, period] = slot.trim().split(')');
      const [start, end] = period.trim().split('~').map(Number);
      return {
        day: day.replace('(', '').trim(),
        start,
        end
      };
    });
  };

  const renderTimetable = () => {
    if (!timetableData || !Array.isArray(timetableData) || timetableData.length === 0) {
      return <p style={styles.error}>시간표 데이터가 없거나 올바르지 않습니다.</p>;
    }

    const courseColors = {};

    return (
      <div style={styles.timetableContainer}>
        <table style={styles.timetable}>
          <thead>
            <tr>
              {days.map(day => (
                <th key={day} style={styles.headerCell}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map(period => (
              <tr key={period}>
                <td style={styles.timeCell}>{period}</td>
                {days.slice(1).map(day => (
                  <td key={`${day}-${period}`} style={styles.dayCell}>
                    {timetableData.map((course, index) => {
                      const slots = parseTimeSlots(course.time_slots);
                      const relevantSlot = slots.find(slot => 
                        slot.day === day && period >= slot.start && period < slot.end
                      );

                      if (!relevantSlot) return null;

                      if (!courseColors[course.name]) {
                        courseColors[course.name] = getRandomColor();
                      }

                      const top = (relevantSlot.start - period) * 40;
                      const height = (relevantSlot.end - relevantSlot.start) * 40;

                      return (
                        <div
                          key={`${index}-${day}-${period}`}
                          style={{
                            ...styles.courseCell,
                            backgroundColor: courseColors[course.name],
                            top: `${top}px`,
                            height: `${height}px`,
                          }}
                        >
                          <div style={styles.courseName}>{course.name}</div>
                        </div>
                      );
                    })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
            <div style={styles.courseItemName}>{course.name}</div>
            <div>교수: {course.professor}</div>
            <div>시간: {course.time_slots}</div>
            <div>학점: {course.credits}</div>
            <div>이수구분: {course.course_type}</div>
            {course.track_required && <div>트랙필수</div>}
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
        <p>기초문해: {remainingCredits.basic_liberal_arts.basic_literacy}</p>
        <p>핵심교양: {remainingCredits.core_liberal_arts}</p>
        <p>기초과학: {remainingCredits.basic_liberal_arts.basic_science}</p>
        <p>전공필수: {remainingCredits.required_major}</p>
        <p>전공선택: {remainingCredits.elective_major}</p>
        <p>기타: {remainingCredits.undefined}</p>
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
                  {alt.name} - {alt.time_slots} (교수: {alt.professor}, 학점: {alt.credits})
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  const saveTimetable = async () => {
    try {
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        console.error('사용자 ID를 찾을 수 없습니다.');
        setSaveStatus('사용자 ID를 찾을 수 없습니다. 다시 로그인해주세요.');
        return;
      }

      const response = await axios.post('/api/save-timetable', {
        userId,
        timetableData,
        remainingCredits,
        totalCredits,
        alternativeCourses
      });

      if (response.data.success) {
        setSaveStatus('시간표가 성공적으로 저장되었습니다.');
      } else {
        setSaveStatus('시간표 저장에 실패했습니다: ' + response.data.message);
      }
    } catch (error) {
      console.error('시간표 저장 중 오류 발생:', error);
      setSaveStatus('시간표 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
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
        <button onClick={() => navigate('/timetable-generator')} style={styles.button}>
          시간표 다시 생성하기
        </button>
        <button onClick={saveTimetable} style={styles.button}>
          시간표 저장하기
        </button>
      </div>
      {saveStatus && <p style={styles.saveStatus}>{saveStatus}</p>}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1000px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
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
    overflowX: 'auto',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
  },
  timetable: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#ffffff',
  },
  headerCell: {
    padding: '10px',
    textAlign: 'center',
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
    color: '#333333',
    border: '1px solid #e0e0e0',
  },
  timeCell: {
    width: '60px',
    textAlign: 'center',
    border: '1px solid #e0e0e0',
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  dayCell: {
    width: '18%',
    height: '40px',
    border: '1px solid #e0e0e0',
    position: 'relative',
    padding: 0,
  },
  courseCell: {
    position: 'absolute',
    left: '1px',
    right: '1px',
    padding: '2px',
    fontSize: '12px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#333333',
    borderRadius: '4px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    zIndex: 1,
  },
  courseName: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  courseList: {
    listStyle: 'none',
    padding: 0,
    margin: '20px 0',
  },
  courseItem: {
    backgroundColor: '#f9f9f9',
    padding: '10px',
    marginBottom: '10px',
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  courseItemName: {
    fontWeight: 'bold',
    marginBottom: '5px',
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
    backgroundColor: '#4a90e2',
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
  saveStatus: {
    marginTop: '20px',
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#4a90e2',
  },
};

export default InteractiveTimeTable;