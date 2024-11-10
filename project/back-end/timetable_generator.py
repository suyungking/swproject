from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta
import difflib
from data_fetcher import (
    fetch_user_data,
    fetch_advisory_course,
    fetch_uncompleted_required_courses,
    fetch_appropriate_electives,
    fetch_appropriate_liberal_arts,
    fetch_all_courses
)
import random

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def convert_class_period_to_time(period):
    # 수업 교시를 시간으로 변환하는 함수
    period_to_time = {
        1: ('09:00', '09:50'),
        2: ('10:00', '10:50'),
        3: ('11:00', '11:50'),
        4: ('12:00', '12:50'),
        5: ('13:00', '13:50'),
        6: ('14:00', '14:50'),
        7: ('15:00', '15:50'),
        8: ('16:00', '16:50'),
        9: ('17:00', '17:50'),
        10: ('18:00', '18:45'),
        11: ('18:45', '19:30'),
        12: ('19:35', '20:20'),
        13: ('20:20', '21:05'),
        14: ('21:10', '21:55'),
        15: ('21:55', '22:40')
    }
    return period_to_time.get(period, ('00:00', '00:00'))

def parse_timetable(timetable):
    # 시간표 문자열을 파싱하여 슬롯 리스트로 변환하는 함수
    slots = []
    for slot in timetable.split(' / '):
        day, time = slot.split(') ')
        day = day[1:]  # 여는 괄호 제거
        start, end = map(float, time.split('~'))
        start_time, _ = convert_class_period_to_time(int(start))
        _, end_time = convert_class_period_to_time(int(end))
        slots.append({
            'day': day,
            'start': start_time,
            'end': end_time
        })
    return slots

def format_timetable_slot(day, start, end):
    # 시간표 슬롯을 포맷팅하는 함수
    start_hour, start_minute = divmod(int(start), 60)
    end_hour, end_minute = divmod(int(end), 60)
    start_time = f"{start_hour:02d}:{start_minute:02d}"
    end_time = f"{end_hour:02d}:{end_minute:02d}"
    return f"{day} {start_time}~{end_time}"

def period_to_time(period):
    # 교시를 시간으로 변환하는 함수
    hour = 9 + (period - 1) // 2
    minute = 0 if (period - 1) % 2 == 0 else 30
    return hour + minute / 60

def is_time_conflict(timetable, new_course):
    # 시간 충돌을 확인하는 함수
    if isinstance(new_course, str):
        new_course_times = parse_time(new_course)
    elif isinstance(new_course, dict):
        new_course_times = parse_time(new_course['시간표'])
    else:
        logger.error(f"Unexpected type for new_course: {type(new_course)}")
        return False

    for course in timetable:
        existing_times = parse_time(course['시간표'])
        for new_time in new_course_times:
            for existing_time in existing_times:
                if new_time.overlaps(existing_time):
                    return True
    return False

def parse_time(time_str):
    # 시간 문자열을 파싱하는 함수
    times = []
    for time_slot in time_str.split('/'):
        day, time_range = time_slot.strip().strip('()').split()
        start, end = map(lambda x: int(float(x) * 60), time_range.split('~'))
        times.append(TimeSlot(day, start, end))
    return times

class TimeSlot:
    # 시간 슬롯을 나타내는 클래스
    def __init__(self, day, start, end):
        self.day = day
        self.start = start  # 자정 이후 경과 분
        self.end = end  # 자정 이후 경과 분

    def overlaps(self, other):
        return self.day == other.day and max(self.start, other.start) < min(self.end, other.end)
    
def convert_time_to_minutes(time_str):
    # 시간 문자열을 분으로 변환하는 함수
    hours, minutes = map(int, time_str.split(':'))
    return hours * 60 + minutes

