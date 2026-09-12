# 마라톤 주자 트래킹

서울 지도 위에 2025 JTBC 서울마라톤 코스를 표시하고, 스마트칩 구간 기록(예: 5km/10km/...
지점 태깅 시각)을 바탕으로 주자들의 현재 예상 위치를 작은 원 + 이름으로 보여주는 앱입니다.

- `backend/` — Express API. 스마트칩류 사이트에서 받아온(또는 시뮬레이션한) 구간 기록을
  주기적으로 폴링해서, 마지막 두 구간의 페이스로 "지금 위치"를 코스 위에 보간해 계산합니다.
- `frontend/` — React + Leaflet(OpenStreetMap) 지도. 코스를 색칠된 폴리라인으로, 주자를
  원형 마커 + 이름 툴팁으로 표시하고 5초마다 갱신합니다. 화면 하단에서 배번호를 입력해
  주자를 바로 추가/삭제할 수 있습니다(`DATA_SOURCE=myresult`일 때는 입력한 배번호를
  즉시 실제 API로 조회해서 이름을 확인하므로, `.env` 파일을 직접 편집할 필요가 없고
  동명이인 걱정 없이 배번호로 정확히 특정할 수 있습니다). 추가한 목록은
  `backend/data/tracked-runners.json`에 저장되어 서버를 껐다 켜도 유지됩니다.

## 빠르게 실행해보기 (가상 데이터)

```bash
cd backend && npm install && npm run dev
# 새 터미널에서
cd frontend && npm install && npm run dev
```

`frontend`는 http://localhost:5173, `backend`는 http://localhost:4000 에서 뜨고,
Vite 프록시로 `/api`를 백엔드로 넘겨줍니다. 기본 설정(`DATA_SOURCE=mock`)은 24명의
가상 주자가 서로 다른 페이스로 코스를 달리는 모습을 바로 보여줍니다.

## 실제 기록 데이터 연결하기 (myresult.co.kr, 권장)

myresult.co.kr(스마트칩 기반 대회들의 결과 조회 사이트, 예: JTBC 서울마라톤)은
브라우저 개발자도구로 확인한 결과 다음 JSON API로 개인 기록을 제공합니다:

```
GET https://www.myresult.co.kr/api/event/{eventId}/player/{bib}
```

`backend/.env.example`을 `.env`로 복사한 뒤 채워주세요:

```
DATA_SOURCE=myresult
MYRESULT_EVENT_ID=92          # myresult.co.kr/92 형태의 대회 개요 페이지 URL에서 확인
MYRESULT_BIBS=18915:최유종,20001:홍길동
REFRESH_INTERVAL_MS=30000     # 30초마다 폴링
```

`backend/src/providers/myresultProvider.js`가 각 배번호에 대해 이 API를 호출해서
`records[]`(구간명, km, 통과시각)를 뽑아 옵니다. 2024 JTBC 서울마라톤의 실제 배번호로
응답 구조를 확인하고 만들었기 때문에(`backend/test-fixtures/` 참고) 바로 동작합니다 —
단, 이 저장소를 만든 개발 환경 자체는 네트워크 정책상 myresult.co.kr로 나가는 요청이
막혀 있어서 실제 사이트 응답으로 최종 확인은 못 했고, 로컬 목업 서버로 파이프라인
전체(파싱 → 페이스 계산 → 지도 좌표 변환)만 검증했습니다. 실행 환경에 인터넷이 되면
그대로 동작해야 하지만, 응답 형식이 바뀌었다면 `myresultProvider.js`의
`parsePlayerJson`만 손보면 됩니다.

**참고:** API 응답의 `course.path`/`course.points[].lat,lng`는 실제 코스 좌표가
아닌 것으로 보입니다(일부 지점이 서울이 아닌 제주도 위도에 찍혀 있고, 나머지도
반경 2km 안에 몰려 있어 42.195km 코스와 맞지 않음). 그래서 지도에 그리는 코스 선은
이 API 데이터를 쓰지 않고, 아래에서 설명하는 `course-full.geojson`의 근사 경로를
그대로 사용합니다 — 주자 위치는 API에서 받은 "km 숫자"만으로 그 경로 위에 계산됩니다.

## 스마트칩류 사이트를 HTML로 직접 긁어야 할 때 (대안)

JSON API를 못 찾은 사이트라면 `backend/src/providers/smartchipProvider.js`가
"km 라벨이 있는 헤더 행 + 그 아래 HH:MM:SS 형식의 기록 셀"을 찾는 범용 휴리스틱
파서를 제공합니다. `DATA_SOURCE=smartchip`으로 두고:

