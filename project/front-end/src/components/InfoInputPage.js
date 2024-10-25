import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateCreditInfo } from '../services/api';

const commonStyles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: 'Arial, sans-serif',
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
  button: {
    width: '48%',
    padding: '12px',
    backgroundColor: '#333',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  error: {
    color: 'red',
    marginBottom: '16px',
    fontSize: '14px',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '16px',
  },
  secondaryButton: {
    width: '48%',
    padding: '12px',
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
  },
};

const majors = [
  "문예창작미디어콘텐츠홍보전공", "영미언어문화전공", "행정학전공", "법학전공", "경영학전공",
  "웰니스산업융합학부", "의류산업학전공", "아동가족복지학전공", "식품영양학전공", "스포츠과학전공",
  "식물생경환경전공", "조경학전공", "동물생명과학전공", "동물응용과학전공", "원예생명공학전공",
  "응용생명공학전공", "토목공학전공", "환경공학전공", "지역자원시스템공학전공", "안전공학전공",
  "식품생명공학전공", "화학공학전공", "소프트웨어&서비스컴퓨팅전공", "소프트웨어융합전공", "응용수학전공",
  "ICT로봇공학전공", "기계공학전공", "전자공학전공", "전기공학전공", "시각미디어디자인전공",
  "건축학전공", "건축공학전공", "융합레포츠전공", "스마트헬스케어융합전공", "AI빅데이터융합전공",
  "레저스포츠매니지먼트전공", "노동복지전공", "반도체융합전공", "스마트에그리푸드시스템전공", "반도체공학과",
  "글로벌경영전공"
];

export default function InfoInputPage() {
  const [user, setUser] = useState(null);
  const [creditInfo, setCreditInfo] = useState({
    major: '',
    basic_literacy: '',
    core_liberal_arts: '',
    basic_science: '',
    required_major: '',
    elective_major: '',
    graduation_credits: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('사용자 데이터 파싱 오류:', error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCreditInfo(prevInfo => ({
      ...prevInfo,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 입력값 검증
    const numericFields = ['basic_literacy', 'core_liberal_arts', 'basic_science', 'required_major', 'elective_major', 'graduation_credits'];
    const invalidFields = numericFields.filter(field => isNaN(Number(creditInfo[field])) || creditInfo[field] === '');

    if (invalidFields.length > 0) {
      setError('모든 학점 필드에 유효한 숫자를 입력해주세요.');
      return;
    }

    try {
      const result = await updateCreditInfo(user.id, creditInfo);
      if (result.success) {
        alert('정보가 성공적으로 저장되었습니다.');
        navigate('/main');
      } else {
        setError(result.message || '정보 저장에 실패했습니다. 나중에 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('정보 저장 오류:', error);
      setError('서버 오류가 발생했습니다. 나중에 다시 시도해주세요.');
    }
  };

  if (!user) {
    return <div style={commonStyles.container}>로딩 중...</div>;
  }

  return (
    <div style={commonStyles.container}>
      <div style={commonStyles.card}>
        <h2 style={commonStyles.title}>정보 입력</h2>
        {error && <p style={commonStyles.error}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <select
            name="major"
            value={creditInfo.major}
            onChange={handleChange}
            style={commonStyles.input}
            required
          >
            <option value="">전공을 선택하세요</option>
            {majors.map((major, index) => (
              <option key={index} value={major}>{major}</option>
            ))}
          </select>
          <input
            type="number"
            name="basic_literacy"
            placeholder="기초문해교육 학점"
            value={creditInfo.basic_literacy}
            onChange={handleChange}
            style={commonStyles.input}
            required
            min="0"
          />
          <input
            type="number"
            name="core_liberal_arts"
            placeholder="핵심교양 학점"
            value={creditInfo.core_liberal_arts}
            onChange={handleChange}
            style={commonStyles.input}
            required
            min="0"
          />
          <input
            type="number"
            name="basic_science"
            placeholder="기초과학교육 학점"
            value={creditInfo.basic_science}
            onChange={handleChange}
            style={commonStyles.input}
            required
            min="0"
          />
          <input
            type="number"
            name="required_major"
            placeholder="전공필수 학점"
            value={creditInfo.required_major}
            onChange={handleChange}
            style={commonStyles.input}
            required
            min="0"
          />
          <input
            type="number"
            name="elective_major"
            placeholder="전공선택 학점"
            value={creditInfo.elective_major}
            onChange={handleChange}
            style={commonStyles.input}
            required
            min="0"
          />
          <input
            type="number"
            name="graduation_credits"
            placeholder="졸업학점"
            value={creditInfo.graduation_credits}
            onChange={handleChange}
            style={commonStyles.input}
            required
            min="0"
          />
          <div style={commonStyles.buttonContainer}>
            <button type="submit" style={commonStyles.button}>
              정보 저장
            </button>
            <button
              type="button"
              style={commonStyles.secondaryButton}
              onClick={() => navigate('/main')}
            >
              메인으로 돌아가기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}