def calculate_remaining_credits(user_data, completed_credits, generated_credits):
    # 남은 학점을 계산하는 함수
    total_required = (
        user_data['basic_literacy'] +
        user_data['core_liberal_arts'] +
        user_data['basic_science'] +
        user_data['required_major'] +
        user_data['elective_major']
    )
    
    remaining_credits = {
        "basic_liberal_arts": {
            "total": max(0, user_data['basic_literacy'] + user_data['basic_science'] - 
                     (completed_credits.get('completed_basic_literacy', 0) + 
                      completed_credits.get('completed_basic_science', 0) +
                      generated_credits.get('basic_literacy', 0) +
                      generated_credits.get('basic_science', 0))),
            "basic_literacy": max(0, user_data['basic_literacy'] - 
                                  (completed_credits.get('completed_basic_literacy', 0) +
                                   generated_credits.get('basic_literacy', 0))),
            "basic_science": max(0, user_data['basic_science'] - 
                                 (completed_credits.get('completed_basic_science', 0) +
                                  generated_credits.get('basic_science', 0)))
        },
        "core_liberal_arts": max(0, user_data['core_liberal_arts'] - 
                                 (completed_credits.get('completed_core_liberal_arts', 0) +
                                  generated_credits.get('core_liberal_arts', 0))),
        "required_major": max(0, user_data['required_major'] - 
                              (completed_credits.get('completed_required_major', 0) +
                               generated_credits.get('required_major', 0))),
        "elective_major": max(0, user_data['elective_major'] - 
                              (completed_credits.get('completed_elective_major', 0) +
                               generated_credits.get('elective_major', 0))),
        "undefined": max(0, user_data['graduation_credits'] - total_required - 
                         (completed_credits.get('completed_elective_liberal_arts', 0) +
                          completed_credits.get('completed_other', 0) +
                          generated_credits.get('undefined', 0)))
    }
    
    return remaining_credits

def calculate_course_priority(course, grade, remaining_credits, morning_afternoon, include_night, preferred_days):
    # 과목의 우선순위를 계산하는 함수
    priority = 0
    
    if course['이수구분'] == '비교과':
        return float('inf')

    # 과목 유형에 따른 우선순위 부여
    if course['이수구분'] == '전공필수' and course.get('트랙이수') == '트랙필수':
        priority += 1500
    elif (course['이수구분'] == '전공선택' and course.get('트랙이수') == '트랙필수') or \
         (course['이수구분'] == '전공필수' and course.get('트랙이수') != '트랙필수'):
        priority += 1300
    elif course['이수구분'] == '전공선택' and course.get('트랙이수') != '트랙필수':
        priority += 1000
    elif course['이수구분'] == '핵심교양':
        priority += 400
    elif course['이수구분'] == '기초교양':
        if course['영역'] == '기초문해교육':
            priority += 250  # 기초문해교육의 우선순위를 높임
        elif course['영역'] == '기초과학교육':
            priority += 250  # 기초과학교육의 우선순위를 높임
        else:
            priority += 150  # 다른 기초교양 과목의 우선순위도 높임

    # 학년에 따른 우선순위 조정 (기초교양 과목에 대해 저학년 우선)
    if course['이수구분'] == '기초교양':
        if grade <= 2:  # 1, 2학년
            priority += 200
        elif grade == 3:
            priority += 100
    else:
        if course['학년'] == f"{grade}학년":
            priority += 100
        elif course['학년'] == '전학년':
            priority += 50

    # 남은 학점에 따른 고정 우선순위 부여
    course_type = course['이수구분']
    if course_type == '전공선택' and remaining_credits['elective_major'] > 0:
        priority += 40
    elif course_type == '핵심교양' and remaining_credits['core_liberal_arts'] > 0:
        priority += 30
    elif course_type == '기초교양':
        if course['영역'] == '기초문해교육' and remaining_credits['basic_liberal_arts']['basic_literacy'] > 0:
            priority += 50
        elif course['영역'] == '기초과학교육' and remaining_credits['basic_liberal_arts']['basic_science'] > 0:
            priority += 50
        elif remaining_credits['basic_liberal_arts']['total'] > 0:
            priority += 40
    elif remaining_credits['undefined'] > 0:
        priority += 20
    
    # 이수구분에 따른 가중치
    if course['이수구분'] == '전공선택':
        priority += 150
    elif course['이수구분'] == '핵심교양':
        priority += 100
    elif course['이수구분'] == '소양교양':
        priority += 50
    elif course['이수구분'] == '기초교양':
        priority += 150
    
    # 시간대에 따른 가중치
    time_slots = parse_timetable(course['시간표'])
    for slot in time_slots:
        day = slot['day']
        start_time = slot['start']
        start_hour = int(start_time.split(':')[0])
        if day in preferred_days:
            priority += 20
        if morning_afternoon == 'morning' and start_hour < 12:
            priority += 15
        elif morning_afternoon == 'afternoon' and 12 <= start_hour < 18:
            priority += 15
        elif morning_afternoon == 'evening' and start_hour >= 18 and include_night:
            priority += 15
        elif morning_afternoon == 'all':
            if start_hour < 18:
                priority += 10
            elif start_hour >= 18 and include_night:
                priority += 5
    
    # 학점에 따른 가중치
    priority += int(course['학점']) * 10
    
    return priority

