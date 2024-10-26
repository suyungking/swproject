import pymysql
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

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

def fetch_user_data(user_id):
    logger.debug(f"사용자 ID {user_id}의 데이터를 가져오는 중")

    # completed_* 필드 없이 사용자 정보를 가져옵니다.
    query = """
    SELECT basic_literacy, core_liberal_arts, basic_science, 
           required_major, elective_major, elective_liberal_arts
    FROM users
    WHERE id = %s
    """
    user_cursor.execute(query, (user_id,))
    user_data = user_cursor.fetchone()
    logger.debug(f"가져온 사용자 데이터: {user_data}")
    return user_data

def fetch_uncompleted_required_courses(major, grade):
    logger.debug(f"전공: {major}, 학년: {grade}의 미이수 필수 과목을 가져오는 중")
    query = "SELECT 전공명, 학년, `주/야`, 과목명, 분반, 이수구분, 학점, 교수명, 시간표, 영역 FROM `2024-1-schedule` WHERE 전공명 = %s AND 이수구분 = '전공필수' AND 학년 = %s"
    university_cursor.execute(query, (major, grade))
    courses = university_cursor.fetchall()
    logger.debug(f"{len(courses)}개의 미이수 필수 과목을 가져옴: {courses}")
    return courses

def fetch_appropriate_electives(major, shift, preferred_days):
    logger.debug(f"전공: {major}, 주/야: {shift}, 선호 요일: {preferred_days}에 맞는 선택 과목을 가져오는 중")
    query = "SELECT 전공명, 학년, `주/야`, 과목명, 분반, 이수구분, 학점, 교수명, 시간표, 영역 FROM `2024-1-schedule` WHERE 전공명 = %s AND 이수구분 = '전공선택' AND `주/야` = %s AND 시간표 IN %s"
    university_cursor.execute(query, (major, shift, tuple(preferred_days)))
    courses = university_cursor.fetchall()
    logger.debug(f"{len(courses)}개의 적절한 선택 과목을 가져옴")
    return courses

def fetch_appropriate_liberal_arts(preferred_days, morning_afternoon, include_night, selected_areas, include_elective_liberal_arts):
    logger.debug(f"선호 요일: {preferred_days}, 오전/오후: {morning_afternoon}, 야간 포함: {include_night}, 선택 영역: {selected_areas}, 소양교양 포함: {include_elective_liberal_arts}에 맞는 교양 과목을 가져오는 중")
    query = """
    SELECT 전공명, `주/야`, 영역, 과목명, 분반, 이수구분, 학점, 교수명, 시간표 
    FROM `2024-1-schedule` 
    WHERE 이수구분 IN ('핵심교양', '소양교양') 
    AND 시간표 IN %s 
    AND 영역 IN %s
    """
    university_cursor.execute(query, (tuple(preferred_days), tuple(selected_areas)))
    courses = university_cursor.fetchall()
    logger.debug(f"{len(courses)}개의 적절한 교양 과목을 가져옴")
    return courses

def fetch_advisory_course():
    logger.debug("상담 과목을 가져오는 중")
    query = "SELECT 전공명, 학년, `주/야`, 과목명, 분반, 이수구분, 학점, 교수명, 시간표, 영역 FROM `2024-1-schedule` WHERE 이수구분 = '비교과' LIMIT 1"
    university_cursor.execute(query)
    course = university_cursor.fetchone()
    logger.debug(f"가져온 상담 과목: {course}")
    return course

def fetch_all_courses():
    logger.debug("모든 과목을 가져오는 중")
    query = "SELECT 전공명, 학년, `주/야`, 과목명, 분반, 이수구분, 학점, 교수명, 시간표, 영역 FROM `2024-1-schedule`"
    university_cursor.execute(query)
    courses = university_cursor.fetchall()
    logger.debug(f"총 {len(courses)}개의 과목을 가져옴")
    return courses
