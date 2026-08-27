export type Role = 'admin' | 'adult' | 'child' | 'unassigned';

export type WindowKey = 'lunch' | 'afternoon';

export interface PickupWindow {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  label: string; // e.g. "Po obědě"
}

export interface Lesson {
  start: string;
  end: string;
  subject: string;
}

export interface Kid {
  id: string;
  name: string;
  type: 'school' | 'preschool';
  className?: string;
  color: string; // tailwind-friendly hex
  /** morning arrival window, display only */
  arrival?: { start: string; end: string };
  windows: Record<WindowKey, PickupWindow>;
  /** school only: hour schedule per ISO weekday (1 = Monday … 5 = Friday) */
  hourSchedule?: Record<string, Lesson[]>;
  order: number;
}

export interface MemberLocation {
  lat: number;
  lng: number;
  accuracy: number; // meters
  updatedAt: number; // epoch ms
}

export interface Member {
  uid: string;
  name: string;
  email: string;
  role: Role;
  photoURL?: string;
  fcmTokens?: string[];
  /** last known location, shared by child accounts while the app is open */
  location?: MemberLocation | null;
}

export interface Invite {
  token: string;
  createdBy: string;
  createdAt: number;
  active: boolean;
  label?: string;
}

/** One document per kid per day, id = `${kidId}_${date}` */
export interface DayDoc {
  kidId: string;
  date: string; // YYYY-MM-DD
  window?: WindowKey;
  claimedBy?: string; // uid
  claimedByName?: string;
  claimedAt?: number;
  pickedUpBy?: string; // uid of the person who physically picked up
  pickedUpByName?: string;
  confirmedBy?: string; // uid of the person who tapped confirm
  confirmedByName?: string;
  confirmedAt?: number;
  note?: string;
  /** alert dedup flags written by the Cloud Function */
  alerts?: Record<string, boolean>;
}

export interface FamilyEvent {
  id: string;
  kidIds: string[];
  date: string; // YYYY-MM-DD
  start?: string; // "HH:MM"
  end?: string;
  title: string;
  /** override: kid must be picked up at this time that day */
  pickupAt?: string;
}

export interface Holiday {
  id: string;
  kidIds: string[];
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
  label: string;
}

/** Per-date override of a kid's regular windows */
export interface ScheduleException {
  id: string;
  kidId: string;
  date: string; // YYYY-MM-DD
  closed?: boolean;
  windows?: Partial<Record<WindowKey, { start: string; end: string }>>;
  label: string;
}

export interface AlertSettings {
  /** "HH:MM" – alert all adults when today is unclaimed */
  unclaimedAt: string;
  unclaimedEnabled: boolean;
  /** minutes before window start – urgent alert to all adults when still unclaimed */
  urgentBeforeMin: number;
  urgentEnabled: boolean;
  /** alert all adults when claimed but unconfirmed at end of window */
  endOfWindowEnabled: boolean;
  /** minutes before claimed pickup – quiet nudge to the claimer */
  nudgeBeforeMin: number;
  nudgeEnabled: boolean;
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  unclaimedAt: '11:00',
  unclaimedEnabled: true,
  urgentBeforeMin: 90,
  urgentEnabled: true,
  endOfWindowEnabled: true,
  nudgeBeforeMin: 90,
  nudgeEnabled: true,
};

export const WINDOW_LABELS: Record<WindowKey, string> = {
  lunch: 'Po obědě',
  afternoon: 'Odpoledne',
};

export function dayDocId(kidId: string, date: string): string {
  return `${kidId}_${date}`;
}
