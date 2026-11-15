import { and, eq, sql } from "drizzle-orm";
import { categories, userSeedStates, words } from "@/db/schema";
import type { getDb } from "@/lib/db";

type Db = ReturnType<typeof getDb>;

export const DEFAULT_VOCABULARY_SEED_KEY = "toeic-business-500-v1";
export const DEFAULT_VOCABULARY_CATEGORY = "TOEIC";

// Each row is: source number, term, part of speech, Thai definition.
const vocabularyRows = `
001\tappointment\tn.\tการนัดหมาย
002\tagenda\tn.\tวาระการประชุม
003\tarchive\tv.\tจัดเก็บเอกสาร
004\tassistant\tn.\tผู้ช่วย
005\tattendance\tn.\tการเข้าร่วม / การลงเวลา
006\tauthorization\tn.\tการอนุญาตอย่างเป็นทางการ
007\tcabinet\tn.\tตู้เก็บเอกสาร
008\tcalendar\tn.\tปฏิทิน
009\tclerk\tn.\tเจ้าหน้าที่ธุรการ
010\tconfidential\tadj.\tเป็นความลับ
011\tcopy\tn.\tสำเนา
012\tdeadline\tn.\tกำหนดส่งงาน
013\tdepartment\tn.\tแผนก
014\tdocument\tn.\tเอกสาร
015\tdraft\tn.\tฉบับร่าง
016\tenclosure\tn.\tเอกสารแนบ
017\tequipment\tn.\tอุปกรณ์
018\tfacility\tn.\tสิ่งอำนวยความสะดวก
019\tfile\tn.\tแฟ้มเอกสาร
020\tfolder\tn.\tแฟ้ม / โฟลเดอร์
021\tform\tn.\tแบบฟอร์ม
022\theadquarters\tn.\tสำนักงานใหญ่
023\tidentification\tn.\tข้อมูลยืนยันตัวตน
024\tinventory\tn.\tสินค้าคงคลัง
025\tinvoice\tn.\tใบแจ้งหนี้
026\tlabel\tn.\tฉลาก / ป้ายกำกับ
027\tlayout\tn.\tการจัดวาง
028\tmaintenance\tn.\tการบำรุงรักษา
029\tmanager\tn.\tผู้จัดการ
030\tmemo\tn.\tบันทึกข้อความ
031\tnotice\tn.\tประกาศ / หนังสือแจ้ง
032\toffice\tn.\tสำนักงาน
033\torganize\tv.\tจัดระเบียบ
034\tpaperwork\tn.\tงานเอกสาร
035\tpermission\tn.\tการอนุญาต
036\tphotocopy\tv.\tถ่ายเอกสาร
037\tprocedure\tn.\tขั้นตอนปฏิบัติ
038\trecord\tn.\tบันทึก / ระเบียน
039\treceptionist\tn.\tพนักงานต้อนรับ
040\tregistration\tn.\tการลงทะเบียน
041\treminder\tn.\tข้อความเตือนความจำ
042\treport\tn.\tรายงาน
043\trequest\tn.\tคำขอ
044\tschedule\tn.\tตารางเวลา / กำหนดการ
045\tstationery\tn.\tเครื่องเขียน
046\tstorage\tn.\tการจัดเก็บ
047\tsubmit\tv.\tยื่น / ส่งงาน
048\tsupervisor\tn.\tหัวหน้างาน
049\tsupplies\tn.\tวัสดุสิ้นเปลือง
050\tworkplace\tn.\tสถานที่ทำงาน
051\tapplicant\tn.\tผู้สมัครงาน
052\tapplication\tn.\tใบสมัคร / การสมัคร
053\tbenefit\tn.\tสวัสดิการ / ผลประโยชน์
054\tbonus\tn.\tเงินโบนัส
055\tcandidate\tn.\tผู้สมัคร
056\tcareer\tn.\tอาชีพ
057\tcolleague\tn.\tเพื่อนร่วมงาน
058\tcompensation\tn.\tค่าตอบแทน
059\tcontract\tn.\tสัญญา
060\tcredential\tn.\tหนังสือรับรองคุณวุฒิ
061\temployee\tn.\tลูกจ้าง / พนักงาน
062\temployer\tn.\tนายจ้าง
063\temployment\tn.\tการจ้างงาน
064\tevaluation\tn.\tการประเมินผล
065\texperience\tn.\tประสบการณ์
066\tfreelance\tadj.\tทำงานอิสระ
067\tfull-time\tadj.\tเต็มเวลา
068\thire\tv.\tจ้างงาน
069\tincentive\tn.\tสิ่งจูงใจ
070\tinterview\tn.\tการสัมภาษณ์
071\tjob\tn.\tงาน / ตำแหน่งงาน
072\tlabor\tn.\tแรงงาน
073\tleave\tn.\tการลางาน
074\tmentor\tn.\tผู้ให้คำปรึกษา
075\tnegotiate\tv.\tเจรจาต่อรอง
076\toccupation\tn.\tอาชีพ
077\tonboarding\tn.\tกระบวนการรับพนักงานใหม่
078\tovertime\tn.\tการทำงานล่วงเวลา
079\tpayroll\tn.\tบัญชีเงินเดือน
080\tpension\tn.\tเงินบำนาญ
081\tperformance\tn.\tผลการปฏิบัติงาน
082\tpersonnel\tn.\tบุคลากร
083\tposition\tn.\tตำแหน่งงาน
084\tprobation\tn.\tช่วงทดลองงาน
085\tpromotion\tn.\tการเลื่อนตำแหน่ง
086\tqualification\tn.\tคุณสมบัติ
087\trecruit\tv.\tรับสมัครบุคลากร
088\treference\tn.\tบุคคลอ้างอิง
089\tresign\tv.\tลาออก
090\tresume\tn.\tประวัติย่อสมัครงาน
091\tretirement\tn.\tการเกษียณอายุ
092\tsalary\tn.\tเงินเดือน
093\tshift\tn.\tกะทำงาน
094\tskill\tn.\tทักษะ
095\tstaff\tn.\tพนักงาน
096\ttraining\tn.\tการฝึกอบรม
097\ttransfer\tv.\tย้าย / โอนย้าย
098\tvacancy\tn.\tตำแหน่งงานว่าง
099\twage\tn.\tค่าจ้าง
100\tworkforce\tn.\tกำลังแรงงาน
101\tacquisition\tn.\tการเข้าซื้อกิจการ
102\tadministration\tn.\tการบริหารจัดการ
103\tagreement\tn.\tข้อตกลง
104\talliance\tn.\tพันธมิตร
105\tannual\tadj.\tประจำปี
106\tbranch\tn.\tสาขา
107\tbudget\tn.\tงบประมาณ
108\tbusiness\tn.\tธุรกิจ
109\tcompetitor\tn.\tคู่แข่ง
110\tcompliance\tn.\tการปฏิบัติตามกฎระเบียบ
111\tconsultant\tn.\tที่ปรึกษา
112\tcorporation\tn.\tบริษัทขนาดใหญ่
113\tcost\tn.\tต้นทุน
114\tdecision\tn.\tการตัดสินใจ
115\tdelegation\tn.\tการมอบหมายหน้าที่
116\tdirector\tn.\tผู้อำนวยการ
117\tefficiency\tn.\tประสิทธิภาพ
118\texecutive\tn.\tผู้บริหาร
119\texpansion\tn.\tการขยายกิจการ
120\tforecast\tn.\tการคาดการณ์
121\tfranchise\tn.\tธุรกิจแฟรนไชส์
122\tgoal\tn.\tเป้าหมาย
123\tguideline\tn.\tแนวทางปฏิบัติ
124\timplement\tv.\tนำไปปฏิบัติ
125\tinitiative\tn.\tความริเริ่ม
126\tinnovation\tn.\tนวัตกรรม
127\tinvestment\tn.\tการลงทุน
128\tleadership\tn.\tภาวะผู้นำ
129\tmerger\tn.\tการควบรวมกิจการ
130\tobjective\tn.\tวัตถุประสงค์
131\toperation\tn.\tการดำเนินงาน
132\torganization\tn.\tองค์กร
133\toutcome\tn.\tผลลัพธ์
134\tpartnership\tn.\tการเป็นหุ้นส่วน
135\tpolicy\tn.\tนโยบาย
136\tpriority\tn.\tสิ่งสำคัญลำดับแรก
137\tproductivity\tn.\tผลิตภาพ
138\tprofit\tn.\tกำไร
139\tproject\tn.\tโครงการ
140\tproposal\tn.\tข้อเสนอ
141\trestructure\tv.\tปรับโครงสร้าง
142\trevenue\tn.\tรายได้ของกิจการ
143\trisk\tn.\tความเสี่ยง
144\tstrategy\tn.\tกลยุทธ์
145\tsubsidiary\tn.\tบริษัทในเครือ
146\ttarget\tn.\tเป้าหมายที่กำหนด
147\ttask\tn.\tงานที่ได้รับมอบหมาย
148\ttimeline\tn.\tลำดับเวลาของงาน
149\tstakeholder\tn.\tผู้มีส่วนได้ส่วนเสีย
150\tventure\tn.\tกิจการร่วมลงทุน
151\taccount\tn.\tบัญชี
152\taccountant\tn.\tนักบัญชี
153\taccounting\tn.\tการบัญชี
154\tasset\tn.\tสินทรัพย์
155\taudit\tn.\tการตรวจสอบบัญชี
156\tbalance\tn.\tยอดคงเหลือ
157\tbankrupt\tadj.\tล้มละลาย
158\tbill\tn.\tใบเรียกเก็บเงิน
159\tcapital\tn.\tเงินทุน
160\tcash\tn.\tเงินสด
161\tcharge\tn.\tค่าใช้จ่ายที่เรียกเก็บ
162\tcommission\tn.\tค่านายหน้า
163\tcredit\tn.\tสินเชื่อ / เครดิต
164\tcurrency\tn.\tสกุลเงิน
165\tdebt\tn.\tหนี้สิน
166\tdeficit\tn.\tการขาดดุล
167\tdeposit\tn.\tเงินฝาก / เงินมัดจำ
168\tdepreciation\tn.\tค่าเสื่อมราคา
169\tdividend\tn.\tเงินปันผล
170\texpense\tn.\tค่าใช้จ่าย
171\tfee\tn.\tค่าธรรมเนียม
172\tfiscal\tadj.\tเกี่ยวกับการเงินการคลัง
173\tfund\tn.\tกองทุน
174\tincome\tn.\tรายได้
175\tinstallment\tn.\tเงินผ่อนชำระแต่ละงวด
176\tinterest\tn.\tดอกเบี้ย
177\tliability\tn.\tหนี้สิน / ภาระผูกพัน
178\tloan\tn.\tเงินกู้
179\tmargin\tn.\tส่วนต่างกำไร
180\tmortgage\tn.\tเงินกู้จำนอง
181\tnet\tadj.\tสุทธิ
182\toutstanding\tadj.\tที่ยังค้างชำระ
183\tpayment\tn.\tการชำระเงิน
184\tpenalty\tn.\tค่าปรับ
185\tpremium\tn.\tเบี้ยประกัน
186\tprice\tn.\tราคา
187\tpurchase\tn.\tการซื้อ
188\treceipt\tn.\tใบเสร็จรับเงิน
189\treimbursement\tn.\tการเบิกเงินคืน
190\trefund\tn.\tการคืนเงิน
191\tsavings\tn.\tเงินออม
192\tsettlement\tn.\tการชำระหนี้
193\tstatement\tn.\tรายการเดินบัญชี
194\ttax\tn.\tภาษี
195\ttransaction\tn.\tธุรกรรม
196\ttreasury\tn.\tคลัง / ฝ่ายบริหารการเงิน
197\tturnover\tn.\tยอดขายรวม / อัตราหมุนเวียน
198\tvaluation\tn.\tการประเมินมูลค่า
199\twithdraw\tv.\tถอนเงิน
200\tyield\tn.\tอัตราผลตอบแทน
201\tadvertise\tv.\tโฆษณา
202\tadvertisement\tn.\tโฆษณา
203\taudience\tn.\tกลุ่มผู้ชม
204\tbrand\tn.\tตราสินค้า
205\tbrochure\tn.\tแผ่นพับประชาสัมพันธ์
206\tcampaign\tn.\tแคมเปญ
207\tcatalog\tn.\tแค็ตตาล็อกสินค้า
208\tclient\tn.\tลูกค้า
209\tconsumer\tn.\tผู้บริโภค
210\tconversion\tn.\tการเปลี่ยนผู้สนใจเป็นลูกค้า
211\tcoupon\tn.\tคูปอง
212\tdemand\tn.\tความต้องการซื้อ
213\tdiscount\tn.\tส่วนลด
214\tdistribute\tv.\tกระจายสินค้า
215\tdistributor\tn.\tผู้จัดจำหน่าย
216\tendorse\tv.\tรับรอง / สนับสนุนสินค้า
217\texhibit\tv.\tจัดแสดงสินค้า
218\tfeedback\tn.\tความคิดเห็นตอบกลับ
219\tlaunch\tv.\tเปิดตัวสินค้า
220\tlead\tn.\tผู้มีแนวโน้มเป็นลูกค้า
221\tloyalty\tn.\tความภักดีของลูกค้า
222\tmarket\tn.\tตลาด
223\tmerchandise\tn.\tสินค้าเพื่อจำหน่าย
224\toutlet\tn.\tร้านค้าปลีก
225\torder\tn.\tคำสั่งซื้อ
226\tpackage\tn.\tบรรจุภัณฑ์ / ชุดสินค้า
227\tpersuade\tv.\tชักจูง
228\tplacement\tn.\tการจัดวางสินค้า
229\tprospect\tn.\tว่าที่ลูกค้า
230\tpublicity\tn.\tการประชาสัมพันธ์
231\tquotation\tn.\tใบเสนอราคา
232\tretail\tn.\tการขายปลีก
233\tsample\tn.\tสินค้าตัวอย่าง
234\tsegment\tn.\tกลุ่มตลาด
235\tseller\tn.\tผู้ขาย
236\tservice\tn.\tบริการ
237\tshowcase\tv.\tนำเสนอให้โดดเด่น
238\tslogan\tn.\tคำขวัญโฆษณา
239\tsponsor\tn.\tผู้สนับสนุน
240\tsubscription\tn.\tการสมัครสมาชิกแบบต่ออายุ
241\tsurvey\tn.\tการสำรวจความคิดเห็น
242\ttestimonial\tn.\tคำรับรองจากลูกค้า
243\ttrademark\tn.\tเครื่องหมายการค้า
244\ttrend\tn.\tแนวโน้ม
245\tupsell\tv.\tเสนอขายสินค้าราคาสูงขึ้น
246\tvendor\tn.\tผู้ขาย / ผู้จำหน่าย
247\twholesale\tn.\tการขายส่ง
248\twarranty\tn.\tการรับประกัน
249\texposure\tn.\tการมองเห็นโฆษณา
250\treferral\tn.\tการแนะนำลูกค้าต่อ
251\taccommodate\tv.\tอำนวยความสะดวก
252\tapologize\tv.\tขอโทษ
253\tassistance\tn.\tความช่วยเหลือ
254\tavailability\tn.\tความพร้อมให้บริการ
255\tbooking\tn.\tการจอง
256\tcancel\tv.\tยกเลิก
257\tcomplaint\tn.\tข้อร้องเรียน
258\tconfirm\tv.\tยืนยัน
259\tconvenient\tadj.\tสะดวก
260\tcourteous\tadj.\tสุภาพมีมารยาท
261\tdelivery\tn.\tการจัดส่ง
262\tdissatisfied\tadj.\tไม่พึงพอใจ
263\texchange\tn.\tการแลกเปลี่ยนสินค้า
264\tguarantee\tn.\tการรับประกัน
265\tinquiry\tn.\tการสอบถาม
266\tinstruction\tn.\tคำแนะนำ / ข้อปฏิบัติ
267\tissue\tn.\tปัญหา / ประเด็น
268\tmembership\tn.\tการเป็นสมาชิก
269\tnotify\tv.\tแจ้งให้ทราบ
270\toption\tn.\tตัวเลือก
271\toperator\tn.\tพนักงานรับสาย
272\tpatience\tn.\tความอดทน
273\tpreference\tn.\tความชอบ
274\tprocess\tv.\tดำเนินการ
275\tproduct\tn.\tผลิตภัณฑ์
276\tquality\tn.\tคุณภาพ
277\tqueue\tn.\tคิว / แถวรอ
278\treplacement\tn.\tสิ่งของทดแทน
279\treservation\tn.\tการจอง
280\tresolve\tv.\tแก้ไขปัญหา
281\tresponse\tn.\tการตอบกลับ
282\treturn\tn.\tการคืนสินค้า
283\tsatisfaction\tn.\tความพึงพอใจ
284\tserve\tv.\tให้บริการ
285\tsupport\tn.\tการสนับสนุน
286\ttechnical\tadj.\tเกี่ยวกับเทคนิค
287\ttroubleshoot\tv.\tวิเคราะห์และแก้ไขปัญหา
288\tverify\tv.\tตรวจสอบความถูกต้อง
289\twaitlist\tn.\tรายชื่อผู้รอรับบริการ
290\taccessible\tadj.\tเข้าถึงได้ง่าย
291\tadjustment\tn.\tการปรับเปลี่ยน
292\tcourtesy\tn.\tความสุภาพ
293\tdisruption\tn.\tการหยุดชะงัก
294\teligible\tadj.\tมีสิทธิ์ตามเงื่อนไข
295\texpectation\tn.\tความคาดหวัง
296\thospitality\tn.\tการต้อนรับและบริการ
297\tmisunderstanding\tn.\tความเข้าใจผิด
298\treassure\tv.\tทำให้มั่นใจ
299\tretain\tv.\tรักษาลูกค้าไว้
300\tupgrade\tn.\tการยกระดับบริการ
301\taccommodation\tn.\tที่พัก
302\tairport\tn.\tสนามบิน
303\tarrival\tn.\tการมาถึง
304\tbaggage\tn.\tสัมภาระ
305\tboarding\tn.\tการขึ้นเครื่องบิน
306\tcarriage\tn.\tตู้โดยสาร
307\tcommute\tv.\tเดินทางไปกลับที่ทำงาน
308\tdeparture\tn.\tการออกเดินทาง
309\tdestination\tn.\tจุดหมายปลายทาง
310\tdirection\tn.\tทิศทาง / เส้นทาง
311\texcursion\tn.\tการเที่ยวระยะสั้น
312\tfare\tn.\tค่าโดยสาร
313\tflight\tn.\tเที่ยวบิน
314\tgate\tn.\tประตูขึ้นเครื่อง
315\titinerary\tn.\tกำหนดการเดินทาง
316\tjourney\tn.\tการเดินทาง
317\tlandmark\tn.\tสถานที่สำคัญ
318\tluggage\tn.\tกระเป๋าเดินทาง
319\tpassenger\tn.\tผู้โดยสาร
320\tpassport\tn.\tหนังสือเดินทาง
321\tplatform\tn.\tชานชาลา
322\trailway\tn.\tทางรถไฟ
323\trental\tn.\tการเช่า
324\troute\tn.\tเส้นทาง
325\tshuttle\tn.\tรถรับส่ง
326\tsightseeing\tn.\tการเที่ยวชมสถานที่
327\tterminal\tn.\tอาคารผู้โดยสาร
328\tticket\tn.\tตั๋ว
329\ttraffic\tn.\tการจราจร
330\ttransit\tn.\tการเดินทางผ่าน
331\ttransportation\tn.\tการขนส่ง
332\tvehicle\tn.\tยานพาหนะ
333\tvisa\tn.\tวีซ่า
334\tvoyage\tn.\tการเดินทางทางเรือ
335\taisle\tn.\tทางเดินระหว่างแถวที่นั่ง
336\tdelay\tn.\tความล่าช้า
337\tcheck-in\tn.\tการลงทะเบียนเข้าพัก/ขึ้นเครื่อง
338\tcustoms\tn.\tศุลกากร
339\tdomestic\tadj.\tภายในประเทศ
340\tinternational\tadj.\tระหว่างประเทศ
341\tnavigation\tn.\tการนำทาง
342\trebook\tv.\tจองใหม่
343\tseat\tn.\tที่นั่ง
344\tsuitcase\tn.\tกระเป๋าเดินทาง
345\ttimetable\tn.\tตารางเวลาเดินรถ
346\ttourism\tn.\tการท่องเที่ยว
347\ttraveler\tn.\tนักเดินทาง
348\tconnection\tn.\tเที่ยวบินหรือรถที่ต้องต่อ
349\tsubway\tn.\tรถไฟใต้ดิน
350\thighway\tn.\tทางหลวง
351\tassembly\tn.\tการประกอบชิ้นส่วน
352\tbatch\tn.\tชุดการผลิต
353\tcapacity\tn.\tกำลังการผลิต / ความจุ
354\tcargo\tn.\tสินค้าที่ขนส่ง
355\tcomponent\tn.\tส่วนประกอบ
356\tconveyor\tn.\tสายพานลำเลียง
357\tdefect\tn.\tข้อบกพร่อง
358\tdispatch\tv.\tจัดส่งสินค้า
359\tdurability\tn.\tความทนทาน
360\tfactory\tn.\tโรงงาน
361\tfreight\tn.\tสินค้าขนส่ง / ค่าระวาง
362\tinspection\tn.\tการตรวจสอบ
363\tinstallation\tn.\tการติดตั้ง
364\titem\tn.\tรายการสินค้า
365\tloading\tn.\tการบรรทุกสินค้า
366\tmachinery\tn.\tเครื่องจักร
367\tmanufacturer\tn.\tผู้ผลิต
368\tmaterial\tn.\tวัสดุ
369\toutput\tn.\tปริมาณผลผลิต
370\tpackaging\tn.\tการบรรจุ / วัสดุบรรจุภัณฑ์
371\tpallet\tn.\tแท่นวางสินค้า
372\tpart\tn.\tชิ้นส่วน
373\tplant\tn.\tโรงงานผลิต
374\tproduction\tn.\tการผลิต
375\traw\tadj.\tดิบ / ยังไม่แปรรูป
376\trepair\tv.\tซ่อมแซม
377\trestock\tv.\tเติมสินค้าเข้าสต็อก
378\tsafety\tn.\tความปลอดภัย
379\tshortage\tn.\tการขาดแคลน
380\tspecification\tn.\tข้อกำหนดคุณลักษณะ
381\tstock\tn.\tสต็อกสินค้า
382\tsupplier\tn.\tผู้จัดหาวัตถุดิบ
383\tsupply\tn.\tอุปทาน / ปริมาณที่จัดหา
384\twarehouse\tn.\tคลังสินค้า
385\tworkflow\tn.\tขั้นตอนการไหลของงาน
386\tprocurement\tn.\tการจัดซื้อจัดหา
387\tfulfillment\tn.\tการดำเนินการตามคำสั่งซื้อ
388\toperate\tv.\tดำเนินงาน / ใช้เครื่องจักร
389\toptimize\tv.\tปรับให้มีประสิทธิภาพสูงสุด
390\treorder\tv.\tสั่งซื้อสินค้าเพิ่ม
391\tallocation\tn.\tการจัดสรร
392\tshipment\tn.\tการส่งสินค้า
393\tlogistics\tn.\tโลจิสติกส์
394\thandling\tn.\tการขนย้ายและจัดการ
395\ttracking\tn.\tการติดตามสถานะ
396\tprototype\tn.\tต้นแบบผลิตภัณฑ์
397\tstandard\tn.\tมาตรฐาน
398\tfabrication\tn.\tการผลิตชิ้นงาน
399\tconsolidation\tn.\tการรวมสินค้าหรือพัสดุ
400\tbackorder\tn.\tคำสั่งซื้อที่ต้องรอสินค้าเข้า
401\tannounce\tv.\tประกาศ
402\tannouncement\tn.\tประกาศ
403\tattach\tv.\tแนบไฟล์
404\tattachment\tn.\tไฟล์แนบ
405\tclarify\tv.\tชี้แจงให้ชัดเจน
406\tcommunicate\tv.\tสื่อสาร
407\tconference\tn.\tการประชุมใหญ่
408\tconsensus\tn.\tความเห็นพ้องต้องกัน
409\tcontact\tv.\tติดต่อ
410\tcorrespondence\tn.\tการติดต่อทางจดหมาย
411\tdiscuss\tv.\tอภิปราย / พูดคุย
412\temail\tn.\tอีเมล
413\temphasize\tv.\tเน้นย้ำ
414\texplain\tv.\tอธิบาย
415\texpress\tv.\tแสดงความคิดเห็น
416\tfollow-up\tn.\tการติดตามผล
417\tinform\tv.\tแจ้งให้ทราบ
418\tinvitation\tn.\tคำเชิญ
419\tlecture\tn.\tการบรรยาย
420\tminutes\tn.\tรายงานการประชุม
421\tparticipation\tn.\tการมีส่วนร่วม
422\tpresentation\tn.\tการนำเสนอ
423\tpropose\tv.\tเสนอ
424\tquestion\tn.\tคำถาม
425\treply\tv.\tตอบกลับ
426\trepresentative\tn.\tตัวแทน
427\trespond\tv.\tตอบสนอง / ตอบกลับ
428\treview\tv.\tทบทวน
429\tseminar\tn.\tการสัมมนา
430\tsession\tn.\tช่วงการประชุม
431\tspeaker\tn.\tผู้บรรยาย
432\tsummarize\tv.\tสรุปความ
433\ttelephone\tn.\tโทรศัพท์
434\tupdate\tn.\tข้อมูลล่าสุด
435\turgent\tadj.\tเร่งด่วน
436\tvoicemail\tn.\tข้อความเสียงฝากไว้
437\twebinar\tn.\tการสัมมนาผ่านเว็บ
438\tworkshop\tn.\tการประชุมเชิงปฏิบัติการ
439\tacknowledge\tv.\tรับทราบ
440\taddress\tv.\tกล่าวถึง / จัดการปัญหา
441\tadvise\tv.\tให้คำแนะนำ
442\tbriefing\tn.\tการชี้แจงข้อมูลโดยสรุป
443\tbroadcast\tv.\tออกอากาศ
444\tcollaborate\tv.\tร่วมมือกัน
445\tcoordinate\tv.\tประสานงาน
446\tdebate\tn.\tการอภิปรายโต้แย้ง
447\tdialogue\tn.\tบทสนทนา
448\tinterpret\tv.\tตีความ / แปลปากเปล่า
449\tmention\tv.\tกล่าวถึง
450\toutline\tn.\tโครงร่าง
451\taccurate\tadj.\tถูกต้องแม่นยำ
452\tadequate\tadj.\tเพียงพอ
453\taffordable\tadj.\tราคาเอื้อมถึง
454\talternative\tn.\tทางเลือก
455\tavailable\tadj.\tมีพร้อม / ว่าง
456\taware\tadj.\tตระหนักรู้
457\tbeneficial\tadj.\tเป็นประโยชน์
458\tcompetitive\tadj.\tมีความสามารถในการแข่งขัน
459\tconsiderable\tadj.\tจำนวนมาก / สำคัญ
460\tconsistent\tadj.\tสม่ำเสมอ
461\teffective\tadj.\tได้ผลดี
462\tessential\tadj.\tจำเป็นอย่างยิ่ง
463\tflexible\tadj.\tยืดหยุ่น
464\tfrequent\tadj.\tบ่อยครั้ง
465\timmediate\tadj.\tทันที
466\timprove\tv.\tปรับปรุงให้ดีขึ้น
467\tincrease\tv.\tเพิ่มขึ้น
468\tdecrease\tv.\tลดลง
469\tindependent\tadj.\tเป็นอิสระ
470\tlikely\tadj.\tมีแนวโน้มว่าจะเกิดขึ้น
471\tmandatory\tadj.\tบังคับ / จำเป็นตามข้อกำหนด
472\tnecessary\tadj.\tจำเป็น
473\toptional\tadj.\tไม่บังคับ / เลือกได้
474\toverdue\tadj.\tเกินกำหนด
475\tpunctual\tadj.\tตรงเวลา
476\treliable\tadj.\tเชื่อถือได้
477\trelevant\tadj.\tเกี่ยวข้อง
478\treluctant\tadj.\tไม่เต็มใจ
479\tresponsible\tadj.\tรับผิดชอบ
480\tsecure\tadj.\tปลอดภัย / มั่นคง
481\tsignificant\tadj.\tสำคัญ / มีนัยสำคัญ
482\tspecific\tadj.\tเฉพาะเจาะจง
483\ttemporary\tadj.\tชั่วคราว
484\tthorough\tadj.\tละเอียดถี่ถ้วน
485\tunexpected\tadj.\tไม่คาดคิด
486\tvarious\tadj.\tหลากหลาย
487\tvaluable\tadj.\tมีคุณค่า
488\tsuitable\tadj.\tเหมาะสม
489\tsufficient\tadj.\tเพียงพอ
490\tsuccessful\tadj.\tประสบความสำเร็จ
491\tcomprehensive\tadj.\tครอบคลุม
492\tfeasible\tadj.\tเป็นไปได้ในทางปฏิบัติ
493\tfavorable\tadj.\tเอื้ออำนวย / เป็นผลดี
494\tpreliminary\tadj.\tเบื้องต้น
495\tpromptly\tadv.\tอย่างรวดเร็วไม่ชักช้า
496\tapproximately\tadv.\tโดยประมาณ
497\tannually\tadv.\tทุกปี
498\taccordingly\tadv.\tตามนั้น / ดังนั้น
499\tconsiderably\tadv.\tอย่างมาก
500\taccurately\tadv.\tอย่างแม่นยำ
`.trim();

