---
title: "[회고] - 테커 부트캠프가 뭐예요? - 리더 시점 Part 2"
date: 2026-02-03 00:00:00 +0900
categories: [리뷰]
tags: [리뷰]
toc: true
---

# 개발 과정 및 고난의 연속 (BreakThrough)

- P1 : 테커 부캠이 뭐예요?
- **P2(본 글) : 개발과 문제 해결**
- P3 : 발표와 마무리, 느낀 점

_순으로 글이 진행됩니다._

## 2주차: 설계와 기술 선정 (Architecture & Tech Stack)

![](https://private-user-images.githubusercontent.com/100285233/541089261-1b01231d-0202-4ac4-b076-28d92bfe6b5a.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzAxMDcyNzYsIm5iZiI6MTc3MDEwNjk3NiwicGF0aCI6Ii8xMDAyODUyMzMvNTQxMDg5MjYxLTFiMDEyMzFkLTAyMDItNGFjNC1iMDc2LTI4ZDkyYmZlNmI1YS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwMjAzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDIwM1QwODIyNTZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1jZmVhNGY1ZWI4NjFlM2IzZDhlYjc1MTc3MTcwYWQzNGEzOGE4YmNlOTA3YTAyN2VjMjI2NjNjOWJkMzQ0ZjA2JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.b4-fQKUAQNhZZoocGMMwrkGPh1vXJHg6ZbfCMeD74xY)

![](https://private-user-images.githubusercontent.com/140071879/540888617-c89aba1c-8ce8-4181-9715-e3c180e578c4.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzAxMDcyNzYsIm5iZiI6MTc3MDEwNjk3NiwicGF0aCI6Ii8xNDAwNzE4NzkvNTQwODg4NjE3LWM4OWFiYTFjLThjZTgtNDE4MS05NzE1LWUzYzE4MGU1NzhjNC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwMjAzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDIwM1QwODIyNTZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0xMGYyYmRiNTMyZGI4YzFjZjYyZjVkZjFkNGYyZDc1MzlkNGNlMmI5ZjMzNTFkNDEyMzU3NDAyODAwZGEyZDRiJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.wYC1h0uluqUVb8gOzMEiMTLtKgU37VepqqER2VdPLVg)
![](https://private-user-images.githubusercontent.com/140071879/540888993-02858f9b-2f0f-4299-950f-edd352882666.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzAxMDcyNzYsIm5iZiI6MTc3MDEwNjk3NiwicGF0aCI6Ii8xNDAwNzE4NzkvNTQwODg4OTkzLTAyODU4ZjliLTJmMGYtNDI5OS05NTBmLWVkZDM1Mjg4MjY2Ni5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwMjAzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDIwM1QwODIyNTZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0wMDY0ZTliY2QyYTE2M2UzMTk3MjRjYzFkMmJjZGZjMDllYmMxYTk5YjBjOGM3YjUxOWFkZjM2NjVmYjA2ZjI4JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.v7I8i5BMTW7rmuN8JSdCue870PkBnWKUnyfDHd_qlfQ)

주제 선정을 마치고 난 후, 본격적인 개발에 앞서 ERD, 시스템 아키텍처, API 명세서 등 **청사진을 그리는 과정**을 거쳤다.

특히 기술 스택 선정 과정에서는 단순히 "요즘 많이 쓰니까" 보다도, **"우리 서비스의 요구사항을 가장 효율적으로 해결할 수 있는가?"** 라는 관점에서 접근하려 노력했다.

~~결론적으로 많이 쓰는 데에는 다 이유가 있었다.~~

프론트엔드는 SPA + 빠른 빌드 + 협업 개발 환경을 위해 React와 Vite 조합을 채택했고, 이는 빠르게 결정되었다. 고민은 백엔드였다.

### 백엔드 프레임워크, 무엇이 최적일까?

- FastAPI?
- Flask?
- Django?
- Spring Boot?

우리의 핵심 요구사항을 다시 정리해보았다.

1. **대용량 데이터 처리**: 부동산 거래 내역 등 수백만 건 이상의 데이터를 다뤄야 한다.
2. **비동기 처리**: 다수의 요청과 I/O 작업을 병목 없이 처리해야 한다.
3. **제한된 시간**: 5주라는 제한된 시간 내에 학습과 구현을 마쳐야 한다.

Spring Boot는 무겁고 우리 팀이 다루기에는 어렵다고 판단했다.
결국 남은 것은 Django와 FastAPI.

우리는 **FastAPI**를 선택했다.
가장 큰 이유는 **비동기 지원**이었다. 많은 양의 데이터를 다루는 우리 서비스 특성상 비동기 처리가 네이티브하게 지원되는 점이 매력적이었고, Django에 비해 가볍고 학습 곡선이 낮아 5주라는 시간 안에 빠르게 개발하기에 적합하다고 판단했다.

### DB 선정: 공간 데이터를 다루는 법

기본 데이터 저장소는 RDBMS로 하되, 캐싱을 위해 Redis를 사용하기로 했다.
남은 과제는 RDBMS의 종류. PostgreSQL vs MySQL.

여기서 결정적인 요소는 **GIS** 기능이었다.
우리 프로젝트의 핵심 기능인 '지도 시각화'를 위해서는 위도&경도 데이터를 효율적으로 저장하고 쿼리해야 했다.

![](https://github.com/rlaalstjdzzz/Media/raw/main/Maps.webp)

좌표 저장, 특정 반경 내 아파트 검색이나 영역 기반 쿼리 등을 고려했을 때 **PostgreSQL + PostGIS** 확장 조합이 가장 좋다고 판단하였다. Geometry 타입으로 공간 데이터를 인덱싱하여 다룰 수 있다는 점도 매력적이었다.

### 설계가 반이다

도구가 정해졌으니 기초 공사를 시작했다.
API 명세서와 기능 명세서를 작성하고 PoC를 하며 남은 2주차를 보냈다.

나는 데이터 파이프라인 구축을 맡았다. 공공데이터 포털에서 법정동 데이터, 아파트 기본 정보, 실거래가 내역 등을 수집하고 적재하는 작업이었다. 앞으로 일어날 문제들은 모른 채..

## 3~4주차: 문제 해결의 연속 (Troubleshooting)

3주 차부터 본격적인 구현에 돌입했다.
사전에 명세서를 꼼꼼히 작성해둔 덕에 비즈니스 로직 구현과 모니터링(Grafana + Prometheus), CI/CD(GitHub Actions) 구축은 순조로웠다.

**하지만, 예상치 못한 곳에서 이슈들이 터져 나오기 시작했다.**

---

### 아니 분명 같은 공공데이터에서 가져온건데요?

가장 큰 문제는 **데이터 소스 간의 불일치**였다.

- 아파트 단지 목록 (단지코드 존재)
- 국토부 실거래가 데이터 (단지코드 부재, 주소/아파트명만 존재)

두 데이터를 매칭해야 하는데, **아파트 이름 표기법이 제각각**이라는 것이 문제였다.

- A 데이터: "래미안퍼스티지2차"
- B 데이터: "래미안퍼스티지II", "래미안 2차"

고유한 식별자가 될 단지코드가 없는 상태에서 문자열에 의존하여 매칭을 시도하다보니 같은 아파트임에도 표기법이 달라 매칭에 실패하는 경우들이 많았다.

초기에는 공백 제거(`strip`)나 문자열 유사도 알고리즘을 적용해 보았지만,
이는 다른 아파트인데도 같은 아파트로 판정하여 잘못된 거래 데이터가 아파트와 매칭되는 더 심각한 문제가 생겼다.

이는 서비스의 신뢰 하락은 물론이고 실제 서비스를 했었다면 고소까지 먹을 수 있는 일이었기에 무조건 고쳐야 했다.

1. **전처리**: 전국의 아파트 브랜드명, 차수 표기(1차, I 등)를 정규화.
2. **이중 인증**: '아파트명' + '지번 주소'를 조합하여 두 조건이 모두 일치할 때만 매핑.
3. **사전 구축**: 자주 발생하는 예외 케이스(현대 -> 주공 등)를 딕셔너리로 관리.

거의 3~4일을 꼬박 데이터 정제에 쏟아부었다. 발표 때에는 보이지 않는 부분이지만, 우리 프로젝트의 정체성인 "많은 데이터를 빠르고 정확하게 정제, 분석하여 시각화" 한다는 목표를 이루기 위해 가장 중요한 과정이었다.

### 느려요.

데이터 정합성을 맞추니 이번엔 **성능** 문제가 터졌다.
아파트/지역 목록 4만 건, 실거래가 데이터 1,000만 건 이상.
AWS RDS(t4g.micro)에서 도저히 버틸 수 없었나보다.

초기 테스트 결과,

- 통계 쿼리: **7초+ 소요**
- 아파트 검색: **5초+ 소요**

라는 처참한 결과가 우리를 맞이했다.

이런 서비스를 누가 쓰겠는가. 분명히 고쳐야 할 문제였고, 아래와 같은 방법들로 개선하였다.

#### 1. pg_trgm + GIN Index

단순 `LIKE '%검색어%'` 쿼리는 테이블 전체를 순회해야 하기에 느릴 수 밖에 없었다.
이를 해결하기 위해 PostgreSQL의 **pg_trgm** 확장 모듈과 **GIN** 인덱스를 도입했다.

문자열을 3글자 단위(Trigram)로 쪼개어 인덱스로 저장함으로써, 임의의 문자열 검색에서도 인덱스를 탈 수 있게 만들었다.
결과적으로 검색 쿼리 속도는 **0.6초 이하**로 획기적으로 단축되었다.

#### 2. Materialized View

지역별 평균 가격 등의 통계 데이터는 연산이 복잡하지만 (아파트-거래 테이블 JOIN, GROUP BY 지역명..) 매 요청마다 계산할 필요가 없었다.

마침 부트캠프 세션에서 배운 개념인 Materialized View라는 것이 생각이 났고, 우리의 상황과 이 기능을 대조해보니 사용하기에 아주 좋은 케이스였다.

이렇게 하니 쿼리 시점에는 이미 계산된 테이블을 조회하기만 하면 되므로, **10초 -> 3초** 수준으로 성능을 개선했다.

#### 3. Redis Caching

3초도 웹 서비스에서는 긴 시간이다. 그래서 서버가 켜질 때 통계 결과를 미리 Redis에 적재해두었다.

사용자가 통계 페이지에 진입하면 DB까지 갈 필요도 없이 Redis에서 즉시 데이터를 반환한다.
이로써 최종 응답 속도를 **40ms 이하**로 줄일 수 있었다.

## 나머지 3~4주차

나머지 프론트엔드 버그 수정과 UI/UX를 다듬는 작업을 마지막으로 프로젝트를 마무리했다.
디자인을 갈아엎는 결단도 있었고, 19일부터 23일까지 새벽 3시 넘어 잠들기도 했다.

단순히 발표 때에만 사용할 "하지만 작동했죠?" 수준을 넘어,
실제 사용자가 있다고 가정하고 서비스를 만들었을 때 발생할 수 있는 문제들을 고민하고 해결해나가는 과정이 정말 값진 경험이었다고 생각한다.

---

> 다음 : 발표와 마무리, 느낀 점
