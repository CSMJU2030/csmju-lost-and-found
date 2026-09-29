// enum ในฐานข้อมูลเป็น UPPER_SNAKE_CASE (มาตรฐาน data-dictionary ข้อ 9.1)
// ส่วน API ส่งเป็นตัวพิมพ์เล็กตามที่ frontend ใช้ เช่น AT_OFFICE <-> at_office
export const toApiEnum = <T extends string>(v: T) => v.toLowerCase() as Lowercase<T>;
export const toDbEnum = <T extends string>(v: T) => v.toUpperCase() as Uppercase<T>;
