import { LostItem } from '@/types';
import { getReportType } from './storage';

export interface MatchResult {
  item: LostItem;
  score: number; // 0-100
  reasons: string[];
}

export const MATCH_THRESHOLD = 40;

// ระยะทางระหว่างพิกัดสองจุด (เมตร)
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// แยกคำจากชื่อ+รายละเอียด (ภาษาไทยไม่มีช่องว่าง จึงใช้ทั้งคำที่แยกด้วยช่องว่างและเช็กแบบ substring)
function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[\s,./()\-_:;"'!?]+/)
    .filter((t) => t.length >= 2);
}

function keywordScore(a: LostItem, b: LostItem) {
  const textA = `${a.name} ${a.description || ''}`.toLowerCase();
  const textB = `${b.name} ${b.description || ''}`.toLowerCase();
  const tokensA = Array.from(new Set(tokenize(textA)));
  const tokensB = Array.from(new Set(tokenize(textB)));
  const shared = new Set<string>();
  tokensA.forEach((t) => { if (textB.includes(t)) shared.add(t); });
  tokensB.forEach((t) => { if (textA.includes(t)) shared.add(t); });
  return { score: Math.min(25, shared.size * 8), shared: Array.from(shared).slice(0, 3) };
}

const daysBetween = (a: string, b: string) =>
  (new Date(b).getTime() - new Date(a).getTime()) / 86400000;

export function scoreMatch(lost: LostItem, found: LostItem): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  if (lost.category && lost.category === found.category) {
    score += 35;
    reasons.push(`หมวดเดียวกัน (${lost.category})`);
  }

  const kw = keywordScore(lost, found);
  if (kw.score > 0) {
    score += kw.score;
    reasons.push(`คำตรงกัน: ${kw.shared.join(', ')}`);
  }

  if (lost.pinX != null && lost.pinY != null && found.pinX != null && found.pinY != null) {
    const d = distanceMeters(lost.pinX, lost.pinY, found.pinX, found.pinY);
    const pts = d < 50 ? 25 : d < 150 ? 18 : d < 400 ? 10 : 0;
    if (pts > 0) {
      score += pts;
      reasons.push(`ห่างกันประมาณ ${Math.round(d)} ม.`);
    }
  } else if (lost.faculty && lost.faculty === found.faculty) {
    score += 15;
    reasons.push('คณะ/หน่วยงานเดียวกัน');
    if (lost.building && lost.building === found.building) {
      score += 10;
      reasons.push('อาคารเดียวกัน');
    }
  }

  if (lost.dateLost && found.dateLost) {
    const diff = daysBetween(lost.dateLost, found.dateLost); // บวก = พบหลังวันที่หาย
    if (diff < -1) {
      score -= 10; // พบก่อนวันที่แจ้งหาย ไม่น่าใช่ชิ้นเดียวกัน
    } else {
      const abs = Math.abs(diff);
      const pts = abs <= 1 ? 15 : abs <= 3 ? 10 : abs <= 7 ? 5 : 0;
      if (pts > 0) {
        score += pts;
        reasons.push(abs < 1 ? 'วันเดียวกัน' : `ห่างกัน ${Math.round(abs)} วัน`);
      }
    }
  }

  return { item: found, score: Math.max(0, Math.min(100, score)), reasons };
}

// หารายการฝั่งตรงข้าม (หาย <-> พบ) ที่ยังไม่ปิด และมีคะแนนถึงเกณฑ์
export function findMatches(target: LostItem, allItems: LostItem[], limit = 5): MatchResult[] {
  const targetType = getReportType(target);
  return allItems
    .filter((i) => i.id !== target.id && i.status !== 'returned' && getReportType(i) !== targetType)
    .map((candidate) => {
      const [lost, found] = targetType === 'lost' ? [target, candidate] : [candidate, target];
      const result = scoreMatch(lost, found);
      return { ...result, item: candidate };
    })
    .filter((r) => r.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
