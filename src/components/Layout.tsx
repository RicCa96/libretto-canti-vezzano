import {Link, NavLink, Outlet} from 'react-router-dom'

export function Layout() {
    return (
        <>
            <header className="app-header">
                <Link to="/" className="app-header__brand">
                    <img src="/logo.jpg" alt="" className="app-header__logo" aria-hidden="true"/>
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
            <footer className="app-footer">
                <img src="/logo.jpg" alt="" className="app-footer__logo" aria-hidden="true"/>
                <div className="app-footer__text">
                    <p className="app-footer__title">Unità Pastorale Don Ennio Melioli</p>
                    <p className="app-footer__sub">
                        Parrocchie di: La Vecchia, Montalto, Paderna, Pecorile, Puianello, Vezzano sul Crostolo
                    </p>
                </div>
            </footer>
        </>
    )
}
