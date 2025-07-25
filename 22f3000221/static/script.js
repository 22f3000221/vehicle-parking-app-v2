import Home from './components/Home.js'
import Login from './components/Login.js'
import Register from './components/Register.js'
import Navbar from './components/Navbar.js'
import Footer from './components/Footer.js'
import Dashboard from './components/UserDashboard.js'
import AdminDashboard from './components/AdminDashboard.js'

const routes = [
    {path: '/', component: Home},
    {path: '/login', component: Login},
    {path: '/register', component: Register},
    {path: '/user_dashboard', component: Dashboard},
    {path: '/admin_dashboard', component: AdminDashboard}
]

const router = new VueRouter({
    routes // routes:routes
})

// navigation guard to protect routes
router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('auth_token');
  const publicPages = ['/login', '/register', '/'];
  const authRequired = !publicPages.includes(to.path);
  
  if (authRequired && !isAuthenticated) {
    return next('/login');
  }
  
  next();
});

const app = new Vue({
    el: "#app",
    router,
    template: `
    <div class="d-flex flex-column min-vh-100">
        <nav-bar></nav-bar>
            <div class="main-content">
                <router-view></router-view>
            </div>
        <foot class="mt-auto"></foot>
    </div>
    `,
    components:{
        "nav-bar": Navbar,
        "foot": Footer
    }
})
