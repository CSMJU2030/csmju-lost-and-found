// อัลกอริทึมจับคู่ของหาย <-> ของที่พบ (ตรงกับ frontend/src/lib/matching.ts)
import { ItemView as LostItem, MatchView as MatchResult } from './dto/item-view.dto';

export const MATCH_THRESHOLD = 40;

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const tokenize = (text: string) => text.toLowerCase().split(/[\s,./()\-_:;"'!?]+/).filter((t) => t.length >= 2);

function keywordScore(a: LostItem, b: LostItem) {
  const textA = `${a.name} ${a.description || ''}`.toLowerCase();
  const textB = `${b.name} ${b.description || ''}`.toLowerCase();
  const shared = new Set<string>();
  new Set(tokenize(textA)).forEach((t) => { if (textB.includes(t)) shared.add(t); });
  new Set(tokenize(textB)).forEach((t) => { if (textA.includes(t)) shared.add(t); });
  return { score: Math.min(25, shared.size * 8), shared: Array.from(shared).slice(0, 3) };
}

const daysBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 86400000;

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
    const diff = daysBetween(lost.dateLost, found.dateLost);
    if (diff < -1) {
      score -= 10;
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

export function findMatches(target: LostItem, allItems: LostItem[], limit = 5): MatchResult[] {
  return allItems
    .filter((i) => i.id !== target.id && i.status !== 'returned' && i.reportType !== target.reportType)
    .map((candidate) => {
      const [lost, found] = target.reportType === 'lost' ? [target, candidate] : [candidate, target];
      return { ...scoreMatch(lost, found), item: candidate };
    })
    .filter((r) => r.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
