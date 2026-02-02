// 1. إعداد المكتبة
const firebaseConfig = {
    databaseURL: "https://congratulations-demo-default-rtdb.firebaseio.com/"
};

// تهيئة Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const notesRef = db.ref('trio_coders_notes');

const noteForm = document.getElementById("noteForm");
const modal = document.getElementById("deleteModal");
let rowToDelete = null;

// Config Object for status
const STATUS_STYLES = {
    Pending: {
        color: "#ffc107",
        bg: "rgba(255, 193, 7, 0.15)"
    },
    "In Progress": {
        color: "#2196f3",
        bg: "rgba(33, 150, 243, 0.15)"
    },
    Completed: {
        color: "#4caf50",
        bg: "rgba(76, 175, 80, 0.15)"
    },
};

// --- وظيفة عرض التنبيهات ---
function showToast(message, type = "error") {
    const oldToast = document.querySelector(".toast");
    if (oldToast) oldToast.remove();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("hide"), 3000);
    setTimeout(() => toast.remove(), 3500);
}

// --- بناء صف الجدول ---
function createRow(id, note) {
    const row = document.createElement("tr");
    row.setAttribute("data-id", id);
    const style = STATUS_STYLES[note.progress] || STATUS_STYLES.Pending;

    row.style.backgroundColor = style.bg;
    row.style.setProperty("--row-color", style.color);

    row.innerHTML = `
        <td>${note.Name}</td>
        <td>${note.Title}</td>
        <td>${note.Description}</td>
        <td>${note.DateTime}</td>
        <td>
            <select class="status-select">
                <option value="Pending" ${note.progress === "Pending" ? "selected" : ""}>Pending</option>
                <option value="In Progress" ${note.progress === "In Progress" ? "selected" : ""}>In Progress</option>
                <option value="Completed" ${note.progress === "Completed" ? "selected" : ""}>Completed</option>
            </select>
        </td>
        <td>
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
        </td>`;

    // تحديث الحالة عند التغيير
    row.querySelector(".status-select").addEventListener("change", (e) => {
        notesRef.child(id).update({
            progress: e.target.value
        });
    });

    return row;
}

// --- إضافة نوتة جديدة (التعديل المطلوب هنا) ---
noteForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // جلب العناصر
    const nameInput = document.getElementById("yourName");
    const titleInput = document.getElementById("noteIdea");
    const descInput = document.getElementById("noteDesc");
    const fieldInput = document.getElementById("noteField");

    // التحقق من الأسماء المسموحة
    const allowedNames = ["Omar", "Ahmed", "Mohamed"];
    const nameValueRaw = nameInput.value.trim();
    const nameValue = nameValueRaw.charAt(0).toUpperCase() + nameValueRaw.slice(1).toLowerCase();

    if (!allowedNames.includes(nameValue)) {
        nameInput.classList.add("input-error");
        showToast("Enter Valid Name !!! (Trio Coders Only)");
        return;
    }

    if (!titleInput.value.trim()) {
        titleInput.classList.add("input-error");
        return;
    }

    // تجهيز البيانات
    const noteData = {
        Name: nameValue,
        Title: titleInput.value.trim(),
        Description: descInput.value.trim(),
        Field: fieldInput.value,
        DateTime: new Date().toLocaleString("en-GB", {
            hour: "numeric",
            minute: "numeric",
            day: "numeric",
            month: "short",
            year: "numeric",
        }),
        progress: "Pending",
    };

    // الإرسال لـ Firebase
    notesRef.push(noteData)
        .then(() => {
            noteForm.reset();
            showToast("Note Added Successfully !", "success");
        })
        .catch(() => {
            showToast("Connection Failed! Please try again ):");
        });
});

// --- استلام البيانات Real-time ---
notesRef.on('value', (snapshot) => {
    document.querySelectorAll("tbody").forEach(tb => tb.innerHTML = "");
    const data = snapshot.val();
    if (data) {
        Object.keys(data).forEach(id => {
            const note = data[id];
            const tbody = document.getElementById(`table-body-${note.Field}`);
            if (tbody) tbody.appendChild(createRow(id, note));
        });
    }
    updateStats();
});

// --- حذف نوتة ---
document.getElementById("confirmBtn").onclick = () => {
    if (rowToDelete) {
        const id = rowToDelete.getAttribute("data-id");
        notesRef.child(id).remove().then(() => {
            modal.style.display = "none";
        });
    }
};

// --- تحديث الإحصائيات ---
function updateStats() {
    const allRows = document.querySelectorAll("tbody tr");
    document.getElementById("total-tasks").innerText = allRows.length;
    let pending = 0,
        completed = 0;

    allRows.forEach(row => {
        const status = row.querySelector(".status-select").value;
        if (status === "Pending") pending++;
        if (status === "Completed") completed++;
    });

    document.getElementById("pending-tasks").innerText = pending;
    document.getElementById("completed-tasks").innerText = completed;
}

// أحداث الجدول (Edit & Delete)
document.querySelectorAll("tbody").forEach(tbody => {
    tbody.addEventListener("click", (e) => {
        const tr = e.target.closest("tr");
        if (!tr) return;

        if (e.target.classList.contains("delete-btn")) {
            rowToDelete = tr;
            modal.style.display = "flex";
        } else if (e.target.classList.contains("edit-btn")) {
            document.getElementById("yourName").value = tr.cells[0].innerText;
            document.getElementById("noteIdea").value = tr.cells[1].innerText;
            document.getElementById("noteDesc").value = tr.cells[2].innerText;
            document.getElementById("noteField").value = tr.parentElement.dataset.field;

            // حذف القديم لعمل تحديث عند الضغط على Add
            notesRef.child(tr.getAttribute("data-id")).remove();
        }
    });
});

document.getElementById("cancelBtn").onclick = () => {
    modal.style.display = "none";
};

// تنظيف أخطاء المدخلات عند الكتابة
document.querySelectorAll('input, textarea').forEach(el => {
    el.oninput = () => el.classList.remove("input-error");
});