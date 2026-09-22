// Fetches real data from our Express API and renders it.

let coursesCache = []
let editingAssignmentId = null
let editingCourseId = null

async function loadCourses() {
  const response = await fetch("/api/courses")
  const courses = await response.json()
  coursesCache = courses

  const grid = document.getElementById("courseGrid")
      const cardsHtml = courses.map(c => `
    <div class="course-card" data-id="${c.id}" style="background: ${c.coverType === 'color' ? c.coverValue : '#1a1a1a'};">
      <div style="position:absolute; top:8px; right:8px; display:flex; gap:2px;">
        <button class="icon-action edit-course-btn" title="Edit">✎</button>
        <button class="icon-action delete-course-btn" title="Delete">×</button>
      </div>
      <p style="font-size: 12.5px; font-weight: 500; margin-top: 60px;">${c.name}</p>
    </div>
  `).join("")

  grid.innerHTML = cardsHtml + `<div class="course-card add-course">+ Add course</div>`

  const courseSelect = document.getElementById("courseInput")
  courseSelect.innerHTML = courses.map(c => `<option value="${c.id}">${c.name}</option>`).join("")
}

async function loadAssignments() {
  const response = await fetch("/api/assignments")
  const assignments = await response.json()

  const list = document.getElementById("assignmentList")

  if (assignments.length === 0) {
    list.innerHTML = `<p style="color:#7a756c; font-size:13px;">No assignments yet — add one to get started.</p>`
    return
  }

    list.innerHTML = assignments.map(a => {
    const deadline = new Date(a.deadline).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    const statusClass = a.status.replace(" ", "-")
    const examBadge = a.type === 'exam' ? `<span class="tag" style="background:#3a1e2e; color:#e090b8;">EXAM</span>` : ""
    return `
      <div class="assignment-item" data-id="${a.id}" data-status="${a.status}">
        <div class="title-row">
          <span class="title">${examBadge} ${a.title}</span>
          <div style="display:flex; align-items:center; gap:6px;">
  <span class="tag tag-${a.priority}">${a.priority} priority</span>
  <button class="icon-action edit-btn" title="Edit">✎</button>
  <button class="icon-action delete-btn" title="Delete">×</button>
</div>
        </div>
                <div class="meta-row">
          <span>${a.course.name} · ${a.type === 'exam' ? 'On' : 'Due'} ${deadline}${a.type === 'exam' && a.examTime ? ' · ' + a.examTime : ''}${a.type === 'exam' && a.examVenue ? ' · ' + a.examVenue : ''}</span>
          <span class="tag tag-${statusClass} status-tag">${a.status}</span>
        </div>
      </div>
    `
  }).join("")
}

const statusOrder = ["not started", "in progress", "completed"]

