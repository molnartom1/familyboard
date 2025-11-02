// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAeoxtOe5Cleasm3KdeSHP9WDR3PkU-N1I",
  authDomain: "mosas-nyilvantartas.firebaseapp.com",
  projectId: "mosas-nyilvantartas",
  storageBucket: "mosas-nyilvantartas.firebasestorage.app",
  messagingSenderId: "38259241645",
  appId: "1:38259241645:web:26070b1d0686def9f00c24"
};

// PIN védelem (csak frontend, v1)
const CORRECT_PIN = "2025";
const loginSection = document.getElementById("login-section");
const mainSection = document.getElementById("main-section");
const pinInput = document.getElementById("pin-input");
const pinBtn = document.getElementById("pin-submit");
const pinError = document.getElementById("pin-error");

pinBtn.onclick = function() {
  if (pinInput.value === CORRECT_PIN) {
    loginSection.style.display = "none";
    mainSection.style.display = "block";
    anonymousSignIn();
  } else {
    pinError.innerText = "Hibás PIN!";
  }
};
document.getElementById("logout-btn").onclick = function() {
  mainSection.style.display = "none";
  loginSection.style.display = "block";
  pinInput.value = "";
};

function askPinForDelete(cb) {
  let pin = prompt("Törléshez add meg a PIN-t:");
  if (pin === CORRECT_PIN) cb();
  else alert("Hibás PIN!");
}

// Firebase init
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Auth
function anonymousSignIn() {
  firebase.auth().signInAnonymously().then(() => {
    loadEvents();
    loadItems();
  }).catch(error => {
    pinError.innerText = "Firebase auth hiba: " + error.message;
  });
}

// Naptár kezelése
const eventForm = document.getElementById("event-form");
const eventList = document.getElementById("event-list");
eventForm.onsubmit = function(e) {
  e.preventDefault();
  const title = document.getElementById("event-title").value;
  const from = document.getElementById("event-from").value;
  const to = document.getElementById("event-to").value;
  if (!title || !from || !to) return;
  db.ref("events").push({ title, from, to, done: false });
  eventForm.reset();
};

function loadEvents() {
  db.ref("events").on("value", snap => {
    eventList.innerHTML = "";
    snap.forEach(child => {
      const { title, from, to, done } = child.val();
      const li = document.createElement("li");
      if (done) li.classList.add("done");
      li.innerHTML = `
        <label>
          <input type="checkbox" ${done ? "checked" : ""}>
          ${title} (${from.slice(5,16)} – ${to.slice(5,16)})
        </label>
        <button class="delete-btn" title="Törlés">🗑️</button>
      `;
      li.querySelector("input").onchange = () => {
        child.ref.update({ done: !done });
      };
      li.querySelector(".delete-btn").onclick = () =>
        askPinForDelete(() =>
          child.ref.remove()
        );
      eventList.appendChild(li);
    });
  });
}

// Bevásárlólista kezelése
const itemForm = document.getElementById("item-form");
const itemList = document.getElementById("item-list");
itemForm.onsubmit = function(e) {
  e.preventDefault();
  const title = document.getElementById("item-title").value;
  if (!title) return;
  db.ref("items").push({ title, done: false });
  itemForm.reset();
};

function loadItems() {
  db.ref("items").on("value", snap => {
    itemList.innerHTML = "";
    snap.forEach(child => {
      const { title, done } = child.val();
      const li = document.createElement("li");
      if (done) li.classList.add("done");
      li.innerHTML = `
        <label>
          <input type="checkbox" ${done ? "checked" : ""}>
          ${title}
        </label>
        <button class="delete-btn" title="Törlés">🗑️</button>
      `;
      li.querySelector("input").onchange = () => {
        child.ref.update({ done: !done });
      };
      li.querySelector(".delete-btn").onclick = () =>
        askPinForDelete(() =>
          child.ref.remove()
        );
      itemList.appendChild(li);
    });
  });
}
