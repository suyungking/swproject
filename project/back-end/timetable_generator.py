from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
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
    slots = []
    for slot in timetable.split(' / '):
        day, time = slot.split(') ')
        day = day[1:]  # Remove the opening parenthesis
        start, end = map(float, time.split('~'))
        start_time, _ = convert_class_period_to_time(int(start))
        _, end_time = convert_class_period_to_time(int(end))
        slots.append({
            'day': day,
            'start': start_time,
            'end': end_time
        })
    return slots

def period_to_time(period):
    hour = 9 + (period - 1) // 2
    minute = 0 if (period - 1) % 2 == 0 else 30
    return hour + minute / 60

def is_time_conflict(timetable, new_course):
    # new_course가 문자열인 경우 (시간표 문자열)
    if isinstance(new_course, str):
        new_course_times = parse_time(new_course)
    # new_course가 딕셔너리인 경우 (과목 정보를 담은 딕셔너리)
    elif isinstance(new_course, dict):
        new_course_times = parse_time(new_course['시간표'])
    else:
        # 예상치 못한 타입인 경우 로그 출력
        logger.error(f"Unexpected type for new_course: {type(new_course)}")
        return False

    for course in timetable:
        existing_times = parse_time(course['시간표'])
        if any(new_time.overlaps(existing_time) for new_time in new_course_times for existing_time in existing_times):
            return True
    return False

def parse_time(time_str):
    times = []
    for time_slot in time_str.split('/'):
        day, time_range = time_slot.strip('()').split()
        start, end = map(float, time_range.split('~'))
        times.append(TimeSlot(day, start, end))
    return times

class TimeSlot:
    def __init__(self, day, start, end):
        self.day = day
        self.start = start
        self.end = end

    def overlaps(self, other):
        return self.day == other.day and max(self.start, other.start) < min(self.end, other.end)
    
def convert_time_to_minutes(time_str):
    hours, minutes = map(int, time_str.split(':'))
    return hours * 60 + minutes

def calculate_remaining_credits(user_data, completed_credits):
    total_required = (
        user_data['basic_literacy'] +
        user_data['core_liberal_arts'] +
        user_data['basic_science'] +
        user_data['required_major'] +
        user_data['elective_major']
    )
    
    remaining_credits = {
        "basic_liberal_arts": {
            "total": user_data['basic_literacy'] + user_data['basic_science'] - 
                     (completed_credits.get('completed_basic_literacy', 0) + 
                      completed_credits.get('completed_basic_science', 0)),
            "basic_literacy": user_data['basic_literacy'] - completed_credits.get('completed_basic_literacy', 0),
            "basic_science": user_data['basic_science'] - completed_credits.get('completed_basic_science', 0)
        },
        "core_liberal_arts": user_data['core_liberal_arts'] - completed_credits.get('completed_core_liberal_arts', 0),
        "required_major": user_data['required_major'] - completed_credits.get('completed_required_major', 0),
        "elective_major": user_data['elective_major'] - completed_credits.get('completed_elective_major', 0),
        "undefined": user_data['graduation_credits'] - total_required - (completed_credits.get('completed_elective_liberal_arts', 0) + completed_credits.get('completed_other', 0))
    }
    
    return remaining_credits

def calculate_course_priority(course, grade, remaining_credits, morning_afternoon, include_night, preferred_days):
    priority = 0
    
    if course['이수구분'] == '비교과':
        return float('inf')

    # 과목 유형에 따른 우선순위 부여
    if course['이수구분'] == '전공필수' and course.get('트랙이수') == '트랙필수':
        priority += 1000  # 전공필수 + 트랙필수 (최우선)
    elif (course['이수구분'] == '전공선택' and course.get('트랙이수') == '트랙필수') or \
         (course['이수구분'] == '전공필수' and course.get('트랙이수') != '트랙필수'):
        priority += 800   # 전공선택 + 트랙필수 또는 전공필수 + 트랙선택 (2순위)
    elif course['이수구분'] == '전공선택' and course.get('트랙이수') != '트랙필수':
        priority += 600   # 전공선택 + 트랙선택 (최하위)
    elif course['이수구분'] == '핵심교양':
        priority += 400   # 핵심교양 과목에 대한 우선순위

    # 학년에 따른 우선순위 조정
    if course['학년'] == f"{grade}학년":
        priority += 100
    elif course['학년'] == '전학년':
        priority += 50

    # 남은 학점에 따른 가중치
    course_type = course['이수구분']
    if course_type == '전공선택' and remaining_credits['elective_major'] > 0:
        priority += min(40, remaining_credits['elective_major'] * 4)
    elif course_type == '핵심교양' and remaining_credits['core_liberal_arts'] > 0:
        priority += min(30, remaining_credits['core_liberal_arts'] * 3)
    elif course_type == '기초교양':
        if course['영역'] == '기초문해교육' and remaining_credits['basic_liberal_arts']['basic_literacy'] > 0:
            priority += min(35, remaining_credits['basic_liberal_arts']['basic_literacy'] * 3.5)
        elif course['영역'] == '기초과학교육' and remaining_credits['basic_liberal_arts']['basic_science'] > 0:
            priority += min(35, remaining_credits['basic_liberal_arts']['basic_science'] * 3.5)
        elif remaining_credits['basic_liberal_arts']['total'] > 0:
            priority += min(30, remaining_credits['basic_liberal_arts']['total'] * 3)
    elif remaining_credits['undefined'] > 0:
        priority += min(20, remaining_credits['undefined'] * 2)
    
    # 이수구분에 따른 가중치
    if course['이수구분'] == '전공선택':
        priority += 150
    elif course['이수구분'] == '핵심교양':
        priority += 100
    elif course['이수구분'] == '소양교양':
        priority += 50
    
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

