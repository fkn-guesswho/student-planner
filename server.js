const express = require('express')
const { PrismaClient } = require('./generated/prisma')
const session = require('express-session')
const bcrypt = require('bcrypt')

const app = express()
const prisma = new PrismaClient()
const PORT = 3000

app.use(express.json())
app.use(session({
  secret: 'change-this-later-to-something-random',
  resave: false,
  saveUninitialized: false,
}))
app.use(express.static('public'))

// A gatekeeper: blocks the request unless someone is logged in
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'You must be logged in.' })
  }
  next()
}

// ---- Auth ----

app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(400).json({ error: 'An account with that email already exists.' })
  }
  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, password: hashedPassword } })
  req.session.userId = user.id
  res.json({ id: user.id, email: user.email })
})

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(400).json({ error: 'No account found with that email.' })
  const passwordMatches = await bcrypt.compare(password, user.password)
  if (!passwordMatches) return res.status(400).json({ error: 'Incorrect password.' })
  req.session.userId = user.id
  res.json({ id: user.id, email: user.email })
})

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }))
})

app.get('/api/me', async (req, res) => {
  if (!req.session.userId) return res.json(null)
  const user = await prisma.user.findUnique({ where: { id: req.session.userId } })
  res.json(user ? { id: user.id, email: user.email } : null)
})

// ---- Courses ----

app.get('/api/courses', requireLogin, async (req, res) => {
  const courses = await prisma.course.findMany({ where: { userId: req.session.userId } })
  res.json(courses)
})

app.post('/api/courses', requireLogin, async (req, res) => {
  const { name, coverValue } = req.body
  const course = await prisma.course.create({
    data: { name, coverType: 'color', coverValue, userId: req.session.userId },
  })
  res.json(course)
})

app.patch('/api/courses/:id', requireLogin, async (req, res) => {
  const { name, coverValue } = req.body
  const data = {}
  if (name !== undefined) data.name = name
  if (coverValue !== undefined) data.coverValue = coverValue
  const course = await prisma.course.update({ where: { id: parseInt(req.params.id) }, data })
  res.json(course)
})

app.delete('/api/courses/:id', requireLogin, async (req, res) => {
  await prisma.assignment.deleteMany({ where: { courseId: parseInt(req.params.id) } })
  await prisma.course.delete({ where: { id: parseInt(req.params.id) } })
  res.json({ success: true })
})

// ---- Assignments ----

app.get('/api/assignments', requireLogin, async (req, res) => {
  const assignments = await prisma.assignment.findMany({
    where: { course: { userId: req.session.userId } },
    include: { course: true },
  })
  res.json(assignments)
})

app.post('/api/assignments', requireLogin, async (req, res) => {
  const { title, priority, deadline, courseId, type, examTime, examVenue, estimatedHours } = req.body
  const assignment = await prisma.assignment.create({
    data: {
      title,
      type: type || 'assignment',
      priority,
      status: 'not started',
      deadline: new Date(deadline),
      courseId: parseInt(courseId),
      examTime: examTime || null,
      examVenue: examVenue || null,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
    },
  })
  res.json(assignment)
})

app.patch('/api/assignments/:id', requireLogin, async (req, res) => {
  const { title, priority, status, deadline, courseId, examTime, examVenue, estimatedHours } = req.body
  const data = {}
  if (title !== undefined) data.title = title
  if (priority !== undefined) data.priority = priority
  if (status !== undefined) data.status = status
  if (deadline !== undefined) data.deadline = new Date(deadline)
  if (courseId !== undefined) data.courseId = parseInt(courseId)
  if (examTime !== undefined) data.examTime = examTime
  if (examVenue !== undefined) data.examVenue = examVenue
  if (estimatedHours !== undefined) data.estimatedHours = estimatedHours ? parseFloat(estimatedHours) : null
  const assignment = await prisma.assignment.update({ where: { id: parseInt(req.params.id) }, data })
  res.json(assignment)
})

app.delete('/api/assignments/:id', requireLogin, async (req, res) => {
  await prisma.assignment.delete({ where: { id: parseInt(req.params.id) } })
  res.json({ success: true })
})

// ---- Timetable ----

app.get('/api/timetable', requireLogin, async (req, res) => {
  const slots = await prisma.classSlot.findMany({
    where: { course: { userId: req.session.userId } },
    include: { course: true },
  })
  res.json(slots)
})

