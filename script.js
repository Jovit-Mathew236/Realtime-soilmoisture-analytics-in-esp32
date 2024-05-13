// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/9.12.1/firebase-firestore.js";
import {
  getDatabase,
  ref,
  get,
  onValue,
} from "https://www.gstatic.com/firebasejs/9.12.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-auth.js";

// Firebase configuration
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

// Merge data function
function mergeData(existingData, newData) {
  for (const [month, monthEntry] of Object.entries(newData)) {
    if (existingData[month]) {
      for (const [day, dayEntry] of Object.entries(monthEntry)) {
        const newMoistureAverage =
          (dayEntry.moistureAverage +
            existingData[month][day].moistureAverage) /
          2;
        existingData[month][day] = {
          ...existingData[month][day],
          ...dayEntry,
          moistureAverage: newMoistureAverage,
        };
      }
    } else {
      existingData[month] = { ...monthEntry };
    }
  }
  return existingData;
}

// Fetch data from Firebase and update chart
async function fetchDataAndUpdateChart(selectedYear) {
  try {
    const snapshot = await get(ref(database, `data/${selectedYear}`));
    if (!snapshot.exists()) {
      console.log("No data available");
      return;
    }
    const firebaseData = snapshot.val();

    for (const [month, monthData] of Object.entries(firebaseData)) {
      const dayEntry = {
        day: parseInt(monthData.date.slice(0, 2)),
        month: month,
        year: parseInt(selectedYear),
        watered: monthData.MotorON || 0,
        moistureAverage: monthData.averageMositure || 0,
      };

      const monthEntry = { [parseInt(monthData.date.slice(0, 2))]: dayEntry };

      const docRef = doc(firestore, "watering_data", selectedYear);
      const docSnapshot = await getDoc(docRef);
      const existingData = docSnapshot.exists() ? docSnapshot.data() : {};

      const mergedData = mergeData(existingData, { [month]: monthEntry });
      await setDoc(docRef, mergedData);

      console.log(
        `Document ${selectedYear}/${month} successfully updated in Firestore`
      );
      updateBarChart(Object.values(mergedData[month]));
    }
  } catch (error) {
    console.error("Error fetching or updating data:", error);
  }
}

// Event listener for year input change
const yearInput = document.getElementById("yearInput");
yearInput.addEventListener("change", () => {
  const selectedYear = yearInput.value;
  console.log(selectedYear);
  fetchDataAndUpdateChart(selectedYear);
});

window.onload = function () {
  const selectedYear = now.getFullYear().toString();
  yearInput.value = selectedYear;
  fetchDataAndUpdateChart(selectedYear);
};
// Update values function
function updateValues(humidity, amount) {
  document.getElementById("humidityValue").innerText = `Humidity: ${humidity}`;
  document.getElementById(
    "timesWateredValue"
  ).innerText = `Times Watered: ${amount}`;
}

// Firebase data listener
onValue(ref(database, "/"), (snapshot) => {
  const data = snapshot.val();
  console.log(data);
  fetchDataAndUpdateChart("2024");
  const humidity = data.moisturePercentage || 0;
  const timesWatered = data.MotorON || 0;
  updateValues(humidity, timesWatered);
});

// Chart update function
function updateBarChart(data) {
  if (!data || data.length === 0) {
    console.log("No data available");
    return;
  }
  const labels = data.map((entry) => `${entry.month} ${entry.day}`);
  const moistureValues = data.map((entry) => entry.moistureAverage);
  const amountValues = data.map((entry) => entry.watered);
  var ctx = document.getElementById("barChart").getContext("2d");
  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Average Moisture",
          data: moistureValues,
          backgroundColor: "rgba(54, 162, 235, 0.5)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
        {
          label: "Amount",
          data: amountValues,
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgba(255, 99, 132, 1)",
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

// Logout button click handler
const logoutbtn = document.getElementById("logoutButton");
logoutbtn.onclick = function () {
  console.log("logout");
  localStorage.removeItem("name");
  auth.signOut();
  window.location.href = "./";
};
