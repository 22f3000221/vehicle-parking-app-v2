export default {
  template: `
    <div>
      <h3>User Summary</h3>

      <div class="mb-4">
        <h5>Stats</h5>
        <ul>
          <li><strong>Total Bookings:</strong> {{ summary.total_bookings }}</li>
          <li><strong>Active Bookings:</strong> {{ summary.active_bookings }}</li>
          <li><strong>Total Amount Spent:</strong> ₹{{ summary.total_amount }}</li>
          <li><strong>Average Amount per Booking:</strong> ₹{{ summary.average_amount.toFixed(2) }}</li>
          <li><strong>Total Time Spent:</strong> {{ summary.total_time_hours.toFixed(2) }} hours</li>
          <li><strong>Average Time per Booking:</strong> {{ summary.average_time_hours.toFixed(2) }} hours</li>
        </ul>
      </div>

      <div class="mb-5">
        <h5>Top 5 Most Used Vehicles</h5>
        <canvas id="topVehiclesChart" height="150"></canvas>
      </div>

      <div class="mb-5">
        <h5>Top 5 Vehicles by Amount Spent</h5>
        <canvas id="topSpendingChart" height="150"></canvas>
      </div>
    </div>
  `,
  data() {
    return {
      summary: {
        total_bookings: 0,
        active_bookings: 0,
        total_amount: 0,
        average_amount: 0,
        total_time_hours: 0,
        average_time_hours: 0,
        top_used_vehicles: [],
        top_spending_vehicles: [],
        weekly_bookings: {}
      }
    };
  },
  methods: {
    renderCharts() {
      const { weekly_bookings, top_used_vehicles, top_spending_vehicles } = this.summary;

      // Top Used Vehicles
      const usedLabels = top_used_vehicles.map(v => v[0]);
      const usedCounts = top_used_vehicles.map(v => v[1].count);

      new Chart(document.getElementById('topVehiclesChart'), {
        type: 'bar',
        data: {
          labels: usedLabels,
          datasets: [{
            label: 'Usage Count',
            backgroundColor: '#66BB6A',
            data: usedCounts
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } }
        }
      });

      const spendLabels = top_spending_vehicles.map(v => v[0]);
      const spendAmounts = top_spending_vehicles.map(v => v[1].amount.toFixed(2));

      new Chart(document.getElementById('topSpendingChart'), {
        type: 'bar',
        data: {
          labels: spendLabels,
          datasets: [{
            label: 'Amount Spent (₹)',
            backgroundColor: '#FFA726',
            data: spendAmounts
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } }
        }
      });
    }
  },
  mounted() {
    fetch('/api/user/summary', {
      headers: {
        'authentication-token': localStorage.getItem('auth_token')
      }
    })
    .then(res => res.json())
    .then(data => {
      this.summary = data;
      this.$nextTick(this.renderCharts);
    });
  }
};