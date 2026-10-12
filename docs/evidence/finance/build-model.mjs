import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const out = path.resolve(process.argv[2] ?? 'outputs');
await fs.mkdir(out, { recursive: true });
const wb = Workbook.create();
const forecast = wb.worksheets.add('Forecast');
const assumptions = wb.worksheets.add('Assumptions');
const unit = wb.worksheets.add('Unit economics');
const usage = wb.worksheets.add('Measured usage');
const ink = '#172B4D', navy = '#25466A', pale = '#EDF2F8', green = '#167447', blue = '#174ABD';
const money = '$#,##0;($#,##0);"-"';
const decimal = '0.00;(0.00);"-"';
const count = '#,##0.0;(#,##0.0);"-"';
const pct = '0.0%;(0.0%);"-"';
const cols = Array.from({length:12},(_,i)=>String.fromCharCode(69+i));
const dates = Array.from({length:12},(_,i)=>new Date(Date.UTC(2026,10+i,1)));
function put(s,a,v){s.getRange(a).values=[[v]];}
function fx(s,a,f){s.getRange(a).formulas=[[f]];s.getRange(a).format.font.color=f.includes('!')?green:'#111111';}
function style(s,last){
 s.showGridLines=false;
 s.getRange(`A1:R${last}`).format={font:{name:'Arial',size:10,color:ink},rowHeight:21,verticalAlignment:'center'};
 s.getRange(`A1:B${last}`).format.columnWidth=2.5;
 s.getRange(`C1:C${last}`).format.columnWidth=34;
 s.getRange(`D1:D${last}`).format.columnWidth=12;
 s.getRange(`E1:P${last}`).format.columnWidth=13;
 s.getRange(`Q1:Q${last}`).format.columnWidth=3;
 s.getRange(`R1:R${last}`).format.columnWidth=65;
 s.getRange('C2').format.font={name:'Arial',size:16,bold:true,color:ink};
 s.getRange('C3:P3').format.borders={bottom:{style:'thin',color:navy}};
 s.getRange('E4').format={horizontalAlignment:'center',font:{color:green},borders:{preset:'outside',style:'dotted',color:navy}};
 put(s,'C4','Case selected');
 if(s!==assumptions)fx(s,'E4',"=Assumptions!E4");
}
function band(s,row,title){put(s,`C${row}`,title);s.getRange(`C${row}:P${row}`).format={fill:navy,font:{color:'#FFFFFF',bold:true}};}
function input(s,a,value,format){put(s,a,value);s.getRange(a).format={fill:'#FFF4D6',font:{color:blue}};if(format)s.getRange(a).setNumberFormat(format);}
function header(s,row){s.getRange(`E${row}:P${row}`).values=[dates];s.getRange(`E${row}:P${row}`).setNumberFormat('mmm-yy');s.getRange(`C${row}:P${row}`).format={fill:navy,font:{color:'#FFFFFF',bold:true},horizontalAlignment:'center'};}
style(forecast,65);style(assumptions,91);style(unit,46);style(usage,52);
forecast.tabColor=ink;assumptions.tabColor=navy;
put(forecast,'C2','BugReplay operating forecast');put(assumptions,'C2','Forecast assumptions');put(unit,'C2','Investigation economics');put(usage,'C2','Measured run costs');
input(assumptions,'E4','Base');assumptions.getRange('E4').dataValidation={rule:{type:'list',values:['Base','Downside']}};
put(assumptions,'C5','Opening teams (forecast assumption)');input(assumptions,'E5',0,count);
put(assumptions,'C6','Opening cash (assumed USD)');input(assumptions,'E6',10000,money);
put(assumptions,'C7','Target contribution margin');input(assumptions,'E7',0.70,pct);
put(assumptions,'C8','Inference cost basis');input(assumptions,'E8','Planning');assumptions.getRange('E8').dataValidation={rule:{type:'list',values:['Planning','Measured']}};
put(assumptions,'C10','All forecasts and scenario inputs are illustrative. No customer or spending actuals are claimed.');
put(assumptions,'C11','Edit blue cells. Forecast months use closing teams billed for the full month; no proration.');
put(assumptions,'C12','Measured mode uses every entered run, including failures and cancellations, only when all costs have a source.');
header(assumptions,14);put(assumptions,'C14','Driver');put(assumptions,'D14','Case');put(assumptions,'R14','Basis / source');
const repeat=x=>Array(12).fill(x);
const drivers=[
 ['newTeams','New teams', [5,6,8,10,12,15,18,20,22,25,28,30],[2,2,3,3,4,4,5,5,6,6,7,7],count,'Illustrative acquisition plan. No actual customers or market validation.'],
 ['churn','Monthly team churn',repeat(.03),repeat(.08),pct,'Assumed loss rate applied to opening teams; new teams do not churn in their first month.'],
 ['price','Price per team (USD)',repeat(49),repeat(49),money,'plan.md section 9: initial pricing hypothesis, not validated willingness to pay.'],
 ['included','Included runs per team',repeat(100),repeat(100),'0','plan.md section 9. All user investigations count, including unsuccessful attempts.'],
 ['util','Allowance utilization',repeat(.60),repeat(1),pct,'Assumed total run usage divided by allowance; retries inside one run are included in run cost.'],
 ['llm','Inference cost per run (USD)',repeat(.06),repeat(.25),'$0.0000','Illustrative all-calls cost, not a quoted provider price. Measured mode replaces this active row.'],
 ['browser','Browser cost per run (USD)',repeat(.015),repeat(.025),'$0.0000','Illustrative hosted compute, including investigation and independent verification.'],
 ['storage','Storage/export cost per run (USD)',repeat(.005),repeat(.010),'$0.0000','Illustrative incremental retention/export cost allocated per run. No supplier quote.'],
 ['feePct','Payment fee share',repeat(.03),repeat(.03),pct,'Illustrative fee, not a processor quote. Applied once to monthly revenue.'],
 ['feeFixed','Payment fee per team (USD)',repeat(.30),repeat(.30),'$0.00','Illustrative monthly payment fee. One bill per team per month.'],
 ['hosting','Fixed service hosting (USD)',repeat(50),repeat(100),money,'Illustrative direct hosting/telemetry baseline, additional to per-run compute.'],
 ['payroll','Founder/contractor cash pay (USD)',repeat(1000),repeat(2000),money,'Illustrative monthly cash pay. No unpaid founder labor valued in this cash plan.'],
 ['marketing','Marketing spend (USD)',repeat(200),repeat(300),money,'Illustrative spend, independent of acquisition assumptions; not measured CAC.'],
 ['other','Other operating cash spend (USD)',repeat(150),repeat(200),money,'Illustrative tools/support/admin budget. Excludes income tax, debt and capex.'],
];
const rows={};
for(let n=0;n<drivers.length;n++){
 const [key,label,base,down,fmt,source]=drivers[n],r=16+n*4;rows[key]=r;
 put(assumptions,`C${r}`,label);put(assumptions,`D${r}`,'Active');put(assumptions,`D${r+1}`,'Base');put(assumptions,`D${r+2}`,'Downside');put(assumptions,`R${r}`,source);
 assumptions.getRange(`E${r+1}:P${r+1}`).values=[base];assumptions.getRange(`E${r+2}:P${r+2}`).values=[down];
 assumptions.getRange(`E${r+1}:P${r+2}`).format={fill:'#FFF4D6',font:{color:blue}};
 for(const c of cols){
  const select=`IF($E$4="Base",IF(ISNUMBER(${c}${r+1}),${c}${r+1},"n.a."),IF($E$4="Downside",IF(ISNUMBER(${c}${r+2}),${c}${r+2},"n.a."),"n.a."))`;
  fx(assumptions,`${c}${r}`,key==='llm'?`=IF($E$8="Measured",'Measured usage'!$E$7,IF($E$8="Planning",${select},"n.a."))`:`=${select}`);
 }
 assumptions.getRange(`C${r}:P${r}`).format.fill=pale;assumptions.getRange(`C${r}:P${r}`).format.font.bold=true;
 assumptions.getRange(`E${r}:P${r+2}`).setNumberFormat(fmt);
}
put(assumptions,'C74','Model basis: cash operating forecast, November 2026–October 2027 (assumed launch horizon).');
put(assumptions,'C76','Revenue equals collections in the month. No refunds, deferred revenue, tax, financing or capex are modeled.');
put(assumptions,'C78','Fractional teams represent expected forecast cohorts. They are not real customer counts.');
put(assumptions,'C80','The contribution target excludes fixed hosting. Gross margin in Forecast includes fixed hosting.');
put(assumptions,'C82','Reference plan: https://github.com/dsvyro1414-lab/bugreplay/blob/main/plan.md');
put(assumptions,'C84','CFO.ai sponsor output is still required. This workbook is an independent, assumption-based model.');
assumptions.freezePanes.freezeRows(14);assumptions.freezePanes.freezeColumns(4);

