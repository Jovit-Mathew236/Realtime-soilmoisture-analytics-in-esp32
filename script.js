import { initializeApp } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  onValue,
} from "https://www.gstatic.com/firebasejs/9.12.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDm_4T2Ipv4CJio1sx1-iXlKbmgr-QqB4I",
  authDomain: "iot-soil-moisture-a01d1.firebaseapp.com",
  databaseURL:
    "https://iot-soil-moisture-a01d1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iot-soil-moisture-a01d1",
  storageBucket: "iot-soil-moisture-a01d1.appspot.com",
  messagingSenderId: "352439726328",
  appId: "1:352439726328:web:9dc4426c2e894b95aa0b0d",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Function to fetch data from Firebase and update the chart
function fetchDataAndUpdateChart() {
  const dbRef = ref(database, "data");

  get(dbRef)
    .then((snapshot) => {
      if (snapshot.exists()) {
        const firebaseData = snapshot.val();
        const formattedData = Object.entries(firebaseData).map(
          ([key, value]) => ({
            date: new Date(parseInt(key)),
            amount: value,
          })
        );
        updateBarChart(formattedData);
      } else {
        console.log("No data available");
      }
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
}

// Fetch data and update chart initially
fetchDataAndUpdateChart();

// Set up listener to update chart in real-time
onValue(ref(database, "data"), (snapshot) => {
  const firebaseData = snapshot.val();
  const formattedData = Object.keys(firebaseData).map((key) => ({
    date: new Date(key),
    amount: firebaseData[key],
  }));
  updateBarChart(formattedData);
});

// Function to update humidity and times watered values in the HTML
function updateValues(humidity, timesWatered) {
  document.getElementById("humidityValue").innerText = `Humidity: ${humidity}`;
  document.getElementById(
    "timesWateredValue"
  ).innerText = `Times Watered: ${timesWatered}`;
}

// Set up listener to update values in real-time
onValue(ref(database, "/"), (snapshot) => {
  const data = snapshot.val();
  console.log(data);
  const humidity = data.moisturePercentage || 0; // Assuming humidity is stored in the "humidity" field
  const timesWatered = data.ledCount || 0; // Assuming times watered is stored in the "timesWatered" field
  updateValues(humidity, timesWatered);
});

// Function to update the bar chart
function updateBarChart(data) {
  var ctx = document.getElementById("barChart").getContext("2d");
  var barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((entry) => entry.date),
      datasets: [
        {
          label: "Water Consumption",
          data: data.map((entry) => entry.amount),
          backgroundColor: "rgba(54, 162, 235, 0.5)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
            },
          },
        ],
      },
    },
  });
}
