/**
 * InfraQuip Core Application Logic
 * Implements: Single Page Routing, Marketplace Filtering, Seller Listing,
 * Client Portal Dashboards, Automated Transaction Workflow Tracker, and RAG Chatbot.
 */

// Global App State
const state = {
  activeTab: 'home',
  listings: [
    {
      id: 'eq-1',
      title: 'Caterpillar 320 Hydraulic Excavator',
      category: 'Excavators',
      price: 8200000,
      rentalRate: 28000,
      type: 'both',
      year: 2021,
      hours: 1850,
      location: 'Mumbai, MH',
      condition: 'Excellent',
      inspectorGrade: 'A+',
      seller: 'Mahindra Heavy Machinery',
      img: 'apex_excavator.jpg',
      featured: true,
      specs: {
        'Operating Weight': '49,600 lbs',
        'Net Power': '172 hp',
        'Max Dig Depth': '22 ft',
        'Bucket Capacity': '1.19 yd³'
      }
    },
    {
      id: 'eq-2',
      title: 'Liebherr LTM 1050 Mobile Crane',
      category: 'Cranes',
      price: 24500000,
      rentalRate: 85000,
      type: 'rent',
      year: 2019,
      hours: 4200,
      location: 'Delhi NCR',
      condition: 'Good',
      inspectorGrade: 'A',
      seller: 'Reliance Infra Logistics',
      img: 'liebherr_crane.jpg',
      featured: true,
      specs: {
        'Max Lift Capacity': '110,230 lbs',
        'Max Boom Length': '125 ft',
        'Engine Power': '367 hp',
        'Axles': '3'
      }
    },
    {
      id: 'eq-3',
      title: 'JCB 3CX Backhoe Loader',
      category: 'Loaders',
      price: 3600000,
      rentalRate: 12000,
      type: 'sale',
      year: 2020,
      hours: 1200,
      location: 'Bengaluru, KA',
      condition: 'Excellent',
      inspectorGrade: 'A+',
      seller: 'Deccan Fleet Rentals',
      img: 'jcb_backhoe.jpg',
      featured: false,
      specs: {
        'Operating Weight': '17,800 lbs',
        'Net Power': '109 hp',
        'Loader Bucket Capacity': '1.3 yd³',
        'Max Dig Depth': '14.5 ft'
      }
    },
    {
      id: 'eq-4',
      title: 'Komatsu D65PX Crawler Bulldozer',
      category: 'Bulldozers',
      price: 11500000,
      rentalRate: 38000,
      type: 'both',
      year: 2018,
      hours: 3600,
      location: 'Chennai, TN',
      condition: 'Good',
      inspectorGrade: 'B+',
      seller: 'L&T Asset Solutions',
      img: 'komatsu_bulldozer.jpg',
      featured: false,
      specs: {
        'Operating Weight': '48,600 lbs',
        'Engine Power': '217 hp',
        'Blade Capacity': '7.34 yd³',
        'Track Width': '36 in'
      }
    },
    {
      id: 'eq-5',
      title: 'Tata Hitachi EX200 Hydraulic Excavator',
      category: 'Excavators',
      price: 5800000,
      rentalRate: 20000,
      type: 'both',
      year: 2022,
      hours: 650,
      location: 'Hyderabad, TS',
      condition: 'Excellent',
      inspectorGrade: 'A+',
      seller: 'Godrej Infra Group',
      img: 'deere_excavator.jpg',
      featured: true,
      specs: {
        'Operating Weight': '44,200 lbs',
        'Net Power': '148 hp',
        'Max Dig Depth': '20.1 ft',
        'Tail Swing': 'Standard'
      }
    },
    {
      id: 'eq-6',
      title: 'Bobcat T76 Compact Track Loader',
      category: 'Loaders',
      price: 2800000,
      rentalRate: 9500,
      type: 'both',
      year: 2022,
      hours: 450,
      location: 'Pune, MH',
      condition: 'Excellent',
      inspectorGrade: 'A',
      seller: 'Tata Motors Fleet Solutions',
      img: 'bobcat_loader.jpg',
      featured: false,
      specs: {
        'Operating Capacity': '2,900 lbs',
        'Engine Power': '74 hp',
        'Operating Weight': '10,250 lbs',
        'Lift Path': 'Vertical'
      }
    }
  ],
  activeContract: null,
  currentWorkflowStep: 0,
  searchQuery: '',
  filters: {
    category: '',
    type: '',
    condition: '',
    minPrice: 0,
    maxPrice: 30000000
  },
  charts: {},
  // Mock RAG Knowledge Base
  kb: [
    {
      keywords: ['excavator', 'dig', 'caterpillar', 'hitachi'],
      topic: 'Excavator Specifications & Rates',
      content: 'InfraQuip maintains a robust inventory of mid to heavy-size excavators. Standard operating weights range from 18,000 kg to 50,000 kg. Major brands are Caterpillar and Tata Hitachi. Daily rental rates average ₹20,000 - ₹35,000/day depending on operating capacity. Grade A+ listings have verified oil-pressure readings, minimal bushing wear, and certified boom welds.'
    },
    {
      keywords: ['crane', 'lift', 'liebherr'],
      topic: 'Crane Logistics & Lift Capacities',
      content: 'Cranes listed on InfraQuip require specialized heavy-haul transit permissions from state authorities. Mobile cranes like the Liebherr LTM 1050 have lifting capacities exceeding 50 metric tonnes. Average rental rate is ₹85,000/day, which excludes operator costs. Inspection includes critical boom NDT testing, load-cell validation, and wire rope scanning.'
    },
    {
      keywords: ['inspection', 'inspect', 'grade', 'verified'],
      topic: 'Inspections & Quality Standards',
      content: 'Every equipment listing on InfraQuip undergoes a mandatory 150-point inspection by certified third-party mechanical engineers in India. Grade definitions: A+ (Mint condition, < 1,500 hours, certified hydraulics), A (Great condition, minor cosmetic wear, 1,500-4,000 hours), B+ (Fully functional, operational wear, needs servicing soon).'
    },
    {
      keywords: ['shipping', 'logistics', 'delivery', 'transport'],
      topic: 'B2B Freight & Heavy Logistics',
      content: 'Once logistics are assigned in the workflow, our automated broker coordinates with heavy-haul carriers. Shipping rates depend on width, height, and route distance, averaging ₹150 to ₹350 per kilometer. Transit permissions across state borders are handled automatically.'
    },
    {
      keywords: ['escrow', 'payment', 'payout', 'dispute'],
      topic: 'Escrow & Transaction Protection',
      content: 'InfraQuip uses a secure B2B escrow workflow compliant with Indian payment regulations. The buyer deposits funds which are held securely. Funds are only dispatched to the seller when delivery is confirmed by logistics and a 24-hour buyer inspection window clears. This prevents fraudulent equipment sales.'
    },
    {
      keywords: ['trends', 'statistics', 'dashboard', 'market', 'yield'],
      topic: 'Market Economics & Trends',
      content: 'B2B equipment rental yields are currently at an all-time high in major industrial corridors (e.g. DMIC) due to infrastructure expansion. Excavators show the highest utilization rates (84%), followed by crawler bulldozers (79%). Fleet operators are seeing an average annual ROI of 14.2% on rental conversions.'
    }
  ]
};

