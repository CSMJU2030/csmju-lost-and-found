import { Transform } from 'class-transformer';
import { ValidationArguments, ValidationOptions, registerDecorator } from 'class-validator';

// ตัวช่วยตรวจข้อมูลที่ใช้ร่วมกันใน DTO (ตรงกับ frontend/src/lib/validation.ts)

/** ตัดช่องว่างหัวท้ายของข้อความก่อนตรวจ */
export const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^\d{2}:\d{2}$/;
export const PHONE_PATTERN = /^0\d{9}$/;
export const STUDENT_CODE_PATTERN = /^\d{10}$/;
/** ชื่อและนามสกุล เว้นวรรคระหว่างกัน */
export const FULL_NAME_PATTERN = /^\S+(\s+\S+)+$/;

function register(name: string, check: (value: unknown) => boolean, options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name,
      target: object.constructor,
      propertyName,
      options,
      validator: { validate: (value: unknown, _args: ValidationArguments) => check(value) },
    });
}

/** วันที่ YYYY-MM-DD ที่มีอยู่จริง */
export const IsCalendarDate = (options?: ValidationOptions) =>
  register(
    'isCalendarDate',
    (v) => typeof v === 'string' && DATE_PATTERN.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)),
    options,
  );

/** เบอร์โทรหรือ Line ID: ถ้าเป็นตัวเลขล้วนต้องเป็นเบอร์ 10 หลักที่ถูกต้อง */
export const IsPhoneOrLineId = (options?: ValidationOptions) =>
  register(
    'isPhoneOrLineId',
    (v) => {
      if (typeof v !== 'string') return false;
      const digits = v.replace(/[\s-]/g, '');
      return !/^\d+$/.test(digits) || PHONE_PATTERN.test(digits);
    },
    options,
  );
