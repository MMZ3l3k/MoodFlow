import { jsPDF } from 'jspdf';

// ─── Types ────────────────────────────────────────────────────────────────
interface RiskItem {
  key: string; label: string; icon: string; assessmentCode: string;
  currentCount: number; previousCount: number;
  currentPct: number; previousPct: number; delta: number;
}
interface RiskReport { totalActive: number; risks: RiskItem[]; }
interface DeptLoad {
  department: string; deptSize: number; participants: number;
  wellbeingIndex: number | null;
  load: 'stable' | 'moderate' | 'high' | 'no_data';
  trend: 'improving' | 'worsening' | 'stable' | 'no_data';
}
interface TrendPoint { week: string; avgScore: number; count: number; assessmentCode: string; }
interface SeverityItem { severity: string; count: number; }
interface CriticalChange {
  department: string; recentIndex: number; prevIndex: number; drop: number;
  direction: 'worsening' | 'improving'; severity: 'critical' | 'warning';
}
interface Summary {
  totalActiveUsers: number; totalResultsSubmitted: number;
  avgNormalizedScore: number; participationRate: number;
}
export interface ReportData {
  generatedAt: string;
  filters: { dateFrom: string; dateTo: string; department: string; assessmentCode: string };
  summary: Summary;
  trends: TrendPoint[];
  deptLoad: DeptLoad[];
  severity: SeverityItem[];
  riskReport: RiskReport;
  criticalChanges: CriticalChange[];
}

// ─── Color palette ────────────────────────────────────────────────────────
type RGB = [number, number, number];
const C: Record<string, RGB> = {
  emerald:  [16, 185, 129],
  emeraldD: [5, 150, 105],
  emeraldL: [209, 250, 229],
  indigo:   [99, 102, 241],
  indigoL:  [224, 231, 255],
  dark:     [17, 24, 39],
  gray:     [75, 85, 99],
  light:    [156, 163, 175],
  border:   [209, 213, 219],
  bg:       [249, 250, 251],
  bg2:      [243, 244, 246],
  white:    [255, 255, 255],
  red:      [220, 38, 38],
  redL:     [254, 226, 226],
  amber:    [217, 119, 6],
  amberL:   [254, 243, 199],
  green:    [22, 163, 74],
  greenL:   [220, 252, 231],
  orange:   [234, 88, 12],
  orangeL:  [255, 237, 213],
  purple:   [124, 58, 237],
  purpleL:  [237, 233, 254],
  blue:     [37, 99, 235],
  blueL:    [219, 234, 254],
  slate:    [51, 65, 85],
};

// ─── Transliteration (jsPDF Helvetica = Latin-1) ─────────────────────────
function p(s: string): string {
  return s
    .replace(/ą/g,'a').replace(/Ą/g,'A').replace(/ę/g,'e').replace(/Ę/g,'E')
    .replace(/ó/g,'o').replace(/Ó/g,'O').replace(/ś/g,'s').replace(/Ś/g,'S')
    .replace(/ź/g,'z').replace(/Ź/g,'Z').replace(/ż/g,'z').replace(/Ż/g,'Z')
    .replace(/ć/g,'c').replace(/Ć/g,'C').replace(/ń/g,'n').replace(/Ń/g,'N')
    .replace(/ł/g,'l').replace(/Ł/g,'L').replace(/–/g,'-').replace(/—/g,'-');
}

// ─── Label maps ──────────────────────────────────────────────────────────
const SEV_LABELS: Record<string,string> = {
  minimal:'Minimalne', mild:'Lagodne', moderate:'Umiarkowane',
  moderately_severe:'Umiark. ciezkie', severe:'Ciezkie',
  high:'Wysokie', low:'Niskie', average:'Przecietne',
  'low-distress':'Niski stres','moderate-distress':'Umiark. stres','high-distress':'Wysoki stres',
  low_wellbeing:'Niski dobrostan', adequate_wellbeing:'Wystarczajacy', good:'Dobry', very_low:'Bardzo niski',
};
const SEV_COLORS: Record<string,RGB> = {
  minimal:[22,163,74], mild:[101,163,13], moderate:[217,119,6],
  moderately_severe:[234,88,12], severe:[220,38,38], high:[220,38,38],
  low:[22,163,74], average:[37,99,235],
  'low-distress':[22,163,74],'moderate-distress':[217,119,6],'high-distress':[220,38,38],
  low_wellbeing:[220,38,38], adequate_wellbeing:[22,163,74], good:[22,163,74], very_low:[220,38,38],
};
const ZONE_LABELS: Record<string,string> = {
  stable:'Dobry (>=65)', moderate:'Umiarkowany (45-64)', high:'Wysoki risk (<45)', no_data:'Brak danych',
};
const ZONE_COLORS: Record<string,RGB> = {
  stable:[22,163,74], moderate:[217,119,6], high:[220,38,38], no_data:[148,163,184],
};
const RISK_COLORS: Record<string,RGB> = {
  stress:[234,88,12], depression:[124,58,237], anxiety:[37,99,235], burnout:[220,38,38],
};
const RISK_DETAILS: Record<string,{test:string;threshold:string;what:string}> = {
  stress:    {test:'PSS-10',threshold:'>= 27 / 40 pkt',what:'Wysoki poziom odczuwanego stresu i braku kontroli nad sytuacjami dnia codziennego.'},
  depression:{test:'PHQ-9', threshold:'>= 10 / 27 pkt',what:'Mozliwe objawy obnizenia nastroju, braku energii i trudnosci z koncentracja.'},
  anxiety:   {test:'GAD-7', threshold:'>= 10 / 21 pkt',what:'Trudnosci z lekiem, napieciem i problemami z relaksacja.'},
  burnout:   {test:'MOOD-10',threshold:'<= 30 / 50 pkt',what:'Niski poziom nastroju i energii — mozliwy sygnal wczesnego wypalenia zawodowego.'},
};

