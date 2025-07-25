export default {
  template: `
    <nav class="navbar navbar-expand-lg navbar-light bg-light border-bottom px-4">
      <div class="container-fluid">
        <router-link class="navbar-brand fw-bold" to="/">Parking App</router-link>

        <div class="d-flex">
          <template v-if="isAuthenticated">
            <span class="align-self-center me-3">Welcome, {{ username }}</span>
            <button class="btn btn-danger" @click="logout">Logout</button>
          </template>
          <template v-else>
            <router-link class="btn btn-primary me-2" to="/login">Login</router-link>
            <router-link class="btn btn-warning" to="/register">Register</router-link>
          </template>
        </div>
      </div>
    </nav>
  `,
  data() {
    return {
      isAuthenticated: false,
      username: ''
    };
  },
  created() {
    this.checkAuth();
    this.$root.$on('auth-change', () => {
      this.checkAuth();
    });
  },
  methods: {
    checkAuth() {
      const token = localStorage.getItem('auth_token');
      this.isAuthenticated = !!token;
      this.username = localStorage.getItem('username') || '';
    },
    logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('id');
      localStorage.removeItem('username');
      this.isAuthenticated = false;
      this.username = '';
      this.$root.$emit('auth-change'); // Notify other components
      this.$router.push('/login');
    }
  },
  beforeDestroy() {
    this.$root.$off('auth-change');
  }
}
