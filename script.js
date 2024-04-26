import { initializeApp } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/9.12.1/firebase-firestore.js";
import {
  getDatabase,
  ref,
  get,
  onValue,
} from "https://www.gstatic.com/firebasejs/9.12.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-auth.js";

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
const firestore = getFirestore(app);
const database = getDatabase(app);
const auth = getAuth(app);
// Function to save data to Firestore
async function saveDataToFirestore(timestamp, watered) {
  try {
    const formattedTimestamp = Timestamp.fromMillis(timestamp);
    await addDoc(collection(firestore, "watering_events"), {
      timestamp: formattedTimestamp,
      watered: watered,
    });
    console.log("Data saved to Firestore");
  } catch (error) {
    console.error("Error saving data to Firestore:", error);
  }
}

// Function to fetch data from Firebase and update the chart
function fetchDataAndUpdateChart() {
  const dbRef = ref(database, "watering_events");

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
function updateValues(humidity, amount) {
  document.getElementById("humidityValue").innerText = `Humidity: ${humidity}`;
  document.getElementById(
    "timesWateredValue"
  ).innerText = `Times Watered: ${amount}`;
}

// Set up listener to update values in real-time
onValue(ref(database, "/"), (snapshot) => {
  const data = snapshot.val();
  console.log(data);
  const humidity = data.moisturePercentage || 0; // Assuming humidity is stored in the "humidity" field
  const timesWatered = data.ledCount || 0; // Assuming times watered is stored in the "timesWatered" field
  updateValues(humidity, timesWatered);

  // Call saveDataToFirestore to save the ledCount to Firestore
  saveDataToFirestore(Date.now(), timesWatered);
});

// Function to update the bar chart
function updateBarChart(data) {
  console.log(data);
  var ctx = document.getElementById("barChart").getContext("2d");
  var barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((entry) => entry.date), // Format date as per requirement (e.g., entry.date.getMonth() + 1 + '-' + entry.date.getFullYear()
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

// Real-time listener for changes in Firestore collection
onSnapshot(collection(firestore, "watering_events"), (snapshot) => {
  const data = snapshot.docs.map((doc) => doc.data());
  // Process data to get the number of times watered in each month
  const monthlyCounts = data.reduce((acc, curr) => {
    const date = curr.timestamp.toDate();
    const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;
    acc[monthYear] = (acc[monthYear] || 0) + 1;
    return acc;
  }, {});
  // Get the total amount of watering events
  const totalAmount = Object.entries(monthlyCounts).reduce(
    (acc, [_, amount]) => acc + amount,
    0
  );
  // Update chart with monthly watering counts
  console.log(totalAmount);
  updateBarChart(
    Object.entries(monthlyCounts).map(([date, amount]) => ({
      date: new Date(date),
      amount,
    }))
  );
  // Update the times watered value with the total amount
  updateValues("Current Humidity Value", totalAmount);
});
const logoutbtn = document.getElementById("logoutButton");
console.log(logoutbtn);
logoutbtn.onclick = function () {
  console.log("logout");
  localStorage.removeItem("name");
  auth.signOut();
  window.location.href = "./";
};
