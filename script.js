// 1. التأكد من الاتصال
console.log("Script Active - Firebase Ready!");

const firebaseConfig = {
    databaseURL: "https://trio-notes-default-rtdb.firebaseio.com/"
};

// ... باقي الكود زي ما هو ...
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const notesRef = db.ref('trio_coders_notes');

// 2. دالة التنبيهات (عشان ميعلقش)
function showToast(message, type = "error") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("hide");
    }, 3000);
    setTimeout(() => {
        toast.remove();
    }, 3500);
}

// 3. دالة تحديث الإحصائيات
function updateStats() {
    const allRows = document.querySelectorAll("tbody tr");
    document.getElementById("total-tasks").innerText = allRows.length;
    let pending = 0,
        completed = 0;
    allRows.forEach(row => {
        const select = row.querySelector(".status-select");
        if (select) {
            if (select.value === "Pending") pending++;
            if (select.value === "Completed") completed++;
        }
    });
    document.getElementById("pending-tasks").innerText = pending;
    document.getElementById("completed-tasks").innerText = completed;
}

// 4. المحرك الأساسي للإضافة (Add)
document.getElementById("noteForm").addEventListener("submit", function (e) {
    e.preventDefault();
    console.log("Attempting to add note...");

    const nameInput = document.getElementById("yourName");
    const titleInput = document.getElementById("noteIdea");
    const descInput = document.getElementById("noteDesc");
    const fieldInput = document.getElementById("noteField");

    const nameValue = nameInput.value.trim();
    const formattedName = nameValue.charAt(0).toUpperCase() + nameValue.slice(1).toLowerCase();
    const allowedNames = ["Omar", "Ahmed", "Mohamed"];

    // التأكد من الاسم
    if (!allowedNames.includes(formattedName)) {
        nameInput.classList.add("input-error");
        showToast("Enter Valid Name (Omar, Ahmed, Mohamed)!");
        return;
    }

    // تجهيز الداتا
    const noteData = {
        Name: formattedName,
        Title: titleInput.value.trim(),
        Description: descInput.value.trim(),
        Field: fieldInput.value,
        DateTime: new Date().toLocaleString("en-GB"),
        progress: "Pending"
    };

    // الإرسال للسحاب
    notesRef.push(noteData).then(() => {
        console.log("Success!");
        this.reset();
        showToast("Note Shared with Team! ✅", "success");
        nameInput.classList.remove("input-error");
    }).catch(err => {
        console.error("Firebase Push Error:", err);
        showToast("Connection Error!");
    });
});

// 5. استقبال البيانات وعرضها (Real-time)
notesRef.on('value', (snapshot) => {
    document.querySelectorAll("tbody").forEach(tb => tb.innerHTML = "");
    const data = snapshot.val();

    if (data) {
        Object.keys(data).forEach(id => {
            const note = data[id];
            const tbody = document.getElementById(`table-body-${note.Field}`);
            if (tbody) {
                const row = document.createElement("tr");
                row.setAttribute("data-id", id);

                // الألوان بناءً على الحالة
                const colors = {
                    "Pending": "#ffc107",
                    "In Progress": "#2196f3",
                    "Completed": "#4caf50"
                };
                row.style.setProperty("--row-color", colors[note.progress] || "#ffc107");

                row.innerHTML = `
                    <td>${note.Name}</td>
                    <td>${note.Title}</td>
                    <td>${note.Description}</td>
                    <td>${note.DateTime}</td>
                    <td>
                        <select class="status-select" onchange="updateFirebaseStatus('${id}', this.value)">
                            <option value="Pending" ${note.progress === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="In Progress" ${note.progress === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Completed" ${note.progress === 'Completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </td>
                    <td>
                        <button class="delete-btn" onclick="openDelete('${id}')">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            }
        });
    }
    updateStats();
});

// 6. الحذف والتحديث
window.updateFirebaseStatus = (id, val) => {
    notesRef.child(id).update({
        progress: val
    });
};

window.openDelete = (id) => {
    if (confirm("Are you sure you want to delete?")) {
        notesRef.child(id).remove();
    }
};