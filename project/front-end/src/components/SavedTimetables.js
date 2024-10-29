import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SavedTimetables = () => {
  const [timetables, setTimetables] = useState([]);
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteStatus, setDeleteStatus] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTimetables = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          throw new Error('사용자 ID를 찾을 수 없습니다.');
        }
        const response = await axios.get(`/api/timetables/${userId}`);
        setTimetables(response.data);
        setLoading(false);
      } catch (err) {
        console.error('시간표 목록을 불러오는 중 오류 발생:', err);
        setError('시간표 목록을 불러오는데 실패했습니다.');
        setLoading(false);
      }
    };

    fetchTimetables();
  }, []);

  const handleTimetableSelect = (timetable) => {
    setSelectedTimetable(timetable);
  };

  const handleDeleteTimetable = async (timetableId) => {
    try {
      const response = await axios.delete(`/api/timetables/${timetableId}`);
      if (response.status === 200) {
        setDeleteStatus('시간표가 성공적으로 삭제되었습니다.');
        setTimetables(timetables.filter(timetable => timetable.id !== timetableId));
        setSelectedTimetable(null);
      } else {
        setDeleteStatus('시간표 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('시간표 삭제 중 오류 발생:', error);
      setDeleteStatus('시간표 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const parseTimeSlots = (timeSlots) => {
    return timeSlots.split('/').map(slot => {
      const [day, time] = slot.trim().split(')');
      const [start, end] = time.trim().split('~').map(Number);
      return {
        day: day.replace('(', '').trim(),
        start,
        end
      };
    });
  };

  const renderTimetable = () => {
    if (!selectedTimetable) return null;

    const days = ['월', '화', '수', '목', '금'];
    const periods = Array.from({ length: 15 }, (_, i) => i + 1);
    const courseColors = {};

    const getRandomColor = () => {
      const colors = ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFDFBA'];
      return colors[Math.floor(Math.random() * colors.length)];
    };

    return (
      <div style={styles.timetableContainer}>
        <table style={styles.timetable}>
          <thead>
            <tr>
              <th style={styles.headerCell}>교시</th>
              {days.map(day => (
                <th key={day} style={styles.headerCell}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map(period => (
              <tr key={period}>
                <td style={styles.timeCell}>{period}</td>
                {days.map(day => (
                  <td key={`${day}-${period}`} style={styles.dayCell}>
                    {selectedTimetable.courses.map((course, index) => {
                      const slots = parseTimeSlots(course.time_slots);
                      const relevantSlot = slots.find(slot =>
                        slot.day === day && Math.floor(slot.start) === period
                      );

                      if (!relevantSlot) return null;

                      if (!courseColors[course.name]) {
                        courseColors[course.name] = getRandomColor();
                      }

                      const top = (relevantSlot.start - Math.floor(relevantSlot.start)) * 40;
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
    if (!selectedTimetable || !selectedTimetable.courses || selectedTimetable.courses.length === 0) {
      return <p>과목 목록 데이터가 없거나 올바르지 않습니다.</p>;
    }

    return (
      <ul style={styles.courseList}>
        {selectedTimetable.courses.map((course, index) => (
          <li key={index} style={styles.courseItem}>
            <div style={styles.courseItemName}>{course.name}</div>
            <div>교수: {course.professor}</div>
            <div>시간: {course.time_slots}</div>
            <div>학점: {course.credits}</div>
            <div>이수구분: {course.course_type}</div>
            {course.track_required && <div style={{ color: 'red' }}>트랙필수</div>}
          </li>
        ))}
      </ul>
    );
  };

  if (loading) return <div style={styles.message}>로딩 중...</div>;
  if (error) return <div style={styles.message}>{error}</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>저장된 시간표</h1>
      {timetables.length === 0 ? (
        <div style={styles.emptyState}>
          <p>저장된 시간표가 없습니다.</p>
          <button onClick={() => navigate('/timetable-generator')} style={styles.createButton}>
            새 시간표 만들기
          </button>
        </div>
      ) : (
        <div style={styles.timetableList}>
          {timetables.map(timetable => (
            <div key={timetable.id} style={styles.timetableItem}>
              <button
                onClick={() => handleTimetableSelect(timetable)}
                style={styles.timetableButton}
              >
                {timetable.name || `시간표 ${timetable.id}`}
              </button>
              <button
                onClick={() => handleDeleteTimetable(timetable.id)}
                style={styles.deleteButton}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
      {selectedTimetable && (
        <div style={styles.selectedTimetable}>
          <h2 style={styles.subtitle}>{selectedTimetable.name || '선택된 시간표'}</h2>
          {renderTimetable()}
          <h2 style={styles.subtitle}>과목 목록</h2>
          {renderCourseList()}
        </div>
      )}
      <button onClick={() => navigate('/main')} style={styles.backButton}>
        메인 페이지로 돌아가기
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
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: '30px',
    marginBottom: '10px',
    fontSize: '20px',
    fontWeight: 'bold',
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
    width: '50px',
    textAlign: 'center',
    border: '1px solid #ddd',
    backgroundColor: '#f9f9f9',
  },
  dayCell: {
    width: '18%',
    height: '40px',
    border: '1px solid #ddd',
    position: 'relative',
  },
  timetableButton: {
    padding: '10px 15px',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '5px 10px',
    backgroundColor: '#ff4d4f',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
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
  message: {
    textAlign: 'center',
    fontSize: '18px',
    marginTop: '50px',
  },
  emptyState: {
    textAlign: 'center',
    marginTop: '20px',
  },
  createButton: {
    padding: '10px 15px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    marginTop: '15px',
  },
  backButton: {
    display: 'block',
    width: '200px',
    margin: '20px auto',
    padding: '10px',
    backgroundColor: '#333',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};

export default SavedTimetables;
