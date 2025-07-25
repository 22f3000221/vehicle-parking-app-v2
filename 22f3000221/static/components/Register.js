export default {
  template: `
    <div 
      class="d-flex justify-content-center align-items-center"
      style="
        min-height: 100vh;
        background: url('/static/spoto.jpg') center/cover no-repeat;
      "
    >
      <div class="bg-white bg-opacity-75 p-4 rounded shadow" style="width: 90%; max-width: 450px;">
        <h3 class="text-center mb-3">Register</h3>

        <form @submit.prevent="addUser">
          <div class="mb-3">
            <label for="first_name" class="form-label">First Name</label>
            <input type="text" id="first_name" v-model="formData.first_name" class="form-control" placeholder="Enter your first name" required>
          </div>

          <div class="mb-3">
            <label for="last_name" class="form-label">Last Name</label>
            <input type="text" id="last_name" v-model="formData.last_name" class="form-control" placeholder="Enter your last name" required>
          </div>

          <div class="mb-3">
            <label for="username" class="form-label">Username</label>
            <input type="text" id="username" v-model="formData.username" class="form-control" placeholder="Choose a username" required>
          </div>

          <div class="mb-3">
            <label for="email" class="form-label">Email</label>
            <input type="email" id="email" v-model="formData.email" class="form-control" placeholder="Enter your email" required>
          </div>

          <div class="mb-3">
            <label for="password" class="form-label">Password</label>
            <input type="password" id="password" v-model="formData.password" class="form-control" placeholder="Create a password" required>
          </div>

          <div class="mb-4">
            <label for="license" class="form-label">License Number</label>
            <input type="text" id="license" v-model="formData.license" class="form-control" placeholder="Enter your license number" required>
          </div>

          <div class="d-grid">
            <button type="submit" class="btn btn-success">Register</button>
          </div>
        </form>
      </div>
    </div>
  `,
  data() {
    return {
      formData: {
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        password: "",
        license: ""
      }
    };
  },
  methods: {
    addUser() {
      fetch('/api/register', {
        method: 'POST',
        headers: {
          "Content-Type": 'application/json'
        },
        body: JSON.stringify(this.formData)
      })
        .then(res => res.json())
        .then(data => {
          console.log(data);
          this.$router.push('/login');
        });
    }
  }
}