// Workflow Steps Definition
const workflowStages = [
  { name: 'Listing Posted', desc: 'Equipment listing is uploaded and validated by the seller.' },
  { name: 'Inspection', desc: 'Third-party heavy machinery engineers perform a 150-point diagnostic run.' },
  { name: 'Quality Verified', desc: 'Equipment status is certified. An official inspection grade and report are linked.' },
  { name: 'Escrow Funded', desc: 'Buyer deposits the transaction value or rental deposit in secure B2B escrow.' },
  { name: 'Logistics Dispatch', desc: 'Heavy-haul carrier is dispatched with structural route clearance.' },
  { name: 'Delivered', desc: 'Equipment arrives at jobsite. 24h operational validation window active.' },
  { name: 'Escrow Released', desc: 'Funds released to seller. Transaction archived successfully.' }
];

// Document Ready Setup
document.addEventListener('DOMContentLoaded', () => {
  // Early return if on placeholder view
  if (document.getElementById('placeholder-view')) {
    return;
  }

  initRouter();
  initMarketplace();
  initDashboard();
  initChatbot();
  
  // Connect Listing Form
  const listingForm = document.getElementById('add-listing-form');
  if (listingForm) {
    listingForm.addEventListener('submit', handleNewListing);
  }
});

// 1. SPA ROUTING SYSTEM
function initRouter() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const targetView = item.getAttribute('data-view');
      if (targetView) {
        switchView(targetView);
      }
    });
  });

  // Check URL Hash for initial routing
  const hash = window.location.hash.replace('#', '');
  if (hash && ['home', 'marketplace', 'portal', 'about'].includes(hash)) {
    switchView(hash);
  } else {
    switchView('home');
  }
}