document.getElementById("assignmentList").addEventListener("click", async (e) => {
  const item = e.target.closest(".assignment-item")
  if (!item) return
  const id = item.dataset.id

  if (e.target.classList.contains("status-tag")) {
    const currentStatus = item.dataset.status
    const nextStatus = statusOrder[(statusOrder.indexOf(currentStatus) + 1) % statusOrder.length]
    await fetch(`/api/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    })
    loadAssignments()
    return
  }

  if (e.target.classList.contains("delete-btn")) {
    const confirmed = confirm("Delete this assignment? This can't be undone.")
    if (!confirmed) return
    await fetch(`/api/assignments/${id}`, { method: "DELETE" })
    loadAssignments()
    return
  }

    if (e.target.classList.contains("edit-btn")) {
    const response = await fetch("/api/assignments")
    const assignments = await response.json()
    const assignment = assignments.find(a => a.id === parseInt(id))

    editingAssignmentId = assignment.id
    itemType = assignment.type
    document.getElementById("modalTitle").textContent = assignment.type === "exam" ? "Edit Exam" : "Edit Assignment"
    document.getElementById("deadlineLabel").textContent = assignment.type === "exam" ? "Exam date" : "Deadline"
    document.getElementById("examFieldsWrapper").style.display = assignment.type === "exam" ? "block" : "none"
    document.getElementById("titleInput").value = assignment.title
    document.getElementById("courseInput").value = assignment.courseId
    document.getElementById("priorityInput").value = assignment.priority
    document.getElementById("deadlineInput").value = new Date(assignment.deadline).toISOString().split("T")[0]
    document.getElementById("examTimeInput").value = assignment.examTime || ""
    document.getElementById("examVenueInput").value = assignment.examVenue || ""

    modal.classList.add("open")
  }
})

// ---- Modal logic (Add / Edit Assignment) ----
const modal = document.getElementById("assignmentModal")

let itemType = "assignment" // tracks whether the open modal is creating an assignment or exam

document.getElementById("newAssignmentBtn").addEventListener("click", () => {
  editingAssignmentId = null
  itemType = "assignment"
  document.getElementById("modalTitle").textContent = "New Assignment"
  document.getElementById("deadlineLabel").textContent = "Deadline"
  document.getElementById("examFieldsWrapper").style.display = "none"
  document.getElementById("assignmentForm").reset()
  modal.classList.add("open")
})

document.getElementById("newExamBtn").addEventListener("click", () => {
  editingAssignmentId = null
  itemType = "exam"
  document.getElementById("modalTitle").textContent = "New Exam"
  document.getElementById("deadlineLabel").textContent = "Exam date"
  document.getElementById("examFieldsWrapper").style.display = "block"
  document.getElementById("assignmentForm").reset()
  modal.classList.add("open")
})

document.getElementById("cancelBtn").addEventListener("click", () => {
  modal.classList.remove("open")
})

document.getElementById("assignmentForm").addEventListener("submit", async (e) => {
  e.preventDefault()

        const assignmentData = {
    title: document.getElementById("titleInput").value,
    courseId: document.getElementById("courseInput").value,
    priority: document.getElementById("priorityInput").value,
    deadline: document.getElementById("deadlineInput").value,
    type: itemType,
    examTime: document.getElementById("examTimeInput").value,
    examVenue: document.getElementById("examVenueInput").value,
    estimatedHours: document.getElementById("estimatedHoursInput").value || null,
  }

  if (editingAssignmentId) {
    await fetch(`/api/assignments/${editingAssignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assignmentData),
    })
  } else {
    await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assignmentData),
    })
  }

  modal.classList.remove("open")
  document.getElementById("assignmentForm").reset()
  editingAssignmentId = null
  loadAssignments()
})

// ---- Course modal logic (Add / Edit / Delete) ----
const courseModal = document.getElementById("courseModal")

document.getElementById("courseGrid").addEventListener("click", async (e) => {
  if (e.target.classList.contains("add-course")) {
    editingCourseId = null
    document.getElementById("courseModalTitle").textContent = "New Course"
    document.getElementById("courseSubmitBtn").textContent = "Add"
    document.getElementById("courseForm").reset()
    courseModal.classList.add("open")
    return
  }

    const card = e.target.closest(".course-card:not(.add-course)")
  if (!card) return
  const id = card.dataset.id

  if (e.target.classList.contains("delete-course-btn")) {
    const confirmed = confirm("Delete this course? This will also delete all its assignments.")
    if (!confirmed) return
    await fetch(`/api/courses/${id}`, { method: "DELETE" })
    loadCourses()
    loadAssignments()
    return
  }

  if (e.target.classList.contains("edit-course-btn")) {
    const course = coursesCache.find(c => c.id === parseInt(id))
    editingCourseId = course.id
    document.getElementById("courseModalTitle").textContent = "Edit Course"
    document.getElementById("courseSubmitBtn").textContent = "Update"
    document.getElementById("courseNameInput").value = course.name
    document.getElementById("courseColorInput").value = course.coverValue
    courseModal.classList.add("open")
    return
  }

  // Clicking the card body itself: reserved for a future "course details" page
})

document.getElementById("cancelCourseBtn").addEventListener("click", () => {
  courseModal.classList.remove("open")
})