```
SMARTCHIP_URL_TEMPLATE=https://smartchip.co.kr/Search_Ballyno.html?usedata={bib}
SMARTCHIP_BIBS=10321:홍길동,10322:김철수
```

이 방식은 실제 페이지로 검증하지 못했으므로(같은 네트워크 제약), 잘 안 맞으면:

1. `.env`에 `DEBUG_HTML=1`을 넣고 실행하면 가져온 HTML이 `backend/.debug-html/`에
   저장됩니다. 실제 페이지 구조를 보고 어디가 안 맞는지 확인하세요.
2. 브라우저 개발자도구로 구간 기록 표의 정확한 선택자를 확인해서
   `SMARTCHIP_SELECTORS`에 JSON으로 넣어주면 (`{"row":"...","km":"...","time":"..."}`)
   범용 파서 대신 그 선택자를 그대로 씁니다.
3. 가능하면 먼저 브라우저 개발자도구 Network 탭에서 JSON API가 있는지부터 확인하세요
   (myresult.co.kr처럼 훨씬 가볍고 안정적입니다).
4. 대회 주최측 이용약관을 확인하고, 짧은 주기로 과도하게 요청하지 마세요
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

## 친구들도 볼 수 있게 배포하기 (Render, 무료)

로컬 `npm run dev`는 내 컴퓨터에서만 보입니다. 친구들도 링크로 볼 수 있게 하려면
[Render](https://render.com)의 무료 웹 서비스에 올리는 걸 추천합니다 — 컴퓨터를 꺼도
계속 떠 있습니다. 이 저장소는 백엔드가 프론트엔드 빌드 결과물을 같이 서빙하도록
되어 있어서(`backend/src/index.js`), 서비스 하나만 만들면 됩니다.

1. https://render.com 에서 GitHub 계정으로 가입/로그인
2. 대시보드에서 **New +** → **Blueprint** 선택 → 이 저장소(`dbwhd0708-hue/smaxx`) 연결
   → 브랜치는 `claude/marathon-runner-tracking-o0efdz` 선택. 저장소 루트의
   `render.yaml`을 Render가 자동으로 읽어서 빌드/시작 명령을 채워줍니다.
   (Blueprint가 안 보이거나 안 되면 **New +** → **Web Service**로 직접 만들고
   Build Command: `npm run build`, Start Command: `npm start`, Root Directory는
   비워두기 — 로 수동 입력해도 동일합니다.)
3. 환경 변수 입력 화면에서:
   - `MYRESULT_EVENT_ID`: 추적할 대회의 myresult 이벤트 ID (예: `92`)
   - `MYRESULT_BIBS`: 항상 보이길 원하는 배번호들, `배번호:이름` 콤마 구분 (선택 사항 —
     비워두고 나중에 화면에서 추가해도 됩니다)
   - 나머지(`DATA_SOURCE`, `MYRESULT_BASE_URL`, `REFRESH_INTERVAL_MS`)는 `render.yaml`에
     이미 기본값이 들어 있어 그대로 두면 됩니다
4. **Create Web Service** 클릭 → 몇 분 기다리면 `https://xxxx.onrender.com` 형태의
   주소가 생깁니다. 그 링크를 친구들에게 공유하면 됩니다.

**알아두면 좋은 점:**
- 무료 플랜은 15분간 접속이 없으면 서버가 잠들고, 다음 접속 때 깨어나느라 30초~1분
  정도 로딩이 걸릴 수 있습니다. 마라톤 당일처럼 계속 볼 때는 한 번 깨워두면 그동안은
  빠릅니다.
- 화면에서 배번호를 추가하면 `backend/data/tracked-runners.json`에 저장되는데, 무료
  플랜은 코드를 새로 배포할 때(= `git push`할 때마다 Render가 자동 재배포) 이 파일이
  초기화될 수 있습니다. 항상 추적하고 싶은 배번호는 `MYRESULT_BIBS` 환경 변수에도
  넣어두면 재배포해도 안전합니다.
- 이후 제가 코드를 고쳐서 브랜치에 푸시하면 Render가 자동으로 재배포합니다(Auto-Deploy
  기본 켜져 있음) — 따로 해주실 건 없습니다.

## 위치 추정 방식

각 주자는 구간 기록이 쌓일 때마다:

1. 마지막으로 태깅된 두 지점의 시간 차이로 현재 페이스(분/km)를 계산
2. `현재 예상 거리 = 마지막 태깅 km + 경과 시간 / 페이스`
3. 그 거리를 코스 라인 위의 좌표로 변환해서 지도에 표시

구간 기록이 하나(출발 기록)뿐이면 `ASSUMED_START_PACE_MIN_PER_KM`(기본 6분/km)을
임시로 사용하다가, 다음 태깅이 들어오면 실제 페이스로 갱신됩니다.
