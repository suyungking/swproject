const API_BASE_URL = 'http://localhost:5000/api';

export const fetchCreditInfo = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/user-credits/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const creditData = await response.json();
    return creditData;
  } catch (error) {
    console.error('사용자 학점 정보를 가져오는 중 오류 발생:', error);
    throw new Error('사용자 학점 정보를 가져오는데 실패했습니다. 서버 응답을 확인해주세요.');
  }
};

export const fetchUserInfo = async (userId) => {
  try {
    const response = await fetch(`http://localhost:5000/api/user/${userId}`);
    if (!response.ok) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    throw error;
  }
};

export const updateCreditInfo = async (userId, creditInfo) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(creditInfo),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || '사용자 정보 업데이트에 실패했습니다' };
    }
    return { success: true, message: '사용자 정보가 성공적으로 업데이트되었습니다' };
  } catch (error) {
    console.error('사용자 정보 업데이트 중 오류 발생:', error);
    return { success: false, message: '서버 오류가 발생했습니다' };
  }
};

export const fetchTimetables = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/timetables/${userId}`);
    if (!response.ok) {
      throw new Error('시간표를 가져오는데 실패했습니다');
    }
    const data = await response.json();
    console.log('Fetched timetables:', data);
    return data;
  } catch (error) {
    console.error('시간표를 가져오는 중 오류 발생:', error);
    throw error;
  }
};

export const login = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '로그인에 실패했습니다');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('로그인 오류:', error);
    throw error;
  }
};

export const signup = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '회원가입에 실패했습니다');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('회원가입 오류:', error);
    throw error;
  }
};

export const generateTimetable = async (timetableData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-timetable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(timetableData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '시간표 생성에 실패했습니다');
    }
    return await response.json();
  } catch (error) {
    console.error('시간표 생성 오류:', error);
    throw error;
  }
};

export const saveTimetable = async (userId, timetable) => {
  try {
    const response = await fetch(`${API_BASE_URL}/save-timetable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, timetable }),
    });
    if (!response.ok) {
      throw new Error('시간표 저장에 실패했습니다');
    }
    return await response.json();
  } catch (error) {
    console.error('시간표 저장 중 오류 발생:', error);
    throw error;
  }
};

export const loadTimetable = async (timetableId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/timetable/${timetableId}`);
    if (!response.ok) {
      throw new Error('시간표를 불러오는데 실패했습니다');
    }
    return await response.json();
  } catch (error) {
    console.error('시간표를 불러오는 중 오류 발생:', error);
    throw error;
  }
};
