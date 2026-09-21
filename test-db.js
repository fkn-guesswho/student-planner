// test-db.js
// A quick script to prove the database actually works.
// Run this with: node test-db.js

const { PrismaClient } = require('./generated/prisma')
const prisma = new PrismaClient()

async function main() {
  console.log('Creating a test course...')
  const course = await prisma.course.create({
    data: {
      name: 'Data Structures and Algorithms',
      coverType: 'color',
      coverValue: '#4a2e38',
    },
  })
  console.log('Course created:', course)

  console.log('\nCreating a test assignment for that course...')
  const assignment = await prisma.assignment.create({
    data: {
      title: 'Problem set 4',
      type: 'assignment',
      priority: 'high',
      status: 'not started',
      deadline: new Date('2026-09-05'),
      courseId: course.id,
    },
  })
  console.log('Assignment created:', assignment)

  console.log('\nReading all assignments back from the database...')
  const allAssignments = await prisma.assignment.findMany({
    include: { course: true },
  })
  console.log('All assignments:', allAssignments)
}

main()
  .catch((e) => console.error('Something went wrong:', e))
  .finally(async () => {
    await prisma.$disconnect()
  })