document.getElementById("courseForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const courseData = {
    name: document.getElementById("courseNameInput").value,
    coverValue: document.getElementById("courseColorInput").value,
  }

  if (editingCourseId) {
    await fetch(`/api/courses/${editingCourseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(courseData),
    })
  } else {
    await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(courseData),
    })
  }

  courseModal.classList.remove("open")
  document.getElementById("courseForm").reset()
  editingCourseId = null
  loadCourses()
})

// ---- Timetable logic ----
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const dayNames = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" }
async function loadTimetable() {
  const response = await fetch("/api/timetable")
  const slots = await response.json()

  const grid = document.getElementById("timetableGrid")
  grid.innerHTML = `<div class="timetable-grid">` + days.map(day => {
    const daySlots = slots
      .filter(s => s.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

    const blocksHtml = daySlots.map(s => `
      <div class="class-block" data-id="${s.id}" style="background: ${s.course.coverType === 'color' ? s.course.coverValue : '#1a1a1a'}; color: #fff;">
        <button class="class-delete" title="Remove">×</button>
        <div class="class-course">${s.course.name}</div>
        <div class="class-time">${s.startTime}–${s.endTime}</div>
      </div>
    `).join("")

    return `
      <div class="day-column">
        <div class="day-header">${dayNames[day]}</div>
        ${blocksHtml || `<div style="color:#4a4640; font-size:11px; text-align:center; padding:10px 0;">—</div>`}
      </div>
    `
  }).join("") + `</div>`
}

document.getElementById("timetableGrid").addEventListener("click", async (e) => {
  if (!e.target.classList.contains("class-delete")) return
  const block = e.target.closest(".class-block")
  const id = block.dataset.id
  await fetch(`/api/timetable/${id}`, { method: "DELETE" })
  loadTimetable()
})

const classModal = document.getElementById("classModal")

document.getElementById("addClassBtn").addEventListener("click", () => {
  const courseSelect = document.getElementById("classCourseInput")
  courseSelect.innerHTML = coursesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join("")
  classModal.classList.add("open")
})

document.getElementById("cancelClassBtn").addEventListener("click", () => {
  classModal.classList.remove("open")
})

document.getElementById("classForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const newSlot = {
    courseId: document.getElementById("classCourseInput").value,
    dayOfWeek: document.getElementById("classDayInput").value,
    startTime: document.getElementById("classStartInput").value,
    endTime: document.getElementById("classEndInput").value,
  }

  await fetch("/api/timetable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newSlot),
  })

  classModal.classList.remove("open")
  document.getElementById("classForm").reset()
  loadTimetable()
})

// ---- Calendar logic ----
let calendarYear = new Date().getFullYear()
let calendarMonth = new Date().getMonth() // 0 = January
let selectedDate = null
let assignmentsCache = []

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const dayLabels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

// Builds a YYYY-MM-DD string from LOCAL date parts, avoiding timezone shifting
function formatLocalDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

async function renderCalendar() {
  const response = await fetch("/api/assignments")
  assignmentsCache = await response.json()

  document.getElementById("calendarMonthLabel").textContent = `${monthNames[calendarMonth]} ${calendarYear}`

  const firstOfMonth = new Date(calendarYear, calendarMonth, 1)
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7

    const today = new Date()
  const todayString = formatLocalDate(today)

  let cellsHtml = dayLabels.map(d => `<div class="calendar-day-name">${d}</div>`).join("")

  for (let i = 0; i < leadingBlanks; i++) {
    cellsHtml += `<div class="calendar-day empty"></div>`
  }

  for (let day = 1; day <= daysInMonth; day++) {
        const dateString = formatLocalDate(new Date(calendarYear, calendarMonth, day))

    const itemsToday = assignmentsCache.filter(a => a.deadline.split("T")[0] === dateString)

    const dotsHtml = itemsToday.length > 0
      ? `<div class="calendar-dots">${itemsToday.slice(0, 4).map(a => {
          const color = a.type === 'exam' ? '#e090b8' : (a.priority === 'high' ? '#e8a0a0' : a.priority === 'medium' ? '#e0b870' : '#7ac08a')
          return `<span class="calendar-dot" style="background:${color};"></span>`
        }).join("")}</div>`
      : ""

    const isToday = dateString === todayString ? "today" : ""
    const isSelected = dateString === selectedDate ? "selected" : ""

    cellsHtml += `
      <div class="calendar-day ${isToday} ${isSelected}" data-date="${dateString}">
        <span>${day}</span>
        ${dotsHtml}
      </div>
    `
  }

    document.getElementById("calendarGrid").innerHTML = `<div class="calendar-grid">${cellsHtml}</div>`

  if (selectedDate) showDayDetails(selectedDate)

  renderHeatmap()
}

function showDayDetails(dateString) {
  const itemsToday = assignmentsCache.filter(a => a.deadline.split("T")[0] === dateString)
  const details = document.getElementById("calendarDayDetails")

  if (itemsToday.length === 0) {
    details.innerHTML = ""
    return
  }

  const niceDate = new Date(dateString).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  details.innerHTML = `
    <p style="color:#8a857c; font-size:11px; margin-bottom:8px;">${niceDate}</p>
    ${itemsToday.map(a => `
      <div class="day-details-item">
        <strong>${a.type === 'exam' ? '📌 ' : ''}${a.title}</strong>
        <div style="color:#7a756c; font-size:11px; margin-top:2px;">${a.course.name} · ${a.priority} priority · ${a.status}</div>
      </div>
    `).join("")}
  `
}

document.getElementById("calendarGrid").addEventListener("click", (e) => {
  const cell = e.target.closest(".calendar-day:not(.empty)")
  if (!cell) return
  selectedDate = cell.dataset.date
  renderCalendar()
})

document.getElementById("prevMonthBtn").addEventListener("click", () => {
  calendarMonth--
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear-- }
  renderCalendar()
})

document.getElementById("nextMonthBtn").addEventListener("click", () => {
  calendarMonth++
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++ }
  renderCalendar()
})


// ---- Notes logic ----
let notesCache = []
let editingNoteId = null

async function loadNotes() {
  const response = await fetch("/api/notes")
  notesCache = await response.json()

  const list = document.getElementById("notesList")

  if (notesCache.length === 0) {
    list.innerHTML = `<p style="color:#7a756c; font-size:13px;">No notes yet.</p>`
    return
  }

  list.innerHTML = notesCache.map(n => {
    const preview = n.content.length > 60 ? n.content.slice(0, 60) + "…" : n.content
    return `
      <div class="day-details-item note-preview" data-id="${n.id}" style="cursor:pointer;">
        <strong>${n.title}</strong>
        ${n.course ? `<div style="color:#7a756c; font-size:10.5px; margin:2px 0;">${n.course.name}</div>` : ""}
        <div style="color:#8a857c; font-size:12px; margin-top:4px;">${preview}</div>
      </div>
    `
  }).join("")
}

document.getElementById("notesList").addEventListener("click", (e) => {
  const item = e.target.closest(".note-preview")
  if (!item) return
  openNoteModal(parseInt(item.dataset.id))
})

const noteModal = document.getElementById("noteModal")

function fillNoteCourseDropdown(selectedId) {
  const courseSelect = document.getElementById("noteCourseInput")
  courseSelect.innerHTML = `<option value="">— General —</option>` +
    coursesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join("")
  if (selectedId) courseSelect.value = selectedId
}

document.getElementById("newNotesBtn").addEventListener("click", () => {
  editingNoteId = null
  document.getElementById("noteModalTitle").textContent = "New Note"
  document.getElementById("noteSubmitBtn").textContent = "Add"
  document.getElementById("deleteNoteBtn").style.display = "none"
  document.getElementById("noteForm").reset()
  fillNoteCourseDropdown(null)
  noteModal.classList.add("open")
})

function openNoteModal(id) {
  const note = notesCache.find(n => n.id === id)
  editingNoteId = note.id
  document.getElementById("noteModalTitle").textContent = "Edit Note"
  document.getElementById("noteSubmitBtn").textContent = "Update"
  document.getElementById("deleteNoteBtn").style.display = "inline-block"
  document.getElementById("noteTitleInput").value = note.title
  document.getElementById("noteContentInput").value = note.content
  fillNoteCourseDropdown(note.courseId)
  noteModal.classList.add("open")
}

document.getElementById("cancelNoteBtn").addEventListener("click", () => {
  noteModal.classList.remove("open")
})

document.getElementById("deleteNoteBtn").addEventListener("click", async () => {
  if (!editingNoteId) return
  const confirmed = confirm("Delete this note? This can't be undone.")
  if (!confirmed) return
  await fetch(`/api/notes/${editingNoteId}`, { method: "DELETE" })
  noteModal.classList.remove("open")
  editingNoteId = null
  loadNotes()
})

document.getElementById("noteForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const noteData = {
    title: document.getElementById("noteTitleInput").value,
    content: document.getElementById("noteContentInput").value,
    courseId: document.getElementById("noteCourseInput").value,
  }

  if (editingNoteId) {
    await fetch(`/api/notes/${editingNoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(noteData),
    })
  } else {
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(noteData),
    })
  }

  noteModal.classList.remove("open")
  document.getElementById("noteForm").reset()
  editingNoteId = null
  loadNotes()
})


