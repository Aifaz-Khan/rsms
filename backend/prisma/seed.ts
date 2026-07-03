import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rsms.com' },
    update: {},
    create: {
      email: 'admin@rsms.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
      organization: 'RSMS',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create Ayurvedic Medical Research Survey
  const survey = await prisma.survey.upsert({
    where: { slug: 'ayurvedic-medical-research-2024' },
    update: {},
    create: {
      title: 'Ayurvedic Medical Research Survey 2024',
      description:
        'A comprehensive research survey to study the effectiveness of Ayurvedic treatments and lifestyle practices on overall health and wellbeing.',
      slug: 'ayurvedic-medical-research-2024',
      status: 'PUBLISHED',
      isPublic: true,
      allowAnonymous: true,
      createdById: admin.id,
      settings: {
        showProgressBar: true,
        allowBack: true,
        autoSaveInterval: 10000,
        tokenExpiryDays: 30,
      },
      theme: {
        primaryColor: '#0ea5e9',
        secondaryColor: '#10b981',
        fontFamily: 'Inter',
      },
    },
  });
  console.log('✅ Survey created:', survey.title);

  // Create sections
  const sections = [
    { title: 'Participant Information', description: 'Basic personal details', order: 1 },
    { title: 'Demographic Details', description: 'Age, gender, location details', order: 2 },
    { title: 'Medical History', description: 'Past and current medical conditions', order: 3 },
    { title: 'Lifestyle & Diet', description: 'Daily routine and dietary habits', order: 4 },
    { title: 'Ayurvedic Practices', description: 'Current Ayurvedic treatments and practices', order: 5 },
    { title: 'Eye Assessment', description: 'Vision and eye health assessment', order: 6 },
    { title: 'Ear Assessment', description: 'Hearing and ear health assessment', order: 7 },
    { title: 'Skin Assessment', description: 'Skin condition and health assessment', order: 8 },
    { title: 'Mental Health', description: 'Psychological wellbeing assessment', order: 9 },
    { title: 'Risk Factors', description: 'Identification of health risk factors', order: 10 },
  ];

  const createdSections: Record<string, string> = {};
  for (const section of sections) {
    const created = await prisma.section.create({
      data: { ...section, surveyId: survey.id },
    });
    createdSections[section.title] = created.id;
    console.log(`✅ Section created: ${section.title}`);
  }

  // Create questions for Participant Information section
  const participantSectionId = createdSections['Participant Information'];
  const participantQuestions = [
    {
      type: 'SHORT_TEXT' as const,
      title: 'Full Name',
      placeholder: 'Enter your full name',
      isRequired: true,
      order: 1,
      validation: { minLength: 2, maxLength: 100 },
    },
    {
      type: 'EMAIL' as const,
      title: 'Email Address',
      placeholder: 'Enter your email address',
      isRequired: false,
      order: 2,
      helpText: 'We will use this to send you the survey results',
    },
    {
      type: 'PHONE' as const,
      title: 'Phone Number',
      placeholder: '+91 XXXXX XXXXX',
      isRequired: false,
      order: 3,
    },
    {
      type: 'RADIO' as const,
      title: 'What is your profession?',
      isRequired: true,
      order: 4,
      helpText: 'Select the option that best describes your current occupation',
    },
  ];

  for (const q of participantQuestions) {
    const question = await prisma.question.create({
      data: { ...q, sectionId: participantSectionId },
    });

    if (q.type === 'RADIO' && q.title === 'What is your profession?') {
      const professions = ['Student', 'Teacher', 'Doctor', 'Nurse', 'Driver', 'Receptionist', 'Engineer', 'Other'];
      for (let i = 0; i < professions.length; i++) {
        await prisma.questionOption.create({
          data: {
            questionId: question.id,
            label: professions[i],
            value: professions[i].toLowerCase(),
            order: i + 1,
          },
        });
      }
    }
  }

  // Create questions for Demographic Details section
  const demoSectionId = createdSections['Demographic Details'];
  const demoQuestions = [
    {
      type: 'NUMBER' as const,
      title: 'Age',
      placeholder: 'Enter your age',
      isRequired: true,
      order: 1,
      validation: { min: 18, max: 100 },
    },
    {
      type: 'RADIO' as const,
      title: 'Gender',
      isRequired: true,
      order: 2,
    },
    {
      type: 'SHORT_TEXT' as const,
      title: 'City / Town',
      placeholder: 'Enter your city or town',
      isRequired: true,
      order: 3,
    },
    {
      type: 'SHORT_TEXT' as const,
      title: 'State',
      placeholder: 'Enter your state',
      isRequired: true,
      order: 4,
    },
    {
      type: 'DROPDOWN' as const,
      title: 'Education Level',
      isRequired: true,
      order: 5,
    },
  ];

  for (const q of demoQuestions) {
    const question = await prisma.question.create({
      data: { ...q, sectionId: demoSectionId },
    });

    if (q.title === 'Gender') {
      const genders = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
      for (let i = 0; i < genders.length; i++) {
        await prisma.questionOption.create({
          data: { questionId: question.id, label: genders[i], value: genders[i].toLowerCase().replace(' ', '_'), order: i + 1 },
        });
      }
    }

    if (q.title === 'Education Level') {
      const levels = ['Primary School', 'Secondary School', 'Higher Secondary', 'Bachelor\'s Degree', 'Master\'s Degree', 'Doctorate', 'Other'];
      for (let i = 0; i < levels.length; i++) {
        await prisma.questionOption.create({
          data: { questionId: question.id, label: levels[i], value: levels[i].toLowerCase().replace(/[' ]/g, '_'), order: i + 1 },
        });
      }
    }
  }

  // Mental Health section questions
  const mentalSectionId = createdSections['Mental Health'];
  const mentalQuestions = [
    {
      type: 'LIKERT_SCALE' as const,
      title: 'How would you rate your overall mental wellbeing?',
      isRequired: true,
      order: 1,
      settings: { scale: 5, labels: ['Very Poor', 'Poor', 'Neutral', 'Good', 'Excellent'] },
    },
    {
      type: 'RATING' as const,
      title: 'Rate your stress level in the past month',
      isRequired: true,
      order: 2,
      settings: { maxRating: 10 },
    },
    {
      type: 'YES_NO' as const,
      title: 'Have you experienced anxiety or depression in the past year?',
      isRequired: true,
      order: 3,
    },
    {
      type: 'LONG_TEXT' as const,
      title: 'Describe any mental health challenges you have faced',
      placeholder: 'Please describe in detail...',
      isRequired: false,
      order: 4,
      helpText: 'This information is strictly confidential',
    },
  ];

  for (const q of mentalQuestions) {
    await prisma.question.create({
      data: { ...q, sectionId: mentalSectionId },
    });
  }

  // Add question bank entries
  const bankQuestions = [
    { title: 'Full Name', type: 'SHORT_TEXT' as const, category: 'Personal', tags: ['name', 'personal'] },
    { title: 'Email Address', type: 'EMAIL' as const, category: 'Personal', tags: ['email', 'contact'] },
    { title: 'Phone Number', type: 'PHONE' as const, category: 'Personal', tags: ['phone', 'contact'] },
    { title: 'Age', type: 'NUMBER' as const, category: 'Demographic', tags: ['age', 'demographic'], validation: { min: 0, max: 120 } },
    { title: 'Gender', type: 'RADIO' as const, category: 'Demographic', tags: ['gender', 'demographic'], options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
    { title: 'Overall Satisfaction', type: 'RATING' as const, category: 'Feedback', tags: ['satisfaction', 'rating'] },
    { title: 'Additional Comments', type: 'LONG_TEXT' as const, category: 'General', tags: ['comments', 'feedback'] },
  ];

  for (const q of bankQuestions) {
    await prisma.questionBank.create({ data: q });
  }

  console.log('✅ Question bank seeded');
  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Admin Credentials:');
  console.log('   Email: admin@rsms.com');
  console.log('   Password: Admin@123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
