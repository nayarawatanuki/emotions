export interface ProfessionalSummary {
  id: string;
  accountId: string;
  name: string;
  username: string;
  status: 'pending' | 'active' | 'suspended';
  archived: boolean;
}
export interface ProfessionalDirectory {
  items: ProfessionalSummary[];
  nextCursor: string | null;
}
export { parseUuidCursor as parseDirectoryCursor } from '../../../common/validation/uuid-cursor.js';
