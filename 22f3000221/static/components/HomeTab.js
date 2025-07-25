export default {
  template: `
    <div>

      <!-- User Info -->
      <div class="card mb-4">
        <div class="card-header bg-light">
          <strong>Download Data</strong>
        </div>
        <div class="card-body">
          
          <!-- Export Button -->
          <button class="btn btn-primary mt-3" @click="exportCSV" :disabled="exportLoading">
            <span v-if="exportLoading">
              <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              Exporting...
            </span>
            <span v-else>
              <i class="bi bi-download"></i> Export Booking History (CSV)
            </span>
          </button>
          
          <!-- Export Status Alert -->
          <div v-if="exportStatus" class="alert mt-3" :class="exportStatusClass">
            {{ exportStatusMessage }}
            <a v-if="exportDownloadUrl" :href="exportDownloadUrl" class="alert-link">Download now</a>
          </div>
        </div>
      </div>

      <!-- Active Bookings -->
      <h3>Active Bookings</h3>
      <div v-if="activeBookings.length">
        <ul class="list-group mb-3">
          <li v-for="booking in activeBookings" :key="booking.id" class="list-group-item d-flex justify-content-between align-items-center">
            Spot {{ booking.spot }} @ {{ booking.lot }} 
            <button class="btn btn-sm btn-danger" @click="prepareRelease(booking)">Release</button>
          </li>
        </ul>
      </div>
      <div v-else>
        <p>No active bookings</p>
      </div>

      <!-- Past Bookings -->
      <h3>Past Bookings</h3>
      <div v-if="sortedPastBookings.length">
        <table class="table table-bordered table-striped">
          <thead class="table-light">
            <tr>
              <th>Spot Number</th>
              <th>Lot Id</th>
              <th>Vehicle Label</th>
              <th>Vehicle Registration</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Rate Charged</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="booking in sortedPastBookings" :key="booking.id">
              <td>{{ booking.spot }}</td>
              <td>{{ booking.lot }}</td>
              <td>{{ booking.vehicle_label || 'N/A' }}</td>
              <td>{{ booking.vehicle_registration || 'N/A' }}</td>
              <td>{{ booking.start_time }}</td>
              <td>{{ booking.end_time }}</td>
              <td>₹{{ booking.rate || 100 }}</td>
              <td>₹{{ booking.amount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else>
        <p>No past bookings</p>
      </div>

      <!-- Release Confirmation Modal -->
      <div class="modal fade" id="releaseModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Confirm Release</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" v-if="selectedBooking">
              <p><strong>Spot:</strong> {{ selectedBooking.spot }}</p>
              <p><strong>Lot:</strong> {{ selectedBooking.lot }}</p>
              <p><strong>Entry Time:</strong> {{ selectedBooking.start_time }}</p>
              <p><strong>Exit Time:</strong> {{ currentTime }}</p>
              <p><strong>Amount:</strong> ₹100</p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button class="btn btn-primary" @click="confirmRelease">Pay & Release</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  data() {
    return {
      user: {},
      authToken: localStorage.getItem('auth_token'),
      bookings: [],
      selectedBooking: null,
      exportLoading: false,
      exportStatus: null, // 'success', 'error', or null
      exportStatusMessage: '',
      exportDownloadUrl: null,
      exportCheckInterval: null
    };
  },
  computed: {
    currentTime() {
      return new Date().toISOString().slice(0, 19).replace('T', ' ');
    },
    activeBookings() {
      return this.bookings.filter(b => b.status === 'active');
    },
    pastBookings() {
      return this.bookings.filter(b => b.status === 'completed');
    },
    sortedPastBookings() {
      return this.pastBookings.slice().sort((a, b) => new Date(b.end_time) - new Date(a.end_time));
    },
    exportStatusClass() {
      return {
        'alert-success': this.exportStatus === 'success',
        'alert-danger': this.exportStatus === 'error',
        'alert-info': this.exportStatus === 'processing'
      };
    }
  },
  methods: {
    fetchUser() {
      fetch('/api/home', {
        headers: {
          'authentication-token': this.authToken
        }
      })
      .then(res => res.json())
      .then(data => {
        this.user = data;
      });
    },
    fetchBookings() {
      fetch('/api/get', {
        headers: {
          'authentication-token': this.authToken
        }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          this.bookings = data;
        }
      });
    },
    prepareRelease(booking) {
      this.selectedBooking = booking;
      const modal = new bootstrap.Modal(document.getElementById('releaseModal'));
      modal.show();
    },
    confirmRelease() {
      if (!this.selectedBooking) return;

      const booking = this.selectedBooking;

      fetch(`/api/update/${booking.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'authentication-token': this.authToken
        },
        body: JSON.stringify({
          vehicle_id: booking.vehicle_id,
          lot_id: booking.lot_id,
          spot_id: booking.spot
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.message.includes('updated')) {
          const modal = bootstrap.Modal.getInstance(document.getElementById('releaseModal'));
          modal.hide();
          this.fetchBookings();
        } else {
          alert(data.message || "Failed to release spot.");
        }
      })
      .catch(err => {
        console.error(err);
        alert("An error occurred while releasing the spot.");
      });
    },
    exportCSV() {
      this.exportLoading = true;
      this.exportStatus = 'processing';
      this.exportStatusMessage = 'Preparing your export...';
      this.exportDownloadUrl = null;

      fetch('/api/user/trigger_export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authentication-token': this.authToken
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.task_id) {
          this.exportStatusMessage = 'Export is being prepared. We will notify you when ready.';
          this.checkExportStatus(data.task_id);
        } else {
          throw new Error('Failed to start export');
        }
      })
      .catch(err => {
        console.error(err);
        this.exportLoading = false;
        this.exportStatus = 'error';
        this.exportStatusMessage = 'Failed to start export. Please try again. 1';
      });
    },
    checkExportStatus(taskId) {
      // Clear any existing interval
      if (this.exportCheckInterval) {
        clearInterval(this.exportCheckInterval);
      }

      // Set up new interval to check status
      this.exportCheckInterval = setInterval(() => {
        fetch(`/api/user/export_status/${taskId}`, {
          headers: {
            'authentication-token': this.authToken
          }
        })
        .then(res => res.json())
        .then(data => {
          console.log("Export status response:", data);

          if (data.status === 'SUCCESS') {
            clearInterval(this.exportCheckInterval);
            this.exportLoading = false;
            this.exportStatus = 'success';
            this.exportStatusMessage = 'Your export is ready!';
            this.exportDownloadUrl = `/api/user/download_export/${data.result}`;

            fetch(this.exportDownloadUrl, {
              headers: {
                'authentication-token': this.authToken
              },
              credentials: 'same-origin'
            })
            .then(response => {
              if (!response.ok) throw new Error("Download failed");
              return response.blob();
            })
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = data.result; // or use data.result
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            })
            .catch(err => {
              console.error("Download failed:", err);
              this.exportStatus = 'error';
              this.exportStatusMessage = 'Failed to download file.';
            });

          } else if (data.status === 'FAILURE') {
            clearInterval(this.exportCheckInterval);
            this.exportLoading = false;
            this.exportStatus = 'error';
            this.exportStatusMessage = 'Export failed. Please try again.';
          }
          // For PENDING and other states: continue polling
        })
        .catch(err => {
          console.error(err);
          clearInterval(this.exportCheckInterval);
          this.exportLoading = false;
          this.exportStatus = 'error';
          this.exportStatusMessage = 'Error checking export status.';
        });
      }, 2000);
    }
  },
  mounted() {
    this.fetchUser();
    this.fetchBookings();
  },
  beforeUnmount() {
    // Clean up interval when component is destroyed
    if (this.exportCheckInterval) {
      clearInterval(this.exportCheckInterval);
    }
  }
};