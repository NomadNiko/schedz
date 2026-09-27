export type Staff = {
  id: string;
  // One free-text name: a full name, a first name or a nickname.
  name: string;
  email?: string | null;
  phone?: string | null;
  positionIds: string[];
  // Archived staff are hidden from pickers but keep their name on old shifts.
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
