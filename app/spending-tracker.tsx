"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";

type Tab = "home" | "activity" | "admin";
type Role = "admin" | "member";
type PaymentMethod = "cash" | "card" | "bank_transfer" | "wallet";

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "inactive";
  avatarColor: string;
};

type Expense = {
  id: string;
  merchant: string;
  amount: number;
  category: string;
  paymentMethod: PaymentMethod;
  spentAt: string;
  spenderId: string;
  proofUrl?: string | null;
  notes?: string;
};

type TeamSettings = {
  teamName: string;
  currency: string;
  requireProof: boolean;
};

type BootstrapPayload = {
  configured: boolean;
  currentMember?: Member;
  members?: Member[];
  expenses?: Expense[];
  settings?: TeamSettings;
  message?: string;
};

const DEMO_MEMBERS: Member[] = [
  { id: "m-rog", name: "Admin", email: "admin@peptikingmedia.com", role: "admin", status: "active", avatarColor: "#f3bf73" },
  { id: "m-maya", name: "Maya Chen", email: "maya@northstar.team", role: "member", status: "active", avatarColor: "#a9d9c7" },
  { id: "m-niko", name: "Niko Rahman", email: "niko@northstar.team", role: "member", status: "active", avatarColor: "#f5a98c" },
  { id: "m-lena", name: "Lena Park", email: "lena@northstar.team", role: "member", status: "active", avatarColor: "#c5b8e8" },
];

const DEMO_EXPENSES: Expense[] = [
  { id: "e-1", merchant: "CloudNine Software", amount: 3790, category: "Software", paymentMethod: "card", spentAt: "2026-08-03", spenderId: "m-rog", proofUrl: "proof" },
  { id: "e-2", merchant: "Team lunch · Savoey", amount: 3000, category: "Meals", paymentMethod: "wallet", spentAt: "2026-08-02", spenderId: "m-maya", proofUrl: "proof" },
  { id: "e-3", merchant: "Client welcome gifts", amount: 2885, category: "Other", paymentMethod: "bank_transfer", spentAt: "2026-08-02", spenderId: "m-niko", proofUrl: "proof" },
  { id: "e-4", merchant: "AIS Business", amount: 2140, category: "Utilities", paymentMethod: "card", spentAt: "2026-08-01", spenderId: "m-rog", proofUrl: "proof" },
  { id: "e-5", merchant: "Grab for Business", amount: 1240, category: "Transport", paymentMethod: "wallet", spentAt: "2026-08-01", spenderId: "m-maya", proofUrl: "proof" },
  { id: "e-6", merchant: "B2S stationery", amount: 865, category: "Supplies", paymentMethod: "cash", spentAt: "2026-07-31", spenderId: "m-niko", proofUrl: "proof" },
  { id: "e-7", merchant: "Common Ground café", amount: 480, category: "Meals", paymentMethod: "cash", spentAt: "2026-07-30", spenderId: "m-rog", proofUrl: "proof" },
  { id: "e-8", merchant: "Workshop snacks", amount: 420, category: "Meals", paymentMethod: "cash", spentAt: "2026-07-29", spenderId: "m-maya", proofUrl: "proof" },
];

const DEFAULT_SETTINGS: TeamSettings = {
  teamName: "Northstar Studio",
  currency: "EUR",
  requireProof: true,
};

