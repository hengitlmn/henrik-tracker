import type { Money, MoneyEntry } from '../types';
import { WEEKDAYS_SHORT, pad, parseKey } from '../lib/dates';
import { entryEffect, formatMoney } from '../lib/money';

interface Props {
  /** schon sortiert, neueste zuerst */
  entries: MoneyEntry[];
  money: Money;
  /** gesetzt: Sicht eines Kontos (Überweisungen als Zu- oder Abgang), sonst alle Konten */
  accountId?: string;
  onEdit: (e: MoneyEntry) => void;
}

/** Einträge nach Tagen gruppiert, je Tag eine Karte (gleicher Stil in Konto- und Calendar-Ansicht) */
export function EntryDays({ entries, money, accountId, onEdit }: Props) {
  const name = (id?: string) => money.accounts.find((a) => a.id === id)?.name ?? '?';
  const days: { date: string; entries: MoneyEntry[] }[] = [];
  for (const e of entries) {
    const last = days[days.length - 1];
    if (last && last.date === e.date) last.entries.push(e);
    else days.push({ date: e.date, entries: [e] });
  }

  /** Vorzeichen-Betrag eines Eintrags aus Sicht der Ansicht; null = neutral (Überweisung über alle Konten) */
  const signed = (e: MoneyEntry): number | null => {
    if (accountId) return entryEffect(e, accountId);
    if (e.type === 'income') return e.amount;
    if (e.type === 'expense') return -e.amount;
    return null;
  };

  return (
    <>
      {days.map(({ date, entries: list }) => {
        const d = parseKey(date);
        const inc = list.reduce((s, e) => s + Math.max(0, signed(e) ?? 0), 0);
        const exp = list.reduce((s, e) => s + Math.max(0, -(signed(e) ?? 0)), 0);
        return (
          <section key={date} className="daygroup">
            <div className="dayhead">
              <b>{pad(d.getDate())}</b>
              <span className="wd">{WEEKDAYS_SHORT[d.getDay()]}</span>
              <span className="my">{pad(d.getMonth() + 1)}.{d.getFullYear()}</span>
              <span className="pos">{inc ? formatMoney(inc) : ''}</span>
              <span className="neg">{exp ? formatMoney(exp) : ''}</span>
            </div>
            <div className="acc-card">
              {list.map((e) => {
                const fx = signed(e);
                return (
                  <button key={e.id} type="button" className="entry" aria-label={'Edit entry ' + (e.note || e.category || 'transfer')} onClick={() => onEdit(e)}>
                    <span className="cat">{e.type === 'transfer' ? 'Transfer' : e.category ?? ''}</span>
                    <span className="what">
                      <b>{e.note || (e.type === 'transfer' ? 'Transfer' : e.category || (e.type === 'income' ? 'Income' : 'Expense'))}</b>
                      <i>{e.type === 'transfer' ? name(e.accountId) + ' → ' + name(e.toAccountId) : name(e.accountId)}</i>
                    </span>
                    <span className={'amt ' + (fx === null ? '' : fx < 0 ? 'neg' : 'pos')}>{formatMoney(fx === null ? e.amount : Math.abs(fx))}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
