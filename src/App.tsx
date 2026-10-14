import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireStaff } from './lib/auth'
import { ConfigProvider } from './lib/config'
import Inicio from './pages/cliente/Inicio'
import Resultado from './pages/cliente/Resultado'
import Configuracoes from './pages/admin/Configuracoes'
import Dashboard from './pages/admin/Dashboard'
import Importar from './pages/admin/Importar'
import AdminLayout from './pages/admin/Layout'
import Login from './pages/admin/Login'
import Pedido from './pages/admin/Pedido'
import Personalizacao from './pages/admin/Personalizacao'

export default function App() {
  return (
    <ConfigProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/pedido" element={<Resultado />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<RequireStaff><AdminLayout /></RequireStaff>}>
            <Route index element={<Dashboard />} />
            <Route path="importar" element={<Importar />} />
            <Route path="pedido/:id" element={<Pedido />} />
            <Route path="personalizacao" element={<RequireStaff soAdmin><Personalizacao /></RequireStaff>} />
            <Route path="configuracoes" element={<RequireStaff soAdmin><Configuracoes /></RequireStaff>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ConfigProvider>
  )
}
