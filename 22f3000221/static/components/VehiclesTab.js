export default {
  template: `
    <div>
      <h3>Your Vehicles</h3>

      <ul class="list-group mb-3">
        <li v-for="vehicle in vehicles" :key="vehicle.vehicle_id" class="list-group-item d-flex justify-content-between align-items-center">
          {{ vehicle.label}}: {{ vehicle.registration_no }}
          <button class="btn btn-sm btn-danger" @click="removeVehicle(vehicle.vehicle_id)">Remove</button>
        </li>
      </ul>

      <form @submit.prevent="addVehicle" class="d-flex gap-2">
        <input 
          v-model="newRegNo" 
          placeholder="Registration No (AB12AB1212)" 
          class="form-control" 
          required 
          @input="formatRegNo"
        />
        <input v-model="label" placeholder="Vehicle Name/Label" class="form-control" required />
        <button type="submit" class="btn btn-success">Add Vehicle</button>
      </form>
      <div v-if="regNoError" class="alert alert-danger mt-2">{{ regNoError }}</div>
    </div>
  `,
  data() {
    return {
      vehicles: [],
      newRegNo: '',
      label: '',
      regNoError: ''
    };
  },
  methods: {
    formatRegNo() {
      this.newRegNo = this.newRegNo.toUpperCase().replace(/\s/g, '');
      this.validateRegNo();
    },
    validateRegNo() {
      const regEx = /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/;
      
      if (!this.newRegNo) {
        this.regNoError = '';
      } else if (!regEx.test(this.newRegNo)) {
        this.regNoError = 'Please use format: AB12AB1212 (2 letters, 2 numbers, 2 letters, 4 numbers)';
      } else {
        this.regNoError = '';
      }
      
      return !this.regNoError;
    },
    fetchVehicles() {
      fetch('/api/vehicles', {
        headers: { 'authentication-token': localStorage.getItem('auth_token') }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) this.vehicles = data;
      });
    },
    addVehicle() {
      console.log('Add vehicle clicked');
      
      if (!this.validateRegNo()) {
        console.log('Validation failed', this.regNoError); 
        return;
      }
      
      if (!this.label) {
        this.regNoError = 'Vehicle name/label is required';
        console.log('Label missing'); 
        return;
      }
      
      console.log('Making API call with:', { 
        registration_no: this.newRegNo,
        label: this.label
      });

      fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authentication-token': localStorage.getItem('auth_token')
        },
        body: JSON.stringify({ 
          registration_no: this.newRegNo, 
          label: this.label 
        })
      })
      .then(res => {
        console.log('Response status:', res.status); 
        if (!res.ok) {
          return res.json().then(err => { 
            console.log('API error:', err); 
            throw err; 
          });
        }
        return res.json();
      })
      .then(data => {
        console.log('Success:', data); 
        this.newRegNo = '';
        this.label = '';
        this.regNoError = '';
        this.fetchVehicles();
      })
      .catch(error => {
        console.log('Fetch error:', error); 
        this.regNoError = error.message || 'Failed to add vehicle';
      });
    },
    removeVehicle(vehicleId) {
      fetch(`/api/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: { 'authentication-token': localStorage.getItem('auth_token') }
      })
      .then(res => res.json())
      .then(data => {
        if (data.message === 'Vehicle removed') {
          this.fetchVehicles();
        } else {
          alert('Failed to remove vehicle');
        }
      });
    }
  },
  mounted() {
    this.fetchVehicles();
  }
};