// ─── Page constants ───────────────────────────────────────────────────────
const ML  = 12;        // margin left/right
const PW  = 210;       // A4 width mm
const PH  = 297;       // A4 height mm
const CW  = PW-ML*2;  // content width = 186mm
const FOOTER_H = 14;
const HEADER_H = 12;

// ─── State ────────────────────────────────────────────────────────────────
let Y   = 0;
let DOC: jsPDF;
let GEN = '';
let PG  = 1;

// ─── Low-level drawing ───────────────────────────────────────────────────
const fc  = (c:RGB) => DOC.setFillColor(c[0],c[1],c[2]);
const sc  = (c:RGB) => DOC.setDrawColor(c[0],c[1],c[2]);
const tc  = (c:RGB) => DOC.setTextColor(c[0],c[1],c[2]);
const lw  = (w:number) => DOC.setLineWidth(w);

function fillRect(x:number,y:number,w:number,h:number,color:RGB){
  fc(color); DOC.rect(x,y,w,h,'F');
}
function strokeRect(x:number,y:number,w:number,h:number,color:RGB,width=0.2){
  lw(width); sc(color); DOC.rect(x,y,w,h,'S');
}
function hLine(x:number,y:number,w:number,color:RGB=C.border,width=0.2){
  lw(width); sc(color); DOC.line(x,y,x+w,y);
}

function text(
  str:string, x:number, y:number,
  opts:{sz?:number;bold?:boolean;col?:RGB;align?:'left'|'center'|'right';maxW?:number}={}
){
  DOC.setFont('helvetica', opts.bold?'bold':'normal');
  DOC.setFontSize(opts.sz??9);
  tc(opts.col??C.dark);
  DOC.text(p(str), x, y, {align:opts.align??'left', maxWidth:opts.maxW});
}

function bar(x:number,y:number,w:number,h:number,pct:number,color:RGB){
  fillRect(x,y,w,h,C.bg2);
  if(pct>0) fillRect(x,y,Math.min(w*pct/100,w),h,color);
  lw(0.15); sc(C.border); DOC.rect(x,y,w,h,'S');
}

// ─── Page management ─────────────────────────────────────────────────────
function drawFooter(){
  fillRect(0, PH-FOOTER_H, PW, FOOTER_H, C.bg2);
  hLine(0, PH-FOOTER_H, PW, C.border, 0.3);
  text(`MoodFlow - Raport dobrostanu pracownikow  |  ${new Date(GEN).toLocaleDateString('pl-PL')}  |  Dane zagregowane, anonimowe`,
    ML, PH-5, {sz:7.5, col:C.light});
  text(`Strona ${PG}`, PW-ML, PH-5, {sz:7.5, col:C.slate, align:'right', bold:true});
}

function drawRunHeader(){
  fillRect(0,0,PW,HEADER_H,C.slate);
  text('MoodFlow', ML, 8, {sz:8, bold:true, col:C.emerald});
  text('Raport dobrostanu pracownikow', ML+22, 8, {sz:8, col:C.light});
  text(`Strona ${PG}`, PW-ML, 8, {sz:8, col:C.white, align:'right', bold:true});
}

function newPage(){
  drawFooter();
  DOC.addPage();
  PG++;
  drawRunHeader();
  Y = HEADER_H+6;
}

function need(h:number){
  if(Y+h > PH-FOOTER_H-6) newPage();
}

// ─── Layout components ───────────────────────────────────────────────────

function gap(n=6){ Y+=n; }

function sectionHeader(num:number, title:string, color:RGB){
  need(16);
  gap(4);
  fillRect(ML, Y, CW, 12, color);
  // left accent strip
  fillRect(ML, Y, 4, 12, [color[0]-20,color[1]-20,color[2]-20] as RGB);
  text(`${num}.  ${title}`, ML+8, Y+8.5, {sz:11, bold:true, col:C.white});
  Y+=15;
}

function infoBox(text_:string, bg:RGB, border:RGB){
  const lines = DOC.splitTextToSize(p(text_), CW-10);
  const h = lines.length*5.5+8;
  need(h+4);
  fillRect(ML,Y,CW,h,bg);
  strokeRect(ML,Y,CW,h,border,0.3);
  DOC.setFont('helvetica','normal');
  DOC.setFontSize(8.5);
  tc(C.gray);
  DOC.text(lines, ML+5, Y+6);
  Y+=h+5;
}

// KPI row — 2 or 4 boxes per row
function kpiRow(items:{label:string;val:string;sub:string;accent:RGB}[]){
  const cols = items.length;
  const w = CW/cols;
  const h = 28;
  need(h+4);
  items.forEach((item,i)=>{
    const x = ML+i*w;
    fillRect(x,Y,w-1,h,C.white);
    strokeRect(x,Y,w-1,h,C.border,0.2);
    fillRect(x,Y,4,h,item.accent);
    text(item.label, x+7, Y+7, {sz:7.5, col:C.light});
    text(item.val,   x+7, Y+18, {sz:15, bold:true, col:C.dark});
    text(item.sub,   x+7, Y+25, {sz:7.5, col:item.accent});
  });
  Y+=h+5;
}

