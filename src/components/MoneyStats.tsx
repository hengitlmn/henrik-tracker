import { useState } from 'react';
import type { Money } from '../types';
import { MONTHS_EN } from '../lib/dates';
import { useMonthPager } from '../hooks';
import type { Month } from '../hooks';
import { formatMoney, formatNumber, parseAmount } from '../lib/money';
import { entriesOfMonth, incomeExpense, lastMonths, spendingByCategory } from '../lib/stats';
import { MonthNav } from './MonthNav';

interface Props {
  money: Money;
  update: (fn: (current: Money) => Money) => void;
  month: Month;
  setMonth: (m: Month) => void;
}

const PALETTE = ['#6F85FF', '#4CC38A', '#F5B84B', '#F2786B', '#F472B6', '#C084FC', '#2FC4E0', '#9AA0AA'];

/** Statistik eines Monats: Bilanz, Budgets, Ausgaben nach Kategorie, letzte Monate */
export function MoneyStats({ money, update, month, setMonth }: Props) {
  const { shift, swipeProps } = useMonthPager(month, setMonth);
  const entries = entriesOfMonth(money, month.y, month.m);
  const { income, expense } = incomeExpense(entries);
  const net = income - expense;
  const saved = income > 0 ? Math.round((net / income) * 100) : null;
  const spending = spendingByCategory(entries);
  const spentBy = new Map(spending.map((s) => [s.category, s.amount]));
  const history = lastMonths(money, month.y, month.m);
  const peak = Math.max(1, ...history.flatMap((h) => [h.income, h.expense]));

  // Kreisdiagramm: größte 6 Kategorien einzeln, der Rest zusammen
  const top = spending.slice(0, 6);
  const rest = spending.slice(6).reduce((s, x) => s + x.amount, 0);
  const slices = rest > 0 ? [...top, { category: 'others', amount: rest }] : top;
  let acc = 0;
  const gradient = slices
    .map((s, i) => {
      const from = (acc / expense) * 100;
      acc += s.amount;
      return PALETTE[i % PALETTE.length] + ' ' + from + '% ' + (acc / expense) * 100 + '%';
    })
    .join(', ');

  return (
    <>
      <div className="sticky-top">
        <h1 className="page-title">Stats</h1>
        <MonthNav month={month} shift={shift} />
      </div>

      <div {...swipeProps}>
        <div data-slide>
          <div className="card balance">
            <div className="net">
              <span>Net</span>
              <b className={net < 0 ? 'neg' : 'pos'}>{formatMoney(net)}</b>
              {saved !== null && <em>{saved >= 0 ? 'Saved ' + saved + '% of income' : 'Spent ' + -saved + '% more than earned'}</em>}
            </div>
            <div className="sum three">
              <span>Income<b className="pos">{formatNumber(income)}</b></span>
              <span>Expense<b className="neg">{formatNumber(expense)}</b></span>
              <span>Entries<b>{entries.length}</b></span>
            </div>
          </div>

          <h2 className="statshead">Budgets</h2>
          <Budgets money={money} update={update} spentBy={spentBy} />

          <h2 className="statshead">Spending</h2>
          <div className="card">
            {expense === 0 ? (
              <p className="hint tight">No expenses this month.</p>
            ) : (
              <>
                <div className="donutwrap">
                  <div className="donut" role="img" aria-label="Spending by category" style={{ background: 'conic-gradient(' + gradient + ')' }}>
                    <div className="hole"><span>Total</span><b>{formatMoney(expense)}</b></div>
                  </div>
                </div>
                <ul className="legend">
                  {spending.map((s) => {
                    const i = slices.findIndex((x) => x.category === s.category);
                    return (
                      <li key={s.category}>
                        <i style={{ background: i >= 0 ? PALETTE[i % PALETTE.length] : PALETTE[PALETTE.length - 1] }} />
                        <span>{s.category}</span>
                        <em>{Math.round((s.amount / expense) * 100)}%</em>
                        <b>{formatMoney(s.amount)}</b>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          <h2 className="statshead">Last 6 months</h2>
          <div className="card">
            <div className="bars" role="img" aria-label="Income and expense of the last six months">
              {history.map((h) => (
                <div key={h.y + '-' + h.m} className={'barcol' + (h.y === month.y && h.m === month.m ? ' now' : '')}>
                  <div className="barpair">
                    <i className="b-in" style={{ height: (h.income / peak) * 100 + '%' }} />
                    <i className="b-ex" style={{ height: (h.expense / peak) * 100 + '%' }} />
                  </div>
                  <span>{MONTHS_EN[h.m].slice(0, 3)}</span>
                </div>
              ))}
            </div>
            <div className="barkey"><span><i className="b-in" /> Income</span><span><i className="b-ex" /> Expense</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

function Budgets({ money, update, spentBy }: { money: Money; update: Props['update']; spentBy: Map<string, number> }) {
  const [adding, setAdding] = useState(false);
  const free = money.categories.expense.filter((c) => !money.budgets.some((b) => b.category === c));
  const [cat, setCat] = useState('');
  const [limit, setLimit] = useState('');
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);

  const save = (category: string, text: string) => {
    const cents = parseAmount(text);
    if (cents === null) return false;
    update((m) => ({
      ...m,
      budgets: m.budgets.some((b) => b.category === category)
        ? m.budgets.map((b) => (b.category === category ? { ...b, limit: cents } : b))
        : [...m.budgets, { category, limit: cents }],
    }));
    return true;
  };

  const startAdd = () => {
    setCat(free[0] ?? '');
    setLimit('');
    setAdding(true);
  };

  return (
    <div className="budgets">
      {money.budgets.map((b) => {
        const spent = spentBy.get(b.category) ?? 0;
        const ratio = spent / b.limit;
        const tone = ratio > 1 ? 'over' : ratio > 0.8 ? 'warn' : '';
        const left = b.limit - spent;
        return (
          <div key={b.category} className={'card budget ' + tone}>
            <button type="button" className="budgethead" aria-label={'Edit budget ' + b.category} onClick={() => { setOpenCat(openCat === b.category ? null : b.category); setLimit(String(b.limit / 100).replace('.', ',')); setArmed(false); }}>
              <span>{b.category}</span>
              <span className="muted">{formatMoney(spent)} of {formatMoney(b.limit)}</span>
            </button>
            <div className="progress" role="progressbar" aria-label={'Budget ' + b.category} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(ratio * 100))}>
              <i style={{ width: Math.min(100, ratio * 100) + '%' }} />
            </div>
            <div className="budgetfoot">
              <span>{Math.round(ratio * 100)}%</span>
              <span className={left < 0 ? 'neg' : 'muted'}>{left < 0 ? formatMoney(-left) + ' over' : formatMoney(left) + ' left'}</span>
            </div>
            {openCat === b.category && (
              <div className="budgetedit">
                <input type="text" inputMode="decimal" aria-label={'Limit for ' + b.category} value={limit} onChange={(e) => setLimit(e.target.value)} />
                <button type="button" className="add" onClick={() => { if (save(b.category, limit)) setOpenCat(null); }}>Save</button>
                <button
                  type="button"
                  className={'remove' + (armed ? ' armed' : '')}
                  aria-label={'Remove budget ' + b.category}
                  onClick={() => {
                    if (!armed) { setArmed(true); return; }
                    update((m) => ({ ...m, budgets: m.budgets.filter((x) => x.category !== b.category) }));
                    setOpenCat(null);
                  }}
                >
                  {armed ? 'Sure?' : 'Remove'}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {adding ? (
        <div className="addbox addwrap budgetadd">
          <select aria-label="Budget category" value={cat} onChange={(e) => setCat(e.target.value)}>
            {free.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="text" inputMode="decimal" placeholder="Monthly limit" aria-label="Monthly limit" value={limit} onChange={(e) => setLimit(e.target.value)} />
          <button type="button" className="add" onClick={() => { if (cat && save(cat, limit)) setAdding(false); }}>Add</button>
        </div>
      ) : (
        free.length > 0 && (
          <button type="button" className="addbtn addwrap" onClick={startAdd}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Budget
          </button>
        )
      )}
      {money.budgets.length === 0 && !adding && <p className="hint tight">Set a monthly limit per category to track your spending.</p>}
    </div>
  );
}