def resolve_schedule_conflicts(timetable, grade, remaining_credits, include_teacher_training, morning_afternoon, include_night, preferred_days):
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

def find_similar_courses(course, all_courses, num_suggestions=3):
    logger.debug(f"{course['과목명']}과 유사한 과목을 찾는 중")
    course_name = course['과목명']
    similar_course_names = difflib.get_close_matches(course_name, [c['과목명'] for c in all_courses], n=num_suggestions, cutoff=0.6)
    similar_courses = [c for c in all_courses if c['과목명'] in similar_course_names and c['과목명'] != course_name]
    logger.debug(f"{len(similar_courses)}개의 유사한 과목을 찾음")
    return similar_courses

def find_alternative_courses(course, all_courses, timetable, max_alternatives=3):
    logger.debug(f"{course['과목명']}의 대체 과목을 찾는 중")
    similar_courses = find_similar_courses(course, all_courses)
    alternatives = []
    for alt_course in similar_courses:
        if not is_time_conflict(timetable, alt_course):
            alternatives.append(alt_course)
            if len(alternatives) >= max_alternatives:
                break
    logger.debug(f"{len(alternatives)}개의 대체 과목을 찾음")
    return alternatives

def is_course_in_preferred_time(course, morning_afternoon, include_night):
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

def evaluate_timetable(timetable, total_credits, average_priority):
    score = 0
    
    # 총 학점에 대한 점수
    if total_credits >= 15 and total_credits <= 18:
        score += 100
    elif total_credits >= 12:
        score += 50
    
    # 평균 우선순위에 대한 점수
    score += average_priority * 10
    
    # 과목 다양성 점수
    course_types = set(course['이수구분'] for course in timetable)
    score += len(course_types) * 20
    
    # 트랙필수 과목 포함 여부 점수
    if any(course.get('트랙이수') == '트랙필수' for course in timetable):
        score += 50
    
    # 시간 분포 점수
    days_with_classes = set(day for course in timetable for day in course['시간표'].split('/')[0].strip('()'))
    score += len(days_with_classes) * 10
    
    return score

def generate_initial_timetable(all_courses, grade, remaining_credits, max_credits, preferred_days, morning_afternoon, include_night):
    logger.debug("초기 시간표를 생성하는 중")
    
    if not all_courses:
        logger.warning("과목 목록이 비어 있습니다.")
        return [], 0, 0
    
    # 모든 과목에 대해 우선순위 계산
    prioritized_courses = [(course, calculate_course_priority(course, grade, remaining_credits, morning_afternoon, include_night, preferred_days)) for course in all_courses]
    
    # 우선순위에 약간의 무작위성 추가
    prioritized_courses = [(course, priority + random.uniform(0, 10)) for course, priority in prioritized_courses]

    # 우선순위에 따라 정렬
    prioritized_courses.sort(key=lambda x: x[1], reverse=True)
    
    initial_timetable = []
    current_credits = 0
    total_priority = 0
    selected_course_names = set()  # 선택된 과목명을 추적하기 위한 집합
    

    def add_course(course, priority):
        nonlocal current_credits, total_priority
        initial_timetable.append(course)
        current_credits += int(course['학점'])
        total_priority += priority
        selected_course_names.add(course['과목명'])

    # 트랙필수 과목 먼저 추가
    for course, priority in prioritized_courses[:]:
        if course.get('트랙이수') == '트랙필수' and current_credits + int(course['학점']) <= max_credits:
            if not is_time_conflict(initial_timetable, course) and course['과목명'] not in selected_course_names:
                add_course(course, priority)
                prioritized_courses.remove((course, priority))
    
    # 나머지 과목 추가
    while current_credits < max_credits and prioritized_courses:
        # 상위 5개 (또는 남은 과목 수) 중에서 무작위로 선택
        top_courses = prioritized_courses[:min(5, len(prioritized_courses))]
        course, priority = random.choice(top_courses)
        course_credits = int(course['학점'])
        
        if current_credits + course_credits > max_credits:
            prioritized_courses.remove((course, priority))
            continue
        
        if is_time_conflict(initial_timetable, course):
            prioritized_courses.remove((course, priority))
            continue
        
        if course['과목명'] in selected_course_names:
            prioritized_courses.remove((course, priority))
            continue            

        add_course(course, priority)
        prioritized_courses.remove((course, priority))
    
    average_priority = total_priority / len(initial_timetable) if initial_timetable else 0
    
    logger.debug(f"초기 시간표 생성 완료: {len(initial_timetable)}개 과목, 총 {current_credits}학점, 평균 우선순위: {average_priority:.2f}")
    return initial_timetable, current_credits, average_priority

