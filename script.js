    // Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyCb20H8JyNokNU8SI7oO2JZNYq4QH1QTS8",
      authDomain: "oxyera2-d7cfe.firebaseapp.com",
      databaseURL: "https://oxyera2-d7cfe-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "oxyera2-d7cfe",
      storageBucket: "oxyera2-d7cfe.firebasestorage.app",
      messagingSenderId: "490959221294",
      appId: "1:490959221294:web:de3db8ec0ceb9c040da5bf"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

    // Reference to Environment data
    const envRef = database.ref('Environment');

    // Variables to store historical data
    let aqiHistory = [];
    let co2History = [];
    let nh3History = [];
    let no2History = [];
    const maxHistoryLength = 20; // Keep last 20 readings

    // Device connection status
    let deviceConnected = false;
    let connectionCheckInterval;
    let dataListenerActive = false;
    let lastDataTimestamp = null;
    const DATA_TIMEOUT = 10000; // 10 seconds without data = disconnected

    // WAQI API Token
    const WAQI_TOKEN = "YOUR_WAQI_TOKEN";

    // Initialize charts
    const aqiCtx = document.getElementById('aqiChart').getContext('2d');
    const aqiChart = new Chart(aqiCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'AQI',
            data: [],
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'CO₂',
            data: [],
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: false
          }
        }
      }
    });

    const pollutantCtx = document.getElementById('pollutantChart').getContext('2d');
    const pollutantChart = new Chart(pollutantCtx, {
      type: 'doughnut',
      data: {
        labels: ['AQI', 'CO₂', 'NH₃', 'NO₂'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: [
            '#3498db',
            '#e74c3c',
            '#2ecc71',
            '#9b59b6'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });

    // Initialize analytics charts
    const analyticsChart1 = new Chart(document.getElementById('analyticsChart1'), {
      type: 'bar',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          label: 'Average AQI by Week',
          data: [45, 52, 60, 48],
          backgroundColor: '#3498db'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Average AQI by Week'
          }
        }
      }
    });

    const analyticsChart2 = new Chart(document.getElementById('analyticsChart2'), {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'CO₂ Trend',
          data: [650, 720, 680, 750, 810, 790],
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'CO₂ Trend (ppm)'
          }
        }
      }
    });

    const analyticsChart3 = new Chart(document.getElementById('analyticsChart3'), {
      type: 'pie',
      data: {
        labels: ['Good', 'Moderate', 'Unhealthy'],
        datasets: [{
          data: [65, 25, 10],
          backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Air Quality Distribution'
          }
        }
      }
    });

    const analyticsChart4 = new Chart(document.getElementById('analyticsChart4'), {
      type: 'radar',
      data: {
        labels: ['AQI', 'CO₂', 'NH₃', 'NO₂', 'PM2.5', 'PM10'],
        datasets: [{
          label: 'Pollutant Levels',
          data: [65, 72, 45, 38, 58, 62],
          backgroundColor: 'rgba(52, 152, 219, 0.2)',
          borderColor: '#3498db',
          pointBackgroundColor: '#3498db'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Pollutant Radar Analysis'
          }
        }
      }
    });

    // Initialize historical chart
    const historicalChart = new Chart(document.getElementById('historicalChart'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Historical Data',
          data: [],
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: false
          }
        }
      }
    });

    // Function to update AQI badge color based on value
    function updateAqiBadge(aqiValue) {
      const aqiBadge = document.getElementById('aqi-badge');
      aqiBadge.classList.remove('good', 'moderate', 'unhealthy-sensitive', 'unhealthy', 'very-unhealthy', 'hazardous');

      if (aqiValue <= 50) {
        aqiBadge.classList.add('good');
        aqiBadge.textContent = 'Good';
      } else if (aqiValue <= 100) {
        aqiBadge.classList.add('moderate');
        aqiBadge.textContent = 'Moderate';
      } else if (aqiValue <= 150) {
        aqiBadge.classList.add('unhealthy-sensitive');
        aqiBadge.textContent = 'Unhealthy for Sensitive Groups';
      } else if (aqiValue <= 200) {
        aqiBadge.classList.add('unhealthy');
        aqiBadge.textContent = 'Unhealthy';
      } else if (aqiValue <= 300) {
        aqiBadge.classList.add('very-unhealthy');
        aqiBadge.textContent = 'Very Unhealthy';
      } else {
        aqiBadge.classList.add('hazardous');
        aqiBadge.textContent = 'Hazardous';
      }
    }

    // Function to update trend indicator
    function updateTrendIndicator(elementId, currentValue, previousValue, unit = '') {
      const trendElement = document.getElementById(elementId);
      if (previousValue === null) {
        trendElement.innerHTML = `<i class="fas fa-info-circle"></i> Initial reading`;
        trendElement.className = 'card-trend';
        return;
      }

      const difference = currentValue - previousValue;
      const percentChange = previousValue !== 0 ? (difference / previousValue * 100).toFixed(1) : 100;

      if (difference > 0) {
        trendElement.className = 'card-trend up';
        trendElement.innerHTML = `<i class="fas fa-arrow-up"></i> ${Math.abs(difference).toFixed(1)}${unit} (${percentChange}%) increase from previous`;
      } else if (difference < 0) {
        trendElement.className = 'card-trend down';
        trendElement.innerHTML = `<i class="fas fa-arrow-down"></i> ${Math.abs(difference).toFixed(1)}${unit} (${percentChange}%) decrease from previous`;
      } else {
        trendElement.className = 'card-trend';
        trendElement.innerHTML = `<i class="fas fa-equals"></i> No change from previous`;
      }
    }

    // Function to update health recommendations based on air quality
    function updateHealthRecommendations(aqiValue, co2Value, nh3Value, no2Value) {
      const aqiRecommendation = document.getElementById('aqi-recommendation');
      const co2Recommendation = document.getElementById('co2-recommendation');

      // AQI recommendations
      if (aqiValue <= 50) {
        aqiRecommendation.querySelector('p').textContent = 'Air quality is satisfactory. Enjoy outdoor activities as usual.';
        aqiRecommendation.style.borderLeftColor = '#2ecc71';
      } else if (aqiValue <= 100) {
        aqiRecommendation.querySelector('p').textContent = 'Air quality is acceptable. Unusually sensitive people should consider reducing prolonged outdoor exertion.';
        aqiRecommendation.style.borderLeftColor = '#f1c40f';
      } else if (aqiValue <= 150) {
        aqiRecommendation.querySelector('p').textContent = 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.';
        aqiRecommendation.style.borderLeftColor = '#e67e22';
      } else if (aqiValue <= 200) {
        aqiRecommendation.querySelector('p').textContent = 'Everyone may begin to experience health effects. Members of sensitive groups may experience more serious effects.';
        aqiRecommendation.style.borderLeftColor = '#e74c3c';
      } else if (aqiValue <= 300) {
        aqiRecommendation.querySelector('p').textContent = 'Health alert: everyone may experience more serious health effects. Avoid outdoor activities.';
        aqiRecommendation.style.borderLeftColor = '#9b59b6';
      } else {
        aqiRecommendation.querySelector('p').textContent = 'Health warning of emergency conditions. The entire population is more likely to be affected. Stay indoors with air purifiers.';
        aqiRecommendation.style.borderLeftColor = '#7f8c8d';
      }

      // CO2 recommendations
      if (co2Value < 800) {
        co2Recommendation.querySelector('p').textContent = 'CO₂ levels are normal. Ventilation is adequate.';
        co2Recommendation.style.borderLeftColor = '#2ecc71';
      } else if (co2Value < 1200) {
        co2Recommendation.querySelector('p').textContent = 'CO₂ levels are slightly elevated. Consider increasing ventilation.';
        co2Recommendation.style.borderLeftColor = '#f1c40f';
      } else if (co2Value < 2000) {
        co2Recommendation.querySelector('p').textContent = 'CO₂ levels are high. Improve ventilation by opening windows or using air purifiers.';
        co2Recommendation.style.borderLeftColor = '#e67e22';
      } else {
        co2Recommendation.querySelector('p').textContent = 'CO₂ levels are very high. Ventilation is poor. Take immediate steps to improve air circulation.';
        co2Recommendation.style.borderLeftColor = '#e74c3c';
      }
    }

    // WAQI API Functions
    async function fetchWaqi(city) {
      try {
        const url = `https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=${WAQI_TOKEN}`;
        const res = await fetch(url);
        const j = await res.json();
        if (j.status === "ok" && j.data) {
          return {
            ts: j.data.time?.s || new Date().toISOString(),
            aqi: j.data.aqi ?? null,
            iaqi: j.data.iaqi || {},
            cityName: j.data.city?.name || city,
          };
        }
      } catch (e) { console.error(e); }
      return null;
    }

    async function fetchOpenAQ(city) {
      try {
        const url = `https://api.openaq.org/v2/latest?country=IN&city=${encodeURIComponent(city)}`;
        const res = await fetch(url);
        const j = await res.json();
        if (j.results?.length) {
          const combined = {};
          let lastUpdated = null;
          j.results.forEach(loc => {
            loc.measurements.forEach(m => {
              combined[m.parameter] = { value: m.value, unit: m.unit };
              if (!lastUpdated || new Date(m.lastUpdated) > new Date(lastUpdated))
                lastUpdated = m.lastUpdated;
            });
          });
          return { ts: lastUpdated, pollutants: combined };
        }
      } catch (e) { console.error(e); }
      return null;
    }

    async function getCityData(city) {
      const [waqi, openaq] = await Promise.all([fetchWaqi(city), fetchOpenAQ(city)]);
      const result = { city, ts: new Date().toISOString(), pollutants: {}, aqi: null };

      if (waqi?.aqi !== null) {
        result.aqi = waqi.aqi;
        result.ts = waqi.ts;
      }
      if (waqi?.iaqi) {
        for (const k in waqi.iaqi) result.pollutants[k] = waqi.iaqi[k].v;
      }
      if (openaq?.pollutants) {
        for (const k in openaq.pollutants) {
          if (!result.pollutants[k]) result.pollutants[k] = openaq.pollutants[k].value;
        }
        if (!result.aqi) result.ts = openaq.ts;
      }
      return result;
    }

    function updateCityAQI(d) {
      document.getElementById("city-aqi-result").classList.remove("hidden");
      document.getElementById("city-name").textContent = d.city;
      document.getElementById("city-aqi-value").textContent = d.aqi ?? "N/A";
      document.getElementById("city-last-updated").textContent = "Updated: " + d.ts;
      document.getElementById("city-pm25").textContent = d.pollutants.pm25 ?? d.pollutants["pm2.5"] ?? "--";
      document.getElementById("city-pm10").textContent = d.pollutants.pm10 ?? "--";
      document.getElementById("city-no2").textContent = d.pollutants.no2 ?? "--";
      document.getElementById("city-o3").textContent = d.pollutants.o3 ?? "--";

      // Update AQI badge color for city data
      const aqiValue = d.aqi;
      if (aqiValue !== null) {
        const cityAqiValue = document.getElementById("city-aqi-value");
        cityAqiValue.classList.remove('good', 'moderate', 'unhealthy-sensitive', 'unhealthy', 'very-unhealthy', 'hazardous');

        if (aqiValue <= 50) {
          cityAqiValue.classList.add('good');
        } else if (aqiValue <= 100) {
          cityAqiValue.classList.add('moderate');
        } else if (aqiValue <= 150) {
          cityAqiValue.classList.add('unhealthy-sensitive');
        } else if (aqiValue <= 200) {
          cityAqiValue.classList.add('unhealthy');
        } else if (aqiValue <= 300) {
          cityAqiValue.classList.add('very-unhealthy');
        } else {
          cityAqiValue.classList.add('hazardous');
        }
      }
    }

    // Function to check device connection automatically
    function checkDeviceConnection() {
      const now = Date.now();

      // Device is considered connected if we received data within the timeout period
      const isConnected = lastDataTimestamp && (now - lastDataTimestamp < DATA_TIMEOUT);

      if (isConnected && !deviceConnected) {
        deviceConnected = true;
        showDeviceConnected();
        console.log("Device automatically detected as CONNECTED");
      } else if (!isConnected && deviceConnected) {
        deviceConnected = false;
        showDeviceDisconnected();
        console.log("Device automatically detected as DISCONNECTED");
      }

      return isConnected;
    }

    // Function to show device connected state
    function showDeviceConnected() {
      const connectionStatus = document.getElementById('connection-status');
      connectionStatus.className = 'connection-status connected';
      connectionStatus.innerHTML = '<i class="fas fa-plug"></i> Device Connected - Receiving real-time data';

      // Show data sections with full opacity
      document.querySelectorAll('.dashboard-view .card, .health-recommendations, .charts, .pollutant-list').forEach(el => {
        el.style.opacity = '1';
      });

      // Remove no-data classes and show actual values
      document.querySelectorAll('.no-data').forEach(el => {
        el.classList.remove('no-data');
      });

      // Enable all interactive elements
      document.querySelectorAll('.card, .recommendation-card').forEach(el => {
        el.style.pointerEvents = 'auto';
      });
    }

    // Function to show device disconnected state
    function showDeviceDisconnected() {
      const connectionStatus = document.getElementById('connection-status');
      connectionStatus.className = 'connection-status disconnected';
      connectionStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Device Not Connected - Connect USB device';

      // Dim data sections significantly
      document.querySelectorAll('.dashboard-view .card, .health-recommendations, .charts, .pollutant-list').forEach(el => {
        el.style.opacity = '0.4';
      });

      // Show "No Data" messages
      document.querySelectorAll('.card-value').forEach(el => {
        el.textContent = 'No Data';
        el.classList.add('no-data');
      });

      document.getElementById('aqi-badge').textContent = 'No Device';
      document.getElementById('aqi-badge').className = 'aqi-badge hazardous';

      document.querySelectorAll('.pollutant-value').forEach(el => {
        el.textContent = 'No Data';
        el.classList.add('no-data');
      });

      // Reset trend indicators
      document.querySelectorAll('.card-trend').forEach(el => {
        el.innerHTML = '<i class="fas fa-info-circle"></i> Connect device to see data';
        el.className = 'card-trend';
      });

      // Reset health recommendations
      document.getElementById('aqi-recommendation').querySelector('p').textContent = 'Connect your air quality monitoring device to see real-time recommendations.';
      document.getElementById('co2-recommendation').querySelector('p').textContent = 'Device connection required for CO₂ monitoring.';

      // Disable interactive elements
      document.querySelectorAll('.card, .recommendation-card').forEach(el => {
        el.style.pointerEvents = 'none';
      });

      // Clear charts if no data for a while
      if (!lastDataTimestamp || (Date.now() - lastDataTimestamp > DATA_TIMEOUT * 2)) {
        aqiChart.data.labels = [];
        aqiChart.data.datasets[0].data = [];
        aqiChart.data.datasets[1].data = [];
        aqiChart.update();

        pollutantChart.data.datasets[0].data = [0, 0, 0, 0];
        pollutantChart.update();
      }
    }

    // Function to start listening to Firebase data
    function startDataListening() {
      if (dataListenerActive) return;

      dataListenerActive = true;
      envRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const connectionStatus = document.getElementById('connection-status');

        if (data) {
          // Update timestamp when we receive data
          lastDataTimestamp = Date.now();

          // We have data from Firebase, so device should be considered connected
          if (!deviceConnected) {
            deviceConnected = true;
            showDeviceConnected();
          }

          connectionStatus.className = 'connection-status connected';
          connectionStatus.innerHTML = '<i class="fas fa-plug"></i> Device Connected - Receiving real-time data';

          // Update current values
          const aqiValue = data.AQI ? parseFloat(data.AQI) : 0;
          const co2Value = data.CO2_ppm ? parseFloat(data.CO2_ppm) : 0;
          const nh3Value = data.NH3_ppm ? parseFloat(data.NH3_ppm) : 0;
          const no2Value = data.NO2_ppm ? parseFloat(data.NO2_ppm) : 0;

          document.getElementById('aqi-value').textContent = aqiValue.toFixed(1);
          document.getElementById('co2-value').textContent = co2Value.toFixed(1) + ' ppm';
          document.getElementById('nh3-value').textContent = nh3Value.toFixed(1) + ' ppm';

          document.getElementById('pollutant-aqi').textContent = aqiValue.toFixed(1);
          document.getElementById('pollutant-co2').textContent = co2Value.toFixed(1) + ' ppm';
          document.getElementById('pollutant-nh3').textContent = nh3Value.toFixed(1) + ' ppm';
          document.getElementById('pollutant-no2').textContent = no2Value.toFixed(1) + ' ppm';

          // Remove no-data class
          document.querySelectorAll('.card-value, .pollutant-value').forEach(el => {
            el.classList.remove('no-data');
          });

          // Update AQI badge
          updateAqiBadge(aqiValue);

          // Update health recommendations
          updateHealthRecommendations(aqiValue, co2Value, nh3Value, no2Value);

          // Update trend indicators
          const previousAqi = aqiHistory.length > 0 ? aqiHistory[aqiHistory.length - 1] : null;
          const previousCo2 = co2History.length > 0 ? co2History[co2History.length - 1] : null;
          const previousNh3 = nh3History.length > 0 ? nh3History[nh3History.length - 1] : null;

          updateTrendIndicator('aqi-trend', aqiValue, previousAqi);
          updateTrendIndicator('co2-trend', co2Value, previousCo2, ' ppm');
          updateTrendIndicator('nh3-trend', nh3Value, previousNh3, ' ppm');

          // Add to history
          const now = new Date();
          const timeLabel = now.getHours() + ':' + now.getMinutes().toString().padStart(2, '0');

          aqiHistory.push(aqiValue);
          co2History.push(co2Value);
          nh3History.push(nh3Value);
          no2History.push(no2Value);

          // Keep history to max length
          if (aqiHistory.length > maxHistoryLength) {
            aqiHistory.shift();
            co2History.shift();
            nh3History.shift();
            no2History.shift();
            aqiChart.data.labels.shift();
          }

          // Update chart labels with time
          aqiChart.data.labels.push(timeLabel);

          // Update chart data
          aqiChart.data.datasets[0].data = [...aqiHistory];
          aqiChart.data.datasets[1].data = [...co2History];
          aqiChart.update();

          // Update pollutant chart
          pollutantChart.data.datasets[0].data = [aqiValue, co2Value, nh3Value, no2Value];
          pollutantChart.update();

        } else {
          // No data from Firebase - check if we should show disconnected state
          const now = Date.now();
          if (!lastDataTimestamp || (now - lastDataTimestamp > DATA_TIMEOUT)) {
            if (deviceConnected) {
              deviceConnected = false;
              showDeviceDisconnected();
            }

            connectionStatus.className = 'connection-status disconnected';
            connectionStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Device Not Connected - No data available';
          } else {
            // We still have recent data, keep showing connected but with warning
            connectionStatus.className = 'connection-status connected';
            connectionStatus.innerHTML = '<i class="fas fa-plug"></i> Device Connected - No recent data';
          }
        }
      }, (error) => {
        console.error('Firebase error:', error);
        const connectionStatus = document.getElementById('connection-status');
        connectionStatus.className = 'connection-status disconnected';
        connectionStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Connection error - Check device';

        if (deviceConnected) {
          deviceConnected = false;
          showDeviceDisconnected();
        }
      });
    }

    // Navigation functionality with smooth scrolling
    function setupNavigation() {
      const navLinks = document.querySelectorAll('.nav-link');
      const sections = document.querySelectorAll('.view-section');
      const backToTopBtn = document.getElementById('back-to-top');

      // Function to update active navigation link
      function updateActiveNavLink() {
        const scrollPosition = window.scrollY + 100;

        sections.forEach(section => {
          const sectionTop = section.offsetTop;
          const sectionHeight = section.offsetHeight;
          const sectionId = section.getAttribute('id');

          if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
              link.classList.remove('active');
              if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
              }
            });
          }
        });

        // Show/hide back to top button
        if (window.scrollY > 500) {
          backToTopBtn.classList.add('active');
        } else {
          backToTopBtn.classList.remove('active');
        }
      }

      // Add click event to navigation links
      navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
          e.preventDefault();

          const targetId = this.getAttribute('href');
          const targetSection = document.querySelector(targetId);

          if (targetSection) {
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            // Smooth scroll to target section
            window.scrollTo({
              top: targetSection.offsetTop - 20,
              behavior: 'smooth'
            });

            // On mobile, close the sidebar after selection
            if (window.innerWidth <= 992) {
              document.getElementById('sidebar').classList.remove('active');
              document.getElementById('sidebar-overlay').classList.remove('active');
            }
          }
        });
      });

      // Back to top functionality
      backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });

      // Update active nav link on scroll
      window.addEventListener('scroll', updateActiveNavLink);

      // Initial update
      updateActiveNavLink();
    }

    // Mobile menu functionality
    function setupMobileMenu() {
      const mobileMenuBtn = document.getElementById('mobile-menu-btn');
      const sidebar = document.getElementById('sidebar');
      const sidebarOverlay = document.getElementById('sidebar-overlay');

      mobileMenuBtn.addEventListener('click', function () {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
      });

      // Close sidebar when clicking on overlay
      sidebarOverlay.addEventListener('click', function () {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
      });

      // Close sidebar when clicking outside on mobile
      document.addEventListener('click', function (e) {
        if (window.innerWidth <= 992 &&
          !sidebar.contains(e.target) &&
          e.target !== mobileMenuBtn &&
          !mobileMenuBtn.contains(e.target) &&
          e.target !== sidebarOverlay) {
          sidebar.classList.remove('active');
          sidebarOverlay.classList.remove('active');
        }
      });
    }

    // Historical data functionality
    function setupHistoricalData() {
      const loadButton = document.getElementById('load-history');

      loadButton.addEventListener('click', function () {
        const period = document.getElementById('historical-period').value;
        const metric = document.getElementById('historical-metric').value;

        // Generate sample historical data based on selection
        const days = parseInt(period);
        const labels = [];
        const data = [];

        for (let i = days; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          labels.push(date.toLocaleDateString());

          // Generate sample data based on metric
          let value;
          switch (metric) {
            case 'aqi':
              value = Math.floor(Math.random() * 100) + 30;
              break;
            case 'co2':
              value = Math.floor(Math.random() * 500) + 600;
              break;
            case 'nh3':
              value = Math.random() * 5;
              break;
            case 'no2':
              value = Math.random() * 10;
              break;
            default:
              value = 0;
          }

          data.push(value);
        }

        // Update the chart
        historicalChart.data.labels = labels;
        historicalChart.data.datasets[0].data = data;

        // Update label and color based on metric
        let label, borderColor;
        switch (metric) {
          case 'aqi':
            label = 'Air Quality Index (AQI)';
            borderColor = '#3498db';
            break;
          case 'co2':
            label = 'Carbon Dioxide (CO₂) - ppm';
            borderColor = '#e74c3c';
            break;
          case 'nh3':
            label = 'Ammonia (NH₃) - ppm';
            borderColor = '#2ecc71';
            break;
          case 'no2':
            label = 'Nitrogen Dioxide (NO₂) - ppm';
            borderColor = '#9b59b6';
            break;
        }

        historicalChart.data.datasets[0].label = label;
        historicalChart.data.datasets[0].borderColor = borderColor;
        historicalChart.data.datasets[0].backgroundColor = borderColor + '20'; // Add opacity

        historicalChart.update();
      });

      // Load data initially
      loadButton.click();
    }

    // AI Chat Bot functionality
    function setupChatbot() {
      const chatButton = document.getElementById('chatbot-button');
      const chatWindow = document.getElementById('chatbot-window');
      const chatMessages = document.getElementById('chat-messages');
      const chatInput = document.getElementById('chat-input');
      const sendButton = document.getElementById('send-message');
      const closeChat = document.getElementById('close-chat');

      let chatOpen = false;

      // Toggle chat window
      chatButton.addEventListener('click', () => {
        chatOpen = !chatOpen;
        if (chatOpen) {
          chatWindow.classList.add('active');
          chatInput.focus();
        } else {
          chatWindow.classList.remove('active');
        }
      });

      // Close chat window
      closeChat.addEventListener('click', () => {
        chatOpen = false;
        chatWindow.classList.remove('active');
      });

      // Send message function
      function sendMessage() {
        const message = chatInput.value.trim();
        if (message === '') return;

        // Add user message to chat
        addMessage(message, 'user');
        chatInput.value = '';

        // Process message and generate response
        setTimeout(() => {
          generateBotResponse(message);
        }, 500);
      }

      // Send message on button click or Enter key
      sendButton.addEventListener('click', sendMessage);
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });

      // Add message to chat
      function addMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
        messageElement.textContent = text;

        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }

      // Generate bot response based on user input
      function generateBotResponse(userMessage) {
        userMessage = userMessage.toLowerCase();
        let response = '';

        // Check for keywords and generate appropriate response
        if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('hey')) {
          response = "Hello! How can I help you with air quality information today?";
        } else if (userMessage.includes('aqi') || userMessage.includes('air quality')) {
          const aqiValue = document.getElementById('aqi-value').textContent;
          const aqiStatus = document.getElementById('aqi-badge').textContent;
          response = `Current Air Quality Index is ${aqiValue}, which is considered ${aqiStatus}. `;

          if (aqiStatus === 'Good') {
            response += "The air quality is satisfactory. Enjoy your outdoor activities!";
          } else if (aqiStatus === 'Moderate') {
            response += "Air quality is acceptable. Unusually sensitive people should consider reducing prolonged outdoor exertion.";
          } else if (aqiStatus === 'Unhealthy for Sensitive Groups') {
            response += "Members of sensitive groups may experience health effects. The general public is less likely to be affected.";
          } else if (aqiStatus === 'Unhealthy') {
            response += "Everyone may begin to experience health effects. Consider reducing outdoor activities.";
          } else if (aqiStatus === 'Very Unhealthy') {
            response += "Health alert: everyone may experience more serious health effects. Avoid outdoor activities.";
          } else {
            response += "Health warning of emergency conditions. The entire population is more likely to be affected. Stay indoors with air purifiers.";
          }
        } else if (userMessage.includes('co2') || userMessage.includes('carbon')) {
          const co2Value = document.getElementById('co2-value').textContent;
          response = `Current carbon dioxide levels are ${co2Value}. `;

          const co2Num = parseFloat(co2Value);
          if (co2Num < 800) {
            response += "These levels are normal and ventilation is adequate.";
          } else if (co2Num < 1200) {
            response += "Levels are slightly elevated. Consider increasing ventilation.";
          } else if (co2Num < 2000) {
            response += "Levels are high. Improve ventilation by opening windows or using air purifiers.";
          } else {
            response += "Levels are very high. Ventilation is poor. Take immediate steps to improve air circulation.";
          }
        } else if (userMessage.includes('recommendation') || userMessage.includes('advice')) {
          response = "Based on current air quality conditions, I recommend: ";

          const aqiStatus = document.getElementById('aqi-badge').textContent;
          if (aqiStatus === 'Good' || aqiStatus === 'Moderate') {
            response += "It's a good time for outdoor activities. Enjoy the fresh air!";
          } else if (aqiStatus === 'Unhealthy for Sensitive Groups') {
            response += "Sensitive individuals should reduce prolonged outdoor exertion.";
          } else if (aqiStatus === 'Unhealthy') {
            response += "Everyone should reduce outdoor activities. Sensitive groups should avoid outdoor exertion.";
          } else {
            response += "Avoid all outdoor activities. Keep windows closed and use air purifiers indoors.";
          }
        } else if (userMessage.includes('thank') || userMessage.includes('thanks')) {
          response = "You're welcome! Feel free to ask if you have more questions about air quality.";
        } else {
          response = "I'm here to help with air quality information. You can ask me about AQI, CO₂ levels, or health recommendations based on current conditions.";
        }

        addMessage(response, 'bot');
      }
    }

    // Location switch functionality
    function setupLocationSwitch() {
      const switchButton = document.getElementById('switch-check');
      const locationSelect = document.getElementById('location-select');

      switchButton.addEventListener('click', function() {
        const selectedValue = locationSelect.value;
        
        if (selectedValue === 'city-wise-pollutants') {
          // Navigate to City AQI section
          const cityAqiSection = document.getElementById('city-aqi-section');
          if (cityAqiSection) {
            window.scrollTo({
              top: cityAqiSection.offsetTop - 20,
              behavior: 'smooth'
            });
            
            // Update navigation to show active state
            document.querySelectorAll('.nav-link').forEach(link => {
              link.classList.remove('active');
            });
            document.querySelector('a[href="#dashboard-view"]').classList.add('active');
          }
        } else if (selectedValue === 'environment') {
          // Navigate to Dashboard
          const dashboardView = document.getElementById('dashboard-view');
          if (dashboardView) {
            window.scrollTo({
              top: dashboardView.offsetTop - 20,
              behavior: 'smooth'
            });
            
            // Update navigation to show active state
            document.querySelectorAll('.nav-link').forEach(link => {
              link.classList.remove('active');
            });
            document.querySelector('a[href="#dashboard-view"]').classList.add('active');
          }
        }
        
        // On mobile, close the sidebar after selection
        if (window.innerWidth <= 992) {
          document.getElementById('sidebar').classList.remove('active');
          document.getElementById('sidebar-overlay').classList.remove('active');
        }
      });
    }

    // Initialize the application
    function initApp() {
      setupNavigation();
      setupMobileMenu();
      setupHistoricalData();
      setupChatbot();
      setupLocationSwitch();

      // Start with device disconnected state
      deviceConnected = false;
      showDeviceDisconnected();

      // Start Firebase data listening (it will update connection status when data arrives)
      startDataListening();

      // Start automatic device connection checking
      connectionCheckInterval = setInterval(checkDeviceConnection, 2000); // Check every 2 seconds

      // Load default city on start
      (async function () {
        const data = await getCityData("Delhi");
        updateCityAQI(data);
      })();
    }

    // Run initialization when DOM is loaded
    document.addEventListener('DOMContentLoaded', initApp);

    // City AQI functionality
    document.getElementById("check-btn").onclick = async () => {
      const city = document.getElementById("city-input").value.trim() || document.getElementById("city-select").value;
      const data = await getCityData(city);
      updateCityAQI(data);
    };