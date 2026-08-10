import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import HomeView from './views/HomeView.vue'
import DirectoryView from './views/DirectoryView.vue'
import DetailView from './views/DetailView.vue'
import AuthView from './views/AuthView.vue'
import SubmitView from './views/SubmitView.vue'
import AccountView from './views/AccountView.vue'
import AdminView from './views/AdminView.vue'
import ExportView from './views/ExportView.vue'
import './styles.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/repeaters', component: DirectoryView },
    { path: '/repeaters/:id', component: DetailView },
    { path: '/auth', component: AuthView },
    { path: '/submit', component: SubmitView },
    { path: '/account', component: AccountView },
    { path: '/admin', component: AdminView },
    { path: '/exports', component: ExportView },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

createApp(App).use(router).mount('#app')