// ---- Pomodoro timer ----
const FOCUS_SECONDS = 25 * 60
const BREAK_SECONDS = 5 * 60

let pomodoroSecondsLeft = FOCUS_SECONDS
let pomodoroMode = "Focus" // "Focus" or "Break"
let pomodoroInterval = null
let pomodoroRunning = false

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

function updatePomodoroDisplay() {
  document.getElementById("pomodoroTime").textContent = formatTime(pomodoroSecondsLeft)
  document.getElementById("pomodoroMode").textContent = pomodoroMode
}

function pomodoroTick() {
  pomodoroSecondsLeft--

  if (pomodoroSecondsLeft < 0) {
    pomodoroMode = pomodoroMode === "Focus" ? "Break" : "Focus"
    pomodoroSecondsLeft = pomodoroMode === "Focus" ? FOCUS_SECONDS : BREAK_SECONDS
    alert(pomodoroMode === "Break" ? "Focus session done — take a 5 minute break!" : "Break's over — back to focus!")
  }

  updatePomodoroDisplay()
}

document.getElementById("pomodoroStartBtn").addEventListener("click", () => {
  if (pomodoroRunning) {
    clearInterval(pomodoroInterval)
    pomodoroRunning = false
    document.getElementById("pomodoroStartBtn").textContent = "Start"
  } else {
    pomodoroInterval = setInterval(pomodoroTick, 1000)
    pomodoroRunning = true
    document.getElementById("pomodoroStartBtn").textContent = "Pause"
  }
})

