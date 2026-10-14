import { Route, Routes } from 'react-router-dom'

function EmBreve({ titulo }: { titulo: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center p-4">
      <div className="rounded-card bg-card p-6 text-center shadow-suave">
        <h1 className="text-xl font-extrabold text-azul">{titulo}</h1>
        <p className="mt-2 text-sm text-secundario">Tela em construção.</p>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EmBreve titulo="Início" />} />
      <Route path="/pedido" element={<EmBreve titulo="Resultado" />} />
      <Route path="/admin/login" element={<EmBreve titulo="Login" />} />
      <Route path="/admin/*" element={<EmBreve titulo="Painel" />} />
    </Routes>
  )
}
