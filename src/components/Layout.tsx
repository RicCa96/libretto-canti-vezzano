import { Link, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <>
      <header className="app-header">
        <Link to="/">
          <h1>Libretto dei Canti</h1>
        </Link>
        <nav>
          <Link to="/">Messa di oggi</Link>
          <Link to="/canti">Indice</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  )
}