document.getElementById("pomodoroResetBtn").addEventListener("click", () => {
  clearInterval(pomodoroInterval)
  pomodoroRunning = false
  pomodoroMode = "Focus"
  pomodoroSecondsLeft = FOCUS_SECONDS
  document.getElementById("pomodoroStartBtn").textContent = "Start"
  updatePomodoroDisplay()
})

updatePomodoroDisplay()

// ---- Auth logic ----

let authMode = "login" // or "signup"

function showAuthScreen() {
  document.getElementById("authScreen").classList.remove("hidden")
}

function hideAuthScreen() {
  document.getElementById("authScreen").classList.add("hidden")
}

document.getElementById("authToggleLink").addEventListener("click", (e) => {
  e.preventDefault()
  authMode = authMode === "login" ? "signup" : "login"
  document.getElementById("authTitle").textContent = authMode === "login" ? "Log In" : "Sign Up"
  document.getElementById("authSubmitBtn").textContent = authMode === "login" ? "Log In" : "Sign Up"
  document.getElementById("authToggleText").textContent = authMode === "login" ? "Don't have an account?" : "Already have an account?"
  document.getElementById("authToggleLink").textContent = authMode === "login" ? "Sign up" : "Log in"
  document.getElementById("authError").style.display = "none"

  const showUsername = authMode === "signup"
  document.getElementById("usernameLabel").style.display = showUsername ? "block" : "none"
  document.getElementById("authUsername").style.display = showUsername ? "block" : "none"
  document.getElementById("authUsername").required = showUsername
})

document.getElementById("authForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const email = document.getElementById("authEmail").value
  const password = document.getElementById("authPassword").value
  const username = document.getElementById("authUsername").value
  const endpoint = authMode === "login" ? "/api/login" : "/api/signup"

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, username }),
  })
  const result = await response.json()

  if (!response.ok) {
    const errorEl = document.getElementById("authError")
    errorEl.textContent = result.error
    errorEl.style.display = "block"
    return
  }

  hideAuthScreen()
  initApp()
})

// Runs everything that needs real data — only called once we know someone's logged in
function initApp() {
  loadCourses()
  loadAssignments()
  loadTimetable()
  renderCalendar()
  loadNotes()
  loadStudyGroups()
}

// On page load, check if we're already logged in (e.g. refreshing the page)
async function checkAuth() {
  const response = await fetch("/api/me")
  const user = await response.json()

  if (user) {
    currentUserId = user.id
    document.getElementById("logoutBtn").textContent = user.username.slice(0, 2).toUpperCase()
    document.getElementById("logoutBtn").title = `${user.username} — click to log out`
    hideAuthScreen()
    initApp()
  } else {
    showAuthScreen()
  }
}

