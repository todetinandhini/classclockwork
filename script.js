// =====================================
// CLASSCLOCKWORK - JAVASCRIPT
// =====================================

let subjects = [];
let faculty = [];
let rooms = [];
let timetable = [];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const periods = 6;

// =====================================
// ADD SUBJECT
// =====================================

document.getElementById("subjectForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const subject = {
        id: Date.now(),
        name: document.getElementById("subjectName").value.trim(),
        teacher: document.getElementById("subjectFaculty").value.trim(),
        batch: document.getElementById("subjectBatch").value.trim(),
        hours: Number(document.getElementById("subjectHours").value)
    };

    subjects.push(subject);
    this.reset();

    updateLists();
    updateDashboard();
});

// =====================================
// ADD FACULTY
// =====================================

document.getElementById("facultyForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const teacher = {
        id: Date.now(),
        name: document.getElementById("facultyName").value.trim(),
        limit: Number(document.getElementById("facultyLimit").value)
    };

    if (faculty.some(f => f.name.toLowerCase() === teacher.name.toLowerCase())) {
        alert("This faculty member already exists!");
        return;
    }

    faculty.push(teacher);
    this.reset();

    updateLists();
    updateDashboard();
});

// =====================================
// ADD CLASSROOM
// =====================================

document.getElementById("roomForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const room = {
        id: Date.now(),
        name: document.getElementById("roomName").value.trim(),
        capacity: Number(document.getElementById("roomCapacity").value),
        type: document.getElementById("roomType").value
    };

    rooms.push(room);
    this.reset();

    updateLists();
    updateDashboard();
});

// =====================================
// DISPLAY RESOURCES
// =====================================

function updateLists() {

    document.getElementById("subjectList").innerHTML =
        subjects.map(s => `
            <div class="resource-item">
                <span>${escapeHTML(s.name)} - ${escapeHTML(s.batch)}
                (${s.hours} periods)</span>
                <button class="delete-btn" onclick="deleteItem('subject', ${s.id})">Delete</button>
            </div>
        `).join("");

    document.getElementById("facultyList").innerHTML =
        faculty.map(f => `
            <div class="resource-item">
                <span>${escapeHTML(f.name)} - Limit: ${f.limit}</span>
                <button class="delete-btn" onclick="deleteItem('faculty', ${f.id})">Delete</button>
            </div>
        `).join("");

    document.getElementById("roomList").innerHTML =
        rooms.map(r => `
            <div class="resource-item">
                <span>${escapeHTML(r.name)} (${r.type}, ${r.capacity} seats)</span>
                <button class="delete-btn" onclick="deleteItem('room', ${r.id})">Delete</button>
            </div>
        `).join("");
}

// Prevent resource names from being interpreted as HTML.
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// =====================================
// DELETE RESOURCES
// =====================================

function deleteItem(type, id) {

    if (!confirm("Are you sure you want to delete this item?")) return;

    if (type === "subject") {
        subjects = subjects.filter(s => s.id !== id);
    }

    if (type === "faculty") {
        const teacher = faculty.find(f => f.id === id);

        if (timetable.some(t => t.teacher === teacher.name)) {
            alert("Generate the timetable again after deleting faculty.");
        }

        faculty = faculty.filter(f => f.id !== id);
    }

    if (type === "room") {
        rooms = rooms.filter(r => r.id !== id);
    }

    timetable = [];
    updateLists();
    updateDashboard();
    clearTimetable();
}

// =====================================
// UPDATE DASHBOARD
// =====================================

function updateDashboard() {

    document.getElementById("subjectCount").textContent = subjects.length;
    document.getElementById("facultyCount").textContent = faculty.length;
    document.getElementById("roomCount").textContent = rooms.length;

    document.getElementById("clashCount").textContent = "0";
}

// =====================================
// GENERATE TIMETABLE
// BACKTRACKING CSP ALGORITHM
// =====================================

document.getElementById("generateBtn").addEventListener("click", generateTimetable);

function generateTimetable() {

    if (subjects.length === 0 || faculty.length === 0 || rooms.length === 0) {
        alert("Please add subjects, faculty and classrooms first!");
        return;
    }

    // Validate resource information.
    for (const s of subjects) {
        const teacher = faculty.find(f =>
            f.name.toLowerCase() === s.teacher.toLowerCase()
        );

        if (!teacher) {
            alert("Faculty not found for subject: " + s.name);
            return;
        }
    }

    // Check faculty workload.
    for (const f of faculty) {
        const workload = subjects
            .filter(s => s.teacher.toLowerCase() === f.name.toLowerCase())
            .reduce((total, s) => total + s.hours, 0);

        if (workload > f.limit) {
            alert(f.name + " exceeds the weekly workload limit!");
            return;
        }
    }

    // Create individual class sessions.
    let tasks = [];

    subjects.forEach(subject => {
        for (let i = 0; i < subject.hours; i++) {
            tasks.push({
                ...subject,
                session: i + 1
            });
        }
    });

    // MRV-style ordering: schedule subjects with fewer
    // eligible rooms first.
    tasks.sort((a, b) => {
        const aRooms = rooms.filter(r => r.type === "Classroom").length;
        const bRooms = rooms.filter(r => r.type === "Classroom").length;
        return aRooms - bRooms || a.name.localeCompare(b.name);
    });

    // All 30 available time slots.
    let slots = [];

    for (let d = 0; d < 5; d++) {
        for (let p = 0; p < periods; p++) {
            slots.push({ day: d, period: p });
        }
    }

    let result = [];
    let attempts = 0;
    const MAX_ATTEMPTS = 150000;

    // Check whether a class can occupy a particular slot.
    function isValid(task, slot, room) {

        return !result.some(item => {

            if (item.day !== slot.day || item.period !== slot.period) {
                return false;
            }

            const facultyClash =
                item.teacher.toLowerCase() === task.teacher.toLowerCase();

            const roomClash = item.room === room.name;

            const batchClash =
                item.batch.toLowerCase() === task.batch.toLowerCase();

            return facultyClash || roomClash || batchClash;
        });
    }

    // Recursive backtracking solver.
    function solve(index) {

        if (index === tasks.length) {
            return true;
        }

        if (++attempts > MAX_ATTEMPTS) {
            return false;
        }

        const task = tasks[index];

        // Try each available time and classroom.
        for (const slot of slots) {

            for (const room of rooms) {

                if (room.type !== "Classroom") continue;

                if (!isValid(task, slot, room)) continue;

                result.push({
                    ...task,
                    day: slot.day,
                    period: slot.period,
                    room: room.name
                });

                if (solve(index + 1)) {
                    return true;
                }

                result.pop();
            }
        }

        return false;
    }

    const success = solve(0);

    if (!success) {
        timetable = [];
        clearTimetable();

        document.getElementById("timetableMessage").innerHTML =
            `<p class="error">Unable to create a conflict-free timetable. 
            Please reduce the constraints or add more classrooms.</p>`;

        updateDashboard();
        return;
    }

    timetable = result;

    renderTimetable();
    checkClashes();

    document.getElementById("timetableMessage").innerHTML =
        `<p class="success">✓ Timetable generated successfully!</p>`;
}

