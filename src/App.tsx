import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout.tsx'
import { Landing } from './pages/Landing.tsx'
import { SongIndex } from './pages/SongIndex.tsx'
import { SongPage } from './pages/SongPage.tsx'
import './styles/app.css'

const Admin = lazy(() =>
  import('./pages/Admin.tsx').then((m) => ({ default: m.Admin })),
)

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'canti', element: <SongIndex /> },
      { path: 'canti/:id', element: <SongPage /> },
      {
        path: 'admin',
        element: (
          <Suspense fallback={<p>Caricamento…</p>}>
            <Admin />
          </Suspense>
        ),
      },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