checkAuth()

document.getElementById("logoutBtn").addEventListener("click", async () => {
  const confirmed = confirm("Log out?")
  if (!confirmed) return
  await fetch("/api/logout", { method: "POST" })
  location.reload()
})


// ---- Study Plan ----
const studyPlanModal = document.getElementById("studyPlanModal")

document.getElementById("studyPlanBtn").addEventListener("click", async () => {
  const response = await fetch("/api/study-plan")
  const plan = await response.json()

  const content = document.getElementById("studyPlanContent")

  const warningsHtml = plan.warnings.length > 0
    ? `<div style="background:#3a2222; border-radius:8px; padding:10px 12px; margin-bottom:14px; font-size:12px; color:#e8a0a0;">
        ${plan.warnings.map(w => `⚠️ ${w}`).join("<br>")}
      </div>`
    : ""

  const daysHtml = plan.days.map(day => {
    const niceDate = new Date(day.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })

    if (day.allocations.length === 0) {
      return `
        <div style="margin-bottom:14px;">
          <p style="color:#8a857c; font-size:12px; margin-bottom:6px;">${niceDate}</p>
          <p style="color:#4a4640; font-size:12px;">Nothing scheduled</p>
        </div>
      `
    }

    return `
      <div style="margin-bottom:14px;">
        <p style="color:#c9a0ac; font-size:12px; font-weight:600; margin-bottom:6px;">${niceDate}</p>
        ${day.allocations.map(a => `
          <div class="day-details-item">
            <strong>${a.type === 'exam' ? '📌 ' : ''}${a.title}</strong> — ${a.hours}h
            <div style="color:#7a756c; font-size:11px; margin-top:2px;">${a.course}</div>
          </div>
        `).join("")}
      </div>
    `
  }).join("")

  content.innerHTML = warningsHtml + daysHtml
  studyPlanModal.classList.add("open")
})

document.getElementById("closeStudyPlanBtn").addEventListener("click", () => {
  studyPlanModal.classList.remove("open")
})



// ---- Exam Revision Plan ----
const revisionModal = document.getElementById("revisionModal")
let lastRevisionPlan = null

document.getElementById("revisionPlanBtn").addEventListener("click", async () => {
  const response = await fetch("/api/assignments")
  const all = await response.json()
  const upcomingExams = all.filter(a => a.type === 'exam' && a.status !== 'completed')

  document.getElementById("revisionSetup").style.display = "block"
  document.getElementById("revisionResults").style.display = "none"
  document.getElementById("graspSection").style.display = "none"

  const checklist = document.getElementById("examChecklist")

  if (upcomingExams.length === 0) {
    checklist.innerHTML = `<p style="color:#7a756c; font-size:12px;">No upcoming exams to plan for.</p>`
    return
  }

  checklist.innerHTML = upcomingExams.map(exam => `
    <label style="display:flex; align-items:center; gap:8px; margin-bottom:8px; font-size:12.5px; cursor:pointer;">
      <input type="checkbox" class="exam-checkbox" value="${exam.id}" data-course-id="${exam.courseId}">
      ${exam.title} <span style="color:#7a756c;">(${exam.course.name})</span>
    </label>
  `).join("")

  revisionModal.classList.add("open")

  // Whenever checkboxes change, rebuild the grasp-rating inputs for just the selected exams' courses
  document.querySelectorAll(".exam-checkbox").forEach(box => {
    box.addEventListener("change", updateGraspInputs)
  })
})

function updateGraspInputs() {
  const checked = [...document.querySelectorAll(".exam-checkbox:checked")]
  const graspSection = document.getElementById("graspSection")

  if (checked.length === 0) {
    graspSection.style.display = "none"
    return
  }

  graspSection.style.display = "block"

  // De-duplicate courses in case two selected exams share the same course
  const uniqueCourses = [...new Map(checked.map(c => [c.dataset.courseId, c])).values()]

  document.getElementById("graspInputs").innerHTML = uniqueCourses.map(c => {
    const courseName = c.parentElement.textContent.split("(")[1].replace(")", "").trim()
    return `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <span style="font-size:12.5px;">${courseName}</span>
        <select class="grasp-select" data-course-id="${c.dataset.courseId}" style="width:70px; background:#1a1a1a; border:0.5px solid #2a2a2a; border-radius:6px; color:#f2f0ea; padding:4px;">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3" selected>3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      </div>
    `
  }).join("")
}

