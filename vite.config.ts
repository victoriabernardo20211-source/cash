import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Em dev, atende POST /api com o mesmo código da função da Vercel. */
function apiLocal(): Plugin {
  return {
    name: 'api-local',
    configureServer(server) {
      Object.assign(process.env, loadEnv('development', process.cwd(), ''))
      server.middlewares.use('/api', async (req, res) => {
        const { tratar } = await server.ssrLoadModule('/server/http.ts')
        await tratar(req, res)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiLocal()],
})
