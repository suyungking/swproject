import random
import difflib
from datetime import datetime, timedelta

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

def parse_timetable(timetable_str):
    parsed_timetable = []
    for time_slot in timetable_str.split('/'):
        day, periods = time_slot.strip().split(' ')
        start_period, end_period = map(float, periods.split('~'))
        
        start_time = convert_class_period_to_time(int(start_period))[0]
        end_time = convert_class_period_to_time(int(end_period))[1]
        
        if start_period % 1 == 0.5:
            start_time = (datetime.strptime(start_time, '%H:%M') + timedelta(minutes=25)).strftime('%H:%M')
        if end_period % 1 == 0.5:
            end_time = (datetime.strptime(end_time, '%H:%M') + timedelta(minutes=25)).strftime('%H:%M')
        
        parsed_timetable.append(f"{day} {start_time}~{end_time}")
    
    return ' / '.join(parsed_timetable)

def filter_courses_by_morning_afternoon(courses, morning_afternoon, include_night):
    logger.debug(f"오전/오후 선호도: {morning_afternoon}, 야간 포함: {include_night}에 따라 과목을 필터링하는 중")
    if morning_afternoon == 'all':
        return courses
    
    filtered_courses = []
    for course in courses:
        start_times = course['시간표'].split('/')
        for start_time in start_times:
            time = start_time.split(' ')[1].split('~')[0]
            hour = int(time.split(':')[0])
            if morning_afternoon == 'morning' and 9 <= hour < 12:
                filtered_courses.append(course)
                break
            elif morning_afternoon == 'afternoon' and 12 <= hour < 18:
                filtered_courses.append(course)
                break
            elif morning_afternoon == 'evening' and hour >= 18:
                if include_night:
                    filtered_courses.append(course)
                break
            elif morning_afternoon == 'all':
                if hour < 18 or (hour >= 18 and include_night):
                    filtered_courses.append(course)
                break
    logger.debug(f"{len(filtered_courses)}개의 과목을 필터링함")
    return filtered_courses

def calculate_course_priority(course, user_grade, remaining_credits, include_teacher_training):
    priority = 0
    
    if int(course['학년']) == user_grade:
        priority += 100
    elif int(course['학년']) < user_grade:
        priority += 50

    if course['이수구분'] == '전공필수' and remaining_credits['required_major'] > 0:
        priority += 200
    elif course['이수구분'] == '전공선택' and remaining_credits['elective_major'] > 0:
        priority += 150
    elif course['이수구분'] == '핵심교양' and remaining_credits['core_liberal_arts'] > 0:
        priority += 100
    elif course['이수구분'] == '소양교양' and remaining_credits['elective_liberal_arts'] > 0:
        priority += 50
    elif course['이수구분'] == '교직필수':
        if include_teacher_training:
            priority += 175
        else:
            priority += 25

    priority += int(course['학점']) * 10

    return priority

def resolve_schedule_conflicts(timetable, user_grade, remaining_credits, include_teacher_training):
    logger.debug("시간표 충돌을 해결하는 중")
    final_timetable = []
    time_slots = {}
    
    for course in timetable:
        course_priority = calculate_course_priority(course, user_grade, remaining_credits, include_teacher_training)
        course_times = course['시간표'].split('/')
        for time in course_times:
            if time in time_slots:
                if course_priority > time_slots[time]['priority']:
                    time_slots[time] = {'course': course, 'priority': course_priority}
            else:
                time_slots[time] = {'course': course, 'priority': course_priority}

    final_timetable = list(set(slot['course'] for slot in time_slots.values()))
    
    logger.debug(f"충돌 해결 후 최종 시간표에 {len(final_timetable)}개의 과목이 포함됨")
    return final_timetable

def find_similar_courses(course, all_courses, num_suggestions=3):
    logger.debug(f"{course['과목명']}과 유사한 과목을 찾는 중")
    course_name = course['과목명']
    similar_course_names = difflib.get_close_matches(course_name, [c['과목명'] for c in all_courses], n=num_suggestions, cutoff=0.6)
    similar_courses = [c for c in all_courses if c['과목명'] in similar_course_names and c['과목명'] != course_name]
    logger.debug(f"{len(similar_courses)}개의 유사한 과목을 찾음")
    return similar_courses

def is_time_conflict(timetable, new_course):
    new_course_times = set(new_course['시간표'].split('/'))
    for course in timetable:
        existing_times = set(course['시간표'].split('/'))
        if new_course_times & existing_times:
            return True
    return False

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

def generate_initial_timetable(required_courses, elective_and_liberal_arts, advisory_course, user_grade, remaining_credits, max_credits, preferred_days, morning_afternoon, include_night, include_teacher_training):
    logger.debug("초기 시간표를 생성하는 중")
    
    all_courses = required_courses + elective_and_liberal_arts + advisory_course
    all_courses.sort(key=lambda course: calculate_course_priority(course, user_grade, remaining_credits, include_teacher_training), reverse=True)
    
    initial_timetable = []
    current_credits = 0
    day_credits = {day: 0 for day in preferred_days}
    
    for course in all_courses:
        course_credits = int(course['학점'])
        course_days = [day.split(' ')[0] for day in course['시간표'].split('/')]
        
        if current_credits + course_credits > max_credits:
            continue
        
        if is_time_conflict(initial_timetable, course):
            continue
        
        if not all(day in preferred_days for day in course_days):
            continue
        
        if not is_course_in_preferred_time(course, morning_afternoon, include_night):
            continue
        
        if any(day_credits[day] + course_credits > 9 for day in course_days):
            continue
        
        initial_timetable.append(course)
        current_credits += course_credits
        for day in course_days:
            day_credits[day] += course_credits
    
    logger.debug(f"초기 시간표 생성 완료: {len(initial_timetable)}개 과목, 총 {current_credits}학점")
    return initial_timetable

