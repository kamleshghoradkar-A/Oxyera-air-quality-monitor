# OxyEra 🌿 — Air Quality Monitoring Dashboard

OxyEra is a responsive web-based air quality monitoring dashboard built with HTML, CSS, and JavaScript. It combines environmental sensor data from Firebase Realtime Database with city-wise air-quality data from external APIs.

The dashboard provides AQI monitoring, pollutant readings, charts, health guidance, alerts, historical-data visualization, device connection status, and a rule-based air-quality assistant.

## ✨ Features

- 🌫️ Real-time AQI monitoring from Firebase sensor data
- 📡 Environment-device connection status
- 🧪 CO₂, NH₃, and NO₂ monitoring
- 📍 City-wise AQI lookup
- 🌍 City pollutant information including PM2.5, PM10, NO₂, and O₃
- 📊 AQI trend and pollutant-distribution charts
- 📈 Analytics dashboard with multiple Chart.js visualizations
- 📅 Historical-data visualization
- 🔔 Air-quality alerts interface
- 💡 AQI and CO₂ health recommendations
- 🤖 Rule-based air-quality chatbot
- 🗺️ AQI map-style visualization with a legend
- ⚙️ Settings interface
- 📱 Responsive layout with mobile navigation
- 🔝 Smooth navigation and back-to-top control

## 🛠️ Technologies Used

### Frontend
- HTML5
- CSS3
- JavaScript
- Tailwind CSS
- Font Awesome

### Data & Visualization
- Firebase Realtime Database
- Chart.js

### External APIs
- WAQI (World Air Quality Index)
- OpenAQ

### IoT / Hardware Integration
The dashboard is designed to receive environmental readings through Firebase from a connected monitoring device. The dashboard code uses an `Environment` Firebase database reference.

## 📊 Dashboard Modules

### 1. Dashboard
Displays current:

- AQI
- CO₂
- NH₃
- NO₂
- AQI category
- Trend indicators
- Health recommendations

The dashboard updates when new Firebase environment data is received.

### 2. City AQI Monitoring
Users can select or type a city and request air-quality information.

The implementation combines data from WAQI and OpenAQ when available.

The interface displays:

- AQI
- PM2.5
- PM10
- NO₂
- O₃
- Last updated time

### 3. Analytics
The project includes Chart.js visualizations for:

- Average AQI by week
- CO₂ trend
- Air-quality distribution
- Pollutant radar analysis

### 4. Historical Data
Users can select a period and metric such as AQI, CO₂, NH₃, or NO₂.

**Note:** In the current version, the historical chart generates sample values using JavaScript's random-number generation rather than loading a historical dataset from Firebase.

### 5. Alerts
The dashboard contains an alerts interface for examples such as:

- High AQI
- Elevated CO₂
- Improved air quality
- Weekly report availability

### 6. Air Quality Assistant
OxyEra includes a rule-based chatbot. It responds to keywords and uses the current dashboard values to answer questions about AQI, CO₂, and recommendations.

It does not currently use an external AI/LLM service.

### 7. Device Connection Monitoring
The application listens to Firebase environment data and tracks whether recent data has been received.

The current implementation uses a 10-second timeout to determine whether the device should be considered disconnected.

## 📁 Project Structure

```text
OxyEra/
│
├── index.html
├── README.md
└── assets/
```

> The exact structure may vary depending on the files included in the final repository.

## 🚀 How to Run

### Option 1 — VS Code Live Server

1. Clone or download the repository.
2. Open the project in VS Code.
3. Install the **Live Server** extension if required.
4. Open `index.html` using Live Server.
5. Make sure the required Firebase/API configuration is available.

### Option 2 — Browser

For the static UI portions, `index.html` can be opened directly in a browser. Features that depend on Firebase or external APIs require their corresponding configuration and network access.

## 🔐 Configuration & Security

The original development code contains Firebase configuration and a WAQI API token.

**Do not publish private API tokens in a public GitHub repository.**

Before pushing this project to GitHub:

1. Remove the exposed WAQI token from the source code.
2. Replace it with a placeholder or load it through a safer configuration method.
3. Review Firebase Realtime Database security rules.
4. Avoid committing passwords, private keys, or other secrets.

Example:

```javascript
const WAQI_TOKEN = "YOUR_WAQI_TOKEN";
```

Firebase web configuration values can be used client-side depending on the Firebase setup, but access should still be controlled through proper Firebase Security Rules.

## 🔮 Future Improvements

- Store and retrieve real historical sensor data from Firebase
- Replace the static map-style view with an interactive map service
- Add authentication and user accounts
- Add more environmental sensors
- Add real-time push notifications
- Improve city search and location services
- Add advanced air-quality forecasting
- Separate HTML, CSS, and JavaScript into dedicated files
- Move API configuration into environment-specific configuration
- Add automated testing

## 📄 License

This project can be released under the MIT License if you choose to use that license.