// Table with auto page break per row
function drawTable(
  headers:string[],
  rows:(string|{t:string;bold?:boolean;col?:RGB})[][],
  colW:number[],
  headerBg:RGB=C.slate,
  rowH=9
){
  const totalW = colW.reduce((a,b)=>a+b,0);
  need(rowH+4);

  // header
  fillRect(ML,Y,totalW,rowH,headerBg);
  let cx=ML;
  headers.forEach((h,i)=>{
    text(h, cx+3, Y+6.5, {sz:7.5, bold:true, col:C.white});
    cx+=colW[i];
  });
  Y+=rowH;

  rows.forEach((row,ri)=>{
    need(rowH);
    const bg = ri%2===0 ? C.white : C.bg;
    fillRect(ML,Y,totalW,rowH,bg);
    hLine(ML,Y+rowH,totalW,C.border,0.15);

    cx=ML;
    row.forEach((cell,ci)=>{
      const isObj = typeof cell==='object';
      const str  = isObj ? (cell as {t:string}).t : cell as string;
      const bold = isObj ? !!(cell as {bold?:boolean}).bold : false;
      const col  = isObj ? (cell as {col?:RGB}).col : undefined;
      text(str, cx+3, Y+6.5, {sz:8, bold, col:col??C.dark});
      cx+=colW[ci];
    });
    Y+=rowH;
  });

  // outer border
  lw(0.3); sc(C.border);
  DOC.rect(ML, Y-rowH*(rows.length+1), totalW, rowH*(rows.length+1), 'S');
  gap(6);
}

// Risk card — full width card per risk
function riskCard(risk:RiskItem, color:RGB){
  const detail = RISK_DETAILS[risk.icon];
  const h = 36;
  need(h+4);

  fillRect(ML,Y,CW,h,C.white);
  strokeRect(ML,Y,CW,h,color,0.4);
  fillRect(ML,Y,5,h,color);

  // Big percentage
  text(`${risk.currentPct}%`, PW-ML-3, Y+16, {sz:22, bold:true, col:color, align:'right'});

  // Label
  text(risk.label, ML+9, Y+9, {sz:12, bold:true, col:C.dark});

  // Test + threshold
  if(detail) text(`Test: ${detail.test}   |   Prog ryzyka: ${detail.threshold}`, ML+9, Y+16, {sz:8, col:C.gray});

  // Progress bar
  bar(ML+9, Y+20, CW-55, 5, risk.currentPct, color);

  // Prev + delta
  const dCol:RGB = risk.delta>0?C.red:risk.delta<0?C.green:C.light;
  const dStr = risk.delta>0?`+${risk.delta}% wzrost`:risk.delta<0?`${risk.delta}% spadek`:'bez zmian';
  text(`Poprzedni okres: ${risk.previousPct}%  |  Zmiana: ${dStr}`, ML+9, Y+30, {sz:8, col:dCol});

  // What it means
  if(detail) text(detail.what, ML+9, Y+35.5, {sz:7.5, col:C.light, maxW:CW-55});

  // Count
  text(`${risk.currentCount} os.`, PW-ML-3, Y+26, {sz:8, col:C.gray, align:'right'});

  Y+=h+4;
}

// Bar chart drawn with rectangles
function barChart(items:{label:string;value:number;color:RGB}[], chartH=55){
  if(items.length===0) return;
  need(chartH+18);

  const chartX = ML+16;
  const chartW = CW-18;
  const baseY  = Y+chartH;

  // Y grid
  fillRect(ML+16,Y,chartW,chartH,C.bg);
  [0,25,50,75,100].forEach(v=>{
    const yy = Y+chartH-(v/100)*chartH;
    hLine(chartX,yy,chartW,C.border,0.15);
    text(String(v), chartX-3, yy+1, {sz:6.5, col:C.light, align:'right'});
  });

  const barW = Math.min(22,(chartW/items.length)*0.6);
  const slotW = chartW/items.length;

  items.forEach((item,i)=>{
    const bH = Math.max(1,(item.value/100)*chartH);
    const bX = chartX+i*slotW+(slotW-barW)/2;
    const bY = baseY-bH;

    fillRect(bX,bY,barW,bH,item.color);
    strokeRect(bX,bY,barW,bH,item.color,0.1);

    // value above
    text(String(item.value), bX+barW/2, bY-2, {sz:7, bold:true, col:C.dark, align:'center'});

    // label below
    const lbl = item.label.length>9?item.label.slice(0,8)+'.':item.label;
    text(p(lbl), bX+barW/2, baseY+5, {sz:6, col:C.gray, align:'center'});
  });

  Y+=chartH+14;
}