// =====================================
// DISPLAY TIMETABLE
// =====================================

function renderTimetable() {

    const tbody = document.getElementById("timetableBody");
    const view = document.getElementById("viewType").value;
    const filter = document.getElementById("viewName").value.trim().toLowerCase();

    let html = "";

    days.forEach((day, dayIndex) => {

        html += `<tr><td><strong>${day}</strong></td>`;

        for (let period = 0; period < periods; period++) {

            // Lunch break after period 4.
            if (period === 3) {
                html += `<td class="lunch">LUNCH BREAK</td>`;
                continue;
            }

            const classes = timetable.filter(t => {

                if (t.day !== dayIndex || t.period !== period) return false;

                if (!filter) return true;

                if (view === "batch") {
                    return t.batch.toLowerCase() === filter;
                }

                return t.teacher.toLowerCase() === filter;
            });

            if (classes.length === 0) {
                html += `<td>Free</td>`;
            } else {

                html += `<td>`;

                classes.forEach(item => {
                    html += `
                        <div class="subject-cell">
                            <strong>${escapeHTML(item.name)}</strong>
                            <small>${view === "batch"
                                ? escapeHTML(item.teacher)
                                : escapeHTML(item.batch)}</small>
                            <small>Room: ${escapeHTML(item.room)}</small>
                        </div>
                    `;
                });

                html += `</td>`;
            }
        }

        html += `</tr>`;
    });

    tbody.innerHTML = html;
}

// =====================================
// BATCH / FACULTY VIEW TOGGLE
// =====================================

document.getElementById("viewType").addEventListener("change", function() {

    document.getElementById("viewName").placeholder =
        this.value === "batch" ? "Enter batch" : "Enter faculty";

    renderTimetable();
});

document.getElementById("viewName").addEventListener("input", renderTimetable);

// =====================================
// CLASH DETECTION
// =====================================

function checkClashes() {

    let clashes = [];

    for (let i = 0; i < timetable.length; i++) {

        for (let j = i + 1; j < timetable.length; j++) {

            const a = timetable[i];
            const b = timetable[j];

            if (a.day === b.day && a.period === b.period) {

                if (a.teacher.toLowerCase() === b.teacher.toLowerCase()) {
                    clashes.push(
                        `Faculty Clash: ${a.teacher} is scheduled for two classes on ${days[a.day]}.`
                    );
                }

                if (a.room === b.room) {
                    clashes.push(
                        `Room Clash: ${a.room} is booked twice on ${days[a.day]}.`
                    );
                }

                if (a.batch.toLowerCase() === b.batch.toLowerCase()) {
                    clashes.push(
                        `Batch Clash: ${a.batch} has two classes at the same time.`
                    );
                }
            }
        }
    }

    const clashList = document.getElementById("clashList");
    const status = document.getElementById("clashStatus");

    document.getElementById("clashCount").textContent = clashes.length;

    if (clashes.length === 0) {

        status.textContent = "✓ No clashes detected";
        status.style.background = "#e5f8ed";
        status.style.color = "#168454";

        clashList.innerHTML =
            "<p class='success'>✓ Your timetable is conflict-free!</p>";

    } else {

        status.textContent = clashes.length + " Clashes Found";
        status.style.background = "#fff0f1";
        status.style.color = "#bd263c";

        clashList.innerHTML = clashes.map(c =>
            `<div class="clash-item">⚠️ ${escapeHTML(c)}</div>`
        ).join("");
    }
}

// =====================================
// CLEAR TIMETABLE
// =====================================

function clearTimetable() {

    document.getElementById("timetableBody").innerHTML =
        `<tr><td colspan="7">Generate your timetable to see the schedule.</td></tr>`;

    document.getElementById("clashList").innerHTML =
        "<p>Generate a timetable to check for conflicts.</p>";

    document.getElementById("clashStatus").textContent =
        "Not generated";
}

// =====================================
// PRINT TIMETABLE
// =====================================

document.getElementById("printBtn").addEventListener("click", function() {

    if (timetable.length === 0) {
        alert("Please generate a timetable before printing!");
        return;
    }

    window.print();
});

// =====================================
// INITIAL SETUP
// =====================================

updateDashboard();
updateLists();