function switchView(viewName) {
  state.activeTab = viewName;
  window.location.hash = viewName;

  // Toggle Section Views
  document.querySelectorAll('.page-section').forEach(sec => {
    sec.classList.remove('active');
  });
  
  const targetSection = document.getElementById(`${viewName}-section`);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Toggle Nav Item Active State
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update specific dashboard charts if navigating to portal
  if (viewName === 'portal') {
    setTimeout(renderDashboardCharts, 50);
    renderWorkflowTimeline();
  }
}

// 2. MARKETPLACE ENGINE
function initMarketplace() {
  renderListings();

  // Search input binding
  const searchInput = document.getElementById('market-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderListings();
    });
  }

  // Filter bindings
  const categoryFilter = document.getElementById('filter-category');
  const typeFilter = document.getElementById('filter-type');
  const conditionFilter = document.getElementById('filter-condition');
  const maxPriceInput = document.getElementById('filter-max-price');
  const maxPriceVal = document.getElementById('max-price-val');

  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      state.filters.category = e.target.value;
      renderListings();
    });
  }
  if (typeFilter) {
    typeFilter.addEventListener('change', (e) => {
      state.filters.type = e.target.value;
      renderListings();
    });
  }
  if (conditionFilter) {
    conditionFilter.addEventListener('change', (e) => {
      state.filters.condition = e.target.value;
      renderListings();
    });
  }
  if (maxPriceInput) {
    maxPriceInput.addEventListener('input', (e) => {
      state.filters.maxPrice = Number(e.target.value);
      if (maxPriceVal) maxPriceVal.textContent = `$${Number(e.target.value).toLocaleString()}`;
      renderListings();
    });
  }
}