def generate_timetable(user_id, dynamic_data):
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
    remaining_credits = calculate_remaining_credits(user_data, completed_credits)
    logger.debug(f"남은 학점: {remaining_credits}")

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
    # 트랙필수 과목 필터링
    track_required_courses = [course for course in elective_courses if course['트랙이수'] == '트랙필수']
    
    # 트랙필수 과목을 required_courses에 추가
    required_courses += track_required_courses
    
    # 트랙필수가 아닌 전공선택 과목만 남김
    elective_courses = [course for course in elective_courses if course.get('트랙이수') != '트랙필수']


    logger.debug(f"상담 과목: {advisory_course}")
    logger.debug(f"필수 과목: {required_courses}")
    logger.debug(f"선택 과목: {elective_courses}")
    logger.debug(f"교양 과목: {liberal_arts_courses}")
    

    all_courses = required_courses + elective_courses + liberal_arts_courses
    logger.debug(f"총 {len(all_courses)}개의 과목을 가져옴")
    

    best_timetable = None
    best_score = 0
    attempts = 20  # 시도 횟수 증가

    for _ in range(attempts):
        initial_timetable, total_credits, average_priority = generate_initial_timetable(
            all_courses, grade, remaining_credits, max_credits, preferred_days, morning_afternoon, include_night
        )
        
        # 시간표 평가 (예: 총 학점, 평균 우선순위, 트랙필수 과목 포함 여부 등을 고려)
        score = evaluate_timetable(initial_timetable, total_credits, average_priority)
        
        if score > best_score:
            best_timetable = initial_timetable
            best_score = score

    if not best_timetable:
        logger.warning("시간표 생성에 실패했습니다.")
        return {"error": "시간표 생성에 실패했습니다."}

    final_timetable = best_timetable

    # 대체 과목 찾기
    all_courses = fetch_all_courses()
    alternative_courses = {}
    for course in initial_timetable:
        if course not in final_timetable:
            alternatives = find_alternative_courses(course, all_courses, final_timetable)
            if alternatives:
                alternative_courses[course['과목명']] = alternatives

    total_credits = sum(int(course['학점']) for course in final_timetable if course['이수구분'] != '비교과')

    # 결과 생성
    result = {
        "message": "시간표가 성공적으로 생성되었습니다.",
        "timetable": [
            {
                "name": course['과목명'],
                "day": course['시간표'].split(' ')[0],
                "start_time": course['시간표'].split(' ')[1].split('~')[0],
                "end_time": course['시간표'].split(' ')[1].split('~')[1],
                "professor": course['교수명'],
                "credits": course['학점'],
                "course_type": course['이수구분']
            } for course in final_timetable
        ],
        "remaining_credits": remaining_credits,
        "total_credits": total_credits,
        "alternative_courses": {
            course: [
                {
                    "name": alt['과목명'],
                    "day": alt['시간표'].split(' ')[0],
                    "start_time": alt['시간표'].split(' ')[1].split('~')[0],
                    "end_time": alt['시간표'].split(' ')[1].split('~')[1],
                    "professor": alt['교수명'],
                    "credits": alt['학점'],
                    "course_type": alt['이수구분']
                } for alt in alternatives
            ] for course, alternatives in alternative_courses.items()
        }
    }
    logger.debug(f"최종 결과: {result}")
    return result

@app.route('/generate-timetable', methods=['POST'])
def handle_generate_timetable_request():
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