def is_valid_course(course: Dict[str, Any], user_major: str) -> bool:
    # 과목이 유효한지 확인하는 함수
    # 교양 과목은 항상 유효
    if course['이수구분'] in ['기초교양', '핵심교양', '소양교양']:
        return True
    
    # 사용자의 전공 과목이면 유효
    if course['전공명'] == user_major:
        return True
    
    # 그 외의 경우는 유효하지 않음
    return False

def resolve_schedule_conflicts(timetable, grade, remaining_credits, include_teacher_training, morning_afternoon, include_night, preferred_days):
    # 시간표 충돌을 해결하는 함수
    resolved_timetable = []
    for course in timetable:
        if not is_time_conflict(resolved_timetable, course):
            resolved_timetable.append(course)
        else:
            # 충돌이 발생한 경우, 우선순위가 더 높은 과목을 선택
            course_priority = calculate_course_priority(
                course,
                grade,
                remaining_credits,
                morning_afternoon,
                include_night,
                preferred_days
            )
            conflicting_courses = [c for c in resolved_timetable if is_time_conflict([c], course)]
            for conflicting_course in conflicting_courses:
                conflicting_priority = calculate_course_priority(
                    conflicting_course,
                    grade,
                    remaining_credits,
                    morning_afternoon,
                    include_night,
                    preferred_days
                )
                if course_priority > conflicting_priority:
                    resolved_timetable.remove(conflicting_course)
                    resolved_timetable.append(course)
                    break

    return resolved_timetable

def calculate_course_similarity(course1, course2):
    # 두 과목 간의 유사도를 계산하는 함수
    similarity = 0
    if course1['이수구분'] == course2['이수구분']:
        similarity += 3
    if course1['학점'] == course2['학점']:
        similarity += 2
    if course1['전공명'] == course2['전공명']:
        similarity += 2
    if course1.get('영역') == course2.get('영역'):
        similarity += 2
    
    # 과목명 유사도 계산
    name_similarity = difflib.SequenceMatcher(None, course1['과목명'], course2['과목명']).ratio()
    similarity += name_similarity * 3
    
    return similarity

def find_similar_courses(course, all_courses, num_suggestions=3):
    # 유사한 과목을 찾는 함수
    logger.debug(f"{course['과목명']}과 유사한 과목을 찾는 중")
    course_name = course['과목명']
    similar_course_names = difflib.get_close_matches(course_name, [c['과목명'] for c in all_courses], n=num_suggestions, cutoff=0.6)
    similar_courses = [c for c in all_courses if c['과목명'] in similar_course_names and c['과목명'] != course_name]
    logger.debug(f"{len(similar_courses)}개의 유사한 과목을 찾음")
    return similar_courses