function renderListings() {
  const container = document.getElementById('listings-container');
  if (!container) return;

  const filtered = state.listings.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
                          item.seller.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                          item.location.toLowerCase().includes(state.searchQuery.toLowerCase());
    
    const matchesCategory = !state.filters.category || item.category === state.filters.category;
    const matchesType = !state.filters.type || 
                        (state.filters.type === 'buy' && (item.type === 'sale' || item.type === 'both')) ||
                        (state.filters.type === 'rent' && (item.type === 'rent' || item.type === 'both'));
    const matchesCondition = !state.filters.condition || item.condition === state.filters.condition;
    const matchesPrice = item.price <= state.filters.maxPrice;

    return matchesSearch && matchesCategory && matchesType && matchesCondition && matchesPrice;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="glass-panel" style="grid-column: 1/-1; padding: 50px; text-align: center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); margin-bottom: 15px;"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        <h4>No Equipment Matches Found</h4>
        <p style="color: var(--text-secondary); margin-top: 5px;">Adjust your filters or query to find active heavy-machinery listings.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const isSale = item.type === 'sale' || item.type === 'both';
    const isRent = item.type === 'rent' || item.type === 'both';
    
    return `
      <div class="listing-card glass-panel">
        <span class="listing-badge-tag ${item.featured ? 'featured' : 'verified'}">
          ${item.featured ? 'Featured' : 'Verified'}
        </span>
        <div class="listing-image-container">
          <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); position:relative;">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--bg-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            <div style="position:absolute; bottom:10px; right:10px; font-size:10px; background: rgba(0,0,0,0.6); padding:4px 8px; border-radius:4px; font-weight:600;">
              ${item.year} Model
            </div>
          </div>
        </div>
        <div class="listing-details">
          <div class="listing-category">${item.category}</div>
          <h3 class="listing-title">${item.title}</h3>
          
          <div class="listing-meta">
            <div class="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>${item.hours.toLocaleString()} hrs</span>
            </div>
            <div class="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${item.location}</span>
            </div>
            <div class="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Grade: ${item.inspectorGrade}</span>
            </div>
            <div class="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>${item.seller.substring(0, 15)}</span>
            </div>
          </div>
          
          <div class="listing-pricing">
            <div>
              <div class="price-val">₹${item.price.toLocaleString()}</div>
              ${isRent ? `<div class="price-type">or ₹${item.rentalRate}/day rent</div>` : `<div class="price-type">Outright Purchase</div>`}
            </div>
            <button class="btn btn-primary" onclick="openDetailsModal('${item.id}')" style="padding: 8px 16px; font-size: 13px;">
              View Details
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Render featured list on Home view too if home container exists
  renderHomeFeatured();
}

function renderHomeFeatured() {
  const homeContainer = document.getElementById('featured-grid-home');
  if (!homeContainer) return;

  const featured = state.listings.filter(i => i.featured).slice(0, 3);
  homeContainer.innerHTML = featured.map(item => {
    return `
      <div class="listing-card glass-panel">
        <span class="listing-badge-tag featured">Featured</span>
        <div class="listing-image-container">
          <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); position:relative;">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--bg-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            <div style="position:absolute; bottom:10px; right:10px; font-size:10px; background: rgba(0,0,0,0.6); padding:4px 8px; border-radius:4px; font-weight:600;">
              ${item.year} Model
            </div>
          </div>
        </div>
        <div class="listing-details">
          <div class="listing-category">${item.category}</div>
          <h3 class="listing-title">${item.title}</h3>
          
          <div class="listing-meta" style="margin-bottom: 12px;">
            <div class="meta-item"><span>${item.hours.toLocaleString()} hrs</span></div>
            <div class="meta-item"><span>${item.location}</span></div>
          </div>
          
          <div class="listing-pricing">
            <div>
              <div class="price-val">₹${item.price.toLocaleString()}</div>
            </div>
            <button class="btn btn-primary" onclick="switchView('marketplace')" style="padding: 8px 16px; font-size: 13px;">
              Rent / Buy
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 3. SELLER SYSTEM - NEW LISTING
function handleNewListing(e) {
  e.preventDefault();
  
  const title = document.getElementById('new-title').value;
  const category = document.getElementById('new-category').value;
  const price = Number(document.getElementById('new-price').value);
  const rentalRate = Number(document.getElementById('new-rental-rate').value) || Math.round(price * 0.004);
  const type = document.getElementById('new-type').value;
  const year = Number(document.getElementById('new-year').value);
  const hours = Number(document.getElementById('new-hours').value);
  const location = document.getElementById('new-location').value;
  const condition = document.getElementById('new-condition').value;
  const seller = document.getElementById('new-seller').value || 'Independent Dealer';

  const newId = `eq-${state.listings.length + 1}`;
  
  const newEquipment = {
    id: newId,
    title,
    category,
    price,
    rentalRate,
    type,
    year,
    hours,
    location,
    condition,
    inspectorGrade: 'Pending',
    seller,
    featured: false,
    specs: {
      'Operating Weight': 'Assigned post-inspection',
      'Net Power': 'Assigned post-inspection',
      'Hours': hours.toLocaleString()
    }
  };

  state.listings.push(newEquipment);
  
  // Close Modal
  closeModal('sell-modal');
  
  // Reset Form
  e.target.reset();
  
  // Alert User & Render
  alert(`Listing "${title}" posted successfully! It is now pending our automated verification workflow.`);
  renderListings();
  
  // Automatically trigger backend workflow simulator with this new item if no active contract exists
  if (!state.activeContract) {
    startSimulatedContract(newEquipment, 'Sale Verification');
  }
  
  // Refresh Dashboard Charts to count the new listing
  if (state.activeTab === 'portal') {
    renderDashboardCharts();
  }
}

// 4. PORTAL & WORKFLOW TIMELINE SIMULATOR
function startSimulatedContract(equipment, orderType) {
  state.activeContract = {
    id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
    equipment: equipment,
    type: orderType,
    date: new Date().toLocaleDateString(),
    buyer: 'Global Build Infrastructure Corp',
    seller: equipment.seller,
    escrowAmount: orderType.includes('Rent') ? equipment.rentalRate * 10 : equipment.price
  };
  state.currentWorkflowStep = 0;
  
  alert(`Simulated order generated! ID: ${state.activeContract.id}. Navigating to Client Portal to view transaction workflow.`);
  
  switchView('portal');
  // Trigger Portal View Menu highlight
  togglePortalTab('workflow-hub');
}

