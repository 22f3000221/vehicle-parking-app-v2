export default {
  template: `
    <div>
      <h3>Platform Performance Metrics</h3>
      <canvas id="weeklyBookingsChart" class="my-4"></canvas>
      <canvas id="topVehiclesChart" class="my-4"></canvas>
      <canvas id="topSpendersChart" class="my-4"></canvas>
      <canvas id="topLotsChart" class="my-4"></canvas>
    </div>
  `,
  data() {
    return {
      authToken: localStorage.getItem('auth_token')
    };
  },
  mounted() {
    fetch('/api/admin/performance', {
      headers: { 'authentication-token': this.authToken }
    })
    .then(res => res.json())
    .then(data => {
      // Format chart data appropriately
      this.renderChart('weeklyBookingsChart', 'Weekly Bookings (Last 4 Weeks)', data.weekly_bookings_last_4_weeks, ['Week -3', 'Week -2', 'Week -1', 'This Week']);
      this.renderChart('topVehiclesChart', 'Top Vehicles by Usage', data.top_vehicles_by_usage.map(v => v.count), data.top_vehicles_by_usage.map(v => 'Vehicle #' + v.vehicle_id));
      this.renderChart('topSpendersChart', 'Top Spending Vehicles', data.top_vehicles_by_spending.map(v => v.amount), data.top_vehicles_by_spending.map(v => 'Vehicle #' + v.vehicle_id));
      this.renderChart('topLotsChart', 'Top Performing Lots', data.top_performing_lots.map(l => l.total_revenue), data.top_performing_lots.map(l => 'Lot #' + l.lot_id));
    });
  },
  methods: {
    renderChart(canvasId, title, dataValues, labels) {
      const ctx = document.getElementById(canvasId).getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: title,
            data: dataValues,
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: title
            },
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
  }
};
