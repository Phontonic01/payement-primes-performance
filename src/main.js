import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

app.mount('#app')

// Charger les agents depuis l'API backend si l'utilisateur est authentifié
import { useAgentsStore } from './stores/agents'
const agentsStore = useAgentsStore()
if (localStorage.getItem('token')) {
  agentsStore.fetchAgents()
}
