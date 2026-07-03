import { PrismaClient, QuestionType, SurveyStatus } from '@prisma/client';

const prisma = new PrismaClient();

const frequencyOptions = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'];
const ratingOptions = ['Excellent', 'Very Good', 'Good', 'Average', 'Poor', 'Very Poor'];
const yesNoOptions = ['Yes', 'No'];
const senseOrganOptions = ['Eyes', 'Ears', 'Nose', 'Tongue', 'Skin'];

async function main() {
  console.log('🌱 Seeding Ayurgram 3.0 Survey...');

  // Get admin user to assign as creator
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!admin) {
    throw new Error('Admin user not found. Please seed the database with admin user first.');
  }

  // Create/Update the survey
  const survey = await prisma.survey.upsert({
    where: { slug: 'ayurgram-3-0' },
    update: {},
    create: {
      title: 'AYURGRAM 3.0: SWASTHA INDRIYA, SWASTHA INDIA',
      description: 'Welcome to the Ayurgrama Indriya Arogya Survey! Namaste! This survey is a part of the Ayurgrama Indriya Arogya initiative aimed at understanding awareness, lifestyle practices, and factors influencing the health of our sensory organs (Indriyas): Eyes, Ears, Nose, Tongue, and Skin.',
      slug: 'ayurgram-3-0',
      status: SurveyStatus.PUBLISHED,
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
        primaryColor: '#059669',
        secondaryColor: '#3b82f6',
        fontFamily: 'Inter',
      },
    },
  });

  console.log(`✅ Survey created/found: ${survey.title} (ID: ${survey.id})`);

  // Helper to create sections and questions
  let sectionOrder = 1;

  async function createSurveySection(title: string, description: string, questionsData: any[]) {
    const section = await prisma.section.create({
      data: {
        surveyId: survey.id,
        title,
        description,
        order: sectionOrder++,
      },
    });

    console.log(`➡️ Created Section: ${title}`);

    for (let i = 0; i < questionsData.length; i++) {
      const q = questionsData[i];
      const question = await prisma.question.create({
        data: {
          sectionId: section.id,
          type: q.type,
          title: q.title,
          isRequired: q.isRequired ?? false,
          order: i + 1,
          helpText: q.helpText,
          placeholder: q.placeholder,
        },
      });

      if (q.options && q.options.length > 0) {
        await Promise.all(
          q.options.map((optLabel: string, index: number) => {
            const optValue = optLabel.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30);
            return prisma.questionOption.create({
              data: {
                questionId: question.id,
                label: optLabel,
                value: optValue,
                order: index + 1,
              },
            });
          })
        );
      }
    }
  }

  // 1. Section A: Participant Information
  await createSurveySection(
    'Section A: Participant Information',
    'Basic participant details and consent',
    [
      {
        title: 'Informed consent',
        type: QuestionType.CHECKBOX,
        isRequired: true,
        options: [
          'I have read and understood the purpose of this survey.',
          'I voluntarily agree to participate',
          'I understand that my responses will remain confidential and will be used only for academic/research purposes.',
        ],
      },
      {
        title: 'Age',
        type: QuestionType.RADIO,
        isRequired: true,
        options: ['17 - 30', '31 - 60', '61 - 70', 'Above 70'],
      },
      {
        title: 'Gender',
        type: QuestionType.RADIO,
        isRequired: true,
        options: ['Male', 'Female', 'Other'],
      },
      {
        title: 'Employee/Campus ID',
        type: QuestionType.SHORT_TEXT,
        isRequired: true,
      },
      {
        title: 'Do you have any Chronic / Congenital illnesses?',
        type: QuestionType.RADIO,
        isRequired: true,
        options: yesNoOptions,
      },
      {
        title: 'If yes, please specify details',
        type: QuestionType.SHORT_TEXT,
        isRequired: false,
      },
    ]
  );

  // 2. Participants Category
  await createSurveySection(
    'Participants Category',
    'Select your professional role',
    [
      {
        title: 'Are you..',
        type: QuestionType.RADIO,
        isRequired: true,
        options: ['Student', 'Intern', 'Teaching staff', 'Non-teaching staff'],
      },
      {
        title: 'Are you? (For Non-teaching staff)',
        type: QuestionType.RADIO,
        isRequired: false,
        options: ['Nurse', 'Driver', 'Watchmen', 'Receptionist', 'Gardener', 'Cleaner'],
      },
    ]
  );

  // 3. Primary Screening: Chakshu Indriya (Eyes)
  await createSurveySection(
    'Primary Screening: Chakshu Indriya (Eyes)',
    'Initial visual assessment',
    [
      {
        title: 'Do you wear contact lenses or spectacles for vision correction?',
        type: QuestionType.RADIO,
        isRequired: true,
        options: yesNoOptions,
      },
      {
        title: 'Do you use digital devices (mobile phone, laptop, tablet, etc) for more than 4 hours per day?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: yesNoOptions,
      },
      {
        title: 'During the past 1 month, have you experienced any eye-related complaints such as eye strain, headache, blurred vision, watering, burning sensation, or dryness of eyes?',
        type: QuestionType.RADIO,
        isRequired: true,
        options: yesNoOptions,
      },
    ]
  );

  // 4. Primary Screening: Ghranendriya (Nose)
  await createSurveySection(
    'Primary Screening: Ghranendriya (Nose)',
    'Initial smell and nasal assessment',
    [
      {
        title: 'Do you experience frequent nasal blockage or obstruction?',
        type: QuestionType.RADIO,
        isRequired: true,
        options: yesNoOptions,
      },
      {
        title: 'Have you noticed any reduction or loss in your ability to smell?',
        type: QuestionType.RADIO,
        isRequired: true,
        options: yesNoOptions,
      },
      {
        title: 'Do you experience frequent nasal dryness, irritation or recurrent sneezing without a cold?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: yesNoOptions,
      },
    ]
  );

  // 5. Primary Screening: Rasanendriya (Tongue)
  await createSurveySection(
    'Primary Screening: Rasanendriya (Tongue)',
    'Initial taste assessment',
    [
      {
        title: 'Do you have difficulty identifying any of the six tastes (sweet, sour, salty, bitter, pungent, astringent)?',
        type: QuestionType.RADIO,
        isRequired: true,
        options: yesNoOptions,
      },
      {
        title: 'If yes, then which taste?',
        type: QuestionType.SHORT_TEXT,
        isRequired: false,
      },
    ]
  );

  // 6. Primary Screening: Sparshanendriya (Skin)
  await createSurveySection(
    'Primary Screening: Sparshanendriya (Skin)',
    'Initial skin health assessment',
    [
      {
        title: 'Do you suffer from any chronic skin disorders (itching, allergy, Psoriasis, etc)?',
        type: QuestionType.RADIO,
        isRequired: true,
        options: yesNoOptions,
      },
      {
        title: 'If yes, then what?',
        type: QuestionType.SHORT_TEXT,
        isRequired: false,
      },
      {
        title: 'Do you have any known skin allergy or sensitivity?',
        type: QuestionType.RADIO,
        isRequired: true,
        options: ['None', 'Dust', 'Cosmetics / skincare products', 'Soaps/detergents', 'Metals/jewellery', 'Food-related', 'Other'],
      },
    ]
  );

  // 7. Primary Screening: Karnendriya (Ears)
  await createSurveySection(
    'Primary Screening: Karnendriya (Ears)',
    'Initial hearing and ear assessment',
    [
      {
        title: 'Do you use earphones/ headphones for more than 2 hours per day, or listen to music at high volume?',
        type: QuestionType.RADIO,
        isRequired: true,
        options: yesNoOptions,
      },
      {
        title: 'Are you frequently exposed to loud environments? Eg-Traffic, construction, factory, gym, concerts, loudTV.',
        type: QuestionType.RADIO,
        isRequired: true,
        options: yesNoOptions,
      },
      {
        title: 'During the past 1 month, have you experienced any ear related complaint such as ringing in ears, reduced hearing, ear pain, itching, discharge, blocked sensation or frequent ear infections?',
        type: QuestionType.RADIO,
        isRequired: true,
        options: yesNoOptions,
      },
      {
        title: 'Are you sensitive to loud noise?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: yesNoOptions,
      },
    ]
  );

  // 8. Detailed Assessment of Chakshu Indriya (Eyes)
  await createSurveySection(
    'Detailed Assessment of Chakshu Indriya',
    'Detailed analysis of visual health',
    [
      {
        title: 'Which of the following symptoms do you experience most frequently?',
        type: QuestionType.CHECKBOX,
        isRequired: false,
        options: ['Eyestrain', 'Headache', 'Blurred vision', 'Burning sensation', 'Watering of eyes', 'Dryness of eyes', 'Other'],
      },
      {
        title: 'When do the symptoms usually occur?',
        type: QuestionType.CHECKBOX,
        isRequired: false,
        options: ['During studying', 'During mobile/laptop use', 'During night-time reading', 'After prolonged screen exposure', 'Other'],
      },
      {
        title: 'How often do you take breaks while using digital devices?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: ['Every 20 to 30 minutes', 'Every 1 hour', 'Occasionally', 'Rarely', 'Never'],
      },
      {
        title: 'Do your symptoms improve after resting your eyes?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: yesNoOptions,
      },
      {
        title: 'Have you gone under any eye examination within the last 6 months?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: yesNoOptions,
      },
    ]
  );

  // 9. Detailed Assessment of Ghranendriya (Nose)
  await createSurveySection(
    'Detailed Assessment of Ghranendriya',
    'Detailed analysis of nasal and smell health',
    [
      {
        title: 'Do you experience frequent or constant cold (running nose/nasal congestion)?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you have difficulty identifying or recognising familiar smells correctly?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do strong smells Trigger excessive sneezing (hypersensitivity to smell)?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Are you frequently exposed to hot air followed immediately by cold air, or vice versa?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often are you exposed to perfumes / incense / room fresheners/smoke/chemical fumes /dust / pollen?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
    ]
  );

  // 10. Detailed Assessment of Rasanendriya (Tongue)
  await createSurveySection(
    'Detailed Assessment of Rasanendriya',
    'Detailed analysis of taste and tongue health',
    [
      {
        title: 'How often do you have mouth ulcers?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do you clean your tongue using a tongue scraper or cleaner?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do you experience loss of Taste?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do you notice a coating on your tongue?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
    ]
  );

  // 11. Detailed Assessment of Sparshanendriya (Skin)
  await createSurveySection(
    'Detailed Assessment of Sparshanendriya',
    'Detailed analysis of skin health and tactile sensitivity',
    [
      {
        title: 'Can you easily distinguish hot, cold, rough, and smooth objects by touch?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: yesNoOptions,
      },
      {
        title: 'Do you experience any of the following?',
        type: QuestionType.CHECKBOX,
        isRequired: false,
        options: ['Numbness', 'Tingling', 'Burning sensation', 'Excessive sensitivity'],
      },
      {
        title: 'How frequently do you expose your skin to extreme weather (sun, cold, wind)?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you regularly use very hot or cold water for bathing?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Have you made any lifestyle modification to subside your problem?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: yesNoOptions,
      },
    ]
  );

  // 12. Detailed Assessment of Karna Indriya (Ears)
  await createSurveySection(
    'Detailed Assessment of Karna Indriya',
    'Detailed analysis of auditory health',
    [
      {
        title: 'Which of the following symptoms do you experience most frequently? (choose multiple)',
        type: QuestionType.CHECKBOX,
        isRequired: false,
        options: [
          'Tinnitus / ringing, buzzing, or whistling in ears',
          'Reduced hearing/ difficulty understanding speech',
          'Ear pain or discomfort',
          'Itching inside ears',
          'Ear discharge or foul smell',
          'Blocked sensation/feeling of fullness in ear',
          'Vertigo / dizziness with ear complaints',
          'Frequent ear infections',
          'Other',
        ],
      },
      {
        title: 'When do these symptoms usually occur? (choose multiple)',
        type: QuestionType.CHECKBOX,
        isRequired: false,
        options: [
          'After using earphones /headphones',
          'After exposure to loud noise',
          'During travel/ flights /altitude change',
          'At night when surroundings are quiet',
          'During cold, cough, or sinus issues',
          'After cleaning ears with buds/pin',
          'Other',
        ],
      },
      {
        title: 'How do you maintain ear hygiene?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: [
          'Cotton buds daily',
          'Cotton buds occasionally',
          'Ear drops as advised by doctor',
          'Professional cleaning only',
          'Rarely clean ears',
          'Other',
        ],
      },
      {
        title: 'Do your symptoms improve after avoiding noise or taking rest?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: yesNoOptions,
      },
      {
        title: 'Have you undergone an audiometry/hearing test or ENT examination Within the last 6 months?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: yesNoOptions,
      },
    ]
  );

  // 13. Nurse Assessment
  await createSurveySection(
    'Professional Assessment: Nurse',
    'Sensory health challenges related to nursing profession',
    [
      {
        title: 'Do you experience frequent eye strain, blurred vision, or headaches, after long working hours?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you have difficulty hearing conversations, or do you experience ringing (tinnitus) or discomfort in your ears?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you frequently experience nasal blockage, dryness, irritation or recurrent sneezing while on duty?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Have you noticed any reduction or alteration in your sense of smell?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Have you noticed any reduction or alteration in your sense of taste?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you have itching, Rashes, dryness, irritation or numbness of the skin particularly after using glove, sanitizer or disinfectants?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Are you regularly exposed to bright lights, strong chemicals, odours or disinfectants during your duties?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you use appropriate protective measures (e.g, gloves, mask, etc) whenever indicated?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you follow proper sanitary precautions while on duty?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Which sense organ do you feel is most affected by your profession?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: ['Eyes (chakshu)', 'Ears (shrotra)', 'Nose (ghrana)', 'Tongue (rasana)', 'Skin/touch (sparshana)'],
      },
    ]
  );

  // 14. Driver Assessment
  await createSurveySection(
    'Professional Assessment: Driver',
    'Sensory health challenges related to driving profession',
    [
      {
        title: 'Do you experience eye strain or tiredness while driving?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do bright headlights from oncoming vehicles cause difficulty during night driving?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you experience blurred vision or difficulty reading road signs while driving?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Are you frequently exposed to loud traffic noise or horns?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you experience ringing or buzzing sounds in your ears after long hours of driving?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Are you frequently exposed to dust, smoke, or vehicle exhaust fumes while driving?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you experience sneezing, nasal irritation, or nasal blockage while driving?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you experience dryness of mouth or excessive thirst during long drives?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you experience numbness, tingling or reduced sensation in your hands during prolonged driving?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Which sense organ do you feel is most affected by your profession?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: ['Eyes (chakshu)', 'Ears(shrotra)', 'Nose (ghrana)', 'Tongue(rasana)', 'Skin/touch (sparshana)'],
      },
    ]
  );

  // 15. Watchmen Assessment
  await createSurveySection(
    'Professional Assessment: Watchmen',
    'Sensory health challenges related to security profession',
    [
      {
        title: 'Do you experience difficulty seeing clearly especially during night duty or in dim light?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you have difficulty hearing conversations, alarms, or vehicle horns while on duty?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you frequently experience nasal blockage, reduced sense of smell, repeated sneezing?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you experience any of the following frequently?',
        type: QuestionType.CHECKBOX,
        isRequired: false,
        options: ['Itching', 'Numbness', 'Excessive sweating', 'Reduced sensation in your hands or feet'],
      },
      {
        title: 'Do you often feel stressed, anxious, or mentally exhausted because of your work schedule?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you get 6 to 8 hours of sleep regularly despite your work shifts?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you spend long hours continuously looking at CCTV screen or mobile phones leading to eye strain or headaches?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you undergo regular eye or General Health checkups to assess your sensory health?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: yesNoOptions,
      },
      {
        title: 'Are you aware of and do you practice any Ayurvedic or Healthy lifestyle measures (such as proper eye care Anjana, nasya, meditation, or yoga) to maintain the health of your sense organs and mind?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Which sense organ do you feel is most affected by your profession?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: ['Eyes(chakshu)', 'Ears(shrotra)', 'Nose(ghrana)', 'Tongue (rasana)', 'Touch/skin(sparshana)'],
      },
    ]
  );

  // 16. Receptionist Assessment
  await createSurveySection(
    'Professional Assessment: Receptionist',
    'Sensory health challenges related to receptionist profession',
    [
      {
        title: 'Do you experience eye strain or tiredness after prolonged computer use?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you experience dryness, watering, or irritation of the eyes during work?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you have difficulty reading text on the computer screen or documents ?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Are you frequently exposed to loud conversations , phone ringing, or background noise at work?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you experience ringing, buzzing or discomfort in your ears after work?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Are you exposed to strong perfumes, air freshener, or cleaning chemicals at your workplace?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you experience sneezing, nasal irritation, or nasal blockage while at work?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you experience dryness of mouth or throat due to prolonged speaking during work hours?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you experience numbness, tingling or discomfort in your hands due to typing or writing?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Which sense organ do you feel is most affected by your profession?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: ['Eyes(chakshu)', 'Ears(shrotra)', 'Nose(ghrana)', 'Tongue (rasana)', 'Skin/touch (sparshana)'],
      },
    ]
  );

  // 17. Gardener Assessment
  await createSurveySection(
    'Professional Assessment: Gardener',
    'Sensory health challenges related to gardening profession',
    [
      {
        title: 'Do you experience eye irritation while gardening?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you wash your eyes after completing gardening work?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you experience sneezing or nasal irritation during gardening?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you develop skin itching, rashes, cuts or allergies after gardening?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you wear gloves while handling plants, soil, or chemicals?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you wash your hand and feet immediately after gardening?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Have you experienced insect bites or thorn injuries during work?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you regularly use loud gardening machinery?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you experience ringing in the ears or difficulty hearing after work?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Which sense organ do you feel is most affected by your work?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: ['Eyes', 'Nose', 'Skin', 'Ears', 'Tongue'],
      },
    ]
  );

  // 18. Sweepers and Cleaners Assessment
  await createSurveySection(
    'Professional Assessment: Sweepers & Cleaners',
    'Sensory health challenges related to cleaning profession',
    [
      {
        title: 'Do you experience eye irritation or watering due to dust smoke or cleaning chemicals?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you rinse or wash your eyes after work?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: yesNoOptions,
      },
      {
        title: 'Do you use eye protection such as goggle while handling Chemicals or sweeping dry areas?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you experience sneezing, nasal blockage, or nasal irritation during work?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Are you exposed to strong smells from garbage, drains, toilets or cleaning chemicals?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you wear a mask while sweeping or mopping?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you develop skin itching, rashes, dryness, or cut after cleaning work?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: yesNoOptions,
      },
      {
        title: 'Do you handle garbage, dirty water, or Chemicals with bare hands?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Have you had insect bites, needle pricks, or injuries from Broken Glass while cleaning?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: yesNoOptions,
      },
      {
        title: 'Do you use loud machine such as vacuum cleaners, blowers, or scrubbers?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: yesNoOptions,
      },
      {
        title: 'Do you experience ringing in the ears or difficulty hearing after using them?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you feel a chemical or metallic taste in your mouth during/ after work?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you eat or drink without washing your hands after cleaning?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: yesNoOptions,
      },
      {
        title: 'Which sense organ do you feel is most affected by your work?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: ['Eyes', 'Ears', 'Nose', 'Skin', 'Tongue'],
      },
    ]
  );

  // 19. Manas Assessment
  await createSurveySection(
    'MANAS ASSESSMENT',
    'Mental Alertness, Memory and Concentration Assessment',
    [
      {
        title: 'How would you rate your memory in real life?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: ratingOptions,
      },
      {
        title: 'How would you rate your ability to concentrate on a task?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: ratingOptions,
      },
      {
        title: 'Overall do you feel mentally alert and attentive during the day?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do you forget where you keep commonly used items (e.g, keys, mobile phones, spectacles, etc)',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do you lose track of what you were doing while performing a task?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do you need reminders to complete your daily activities or important task?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do you find it difficult to remember information without using your mobile phone or writing it down?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do you have difficulty recalling something you learned or heard recently?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do you find it difficult to stay focused on a single task until it is completed?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'After using digital devices for a long time, how often do you feel mentally tired or unable to concentrate?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do you make mistakes because you were not paying enough attention?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Compared to a few years ago how would you describe your memory and concentration?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: ['Much better', 'Slightly better', 'About the same', 'Slightly worse', 'Much worse'],
      },
      {
        title: 'How often do you feel that poor sleep affects your memory or concentration?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do stress or anxiety make it difficult for you to concentrate?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'Do you regularly practice activities such as meditation, yoga, pranayama or other relaxation techniques to improve mental well-being?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
    ]
  );

  // 20. Risk Factors / Causative Factors
  await createSurveySection(
    'RISK FACTORS / CAUSATIVE FACTORS',
    'General lifestyle and environmental risk factors',
    [
      {
        title: 'How often do you consume unhealthy or processed foods?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do you skip meals or eat at irregular timings?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do you sleep for less than 7 hours?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do you use digital devices continuously for more than 4 hours?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often are you exposed to dust, smoke, loud noise, or chemical pollutants?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do you experience mental stress?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
      {
        title: 'How often do you engage in regular physical activity or exercise?',
        type: QuestionType.RADIO,
        isRequired: false,
        options: frequencyOptions,
      },
    ]
  );

  console.log('🎉 Ayurgram 3.0 Survey seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