def find_alternative_courses(course, all_courses, final_timetable, user_major, max_alternatives=6):
    # 대체 과목을 찾는 함수
    alternatives = []
    for alt_course in all_courses:
        if alt_course not in final_timetable and alt_course['과목명'] != course['과목명']:
            if (alt_course['전공명'] == user_major and course['전공명'] == user_major) or \
               (alt_course['이수구분'] == course['이수구분'] and alt_course['이수구분'] in ['기초교양', '핵심교양']):
                if not is_time_conflict(final_timetable, alt_course):
                    alternatives.append(alt_course)
    
    # 유사도에 따라 대체 과목 정렬
    alternatives.sort(key=lambda x: calculate_course_similarity(course, x), reverse=True)
    
    # 최대 max_alternatives개까지만 반환
    return alternatives[:max_alternatives]

def is_course_in_preferred_time(course, morning_afternoon, include_night):
    # 과목이 선호하는 시간대에 있는지 확인하는 함수
    course_times = course['시간표'].split('/')
    for time_slot in course_times:
        time = time_slot.split(' ')[1].split('~')[0]
        hour = int(time.split(':')[0])
        
        if morning_afternoon == 'morning' and 9 <= hour < 12:
            return True
        elif morning_afternoon == 'afternoon' and 12 <= hour < 18:
            return True
        elif morning_afternoon == 'evening' and hour >= 18:
            return include_night
        elif morning_afternoon == 'all':
            if hour < 18 or (hour >= 18 and include_night):
                return True
    
    return False

def evaluate_timetable(timetable, total_credits, average_priority, preferred_days, morning_afternoon, include_night):
    # 시간표를 평가하는 함수
    score = 0
    
    if total_credits >= 15 and total_credits <= 18:
        score += 100
    elif total_credits >= 12:
        score += 50
    
    score += average_priority * 10
    
    course_types = set(course['이수구분'] for course in timetable)
    score += len(course_types) * 20
    
    if any(course.get('트랙이수') == '트랙필수' for course in timetable):
        score += 50
    
    days_with_classes = set()
    for course in timetable:
        time_slots = course['시간표'].split('/')
        for slot in time_slots:
            day = slot.strip().split()[0].strip('()')
            days_with_classes.add(day)
    score += len(days_with_classes) * 10

    # 선호 요일 및 시간대에 대한 평가
    for course in timetable:
        time_slots = course['시간표'].split('/')
        for slot in time_slots:
            parts = slot.strip().split()
            if len(parts) >= 2:
                day = parts[0].strip('()')
                time_range = parts[1].split('~')
                if len(time_range) >= 1:
                    start_time = time_range[0]
                    start_hour = int(start_time.split(':')[0]) if ':' in start_time else int(float(start_time))

                    if day in preferred_days:
                        score += 20

                    if morning_afternoon == 'morning' and start_hour < 12:
                        score += 15
                    elif morning_afternoon == 'afternoon' and 12 <= start_hour < 18:
                        score += 15
                    elif morning_afternoon == 'evening' and start_hour >= 18 and include_night:
                        score += 15
                    elif morning_afternoon == 'all':
                        if start_hour < 18:
                            score += 10
                        elif start_hour >= 18 and include_night:
                            score += 5
    
    return score