// Genuine run inputs remain blank until supplied. Missing cost is never treated as zero.
put(usage,'C5','Runs entered');fx(usage,'E5','=COUNTA(C13:C42)');
put(usage,'C6','Rows needing a cost/source or unique ID');fx(usage,'E6','=SUM(M13:M42)');
put(usage,'C7','Mean inference cost per run (USD)');fx(usage,'E7','=IF(OR(E5=0,E6>0),"n.a.",SUM(H13:H42)/E5)');usage.getRange('E7').setNumberFormat('$0.0000');
put(usage,'C9','Enter all paid attempts, including failed/cancelled runs. Cost is all model calls for that run.');
put(usage,'C10','Use billing or a documented gateway rate. Tokens or hackathon credits alone do not establish commercial cost.');
usage.getRange('C12:M12').values=[['Run ID','Completed UTC','Outcome','Input tokens','Output tokens','Inference USD','Elapsed sec','Git SHA','Trace URL','Cost source','Invalid row']];
usage.getRange('C12:M12').format={fill:navy,font:{color:'#FFFFFF',bold:true},wrapText:true,rowHeight:32};
usage.getRange('C13:L42').format={fill:'#FFF4D6',font:{color:blue}};usage.getRange('H13:H42').setNumberFormat('$0.0000');
for(let r=13;r<=42;r++) fx(usage,`M${r}`,`=IF(COUNTA(C${r}:L${r})=0,0,IF(OR(C${r}="",COUNTIF($C$13:$C$42,C${r})<>1,NOT(ISNUMBER(H${r})),H${r}<0,L${r}=""),1,0))`);
usage.getRange('M13:M42').conditionalFormats.add('cellIs',{operator:'greaterThan',formula:0,format:{fill:'#FCE4E4',font:{color:'#B42318',bold:true}}});
usage.freezePanes.freezeRows(12);usage.getRange('C1:C52').format.columnWidth=28;usage.getRange('D1:M52').format.columnWidth=18;

