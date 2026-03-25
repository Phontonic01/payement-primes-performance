import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'

import { piniaPersistPlugin } from './plugins/piniaPersist'

const pinia = createPinia()
pinia.use(piniaPersistPlugin)
const app = createApp(App)

app.use(pinia)
app.use(router)

app.mount('#app')

// Charger les agents de démonstration si le store est vide (après restauration localStorage)
import { useAgentsStore } from './stores/agents'
const agentsStore = useAgentsStore()
agentsStore.seedIfEmpty()

// Mount Agentation (React component) in a separate container
if (import.meta.env.DEV) {
  import('react').then(React => {
    import('react-dom/client').then(ReactDOM => {
      import('agentation').then(({ Agentation }) => {
        const container = document.createElement('div')
        container.id = 'agentation-root'
        document.body.appendChild(container)
        const root = ReactDOM.createRoot(container)
        root.render(React.createElement(Agentation, { endpoint: 'http://localhost:4747' }))
      })
    })
  })
}