def generate_initial_timetable(all_courses: List[Dict[str, Any]], grade: int, remaining_credits: Dict[str, Any], max_credits: int, preferred_days: List[str], morning_afternoon: str, include_night: bool, user_major: str) -> tuple:
    # 초기 시간표를 생성하는 함수
    logger.debug("초기 시간표를 생성하는 중")
    
    if not all_courses:
        logger.warning("과목 목록이 비어 있습니다.")
        return [], 0, 0
    
    initial_timetable = []
    current_credits = 0
    total_priority = 0
    selected_course_names = set()  # 이미 선택된 과목명을 저장하는 집합
    selected_core_liberal_arts_areas = set()  # 이미 선택된 핵심교양 영역을 저장하는 집합

    def add_course(course, priority):
        nonlocal current_credits, total_priority, remaining_credits
        
        # 과목 중복 검사: 이미 선택된 과목이면 추가하지 않음
        if course['과목명'] in selected_course_names:
            logger.debug(f"중복 과목 무시됨: {course['과목명']}")
            return False
        
        initial_timetable.append(course)
        course_credits = int(course['학점'])
        if course['이수구분'] != '비교과':  # 비교과 과목이 아닌 경우에만 학점 추가
            current_credits += course_credits
        total_priority += priority
        selected_course_names.add(course['과목명'])
        
        if course['이수구분'] == '핵심교양':
            selected_core_liberal_arts_areas.add(course['영역'])
        
        # 남은 학점 업데이트
        if course['이수구분'] == '전공필수':
            remaining_credits['required_major'] = max(0, remaining_credits['required_major'] - course_credits)
        elif course['이수구분'] == '전공선택':
            remaining_credits['elective_major'] = max(0, remaining_credits['elective_major'] - course_credits)
        elif course['이수구분'] == '핵심교양':
            remaining_credits['core_liberal_arts'] = max(0, remaining_credits['core_liberal_arts'] - course_credits)
        elif course['이수구분'] == '기초교양':
            if course['영역'] == '기초문해교육':
                remaining_credits['basic_liberal_arts']['basic_literacy'] = max(0, remaining_credits['basic_liberal_arts']['basic_literacy'] - course_credits)
            elif course['영역'] == '기초과학교육':
                remaining_credits['basic_liberal_arts']['basic_science'] = max(0, remaining_credits['basic_liberal_arts']['basic_science'] - course_credits)
            remaining_credits['basic_liberal_arts']['total'] = max(0, remaining_credits['basic_liberal_arts']['total'] - course_credits)
        else:
            remaining_credits['undefined'] = max(0, remaining_credits['undefined'] - course_credits)
        
        logger.debug(f"과목 추가됨: {course['과목명']}")
        return True

    # 모든 과목에 대해 우선순위 계산
    all_prioritized_courses = [(course, calculate_course_priority(course, grade, remaining_credits, morning_afternoon, include_night, preferred_days)) 
                               for course in all_courses if is_valid_course(course, user_major)]
    
    # 우선순위에 따라 정렬
    all_prioritized_courses.sort(key=lambda x: x[1], reverse=True)

     # 수정된 과목 추가 로직
    for course, priority in all_prioritized_courses:
        # 최대 학점에 도달하면 반복 종료
        if current_credits >= max_credits:
            break

        # 시간표 형식 확인 및 변환
        if '시간표' in course and isinstance(course['시간표'], str):
            course_time = course['시간표']
        else:
            logger.warning(f"과목 {course['과목명']}의 시간표 형식이 올바르지 않습니다.")
            continue

        # 시간 충돌 확인
        if is_time_conflict(initial_timetable, course_time):
            continue

        # 중복 과목 확인
        if course['과목명'] in selected_course_names:
            continue

        # 핵심교양 영역 중복 확인
        if course['이수구분'] == '핵심교양' and course['영역'] in selected_core_liberal_arts_areas:
            continue

        # 과목 추가 (비교과 과목은 학점 제한에 상관없이 추가)
        if current_credits + int(course['학점']) <= max_credits or course['이수구분'] == '비교과':
            add_course(course, priority)

    average_priority = total_priority / len(initial_timetable) if initial_timetable else 0
    
    logger.debug(f"초기 시간표 생성 완료: {len(initial_timetable)}개 과목, 총 {current_credits}학점, 평균 우선순위: {average_priority:.2f}")
    return initial_timetable, current_credits, average_priority
    

