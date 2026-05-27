import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout.tsx'
import { Landing } from './pages/Landing.tsx'
import { SongIndex } from './pages/SongIndex.tsx'
import { SongPage } from './pages/SongPage.tsx'
import './styles/app.css'

const Admin = lazy(() =>
  import('./pages/Admin.tsx').then((m) => ({ default: m.Admin })),
)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="canti" element={<SongIndex />} />
          <Route path="canti/:id" element={<SongPage />} />
          <Route
            path="admin"
            element={
              <Suspense fallback={<p>Caricamento…</p>}>
                <Admin />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