// One forecast schedule, always driven by the active case rows above.
put(forecast,'C5','Planning status');put(forecast,'E5','Assumptions, not actuals');
put(forecast,'C6','12-month revenue');fx(forecast,'E6','=IF(COUNT(E32:P32)=12,SUM(E32:P32),"n.a.")');
put(forecast,'C7','12-month gross profit');fx(forecast,'E7','=IF(COUNT(E39:P39)=12,SUM(E39:P39),"n.a.")');
put(forecast,'C8','12-month gross margin');fx(forecast,'E8','=IF(AND(ISNUMBER(E6),ISNUMBER(E7),E6>0),E7/E6,"n.a.")');
put(forecast,'C9','Ending cash');fx(forecast,'E9','=P48');
put(forecast,'C10','First month with negative closing cash');fx(forecast,'E10','=IF(COUNT(E48:P48)<>12,"n.a.",IF(SUM(E50:P50)=0,"n.a.",MATCH(1,E50:P50,0)))');
put(forecast,'C11','Runway horizon');fx(forecast,'E11','=IF(COUNT(E48:P48)<>12,"Missing inputs",IF(SUM(E50:P50)=0,">=12 months","See first deficit month"))');
put(forecast,'C13','Use the case selector on Assumptions. Measured mode requires complete cost/source entries.');
put(forecast,'C14','Negative cash is an unfunded requirement, not permitted borrowing. Cash is tested at each month-end.');
for(const a of ['E6:E7','E9'])forecast.getRange(a).setNumberFormat(money);forecast.getRange('E8').setNumberFormat(pct);
header(forecast,22);put(forecast,'C22','Monthly forecast (USD)');
const labels={23:'Active input status',25:'Opening teams',26:'New teams',27:'Churned teams',28:'Closing / billed teams',30:'Runs per billed team',31:'Total investigations',32:'Revenue / cash collected',34:'Inference cost',35:'Browser + storage cost',36:'Payment fees',37:'Fixed service hosting',38:'Total cost of revenue',39:'Gross profit',40:'Gross margin',42:'Founder/contractor cash pay',43:'Marketing',44:'Other operating cash spend',45:'Total operating cash spend',46:'Net operating cash flow',47:'Opening cash',48:'Closing cash',49:'Cash burn (nonnegative)',50:'Negative closing cash flag'};
for(const [r,l] of Object.entries(labels))put(forecast,`C${r}`,l);
for(let i=0;i<12;i++){
 const c=cols[i],p=cols[i-1],a=key=>`Assumptions!${c}${rows[key]}`;
 const active=drivers.map(d=>a(d[0]));
 fx(forecast,`${c}23`,`=IF(AND(COUNT(${active.join(',')})=14,ISNUMBER(Assumptions!$E$5),ISNUMBER(Assumptions!$E$6),Assumptions!$E$5>=0,Assumptions!$E$6>=0,MIN(${active.join(',')})>=0,${a('churn')}<=1,${a('util')}<=1,${a('feePct')}<1),"OK","Missing/invalid input")`);
 const f={25:i?`${p}28`:'Assumptions!$E$5',26:a('newTeams'),27:`${c}25*${a('churn')}`,28:`SUM(${c}25:${c}26)-${c}27`,30:`${a('included')}*${a('util')}`,31:`${c}28*${c}30`,32:`${c}28*${a('price')}`,34:`${c}31*${a('llm')}`,35:`${c}31*(${a('browser')}+${a('storage')})`,36:`${c}32*${a('feePct')}+${c}28*${a('feeFixed')}`,37:a('hosting'),38:`SUM(${c}34:${c}37)`,39:`${c}32-${c}38`,40:`IF(${c}32=0,"n.a.",${c}39/${c}32)`,42:a('payroll'),43:a('marketing'),44:a('other'),45:`SUM(${c}42:${c}44)`,46:`${c}39-${c}45`,47:i?`${p}48`:'Assumptions!$E$6',48:`${c}47+${c}46`,49:`MAX(0,-${c}46)`,50:`IF(${c}48<0,1,0)`};
 for(const[r,formula]of Object.entries(f))fx(forecast,`${c}${r}`,`=IF(${c}$23<>"OK","n.a.",${i?`IF(AND(ISNUMBER(${p}28),ISNUMBER(${p}48)),${formula},"n.a.")`:formula})`);
}
forecast.getRange('E25:P31').setNumberFormat(count);forecast.getRange('E32:P49').setNumberFormat(money);forecast.getRange('E40:P40').setNumberFormat(pct);
for(const r of [28,32,38,39,45,46,48]){forecast.getRange(`C${r}:P${r}`).format.fill=pale;forecast.getRange(`C${r}:P${r}`).format.font.bold=true;}
forecast.getRange('C40:P40').format.font.italic=true;
forecast.getRange('E48:P48').conditionalFormats.add('cellIs',{operator:'lessThan',formula:0,format:{fill:'#FCE4E4',font:{color:'#B42318',bold:true}}});
forecast.freezePanes.freezeRows(22);forecast.freezePanes.freezeColumns(4);
put(forecast,'C53','Commercial cost is unknown until measured. All selected scenario values are assumptions.');
put(forecast,'C55','Cash plan excludes tax, debt, capex and changes in working capital. No additional funding is assumed.');
// Compact chart of monthly closing cash, adjacent to summary without obscuring data.
forecast.getRange('H5:I5').values=[['Month','Closing cash']];
for(let i=0;i<12;i++){put(forecast,`H${6+i}`,dates[i].toLocaleDateString('en-US',{month:'short',year:'2-digit',timeZone:'UTC'}));fx(forecast,`I${6+i}`,`=${cols[i]}48`);}
forecast.getRange('I6:I17').setNumberFormat(money);
const chart=forecast.charts.add('line',forecast.getRange('H5:I17'));chart.setPosition('J5','Q20');chart.title='Closing cash (USD)';chart.hasLegend=false;chart.titleTextStyle.typeface='Arial';chart.titleTextStyle.fontSize=12;chart.xAxis={axisType:'textAxis',textStyle:{typeface:'Arial',fontSize:10}};chart.yAxis={numberFormatCode:'$#,##0',numberFormatSourceLinked:false,textStyle:{typeface:'Arial',fontSize:10}};chart.series.items[0].line={fill:navy,style:'solid',width:2};
forecast.getRange('E6:P50').format.font.color=ink;forecast.getRange('E4').format.font.color=green;forecast.getRange('E22:P22').format.font.color='#FFFFFF';

