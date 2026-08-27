import type {
  DayDoc,
  FamilyEvent,
  Holiday,
  Kid,
  PickupWindow,
  ScheduleException,
  WindowKey,
} from './types';
import { WINDOW_LABELS } from './types';
import { isWeekend } from './time';

export interface DayContext {
  kid: Kid;
  date: string;
  day?: DayDoc;
  events: FamilyEvent[];
  holidays: Holiday[];
  exceptions: ScheduleException[];
}

export type PickupState = 'rest' | 'unclaimed' | 'claimed' | 'confirmed';

export interface ResolvedDay {
  kid: Kid;
  date: string;
  state: PickupState;
  restReason?: string; // "Víkend" | holiday label | exception label
  windows: Record<WindowKey, PickupWindow>;
  /** window relevant for alerts/deadlines: the claimed one, else afternoon */
  effectiveWindow: PickupWindow & { key: WindowKey };
  /** an event's pickupAt override for this date, if any */
  pickupAt?: string;
  events: FamilyEvent[];
  day?: DayDoc;
}

export function holidayFor(
  kidId: string,
  date: string,
  holidays: Holiday[],
): Holiday | undefined {
  return holidays.find(
    (h) => h.kidIds.includes(kidId) && h.from <= date && date <= h.to,
  );
}

export function resolveDay(ctx: DayContext): ResolvedDay {
  const { kid, date, day } = ctx;
  const events = ctx.events
    .filter((e) => e.date === date && e.kidIds.includes(kid.id))
    .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));
  const exception = ctx.exceptions.find(
    (x) => x.kidId === kid.id && x.date === date,
  );
  const holiday = holidayFor(kid.id, date, ctx.holidays);

  const windows: Record<WindowKey, PickupWindow> = {
    lunch: { ...kid.windows.lunch },
    afternoon: { ...kid.windows.afternoon },
  };
  if (exception?.windows) {
    for (const key of ['lunch', 'afternoon'] as WindowKey[]) {
      const o = exception.windows[key];
      if (o) windows[key] = { ...windows[key], ...o };
    }
  }

  const pickupAt = events.find((e) => e.pickupAt)?.pickupAt;

  const rest = isWeekend(date) || !!holiday || !!exception?.closed;
  const restReason = isWeekend(date)
    ? 'Víkend'
    : holiday?.label ?? (exception?.closed ? exception.label : undefined);

  const windowKey: WindowKey = day?.window ?? 'afternoon';
  const base = windows[windowKey];
  const effectiveWindow = {
    ...base,
    key: windowKey,
    label: WINDOW_LABELS[windowKey],
    // an event pickup override tightens the deadline
    ...(pickupAt ? { end: pickupAt < base.end ? pickupAt : base.end } : {}),
  };

  let state: PickupState = 'unclaimed';
  if (rest) state = 'rest';
  else if (day?.confirmedAt) state = 'confirmed';
  else if (day?.claimedBy) state = 'claimed';

  return { kid, date, state, restReason, windows, effectiveWindow, pickupAt, events, day };
}