app.post('/api/timetable', requireLogin, async (req, res) => {
  const { dayOfWeek, startTime, endTime, courseId } = req.body
  const slot = await prisma.classSlot.create({
    data: { dayOfWeek, startTime, endTime, courseId: parseInt(courseId) },
  })
  res.json(slot)
})

app.delete('/api/timetable/:id', requireLogin, async (req, res) => {
  await prisma.classSlot.delete({ where: { id: parseInt(req.params.id) } })
  res.json({ success: true })
})

// ---- Notes ----

app.get('/api/notes', requireLogin, async (req, res) => {
  const notes = await prisma.note.findMany({
    where: {
      OR: [
        { course: { userId: req.session.userId } },
        { courseId: null },
      ],
    },
    include: { course: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(notes)
})

app.post('/api/notes', requireLogin, async (req, res) => {
  const { title, content, courseId } = req.body
  const note = await prisma.note.create({
    data: { title, content, courseId: courseId ? parseInt(courseId) : null },
  })
  res.json(note)
})

app.patch('/api/notes/:id', requireLogin, async (req, res) => {
  const { title, content, courseId } = req.body
  const data = {}
  if (title !== undefined) data.title = title
  if (content !== undefined) data.content = content
  if (courseId !== undefined) data.courseId = courseId ? parseInt(courseId) : null
  const note = await prisma.note.update({ where: { id: parseInt(req.params.id) }, data })
  res.json(note)
})

app.delete('/api/notes/:id', requireLogin, async (req, res) => {
  await prisma.note.delete({ where: { id: parseInt(req.params.id) } })
  res.json({ success: true })
})

// ---- Study Groups ----

app.get('/api/study-groups', requireLogin, async (req, res) => {
  const search = req.query.search || ''
  const groups = await prisma.studyGroup.findMany({
    where: {
      OR: [
        { name: { contains: search } },
        { courseName: { contains: search } },
      ],
    },
    include: { members: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(groups)
})

app.post('/api/study-groups', requireLogin, async (req, res) => {
  const { name, courseName } = req.body
  const jitsiSlug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.random().toString(36).slice(2, 8)}`

  const group = await prisma.studyGroup.create({
    data: {
      name,
      courseName,
      jitsiSlug,
      createdBy: req.session.userId,
      members: { create: { userId: req.session.userId } }, // creator auto-joins
    },
    include: { members: true },
  })
  res.json(group)
})

app.post('/api/study-groups/:id/join', requireLogin, async (req, res) => {
  const groupId = parseInt(req.params.id)
  const alreadyMember = await prisma.studyGroupMember.findFirst({
    where: { groupId, userId: req.session.userId },
  })
  if (alreadyMember) {
    return res.status(400).json({ error: 'Already a member of this group.' })
  }
  await prisma.studyGroupMember.create({
    data: { groupId, userId: req.session.userId },
  })
  res.json({ success: true })
})

app.post('/api/study-groups/:id/leave', requireLogin, async (req, res) => {
  await prisma.studyGroupMember.deleteMany({
    where: { groupId: parseInt(req.params.id), userId: req.session.userId },
  })
  res.json({ success: true })
})

// ---- Shared helpers for Study Plan & Revision Plan ----

function timeStringToHours(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h + m / 60
}

function formatDateForPlan(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const DAILY_BUDGET_HOURS = 4
const PLANNING_DAYS = 7
const PRIORITY_HOURS_DEFAULT = { high: 3, medium: 2, low: 1 }
const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 }
const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// ---- Study Plan (daily, rolling 7 days) ----

app.get('/api/study-plan', requireLogin, async (req, res) => {
  const assignments = await prisma.assignment.findMany({
    where: {
      course: { userId: req.session.userId },
      status: { not: 'completed' },
    },
    include: { course: true },
  })

  const classSlots = await prisma.classSlot.findMany({
    where: { course: { userId: req.session.userId } },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = []
  for (let i = 0; i < PLANNING_DAYS; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dayAbbr = DAY_ABBR[date.getDay()]
    const classHoursToday = classSlots
      .filter(s => s.dayOfWeek === dayAbbr)
      .reduce((sum, s) => sum + (timeStringToHours(s.endTime) - timeStringToHours(s.startTime)), 0)
    days.push({
      date,
      dayAbbr,
      freeHours: Math.max(0, DAILY_BUDGET_HOURS - classHoursToday),
      allocations: [],
    })
  }

  const scoredTasks = assignments.map(a => {
    const deadline = new Date(a.deadline)
    const daysUntil = Math.max(1, Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)))
    const hoursNeeded = a.estimatedHours || PRIORITY_HOURS_DEFAULT[a.priority] || 2
    const score = PRIORITY_WEIGHT[a.priority] / daysUntil
    return { ...a, deadline, daysUntil, hoursNeeded, score }
  }).sort((a, b) => b.score - a.score)

  const warnings = []

  for (const task of scoredTasks) {
    let remainingNeeded = task.hoursNeeded
    for (const day of days) {
      if (remainingNeeded <= 0) break
      if (day.date > task.deadline) break
      if (day.freeHours <= 0) continue
      const allocate = Math.min(day.freeHours, remainingNeeded)
      day.allocations.push({
        title: task.title,
        course: task.course.name,
        hours: Math.round(allocate * 10) / 10,
        type: task.type,
      })
      day.freeHours -= allocate
      remainingNeeded -= allocate
    }
    if (remainingNeeded > 0) {
      warnings.push(`Not enough free time to finish "${task.title}" before its deadline (short by ${Math.round(remainingNeeded * 10) / 10}h).`)
    }
  }

  res.json({
    days: days.map(d => ({ date: formatDateForPlan(d.date), dayAbbr: d.dayAbbr, allocations: d.allocations })),
    warnings,
  })
})

// ---- Exam Revision Plan (one or more exams, adds sessions to calendar) ----

app.post('/api/revision-plan', requireLogin, async (req, res) => {
  const { examIds, graspRatings, method } = req.body

  const exams = await prisma.assignment.findMany({
    where: { id: { in: examIds.map(Number) } },
    include: { course: true },
  })

  if (exams.length === 0) {
    return res.status(404).json({ error: 'No exams found.' })
  }

  const classSlots = await prisma.classSlot.findMany({
    where: { course: { userId: req.session.userId } },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const latestExamDate = new Date(Math.max(...exams.map(e => new Date(e.deadline))))
  const totalDays = Math.max(1, Math.ceil((latestExamDate - today) / (1000 * 60 * 60 * 24))) + 1

  const days = []
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dayAbbr = DAY_ABBR[date.getDay()]
    const classHoursToday = classSlots
      .filter(s => s.dayOfWeek === dayAbbr)
      .reduce((sum, s) => sum + (timeStringToHours(s.endTime) - timeStringToHours(s.startTime)), 0)
    days.push({
      date,
      freeHours: Math.max(0, DAILY_BUDGET_HOURS - classHoursToday),
      allocations: [],
    })
  }

   const tasks = exams.map(exam => {
    const rating = graspRatings[exam.courseId] || 3
    const weight = 6 - rating
    const examDeadline = new Date(exam.deadline)
    const daysUntilExam = Math.max(1, Math.ceil((examDeadline - today) / (1000 * 60 * 60 * 24)))
    const score = weight / daysUntilExam // higher = more urgent AND/OR weaker grasp
    let resource
    if (rating <= 2) resource = "Re-read your notes first, then try a past paper section."
    else if (rating === 3) resource = "Mix of notes review and a full past paper."
    else resource = "Go straight to a past paper under timed conditions."
    return {
      course: exam.course.name,
      courseId: exam.courseId,
      examTitle: exam.title,
      examDeadline,
      rating,
      weight,
      daysUntilExam,
      score,
      resource,
    }
  })

  const totalWeight = tasks.reduce((sum, t) => sum + t.weight, 0)
  const totalCapacity = days.reduce((sum, d) => sum + d.freeHours, 0)
  tasks.forEach(t => {
    t.hoursNeeded = Math.round((t.weight / totalWeight) * totalCapacity * 10) / 10
  })

  const warnings = []

   for (const task of tasks.sort((a, b) => b.score - a.score)) {
    let remaining = task.hoursNeeded
    for (const day of days) {
      if (remaining <= 0) break
      if (day.date > task.examDeadline) break
      if (day.freeHours <= 0) continue
      const allocate = Math.min(day.freeHours, remaining)
      day.allocations.push({
        course: task.course,
        courseId: task.courseId,
        examTitle: task.examTitle,
        hours: Math.round(allocate * 10) / 10,
        resource: task.resource,
      })
      day.freeHours -= allocate
      remaining -= allocate
    }
    if (remaining > 0) {
      warnings.push(`Not enough free time to fully prepare for "${task.examTitle}" (short by ${Math.round(remaining * 10) / 10}h).`)
    }
  }

  res.json({
    method,
    days: days.filter(d => d.allocations.length > 0).map(d => ({
      date: formatDateForPlan(d.date),
      allocations: d.allocations,
    })),
    warnings,
  })
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})