export const DEFAULT_VOCABULARY = vocabularyRows.split("\n").map((row) => {
  const [number, term, part_of_speech, definition] = row.split("\t");
  return { number: Number(number), term, part_of_speech, definition };
});

if (DEFAULT_VOCABULARY.length !== 500 || DEFAULT_VOCABULARY.some((word, index) => word.number !== index + 1 || !word.term || !word.part_of_speech || !word.definition)) {
  throw new Error("The default vocabulary seed must contain exactly 500 complete, ordered entries");
}

export async function ensureDefaultVocabulary(db: Db, userEmail: string) {
  await db.transaction(async (tx) => {
    const [seedState] = await tx.select({ id: userSeedStates.id }).from(userSeedStates).where(and(
      eq(userSeedStates.user_email, userEmail),
      eq(userSeedStates.seed_key, DEFAULT_VOCABULARY_SEED_KEY)
    )).limit(1);
    if (seedState) return;

    const now = new Date().toISOString();
    await tx.insert(categories).values({ user_email: userEmail, name: DEFAULT_VOCABULARY_CATEGORY, created_at: now })
      .onConflictDoNothing({ target: [categories.user_email, categories.name] });
    const [category] = await tx.select({ id: categories.id }).from(categories).where(and(
      eq(categories.user_email, userEmail),
      eq(categories.name, DEFAULT_VOCABULARY_CATEGORY)
    )).limit(1);
    if (!category) throw new Error("Unable to create the default vocabulary category");

    await tx.insert(words).values(DEFAULT_VOCABULARY.map(({ term, part_of_speech, definition }) => ({
      user_email: userEmail,
      term,
      part_of_speech,
      definition,
      category_id: category.id,
      example: null,
      interval_days: 0,
      due_at: now,
      review_count: 0,
      correct_count: 0,
      last_reviewed: null,
      created_at: now,
      updated_at: now
    }))).onConflictDoUpdate({
      target: [words.user_email, words.term],
      set: { category_id: sql`coalesce(${words.category_id}, excluded.category_id)` }
    });

    await tx.insert(userSeedStates).values({
      user_email: userEmail,
      seed_key: DEFAULT_VOCABULARY_SEED_KEY,
      applied_at: now
    }).onConflictDoNothing({ target: [userSeedStates.user_email, userSeedStates.seed_key] });
  });
}
