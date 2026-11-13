export interface ChildSummary {
  id: string;
  name: string;
  username: string;
  dateOfBirth: string;
  treatmentActive: boolean;
  archived: boolean;
}
export interface ChildView extends ChildSummary {
  revision: string;
  guardianName: string;
  reportedLevel: string | null;
  notes: string | null;
}
export interface ChildDirectory {
  items: ChildSummary[];
  nextCursor: string | null;
}
