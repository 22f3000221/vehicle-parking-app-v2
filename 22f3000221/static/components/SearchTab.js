export default {
  template: `
    <div>
      <h3>Search Parking Lots</h3>
      <form @submit.prevent="searchLots" class="mb-3 row g-2">
        <div class="col-md-4">
          <input v-model="address" placeholder="Address" class="form-control" />
        </div>
        <div class="col-md-3">
          <input v-model="city" placeholder="City" class="form-control" />
        </div>
        <div class="col-md-3">
          <input v-model="pincode" placeholder="Pincode" class="form-control" />
        </div>
        <div class="col-md-2">
          <button type="submit" class="btn btn-primary w-100">Search</button>
        </div>
      </form>

      <div v-if="lots.length">
        <ul class="list-group">
          <li v-for="lot in lots" :key="lot.lot_id" class="list-group-item">
            <strong>{{ lot.address }}</strong>, {{ lot.city }} - {{ lot.pincode }}
            <br />
            Rate: ₹{{ lot.rate }} per hour
            <br />
            Available Spots: {{ lot.available_spots }}
            <button class="btn btn-sm btn-success mt-2" @click="openBookingModal(lot)">Book Spot</button>
          </li>
        </ul>
      </div>
      <div v-else>
        <p>No parking lots found</p>
      </div>

      <!-- Modal -->
      <div v-if="showModal" class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Book Spot - {{ selectedLot?.address }}</h5>
              <button type="button" class="btn-close" @click="closeModal"></button>
            </div>
            <div class="modal-body">
              <div v-if="noSpots">
                <p class="text-danger">No available spots in this lot.</p>
              </div>
              <div v-else>
                <div class="mb-3">
                  <label class="form-label">Select Vehicle</label>
                  <select v-model="selectedVehicleId" class="form-select">
                    <option v-for="v in vehicles" :value="v.vehicle_id" :key="v.vehicle_id">
                      {{ v.label }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="closeModal">Cancel</button>
              <button class="btn btn-primary" @click="confirmBooking" :disabled="!selectedVehicleId || noSpots">Confirm</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      address: '',
      city: '',
      pincode: '',
      lots: [],
      showModal: false,
      selectedLot: null,
      vehicles: [],
      selectedVehicleId: null,
      selectedSpotId: null,
      noSpots: false
    };
  },
  methods: {
    searchLots() {
      const params = new URLSearchParams();
      if (this.address) params.append('address', this.address);
      if (this.city) params.append('city', this.city);
      if (this.pincode) params.append('pincode', this.pincode);

      fetch(`/api/lots/search?${params.toString()}`, {
        headers: { 'authentication-token': localStorage.getItem('auth_token') }
      })
        .then(res => res.json())
        .then(data => {
          this.lots = Array.isArray(data) ? data : (data.lots || []);
        });
    },
    openBookingModal(lot) {
      this.selectedLot = lot;
      this.selectedVehicleId = null;
      this.selectedSpotId = null;
      this.noSpots = false;

      this.fetchAvailableSpot(lot.lot_id);
      this.fetchVehicles();

      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
    },
    fetchAvailableSpot(lot_id) {
      fetch(`/api/lots/${lot_id}/spots/available`, {
        headers: { 'authentication-token': localStorage.getItem('auth_token') }
      })
        .then(res => res.json())
        .then(data => {
          if (data.spot_id) {
            this.selectedSpotId = data.spot_id;
            this.noSpots = false;
          } else {
            this.noSpots = true;
          }
        });
    },
    fetchVehicles() {
      fetch('/api/vehicles', {
        headers: { 'authentication-token': localStorage.getItem('auth_token') }
      })
        .then(res => res.json())
        .then(data => {
          this.vehicles = Array.isArray(data) ? data : [];
        });
    },
    confirmBooking() {
      fetch('/api/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authentication-token': localStorage.getItem('auth_token')
        },
        body: JSON.stringify({
          lot_id: this.selectedLot.lot_id,
          spot_id: this.selectedSpotId,
          vehicle_id: this.selectedVehicleId
        })
      })
        .then(res => res.json())
        .then(data => {
          alert(data.message);
          this.closeModal();
          this.searchLots();
        });
    }
  }
};
