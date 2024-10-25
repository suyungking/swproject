import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '../services/api'

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
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
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
  }
}

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('');
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    
    try {
      const response = await signup(formData);
      console.log('Signup response:', response); // 디버깅을 위해 추가
      if (response.message === 'User created successfully') {
        alert('회원가입이 완료되었습니다.');
        navigate('/login');
      } else {
        setError(response.message || '회원가입에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('회원가입에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div style={commonStyles.container}>
      <div style={commonStyles.card}>
        <h2 style={commonStyles.title}>회원가입</h2>
        {error && <p style={commonStyles.error}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="사용자 이름"
            value={formData.username}
            onChange={handleChange}
            style={commonStyles.input}
            required
          />
          <input
            id="email"
            name="email"
            type="email"
            placeholder="이메일"
            value={formData.email}
            onChange={handleChange}
            style={commonStyles.input}
            required
          />
          <input
            id="password"
            name="password"
            type="password"
            placeholder="비밀번호"
            value={formData.password}
            onChange={handleChange}
            style={commonStyles.input}
            required
          />
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="비밀번호 확인"
            value={formData.confirmPassword}
            onChange={handleChange}
            style={commonStyles.input}
            required
          />
          <button type="submit" style={commonStyles.button}>
            가입하기
          </button>
        </form>
        <Link to="/" style={commonStyles.link}>
          로그인 페이지로 돌아가기
        </Link>
      </div>
    </div>
  )
}