// An explicit month-1 unit model owns the sensitivity table's two input cells.
put(unit,'C5','First forecast month. Fixed hosting is excluded from contribution, included in Forecast gross profit.');
const unitLabels={7:'Price per team (USD)',8:'Included investigations',9:'Expected investigations',10:'Variable cost per run (USD)',11:'Payment fee share',12:'Payment fee per team (USD)',13:'Target contribution margin',15:'Contribution per team (expected usage)',16:'Contribution margin (expected usage)',17:'Contribution per team (full allowance)',18:'Contribution margin (full allowance)',20:'Maximum run cost at target margin',21:'Maximum inference cost at target',22:'Minimum price at target (full usage)',23:'Teams for cash breakeven (month 1)',25:'Pricing decision'};
for(const[r,l]of Object.entries(unitLabels))put(unit,`C${r}`,l);
for(const [r,f]of [[7,`Assumptions!E${rows.price}`],[8,`Assumptions!E${rows.included}`],[9,`E8*Assumptions!E${rows.util}`],[10,`SUM(Assumptions!E${rows.llm},Assumptions!E${rows.browser},Assumptions!E${rows.storage})`],[11,`Assumptions!E${rows.feePct}`],[12,`Assumptions!E${rows.feeFixed}`],[13,'Assumptions!E7']])fx(unit,`E${r}`,`=IF(Forecast!E23="OK",${f},"n.a.")`);
fx(unit,'E15','=IF(Forecast!E23="OK",E7*(1-E11)-E12-E9*E10,"n.a.")');
fx(unit,'E16','=IF(AND(ISNUMBER(E7),E7>0),E15/E7,"n.a.")');
fx(unit,'E17','=IF(Forecast!E23="OK",E7*(1-E11)-E12-E8*E10,"n.a.")');
fx(unit,'E18','=IF(AND(ISNUMBER(E7),E7>0),E17/E7,"n.a.")');
fx(unit,'E20','=IF(COUNT(E7:E13)<>7,"n.a.",IF(AND(E8>0,E13>=0,E13<1),(E7*(1-E13-E11)-E12)/E8,"n.a."))');
fx(unit,'E21',`=IF(ISNUMBER(E20),E20-Assumptions!E${rows.browser}-Assumptions!E${rows.storage},"n.a.")`);
fx(unit,'E22','=IF(COUNT(E7:E13)<>7,"n.a.",IF(AND(E13>=0,E13+E11<1),(E8*E10+E12)/(1-E13-E11),"n.a."))');
fx(unit,'E23',`=IF(AND(ISNUMBER(E15),E15>0),ROUNDUP((Assumptions!E${rows.hosting}+Forecast!E45)/E15,0),"n.a.")`);
fx(unit,'E25','=IF(AND(ISNUMBER(E18),ISNUMBER(E13)),IF(E18>=E13,"Measure before launch","Reprice or reduce allowance"),"Missing inputs")');
unit.getRange('E7:E23').setNumberFormat('$0.0000');for(const r of [8,9,23])unit.getRange(`E${r}`).setNumberFormat('0.0');for(const r of [11,13,16,18])unit.getRange(`E${r}`).setNumberFormat(pct);
for(const r of [7,12,15,17,22])unit.getRange(`E${r}`).setNumberFormat('$0.00');for(const r of [8,23])unit.getRange(`E${r}`).setNumberFormat('0');for(const r of [11,13,16,18])unit.getRange(`C${r}:E${r}`).format.font.italic=true;
put(unit,'C28','Full-allowance contribution margin');put(unit,'C29','Rows: variable run cost. Columns: monthly team price. Fixed hosting is excluded.');
fx(unit,'E31','=E18');unit.getRange('E31').setNumberFormat(';;;');unit.getRange('F31:I31').values=[[29,49,79,99]];unit.getRange('E32:E35').values=[[.04],[.08],[.15],[.30]];
// Native What-If tables returned #VALUE! in this runtime. Use transparent
// cell formulas for this small unit-economics grid; no TABLE() claims.
for(let r=32;r<=35;r++)for(const c of ['F','G','H','I'])fx(unit,`${c}${r}`,`=IF(AND(ISNUMBER($E$8),ISNUMBER($E$11),ISNUMBER($E$12),${c}$31>0),(${c}$31*(1-$E$11)-$E$12-$E$8*$E${r})/${c}$31,"n.a.")`);
unit.getRange('F32:I35').setNumberFormat(pct);unit.getRange('F31:I31').setNumberFormat('$0');unit.getRange('E32:E35').setNumberFormat('$0.00');unit.getRange('E31:I31').format.fill=pale;
put(unit,'C38','Planning cost assumptions are not provider quotes. One run includes all model calls and verification.');
put(unit,'C40','Formula-based sensitivity, not an Excel What-If Data Table. Change allowances on Assumptions.');
put(unit,'C42','Commercial inference cost must be sourced from gateway billing/rates, even if hackathon credits pay the bill.');

