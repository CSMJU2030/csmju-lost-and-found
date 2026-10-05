import { User, Category, LocationOption } from '@/types';

export const currentUser: User = {
  id: '1',
  name: 'Aom',
  email: 'aom123@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'user',
  studentId: '6704101361',
};

export const categories: Category[] = [
  { id: 'electronics', name: 'อิเล็กทรอนิกส์', icon: 'Smartphone' },
  { id: 'documents', name: 'เอกสาร/หนังสือ', icon: 'BookOpen' },
  { id: 'bags', name: 'กระเป๋า/กระเป๋าสตางค์', icon: 'Wallet' },
  { id: 'stationery', name: 'เครื่องเขียน', icon: 'PenTool' },
  { id: 'keys', name: 'กุญแจ', icon: 'Key' },
  { id: 'clothes', name: 'เสื้อผ้า', icon: 'Shirt' },
  { id: 'others', name: 'อื่นๆ', icon: 'MoreHorizontal' },
];

export const locations: LocationOption[] = [
  {
    id: 'Agricultural Engineering and Agro-industry',
    name: 'คณะวิศวกรรมและอุตสาหกรรมเกษตร',
    buildings: [
      { id: 'eng-1', name: 'อาคารวิศวกรรม', floors: ['ชั้น 1', 'ชั้น 2', 'ชั้น 3', 'ชั้น 4'] },
    
    ],
  },

  {
    id: 'science',
    name: 'คณะวิทยาศาสตร์',
    buildings: [
      { id: 'sci-1', name: 'อาคาร 60 ปี', floors: ['ห้องวิทย์ 2105', 'วิทย์ 2311'] },
      { id: 'sci-2', name: 'อาคารจุฬา', floors: ['ชั้น 1', 'ชั้น 2', 'ชั้น 3'] },
    ],
  },

    {
    id: 'Faculty of Agricultural Production',
    name: 'คณะผลิตกรรมการเกษตร',
    buildings: [
      { id: 'agp-1', name: 'อาคารผลิตกรรมการเกษตร', floors: ['ชั้น 1', 'ชั้น 2', 'ชั้น 3', 'ชั้น 4'] },
    ],
  },

  {
    id: 'business',
    name: 'คณะบริหารธุรกิจ',
    buildings: [
      { id: 'bus-1', name: 'อาคารคณะบริหารธุรกิจ', floors: ['ห้อง BA301', 'BA501'] },
    ],
  },
  {
    id: 'School of Tourism Development',
    name: 'คณะพัฒนาการท่องเที่ยว',
    buildings: [
      { id: 'hum-1', name: 'อาคารพัฒนาการท่องเที่ยว', floors: ['ชั้น 1', 'ชั้น 2', 'ชั้น 3', 'ชั้น 4'] },
      { id: 'hum-2', name: 'อาคาร 70 ปี', floors: ['ชั้น 1', 'ชั้น 2', 'ชั้น 3'] },
    ],
  },
  {
    id: 'Faculty of Fisheries Technology and Aquatic Resources',
    name: 'คณะเทคโนโลยีการประมงและทรัพยากรทางน้ำ',
    buildings: [
      { id: 'lib-main', name: 'อาคารเทคโนโลยีการประมง', floors: ['ชั้น 1', 'ชั้น 2', 'ชั้น 3', 'ชั้น 4', 'ชั้น 5'] },
     
    ],
  },
  {
    id: 'Faculty of Economics',
    name: 'คณะเศรษฐศาสตร์',
    buildings: [
      { id: 'cant-central', name: 'อาคารคณะเศรษฐศาสตร์', floors: ['ห้อง EC302', 'EC402'] },

    ],
  },
  {
    id: 'Faculty of Liberal Arts',
    name: 'คณะศิลปศาสตร์',
    buildings: [
      { id: 'la-1', name: 'อาคารศิลปศาสตร์', floors: ['ชั้น 1', 'ชั้น 2', 'ชั้น 3'] },
      
    ],
  },
   {
    id: 'Faculty of Architecture and Environmental Design',
    name: 'คณะสถาปัตยกรรมศาสตร์และการออกแบบสิ่งแวดล้อม',
    buildings: [
      { id: 'arch-1', name: 'อาคารสถาปัตยกรรมศาสตร์', floors: ['ชั้น 1', 'ชั้น 2', 'ชั้น 3'] },
      
    ],
  },
     {
    id: 'Faculty of Information and Communication',
    name: 'คณะสารสนเทศและการสื่อสาร',
    buildings: [
      { id: 'ic-1', name: 'อาคารสารสนเทศและการสื่อสาร', floors: ['ชั้น 1', 'ชั้น 2', 'ชั้น 3'] },

    ],
  },

    {
    id: 'Faculty of Animal Science and Technology',
    name: 'คณะสัตวศาสตร์และเทคโนโลยี',
    buildings: [
      { id: 'at-1', name: 'อาคารคณะสัตวศาสตร์ฯ', floors: ['ห้อง AT1412', 'AT1413'] },
    ],
  },
     {
    id: 'Faculty of Nursing',
    name: 'คณะพยาบาลศาสตร์',
    buildings: [
      { id: 'nur-1', name: 'อาคารพยาบาลศาสตร์', floors: ['ชั้น 1', 'ชั้น 2', 'ชั้น 3'] },

    ],
  },
      {
    id: 'Faculty of Veterinary Medicine',
    name: 'คณะสัตวแพทยศาสตร์',
    buildings: [
      { id: 'vet-1', name: 'อาคารสัตวแพทยศาสตร์', floors: ['ชั้น 1', 'ชั้น 2', 'ชั้น 3'] },
    ],
  },
  {
    id: 'other',
    name: 'อื่นๆ',
    buildings: [
      { id: 'other-bld', name: 'อื่นๆ / อาคารภายนอก', floors: ['ชั้น 1', 'ชั้น 2', 'ชั้น 3'] },
    ],
  },
];
