// ==========================================
// 1. الإعدادات والاتصال (Firebase Config)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyD8jYM4b6N4VDq3e8giNKOEBsCoMq3Zmek",
    authDomain: "trio-notes.firebaseapp.com",
    databaseURL: "https://trio-notes-default-rtdb.firebaseio.com",
    projectId: "trio-notes",
    storageBucket: "trio-notes.firebasestorage.app",
    messagingSenderId: "1028595226215",
    appId: "1:1028595226215:web:56444b1c530bfd403366c2",
    measurementId: "G-LD61LSWR3W"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const auth = firebase.auth();
const notesRef = db.ref('trio_coders_notes');
let isInitialLoad = true;

// ==========================================
// 2. إدارة الأمان والدخول (Auth)
// ==========================================

auth.onAuthStateChanged((user) => {
    const loginSection = document.getElementById("loginSection");
    const mainDashboard = document.getElementById("mainDashboard");

    if (user) {
        if (loginSection) loginSection.style.display = "none";
        if (mainDashboard) mainDashboard.style.display = "block";
        startRealtimeUpdates();
        requestNotificationPermission();
    } else {
        if (loginSection) loginSection.style.display = "block";
        if (mainDashboard) mainDashboard.style.display = "none";
    }
});

window.handleLogin = () => {
    const loginBtn = document.querySelector("#loginSection button");
    const email = document.getElementById("emailInput").value.trim();
    const pass = document.getElementById("passInput").value.trim();

    // 1. تفعيل حالة التحميل
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner"></span> Loading...';
    loginBtn.style.opacity = "0.7";
    loginBtn.style.cursor = "not-allowed";

    auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
            showToast("Welcome Back! ✅", "success");
            // هنا مش محتاجين نرجع الزرار لأصله لأن الصفحة هتختفي أصلاً
        })
        .catch(err => {
            showToast("Login Failed: " + err.message, "error");

            // 2. إعادة الزرار لأصله في حالة الخطأ عشان يحاول تاني
            loginBtn.disabled = false;
            loginBtn.innerHTML = "Login";
            loginBtn.style.opacity = "1";
            loginBtn.style.cursor = "pointer";
        });
};

window.handleLogout = () => {
    auth.signOut().then(() => showToast("Logged Out", "success"));
};

// ==========================================
// 3. نظام الإشعارات (Notifications)
// ==========================================

function requestNotificationPermission() {
    if ("Notification" in window) {
        Notification.requestPermission();
    }
}

// مراقب الإضافات الجديدة
notesRef.limitToLast(1).on('child_added', (snapshot) => {
    if (isInitialLoad) return;

    const note = snapshot.val();
    const currentUser = auth.currentUser;

    // إرسال إشعار فقط لو اللي ضاف النوتة شخص آخر
    if (currentUser && note.createdBy !== currentUser.email) {
        // 1. إشعار داخل الموقع (Toast)
        showToast(`🔔 ${note.Name} added: ${note.Title}`, "success");

        // 2. صوت تنبيه
        new Audio('https://www.soundjay.com/buttons/sounds/button-3.mp3').play().catch(() => {});

        // 3. إشعار المتصفح (Desktop Notification)
        if (Notification.permission === "granted") {
            new Notification("Trio Notes Update", {
                body: `${note.Name} added a new note in ${note.Field}`,
                icon: "https://cdn-icons-png.flaticon.com/512/1048/1048953.png"
            });
        }
    }
});

// ==========================================
// 4. العمليات الأساسية (CRUD)
// ==========================================

function startRealtimeUpdates() {
    notesRef.on('value', (snapshot) => {
        document.querySelectorAll("tbody").forEach(tb => tb.innerHTML = "");
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(id => {
                const note = data[id];
                renderRow(id, note);
            });
        }
        updateStats();
        isInitialLoad = false; // تفعيل الإشعارات بعد أول تحميل للداتا
    });
}

function renderRow(id, note) {
    const tbody = document.getElementById(`table-body-${note.Field}`);
    if (!tbody) return;

    const row = document.createElement("tr");
    const colors = {
        "Pending": "#ffc107",
        "In Progress": "#2196f3",
        "Completed": "#4caf50"
    };
    row.style.setProperty("--row-color", colors[note.progress] || "#ffc107");

    row.innerHTML = `
        <td>${note.Name}</td>
        <td>${note.Title}</td>
        <td class="desc-cell" title="${note.Description}">${note.Description}</td>
        <td>${note.DateTime}</td>
        <td>
            <select class="status-select" onchange="updateStatus('${id}', this.value)">
                <option value="Pending" ${note.progress === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="In Progress" ${note.progress === 'In Progress' ? 'selected' : ''}>In Progress</option>
                <option value="Completed" ${note.progress === 'Completed' ? 'selected' : ''}>Completed</option>
            </select>
        </td>
        <td>
            <button class="edit-btn" onclick="openEdit('${id}', '${note.Name}', '${note.Title}', '${note.Description}', '${note.Field}')">Edit</button>
            <button class="delete-btn" onclick="openDelete('${id}')">Delete</button>
        </td>
    `;
    tbody.appendChild(row);
}

document.getElementById("noteForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const nameInput = document.getElementById("yourName");
    const nameValue = nameInput.value.trim();
    const formattedName = nameValue.charAt(0).toUpperCase() + nameValue.slice(1).toLowerCase();
    const allowedNames = ["Omar", "Ahmed", "Mohamed"];

    if (!allowedNames.includes(formattedName)) {
        nameInput.classList.add("input-error");
        showToast("Access Denied for this name!", "error");
        return;
    }

    const noteData = {
        Name: formattedName,
        Title: document.getElementById("noteIdea").value.trim(),
        Description: document.getElementById("noteDesc").value.trim(),
        Field: document.getElementById("noteField").value,
        DateTime: new Date().toLocaleString("en-GB"),
        progress: "Pending",
        createdBy: auth.currentUser.email
    };

    notesRef.push(noteData).then(() => {
        this.reset();
        showToast("Note Shared! ✅", "success");
        nameInput.classList.remove("input-error");
    });
});

window.updateStatus = (id, val) => notesRef.child(id).update({
    progress: val
});

window.openDelete = (id) => {
    if (confirm("Are you sure?")) {
        notesRef.child(id).remove().then(() => showToast("Deleted", "success"));
    }
};

window.openEdit = (id, name, title, desc, field) => {
    document.getElementById("yourName").value = name;
    document.getElementById("noteIdea").value = title;
    document.getElementById("noteDesc").value = desc;
    document.getElementById("noteField").value = field;
    notesRef.child(id).remove();
    showToast("Editing mode active", "success");
};

// ==========================================
// 5. المساعدات (UI Helpers)
// ==========================================

function showToast(message, type = "error") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("hide"), 3000);
    setTimeout(() => toast.remove(), 3500);
}

function updateStats() {
    const allRows = document.querySelectorAll("tbody tr");
    if (document.getElementById("total-tasks")) document.getElementById("total-tasks").innerText = allRows.length;

    let pending = 0,
        completed = 0;
    allRows.forEach(row => {
        const status = row.querySelector(".status-select")?.value;
        if (status === "Pending") pending++;
        if (status === "Completed") completed++;
    });

    if (document.getElementById("pending-tasks")) document.getElementById("pending-tasks").innerText = pending;
    if (document.getElementById("completed-tasks")) document.getElementById("completed-tasks").innerText = completed;
}