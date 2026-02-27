import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import './App.css'

function App() {
  const [tasks, setTasks] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dueDate, setDueDate] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editDueDate, setEditDueDate] = useState('')

  // 初回読み込み
  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) {
      setError('タスクの読み込みに失敗しました')
    } else {
      setTasks(data)
    }
    setLoading(false)
  }

  const addTask = async () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    const { data, error } = await supabase
      .from('tasks')
      .insert({ text: trimmed, completed: false, due_date: dueDate || null })
      .select()
      .single()
    if (!error) {
      setTasks((prev) => [...prev, data])
      setInputValue('')
      setDueDate('')
    }
  }

  const deleteTask = async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== id))
    }
  }

  const toggleTask = async (id, completed) => {
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !completed })
      .eq('id', id)
    if (!error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
      )
    }
  }

  const clearCompleted = async () => {
    const completedIds = tasks.filter((t) => t.completed).map((t) => t.id)
    const { error } = await supabase.from('tasks').delete().in('id', completedIds)
    if (!error) {
      setTasks((prev) => prev.filter((t) => !t.completed))
    }
  }

  const updateTask = async (id, text, dueDate) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const { error } = await supabase
      .from('tasks')
      .update({ text: trimmed, due_date: dueDate || null })
      .eq('id', id)
    if (!error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, text: trimmed, due_date: dueDate || null } : t
        )
      )
      setEditingId(null)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addTask()
  }

  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date(new Date().toDateString())
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.completed
    if (filter === 'completed') return task.completed
    return true
  })

  const completedCount = tasks.filter((t) => t.completed).length

  return (
    <div className="app">
      <div className="card">
        <h1 className="title">タスク管理</h1>

        <div className="stats">
          <span>{tasks.length} 件中 {completedCount} 件完了</span>
        </div>

        <div className="input-row">
          <input
            className="input"
            type="text"
            placeholder="新しいタスクを入力..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <input
            className="input input-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={loading}
          />
          <button className="btn btn-add" onClick={addTask} disabled={loading}>
            追加
          </button>
        </div>

        <div className="filter-row">
          {['all', 'active', 'completed'].map((f) => (
            <button
              key={f}
              className={`btn btn-filter ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'すべて' : f === 'active' ? '未完了' : '完了済み'}
            </button>
          ))}
        </div>

        {error && <p className="error">{error}</p>}

        <ul className="task-list">
          {loading && <li className="empty">読み込み中...</li>}
          {!loading && filteredTasks.length === 0 && (
            <li className="empty">タスクがありません</li>
          )}
          {filteredTasks.map((task) => (
            <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
              <button
                className={`check-btn ${task.completed ? 'checked' : ''}`}
                onClick={() => toggleTask(task.id, task.completed)}
                aria-label="完了切り替え"
              >
                {task.completed ? '✓' : ''}
              </button>

              {editingId === task.id ? (
                <div className="edit-area">
                  <input
                    className="input edit-input"
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') updateTask(task.id, editText, editDueDate)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                  />
                  <input
                    className="input input-date"
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                  <button
                    className="btn btn-save"
                    onClick={() => updateTask(task.id, editText, editDueDate)}
                  >
                    保存
                  </button>
                  <button
                    className="btn btn-cancel"
                    onClick={() => setEditingId(null)}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="task-body">
                  <span className="task-text">{task.text}</span>
                  {task.due_date && (
                    <span className={`due-date ${isOverdue(task.due_date) ? 'overdue' : ''}`}>
                      期限: {task.due_date}
                    </span>
                  )}
                </div>
              )}

              {editingId !== task.id && (
                <>
                  <button
                    className="btn btn-edit"
                    onClick={() => {
                      setEditingId(task.id)
                      setEditText(task.text)
                      setEditDueDate(task.due_date ?? '')
                    }}
                    aria-label="編集"
                  >
                    ✎
                  </button>
                  <button
                    className="btn btn-delete"
                    onClick={() => deleteTask(task.id)}
                    aria-label="削除"
                  >
                    ✕
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        {completedCount > 0 && (
          <div className="footer">
            <button className="btn btn-clear" onClick={clearCompleted}>
              完了済みを削除
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
