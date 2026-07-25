import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import AppSidebar from '../components/AppSidebar.jsx'
import { apiRequest } from '../lib/api.js'

function todayValue() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

const newDraft = () => ({
  type: 'Expense',
  amount: '',
  category: '',
  transactionDate: todayValue(),
  notes: '',
})

const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })

function sortTransactions(items) {
  return [...items].sort((left, right) =>
    right.transactionDate.localeCompare(left.transactionDate)
    || right.createdAt.localeCompare(left.createdAt))
}

function formatTransactionDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export default function FinancePage() {
  const { user, accessToken, logout } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [draft, setDraft] = useState(newDraft)
  const [editingId, setEditingId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [validationError, setValidationError] = useState('')

  const request = useCallback((path, options = {}) => apiRequest(path, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
  }), [accessToken])

  useEffect(() => {
    request('/api/financetransactions')
      .then(setTransactions)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false))
  }, [request])

  const resetForm = () => {
    setDraft(newDraft())
    setEditingId(null)
    setValidationError('')
  }

  const submitTransaction = async (event) => {
    event.preventDefault()
    const amount = Number(draft.amount)
    if (!Number.isFinite(amount) || amount <= 0 || !draft.category.trim() || !draft.transactionDate) {
      setValidationError('Enter an amount greater than zero, a category, and a transaction date.')
      return
    }

    setIsSaving(true)
    setError('')
    setValidationError('')
    try {
      const saved = await request(
        editingId ? `/api/financetransactions/${editingId}` : '/api/financetransactions',
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify({ ...draft, amount }),
        },
      )
      setTransactions((current) => sortTransactions(editingId
        ? current.map((transaction) => transaction.id === editingId ? saved : transaction)
        : [...current, saved]))
      resetForm()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (transaction) => {
    setEditingId(transaction.id)
    setDraft({
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      transactionDate: transaction.transactionDate,
      notes: transaction.notes ?? '',
    })
    setError('')
    setValidationError('')
  }

  const deleteTransaction = async (transaction) => {
    if (!window.confirm(`Delete this ${transaction.type.toLowerCase()} transaction? This cannot be undone.`)) return
    setBusyId(transaction.id)
    setError('')
    try {
      await request(`/api/financetransactions/${transaction.id}`, { method: 'DELETE' })
      setTransactions((current) => current.filter((item) => item.id !== transaction.id))
      if (editingId === transaction.id) resetForm()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId(null)
    }
  }

  const income = transactions
    .filter((transaction) => transaction.type === 'Income')
    .reduce((total, transaction) => total + transaction.amount, 0)
  const expenses = transactions
    .filter((transaction) => transaction.type === 'Expense')
    .reduce((total, transaction) => total + transaction.amount, 0)
  const initials = user.displayName.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="app-shell">
      <AppSidebar user={user} onLogout={logout} />
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">M</span><strong>Momentum</strong></div>
          <div className="crumb"><span>Workspace</span><b>/</b><strong>Finance</strong></div>
          <div className="top-actions"><div className="top-avatar">{initials}</div></div>
        </header>

        <main className="finance-page">
          <section className="habits-heading finance-heading">
            <div><p className="date">Money in motion</p><h1>Your finances</h1><p>Track income and expenses to understand where your money goes.</p></div>
            <div className="completion-summary finance-summary"><strong>{currency.format(income - expenses)}</strong><span>all-time balance<br />{transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}</span></div>
          </section>

          {error && <div className="habits-error" role="alert">{error}</div>}

          <section className="habits-layout">
            <article className="habit-panel habit-form-card finance-form-card">
              <span className="eyebrow teal-text">{editingId ? 'Update transaction' : 'New transaction'}</span>
              <h2>{editingId ? 'Edit transaction' : 'Record your money'}</h2>
              <form onSubmit={submitTransaction}>
                {validationError && <div className="finance-validation" role="alert">{validationError}</div>}
                <div className="task-form-grid">
                  <label>Type<select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}><option value="Income">Income</option><option value="Expense">Expense</option></select></label>
                  <label>Amount<input type="number" min="0.01" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} placeholder="0.00" required /></label>
                </div>
                <label>Category<input maxLength="100" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="e.g. Salary or Groceries" required /></label>
                <label>Transaction date<input type="date" value={draft.transactionDate} onChange={(event) => setDraft({ ...draft, transactionDate: event.target.value })} required /></label>
                <label>Notes <span>Optional</span><textarea maxLength="500" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Add useful details" /></label>
                <div className="habit-form-actions">
                  {editingId && <button type="button" className="button-secondary" onClick={resetForm}>Cancel</button>}
                  <button type="submit" className="button-primary finance-primary" disabled={isSaving}>{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Add transaction'}</button>
                </div>
              </form>
            </article>

            <section className="habit-panel habit-list-panel" aria-live="polite">
              <header><div><span className="eyebrow">History</span><h2>Transaction history</h2></div><span className="habit-total">{transactions.length} total</span></header>
              {isLoading ? <div className="habit-state">Loading your transactions…</div> : transactions.length === 0 ? (
                <div className="habit-state empty finance-empty"><span>$</span><h3>No transactions yet</h3><p>Add your first income or expense to start your history.</p></div>
              ) : (
                <div className="habits-list">
                  {transactions.map((transaction) => <article className={`habit-row finance-row ${transaction.type.toLowerCase()}`} key={transaction.id}>
                    <div className="transaction-icon" aria-hidden="true">{transaction.type === 'Income' ? '↓' : '↑'}</div>
                    <div className="habit-copy finance-copy">
                      <div className="finance-title-line"><h3>{transaction.category}</h3><span className={`transaction-type ${transaction.type.toLowerCase()}`}>{transaction.type}</span></div>
                      {transaction.notes && <p>{transaction.notes}</p>}
                      <span>{formatTransactionDate(transaction.transactionDate)}</span>
                    </div>
                    <strong className={`transaction-amount ${transaction.type.toLowerCase()}`}>{transaction.type === 'Income' ? '+' : '−'}{currency.format(transaction.amount)}</strong>
                    <div className="habit-actions"><button type="button" onClick={() => startEditing(transaction)} disabled={busyId === transaction.id}>Edit</button><button className="delete" type="button" onClick={() => deleteTransaction(transaction)} disabled={busyId === transaction.id}>Delete</button></div>
                  </article>)}
                </div>
              )}
            </section>
          </section>
        </main>
      </div>
    </div>
  )
}