// Line chart
function lineChart(points:{week:string;avgScore:number}[], chartH=55){
  if(points.length<2) return;
  need(chartH+18);

  const chartX = ML+16;
  const chartW = CW-18;
  const baseY  = Y+chartH;

  fillRect(chartX-2,Y,chartW+4,chartH,C.bg);

  // Grid
  [0,25,50,75,100].forEach(v=>{
    const yy = Y+chartH-(v/100)*chartH;
    hLine(chartX,yy,chartW,C.border,0.15);
    text(String(v), chartX-3, yy+1, {sz:6.5, col:C.light, align:'right'});
  });

  const xStep = chartW/(points.length-1);

  // Filled area under the line
  const areaPath: [number,number][] = points.map((pt,i)=>[
    chartX+i*xStep,
    Y+chartH-((pt.avgScore/100)*chartH)
  ]);
  // Draw as thin rects (approximation)
  for(let i=0;i<areaPath.length-1;i++){
    const x1=areaPath[i][0], y1=areaPath[i][1];
    const x2=areaPath[i+1][0], y2=areaPath[i+1][1];
    const topY=Math.min(y1,y2);
    const botY=baseY;
    fc([209,250,229]);
    DOC.triangle(x1,y1,x2,y2,x1,botY,'F');
    DOC.triangle(x2,y2,x1,botY,x2,botY,'F');
  }

  // Line segments
  lw(1.0); sc(C.emerald);
  for(let i=0;i<areaPath.length-1;i++){
    DOC.line(areaPath[i][0],areaPath[i][1],areaPath[i+1][0],areaPath[i+1][1]);
  }

  // Dots
  areaPath.forEach(([x,y])=>{
    fc(C.white); sc(C.emerald); lw(0.5);
    DOC.circle(x,y,1.5,'FD');
  });

  // X axis labels (max ~7)
  const step=Math.max(1,Math.floor(points.length/7));
  points.forEach((pt,i)=>{
    if(i%step===0||i===points.length-1){
      const x=chartX+i*xStep;
      text(pt.week.slice(5), x, baseY+5, {sz:6, col:C.light, align:'center'});
    }
  });

  // Border
  strokeRect(chartX-2,Y,chartW+4,chartH,C.border,0.2);

  Y+=chartH+14;
}

// ─── Cover page ───────────────────────────────────────────────────────────
function drawCover(data:ReportData){
  // Top accent bar
  fillRect(0,0,PW,8,C.emerald);
  fillRect(0,8,PW,2,C.emeraldD);

  // Brand strip
  Y=18;
  fillRect(ML,Y,CW,18,C.slate);
  text('MoodFlow', ML+5, Y+12, {sz:14, bold:true, col:C.emerald});
  text('System monitorowania dobrostanu pracownikow', ML+50, Y+12, {sz:9, col:C.light});
  text(new Date(GEN).toLocaleString('pl-PL'), PW-ML-3, Y+12, {sz:8.5, col:C.light, align:'right'});
  Y+=22;

  gap(8);
  text('Raport dobrostanu pracownikow', ML, Y, {sz:26, bold:true, col:C.dark});
  Y+=10;
  hLine(ML,Y,CW,C.emerald,1.5);
  Y+=6;
  text('Kompleksowy raport HR z analiza dobrostanu, ryzyk, trendow i zmian krytycznych', ML, Y, {sz:11, col:C.gray});
  Y+=12;

  // Filter cards
  const filters=[
    {label:'OKRES ANALIZY',    val:`${data.filters.dateFrom}  —  ${data.filters.dateTo}`, accent:C.emerald, bg:C.emeraldL},
    {label:'DZIAL',            val:data.filters.department||'Cala firma', accent:C.indigo, bg:C.indigoL},
    {label:'TYP TESTU',        val:data.filters.assessmentCode||'Wszystkie testy', accent:C.slate, bg:C.bg2},
  ];
  const fw = (CW-6)/3;
  filters.forEach((f,i)=>{
    const x=ML+i*(fw+3);
    fillRect(x,Y,fw,20,f.bg);
    fillRect(x,Y,fw,3,f.accent);
    strokeRect(x,Y,fw,20,f.accent,0.3);
    text(f.label, x+4, Y+9, {sz:7.5, bold:true, col:f.accent});
    text(f.val,   x+4, Y+17, {sz:9, bold:true, col:C.dark});
  });
  Y+=26;

  // Wellbeing index highlight
  const wbi = data.summary.avgNormalizedScore;
  const wbLabel = wbi>=80?'Bardzo dobry':wbi>=60?'Dobry':wbi>=40?'Umiarkowany':'Wymaga uwagi';
  const wbCol:RGB = wbi>=80?C.green:wbi>=60?C.amber:wbi>=40?C.orange:C.red;

  gap(4);
  fillRect(ML,Y,CW,38,C.bg2);
  strokeRect(ML,Y,CW,38,wbCol,0.5);
  fillRect(ML,Y,6,38,wbCol);

  text('OGOLNY INDEKS DOBROSTANU ORGANIZACJI', ML+10, Y+8, {sz:8.5, bold:true, col:C.gray});
  text(`${wbi} / 100`, ML+10, Y+24, {sz:28, bold:true, col:wbCol});
  text(wbLabel, ML+10, Y+33, {sz:10, bold:true, col:wbCol});

  // Scale legend on the right
  const scaleX = ML+90;
  text('Skala interpretacji:', scaleX, Y+8, {sz:8, bold:true, col:C.gray});
  [
    {r:'80-100', l:'Bardzo dobry', c:C.green},
    {r:'60-79',  l:'Dobry',        c:C.amber},
    {r:'40-59',  l:'Umiarkowany',  c:C.orange},
    {r:'0-39',   l:'Wymaga uwagi', c:C.red},
  ].forEach(({r,l,c},i)=>{
    fillRect(scaleX, Y+13+i*6, 3, 4, c);
    text(`${r}: ${l}`, scaleX+6, Y+17+i*6, {sz:8, col:C.dark});
  });
  Y+=44;

  gap(6);

  // KPI summary row
  kpiRow([
    {label:'Aktywni pracownicy', val:String(data.summary.totalActiveUsers),        sub:'Status ACTIVE w systemie',       accent:C.blue},
    {label:'Wskaznik uczestnictwa', val:`${data.summary.participationRate}%`,      sub:'Min. 1 wypelniony test',          accent:C.purple},
    {label:'Lacznie wypelnien', val:String(data.summary.totalResultsSubmitted),    sub:'Wszystkie zlezone wyniki',        accent:C.amber},
    {label:'Zmian krytycznych', val:String(data.criticalChanges.filter(c=>c.direction==='worsening').length), sub:'Wymagajacych uwagi', accent:data.criticalChanges.some(c=>c.direction==='worsening')?C.red:C.green},
  ]);

  // TOC
  gap(4);
  fillRect(ML,Y,CW,62,C.bg2);
  strokeRect(ML,Y,CW,62,C.border,0.3);
  fillRect(ML,Y,CW,10,C.slate);
  text('SPIS TRESCI', ML+5, Y+7.5, {sz:9, bold:true, col:C.white});
  Y+=13;
  const toc=[
    {n:'1', t:'Podsumowanie wykonawcze — KPI organizacji'},
    {n:'2', t:'Ogolny stan zdrowia psychicznego firmy'},
    {n:'3', t:'Raport per dzial / zespol — ranking i porownanie'},
    {n:'4', t:'Raport trendow — zmiany w czasie'},
    {n:'5', t:'Raport ryzyk — obszary podwyzszonego zagrozenia'},
    {n:'6', t:'Zmiany krytyczne — nagle zmiany w dzialach'},
    {n:'7', t:'Rozklad nasilenia objawow'},
  ];
  toc.forEach((item,i)=>{
    hLine(ML+4, Y+7.5*i, CW-8, C.border, 0.1);
    fillRect(ML+4, Y+7.5*i, 6, 6, C.emerald);
    text(item.n, ML+7, Y+7.5*i+5, {sz:7.5, bold:true, col:C.white});
    text(item.t, ML+14, Y+7.5*i+5, {sz:8.5, col:C.dark});
  });
  Y+=7.5*toc.length+4;

  drawFooter();
}

