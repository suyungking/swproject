import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/api';

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
    transition: 'border-color 0.3s',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#333',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    boxSizing: 'border-box',
  },
  link: {
    display: 'block',
    width: '100%',
    padding: '12px',
    backgroundColor: 'white',
    color: '#333',
    border: '1px solid #333',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'none',
    marginTop: '16px',
    transition: 'background-color 0.3s, color 0.3s',
    boxSizing: 'border-box',
  },
  error: {
    color: 'red',
    marginBottom: '16px',
    fontSize: '14px',
  },
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userData = await login(email, password);
      console.log('Login response:', userData);
      if (userData.id || userData.userId) {
        localStorage.setItem('user', JSON.stringify({
          ...userData,
          id: userData.id || userData.userId
        }));
        navigate('/main');
      } else {
        throw new Error('서버 응답에 사용자 ID가 없습니다.');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      setError(error.message || '로그인에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  return (
    <div style={commonStyles.container}>
      <div style={commonStyles.card}>
        <h2 style={commonStyles.title}>로그인</h2>
        <form onSubmit={handleSubmit}>
          <input
            style={commonStyles.input}
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={commonStyles.input}
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button style={commonStyles.button} type="submit">로그인</button>
          {error && <p style={commonStyles.error}>{error}</p>}
        </form>
        <Link to="/signup" style={commonStyles.link}>
          회원가입
        </Link>
      </div>
    </div>
  );
}