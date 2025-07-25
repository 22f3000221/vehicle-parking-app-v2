export default {
  template: `
    <div>
      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
          <a 
            class="nav-link" 
            :class="{active: activeTab==='home'}" 
            href="#" @click.prevent="activeTab='home'">Home</a>
        </li>
        <li class="nav-item">
          <a 
            class="nav-link" 
            :class="{active: activeTab==='vehicles'}" 
            href="#" @click.prevent="activeTab='vehicles'">Vehicles</a>
        </li>
        <li class="nav-item">
          <a 
            class="nav-link" 
            :class="{active: activeTab==='search'}" 
            href="#" @click.prevent="activeTab='search'">Search</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" 
          :class="{active: activeTab==='summary'}" 
          href="#" @click.prevent="activeTab='summary'">Summary</a>
        </li>
      </ul>

      <!-- Dynamically render component based on tab -->
      <component :is="currentTabComponent"></component>
    </div>
  `,
  data() {
    return {
      activeTab: 'home'
    };
  },
  computed: {
    currentTabComponent() {
      // Return the name string that matches a key in the components object
      switch(this.activeTab) {
        case 'home': return 'HomeTab';
        case 'vehicles': return 'VehiclesTab';
        case 'search': return 'SearchTab';
        case 'summary': return 'SummaryTab';
        default: return 'HomeTab';
      }
    }
  },
  components: {
    HomeTab: () => import('./HomeTab.js'),
    VehiclesTab: () => import('./VehiclesTab.js'),
    SearchTab: () => import('./SearchTab.js'),
    SummaryTab: () => import('./SummaryTab.js')
  }
};

