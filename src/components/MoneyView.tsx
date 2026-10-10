import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import type { Money, MoneyEntry, MoneySection } from '../types';
import { parseKey } from '../lib/dates';
import { useMonthPager } from '../hooks';
import type { Month } from '../hooks';
import { PERIODS, flowSince, monthPrefix } from '../lib/stats';
import type { Period } from '../lib/stats';
import { accountBalance, entryEffect, formatMoney, formatNumber, groupTotal, newestFirst, totals } from '../lib/money';
import { EntryDays } from './EntryDays';
import { EntryForm } from './EntryForm';
import { MonthNav } from './MonthNav';
import { MoneyCalendar } from './MoneyCalendar';
import { MoneyStats } from './MoneyStats';

interface Props {
  money: Money;
  update: (fn: (current: Money) => Money) => void;
  today: Date;
  section: MoneySection;
  /** zählt hoch, wenn der Bereich gewechselt wurde (für die Einblend-Animation) */
  sectionAnim: number;
}

type View = { kind: 'list' } | { kind: 'account'; id: string } | { kind: 'entry'; accountId: string; editId?: string };

const SVG = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
} as const;

const tone = (cents: number) => (cents < 0 ? 'neg' : 'pos');

export function MoneyView({ money, update, today, section, sectionAnim }: Props) {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [dx, setDx] = useState(0);
  const [period, setPeriod] = useState<Period>('month');
  const [month, setMonth] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }));
  /** Formular über das Plus von Liste, Stats und Calendar (Konto: das erste, im Formular änderbar) */
  const [quick, setQuick] = useState(false);
  /** Eintrag, der im Calendar gerade geändert wird (dann ist das Plus ausgeblendet) */
  const [calEditId, setCalEditId] = useState<string | null>(null);

  const go = (next: View, dir: 1 | -1) => {
    setDx(dir * 28);
    setView(next);
    window.scrollTo(0, 0);
  };

  const firstAccount = money.accounts[0]?.id;
  const formOpen = quick || (section === 'accounts' && view.kind === 'entry') || (section === 'calendar' && calEditId !== null);

  // Plus: immer da, solange es ein Konto gibt und kein Formular offen ist. Über document.body, damit "fixed"
  // nicht an der Einblend-Animation der Ansicht hängt.
  const fab = firstAccount && !formOpen
    ? createPortal(
        <button
          type="button"
          className="fab"
          aria-label="Add entry"
          onClick={() => {
            if (section === 'accounts' && view.kind === 'account') go({ kind: 'entry', accountId: view.id }, 1);
            else setQuick(true);
          }}
        >
          <svg {...SVG} width="26" height="26" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
        </button>,
        document.body,
      )
    : null;

  if (quick && firstAccount) {
    return (
      <div key="quick" className="view-in" style={{ '--dx': '28px' } as CSSProperties}>
        <EntryForm
          money={money}
          update={update}
          today={today}
          accountId={firstAccount}
          onSaved={(date) => { const d = parseKey(date); setMonth({ y: d.getFullYear(), m: d.getMonth() }); }}
          onBack={() => setQuick(false)}
        />
      </div>
    );
  }

  if (section !== 'accounts') {
    return (
      <>
        <div key={section} className="view-in" style={{ '--dx': '28px' } as CSSProperties} data-money={section}>
          {section === 'stats' ? (
            <MoneyStats money={money} update={update} month={month} setMonth={setMonth} />
          ) : (
            <MoneyCalendar money={money} update={update} today={today} editId={calEditId} setEditId={setCalEditId} />
          )}
        </div>
        {fab}
      </>
    );
  }

  const key = view.kind + ('id' in view ? view.id : '') + ('accountId' in view ? view.accountId + (view.editId ?? '') : '');

  return (
    <>
      <div key={key} className={dx || sectionAnim ? 'view-in' : undefined} style={{ '--dx': dx + 'px' } as CSSProperties}>
        {view.kind === 'list' && <AccountList money={money} today={today} period={period} onPeriod={setPeriod} onOpen={(id) => go({ kind: 'account', id }, 1)} />}
        {view.kind === 'account' && (
          <AccountPage
            money={money}
            accountId={view.id}
            month={month}
            setMonth={setMonth}
            onBack={() => go({ kind: 'list' }, -1)}
            onEdit={(e) => go({ kind: 'entry', accountId: view.id, editId: e.id }, 1)}
          />
        )}
        {view.kind === 'entry' && (
          <EntryForm
            money={money}
            update={update}
            today={today}
            accountId={view.accountId}
            editing={money.entries.find((e) => e.id === view.editId)}
            onSaved={(date) => { const d = parseKey(date); setMonth({ y: d.getFullYear(), m: d.getMonth() }); }}
            onBack={() => go({ kind: 'account', id: view.accountId }, -1)}
          />
        )}
      </div>
      {fab}
    </>
  );
}

