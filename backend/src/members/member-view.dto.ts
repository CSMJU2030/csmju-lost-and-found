/** ผู้ใช้งานระบบ Lost & Found (ตาราง members) */
export class MemberView {
  id!: string;
  /** รหัสนักศึกษา (ถ้ามี) */
  studentId!: string;
  fullName!: string;
  email!: string;
  phone!: string;
  /** สำเนาสิทธิ์ที่แมปจาก core role: admin = เจ้าหน้าที่ */
  role!: 'user' | 'admin';
  createdAt!: string;
}
