export const TOEIC_CATEGORY = "TOEIC";
export const GOVERNMENT_CATEGORY = "คำศัพท์ กพ";
export const SENTENCE_PATTERN_CATEGORY = "pattle กลุ่มประโยค";
export const DEFAULT_IMPORT_CATEGORY = TOEIC_CATEGORY;

export const MAIN_CATEGORY_NAMES = [TOEIC_CATEGORY, GOVERNMENT_CATEGORY, SENTENCE_PATTERN_CATEGORY] as const;

export const TOEIC_SUBCATEGORY_NAMES = [
  "สำนักงานและงานธุรการ",
  "งานและอาชีพ",
  "ธุรกิจและการบริหาร",
  "การเงินและบัญชี",
  "การตลาดและการขาย",
  "บริการลูกค้า",
  "การเดินทางและท่องเที่ยว",
  "การผลิตและโลจิสติกส์",
  "การสื่อสารและการประชุม",
  "คำคุณศัพท์และคำวิเศษณ์"
] as const;

export const GOVERNMENT_SUBCATEGORY_NAMES = [
  "สุขภาพ",
  "กีฬา",
  "นิสัยและบุคลิกภาพ",
  "การศึกษาและความคิด",
  "สังคมและความสัมพันธ์",
  "กฎหมายและราชการ",
  "งานและธุรกิจ",
  "ธรรมชาติและสิ่งแวดล้อม",
  "ทั่วไป"
] as const;

export const CATEGORY_HIERARCHY_SEED_KEY = "category-hierarchy-v1";

export function isMainCategoryName(name: string | null | undefined): name is typeof MAIN_CATEGORY_NAMES[number] {
  return Boolean(name && MAIN_CATEGORY_NAMES.includes(name as typeof MAIN_CATEGORY_NAMES[number]));
}

export function suggestMainCategoryName(term: string, partOfSpeech: string, definition: string) {
  const text = `${term} ${partOfSpeech} ${definition}`.toLowerCase();
  if (/ราชการ|รัฐบาล|รัฐธรรมนูญ|กฎหมาย|ประชาชน|พลเมือง|กระทรวง|เทศบาล|สังคม|การเมือง|government|citizen|law|legal|public|official|municipal/.test(text)) {
    return GOVERNMENT_CATEGORY;
  }
  return DEFAULT_IMPORT_CATEGORY;
}

export function suggestSubcategoryName(mainCategory: string, term: string, partOfSpeech: string, definition: string) {
  const text = `${term} ${partOfSpeech} ${definition}`.toLowerCase();
  if (mainCategory === GOVERNMENT_CATEGORY) {
    if (/สุขภาพ|ร่างกาย|โรค|ยา|แพทย์|โรงพยาบาล|อาหาร|health|body|disease|medicine|medical|hospital|nutrition/.test(text)) return "สุขภาพ";
    if (/กีฬา|การแข่งขัน|นักกีฬา|ทีม|ฟุตบอล|เบสบอล|ว่ายน้ำ|กีฬา|sport|athlete|team|football|baseball|competition/.test(text)) return "กีฬา";
    if (/นิสัย|บุคลิก|อารมณ์|พฤติกรรม|ความรู้สึก|ขยัน|สุภาพ|ใจดี|personality|habit|behavior|attitude|emotion|polite|kind/.test(text)) return "นิสัยและบุคลิกภาพ";
    if (/เรียน|การศึกษา|ความรู้|วิจัย|โรงเรียน|มหาวิทยาลัย|education|study|knowledge|research|school|university|idea|think/.test(text)) return "การศึกษาและความคิด";
    if (/เพื่อน|ครอบครัว|สังคม|ชุมชน|ความสัมพันธ์|สื่อสาร|friend|family|society|community|relationship/.test(text)) return "สังคมและความสัมพันธ์";
    if (/กฎหมาย|ราชการ|รัฐบาล|รัฐ|สิทธิ|หน้าที่|law|legal|government|citizen|right|duty|public/.test(text)) return "กฎหมายและราชการ";
    if (/งาน|อาชีพ|ธุรกิจ|บริษัท|เงิน|ตลาด|งาน|career|business|company|money|market|work/.test(text)) return "งานและธุรกิจ";
    if (/ธรรมชาติ|สิ่งแวดล้อม|อากาศ|ภูเขา|ทะเล|ต้นไม้|nature|environment|weather|mountain|sea|tree/.test(text)) return "ธรรมชาติและสิ่งแวดล้อม";
    return "ทั่วไป";
  }
  if (mainCategory === TOEIC_CATEGORY) {
    if (/office|document|file|folder|memo|paperwork|calendar|meeting|appointment|สำนักงาน|เอกสาร|แฟ้ม|ประชุม|นัดหมาย/.test(text)) return "สำนักงานและงานธุรการ";
    if (/employee|employer|career|salary|job|staff|training|hire|interview|งาน|อาชีพ|เงินเดือน|พนักงาน|สมัครงาน/.test(text)) return "งานและอาชีพ";
    if (/business|company|manager|project|strategy|organization|ธุรกิจ|บริษัท|ผู้จัดการ|โครงการ|กลยุทธ์|องค์กร/.test(text)) return "ธุรกิจและการบริหาร";
    if (/account|cash|tax|loan|bank|income|expense|เงิน|บัญชี|ภาษี|รายได้|ค่าใช้จ่าย|การเงิน/.test(text)) return "การเงินและบัญชี";
    if (/advertise|brand|campaign|client|consumer|market|sale|seller|สินค้า|ลูกค้า|ตลาด|โฆษณา|การขาย/.test(text)) return "การตลาดและการขาย";
    if (/customer|service|complaint|support|delivery|booking|บริการ|ร้องเรียน|จัดส่ง|การจอง/.test(text)) return "บริการลูกค้า";
    if (/airport|flight|travel|ticket|hotel|journey|passenger|ถนน|สนามบิน|เที่ยวบิน|เดินทาง|โรงแรม|ท่องเที่ยว/.test(text)) return "การเดินทางและท่องเที่ยว";
    if (/factory|production|warehouse|shipment|logistics|stock|supplier|สินค้า|โรงงาน|คลัง|ขนส่ง|โลจิสติกส์/.test(text)) return "การผลิตและโลจิสติกส์";
    if (/email|conference|presentation|telephone|report|communication|อีเมล|ประชุม|นำเสนอ|โทรศัพท์|รายงาน|สื่อสาร/.test(text)) return "การสื่อสารและการประชุม";
    return "คำคุณศัพท์และคำวิเศษณ์";
  }
  return "ทั่วไป";
}

export function getSeedSubcategoryName(mainCategory: string, index: number, term: string, partOfSpeech: string, definition: string) {
  if (mainCategory === TOEIC_CATEGORY && index >= 0 && index < 500) {
    const block = Math.floor(index / 50);
    return TOEIC_SUBCATEGORY_NAMES[block] ?? suggestSubcategoryName(mainCategory, term, partOfSpeech, definition);
  }
  return suggestSubcategoryName(mainCategory, term, partOfSpeech, definition);
}
