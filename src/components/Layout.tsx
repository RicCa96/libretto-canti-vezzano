import {Link, NavLink, Outlet} from 'react-router-dom'

export function Layout() {
    return (
        <>
            <header className="app-header">
                <Link to="/" className="app-header__brand">
                    <h1>Libretto dei Canti</h1>
                </Link>
                <nav className="app-header__nav">
                    <NavLink to="/" end>
                        Messa di oggi
                    </NavLink>
                    <NavLink to="/canti">Indice</NavLink>
                </nav>
            </header>
            <main>
                <Outlet/>
            </main>
        </>
    )
}
