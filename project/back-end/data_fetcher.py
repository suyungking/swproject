import pymysql
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from typing import List, Dict, Any

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# 데이터베이스 연결 설정
university_db = pymysql.connect(
    host="localhost",
    user="root",
    password="admin",
    charset="utf8",
    db="university"
)
university_cursor = university_db.cursor(pymysql.cursors.DictCursor)

user_db = pymysql.connect(
    host="localhost",
    user="root",
    password="admin",
    charset="utf8",
    db="user_db"
)
user_cursor = user_db.cursor(pymysql.cursors.DictCursor)

# 사용자 데이터를 user_id로 가져오는 함수
def fetch_user_data(user_id):
    logger.debug(f"사용자 ID {user_id}의 데이터를 가져오는 중")
    query = """
    SELECT id, username, email, major, basic_literacy, core_liberal_arts, basic_science, 
           required_major, elective_major, graduation_credits
    FROM users
    WHERE id = %s
    """
    user_cursor.execute(query, (user_id,))
    user_data = user_cursor.fetchone()
    logger.debug(f"가져온 사용자 데이터: {user_data}")
    return user_data

def parse_timetable(timetable_str: str) -> List[Dict[str, Any]]:
    """시간표 문자열을 파싱하여 리스트로 반환합니다."""
    slots = []
    for slot in timetable_str.split('/'):
        slot = slot.strip()
        day, time = slot.split(')')
        day = day.strip('(')
        start, end = map(float, time.strip().split('~'))
        slots.append({
            'day': day,
            'start': start,
            'end': end
        })
    return slots

def is_time_conflict(slot1: Dict[str, Any], slot2: Dict[str, Any]) -> bool:
    """두 시간대가 충돌하는지 확인합니다."""
    return (slot1['day'] == slot2['day'] and
            ((slot1['start'] <= slot2['start'] < slot1['end']) or
             (slot2['start'] <= slot1['start'] < slot2['end'])))


# 특정 전공에 대한 상담 과목을 가져오는 함수
def fetch_advisory_course(major: str) -> List[Dict[str, Any]]:
    logger.debug(f"{major} 전공의 상담 과목을 가져오는 중")
    query = """
    SELECT 전공명, 학년, `주/야`, 과목명, 분반, 이수구분, 학점, 교수명, 시간표, 영역 
    FROM `2024-1-schedule` 
    WHERE 전공명 = %s 
    AND 이수구분 = '비교과'
    """
    university_cursor.execute(query, (major,))
    courses = university_cursor.fetchall()
    
    logger.debug(f"{len(courses)}개의 상담 과목을 가져옴")
    return courses

def fetch_uncompleted_required_courses(major, grade):
    logger.debug(f"{major} 전공, {grade} 학년의 미이수 필수 과목을 가져오는 중")
    query = """
    SELECT 전공명, 학년, `주/야`, 과목명, 분반, 이수구분, 학점, 교수명, 시간표, 영역
    FROM `2024-1-schedule` 
    WHERE 전공명 = %s 
    AND 이수구분 = '전공필수' 
    AND (학년 = %s OR 학년 = '전학년' OR 학년 LIKE %s)
    """
    grade_param = f"{grade}학년"
    grade_like_param = f"%{grade}%"
    logger.debug(f"실행할 쿼리: {query}")
    logger.debug(f"쿼리 파라미터: major={major}, grade={grade_param}, grade_like={grade_like_param}")
    university_cursor.execute(query, (major, grade_param, grade_like_param))
    courses = university_cursor.fetchall()
    
    logger.debug(f"{len(courses)}개의 미이수 필수 과목을 가져옴")
    logger.debug(f"쿼리 결과: {courses}")
    return list(courses)



# 과목 시간대에 따라 필터링하는 함수
def filter_courses_by_time_and_days(courses: List[Dict[str, Any]], 
                                    morning_afternoon: str, 
                                    include_night: bool, 
                                    preferred_days: List[str]) -> List[Dict[str, Any]]:
    filtered_courses = []
    for course in courses:
        time_slots = parse_timetable(course['시간표'])
        for slot in time_slots:
            if slot['day'] not in preferred_days:
                continue
            start_time = int(slot['start'])
            if (morning_afternoon == 'morning' and 1 <= start_time <= 4) or \
               (morning_afternoon == 'afternoon' and 5 <= start_time <= 8) or \
               (morning_afternoon == 'all' and ((1 <= start_time <= 8) or (include_night and start_time >= 9))) or \
               (morning_afternoon == 'evening' and include_night and start_time >= 9):
                filtered_courses.append(course)
                break
    return filtered_courses

