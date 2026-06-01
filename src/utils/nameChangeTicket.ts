export const NAME_CHANGE_TICKET_COUNT_KEY = 'real-card-battle:name-change-ticket-count';
export const NAME_CHANGE_TICKET_CHANGED_EVENT = 'name-change-ticket-changed';

const readTicketCount = (): number => {
  if (typeof localStorage === 'undefined') return 0;
  const raw = localStorage.getItem(NAME_CHANGE_TICKET_COUNT_KEY);
  if (!raw) return 0;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
};

const writeTicketCount = (count: number): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(NAME_CHANGE_TICKET_COUNT_KEY, String(Math.max(0, Math.floor(count))));
  window.dispatchEvent(new Event(NAME_CHANGE_TICKET_CHANGED_EVENT));
};

export const getNameChangeTicketCount = (): number => readTicketCount();

export const addNameChangeTicket = (count = 1): number => {
  const next = readTicketCount() + Math.max(0, Math.floor(count));
  writeTicketCount(next);
  return next;
};

export const consumeNameChangeTicket = (): boolean => {
  const current = readTicketCount();
  if (current <= 0) return false;
  writeTicketCount(current - 1);
  return true;
};