document.getElementById("cancelRevisionBtn").addEventListener("click", () => {
  revisionModal.classList.remove("open")
})

document.getElementById("generateRevisionBtn").addEventListener("click", async () => {
  const checkedExamIds = [...document.querySelectorAll(".exam-checkbox:checked")].map(c => c.value)

  if (checkedExamIds.length === 0) {
    alert("Pick at least one exam first.")
    return
  }

  const graspRatings = {}
  document.querySelectorAll(".grasp-select").forEach(sel => {
    graspRatings[sel.dataset.courseId] = parseInt(sel.value)
  })
  const method = document.getElementById("methodInput").value

  const response = await fetch("/api/revision-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ examIds: checkedExamIds, graspRatings, method }),
  })
  const result = await response.json()
  lastRevisionPlan = result

  const resultsEl = document.getElementById("revisionResults")

  const warningsHtml = result.warnings.length > 0
    ? `<div style="background:#3a2222; border-radius:8px; padding:10px 12px; margin-bottom:14px; font-size:12px; color:#e8a0a0;">
        ${result.warnings.map(w => `⚠️ ${w}`).join("<br>")}
      </div>`
    : ""

  const daysHtml = result.days.map(day => {
    const niceDate = new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    return `
      <div style="margin-bottom:12px;">
        <p style="color:#c9a0ac; font-size:12px; font-weight:600; margin-bottom:6px;">${niceDate}</p>
        ${day.allocations.map(a => `
          <div class="day-details-item">
            <strong>${a.course}</strong> — ${a.hours}h
            <div style="color:#7a756c; font-size:11px; margin-top:2px;">For: ${a.examTitle}</div>
            <div style="color:#b8b4ac; font-size:11px; margin-top:2px;">${a.resource}</div>
          </div>
        `).join("")}
      </div>
    `
  }).join("")

  resultsEl.innerHTML = `
    ${warningsHtml}
    ${daysHtml}
    <div class="modal-buttons">
      <button type="button" class="btn btn-secondary" id="closeRevisionResultsBtn" style="flex:1;">Close</button>
      <button type="button" class="btn btn-primary" id="addRevisionToCalendarBtn" style="flex:1;">Add to Calendar</button>
    </div>
  `

  document.getElementById("revisionSetup").style.display = "none"
  resultsEl.style.display = "block"

  document.getElementById("closeRevisionResultsBtn").addEventListener("click", () => {
    revisionModal.classList.remove("open")
  })

  document.getElementById("addRevisionToCalendarBtn").addEventListener("click", async () => {
    for (const day of lastRevisionPlan.days) {
      for (const a of day.allocations) {
        await fetch("/api/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Revise: ${a.course}`,
            courseId: a.courseId,
            priority: "medium",
            deadline: day.date,
            type: "study-session",
          }),
        })
      }
    }
    alert("Revision sessions added to your calendar and assignments!")
    revisionModal.classList.remove("open")
    loadAssignments()
    renderCalendar()
  })
})



// ---- Study Groups ----
let currentUserId = null

async function loadStudyGroups(search = "") {
  const response = await fetch(`/api/study-groups?search=${encodeURIComponent(search)}`)
  const groups = await response.json()

  const list = document.getElementById("studyGroupsList")

  if (groups.length === 0) {
    list.innerHTML = `<p style="color:#7a756c; font-size:13px;">No groups found.</p>`
    return
  }

  list.innerHTML = groups.map(g => {
    const isMember = g.members.some(m => m.userId === currentUserId)
    return `
      <div class="day-details-item" data-id="${g.id}" data-slug="${g.jitsiSlug}">
        <div style="display:flex; justify-content:space-between; align-items:start;">
          <div>
            <strong>${g.name}</strong>
            <div style="color:#7a756c; font-size:11px; margin-top:2px;">${g.courseName} · ${g.members.length} member${g.members.length === 1 ? '' : 's'}</div>
          </div>
          ${isMember
            ? `<button class="btn btn-primary join-call-btn" style="flex:none; padding:5px 10px; font-size:11px;">Join Call</button>`
            : `<button class="btn btn-secondary join-group-btn" style="flex:none; padding:5px 10px; font-size:11px;">Join</button>`
          }
        </div>
        ${isMember ? `<button class="leave-group-btn" style="background:none; border:none; color:#7a756c; font-size:10.5px; margin-top:6px; cursor:pointer; text-decoration:underline;">Leave group</button>` : ""}
      </div>
    `
  }).join("")
}