function togglePortalTab(tabId) {
  document.querySelectorAll('.portal-menu-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const selectedItem = document.querySelector(`.portal-menu-item[data-portal-tab="${tabId}"]`);
  if (selectedItem) selectedItem.classList.add('active');

  document.querySelectorAll('.portal-view').forEach(view => {
    view.classList.remove('active');
  });

  const targetView = document.getElementById(tabId);
  if (targetView) targetView.classList.add('active');

  if (tabId === 'dashboard-hub') {
    setTimeout(renderDashboardCharts, 50);
  } else if (tabId === 'workflow-hub') {
    renderWorkflowTimeline();
  }
}

function renderWorkflowTimeline() {
  const timelineContainer = document.getElementById('workflow-timeline-container');
  if (!timelineContainer) return;

  if (!state.activeContract) {
    timelineContainer.innerHTML = `
      <div class="contract-empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <h4>No Active Transaction Workflows</h4>
        <p>Go to the marketplace and select a piece of heavy equipment to rent or buy to start the 7-stage automated escrow, inspection, and dispatch workflow.</p>
        <button class="btn btn-primary" onclick="switchView('marketplace')">Browse Marketplace</button>
      </div>
    `;
    return;
  }

  const contract = state.activeContract;
  const currentStep = state.currentWorkflowStep;

  // Stepper Header
  let stepperHTML = `
    <div class="active-contract-banner">
      <div>
        <span style="font-size:12px; font-weight:600; color:var(--bg-accent);">ACTIVE B2B CONTRACT</span>
        <h4 style="margin-top:2px;">${contract.type}: ${contract.equipment.title}</h4>
      </div>
      <div style="text-align:right;">
        <span style="display:block; font-size:13px; color:var(--text-secondary);">Contract ID: <strong>${contract.id}</strong></span>
        <span style="font-size:12px; color:var(--text-muted);">Initiated: ${contract.date}</span>
      </div>
    </div>

    <div class="workflow-stepper">
      <div class="workflow-progress-line" id="timeline-progress-bar"></div>
  `;

  // Generate node list
  stepperHTML += workflowStages.map((stage, idx) => {
    let statusClass = 'pending';
    if (idx < currentStep) statusClass = 'completed';
    else if (idx === currentStep) statusClass = 'active';

    const nodeSymbol = idx < currentStep ? '✓' : idx + 1;

    return `
      <div class="workflow-step ${statusClass}">
        <div class="step-node">${nodeSymbol}</div>
        <span class="step-label">${stage.name}</span>
      </div>
    `;
  }).join('');

  stepperHTML += `</div>`;

  // Action Panel Layout
  const activeStage = workflowStages[currentStep];
  let actionHTML = `
    <div class="workflow-details-panel">
      <div class="workflow-status-card glass-panel">
        <div>
          <span class="status-badge ${currentStep === 6 ? 'completed' : 'active'}">
            ${currentStep === 6 ? 'Workflow Finished' : `Current Stage: ${activeStage.name}`}
          </span>
          <h4 style="margin: 15px 0 10px 0; font-size:22px;">${activeStage.name}</h4>
          <p style="color:var(--text-secondary); font-size:14px;">${activeStage.desc}</p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top:1px solid var(--border-color); font-size:13px; color:var(--text-secondary);">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span>Seller:</span><strong>${contract.seller}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span>Buyer:</span><strong>${contract.buyer}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Escrow Value:</span><strong>₹${contract.escrowAmount.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <div class="workflow-action-card glass-panel" id="workflow-action-trigger-area">
        ${getWorkflowActionArea(currentStep)}
      </div>
    </div>
  `;

  timelineContainer.innerHTML = stepperHTML + actionHTML;

  // Set Progress Bar width dynamically
  setTimeout(() => {
    const pBar = document.getElementById('timeline-progress-bar');
    if (pBar) {
      const percentage = (currentStep / (workflowStages.length - 1)) * 100;
      pBar.style.width = `calc(${percentage}% - 10px)`;
    }
  }, 100);
}

function getWorkflowActionArea(step) {
  switch (step) {
    case 0:
      return `
        <h4>1. Trigger Inspections Run</h4>
        <p>InfraQuip automated dispatch will coordinate with local structural inspectors to dispatch to site.</p>
        <button class="btn btn-primary" onclick="advanceWorkflowStep()">Assign & Schedule Inspector</button>
      `;
    case 1:
      return `
        <h4>2. Execute 150-Point Machine Run</h4>
        <p>Inspector is on-site. Simulating diagnostic run for engine efficiency, fluid pressure, boom alignment, and track friction.</p>
        <button class="btn btn-primary" onclick="advanceWorkflowStep()">Generate Diagnostic Report & Certify Grade</button>
      `;
    case 2:
      return `
        <h4>3. Buyer Escrow Funding Required</h4>
        <p>The inspection report has been finalized with Grade A. Buyer must now fund the secure B2B escrow contract to locking safety assets.</p>
        <button class="btn btn-primary" onclick="advanceWorkflowStep()">Lock Funds in Escrow (₹${state.activeContract.escrowAmount.toLocaleString()})</button>
      `;
    case 3:
      return `
        <h4>4. Automated Carrier Dispatch</h4>
        <p>Escrow funded successfully. Assigning heavy freight carrier with optimal flatbed capability and custom transit permits.</p>
        <button class="btn btn-primary" onclick="advanceWorkflowStep()">Dispatch Carrier & Track Logistics</button>
      `;
    case 4:
      return `
        <h4>5. Freight In Transit</h4>
        <p>Heavy lowboy trailer is moving with equipment. Automated geofence checks are routing coordinates towards buyer's jobsite.</p>
        <button class="btn btn-primary" onclick="advanceWorkflowStep()">Confirm Jobsite Delivery</button>
      `;
    case 5:
      return `
        <h4>6. Operational Verification Window</h4>
        <p>Equipment delivered. Buyer has 24h to run verification. Trigger automated clearance or release escrow now.</p>
        <button class="btn btn-primary" onclick="advanceWorkflowStep()">Approve Payout Release</button>
      `;
    case 6:
      return `
        <h4>✓ Transaction Workflow Finished</h4>
        <p>Escrow payment released. Seller ledger has been credited and structural warranty certificates signed.</p>
        <button class="btn btn-secondary" onclick="archiveWorkflowContract()">Archive & Clear Contract</button>
      `;
    default:
      return '';
  }
}

function advanceWorkflowStep() {
  if (state.currentWorkflowStep < workflowStages.length - 1) {
    state.currentWorkflowStep++;
    
    // Update listing grade once inspection passes
    if (state.currentWorkflowStep === 3 && state.activeContract.equipment.inspectorGrade === 'Pending') {
      const idx = state.listings.findIndex(l => l.id === state.activeContract.equipment.id);
      if (idx !== -1) {
        state.listings[idx].inspectorGrade = 'A';
        renderListings();
      }
    }
    
    renderWorkflowTimeline();
  }
}

function archiveWorkflowContract() {
  state.activeContract = null;
  state.currentWorkflowStep = 0;
  renderWorkflowTimeline();
}

// 5. DATA VISUALIZATION DASHBOARDS
function initDashboard() {
  // Navigation trigger renders dashboard
  const dbTabBtn = document.querySelector('.portal-menu-item[data-portal-tab="dashboard-hub"]');
  if (dbTabBtn) {
    dbTabBtn.addEventListener('click', () => {
      togglePortalTab('dashboard-hub');
    });
  }
  
  const wfTabBtn = document.querySelector('.portal-menu-item[data-portal-tab="workflow-hub"]');
  if (wfTabBtn) {
    wfTabBtn.addEventListener('click', () => {
      togglePortalTab('workflow-hub');
    });
  }
}

function renderDashboardCharts() {
  // Chart 1: Rental Yield
  const ctxYield = document.getElementById('chart-rental-yield');
  if (ctxYield) {
    if (state.charts.yield) state.charts.yield.destroy();
    
    // Compute yield dynamically from state listings
    const categories = ['Excavators', 'Cranes', 'Loaders', 'Bulldozers'];
    const avgRates = categories.map(cat => {
      const filtered = state.listings.filter(l => l.category === cat);
      if (filtered.length === 0) return 0;
      const sum = filtered.reduce((acc, curr) => acc + curr.rentalRate, 0);
      return Math.round(sum / filtered.length);
    });

    state.charts.yield = new Chart(ctxYield, {
      type: 'bar',
      data: {
        labels: categories,
        datasets: [{
          label: 'Average Daily Rental (₹)',
          data: avgRates,
          backgroundColor: [
            'rgba(245, 158, 11, 0.75)',
            'rgba(59, 130, 246, 0.75)',
            'rgba(16, 185, 129, 0.75)',
            'rgba(139, 92, 246, 0.75)'
          ],
          borderColor: [
            '#f59e0b',
            '#3b82f6',
            '#10b981',
            '#8b5cf6'
          ],
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }

  // Chart 2: Historical Pricing Trend
  const ctxTrends = document.getElementById('chart-price-trends');
  if (ctxTrends) {
    if (state.charts.trends) state.charts.trends.destroy();

    state.charts.trends = new Chart(ctxTrends, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [
          {
            label: 'Excavators',
            data: [7200000, 7400000, 7500000, 7800000, 8000000, 8100000, 8200000],
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            tension: 0.35,
            borderWidth: 2
          },
          {
            label: 'Cranes',
            data: [23000000, 23500000, 23800000, 24000000, 24200000, 24400000, 24500000],
            borderColor: '#3b82f6',
            backgroundColor: 'transparent',
            tension: 0.35,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            labels: { color: '#94a3b8' }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }

  // Chart 3: Inventory Distribution
  const ctxInventory = document.getElementById('chart-inventory');
  if (ctxInventory) {
    if (state.charts.inventory) state.charts.inventory.destroy();

    const categories = ['Excavators', 'Cranes', 'Loaders', 'Bulldozers'];
    const counts = categories.map(cat => state.listings.filter(l => l.category === cat).length);

    state.charts.inventory = new Chart(ctxInventory, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [{
          data: counts,
          backgroundColor: [
            '#f59e0b',
            '#3b82f6',
            '#10b981',
            '#8b5cf6'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'right',
            labels: { color: '#94a3b8', boxWidth: 12 }
          }
        }
      }
    });
  }
}

// 6. RAG CHATBOT SYSTEM (INFRABOT)
function initChatbot() {
  const panel = document.getElementById('chatbot-panel');
  const toggle = document.getElementById('chatbot-toggle');
  
  if (toggle && panel) {
    toggle.addEventListener('click', () => {
      const isVisible = panel.style.display === 'flex';
      panel.style.display = isVisible ? 'none' : 'flex';
    });
  }

  const sendBtn = document.getElementById('chat-send-btn');
  const chatInput = document.getElementById('chat-input');
  
  if (sendBtn && chatInput) {
    sendBtn.addEventListener('click', handleChatSubmit);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleChatSubmit();
    });
  }

  // Render initial greeting
  renderBotMessage("Hello, I am **InfraBot**, your AI-assisted B2B logistics & equipment expert. Ask me about heavy machinery specs, shipping mileage, inspection certifications, or dashboard data trends!");
}

function handleChatSubmit() {
  const input = document.getElementById('chat-input');
  if (!input || !input.value.trim()) return;

  const query = input.value.trim();
  renderUserMessage(query);
  input.value = '';

  // Show dynamic typing indicator
  setTimeout(() => {
    processChatQuery(query);
  }, 400);
}

function renderUserMessage(text) {
  const chatBody = document.getElementById('chat-body');
  if (!chatBody) return;

  const msg = document.createElement('div');
  msg.className = 'chat-message user';
  msg.innerHTML = `${text}<span class="chat-message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function renderBotMessage(text, actionTrigger = null) {
  const chatBody = document.getElementById('chat-body');
  if (!chatBody) return;

  const msg = document.createElement('div');
  msg.className = 'chat-message bot';
  
  // Basic markdown renderer for bold words
  const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  msg.innerHTML = `${formattedText}<span class="chat-message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;

  if (actionTrigger) {
    const trigger = document.createElement('div');
    trigger.className = 'bot-action-trigger';
    trigger.textContent = actionTrigger.label;
    trigger.onclick = actionTrigger.callback;
    msg.appendChild(trigger);
  }

  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function processChatQuery(query) {
  const qLower = query.toLowerCase();
  
  // 1. RAG Retrieve: Find best matching KB article
  let bestMatch = null;
  let highestScore = 0;
  
  state.kb.forEach(article => {
    let score = 0;
    article.keywords.forEach(keyword => {
      if (qLower.includes(keyword)) score++;
    });
    if (score > highestScore) {
      highestScore = score;
      bestMatch = article;
    }
  });

  // 2. Specialized command checking (Routing / Actions)
  if (qLower.includes('workflow') || qLower.includes('contract') || qLower.includes('order')) {
    if (state.activeContract) {
      const activeStageName = workflowStages[state.currentWorkflowStep].name;
      renderBotMessage(`Checking active contract records... Order **${state.activeContract.id}** is currently in step **${state.currentWorkflowStep + 1}/7**: **${activeStageName}**. You can step through this transaction process inside the Client Portal.`, {
        label: 'Open Workflow Stepper',
        callback: () => {
          switchView('portal');
          togglePortalTab('workflow-hub');
        }
      });
    } else {
      renderBotMessage("There is no active B2B contract running. Head to the Marketplace to click 'View Details' and buy/rent an equipment listing to spawn a workflow.");
    }
    return;
  }

  if (qLower.includes('dashboard') || qLower.includes('chart') || qLower.includes('data') || qLower.includes('yield') || qLower.includes('trends')) {
    renderBotMessage("I've queried the live inventory and sales analytics. Click below to view the Data Visualization Dashboards directly.", {
      label: 'Open Visualization Dashboard',
      callback: () => {
        switchView('portal');
        togglePortalTab('dashboard-hub');
      }
    });
    return;
  }

  if (qLower.includes('excavator') && (qLower.includes('yield') || qLower.includes('price') || qLower.includes('rent'))) {
    renderBotMessage("Retrieved knowledge base records: Excavators yield premium daily rental rates of around **₹20,000-₹35,000/day**. Click below to highlight and focus the Data Visualizer on Excavator data.", {
      label: 'Show Excavator Yield',
      callback: () => {
        switchView('portal');
        togglePortalTab('dashboard-hub');
        // Highlight logic on chart (e.g. flash chart element or update label)
        if (state.charts.yield) {
          state.charts.yield.config.data.datasets[0].backgroundColor = [
            '#ff5722', // Bright highlight color
            'rgba(59, 130, 246, 0.2)',
            'rgba(16, 185, 129, 0.2)',
            'rgba(139, 92, 246, 0.2)'
          ];
          state.charts.yield.update();
        }
      }
    });
    return;
  }

  // 3. Fallback to KB match or general help
  if (bestMatch && highestScore > 0) {
    renderBotMessage(`[RAG Search Match - Topic: **${bestMatch.topic}**]\n\n${bestMatch.content}`);
  } else {
    renderBotMessage("I couldn't find a direct specification matches for that query. Try asking something like:\n- *What are the standard inspection checks?*\n- *Show me active workflow details*\n- *Average price of cranes*");
  }
}

function askSuggestion(queryText) {
  const input = document.getElementById('chat-input');
  if (input) {
    input.value = queryText;
    handleChatSubmit();
  }
}

// 7. MODAL HELPERS & OTHER EVENT TRIGGERS
function openDetailsModal(id) {
  const modal = document.getElementById('details-modal');
  const body = document.getElementById('details-modal-body');
  if (!modal || !body) return;

  const item = state.listings.find(l => l.id === id);
  if (!item) return;

  const specsRows = Object.entries(item.specs).map(([key, val]) => `
    <tr>
      <td>${key}</td>
      <td>${val}</td>
    </tr>
  `).join('');

  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px;">
      <div>
        <span style="font-size:12px; font-weight:700; color:var(--bg-accent); text-transform:uppercase;">${item.category}</span>
        <h2 style="font-size:28px; margin-top:2px;">${item.title}</h2>
        <p style="color:var(--text-secondary); font-size:14px; margin-top:4px;">Listed by: <strong>${item.seller}</strong> | Location: <strong>${item.location}</strong></p>
      </div>
      <div style="text-align:right;">
        <span style="font-size:26px; font-weight:800; color:var(--text-primary); display:block;">₹${item.price.toLocaleString()}</span>
        <span style="font-size:13px; color:var(--text-secondary);">Daily Rental: ₹${item.rentalRate}/day</span>
      </div>
    </div>

    <div style="background:#1e293b; border-radius:12px; height:220px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border-color); margin-bottom:20px; overflow:hidden; position:relative;">
      <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--bg-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
      <div style="position:absolute; bottom:10px; left:10px; background:rgba(0,0,0,0.6); padding:4px 10px; border-radius:4px; font-size:12px; font-weight:600;">
        ${item.condition} Condition
      </div>
    </div>

    <h4>Technical Specifications</h4>
    <table class="specs-table">
      <tbody>
        <tr><td>Manufacture Year</td><td>${item.year}</td></tr>
        <tr><td>Machine Operating Hours</td><td>${item.hours.toLocaleString()} hrs</td></tr>
        ${specsRows}
      </tbody>
    </table>

    <div class="inspection-report-box">
      <div class="grade-badge">${item.inspectorGrade}</div>
      <div class="inspection-info">
        <h4>Certified Heavy-Equipment Report</h4>
        <p>${item.inspectorGrade === 'Pending' ? 'Report under compilation by B2B mechanical engineers.' : 'Verified checklist covering track wear, seal pressure, radiator fluid status, and engine emissions certified.'}</p>
      </div>
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:25px;">
      <button class="btn btn-primary" onclick="buyRentItem('${item.id}', 'Outright Purchase')">
        Buy Outright (₹${item.price.toLocaleString()})
      </button>
      <button class="btn btn-secondary" onclick="buyRentItem('${item.id}', 'Rental Lease')">
        Rent Machinery (₹${item.rentalRate}/day)
      </button>
    </div>
  `;

  modal.style.display = 'flex';
}

function buyRentItem(equipmentId, type) {
  const item = state.listings.find(l => l.id === equipmentId);
  if (!item) return;

  closeModal('details-modal');
  startSimulatedContract(item, type);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}
