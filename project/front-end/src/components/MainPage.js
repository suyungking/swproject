import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUserInfo, fetchTimetables } from '../services/api';

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
    marginRight: '20px',
  },
  infoCard: {
    width: '300px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    boxSizing: 'border-box',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '24px',
    color: '#333',
    textAlign: 'center',
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
  secondaryButton: {
    backgroundColor: 'white',
    color: '#333',
    border: '1px solid #333',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px',
  },
  avatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#333',
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: '16px',
    fontSize: '24px',
  },
  userName: {
    margin: '0',
    fontSize: '18px',
    color: '#333',
  },
  userEmail: {
    margin: '4px 0 0',
    color: '#666',
    fontSize: '14px',
  },
  infoTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
  },
};

export default function MainPage() {
  const [userData, setUserData] = useState(null);
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
  
        if (parsedUser.id) {
          Promise.all([
            fetchUserInfo(parsedUser.id),
            fetchTimetables(parsedUser.id)
          ])
            .then(([userInfoData, timetablesData]) => {
              console.log('Fetched user data:', userInfoData); // 기존 로그
              console.log('Fetched timetables:', timetablesData); // 기존 로그
              console.log('User credit info:', { // 추가된 로그
                major: userInfoData.major,
                basic_literacy: userInfoData.basic_literacy,
                core_liberal_arts: userInfoData.core_liberal_arts,
                basic_science: userInfoData.basic_science,
                required_major: userInfoData.required_major,
                elective_major: userInfoData.elective_major,
                graduation_credits: userInfoData.graduation_credits
              });
              setUserData(userInfoData);
              setTimetables(timetablesData);
              setLoading(false);
            })
            .catch(error => {
              console.error('데이터를 가져오는데 실패했습니다:', error);
              setError(`데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
              setLoading(false);
            });
        } else {
          setError('사용자 ID가 없습니다. 다시 로그인해주세요.');
          setLoading(false);
        }
      } catch (error) {
        console.error('사용자 데이터 파싱 오류:', error);
        setError(`사용자 데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
        setLoading(false);
      }
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/', { replace: true });
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (error) {
    return (
      <div>
        <h2>오류 발생</h2>
        <p>{error}</p>
        <p>서버 상태를 확인해 주세요. 문제가 지속되면 관리자에게 문의하세요.</p>
        <button onClick={() => navigate('/')}>로그인 페이지로 돌아가기</button>
      </div>
    );
  }

  if (!userData) {
    return (
      <div>
        <p>사용자 정보를 불러올 수 없습니다.</p>
        <p>서버 상태를 확인해 주세요. 문제가 지속되면 관리자에게 문의하세요.</p>
        <button onClick={() => navigate('/')}>다시 시도</button>
      </div>
    );
  }

  return (
    <div style={commonStyles.container}>
      <div style={commonStyles.card}>
        <div style={commonStyles.userInfo}>
          <div style={commonStyles.avatar}>
            {userData.username ? userData.username[0].toUpperCase() : ''}
          </div>
          <div>
            <h2 style={commonStyles.userName}>{userData.username || '사용자'}</h2>
            <p style={commonStyles.userEmail}>{userData.email || '이메일 없음'}</p>
          </div>
        </div>
        <Link to="/timetable" style={commonStyles.button}>
          내 시간표 보기
        </Link>
        <Link to="/timetable-generator" style={{...commonStyles.button, ...commonStyles.secondaryButton}}>
          새 시간표 생성
        </Link>
        <Link to="/info-input" style={{...commonStyles.button, ...commonStyles.secondaryButton}}>
          정보 입력
        </Link>
        <button
          onClick={handleLogout}
          style={{...commonStyles.button, ...commonStyles.secondaryButton}}
        >
          로그아웃
        </button>
      </div>
      <div>
      <div style={commonStyles.infoCard}>
          <h3 style={commonStyles.infoTitle}>학생 정보</h3>
          <div style={commonStyles.infoItem}>
            <span>전공:</span>
            <span>{userData.major || '정보 없음'}</span>
          </div>
          <div style={commonStyles.infoItem}>
            <span>기초문해교육:</span>
            <span>{userData.basic_literacy || '정보 없음'}</span>
          </div>
          <div style={commonStyles.infoItem}>
            <span>핵심교양:</span>
            <span>{userData.core_liberal_arts || '정보 없음'}</span>
          </div>
          <div style={commonStyles.infoItem}>
            <span>기초과학교육:</span>
            <span>{userData.basic_science || '정보 없음'}</span>
          </div>
          <div style={commonStyles.infoItem}>
            <span>전공필수:</span>
            <span>{userData.required_major || '정보 없음'}</span>
          </div>
          <div style={commonStyles.infoItem}>
            <span>전공선택:</span>
            <span>{userData.elective_major || '정보 없음'}</span>
          </div>
          <div style={commonStyles.infoItem}>
            <span>졸업학점:</span>
            <span>{userData.graduation_credits || '정보 없음'}</span>
          </div>
        </div>
        {timetables.length > 0 && (
          <div style={commonStyles.infoCard}>
            <h3 style={commonStyles.infoTitle}>내 시간표</h3>
            {timetables.map((timetable) => (
              <div key={timetable.id} style={commonStyles.infoItem}>
                <span>{timetable.name}</span>
                <span>{new Date(timetable.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}