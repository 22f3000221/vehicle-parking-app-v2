export default {
  template: `
    <div>
      <h4>Search Users</h4>

      <div class="row mb-3">
        <div class="col-md-3">
          <input v-model="filters.id" type="number" placeholder="User ID" class="form-control" @input="searchUsers" />
        </div>
        <div class="col-md-3">
          <input v-model="filters.username" placeholder="Username" class="form-control" @input="searchUsers" />
        </div>
        <div class="col-md-3">
          <input v-model="filters.email" placeholder="Email" class="form-control" @input="searchUsers" />
        </div>
        <div class="col-md-3">
          <input v-model="filters.vehicle_registration" placeholder="Vehicle Registration" class="form-control" @input="searchUsers" />
        </div>
      </div>

      <ul class="list-group">
        <li class="list-group-item" v-for="user in results" :key="user.id" @click="selectUser(user)">
          {{ user.username }} - {{ user.email }}
        </li>
      </ul>

      <div v-if="selectedUser" class="mt-4">
        <h5>User Info</h5>
        <p><strong>Name:</strong> {{ selectedUser.first_name }} {{ selectedUser.last_name }}</p>
        <p><strong>Email:</strong> {{ selectedUser.email }}</p>
        <p><strong>Username:</strong> {{ selectedUser.username }}</p>
        <p><strong>Status:</strong> {{ selectedUser.active ? 'Active' : 'Deactivated' }}</p>

        <h6>Vehicles</h6>
        <ul>
          <li v-for="v in selectedUser.vehicles" :key="v.vehicle_id">
            {{ v.label }} — {{ v.registration_no }}
          </li>
        </ul>

        <button class="btn" :class="selectedUser.active ? 'btn-danger' : 'btn-success'" @click="toggleUserStatus">{{ selectedUser.active ? 'Deactivate' : 'Activate' }}</button>
      </div>
    </div>
  `,
  data() {
    return {
      filters: {
        id: '',
        username: '',
        email: '',
        vehicle_registration: ''
      },
      results: [],
      selectedUser: null,
      authToken: localStorage.getItem('auth_token')
    };
  },
  methods: {
    buildQueryString() {
      const params = new URLSearchParams();
      for (const key in this.filters) {
        if (this.filters[key]) {
          params.append(key, this.filters[key]);
        }
      }
      return params.toString();
    },
    searchUsers() {
      const queryString = this.buildQueryString();

      if (!queryString) {
        fetch('/api/admin/users', {
          headers: { 'authentication-token': this.authToken }
        })
          .then(res => res.json())
          .then(data => {
            this.results = data;
          });
        return;
      }

      fetch(`/api/admin/users?${queryString}`, {
        headers: { 'authentication-token': this.authToken }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          this.results = data;
        } else {
          // single user returned
          this.results = [data];
        }
      });
    },
    selectUser(user) {
      this.selectedUser = user;
    },
    toggleUserStatus() {
      const newStatus = !this.selectedUser.active;
      fetch(`/api/admin/users/${this.selectedUser.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'authentication-token': this.authToken
        },
        body: JSON.stringify({ active: newStatus })
      })
      .then(res => res.json())
      .then(() => {
        this.selectedUser.active = newStatus;
        alert(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
      });
    }
  }
};

