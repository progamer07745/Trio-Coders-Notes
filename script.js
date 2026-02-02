// 1. إعداد المكتبة (استخدمت لك نفس قاعدة بيانات الخطوبة للتجربة)
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

    // تحديث الحالة في السيرفر فوراً عند التغيير
    row.querySelector(".status-select").addEventListener("change", (e) => {
        notesRef.child(id).update({
            progress: e.target.value
        });
    });

    return row;
}

// --- إضافة نوتة جديدة ---
noteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("yourName");
    const titleInput = document.getElementById("noteIdea");
    const descInput = document.getElementById("noteDesc");
    const fieldInput = document.getElementById("noteField");

    const allowedNames = ["Omar", "Ahmed", "Mohamed"];
    const nameValue = nameInput.value.trim();

    if (!nameValue || !titleInput.value) {
        showToast("اكتب اسمك والعنوان يا هندسة!");
        return;
    }

    const noteData = {
        Name: nameValue,
        Title: titleInput.value.trim(),
        Description: descInput.value.trim(),
        Field: fieldInput.value,
        DateTime: new Date().toLocaleString("ar-EG"),
        progress: "Pending",
    };

    // دفع البيانات لـ Firebase
    notesRef.push(noteData).then(() => {
        noteForm.reset();
        showToast("Note Shared with Team!", "success");
    });
});

// --- استلام البيانات Real-time (سحر التيم) ---
notesRef.on('value', (snapshot) => {
    // مسح الجداول الحالية
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
        notesRef.child(id).remove();
        modal.style.display = "none";
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

// فتح وإغلاق المودال
document.querySelectorAll("tbody").forEach(tb => {
    tb.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            rowToDelete = e.target.closest('tr');
            modal.style.display = 'flex';
        }
        if (e.target.classList.contains('edit-btn')) {
            const tr = e.target.closest('tr');
            document.getElementById("yourName").value = tr.cells[0].innerText;
            document.getElementById("noteIdea").value = tr.cells[1].innerText;
            document.getElementById("noteDesc").value = tr.cells[2].innerText;
            // الحذف من Firebase للتعديل (أو يمكنك عمل Update بنفس الـ ID)
            notesRef.child(tr.getAttribute("data-id")).remove();
        }
    });
});

document.getElementById("cancelBtn").onclick = () => {
    modal.style.display = "none";
};