// Independently compute the two cases and validate live changes, not just formula strings.
function expected(caseName){let teams=0,cash=10000;const series=[];for(let i=0;i<12;i++){const d=Object.fromEntries(drivers.map(([k,,b,d])=>[k,(caseName==='Base'?b:d)[i]]));teams=teams*(1-d.churn)+d.newTeams;const runs=teams*d.included*d.util,revenue=teams*d.price,cogs=runs*(d.llm+d.browser+d.storage)+revenue*d.feePct+teams*d.feeFixed+d.hosting,gross=revenue-cogs,flow=gross-d.payroll-d.marketing-d.other;cash+=flow;series.push({month:dates[i].toISOString().slice(0,7),teams,runs,revenue,cogs,gross,flow,cash});}return series;}
function value(s,a){return s.getRange(a).values[0][0];}
function near(a,b,label){assert.equal(typeof a,'number',`${label}: ${a}`);assert.ok(Math.abs(a-b)<1e-7,`${label}: ${a} vs ${b}`);}
const checks=[];const cases={};
for(const scenario of ['Base','Downside']){
 put(assumptions,'E4',scenario);wb.recalculate();const ex=expected(scenario);cases[scenario]=ex;
 for(let i=0;i<12;i++){near(value(forecast,`${cols[i]}48`),ex[i].cash,scenario+' cash '+i);near(value(forecast,`${cols[i]}32`),ex[i].revenue,scenario+' revenue '+i);}
 checks.push(`${scenario}: all 12 revenue and cash values reconcile to an independent roll-forward`);
}
put(assumptions,'E4','Base');const late=cols[8]+(rows.newTeams+1),orig=value(assumptions,late);put(assumptions,late,orig+5);wb.recalculate();assert.ok(value(forecast,'M32')>cases.Base[8].revenue);near(value(forecast,'L32'),cases.Base[7].revenue,'Earlier month unchanged');put(assumptions,late,orig);checks.push('Later-month driver edits update that and following months');
const costCell=`E${rows.llm+1}`;put(assumptions,costCell,0);wb.recalculate();assert.equal(value(forecast,'E23'),'OK');put(assumptions,costCell,null);wb.recalculate();assert.equal(value(forecast,'E32'),'n.a.');assert.equal(value(forecast,'P48'),'n.a.');put(assumptions,costCell,.06);checks.push('Zero is a valid cost; missing selected cost makes this and subsequent forecast months unavailable');
const unused=`E${rows.llm+2}`;put(assumptions,unused,null);wb.recalculate();near(value(forecast,'E32'),cases.Base[0].revenue,'Unused scenario blank');put(assumptions,'E4','Downside');wb.recalculate();assert.equal(value(forecast,'E32'),'n.a.');put(assumptions,unused,.25);put(assumptions,'E4','Base');checks.push('A missing unselected scenario is isolated and exposed when selected');
put(assumptions,'E8','Measured');wb.recalculate();assert.equal(value(usage,'E7'),'n.a.');assert.equal(value(forecast,'E32'),'n.a.');assert.equal(value(unit,'E20'),'n.a.');assert.equal(value(unit,'E22'),'n.a.');
usage.getRange('C13:L14').values=[['qa-a','2026-10-12T00:00:00Z','bug_confirmed',1000,200,.1,45,'fixture','https://example.invalid/a','test only'],['qa-b','2026-10-12T00:00:01Z','cancelled',1000,200,.3,45,'fixture','https://example.invalid/b','test only']];wb.recalculate();near(value(usage,'E7'),.2,'All-run mean');near(value(assumptions,`E${rows.llm}`),.2,'Measured mode');put(usage,'H14',null);wb.recalculate();assert.equal(value(usage,'E7'),'n.a.');put(usage,'H14',.3);put(usage,'C14','qa-a');wb.recalculate();assert.equal(value(usage,'E7'),'n.a.');usage.getRange('C13:L14').clear({applyTo:'contents'});put(assumptions,'E8','Planning');checks.push('Measured mode: no runs, complete mean including cancellation, missing cost and duplicate ID checked; all temporary rows removed');
wb.recalculate();near(value(unit,'E20'),.1293,'Full-allowance run cost ceiling');near(value(unit,'E21'),.1093,'Inference ceiling');
for(let r=32;r<=35;r++)for(let c=0;c<4;c++){const price=[29,49,79,99][c],cost=[.04,.08,.15,.30][r-32];near(value(unit,`${String.fromCharCode(70+c)}${r}`),(price*.97-.30-100*cost)/price,'Formula sensitivity');}checks.push('Formula-based 4x4 price/run-cost sensitivity matches independent calculations; native What-If unavailable in this runtime');
const scanned=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:100},summary:'Formula errors'});
await fs.writeFile(path.join(out,'formula-scan.ndjson'),scanned.ndjson);
const inspect=await wb.inspect({kind:'table',range:'Forecast!C4:E11',include:'values,formulas',tableMaxRows:8,tableMaxCols:3,maxChars:4500});
console.log(inspect.ndjson);console.log(scanned.ndjson);
await fs.writeFile(path.join(out,'model-checks.json'),JSON.stringify({asOf:'2026-10-12',engine:'@oai/artifact-tool',checks,excelDesktopVerified:false,cfoAiModelCreated:false,scenarioResults:cases,limits:{commercialCostMeasured:false,assumptionsOnly:true}},null,2)+'\n');
await fs.writeFile(path.join(out,'scenario-assumptions.csv'),'driver,case,month,value,basis\n'+drivers.flatMap(([key,,base,down,,basis])=>['Base','Downside'].flatMap(s=>dates.map((date,i)=>[key,s,date.toISOString().slice(0,7),(s==='Base'?base:down)[i],`"${basis.replaceAll('"','""')}"`].join(',')))).join('\n')+'\n');
await fs.writeFile(path.join(out,'scenario-results.csv'),'case,month,teams,runs,revenue,cost_of_revenue,gross_profit,net_cash_flow,closing_cash\n'+Object.entries(cases).flatMap(([name,series])=>series.map(r=>[name,r.month,r.teams,r.runs,r.revenue,r.cogs,r.gross,r.flow,r.cash].join(','))).join('\n')+'\n');
const xlsx=await SpreadsheetFile.exportXlsx(wb);await xlsx.save(path.join(out,'bugreplay-financial-model.xlsx'));
for(const [sheet,range,file] of [['Forecast','C2:Q20','forecast-summary'],['Forecast','C22:P50','forecast-detail'],['Assumptions','C2:P30','assumptions-top'],['Assumptions','C32:P70','assumptions-costs'],['Unit economics','C2:P42','unit-economics'],['Measured usage','C2:M17','measured-usage']]){
 const img=await wb.render({sheetName:sheet,range,scale:1.5,format:'png'});await fs.writeFile(path.join(out,file+'.png'),new Uint8Array(await img.arrayBuffer()));
}
console.log(JSON.stringify({out,checks:checks.length,baseEnd:cases.Base[11].cash,downsideEnd:cases.Downside[11].cash}));