const CATEGORIES = ["Meals", "Transport", "Software", "Supplies", "Utilities", "Travel", "Other"];
const CURRENCY_OPTIONS = [
  { value: "EUR", label: "Euro (EUR)" },
  { value: "VND", label: "Vietnamese đồng (VND)" },
];
const CATEGORY_SYMBOLS: Record<string, string> = {
  Meals: "M",
  Transport: "T",
  Software: "S",
  Supplies: "P",
  Utilities: "U",
  Travel: "A",
  Other: "•",
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Online",
  wallet: "Phone app",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarStyle(color: string): CSSProperties {
  return { "--avatar": color } as CSSProperties;
}

function formatMoney(amount: number, currency: string, compact = false) {
  const locale = currency === "VND" ? "vi-VN" : "en-IE";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

type DropdownOption = {
  value: string;
  label: string;
};

function Dropdown({ id, value, options, onChange }: {
  id: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, []);

  useEffect(() => {
    if (open) setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  const choose = (index: number) => {
    onChange(options[index].value);
    setOpen(false);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => (current + direction + options.length) % options.length);
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className={`select-control ${open ? "open" : ""}`} ref={rootRef}>
      <button
        id={id}
        type="button"
        className="select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={open ? `${id}-option-${options[activeIndex].value}` : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className="select-value">{options[selectedIndex]?.label}</span>
        <span className="select-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="select-menu" id={`${id}-listbox`} role="listbox" aria-label="Choose an option">
          {options.map((option, index) => (
            <button
              key={option.value}
              id={`${id}-option-${option.value}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`select-option ${index === activeIndex ? "active" : ""}`}
              onPointerMove={() => setActiveIndex(index)}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {option.value === value && <span className="select-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function displayDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(parsed);
}

function todayValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function SpendingTracker({ viewer }: { viewer: { name: string; email: string } }) {
  const [tab, setTab] = useState<Tab>("home");
  const [members, setMembers] = useState<Member[]>(DEMO_MEMBERS);
  const [expenses, setExpenses] = useState<Expense[]>(DEMO_EXPENSES);
  const [settings, setSettings] = useState<TeamSettings>(DEFAULT_SETTINGS);
  const [currentMember, setCurrentMember] = useState<Member>(DEMO_MEMBERS[0]);
  const [configured, setConfigured] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    let active = true;
    fetch("/api/bootstrap")
      .then(async (response) => {
        const payload = (await response.json()) as BootstrapPayload;
        if (!response.ok) throw new Error(payload.message ?? "Could not load team data");
        return payload;
      })
      .then((payload) => {
        if (!active || !payload.configured) return;
        setConfigured(true);
        if (payload.members?.length) setMembers(payload.members);
        if (payload.expenses) setExpenses(payload.expenses);
        if (payload.settings) setSettings(payload.settings);
        if (payload.currentMember) setCurrentMember(payload.currentMember);
      })
      .catch((error: Error) => {
        if (active) setToast(`${error.message}. Showing demo data.`);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const totalSpend = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const cashSpend = useMemo(() => expenses.filter((expense) => expense.paymentMethod === "cash").reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const digitalSpend = totalSpend - cashSpend;
  const filteredExpenses = useMemo(() => {
    const term = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      const matchesCategory = categoryFilter === "All" || expense.category === categoryFilter;
      const member = members.find((candidate) => candidate.id === expense.spenderId);
      const matchesSearch = !term || `${expense.merchant} ${expense.category} ${member?.name ?? ""}`.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, expenses, members, search]);

  const showToast = (message: string) => setToast(message);
  const navigate = (nextTab: Tab) => {
    setTab(nextTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addExpense = async (form: ExpenseFormValue) => {
    if (!configured) {
      const preview = form.proof && form.proof.type.startsWith("image/") ? URL.createObjectURL(form.proof) : "proof";
      const nextExpense: Expense = {
        id: `demo-${Date.now()}`,
        merchant: form.merchant,
        amount: Number(form.amount),
        category: form.category,
        paymentMethod: form.paymentMethod,
        spentAt: form.spentAt,
        spenderId: form.spenderId,
        notes: form.notes,
        proofUrl: preview,
      };
      setExpenses((current) => [nextExpense, ...current]);
      setAddOpen(false);
      showToast("Expense added to this demo. Connect Supabase to save it for the team.");
      return;
    }

    const body = new FormData();
    body.set("merchant", form.merchant);
    body.set("amount", form.amount);
    body.set("category", form.category);
    body.set("paymentMethod", form.paymentMethod);
    body.set("spentAt", form.spentAt);
    body.set("spenderId", form.spenderId);
    body.set("notes", form.notes);
    if (form.proof) body.set("proof", form.proof);

    const response = await fetch("/api/expenses", { method: "POST", body });
    const payload = (await response.json()) as { expense?: Expense; message?: string };
    if (!response.ok || !payload.expense) throw new Error(payload.message ?? "Could not save expense");
    setExpenses((current) => [payload.expense!, ...current]);
    setAddOpen(false);
    showToast("Expense saved and proof uploaded.");
  };

  return (
    <div className="app-shell">
      <Sidebar
        tab={tab}
        teamName={settings.teamName}
        member={currentMember}
        viewer={viewer}
        onNavigate={navigate}
      />

      <main className="main-canvas">
        <MobileTopbar viewer={viewer} />
        {!configured && (
          <div className="demo-banner">
            <span>Demo data</span>
            <span>·</span>
            <button onClick={() => navigate("admin")}>Connect Supabase</button>
          </div>
        )}

        {tab === "home" && (
          <HomeDashboard
            expenses={expenses}
            members={members}
            settings={settings}
            totalSpend={totalSpend}
            cashSpend={cashSpend}
            digitalSpend={digitalSpend}
            onAdd={() => setAddOpen(true)}
            onViewAll={() => navigate("activity")}
          />
        )}

        {tab === "activity" && (
          <ActivityView
            expenses={filteredExpenses}
            members={members}
            settings={settings}
            search={search}
            categoryFilter={categoryFilter}
            onSearch={setSearch}
            onFilter={setCategoryFilter}
            onAdd={() => setAddOpen(true)}
          />
        )}

        {tab === "admin" && (
          <AdminView
            configured={configured}
            members={members}
            settings={settings}
            currentMember={currentMember}
            onMembersChange={setMembers}
            onSettingsChange={setSettings}
            onToast={showToast}
          />
        )}
      </main>

      <BottomNav tab={tab} onNavigate={navigate} onAdd={() => setAddOpen(true)} />

      {addOpen && (
        <ExpenseModal
          members={members.filter(
            (member) => member.status === "active" && member.role === "member",
          )}
          settings={settings}
          onClose={() => setAddOpen(false)}
          onSubmit={addExpense}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function Sidebar({ tab, teamName, member, viewer, onNavigate }: {
  tab: Tab;
  teamName: string;
  member: Member;
  viewer: { name: string; email: string };
  onNavigate: (tab: Tab) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand"><Image className="brand-symbol" src="/icon.png" alt="" width={40} height={40} priority /><span>Peptiking</span></div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        <NavButton desktop label="Overview" symbol="⌂" active={tab === "home"} onClick={() => onNavigate("home")} />
        <NavButton desktop label="Expenses" symbol="≋" active={tab === "activity"} onClick={() => onNavigate("activity")} />
        <NavButton desktop label="Admin" symbol="⚙" active={tab === "admin"} onClick={() => onNavigate("admin")} />
      </nav>
      <div className="sidebar-account">
        <span className="avatar" style={avatarStyle(member.avatarColor)}>{initials(viewer.name)}</span>
        <div><strong>{viewer.name}</strong><span>{teamName}</span></div>
      </div>
    </aside>
  );
}

function MobileTopbar({ viewer }: { viewer: { name: string; email: string } }) {
  return (
    <header className="mobile-topbar">
      <div className="brand"><Image className="brand-symbol" src="/icon.png" alt="" width={40} height={40} priority /><span>Peptiking</span></div>
      <span className="avatar" style={avatarStyle("#a9d9c7")}>{initials(viewer.name)}</span>
    </header>
  );
}

function NavButton({ label, symbol, active, desktop, onClick }: { label: string; symbol: string; active: boolean; desktop?: boolean; onClick: () => void }) {
  if (desktop) {
    return <button className={`sidebar-button ${active ? "active" : ""}`} onClick={onClick}><span>{symbol}</span><span>{label}</span></button>;
  }
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}><span>{symbol}</span><span>{label}</span></button>;
}

function BottomNav({ tab, onNavigate, onAdd }: { tab: Tab; onNavigate: (tab: Tab) => void; onAdd: () => void }) {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      <NavButton label="Home" symbol="⌂" active={tab === "home"} onClick={() => onNavigate("home")} />
      <NavButton label="Expenses" symbol="≋" active={tab === "activity"} onClick={() => onNavigate("activity")} />
      <button className="nav-add" onClick={onAdd} aria-label="Add expense">+</button>
      <NavButton label="Admin" symbol="⚙" active={tab === "admin"} onClick={() => onNavigate("admin")} />
    </nav>
  );
}

function HomeDashboard({ expenses, members, settings, totalSpend, cashSpend, digitalSpend, onAdd, onViewAll }: {
  expenses: Expense[];
  members: Member[];
  settings: TeamSettings;
  totalSpend: number;
  cashSpend: number;
  digitalSpend: number;
  onAdd: () => void;
  onViewAll: () => void;
}) {
  const activeMembers = members.filter((member) => member.status === "active").length;
  const expensesWithProof = expenses.filter((expense) => expense.proofUrl).length;
  const categories = CATEGORIES.map((category) => ({
    category,
    amount: expenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0),
  })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 4);

  return (
    <>
      <div className="intro-row">
        <div>
          <p className="eyebrow">August overview</p>
          <h1 className="page-heading">Your spending overview.</h1>
          <p className="intro-copy">Your team has logged {expenses.length} expenses this month.</p>
        </div>
        <button className="primary-button desktop-add" onClick={onAdd}><span>＋</span> Add expense</button>
      </div>

      <section className="summary-grid" aria-label="Monthly spending summary">
        <article className="hero-card">
          <p className="hero-label">Total team spend</p>
          <h2 className="hero-amount">{formatMoney(totalSpend, settings.currency)}</h2>
          <div className="hero-meta"><span className="hero-meta-dot" /><span>{expenses.length} recorded expense{expenses.length === 1 ? "" : "s"}</span></div>
          <div className="hero-insight"><strong>{activeMembers}</strong><span>active member{activeMembers === 1 ? "" : "s"}</span></div>
        </article>
        <div className="mini-grid">
          <article className="stat-card">
            <span className="stat-icon">C</span>
            <span className="stat-label">Cash spending</span>
            <strong className="stat-value">{formatMoney(cashSpend, settings.currency)}</strong>
          </article>
          <article className="stat-card orange">
            <span className="stat-icon">↗</span>
            <span className="stat-label">Online & phone</span>
            <strong className="stat-value">{formatMoney(digitalSpend, settings.currency)}</strong>
          </article>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="card">
          <div className="section-head"><div><h2>Spending by category</h2><p>Current month distribution</p></div><strong>{formatMoney(totalSpend, settings.currency, true)}</strong></div>
          <div className="category-list">
            {categories.map((item) => (
              <div className="category-row" key={item.category}>
                <span className="category-dot">{CATEGORY_SYMBOLS[item.category]}</span>
                <div className="category-copy"><strong>{item.category}</strong><span>{Math.round((item.amount / totalSpend) * 100)}% of spend</span></div>
                <span className="category-amount">{formatMoney(item.amount, settings.currency)}</span>
              </div>
            ))}
            {!categories.length && <div className="category-empty">Categories will appear after the first expense.</div>}
          </div>
          <div className="category-footnote"><span className="proof-dot" />{expensesWithProof} expense{expensesWithProof === 1 ? "" : "s"} with proof</div>
        </article>

        <article className="expense-panel">
          <div className="section-head"><div><h2>Recent expenses</h2><p>Latest team activity</p></div><button className="text-button" onClick={onViewAll}>View all</button></div>
          <ExpenseList expenses={expenses.slice(0, 5)} members={members} settings={settings} />
        </article>
      </section>
    </>
  );
}

function ActivityView({ expenses, members, settings, search, categoryFilter, onSearch, onFilter, onAdd }: {
  expenses: Expense[];
  members: Member[];
  settings: TeamSettings;
  search: string;
  categoryFilter: string;
  onSearch: (value: string) => void;
  onFilter: (value: string) => void;
  onAdd: () => void;
}) {
  return (
    <>
      <div className="tab-header">
        <div><p className="eyebrow">Team ledger</p><h1>Expenses</h1><p className="intro-copy">Every payment, person, and proof in one place.</p></div>
        <button className="primary-button desktop-add" onClick={onAdd}>＋ Add expense</button>
      </div>
      <div className="search-box"><span>⌕</span><input aria-label="Search expenses" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search merchant, category or person" /></div>
      <div className="filter-row" aria-label="Expense categories">
        {["All", ...CATEGORIES].map((category) => <button key={category} className={`filter-chip ${categoryFilter === category ? "active" : ""}`} onClick={() => onFilter(category)}>{category}</button>)}
      </div>
      <section className="expense-panel">
        <div className="section-head"><div><h2>{categoryFilter === "All" ? "All spending" : categoryFilter}</h2><p>{expenses.length} expense{expenses.length === 1 ? "" : "s"}</p></div><strong>{formatMoney(expenses.reduce((sum, item) => sum + item.amount, 0), settings.currency)}</strong></div>
        <ExpenseList expenses={expenses} members={members} settings={settings} />
      </section>
    </>
  );
}

function ExpenseList({ expenses, members, settings }: { expenses: Expense[]; members: Member[]; settings: TeamSettings }) {
  if (!expenses.length) return <div className="empty-state">No expenses match this view.</div>;
  return (
    <div className="expense-list">
      {expenses.map((expense) => {
        const member = members.find((candidate) => candidate.id === expense.spenderId);
        return (
          <div className="expense-row" key={expense.id}>
            <span className="expense-icon">{CATEGORY_SYMBOLS[expense.category] ?? "•"}</span>
            <div className="expense-main">
              <p className="expense-title">{expense.merchant}</p>
              <p className="expense-subtitle"><span>{member?.name ?? "Team member"}</span><span>·</span><span>{displayDate(expense.spentAt)}</span>{expense.proofUrl && <><span>·</span><span className="proof-dot" title="Proof attached" /></>}</p>
            </div>
            <div className="expense-number"><strong>{formatMoney(expense.amount, settings.currency)}</strong><span>{PAYMENT_LABELS[expense.paymentMethod]}</span></div>
          </div>
        );
      })}
    </div>
  );
}

type ExpenseFormValue = {
  merchant: string;
  amount: string;
  category: string;
  paymentMethod: PaymentMethod;
  spentAt: string;
  spenderId: string;
  notes: string;
  proof: File | null;
};

function ExpenseModal({ members, settings, onClose, onSubmit }: {
  members: Member[];
  settings: TeamSettings;
  onClose: () => void;
  onSubmit: (value: ExpenseFormValue) => Promise<void>;
}) {
  const [value, setValue] = useState<ExpenseFormValue>({
    merchant: "",
    amount: "",
    category: "Meals",
    paymentMethod: "cash",
    spentAt: todayValue(),
    spenderId: "",
    notes: "",
    proof: null,
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const selectProof = (file: File | null) => {
    setValue((current) => ({ ...current, proof: file }));
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(file?.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!value.amount || Number(value.amount) <= 0) return setError("Enter an amount greater than zero.");
    if (!value.merchant.trim()) return setError("Add the merchant or reason for spending.");
    if (!value.spenderId) return setError("Choose who spent this amount.");
    if (settings.requireProof && !value.proof) return setError("Attach a receipt photo or screenshot as proof.");
    setSaving(true);
    try {
      await onSubmit(value);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save expense");
      setSaving(false);
    }
  };

  const proofPrompt = value.paymentMethod === "cash" ? "Take a receipt photo" : "Add payment screenshot";

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="expense-modal" onSubmit={submit} aria-label="Add expense" role="dialog" aria-modal="true">
        <div className="modal-head"><div><p className="eyebrow">New spending</p><h2>Add an expense</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button></div>
        <label className="amount-field"><span>{settings.currency}</span><input autoFocus inputMode="decimal" placeholder="0" aria-label="Amount" value={value.amount} onChange={(event) => setValue({ ...value, amount: event.target.value })} /></label>

        <div className="field-grid">
          <div className="field"><span className="field-label">How was it paid?</span><div className="segmented">{(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((method) => <button key={method} type="button" className={`segment-button ${value.paymentMethod === method ? "active" : ""}`} onClick={() => setValue({ ...value, paymentMethod: method })}>{PAYMENT_LABELS[method]}</button>)}</div></div>
          <div className="field"><span className="field-label">Who spent it?</span><div className="member-picker">{members.map((member) => <button key={member.id} type="button" className={`member-pill ${value.spenderId === member.id ? "active" : ""}`} onClick={() => setValue({ ...value, spenderId: member.id })}><span className="avatar small" style={avatarStyle(member.avatarColor)}>{initials(member.name)}</span><span>{member.name.split(" ")[0]}</span></button>)}</div></div>
          <div className="field-grid two">
            <div className="field"><label htmlFor="merchant">Merchant or reason</label><input id="merchant" value={value.merchant} onChange={(event) => setValue({ ...value, merchant: event.target.value })} placeholder="e.g. Taxi to client" /></div>
            <div className="field"><label htmlFor="category">Category</label><Dropdown id="category" value={value.category} options={CATEGORIES.map((category) => ({ value: category, label: category }))} onChange={(category) => setValue({ ...value, category })} /></div>
            <div className="field"><label htmlFor="spentAt">Date</label><input id="spentAt" type="date" value={value.spentAt} onChange={(event) => setValue({ ...value, spentAt: event.target.value })} /></div>
            <div className="field"><label htmlFor="notes">Note <span className="muted">(optional)</span></label><input id="notes" value={value.notes} onChange={(event) => setValue({ ...value, notes: event.target.value })} placeholder="What was this for?" /></div>
          </div>
          <div className="field"><span className="field-label">Proof of spending {settings.requireProof ? "· Required" : "· Optional"}</span><label className="proof-drop">{preview ? <img className="proof-preview" src={preview} alt="Selected receipt preview" /> : <div><span aria-hidden="true">▣</span><strong>{value.proof?.name ?? proofPrompt}</strong><span>{value.paymentMethod === "cash" ? "Use camera or choose a photo" : "Choose a screenshot from your phone"}</span></div>}<input type="file" accept="image/*,.pdf" capture={value.paymentMethod === "cash" ? "environment" : undefined} onChange={(event) => selectProof(event.target.files?.[0] ?? null)} />{value.proof && <span className="proof-change">Change</span>}</label></div>
        </div>

        {error && <p role="alert" style={{ color: "#b64b2c", fontSize: 12, fontWeight: 750, margin: "12px 0 0" }}>{error}</p>}
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button dark" disabled={saving}>{saving ? "Saving…" : "Save expense"}</button></div>
      </form>
    </div>,
    document.body,
  );
}

function AdminView({ configured, members, settings, currentMember, onMembersChange, onSettingsChange, onToast }: {
  configured: boolean;
  members: Member[];
  settings: TeamSettings;
  currentMember: Member;
  onMembersChange: (members: Member[]) => void;
  onSettingsChange: (settings: TeamSettings) => void;
  onToast: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const addMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.includes("@")) return onToast("Add a member name and valid email.");
    setAdding(true);
    const draft: Member = { id: `member-${Date.now()}`, name: name.trim(), email: email.trim().toLowerCase(), role, status: "active", avatarColor: ["#a9d9c7", "#f5a98c", "#c5b8e8", "#f3bf73"][members.length % 4] };
    try {
      let created = draft;
      if (configured) {
        const response = await fetch("/api/admin/members", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: draft.name, email: draft.email, role: draft.role }) });
        const payload = (await response.json()) as { member?: Member; message?: string };
        if (!response.ok || !payload.member) throw new Error(payload.message ?? "Could not add member");
        created = payload.member;
      }
      onMembersChange([...members, created]);
      setName(""); setEmail(""); setRole("member");
      onToast(configured ? "Member added and active. They can use the shared website password." : "Member added to the demo team.");
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : "Could not add member");
    } finally {
      setAdding(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      if (configured) {
        const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) });
        const payload = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(payload.message ?? "Could not save settings");
      }
      onToast(configured ? "Workspace settings saved." : "Demo settings updated.");
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  if (currentMember.role !== "admin") {
    return <section className="admin-card"><h1>Admin access only</h1><p className="muted">Ask a team admin to manage members and platform settings.</p></section>;
  }

  return (
    <>
      <div className="tab-header"><div><p className="eyebrow">Workspace control</p><h1>Admin</h1><p className="intro-copy">Manage who can spend and how your team records it.</p></div></div>
      <div className="admin-layout">
        <section className="admin-card">
          <div className="section-head"><div><h2>Team members</h2><p>{members.filter((member) => member.status === "active").length} active profiles</p></div></div>
          <div className="shared-access-note"><strong>One password for everyone</strong><span>Members use the website password. Profiles only identify who spent; no separate login setup is needed.</span></div>
          <div className="member-list">{members.map((member) => <div className="member-row" key={member.id}><span className="avatar large" style={avatarStyle(member.avatarColor)}>{initials(member.name)}</span><div className="member-copy"><strong>{member.name}</strong><span>{member.email} · {member.status}</span></div><span className={`role-badge ${member.role}`}>{member.role}</span></div>)}</div>
          <p className="divider-label">Add a member</p>
          <form className="settings-form" onSubmit={addMember}>
            <div className="field-grid two"><div className="field"><label htmlFor="member-name">Full name</label><input id="member-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Team member" /></div><div className="field"><label htmlFor="member-email">Email (for records)</label><input id="member-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" /></div></div>
            <div className="field"><label htmlFor="member-role">Role</label><Dropdown id="member-role" value={role} options={[{ value: "member", label: "Member — add and view spending" }, { value: "admin", label: "Admin — manage the workspace" }]} onChange={(nextRole) => setRole(nextRole as Role)} /></div>
            <button className="secondary-button full" disabled={adding}>{adding ? "Adding…" : "＋ Add team member"}</button>
          </form>
        </section>

        <section className="admin-card">
          <div className="section-head"><div><h2>Workspace settings</h2><p>Team-wide preferences</p></div></div>
          {!configured && <div className="setup-box"><h3>Connect Supabase to go live</h3><p>The interface is running with demo data. Your private proof bucket and team tables are already prepared in the project.</p><ol className="setup-steps"><li><span className="step-number">1</span>Run the included schema in Supabase</li><li><span className="step-number">2</span>Add the project URL and service key</li><li><span className="step-number">3</span>Refresh — your first admin is created</li></ol></div>}
          <div className="settings-form" style={{ marginTop: 18 }}>
            <div className="field"><label htmlFor="team-name">Team name</label><input id="team-name" value={settings.teamName} onChange={(event) => onSettingsChange({ ...settings, teamName: event.target.value })} /></div>
            <div className="field"><label htmlFor="currency">Currency</label><Dropdown id="currency" value={settings.currency} options={CURRENCY_OPTIONS} onChange={(currency) => onSettingsChange({ ...settings, currency })} /></div>
            <div className="toggle-row"><div className="toggle-copy"><strong>Require proof of spending</strong><span>Receipt photo or payment screenshot</span></div><div className="toggle-action"><span>{settings.requireProof ? "Required" : "Optional"}</span><button type="button" className={`toggle ${settings.requireProof ? "on" : ""}`} onClick={() => onSettingsChange({ ...settings, requireProof: !settings.requireProof })} aria-label="Toggle required proof" aria-pressed={settings.requireProof} /></div></div>
            <button className="primary-button dark full" onClick={saveSettings} disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
          </div>
        </section>
      </div>
    </>
  );
}
