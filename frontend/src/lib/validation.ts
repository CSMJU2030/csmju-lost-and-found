// กฎตรวจข้อมูลส่วนตัวที่ใช้ร่วมกันในฟอร์มแจ้งของหายและฟอร์มขอรับคืน
// แต่ละฟังก์ชันคืนข้อความเตือน หรือ '' ถ้าข้อมูลถูกต้อง

export const requireText = (value: string, message: string) => (value.trim() ? '' : message);

export const validateFullName = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'กรุณากรอกชื่อ-นามสกุล';
  if (parts.length < 2) return 'กรุณากรอกทั้งชื่อและนามสกุล (เว้นวรรคระหว่างชื่อกับนามสกุล)';
  return '';
};

export const STUDENT_ID_LENGTH = 10;

export const validateStudentId = (value: string) => {
  if (!value.trim()) return 'กรุณากรอกรหัสนักศึกษา';
  if (!/^\d+$/.test(value) || value.length !== STUDENT_ID_LENGTH) return `รหัสนักศึกษาต้องเป็นตัวเลข ${STUDENT_ID_LENGTH} หลัก`;
  return '';
};

export const validatePhone = (value: string) => {
  if (!value.trim()) return 'กรุณากรอกเบอร์โทรศัพท์';
  if (!/^0\d{9}$/.test(value)) return 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0';
  return '';
};

// ช่องทางติดต่อที่เป็นได้ทั้งเบอร์โทรหรือ Line ID: ถ้าพิมพ์เป็นตัวเลขล้วนต้องเป็นเบอร์ที่ถูกต้อง
export const validateContact = (value: string) => {
  const v = value.trim();
  if (!v) return 'กรุณากรอกช่องทางติดต่อ (เบอร์โทรหรือ Line ID)';
  const digits = v.replace(/[\s-]/g, '');
  if (/^\d+$/.test(digits)) return validatePhone(digits);
  if (v.length < 3) return 'ช่องทางติดต่อสั้นเกินไป';
  return '';
};

export interface MissingField {
  id: string; // id ของช่องกรอก ใช้เลื่อนหน้าไปหา
  label: string;
  message: string;
}

// เลื่อนหน้าและโฟกัสช่องแรกที่ยังกรอกไม่ถูกต้อง
export function focusFirstInvalid(fields: MissingField[]) {
  const first = fields[0];
  if (!first) return;
  const el = document.getElementById(first.id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (el as HTMLInputElement).focus({ preventScroll: true });
  }
}

// เทียบคำตอบลับแบบหลวม (ตรงกับ backend) ใช้แสดงผลให้แอดมินดูว่าคำตอบตรงหรือไม่
export function isSecretAnswerMatch(given: string, expected: string) {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  const a = norm(given);
  const b = norm(expected);
  if (!a || !b) return false;
  return a === b || (a.length >= 2 && b.includes(a)) || (b.length >= 2 && a.includes(b));
}