def is_course_in_preferred_time(course, morning_afternoon, include_night):
    course_times  = course['시간표'].split('/')
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

def generate_timetable(user_id, dynamic_data):
    logger.debug(f"사용자 {user_id}의 시간표 생성 시작")
    logger.debug(f"동적 데이터: {json.dumps(dynamic_data, indent=2)}")
    
    user_data = fetch_user_data(user_id)
    logger.debug(f"가져온 사용자 데이터: {user_data}")
    
    if not user_data:
        logger.error(f"사용자를 찾을 수 없음: {user_id}")
        return {"error": "사용자를 찾을 수 없습니다."}, 404

    max_credits = dynamic_data.get('max_credits', 21)
    preferred_days = dynamic_data.get('preferred_days', ['월', '화', '수', '목', '금'])
    morning_afternoon = dynamic_data.get('morning_afternoon', 'all')
    include_night = dynamic_data.get('include_night', False)
    shift = dynamic_data.get('shift', '주간')
    selected_areas = dynamic_data.get('selected_areas', ['1영역', '2영역', '3영역', '4영역'])
    include_elective_liberal_arts = dynamic_data.get('include_elective_liberal_arts', False)
    include_teacher_training = dynamic_data.get('include_teacher_training', False)
    user_grade = dynamic_data.get('grade', user_data.get('grade', 1))

    remaining_credits = {
        "basic_literacy": user_data.get("basic_literacy", 0) - user_data.get("completed_basic_literacy", 0),
        "core_liberal_arts": user_data.get("core_liberal_arts", 0) - user_data.get("completed_core_liberal_arts", 0),
        "basic_science": user_data.get("basic_science", 0) - user_data.get("completed_basic_science", 0),
        "required_major": user_data.get("required_major", 0) - user_data.get("completed_required_major", 0),
        "elective_major": user_data.get("elective_major", 0) - user_data.get("completed_elective_major", 0),
        "elective_liberal_arts": user_data.get("elective_liberal_arts", 0) - user_data.get("completed_elective_liberal_arts", 0),
    }

    logger.debug(f"남은 학점: {remaining_credits}")

    advisory_course = add_advisory_course(dynamic_data.get('include_advisory', False))
    required_courses = add_required_courses(user_data, remaining_credits)
    elective_and_liberal_arts = add_elective_and_liberal_arts_courses(
        user_data,
        remaining_credits,
        preferred_days,
        morning_afternoon,
        include_night,
        shift,
        selected_areas,
        include_elective_liberal_arts
    )

    logger.debug(f"상담 과목: {advisory_course}")
    logger.debug(f"필수 과목: {required_courses}")
    logger.debug(f"선택 및 교양 과목: {elective_and_liberal_arts}")

    initial_timetable = generate_initial_timetable(
        required_courses,
        elective_and_liberal_arts,
        advisory_course,
        user_grade,
        remaining_credits,
        max_credits,
        preferred_days,
        morning_afternoon,
        include_night,
        include_teacher_training
    )

    logger.debug(f"초기 시간표 크기: {len(initial_timetable)}")
    logger.debug(f"초기 시간표: {initial_timetable}")

    final_timetable = []
    alternative_courses = {}
    current_credits = 0
    all_courses = fetch_all_courses()

    for course in initial_timetable:
        course_credits = int(course['학점'])
        if current_credits + course_credits <= max_credits:
            if not is_time_conflict(final_timetable, course):
                final_timetable.append(course)
                current_credits += course_credits
            else:
                alternatives = find_alternative_courses(course, all_courses, final_timetable)
                if alternatives:
                    final_timetable.append(alternatives[0])
                    current_credits += int(alternatives[0]['학점'])
                    alternative_courses[course['과목명']] = alternatives[1:]
        else:
            break

    final_timetable = resolve_schedule_conflicts(final_timetable, user_grade, remaining_credits, include_teacher_training)

    logger.debug(f"충돌 해결 후 최종 시간표: {final_timetable}")

    if len(final_timetable) < 1:
        logger.error("유효한 시간표를 생성할 수 없음")
        return {"error": "유효한 시간표를 생성할 수 없습니다. 선택한 조건을 확인해주세요."}, 400

    logger.debug(f"최종 시간표 크기: {len(final_timetable)}")
    logger.debug(f"총 학점: {current_credits}")

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
        "total_credits": current_credits,
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
    logger.debug(f"최종 결과: {json.dumps(result, indent=2, ensure_ascii=False)}")
    return result

@app.route('/generate-timetable', methods=['POST'])
def handle_generate_timetable_request():
    logger.debug("시간표 생성 요청 수신")
    data = request.json
    logger.debug(f"수신된 데이터: {json.dumps(data, indent=2, ensure_ascii=False)}")
    user_id = data.get('user_id')
    dynamic_data = data.get('dynamic_data')

    if not user_id:
        logger.error("요청에 user_id가 없음")
        return jsonify({"error": "user_id가 필요합니다."}), 400

    result = generate_timetable(user_id, dynamic_data)
    logger.debug(f"사용자 {user_id}의 시간표 생성 완료")
    logger.debug(f"반환 결과: {json.dumps(result, indent=2, ensure_ascii=False)}")
    return jsonify(result)

if __name__ == "__main__":
    app.run(port=5000)