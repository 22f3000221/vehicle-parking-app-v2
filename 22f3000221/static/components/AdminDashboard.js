export default {
  template: `
    <div>
      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
          <a class="nav-link" :class="{active: activeTab==='performance'}" href="#" @click.prevent="activeTab='performance'">Performance</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" :class="{active: activeTab==='users'}" href="#" @click.prevent="activeTab='users'">Users</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" :class="{active: activeTab==='lots'}" href="#" @click.prevent="activeTab='lots'">Lots</a>
        </li>
      </ul>
      <component :is="currentTabComponent"></component>
    </div>
  `,
  data() {
    return {
      activeTab: 'performance'
    };
  },
  computed: {
    currentTabComponent() {
      switch (this.activeTab) {
        case 'performance': return 'AdminPerformanceTab';
        case 'users': return 'AdminUsersTab';
        case 'lots': return 'AdminLotsTab';
        default: return 'AdminPerformanceTab';
      }
    }
  },
  components: {
    AdminPerformanceTab: () => import('./AdminPerformance.js'),
    AdminUsersTab: () => import('./AdminUsers.js'),
    AdminLotsTab: () => import('./AdminLots.js'),
    AdminLotsDetails: () => import('./AdminLotsDetails.js')
  }
};
