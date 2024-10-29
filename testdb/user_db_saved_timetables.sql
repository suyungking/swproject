-- MySQL dump 10.13  Distrib 8.0.38, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: user_db
-- ------------------------------------------------------
-- Server version	9.0.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `saved_timetables`
--

DROP TABLE IF EXISTS `saved_timetables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saved_timetables` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `timetable_data` json NOT NULL,
  `remaining_credits` json NOT NULL,
  `total_credits` int NOT NULL,
  `alternative_courses` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `saved_timetables_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saved_timetables`
--

LOCK TABLES `saved_timetables` WRITE;
/*!40000 ALTER TABLE `saved_timetables` DISABLE KEYS */;
INSERT INTO `saved_timetables` VALUES (2,4,'[{\"name\": \"컴퓨터공학입문과파이썬\", \"credits\": 3, \"professor\": \"이계식\", \"time_slots\": \"(월) 8~9.5 / (목) 8~9.5\", \"course_type\": \"전공선택\", \"track_required\": true}, {\"name\": \"일반물리학1\", \"credits\": 3, \"professor\": \"최용수\", \"time_slots\": \"(수) 2~3 / (목) 2~3\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"미적분학1\", \"credits\": 3, \"professor\": \"미정\", \"time_slots\": \"(화) 8~9 / (수) 6.5~7.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"확률과통계\", \"credits\": 3, \"professor\": \"강철\", \"time_slots\": \"(화) 3~5.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"한경디지로그:AI와 윤리\", \"credits\": 2, \"professor\": \"김형중\", \"time_slots\": \"(월) 2~3.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"대학영어\", \"credits\": 2, \"professor\": \"올리바스 린드로스 스피리던\", \"time_slots\": \"(화) 1~2.5\", \"course_type\": \"기초교양\", \"track_required\": false}]','{\"undefined\": 20, \"elective_major\": 60, \"required_major\": 15, \"core_liberal_arts\": 11, \"basic_liberal_arts\": {\"total\": 8, \"basic_science\": 3, \"basic_literacy\": 5}}',16,'{\"대학영어\": [{\"name\": \"한경디지로그:AI와 윤리\", \"credits\": 2, \"professor\": \"김형중\", \"time_slots\": \"(월) 4~5.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"한경디지로그:AI와 윤리\", \"credits\": 2, \"professor\": \"김형중\", \"time_slots\": \"(월) 6~7.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"한경디지로그:AI와 윤리\", \"credits\": 2, \"professor\": \"마상룡\", \"time_slots\": \"(화) 6~7.5\", \"course_type\": \"기초교양\", \"track_required\": false}], \"미적분학1\": [{\"name\": \"일반화학1\", \"credits\": 3, \"professor\": \"한기종\", \"time_slots\": \"(월) 4~6.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반물리학1\", \"credits\": 3, \"professor\": \"최용수\", \"time_slots\": \"(월) 5~6 / (수) 5~6\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반화학및실험1\", \"credits\": 3, \"professor\": \"양도현\", \"time_slots\": \"(금) 4~7.5\", \"course_type\": \"기초교양\", \"track_required\": false}], \"확률과통계\": [{\"name\": \"생명과학\", \"credits\": 3, \"professor\": \"성지연\", \"time_slots\": \"(월) 10~12.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반화학및실험1\", \"credits\": 3, \"professor\": \"양도현\", \"time_slots\": \"(금) 4~7.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반화학및실험1\", \"credits\": 3, \"professor\": \"박성훈\", \"time_slots\": \"(화) 10~13.5\", \"course_type\": \"기초교양\", \"track_required\": false}], \"일반물리학1\": [{\"name\": \"일반물리학\", \"credits\": 3, \"professor\": \"이현\", \"time_slots\": \"(목) 10~12.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반화학1\", \"credits\": 3, \"professor\": \"한기종\", \"time_slots\": \"(월) 4~6.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반화학\", \"credits\": 3, \"professor\": \"오영호\", \"time_slots\": \"(목) 10~12.5\", \"course_type\": \"기초교양\", \"track_required\": false}], \"한경디지로그:AI와 윤리\": [{\"name\": \"대학영어\", \"credits\": 2, \"professor\": \"레슬리 길버트 졸도스\", \"time_slots\": \"(월) 4~5.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"대학영어\", \"credits\": 2, \"professor\": \"레슬리 길버트 졸도스\", \"time_slots\": \"(월) 6~7.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"대학영어\", \"credits\": 2, \"professor\": \"피터머빈 데클러크\", \"time_slots\": \"(수) 3~4.5\", \"course_type\": \"기초교양\", \"track_required\": false}]}','2024-10-29 12:47:08'),(3,4,'[{\"name\": \"컴퓨터공학입문과파이썬\", \"credits\": 3, \"professor\": \"이계식\", \"time_slots\": \"(월) 8~9.5 / (목) 8~9.5\", \"course_type\": \"전공선택\", \"track_required\": true}, {\"name\": \"미적분학1\", \"credits\": 3, \"professor\": \"박상돈\", \"time_slots\": \"(월) 2.5~3.5 / (수) 2.5~3.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반물리학1\", \"credits\": 3, \"professor\": \"최용수\", \"time_slots\": \"(월) 5~6 / (수) 5~6\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"확률과통계\", \"credits\": 3, \"professor\": \"강철\", \"time_slots\": \"(화) 3~5.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"대학영어\", \"credits\": 2, \"professor\": \"올리바스 린드로스 스피리던\", \"time_slots\": \"(화) 1~2.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반화학및실험1\", \"credits\": 3, \"professor\": \"박성훈\", \"time_slots\": \"(화) 6~9.5\", \"course_type\": \"기초교양\", \"track_required\": false}]','{\"undefined\": 20, \"elective_major\": 60, \"required_major\": 15, \"core_liberal_arts\": 11, \"basic_liberal_arts\": {\"total\": 7, \"basic_science\": 0, \"basic_literacy\": 7}}',17,'{\"대학영어\": [{\"name\": \"한경디지로그:AI와 윤리\", \"credits\": 2, \"professor\": \"김형중\", \"time_slots\": \"(월) 6~7.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"한경디지로그:AI와 윤리\", \"credits\": 2, \"professor\": \"이정민\", \"time_slots\": \"(수) 6~7.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"한경디지로그:AI와 윤리\", \"credits\": 2, \"professor\": \"김원철\", \"time_slots\": \"(목) 6~7.5\", \"course_type\": \"기초교양\", \"track_required\": false}], \"미적분학1\": [{\"name\": \"일반물리학1\", \"credits\": 3, \"professor\": \"최용수\", \"time_slots\": \"(월) 6.5~7.5 / (수) 6.5~7.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반화학및실험1\", \"credits\": 3, \"professor\": \"권성학\", \"time_slots\": \"(목) 2~5.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반화학및실험1\", \"credits\": 3, \"professor\": \"양도현\", \"time_slots\": \"(금) 4~7.5\", \"course_type\": \"기초교양\", \"track_required\": false}], \"확률과통계\": [{\"name\": \"생명과학\", \"credits\": 3, \"professor\": \"성지연\", \"time_slots\": \"(월) 10~12.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반화학및실험1\", \"credits\": 3, \"professor\": \"권성학\", \"time_slots\": \"(목) 2~5.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반화학및실험1\", \"credits\": 3, \"professor\": \"양도현\", \"time_slots\": \"(금) 4~7.5\", \"course_type\": \"기초교양\", \"track_required\": false}], \"일반물리학1\": [{\"name\": \"일반물리학\", \"credits\": 3, \"professor\": \"이현\", \"time_slots\": \"(목) 1~3.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반물리학\", \"credits\": 3, \"professor\": \"이현\", \"time_slots\": \"(목) 10~12.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반물리학및실험1\", \"credits\": 3, \"professor\": \"양우일\", \"time_slots\": \"(수) 7~10.5\", \"course_type\": \"기초교양\", \"track_required\": false}], \"일반화학및실험1\": [{\"name\": \"일반물리학및실험1\", \"credits\": 3, \"professor\": \"양우일\", \"time_slots\": \"(수) 7~10.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반화학\", \"credits\": 3, \"professor\": \"권성학\", \"time_slots\": \"(수) 6~8.5\", \"course_type\": \"기초교양\", \"track_required\": false}, {\"name\": \"일반화학\", \"credits\": 3, \"professor\": \"오영호\", \"time_slots\": \"(목) 10~12.5\", \"course_type\": \"기초교양\", \"track_required\": false}]}','2024-10-29 13:12:50');
/*!40000 ALTER TABLE `saved_timetables` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-10-29 23:09:47
