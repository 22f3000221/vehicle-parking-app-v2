export default {
  template: `
    <div>
      <h4>Search Lots</h4>
      <div class="row mb-3">
        <div class="col">
          <input v-model="searchFields.address" class="form-control" placeholder="Address" @input="searchLots" />
        </div>
        <div class="col">
          <input v-model="searchFields.city" class="form-control" placeholder="City" @input="searchLots" />
        </div>
        <div class="col">
          <input v-model="searchFields.pincode" class="form-control" placeholder="Pincode" @input="searchLots" />
        </div>
      </div>

      <ul class="list-group">
        <li class="list-group-item" 
            v-for="lot in lots" 
            :key="lot.lot_id" 
            @click="selectLot(lot.lot_id)"
            style="cursor: pointer;">
          {{ lot.address }} — {{ lot.city }} — ₹{{ lot.rate }}
        </li>
      </ul>

      <h5 class="mt-4">Create New Lot</h5>
      <input v-model="newLot.address" placeholder="Address" class="form-control mb-2" />
      <input v-model="newLot.city" placeholder="City" class="form-control mb-2" />
      <input v-model="newLot.pincode" placeholder="Pincode" class="form-control mb-2" />
      <input v-model.number="newLot.rate" placeholder="Rate" class="form-control mb-2" />
      <input v-model.number="newLot.spot_count" placeholder="Lot Capacity" class="form-control mb-2" />
      <button class="btn btn-success" @click="createLot">Create</button>

      <!-- Lot Detail Modal -->
      <div class="modal fade" id="lotDetailModal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content" v-if="selectedLotDetails">
            <div class="modal-header">
              <h5 class="modal-title">Lot Details - ID {{ selectedLotDetails.lot_id }}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p><strong>Address:</strong> {{ selectedLotDetails.address }}</p>
              <p><strong>City:</strong> {{ selectedLotDetails.city }}</p>
              <p><strong>Pincode:</strong> {{ selectedLotDetails.pincode }}</p>
              <p><strong>Rate:</strong> ₹{{ selectedLotDetails.rate }}</p>
              <p><strong>Status:</strong> {{ selectedLotDetails.active ? 'Active' : 'Inactive' }}</p>

              <button class="btn btn-warning me-2" @click="toggleLotActive">
                {{ selectedLotDetails.active ? 'Deactivate' : 'Activate' }}
              </button>

              <button class="btn btn-danger" 
                      @click="deleteLot" 
                      :disabled="!canDeleteLot">
                Delete Lot
              </button>

              <h6 class="mt-4">Metrics:</h6>
              <ul>
                <li>Total Spots: {{ selectedLotDetails.metrics.total_spots }}</li>
                <li>Occupied Spots: {{ selectedLotDetails.metrics.occupied_spots }}</li>
                <li>Released Spots: {{ selectedLotDetails.metrics.released_spots }}</li>
                <li>Active Transactions: {{ selectedLotDetails.metrics.active_transactions }}</li>
              </ul>

              <h6 class="mt-3">Spots:</h6>
              <ul>
                <li v-for="spot in selectedLotDetails.spots" :key="spot.spot_id">
                  Spot {{ spot.spot_id }} — <strong>{{ spot.status }}</strong>
                  <span v-if="spot.user"> — {{ spot.user }} ({{ spot.vehicle_registration }})</span>
                  <button class="btn btn-sm btn-outline-primary ms-2" @click="toggleSpotStatus(spot.spot_id)">Toggle</button>
                </li>
              </ul>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      searchFields: {
        address: '',
        city: '',
        pincode: ''
      },
      lots: [],
      newLot: {
        address: '',
        city: '',
        pincode: '',
        rate: '',
        spot_count: ''
      },
      selectedLotDetails: null,
      authToken: localStorage.getItem('auth_token')
    };
  },
  computed: {
    canDeleteLot() {
      if (!this.selectedLotDetails) return false;
      return this.selectedLotDetails.spots.every(s => s.status === 'released');
    }
  },
  methods: {
    searchLots() {
      const { address, city, pincode } = this.searchFields;
      const query = new URLSearchParams({ address, city, pincode }).toString();

      fetch(`/api/admin/lots/search?${query}`, {
        headers: { 'authentication-token': this.authToken }
      })
      .then(res => res.json())
      .then(data => {
        this.lots = data;
      });
    },
    createLot() {
      fetch('/api/admin/lots/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authentication-token': this.authToken
        },
        body: JSON.stringify(this.newLot)
      })
      .then(res => res.json())
      .then(() => {
        alert('Lot created');
        this.searchLots();
      });
    },
    selectLot(lotId) {
      fetch(`/api/admin/lots/${lotId}/details`, {
        headers: { 'authentication-token': this.authToken }
      })
      .then(res => res.json())
      .then(data => {
        this.selectedLotDetails = data;
        const modal = new bootstrap.Modal(document.getElementById('lotDetailModal'));
        modal.show();
      });
    },
    toggleLotActive() {
      fetch(`/api/admin/lots/${this.selectedLotDetails.lot_id}/toggle_active`, {
        method: 'PUT',
        headers: { 'authentication-token': this.authToken }
      })
      .then(res => res.json())
      .then(data => {
        this.selectedLotDetails.active = data.active;
        alert(`Lot is now ${data.active ? 'Active' : 'Inactive'}`);
      });
    },
    deleteLot() {
      if (!confirm('Are you sure you want to delete this lot?')) return;

      fetch(`/api/admin/lots/${this.selectedLotDetails.lot_id}`, {
        method: 'DELETE',
        headers: { 'authentication-token': this.authToken }
      })
      .then(res => res.json())
      .then(() => {
        alert('Lot deleted');
        const modal = bootstrap.Modal.getInstance(document.getElementById('lotDetailModal'));
        modal.hide();
        this.searchLots();
      });
    },
    toggleSpotStatus(spotId) {
      fetch(`/api/admin/spots/${spotId}/toggle_status`, {
        method: 'PUT',
        headers: { 'authentication-token': this.authToken }
      })
      .then(res => res.json())
      .then(data => {
        const spot = this.selectedLotDetails.spots.find(s => s.spot_id === spotId);
        if (spot) spot.status = data.status;
      });
    }
  },
  mounted() {
    this.searchLots();
  }
};

