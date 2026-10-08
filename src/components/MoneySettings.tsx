import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Money } from '../types';
import { newId } from '../lib/id';
import { accountBalance, formatMoney, parseAmount } from '../lib/money';
import { RemoveButton } from './HabitsSettings';

interface Props {
  money: Money;
  update: (fn: (current: Money) => Money) => void;
}

const PLUS = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** Abschnitte (Gruppen) und Konten anlegen und entfernen */
export function MoneySettings({ money, update }: Props) {
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [addingIn, setAddingIn] = useState<string | null>(null); // Gruppen-ID
  const [accName, setAccName] = useState('');
  const [accStart, setAccStart] = useState('');
  const groupRef = useRef<HTMLInputElement>(null);
  const accRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (addingGroup) groupRef.current?.focus(); }, [addingGroup]);
  useEffect(() => { if (addingIn) accRef.current?.focus(); }, [addingIn]);

  const addGroup = (e: FormEvent) => {
    e.preventDefault();
    const name = groupName.trim();
    if (!name) return;
    update((m) => ({ ...m, groups: [...m.groups, { id: newId(), name }] }));
    setGroupName('');
    setAddingGroup(false);
  };

  const addAccount = (e: FormEvent, groupId: string) => {
    e.preventDefault();
    const name = accName.trim();
    if (!name) return;
    const start = accStart.trim() ? parseAmount(accStart.replace(/^-/, '')) : 0;
    if (start === null) return;
    const signed = accStart.trim().startsWith('-') ? -start : start;
    update((m) => ({ ...m, accounts: [...m.accounts, { id: newId(), groupId, name, start: signed }] }));
    setAccName('');
    setAccStart('');
    setAddingIn(null);
  };

  const removeAccount = (id: string) =>
    update((m) => ({
      ...m,
      accounts: m.accounts.filter((a) => a.id !== id),
      entries: m.entries.filter((e) => e.accountId !== id && e.toAccountId !== id),
    }));

  const removeGroup = (id: string) =>
    update((m) => {
      const gone = new Set(m.accounts.filter((a) => a.groupId === id).map((a) => a.id));
      return {
        ...m,
        groups: m.groups.filter((g) => g.id !== id),
        accounts: m.accounts.filter((a) => a.groupId !== id),
        entries: m.entries.filter((e) => !gone.has(e.accountId) && !(e.toAccountId && gone.has(e.toAccountId))),
      };
    });

  return (
    <div className="section first">
      {money.groups.map((g) => (
        <div key={g.id} className="mgroup">
          <div className="mgroup-head">
            <span>{g.name}</span>
            <RemoveButton name={g.name} onRemove={() => removeGroup(g.id)} />
          </div>
          <ul className="list">
            {money.accounts.filter((a) => a.groupId === g.id).map((a) => (
              <li key={a.id}>
                <div className="top" style={{ marginBottom: 0 }}>
                  <span className="left"><span className="name">{a.name}</span></span>
                  <span className="mbal">{formatMoney(accountBalance(money, a.id))}</span>
                  <RemoveButton name={a.name} onRemove={() => removeAccount(a.id)} />
                </div>
              </li>
            ))}
          </ul>
          {addingIn === g.id ? (
            <form className="addbox addwrap maddacc" autoComplete="off" onSubmit={(e) => addAccount(e, g.id)}>
              <input
                ref={accRef}
                type="text"
                maxLength={40}
                placeholder="Account name"
                aria-label="New account"
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
                onBlur={() => { if (!accName.trim() && !accStart.trim()) setAddingIn(null); }}
              />
              <input
                type="text"
                inputMode="decimal"
                className="mstart"
                placeholder="Balance"
                aria-label="Starting balance"
                value={accStart}
                onChange={(e) => setAccStart(e.target.value)}
              />
              <button className="add" type="submit">Add</button>
            </form>
          ) : (
            <button type="button" className="addbtn addwrap" aria-label={'Add account to ' + g.name} onClick={() => { setAccName(''); setAccStart(''); setAddingIn(g.id); }}>
              {PLUS} Account
            </button>
          )}
        </div>
      ))}

      {addingGroup ? (
        <form className="addbox addwrap" autoComplete="off" onSubmit={addGroup}>
          <input
            ref={groupRef}
            type="text"
            maxLength={40}
            placeholder="Section name"
            aria-label="New section"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onBlur={() => { if (!groupName.trim()) setAddingGroup(false); }}
          />
          <button className="add" type="submit">Add</button>
        </form>
      ) : (
        <button type="button" className="addbtn addwrap msection" onClick={() => setAddingGroup(true)}>
          {PLUS} Section
        </button>
      )}
    </div>
  );
}