def generate_timetable(user_id, dynamic_data):
    # 시간표를 생성하는 메인 함수
    logger.debug(f"사용자 {user_id}의 시간표 생성 시작")
    logger.debug(f"동적 데이터: {dynamic_data}")
    
    user_data = fetch_user_data(user_id)
    if not user_data:
        return {"error": "사용자를 찾을 수 없습니다."}, 404

    max_credits = dynamic_data.get('max_credits', 21)
    preferred_days = dynamic_data.get('preferred_days', ['월', '화', '수', '목', '금'])
    morning_afternoon = dynamic_data.get('morning_afternoon', 'all')
    include_night = dynamic_data.get('include_night', False)
    selected_areas = dynamic_data.get('selected_areas', ['1영역', '2영역', '3영역', '4영역'])
    include_elective_liberal_arts = dynamic_data.get('include_elective_liberal_arts', False)
    include_teacher_training = dynamic_data.get('include_teacher_training', False)
    grade = dynamic_data.get('grade')
    if grade is None:
        return {"error": "학년 정보가 제공되지 않았습니다."}, 400
    include_advisory = dynamic_data['include_advisory']

    completed_credits = dynamic_data.get('completed_credits', {})
    remaining_credits = calculate_remaining_credits(user_data, completed_credits, {})
    logger.debug(f"초기 남은 학점: {remaining_credits}")

    # 과목 데이터 가져오기
    advisory_course = fetch_advisory_course(user_data['major']) if include_advisory else []
    required_courses = fetch_uncompleted_required_courses(user_data['major'], grade)
    elective_courses = fetch_appropriate_electives(user_data['major'], grade)
    liberal_arts_courses = fetch_appropriate_liberal_arts(
        selected_areas,
        include_elective_liberal_arts,
        preferred_days,
        morning_afternoon,
        include_night
    )
    
    # 트랙필수 과목 필터링 및 처리
    track_required_courses = [course for course in elective_courses if course.get('트랙이수') == '트랙필수']
    required_courses += track_required_courses
    elective_courses = [course for course in elective_courses if course.get('트랙이수') != '트랙필수']

    logger.debug(f"상담 과목: {advisory_course}")
    logger.debug(f"필수 과목: {required_courses}")
    logger.debug(f"선택 과목: {elective_courses}")
    logger.debug(f"교양 과목: {liberal_arts_courses}")
    
    all_courses = required_courses + elective_courses + liberal_arts_courses + advisory_course
    logger.debug(f"총 {len(all_courses)}개의 과목을 가져옴")
    
    best_timetable = None
    best_score = 0
    best_remaining_credits = None
    attempts = 30  # 시도 횟수 증가

    for attempt in range(attempts):
        logger.debug(f"시도 {attempt + 1}/{attempts}")
        initial_timetable, total_credits, average_priority = generate_initial_timetable(
            all_courses, grade, remaining_credits, max_credits, preferred_days, morning_afternoon, include_night, user_data['major']
        )
        
        # 생성된 시간표의 학점 계산 (비교과 과목 제외)
        generated_credits = {
            'basic_literacy': sum(int(course['학점']) for course in initial_timetable if course['이수구분'] == '기초교양' and course['영역'] == '기초문해교육'),
            'basic_science': sum(int(course['학점']) for course in initial_timetable if course['이수구분'] == '기초교양' and course['영역'] == '기초과학교육'),
            'core_liberal_arts': sum(int(course['학점']) for course in initial_timetable if course['이수구분'] == '핵심교양'),
            'required_major': sum(int(course['학점']) for course in initial_timetable if course['이수구분'] == '전공필수'),
            'elective_major': sum(int(course['학점']) for course in initial_timetable if course['이수구분'] == '전공선택'),
            'undefined': sum(int(course['학점']) for course in initial_timetable if course['이수구분'] not in ['기초교양', '핵심교양', '전공필수', '전공선택', '비교과'])
        }
        
        # 총 학점 계산 (비교과 과목 제외)
        total_credits = sum(int(course['학점']) for course in initial_timetable if course['이수구분'] != '비교과')
        
        # 남은 학점 재계산
        current_remaining_credits = calculate_remaining_credits(user_data, completed_credits, generated_credits)
        
        # 시간표 평가
        score = evaluate_timetable(initial_timetable, total_credits, average_priority, preferred_days, morning_afternoon, include_night)
        
        logger.debug(f"시도 {attempt + 1} 결과: 총 학점 {total_credits}, 점수 {score}")
        
        if score > best_score or (score == best_score and total_credits > sum(int(course['학점']) for course in best_timetable or [])):
            best_timetable = initial_timetable
            best_score = score
            best_remaining_credits = current_remaining_credits

    if not best_timetable:
        logger.warning("시간표 생성에 실패했습니다.")
        return {"error": "시간표 생성에 실패했습니다."}

    final_timetable = best_timetable
    total_credits = sum(int(course['학점']) for course in final_timetable if course['이수구분'] != '비교과')

     # 최대 학점에 도달하지 못한 경우 추가 과목 탐색 및 추가
    if total_credits < max_credits:
        logger.warning(f"최대 학점({max_credits})에 도달하지 못했습니다. 현재 총 학점: {total_credits}")
        # 추가 가능한 과목 찾기
        additional_courses = [
            course for course in all_courses 
            if course not in final_timetable 
            and int(course['학점']) <= max_credits - total_credits
            and not is_time_conflict(final_timetable, course)
        ]
        # 학점이 높은 순으로 정렬
        additional_courses.sort(key=lambda x: int(x['학점']), reverse=True)
        
        # 추가 과목 탐색 및 추가
        for course in additional_courses:
            if total_credits + int(course['학점']) <= max_credits:
                final_timetable.append(course)
                total_credits += int(course['학점'])
                logger.info(f"추가 과목 추가됨: {course['과목명']} ({course['학점']}학점)")
                if total_credits == max_credits:
                    break
        
        # 추가 과목 탐색 결과 로깅
        if additional_courses and total_credits < max_credits:
            logger.info(f"추가 가능한 과목이 있지만 최대 학점에 도달하지 못했습니다. 현재 총 학점: {total_credits}")
        elif not additional_courses:
            logger.info("추가 가능한 과목이 없습니다.")

    ## 대체 과목 찾기
    all_courses = fetch_all_courses()
    alternative_courses = {}
    for course in final_timetable:
        if course['이수구분'] in ['기초교양', '핵심교양']:  # 교양 과목에 대해서만 대체 과목 찾기
            alternatives = find_alternative_courses(course, all_courses, final_timetable, user_data['major'])
            if alternatives:
                alternative_courses[course['과목명']] = [
                    {
                        "name": alt['과목명'],
                        "time_slots": alt['시간표'],  # 원래 형식 그대로 유지
                        "professor": alt['교수명'],
                        "credits": alt['학점'],
                        "course_type": alt['이수구분'],
                        "track_required": alt.get('트랙이수') == '트랙필수'
                    } for alt in alternatives[:3]  # 최대 3개로 제한
                ]

    logger.debug(f"대체 과목 구조: {alternative_courses}")

    # 결과 생성
    result = {
        "message": "시간표가 성공적으로 생성되었습니다.",
        "timetable": [
            {
                "name": course['과목명'],
                "time_slots": course['시간표'],  # 원래 형식 그대로 유지
                "professor": course['교수명'],
                "credits": course['학점'],
                "course_type": course['이수구분'],
                "track_required": course.get('트랙이수') == '트랙필수'
            } for course in final_timetable
        ],
        "remaining_credits": best_remaining_credits,
        "total_credits": total_credits,
        "alternative_courses": alternative_courses
    }

    # 최대 학점에 도달하지 못한 경우 메시지 추가
    if total_credits < max_credits:
        result["warning"] = f"최대 학점({max_credits})에 도달하지 못했습니다. 현재 총 학점: {total_credits}"

    logger.debug(f"최종 결과: {result}")
    return result

@app.route('/generate-timetable', methods=['POST'])
def handle_generate_timetable_request():
    # 시간표 생성 요청을 처리하는 라우트 핸들러
    logger.debug("Received request: %s", request.json)
    data = request.json
    logger.debug(f"수신된 데이터: {data}")
    user_id = data.get('user_id')
    dynamic_data = data.get('dynamic_data')

    if not user_id:
        logger.error("요청에 user_id가 없음")
        return jsonify({"error": "user_id가 필요합니다."}), 400

    result = generate_timetable(user_id, dynamic_data)
    logger.debug(f"사용자 {user_id}의 시간표 생성 완료")
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True, port=5001)
