import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <header className="app-header">
        <h1>☕ Belka Coffee</h1>
        <p>Графики и зарплаты бариста</p>
      </header>
      
      <main className="app-main">
        <div className="card">
          <h2>Добро пожаловать!</h2>
          <p>Проект находится в разработке.</p>
          <p>Этап 0 завершён ✅</p>
          
          <div className="counter">
            <button onClick={() => setCount((count) => count + 1)}>
              Счётчик: {count}
            </button>
          </div>
          
          <div className="info">
            <p>Следующий этап: База данных + Auth</p>
          </div>
        </div>
      </main>
      
      <footer className="app-footer">
        <p>Powered by React + Vite + Supabase</p>
      </footer>
    </div>
  )
}

export default App
