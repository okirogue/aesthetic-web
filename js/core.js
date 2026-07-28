/* ================= 데이터 레이어 (실배포 시 API 응답으로 교체) ================= */

// 데일리 뉴스 (봇이 news.json으로 저장 → 페이지가 읽음)
let newsUpdated = "2026-07-23 08:00";
let newsDomestic = [
  {co:"파마리서치", time:"07:42", src:"이데일리", url:"#", title:"파마리서치, 리쥬란 유럽 세포라 입점 확대…하반기 매출 기대"},
  {co:"파마리서치", time:"07:05", src:"머니투데이", url:"#", title:"2Q 잠정실적 예고 공정공시 임박, 컨센 상회 전망"},
  {co:"휴젤", time:"08:10", src:"한국경제", url:"#", title:"휴젤, 미국 보툴렉스 처방 실적 순항…3파전 점유 확대"},
  {co:"클래시스", time:"06:55", src:"서울경제", url:"#", title:"클래시스 슈링크 유니버스 국내 설치 대수 사상 최대"},
  {co:"에이피알", time:"07:20", src:"아시아경제", url:"#", title:"에이피알 메디큐브, 미국 아마존 뷰티 랭킹 상위권 유지"},
];
let newsForeign = [
  {co:"Galderma", time:"06:10", src:"Google RSS", url:"#", title:"Galderma reports strong Q2 aesthetics growth, raises FY guidance"},
  {co:"AbbVie/Allergan", time:"05:48", src:"Google RSS", url:"#", title:"Allergan Aesthetics expands Juvederm portfolio in EU market"},
  {co:"Merz Aesthetics", time:"05:30", src:"Google RSS", url:"#", title:"Merz launches new skinbooster line targeting European clinics"},
];
// 커버리지 종목 (뉴스 칩·캘린더 공통 기준 — 뉴스가 0건인 날에도 칩은 항상 노출)
let watchlist = ["파마리서치","휴젤","클래시스","에이피알","엘앤씨바이오","한스바이오메드"];

// 추적 기업 칩: 커버리지 6사 고정 + 뉴스 데이터에 등장한 기업(해외 등) 병합
function deriveNewsCompanies(){
  return [...new Set([...watchlist, ...newsDomestic.map(n=>n.co), ...newsForeign.map(n=>n.co)])];
}
let newsCompanies = deriveNewsCompanies();
let newsActiveKw = null; // null = 전체

const CO_COLORS = {"파마리서치":"#4e9d46","휴젤":"#4a90d9","클래시스":"#e0a13c","에이피알":"#2fa6a6","엘앤씨바이오":"#8f68c9","한스바이오메드":"#d9536f","전 종목 공통":"#9aa4af"};
const companyEvents = {};   // events.json(공시 실데이터)에서 채워짐
function statutoryEvents(year){
  return [
    {date:`${year}-03-31`,type:"filing",title:"사업보고서 제출기한"},
    {date:`${year}-03-27`,type:"meeting",title:"정기주주총회(통상)"},
    {date:`${year}-03-20`,type:"meeting",title:"감사보고서 제출(주총 1주 전)"},
    {date:`${year}-02-13`,type:"earn",title:"결산이사회·잠정실적 데드라인(주총 6주 전)"},
    {date:`${year}-05-15`,type:"filing",title:"1분기보고서 제출기한"},
    {date:`${year}-08-14`,type:"filing",title:"반기보고서 제출기한"},
    {date:`${year}-11-14`,type:"filing",title:"3분기보고서 제출기한"},
    {date:`${year-1}-12-31`,type:"meeting",title:"주총 의결권 기준일"},
  ];
}

