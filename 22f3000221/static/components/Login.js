export default {
  template: `
    <div 
      class="d-flex justify-content-center align-items-center"
      style="
        min-height: 100vh;
        background: url('/static/spoto.jpg') center/cover no-repeat;
      "
    >
      <div class="bg-white bg-opacity-75 p-4 rounded shadow" style="width: 90%; max-width: 400px;">
        <h3 class="text-center mb-3">Login</h3>
        <p class="text-danger text-center" v-if="message">{{ message }}</p>

        <form @submit.prevent="loginUser">
          <div class="mb-3">
            <label for="email" class="form-label">Email address</label>
            <input type="email" id="email" v-model="formData.email" class="form-control" placeholder="Enter your email" autocomplete="username" required>
          </div>

          <div class="mb-3">
            <label for="password" class="form-label">Password</label>
            <input type="password" id="password" v-model="formData.password" class="form-control" placeholder="Enter your password" autocomplete="current-password" required>
          </div>

          <div class="d-grid">
            <button type="submit" class="btn btn-primary">Login</button>
          </div>
        </form>
      </div>
    </div>
  `,
  data() {
    return {
      formData: {
        email: "",
        password: ""
      },
      message: ""
    };
  },
  methods: {
    loginUser() {
      fetch('/api/login', {
        method: 'POST',
        headers: {
          "Content-Type": 'application/json'
        },
        body: JSON.stringify(this.formData)
      })
        .then(res => res.json())
        .then(data => {
          if ("auth-token" in data) {
            localStorage.setItem("auth_token", data["auth-token"]);
            localStorage.setItem("id", data.id);
            localStorage.setItem("username", data.username);
            this.$root.$emit('auth-change'); // Add this line
            this.$router.push(data.roles.includes('admin') ? '/admin_dashboard' : '/user_dashboard');
          } else {
            this.message = data.message;
          }
        });
    }
  }
}

