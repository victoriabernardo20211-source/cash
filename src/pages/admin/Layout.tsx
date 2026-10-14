import { NavLink, Outlet } from 'react-router-dom'
import { IconeEngrenagem, IconePainel, IconePincel, IconeSair, IconeUpload, Marca } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useConfig } from '../../lib/config'

const ITENS = [
  { para: '/admin', rotulo: 'Pedidos', Icone: IconePainel, fim: true },
  { para: '/admin/importar', rotulo: 'Importar', Icone: IconeUpload },
  { para: '/admin/personalizacao', rotulo: 'Visual', Icone: IconePincel, soAdmin: true },
  { para: '/admin/configuracoes', rotulo: 'Ajustes', Icone: IconeEngrenagem, soAdmin: true },
]

export default function AdminLayout() {
  const { config } = useConfig()
  const { perfil, sair } = useAuth()
  const itens = ITENS.filter((i) => !i.soAdmin || perfil?.perfil === 'admin')

  return (
    <div className="min-h-dvh pb-20 md:flex md:pb-0">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-borda bg-card p-4 md:flex">
        <Marca nome={config.app_name} logo={config.logo_url} />
        <nav className="mt-8 space-y-1">
          {itens.map(({ para, rotulo, Icone, fim }) => (
            <NavLink
              key={para}
              to={para}
              end={fim}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-campo px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-separacao-bg text-azul' : 'text-secundario hover:bg-bg'}`
              }
            >
              <Icone className="size-5" />
              {rotulo === 'Visual' ? 'Personalização' : rotulo === 'Ajustes' ? 'Configurações' : rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-borda pt-4 text-sm">
          <p className="truncate font-semibold">{perfil?.nome || perfil?.email}</p>
          <p className="text-xs text-secundario capitalize">{perfil?.perfil}</p>
          <button onClick={sair} className="mt-3 flex items-center gap-2 text-secundario hover:text-vermelho">
            <IconeSair className="size-4" /> Sair
          </button>
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-borda bg-card px-4 py-3 md:hidden">
        <Marca nome={config.app_name} logo={config.logo_url} />
        <button onClick={sair} aria-label="Sair" className="grid size-10 place-items-center text-secundario">
          <IconeSair className="size-5" />
        </button>
      </header>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-borda bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {itens.map(({ para, rotulo, Icone, fim }) => (
          <NavLink
            key={para}
            to={para}
            end={fim}
            className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-semibold ${isActive ? 'text-azul' : 'text-secundario'}`}
          >
            <Icone className="size-5" />
            {rotulo}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Titulo({ children, sub, acoes }: { children: React.ReactNode; sub?: string; acoes?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{children}</h1>
        {sub && <p className="mt-1 text-sm text-secundario">{sub}</p>}
      </div>
      {acoes}
    </div>
  )
}