// 국내 버즈
let keywords = ["리쥬란","스킨부스터","보툴리눔톡신","울쎄라"];
const KW_COLORS = {"리쥬란":"#6fb43a","스킨부스터":"#4a90d9","보툴리눔톡신":"#8f68c9","울쎄라":"#e0a13c"};
const buzzWeeks = ["6/8","6/15","6/22","6/29","7/6","7/13","7/20"];
const buzzSeries = {
  "리쥬란":[820,910,880,1040,1180,1320,1510],
  "스킨부스터":[640,700,720,690,760,810,870],
  "보툴리눔톡신":[1200,1180,1250,1210,1300,1280,1340],
  "울쎄라":[430,460,440,500,520,560,610],
};
// 후기: 키워드 카테고리별 (표출은 최대 10개)
const reviewsByKw = {
  "리쥬란":[
    {src:"네이버 블로그 · 7/21",senti:"pos",body:"리쥬란 힐러 3회차 끝나고 피부 결이 확실히 매끈해졌어요. 붓기도 덜하고 회복 빠름."},
    {src:"네이버 블로그 · 7/18",senti:"pos",body:"리쥬란 아이 눈밑에 맞았는데 잔주름이랑 다크서클 톤이 밝아진 느낌. 재방문 의사 있음."},
    {src:"네이버 카페 · 7/17",senti:"neu",body:"리쥬란 vs 쥬베룩 고민 중인데 둘 다 결은 좋아진다는 후기가 많네요."},
    {src:"네이버 블로그 · 7/16",senti:"pos",body:"결혼 앞두고 리쥬란 스킨부스터 시작. 화장 안 먹던 부분이 확실히 나아짐."},
    {src:"네이버 카페 · 7/15",senti:"neg",body:"리쥬란 시술 당일 통증이 생각보다 있었어요. 마취크림 꼭 챙기세요."},
  ],
  "보툴리눔톡신":[
    {src:"네이버 블로그 · 7/20",senti:"neu",body:"톡신 종류별 차이 정리. 지속력은 제품마다 다르니 상담 필수."},
    {src:"네이버 블로그 · 7/19",senti:"neg",body:"톡신 맞고 표정이 살짝 부자연스러워서 다음엔 용량 줄여달라고 해야겠어요."},
    {src:"네이버 카페 · 7/18",senti:"pos",body:"사각턱 톡신 3주차, 갸름해진 게 눈에 보여서 만족도 높음."},
    {src:"네이버 블로그 · 7/16",senti:"pos",body:"이마 주름 톡신 처음인데 자연스럽게 잘 잡혔어요."},
  ],
  "스킨부스터":[
    {src:"네이버 카페 · 7/20",senti:"neu",body:"스킨부스터 종류가 너무 많아 뭐가 맞는지 상담받고 결정. 병원마다 가격 편차 큼."},
    {src:"네이버 블로그 · 7/18",senti:"pos",body:"스킨부스터 2회 후 속건조가 줄고 광이 도는 느낌."},
    {src:"네이버 블로그 · 7/15",senti:"pos",body:"환절기 푸석함 때문에 시작했는데 확실히 촉촉해졌어요."},
  ],
  "울쎄라":[
    {src:"네이버 블로그 · 7/19",senti:"pos",body:"울쎄라 리프팅 한 달차, 턱선 라인이 살아나는 중."},
    {src:"네이버 카페 · 7/17",senti:"neg",body:"울쎄라 시술 통증 후기 많아 걱정. 수면 옵션 문의함."},
    {src:"네이버 블로그 · 7/14",senti:"neu",body:"울쎄라 vs 슈링크 비교 상담. 목적에 따라 다르다네요."},
  ],
};

// 해외 버즈 (eu_buzz.json — 유럽 침투도·후기·Big6 구글트렌드)
const EU_KW_COLORS={"Rejuran":"#e07b28","Profhilo":"#8f68c9","Sculptra":"#4a90d9","Plinest":"#4e9d46","Sunekos":"#c95f8f"};
let euDoc=null, euGeo="GB", euWeek=null, euPeriodW=52, euTrendChart=null, euCountryChart=null, euClinicsOpen=false;

// 수출 데이터 (TRASS · exports_trass_raw.json)
let expInited=false, expData=null, expIns=null, expInsMonth=null, expCharts={};
const EXP_NAT_COLORS={"미국":"#4a90d9","리투아니아":"#8f68c9","싱가포르":"#2fa6a6","프랑스":"#e0a13c","중국":"#d9536f","기타":"#9aa4af"};