def fetch_appropriate_electives(major, grade):
    logger.debug(f"{major} 전공, {grade} 학년에 맞는 선택 과목을 가져오는 중")
    query = """
    SELECT 전공명, 학년, `주/야`, 과목명, 분반, 이수구분, 학점, 교수명, 시간표, 영역, 트랙이수
    FROM `2024-1-schedule` 
    WHERE 전공명 = %s 
    AND 이수구분 = '전공선택' 
    AND (학년 = %s OR 학년 = '전학년' OR 학년 LIKE %s)
    """
    grade_param = f"{grade}학년"
    grade_like_param = f"%{grade}%"
    logger.debug(f"실행할 쿼리: {query}")
    logger.debug(f"쿼리 파라미터: major={major}, grade={grade_param}, grade_like={grade_like_param}")
    university_cursor.execute(query, (major, grade_param, grade_like_param))
    courses = university_cursor.fetchall()
    
    logger.debug(f"{len(courses)}개의 선택 과목을 가져옴")
    logger.debug(f"쿼리 결과: {courses}")
    return list(courses)


def fetch_appropriate_liberal_arts(
    selected_areas: List[str],
    include_elective_liberal_arts: bool,
    preferred_days: List[str],
    morning_afternoon: str,
    include_night: bool
) -> List[Dict[str, Any]]:
    logger.debug(f"선택 영역: {selected_areas}, 소양교양 포함: {include_elective_liberal_arts}, "
                 f"선호 요일: {preferred_days}, 시간대: {morning_afternoon}, 야간 포함: {include_night}에 맞는 교양 과목을 가져오는 중")
    
    query = """
    SELECT 전공명, 학년, `주/야`, 과목명, 분반, 이수구분, 학점, 교수명, 시간표, 영역 
    FROM `2024-1-schedule` 
    WHERE (이수구분 = '핵심교양' OR 이수구분 = '기초교양' OR (이수구분 = '소양교양' AND %s)) 
    AND 영역 IN %s
    """
    
    # 선호 요일에 따른 필터링
    if preferred_days:
        day_conditions = " OR ".join([f"시간표 LIKE %s" for _ in preferred_days])
        query += f" AND ({day_conditions})"
    
    # 시간대에 따른 필터링
    time_conditions = []
    if morning_afternoon == 'morning':
        time_conditions.append("CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(시간표, '~', 1), ' ', -1) AS UNSIGNED) < 12")
    elif morning_afternoon == 'afternoon':
        time_conditions.append("CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(시간표, '~', 1), ' ', -1) AS UNSIGNED) >= 12")
        time_conditions.append("CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(시간표, '~', 1), ' ', -1) AS UNSIGNED) < 18")
    
    if not include_night:
        time_conditions.append("CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(시간표, '~', 1), ' ', -1) AS UNSIGNED) < 18")
    
    if time_conditions:
        query += " AND " + " AND ".join(time_conditions)
    
    params = [include_elective_liberal_arts, tuple(selected_areas)]
    params.extend([f"%{day}%" for day in preferred_days])
    
    university_cursor.execute(query, tuple(params))
    courses = university_cursor.fetchall()
    
    logger.debug(f"{len(courses)}개의 교양 과목을 가져옴")
    return courses

# 모든 과목을 가져오는 함수
def fetch_all_courses() -> List[Dict[str, Any]]:
    logger.debug("모든 과목을 가져오는 중")
    query = """
    SELECT 전공명, 학년, `주/야`, 과목명, 분반, 이수구분, 학점, 교수명, 시간표, 영역 
    FROM `2024-1-schedule`
    """
    university_cursor.execute(query)
    courses = university_cursor.fetchall()
    
    logger.debug(f"총 {len(courses)}개의 과목을 가져옴")
    return courses
if __name__ == "__main__":
    app.run(port=5000)