document.getElementById("studyGroupsList").addEventListener("click", async (e) => {
  const item = e.target.closest("[data-id]")
  if (!item) return
  const groupId = item.dataset.id
  const slug = item.dataset.slug

  if (e.target.classList.contains("join-group-btn")) {
    await fetch(`/api/study-groups/${groupId}/join`, { method: "POST" })
    loadStudyGroups(document.getElementById("groupSearchInput").value)
  }

  if (e.target.classList.contains("leave-group-btn")) {
    const confirmed = confirm("Leave this group?")
    if (!confirmed) return
    await fetch(`/api/study-groups/${groupId}/leave`, { method: "POST" })
    loadStudyGroups(document.getElementById("groupSearchInput").value)
  }

  if (e.target.classList.contains("join-call-btn")) {
    window.open(`https://meet.jit.si/${slug}`, "_blank")
  }
})

document.getElementById("groupSearchInput").addEventListener("input", (e) => {
  loadStudyGroups(e.target.value)
})

const groupModal = document.getElementById("groupModal")

document.getElementById("createGroupBtn").addEventListener("click", () => {
  groupModal.classList.add("open")
})

document.getElementById("cancelGroupBtn").addEventListener("click", () => {
  groupModal.classList.remove("open")
})

document.getElementById("groupForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const newGroup = {
    name: document.getElementById("groupNameInput").value,
    courseName: document.getElementById("groupCourseInput").value,
  }

  await fetch("/api/study-groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newGroup),
  })

  groupModal.classList.remove("open")
  document.getElementById("groupForm").reset()
  loadStudyGroups()
})


// ---- Workload Heatmap ----
let heatmapStartDate = new Date()

function renderHeatmap() {
  const heatDays = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(heatmapStartDate)
    date.setDate(date.getDate() + i)
    const dateString = formatLocalDate(date)
    const count = assignmentsCache.filter(a => a.deadline.split("T")[0] === dateString).length
    heatDays.push({ dateString, count, dayLabel: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }) })
  }

  const maxCount = Math.max(1, ...heatDays.map(d => d.count))

  const colorForCount = (count) => {
    if (count === 0) return "#1a1414"
    const intensity = count / maxCount
    if (intensity < 0.34) return "#3a1e22"
    if (intensity < 0.67) return "#5a262e"
    return "#6a2830"
  }

  const stripHtml = heatDays.map(d => `
    <div class="heatmap-cell" style="background:${colorForCount(d.count)};" title="${d.dayLabel}: ${d.count} due">
      ${d.count > 0 ? d.count : ""}
    </div>
  `).join("")

  const rangeLabel = `${heatDays[0].dayLabel} – ${heatDays[6].dayLabel}`

  document.getElementById("workloadHeatmap").innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
      <button class="icon-action" id="prevWeekBtn">‹</button>
      <span style="font-size:11px; color:#8a857c;">${rangeLabel}</span>
      <button class="icon-action" id="nextWeekBtn">›</button>
    </div>
    <div class="heatmap-strip">${stripHtml}</div>
    <div class="heatmap-legend">
      <span>Light</span>
      <span class="heatmap-legend-swatch" style="background:#1a1414;"></span>
      <span class="heatmap-legend-swatch" style="background:#3a1e22;"></span>
      <span class="heatmap-legend-swatch" style="background:#5a262e;"></span>
      <span class="heatmap-legend-swatch" style="background:#6a2830;"></span>
      <span>Heavy</span>
    </div>
  `

  document.getElementById("prevWeekBtn").addEventListener("click", () => {
    heatmapStartDate.setDate(heatmapStartDate.getDate() - 7)
    renderHeatmap()
  })
  document.getElementById("nextWeekBtn").addEventListener("click", () => {
    heatmapStartDate.setDate(heatmapStartDate.getDate() + 7)
    renderHeatmap()
  })
}