// ─── Main function ────────────────────────────────────────────────────────
export function buildReportPdf(data:ReportData): jsPDF {
  DOC = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
  GEN = data.generatedAt;
  PG  = 1;
  Y   = 0;

  // ── COVER ──────────────────────────────────────────────────────────────
  drawCover(data);

  // ── PAGE 2 ─────────────────────────────────────────────────────────────
  DOC.addPage();
  PG++;
  drawRunHeader();
  Y = HEADER_H+8;

  // ── SEKCJA 1: PODSUMOWANIE WYKONAWCZE ─────────────────────────────────
  sectionHeader(1, 'Podsumowanie wykonawcze', C.emerald);

  const wbi = data.summary.avgNormalizedScore;
  const wbLabel = wbi>=80?'Bardzo dobry':wbi>=60?'Dobry':wbi>=40?'Umiarkowany':'Wymaga uwagi';
  const wbCol:RGB = wbi>=80?C.green:wbi>=60?C.amber:wbi>=40?C.orange:C.red;

  kpiRow([
    {label:'Indeks dobrostanu',      val:`${wbi} / 100`,  sub:wbLabel,             accent:wbCol},
    {label:'Aktywni pracownicy',     val:String(data.summary.totalActiveUsers),      sub:'Status ACTIVE',        accent:C.blue},
    {label:'Uczestnictwo',           val:`${data.summary.participationRate}%`,       sub:'Min. 1 test',          accent:C.purple},
    {label:'Lacznie wypelnien',      val:String(data.summary.totalResultsSubmitted), sub:'Wszystkie wyniki',     accent:C.amber},
  ]);

  infoBox(
    `Indeks dobrostanu organizacji wynosi ${wbi}/100 (${wbLabel}). ` +
    `Jest to wazona srednia z pieciu standaryzowanych testow psychologicznych: WHO-5 (waga 30%), ` +
    `PSS-10 (20%), PHQ-9 (20%), GAD-7 (15%), MOOD-10 (15%). Kazdy wynik jest normalizowany ` +
    `do skali 0-100 przed usrednieniem, gdzie wyzszy wynik oznacza lepszy dobrostan. ` +
    `W badanym okresie uczestniczylo ${data.summary.totalActiveUsers} aktywnych pracownikow, ` +
    `a wskaznik uczestnictwa wyniosl ${data.summary.participationRate}%.`,
    C.greenL, C.green
  );

  // ── SEKCJA 2: OGÓLNY STAN ─────────────────────────────────────────────
  sectionHeader(2, 'Ogolny stan zdrowia psychicznego firmy', C.emerald);

  // Zone distribution table
  const zoneMap:Record<string,number>={};
  data.deptLoad.forEach(d=>{ zoneMap[d.load]=(zoneMap[d.load]??0)+1; });
  const totalDepts = data.deptLoad.length;

  need(14);
  text('Strefy dobrostanu dzialow — klasyfikacja wg indeksu (ostatnie 30 dni)', ML, Y, {sz:10, bold:true, col:C.dark});
  Y+=7;

  const zoneRows = Object.entries(ZONE_LABELS).map(([key,label])=>{
    const count = zoneMap[key]??0;
    const pct   = totalDepts>0?Math.round((count/totalDepts)*100):0;
    return {key,label,count,pct,color:ZONE_COLORS[key]};
  }).filter(z=>z.count>0||z.key!=='no_data');

  zoneRows.forEach(z=>{
    need(11);
    fillRect(ML,Y,CW,9,C.bg);
    fillRect(ML,Y,5,9,z.color);
    strokeRect(ML,Y,CW,9,C.border,0.15);
    text(`${z.label}: ${z.count} dzialow (${z.pct}%)`, ML+9, Y+6.5, {sz:9, bold:true, col:C.dark});
    bar(ML+100, Y+2.5, CW-104, 4, z.pct, z.color);
    text(`${z.pct}%`, ML+CW-2, Y+6.5, {sz:8.5, bold:true, col:z.color, align:'right'});
    Y+=10;
  });
  gap(6);

  // Risk overview bars
  need(14);
  text('Glowne obszary ryzyka — przeglad (% aktywnych pracownikow)', ML, Y, {sz:10, bold:true, col:C.dark});
  Y+=4;
  infoBox('Ponizsza analiza obejmuje ostatnie 30 dni. Zmiana (delta) porownuje biezacy okres z poprzednim 30-dniowym okresem.', C.amberL, C.amber);

  data.riskReport.risks.forEach(risk=>riskCard(risk, RISK_COLORS[risk.icon]??C.orange));

  // ── SEKCJA 3: PER DZIAŁ ───────────────────────────────────────────────
  sectionHeader(3, 'Raport per dzial / zespol', C.slate);

  const ranked = [...data.deptLoad]
    .filter(d=>d.wellbeingIndex!==null)
    .sort((a,b)=>(b.wellbeingIndex??0)-(a.wellbeingIndex??0));
  const best  = ranked[0];
  const worst = ranked[ranked.length-1];

  // Highlights
  if(best && worst && best.department!==worst.department){
    need(22);
    const hw=(CW-4)/2;
    // Best
    fillRect(ML,Y,hw,20,C.greenL);
    strokeRect(ML,Y,hw,20,C.green,0.4);
    fillRect(ML,Y,5,20,C.green);
    text('NAJLEPSZY WELLBEING', ML+8, Y+7, {sz:7.5, bold:true, col:C.green});
    text(best.department, ML+8, Y+15, {sz:12, bold:true, col:[20,83,45]as RGB});
    text(`Indeks: ${best.wellbeingIndex} / 100`, ML+8, Y+20, {sz:8.5, col:C.green});
    // Worst
    const wx=ML+hw+4;
    fillRect(wx,Y,hw,20,C.redL);
    strokeRect(wx,Y,hw,20,C.red,0.4);
    fillRect(wx,Y,5,20,C.red);
    text('WYMAGA UWAGI', wx+8, Y+7, {sz:7.5, bold:true, col:C.red});
    text(worst.department, wx+8, Y+15, {sz:12, bold:true, col:[127,29,29]as RGB});
    text(`Indeks: ${worst.wellbeingIndex} / 100`, wx+8, Y+20, {sz:8.5, col:C.red});
    Y+=24;
  }

  // Bar chart
  if(ranked.length>0){
    need(75);
    text('Porownanie dzialow — indeks dobrostanu (0-100)', ML, Y, {sz:10, bold:true, col:C.dark});
    Y+=5;
    barChart(ranked.map(d=>({
      label:d.department,
      value:d.wellbeingIndex??0,
      color:(d.wellbeingIndex??0)>=65?C.green:(d.wellbeingIndex??0)>=45?C.amber:C.red,
    })));
  }

  // Ranking table
  need(16);
  text('Ranking dzialow — od najlepszego do najgorszego indeksu dobrostanu', ML, Y, {sz:10, bold:true, col:C.dark});
  Y+=4;
  text('Trend porownuje indeks z ostatnich 14 dni z poprzednimi 14 dniami (zmiana > 5 pkt = poprawa/pogorszenie)', ML, Y, {sz:8, col:C.gray});
  Y+=5;

  drawTable(
    ['#','Dzial','Pracownicy','Uczestnicy','Indeks (0-100)','Strefa ryzyka','Trend (14 dni)'],
    [...data.deptLoad]
      .sort((a,b)=>{
        if(a.wellbeingIndex===null)return 1;
        if(b.wellbeingIndex===null)return -1;
        return b.wellbeingIndex-a.wellbeingIndex;
      })
      .map((d,i)=>{
        const zL=ZONE_LABELS[d.load]??d.load;
        const zC=ZONE_COLORS[d.load]??C.light;
        const tStr=d.trend==='improving'?'↑ Poprawa':d.trend==='worsening'?'↓ Pogorszenie':'→ Stabilny';
        const tCol:RGB=d.trend==='improving'?C.green:d.trend==='worsening'?C.red:C.gray;
        const idxCol:RGB=(d.wellbeingIndex??0)>=65?C.green:(d.wellbeingIndex??0)>=45?C.amber:C.red;
        return [
          {t:String(i+1), col:C.light},
          {t:d.department, bold:true},
          {t:String(d.deptSize)},
          {t:String(d.participants)},
          {t:d.wellbeingIndex!==null?`${d.wellbeingIndex}`:'—', bold:true, col:idxCol},
          {t:zL, bold:true, col:zC},
          {t:tStr, bold:true, col:tCol},
        ];
      }),
    [10,48,24,24,28,34,28],
    C.slate, 10
  );

  // ── SEKCJA 4: TRENDY ──────────────────────────────────────────────────
  sectionHeader(4, 'Raport trendow — zmiany w czasie', C.indigo);

  const byWeek = Object.values(
    data.trends.reduce<Record<string,{week:string;avgScore:number;count:number}>>((acc,item)=>{
      if(!acc[item.week]) acc[item.week]={week:item.week,avgScore:item.avgScore,count:item.count};
      else {
        const tot=acc[item.week].avgScore*acc[item.week].count+item.avgScore*item.count;
        const n=acc[item.week].count+item.count;
        acc[item.week]={week:item.week,avgScore:Math.round((tot/n)*10)/10,count:n};
      }
      return acc;
    },{})
  ).sort((a,b)=>a.week.localeCompare(b.week));

  if(byWeek.length>=2){
    const first=byWeek[0].avgScore;
    const last =byWeek[byWeek.length-1].avgScore;
    const diff =Math.round((last-first)*10)/10;
    const dCol:RGB=diff>0?C.green:diff<0?C.red:C.gray;

    kpiRow([
      {label:'Wynik na poczatku okresu', val:`${first} / 100`, sub:byWeek[0].week,                       accent:C.indigo},
      {label:'Wynik na koncu okresu',    val:`${last} / 100`,  sub:byWeek[byWeek.length-1].week,         accent:C.emerald},
      {label:'Zmiana w okresie',         val:`${diff>0?'+':''}${diff}`, sub:diff>0?'Poprawa':diff<0?'Pogorszenie':'Stabilny', accent:dCol},
      {label:'Tygodni danych',           val:String(byWeek.length),     sub:'Punkty na wykresie',        accent:C.amber},
    ]);

    need(80);
    text('Wykres trendu tygodniowego — sredni wynik (0-100)', ML, Y, {sz:10, bold:true, col:C.dark});
    Y+=4;
    text('Kazdy punkt = srednia ze wszystkich testow zlozonych w danym tygodniu. Wyzszy wynik = lepszy dobrostan.', ML, Y, {sz:8, col:C.gray});
    Y+=5;
    lineChart(byWeek, 60);

    infoBox(
      'Skala wyniku: 80-100 = Bardzo dobry  |  60-79 = Dobry  |  40-59 = Umiarkowany  |  0-39 = Wymaga uwagi. ' +
      'Wynik jest normalizowany niezaleznie od rodzaju testu (WHo-5, PSS-10, PHQ-9, GAD-7, MOOD-10).',
      C.indigoL, C.indigo
    );
  } else {
    infoBox('Brak wystarczajacych danych trendow dla wybranego okresu. Wybierz szerszy zakres dat.', C.amberL, C.amber);
  }

  // Trend table
  if(data.trends.length>0){
    need(16);
    text('Szczegoly tygodniowe — tabela wszystkich wynikow', ML, Y, {sz:10, bold:true, col:C.dark});
    Y+=5;
    const shown = data.trends.slice(0,25);
    drawTable(
      ['Tydzien od','Test','Sr. wynik (0-100)','Interpretacja','Wypelnien'],
      shown.map(tr=>{
        const interp=tr.avgScore>=80?'Bardzo dobry':tr.avgScore>=60?'Dobry':tr.avgScore>=40?'Umiarkowany':'Wymaga uwagi';
        const ic:RGB=tr.avgScore>=80?C.green:tr.avgScore>=60?C.amber:tr.avgScore>=40?C.orange:C.red;
        return [
          {t:tr.week},
          {t:tr.assessmentCode, bold:true, col:C.indigo},
          {t:`${tr.avgScore} / 100`, bold:true},
          {t:interp, bold:true, col:ic},
          {t:String(tr.count)},
        ];
      }),
      [42,30,36,56,22],
      C.indigo, 10
    );
    if(data.trends.length>25){
      text(`... i ${data.trends.length-25} wiecej wierszy.`, ML, Y, {sz:8, col:C.light});
      Y+=5;
    }
  }

  // ── SEKCJA 5: RYZYKA ──────────────────────────────────────────────────
  sectionHeader(5, 'Raport ryzyk — obszary podwyzszonego zagrozenia', C.orange);

  infoBox(
    `Raport obejmuje ostatnie 30 dni, porownany z poprzednim 30-dniowym okresem. ` +
    `Procent obliczany z ${data.riskReport.totalActive} aktywnych pracownikow. ` +
    `Dane sa w pelni zagregowane i anonimowe — nie identyfikuja konkretnych osob.`,
    C.orangeL, C.orange
  );

  data.riskReport.risks.forEach(r=>riskCard(r, RISK_COLORS[r.icon]??C.orange));

  // Risk comparison table
  need(16);
  text('Tabela porownawcza — biezacy vs poprzedni okres 30-dniowy', ML, Y, {sz:10, bold:true, col:C.dark});
  Y+=5;
  drawTable(
    ['Obszar ryzyka','Test','Prog ryzyka','Biezacy (30 dni)','Poprzedni (30 dni)','Zmiana','Liczba osob'],
    data.riskReport.risks.map(r=>{
      const d=RISK_DETAILS[r.icon];
      const dc:RGB=r.delta>0?C.red:r.delta<0?C.green:C.gray;
      return [
        {t:r.label, bold:true, col:RISK_COLORS[r.icon]??C.orange},
        {t:d?.test??r.assessmentCode, col:C.indigo},
        {t:d?.threshold??'—', col:C.gray},
        {t:`${r.currentPct}%`, bold:true, col:RISK_COLORS[r.icon]??C.orange},
        {t:`${r.previousPct}%`, col:C.gray},
        {t:r.delta>0?`+${r.delta}%`:`${r.delta}%`, bold:true, col:dc},
        {t:`${r.currentCount} / ${data.riskReport.totalActive}`},
      ];
    }),
    [34,22,36,28,28,22,26],
    C.orange, 10
  );

  // ── SEKCJA 6: ZMIANY KRYTYCZNE ────────────────────────────────────────
  sectionHeader(6, 'Zmiany krytyczne — nagle zmiany w dzialach', C.red);

  infoBox(
    'Analiza porownuje indeks dobrostanu dzialu z ostatnich 14 dni z poprzednimi 14 dniami. ' +
    'Ostrzezenie: zmiana > 8 pkt.  Krytyczny: zmiana > 15 pkt. ' +
    'Uwzgledniamy rowniez pozytywne zmiany (poprawa dobrostanu w dziale).',
    C.redL, C.red
  );

  const worsening = data.criticalChanges.filter(c=>c.direction==='worsening');
  const improving = data.criticalChanges.filter(c=>c.direction==='improving');

  kpiRow([
    {label:'Pogorszen krytycznych',    val:String(worsening.filter(c=>c.severity==='critical').length), sub:'Zmiana > 15 pkt', accent:C.red},
    {label:'Pogorszen ostrzegawczych', val:String(worsening.filter(c=>c.severity==='warning').length),  sub:'Zmiana > 8 pkt',  accent:C.orange},
    {label:'Popraw w dzialach',        val:String(improving.length),                                    sub:'Znaczna poprawa', accent:C.green},
  ]);

  if(data.criticalChanges.length===0){
    infoBox('Brak zmian krytycznych — wszystkie dzialy utrzymuja stabilny poziom dobrostanu. Wynik pozytywny.', C.greenL, C.green);
  } else {
    need(16);
    text('Szczegoly zmian krytycznych — ostatnie 14 dni vs poprzednie 14 dni', ML, Y, {sz:10, bold:true, col:C.dark});
    Y+=5;
    drawTable(
      ['Dzial','Poprzedni indeks','Biezacy indeks','Zmiana (pkt)','Kierunek zmiany','Status alertu'],
      data.criticalChanges.map(c=>{
        const dirCol:RGB=c.direction==='worsening'?C.red:C.green;
        const statTxt=c.severity==='critical'?'KRYTYCZNY':c.direction==='worsening'?'OSTRZEZENIE':'POPRAWA';
        const statCol:RGB=c.severity==='critical'?C.red:c.direction==='worsening'?C.orange:C.green;
        return [
          {t:c.department, bold:true},
          {t:String(c.prevIndex)},
          {t:String(c.recentIndex), bold:true, col:dirCol},
          {t:`${c.direction==='worsening'?'-':'+'}${c.drop} pkt`, bold:true, col:dirCol},
          {t:c.direction==='worsening'?'↓ Pogorszenie':'↑ Poprawa', bold:true, col:dirCol},
          {t:statTxt, bold:true, col:statCol},
        ];
      }),
      [46,28,28,28,36,30],
      C.red, 10
    );
  }

  // ── SEKCJA 7: NASILENIE OBJAWÓW ───────────────────────────────────────
  sectionHeader(7, 'Rozklad nasilenia objawow', C.purple);

  if(data.severity.length===0){
    infoBox('Brak danych o nasileniu objawow dla wybranych parametrow raportu.', C.bg2, C.gray);
  } else {
    const totalSev = data.severity.reduce((s,i)=>s+i.count,0);

    need(16);
    text('Tabela nasilenia — wszystkie wyniki wg klasyfikacji klinicznej', ML, Y, {sz:10, bold:true, col:C.dark});
    Y+=5;
    drawTable(
      ['Poziom nasilenia','Liczba wynikow','% wszystkich wynikow','Wizualizacja proporcji'],
      data.severity.map(s=>{
        const pct=totalSev>0?Math.round((s.count/totalSev)*100):0;
        const col=SEV_COLORS[s.severity]??C.light;
        const lbl=SEV_LABELS[s.severity]??s.severity;
        const vis='█'.repeat(Math.min(Math.round(pct/3),20));
        return [
          {t:lbl, bold:true, col},
          {t:String(s.count), bold:true},
          {t:`${pct}%`, bold:true, col},
          {t:vis, col},
        ];
      }),
      [58,34,40,54],
      C.purple, 10
    );

    infoBox(
      'Klasyfikacja kliniczna wg standardow: PHQ-9 (depresja): minimal <5, mild 5-9, moderate 10-14, moderately severe 15-19, severe >=20. ' +
      'GAD-7 (lek): minimal <5, mild 5-9, moderate 10-14, severe >=15. ' +
      'PSS-10 (stres): low <14, moderate 14-26, high >=27. ' +
      'MOOD-10 (nastoj): good >40, moderate 31-40, low 21-30, very low <=20.',
      C.purpleL, C.purple
    );
  }

  // ── FINAL FOOTER ──────────────────────────────────────────────────────
  drawFooter();

  return DOC;
}
