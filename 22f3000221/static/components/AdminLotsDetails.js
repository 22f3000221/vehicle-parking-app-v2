export default {
  props: ['lotId'],
  template: `
    <div v-if="lot">
      <h4>Lot Details</h4>
      <p><strong>Address:</strong> {{ lot.address }}</p>
      <p><strong>City:</strong> {{ lot.city }}</p>
      <p><strong>Pincode:</strong> {{ lot.pincode }}</p>
      <p><strong>Rate:</strong> ₹{{ lot.rate }}</p>

      <h5 class="mt-3">Spots</h5>
      <ul class="list-group">
        <li class="list-group-item" v-for="spot in lot.spots" :key="spot.spot_id">
          Spot #{{ spot.spot_id }} - {{ spot.status }}
          <div v-if="spot.user">
            <small>User: {{ spot.user }} | Vehicle: {{ spot.vehicle_registration }}</small><br/>
            <small>Start: {{ spot.start_time }}</small>
          </div>
        </li>
      </ul>

      <h6 class="mt-3">Metrics</h6>
      <ul>
        <li>Total Spots: {{ lot.metrics.total_spots }}</li>
        <li>Occupied: {{ lot.metrics.occupied_spots }}</li>
        <li>Released: {{ lot.metrics.released_spots }}</li>
        <li>Active Txns: {{ lot.metrics.active_transactions }}</li>
      </ul>
    </div>
  `,
  data() {
    return {
      lot: null,
      authToken: localStorage.getItem('auth_token')
    };
  },
  mounted() {
    fetch(`/api/admin/lots/${this.lotId}/details`, {
      headers: {
        'authentication-token': this.authToken
      }
    })
      .then(res => res.json())
      .then(data => {
        this.lot = data;
      });
  }
};