function AccountList({ money, today, period, onPeriod, onOpen }: {
  money: Money;
  today: Date;
  period: Period;
  onPeriod: (p: Period) => void;
  onOpen: (id: string) => void;
}) {
  const total = totals(money).total;
  const { income, expense } = flowSince(money, period, today);
  const idx = PERIODS.findIndex((p) => p.id === period);
  const next = PERIODS[(idx + 1) % PERIODS.length];
  const cycle = () => onPeriod(next.id);
  const label = PERIODS[idx].label;
  return (
    <>
      <div className="sticky-top">
        <div className="totals">
          {/* Ein Tipp auf eine der drei Zellen schaltet den Zeitraum von Income und Expense weiter (Networth bleibt gleich) */}
          <button type="button" className="tot per" aria-label={'Networth, tap to change the period to ' + next.label} onClick={cycle}>
            Networth<b className={tone(total)}>{formatNumber(total)}</b>
          </button>
          <button type="button" className="tot per" aria-label={'Income, ' + label + ', tap for ' + next.label} onClick={cycle}>
            + {label}
            <b className="pos">{formatNumber(income)}</b>
          </button>
          <button type="button" className="tot per" aria-label={'Expense, ' + label + ', tap for ' + next.label} onClick={cycle}>
            - {label}
            <b className="neg">{formatNumber(expense)}</b>
          </button>
        </div>
      </div>
      {money.groups.length === 0 && (
        <p className="hint">No accounts yet. Add sections and accounts in Settings, then Money.</p>
      )}
      {money.groups.map((g) => (
        <section key={g.id}>
          <div className="grouphead">
            <span>{g.name}</span>
            <span className={tone(groupTotal(money, g.id))}>{formatMoney(groupTotal(money, g.id))}</span>
          </div>
          {money.accounts.some((a) => a.groupId === g.id) && (
            <div className="acc-card">
              {money.accounts.filter((a) => a.groupId === g.id).map((a) => {
                const b = accountBalance(money, a.id);
                return (
                  <button key={a.id} type="button" className="acc-row" onClick={() => onOpen(a.id)}>
                    <span>{a.name}</span>
                    <span className={tone(b)}>{formatMoney(b)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </>
  );
}

interface AccountPageProps {
  money: Money;
  accountId: string;
  month: Month;
  setMonth: (m: Month) => void;
  onBack: () => void;
  onEdit: (e: MoneyEntry) => void;
}

function AccountPage({ money, accountId, month, setMonth, onBack, onEdit }: AccountPageProps) {
  const { shift, swipeProps } = useMonthPager(month, setMonth);
  const account = money.accounts.find((a) => a.id === accountId);
  const prefix = monthPrefix(month.y, month.m);
  const inMonth = newestFirst(
    money.entries.filter((e) => (e.accountId === accountId || e.toAccountId === accountId) && e.date.startsWith(prefix)),
  );

  const deposit = inMonth.reduce((s, e) => s + Math.max(0, entryEffect(e, accountId)), 0);
  const withdrawal = inMonth.reduce((s, e) => s + Math.max(0, -entryEffect(e, accountId)), 0);

  if (!account) return null;

  return (
    <>
      <div className="subhead">
        <button type="button" className="back" aria-label="Back to accounts" onClick={onBack}>
          <svg {...SVG} width="18" height="18"><path d="M15 5.5L8.5 12l6.5 6.5" /></svg>
          <span>Accounts</span>
        </button>
        <h1 className="page-title">{account.name}</h1>
        <span />
      </div>

      <div {...swipeProps}>
        <MonthNav month={month} shift={shift} />

        <div className="sum" data-slide>
          <span>Income<b className="pos">{formatNumber(deposit)}</b></span>
          <span>Expense<b className="neg">{formatNumber(withdrawal)}</b></span>
          <span>Total<b>{formatNumber(deposit - withdrawal)}</b></span>
          <span>Balance<b className="muted">{formatNumber(accountBalance(money, accountId))}</b></span>
        </div>

        <div data-slide>
          <EntryDays entries={inMonth} money={money} accountId={accountId} onEdit={onEdit} />
          {inMonth.length === 0 && <p className="hint">No entries this month.</p>}
        </div>
      </div>
    </>
  );
}
