# 마라톤 주자 트래킹

서울 지도 위에 2025 JTBC 서울마라톤 코스를 표시하고, 스마트칩 구간 기록(예: 5km/10km/...
지점 태깅 시각)을 바탕으로 주자들의 현재 예상 위치를 작은 원 + 이름으로 보여주는 앱입니다.

- `backend/` — Express API. 스마트칩류 사이트에서 받아온(또는 시뮬레이션한) 구간 기록을
  주기적으로 폴링해서, 마지막 두 구간의 페이스로 "지금 위치"를 코스 위에 보간해 계산합니다.
- `frontend/` — React + Leaflet(OpenStreetMap) 지도. 코스를 색칠된 폴리라인으로, 주자를
  원형 마커 + 이름 툴팁으로 표시하고 5초마다 갱신합니다.

## 빠르게 실행해보기 (가상 데이터)

```bash
cd backend && npm install && npm run dev
# 새 터미널에서
cd frontend && npm install && npm run dev
```

`frontend`는 http://localhost:5173, `backend`는 http://localhost:4000 에서 뜨고,
Vite 프록시로 `/api`를 백엔드로 넘겨줍니다. 기본 설정(`DATA_SOURCE=mock`)은 24명의
가상 주자가 서로 다른 페이스로 코스를 달리는 모습을 바로 보여줍니다.

## 실제 스마트칩 데이터 연결하기

`backend/.env.example`을 `.env`로 복사한 뒤:

```
DATA_SOURCE=smartchip
SMARTCHIP_URL_TEMPLATE=https://smartchip.co.kr/Search_Ballyno.html?usedata={bib}
SMARTCHIP_BIBS=10321:홍길동,10322:김철수
```

처럼 채우면 `backend/src/providers/smartchipProvider.js`가 각 배번호 페이지를 주기적으로
가져와 구간 기록 표를 파싱합니다.

**중요 — 이 저장소를 만든 개발 환경은 네트워크 정책상 smartchip.co.kr /
myresult.co.kr 로 나가는 요청이 차단되어 있어서, 실제 페이지 구조에 맞춰 스크래퍼를
직접 검증하지 못했습니다.** 그래서 파서는 "km 라벨이 있는 헤더 행 + 그 아래 HH:MM:SS
형식의 기록 셀"을 찾는 범용 휴리스틱으로 작성했고, 실제 페이지에서 잘 안 맞으면:

1. `.env`에 `DEBUG_HTML=1`을 넣고 실행하면 가져온 HTML이 `backend/.debug-html/`에
   저장됩니다. 실제 페이지 구조를 보고 어디가 안 맞는지 확인하세요.
2. 브라우저 개발자도구로 구간 기록 표의 정확한 선택자를 확인해서
   `SMARTCHIP_SELECTORS`에 JSON으로 넣어주면 (`{"row":"...","km":"...","time":"..."}`)
   범용 파서 대신 그 선택자를 그대로 씁니다.
3. 일부 사이트는 배번호만으로 조회가 안 되고 이름/생년월일을 같이 요구할 수 있습니다 —
   `SMARTCHIP_BIBS`의 `bib:name` 외에 필요하면 `config.js`/`smartchipProvider.js`에
   `birth` 필드를 추가하세요.
4. 대회 주최측/스마트칩 이용약관을 확인하고, 짧은 주기로 과도하게 요청하지 마세요
   (`SMARTCHIP_REQUEST_DELAY_MS`로 요청 간 딜레이 조절 가능).

## 코스 데이터에 대한 안내

`backend/src/data/course-full.geojson`의 좌표는 공식 GPX가 아니라, 공개된 코스 설명
(상암 월드컵공원 출발 → 합정 → 양화대교 → 당산 → 여의도 → 마포대교 → 충정로 → 시청 →
청계광장 → 종각 → 동대문 → 신설동 → 군자 → 어린이대공원 → 잠실대교 → 잠실 →
종합운동장 → 삼전 → 탄천1교 → 수서IC → 방이 → 올림픽공원 평화의광장 도착)을 바탕으로
주요 경유지 좌표를 이어 만든 **근사 경로**입니다. 실제 도로 선형과는 다를 수 있습니다.

공식 코스 GPX/KML을 구하게 되면 `course-full.geojson`의 `geometry.coordinates`
(경도, 위도 순서)와 `properties.waypoints`만 교체하면 나머지 코드는 그대로 동작합니다
(`backend/src/course.js`가 좌표 목록으로부터 누적 거리를 계산해서 자동으로 총 거리에
맞춰 스케일링합니다).

## 위치 추정 방식

각 주자는 구간 기록이 쌓일 때마다:

1. 마지막으로 태깅된 두 지점의 시간 차이로 현재 페이스(분/km)를 계산
2. `현재 예상 거리 = 마지막 태깅 km + 경과 시간 / 페이스`
3. 그 거리를 코스 라인 위의 좌표로 변환해서 지도에 표시

구간 기록이 하나(출발 기록)뿐이면 `ASSUMED_START_PACE_MIN_PER_KM`(기본 6분/km)을
임시로 사용하다가, 다음 태깅이 들어오면 실제 페이스로 갱신됩니다.
