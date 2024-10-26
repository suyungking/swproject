import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUserInfo, generateTimetable } from '../services/api';

// 공통 스타일 정의
const commonStyles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
  },
  card: {
    width: '400px',
    padding: '32px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '24px',
    color: '#333',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '16px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '12px',
    marginBottom: '16px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
    backgroundColor: 'white',
  },
  checkboxContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    marginRight: '16px',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#333',
  },
  checkbox: {
    marginRight: '8px',
  },
  button: {
    display: 'block',
    width: '100%',
    padding: '12px',
    backgroundColor: '#333',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'none',
    marginBottom: '16px',
    transition: 'background-color 0.3s',
    boxSizing: 'border-box',
  },
  error: {
    color: 'red',
    marginBottom: '16px',
    fontSize: '14px',
  },
  link: {
    display: 'block',
    textAlign: 'center',
    color: '#333',
    textDecoration: 'none',
    marginTop: '16px',
    fontSize: '14px',
  },
};

const TimeTableGenerator = () => {
  // 상태 변수 정의
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    max_credits: '',
    include_advisory: false,
    preferred_days: [],
    morning_afternoon: '',
    include_night: false,
    shift: '',
    prioritize_liberal_arts: false,
    grade: '',
    completed_credits: {
      basic_literacy: '',
      core_liberal_arts: '',
      basic_science: '',
      required_major: '',
      elective_major: '',
    },
    selected_areas: [],
    include_elective_liberal_arts: false,
    include_teacher_training: false,
  });

  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 컴포넌트 마운트 시 사용자 정보 가져오기
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userId = JSON.parse(storedUser).id;
      if (userId) {
        fetchUserInfo(userId)
          .then(user => {
            setFormData(prevData => ({
              ...prevData,
              completed_credits: {
                basic_literacy: user.completed_basic_literacy || '',
                core_liberal_arts: user.completed_core_liberal_arts || '',
                basic_science: user.completed_basic_science || '',
                required_major: user.completed_required_major || '',
                elective_major: user.completed_elective_major || '',
              },
            }));
          })
          .catch(() => setError('사용자 정보를 불러오는 데 실패했습니다.'));
      } else {
        setError('로그인이 필요합니다.');
      }
    } else {
      setError('로그인이 필요합니다.');
    }
  }, []);

  // 입력 필드 변경 처리 함수
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => {
      if (type === 'checkbox') {
        if (name === 'preferred_days' || name === 'selected_areas') {
          const updatedArray = checked
            ? [...prevData[name], value]
            : prevData[name].filter(item => item !== value);
          return { ...prevData, [name]: updatedArray };
        }
        return { ...prevData, [name]: checked };
      }
      if (name.startsWith('completed_')) {
        const creditType = name.replace('completed_', '');
        return {
          ...prevData,
          completed_credits: {
            ...prevData.completed_credits,
            [creditType]: value,
          },
        };
      }
      return { ...prevData, [name]: value };
    });
  };

  // 폼 제출 처리 함수
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (step < 5) {
      setStep(step + 1);
      return;
    }

    try {
      const userId = JSON.parse(localStorage.getItem('user')).id;
      const timetableData = {
        user_id: userId,
        dynamic_data: {
          max_credits: parseInt(formData.max_credits),
          include_advisory: formData.include_advisory,
          preferred_days: formData.preferred_days,
          morning_afternoon: formData.morning_afternoon,
          include_night: formData.include_night,
          shift: formData.shift,
          grade: parseInt(formData.grade),
          selected_areas: formData.selected_areas,
          include_elective_liberal_arts: formData.include_elective_liberal_arts,
          include_teacher_training: formData.include_teacher_training,
          completed_credits: {
            completed_basic_literacy: parseInt(formData.completed_credits.basic_literacy) || 0,
            completed_core_liberal_arts: parseInt(formData.completed_credits.core_liberal_arts) || 0,
            completed_basic_science: parseInt(formData.completed_credits.basic_science) || 0,
            completed_required_major: parseInt(formData.completed_credits.required_major) || 0,
            completed_elective_major: parseInt(formData.completed_credits.elective_major) || 0,
            completed_elective_liberal_arts: parseInt(formData.completed_credits.elective_liberal_arts) || 0,
          },
        }
      };
      console.log("Sending timetable data to backend:", JSON.stringify(timetableData, null, 2));
      const result = await generateTimetable(timetableData);
      console.log("Received timetable result from backend:", JSON.stringify(result, null, 2));

      if (result.timetable && Array.isArray(result.timetable) && result.timetable.length > 0) {
        console.log("Timetable generated successfully. Navigating to interactive timetable.");
        navigate('/interactive-timetable', {
          state: {
            timetable: result.timetable,
            remainingCredits: result.remaining_credits,
            totalCredits: result.total_credits,
            alternativeCourses: result.alternative_courses
          }
        });
      } else {
        console.error("Timetable generation failed. Empty or invalid timetable received:", result);
        setError('시간표 생성에 실패했습니다. 생성된 시간표가 비어있습니다.');
      }
    } catch (error) {
      console.error('시간표 생성 오류:', error);
      setError('시간표 생성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 각 단계별 렌더링 함수
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <input
              name="max_credits"
              type="number"
              placeholder="이번 학기 최대 수강 학점"
              value={formData.max_credits}
              onChange={handleChange}
              style={commonStyles.input}
              required
            />
            <select
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              style={commonStyles.select}
              required
            >
              <option value="">학년 선택</option>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
              <option value="4">4학년</option>
            </select>
            <label style={commonStyles.checkboxLabel}>
              <input
                type="checkbox"
                name="include_advisory"
                checked={formData.include_advisory}
                onChange={handleChange}
                style={commonStyles.checkbox}
              />
              상담 수업 포함
            </label>
            <h3 style={{...commonStyles.label, marginTop: '20px'}}>이수한 학점</h3>
            <label style={commonStyles.label}>
              기초문해교육
              <input
                name="completed_basic_literacy"
                type="number"
                value={formData.completed_credits.basic_literacy}
                onChange={handleChange}
                style={commonStyles.input}
                required
              />
            </label>
            <label style={commonStyles.label}>
              핵심교양
              <input
                name="completed_core_liberal_arts"
                type="number"
                value={formData.completed_credits.core_liberal_arts}
                onChange={handleChange}
                style={commonStyles.input}
                required
              />
            </label>
            <label style={commonStyles.label}>
              기초과학교육
              <input
                name="completed_basic_science"
                type="number"
                value={formData.completed_credits.basic_science}
                onChange={handleChange}
                style={commonStyles.input}
                required
              />
            </label>
            <label style={commonStyles.label}>
              전공필수
              <input
                name="completed_required_major"
                type="number"
                value={formData.completed_credits.required_major}
                onChange={handleChange}
                style={commonStyles.input}
                required
              />
            </label>
            <label style={commonStyles.label}>
              전공선택
              <input
                name="completed_elective_major"
                type="number"
                value={formData.completed_credits.elective_major}
                onChange={handleChange}
                style={commonStyles.input}
                required
              />
            </label>
          </>
        );
      case 2:
        return (
          <div style={commonStyles.checkboxContainer}>
            {['월', '화', '수', '목', '금'].map((day) => (
              <label key={day} style={commonStyles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="preferred_days"
                  value={day}
                  checked={formData.preferred_days.includes(day)}
                  onChange={handleChange}
                  style={commonStyles.checkbox}
                />
                {day}
              </label>
            ))}
          </div>
        );
      case 3:
        return (
          <>
            <select
              name="morning_afternoon"
              value={formData.morning_afternoon}
              onChange={handleChange}
              style={commonStyles.select}
              required
            >
              <option value="">선호 시간대 선택</option>
              <option value="morning">오전</option>
              <option value="afternoon">오후</option>
              <option value="evening">저녁</option>
              <option value="all">전체</option>
            </select>
            <label style={commonStyles.checkboxLabel}>
              <input
                type="checkbox"
                name="include_night"
                checked={formData.include_night}
                onChange={handleChange}
                style={commonStyles.checkbox}
              />
              야간 수업 포함
            </label>
          </>
        );
      case 4:
        return (
          <>
            <h3 style={{...commonStyles.label, marginTop: '20px'}}>핵심교양 영역 선택</h3>
            <div style={commonStyles.checkboxContainer}>
              {['1영역', '2영역', '3영역', '4영역'].map((area) => (
                <label key={area} style={commonStyles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="selected_areas"
                    value={area}
                    checked={formData.selected_areas.includes(area)}
                    onChange={handleChange}
                    style={commonStyles.checkbox}
                  />
                  {area}
                </label>
              ))}
            </div>
          </>
        );
      case 5:
        return (
          <>
            <label style={commonStyles.checkboxLabel}>
              <input
                type="checkbox"
                name="include_elective_liberal_arts"
                checked={formData.include_elective_liberal_arts}
                onChange={handleChange}
                style={commonStyles.checkbox}
              />
              소양교양 포함
            </label>
            <label style={commonStyles.checkboxLabel}>
              <input
                type="checkbox"
                name="include_teacher_training"
                checked={formData.include_teacher_training}
                onChange={handleChange}
                style={commonStyles.checkbox}
              />
              교직필수 과목 포함
            </label>
          </>
        );
      default:
        return null;
    }
  };

  // 컴포넌트 렌더링
  return (
    <div style={commonStyles.container}>
      <div style={commonStyles.card}>
        <h2 style={commonStyles.title}>시간표 생성 - 단계 {step}/5</h2>
        {error && <p style={commonStyles.error}>{error}</p>}
        <form onSubmit={handleSubmit}>
          {renderStep()}
          <button type="submit" style={commonStyles.button}>
            {step === 5 ? '생성하기' : '다음'}
          </button>
        </form>
        <Link to="/main" style={commonStyles.link}>
          메인 페이지로 돌아가기
        </Link>
      </div>
    </div>
  );
};

export default TimeTableGenerator;
