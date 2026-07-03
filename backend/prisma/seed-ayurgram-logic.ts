import { PrismaClient, LogicOperator, LogicAction } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Ayurgram 3.0 Survey Branching Logic...');

  // Fetch the survey
  const survey = await prisma.survey.findUnique({
    where: { slug: 'ayurgram-3-0' },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { questions: { orderBy: { order: 'asc' } } },
      },
    },
  });

  if (!survey) {
    throw new Error('Ayurgram 3.0 survey not found! Please run the survey seed first.');
  }

  // Clear existing logic rules for this survey
  await prisma.surveyLogic.deleteMany({
    where: { surveyId: survey.id },
  });
  console.log('🗑️ Cleared old logic rules.');

  // Helper map to find sections and questions easily
  const getSection = (titleStart: string) => {
    const sec = survey.sections.find((s) => s.title.toLowerCase().startsWith(titleStart.toLowerCase()));
    if (!sec) throw new Error(`Section starting with "${titleStart}" not found.`);
    return sec;
  };

  const getQuestion = (sectionTitleStart: string, titleStart: string) => {
    const sec = getSection(sectionTitleStart);
    const q = sec.questions.find((q) => q.title.toLowerCase().startsWith(titleStart.toLowerCase()));
    if (!q) throw new Error(`Question starting with "${titleStart}" in section "${sectionTitleStart}" not found.`);
    return q;
  };

  // Define section references
  const secChakshuPrimary = getSection('Primary Screening: Chakshu');
  const secGhranaPrimary = getSection('Primary Screening: Ghranendriya');
  const secRasanaPrimary = getSection('Primary Screening: Rasanendriya');
  const secSparshaPrimary = getSection('Primary Screening: Sparshanendriya');
  const secKarnaPrimary = getSection('Primary Screening: Karnendriya');

  const secChakshuDetailed = getSection('Detailed Assessment of Chakshu');
  const secGhranaDetailed = getSection('Detailed Assessment of Ghranendriya');
  const secRasanaDetailed = getSection('Detailed Assessment of Rasanendriya');
  const secSparshaDetailed = getSection('Detailed Assessment of Sparshanendriya');
  const secKarnaDetailed = getSection('Detailed Assessment of Karna Indriya');

  const secNurse = getSection('Professional Assessment: Nurse');
  const secDriver = getSection('Professional Assessment: Driver');
  const secWatchmen = getSection('Professional Assessment: Watchmen');
  const secReceptionist = getSection('Professional Assessment: Receptionist');
  const secGardener = getSection('Professional Assessment: Gardener');
  const secSweeper = getSection('Professional Assessment: Sweepers');
  const secManas = getSection('MANAS ASSESSMENT');

  // Define question references
  const qRole = getQuestion('Participants Category', 'Are you..');
  const qProfession = getQuestion('Participants Category', 'Are you? (For Non-teaching');

  const qChakshuPrimary3 = getQuestion('Primary Screening: Chakshu', 'During the past 1 month');
  const qGhranaPrimary1 = getQuestion('Primary Screening: Ghranendriya', 'Do you experience frequent nasal blockage');
  const qGhranaPrimary2 = getQuestion('Primary Screening: Ghranendriya', 'Have you noticed any reduction or loss');
  const qGhranaPrimary3 = getQuestion('Primary Screening: Ghranendriya', 'Do you experience frequent nasal dryness');
  const qRasanaPrimary = getQuestion('Primary Screening: Rasanendriya', 'Do you have difficulty identifying any of the six');
  const qSparshaPrimary = getQuestion('Primary Screening: Sparshanendriya', 'Do you suffer from any chronic skin disorders');
  
  const qKarnaPrimary1 = getQuestion('Primary Screening: Karnendriya', 'Do you use earphones');
  const qKarnaPrimary2 = getQuestion('Primary Screening: Karnendriya', 'Are you frequently exposed to loud');
  const qKarnaPrimary3 = getQuestion('Primary Screening: Karnendriya', 'During the past 1 month');
  const qKarnaPrimary4 = getQuestion('Primary Screening: Karnendriya', 'Are you sensitive to loud');

  // Detailed last questions
  const qChakshuDetailedLast = getQuestion('Detailed Assessment of Chakshu', 'Have you gone under any eye');
  const qGhranaDetailedLast = getQuestion('Detailed Assessment of Ghranendriya', 'How often are you exposed to perfumes');
  const qRasanaDetailedLast = getQuestion('Detailed Assessment of Rasanendriya', 'How often do you notice a coating');
  const qSparshaDetailedLast = getQuestion('Detailed Assessment of Sparshanendriya', 'Have you made any lifestyle');
  const qKarnaDetailedLast = getQuestion('Detailed Assessment of Karna Indriya', 'Have you undergone an audiometry');

  // Profession last questions
  const qNurseLast = getQuestion('Professional Assessment: Nurse', 'Which sense organ');
  const qDriverLast = getQuestion('Professional Assessment: Driver', 'Which sense organ');
  const qWatchmenLast = getQuestion('Professional Assessment: Watchmen', 'Which sense organ');
  const qReceptionistLast = getQuestion('Professional Assessment: Receptionist', 'Which sense organ');
  const qGardenerLast = getQuestion('Professional Assessment: Gardener', 'Which sense organ');
  const qSweeperLast = getQuestion('Professional Assessment: Sweepers', 'Which sense organ');

  let order = 1;

  // Helper to add a logic entry
  const addLogic = (conditionQId: string, value: string, targetSecId: string) => {
    return prisma.surveyLogic.create({
      data: {
        surveyId: survey.id,
        conditionQuestionId: conditionQId,
        operator: LogicOperator.EQUALS,
        conditionValue: value,
        action: LogicAction.JUMP_TO_SECTION,
        targetSectionId: targetSecId,
        order: order++,
      },
    });
  };

  const addLogicNotEmpty = (conditionQId: string, targetSecId: string) => {
    return prisma.surveyLogic.create({
      data: {
        surveyId: survey.id,
        conditionQuestionId: conditionQId,
        operator: LogicOperator.IS_NOT_EMPTY,
        conditionValue: '',
        action: LogicAction.JUMP_TO_SECTION,
        targetSectionId: targetSecId,
        order: order++,
      },
    });
  };

  console.log('🔄 Creating logic rules...');

  // ==========================================
  // SECTION 2 (Participants Category) RULES
  // ==========================================
  // If role is Student/Intern/Teaching staff -> Jump to Chakshu Primary (skipping profession choice)
  await addLogic(qRole.id, 'student', secChakshuPrimary.id);
  await addLogic(qRole.id, 'intern', secChakshuPrimary.id);
  await addLogic(qRole.id, 'teaching_staff', secChakshuPrimary.id);

  // If role is Non-teaching staff -> Jump to their selected profession section
  await addLogic(qProfession.id, 'nurse', secNurse.id);
  await addLogic(qProfession.id, 'driver', secDriver.id);
  await addLogic(qProfession.id, 'watchmen', secWatchmen.id);
  await addLogic(qProfession.id, 'receptionist', secReceptionist.id);
  await addLogic(qProfession.id, 'gardener', secGardener.id);
  await addLogic(qProfession.id, 'cleaner', secSweeper.id);

  // ==========================================
  // SECTION 3 (Chakshu Primary) RULES
  // ==========================================
  // If eye complaints == yes -> Go to Chakshu Detailed (default next is Ghrana Primary, so we jump to Detailed)
  await addLogic(qChakshuPrimary3.id, 'yes', secChakshuDetailed.id);
  // Else (no complaints) -> Jump to Ghrana Primary (skipping Chakshu Detailed)
  await addLogic(qChakshuPrimary3.id, 'no', secGhranaPrimary.id);

  // At the end of Chakshu Detailed -> Jump to Ghrana Primary
  await addLogicNotEmpty(qChakshuDetailedLast.id, secGhranaPrimary.id);

  // ==========================================
  // SECTION 4 (Ghrana Primary) RULES
  // ==========================================
  // If any nasal complaint is Yes -> Jump to Ghrana Detailed
  await addLogic(qGhranaPrimary1.id, 'yes', secGhranaDetailed.id);
  await addLogic(qGhranaPrimary2.id, 'yes', secGhranaDetailed.id);
  await addLogic(qGhranaPrimary3.id, 'yes', secGhranaDetailed.id);
  // Else (all No) -> Jump to Rasana Primary (skipping Ghrana Detailed)
  // Since we check the last question of Ghrana Primary, if it is 'no', and we didn't jump from Q1 or Q2, jump to Rasana Primary
  await addLogic(qGhranaPrimary3.id, 'no', secRasanaPrimary.id);

  // At the end of Ghrana Detailed -> Jump to Rasana Primary
  await addLogicNotEmpty(qGhranaDetailedLast.id, secRasanaPrimary.id);

  // ==========================================
  // SECTION 5 (Rasana Primary) RULES
  // ==========================================
  // If taste complaint == yes -> Jump to Rasana Detailed
  await addLogic(qRasanaPrimary.id, 'yes', secRasanaDetailed.id);
  // Else -> Jump to Sparsha Primary
  await addLogic(qRasanaPrimary.id, 'no', secSparshaPrimary.id);

  // At the end of Rasana Detailed -> Jump to Sparsha Primary
  await addLogicNotEmpty(qRasanaDetailedLast.id, secSparshaPrimary.id);

  // ==========================================
  // SECTION 6 (Sparsha Primary) RULES
  // ==========================================
  // If skin complaint == yes -> Jump to Sparsha Detailed
  await addLogic(qSparshaPrimary.id, 'yes', secSparshaDetailed.id);
  // Else -> Jump to Karna Primary
  await addLogic(qSparshaPrimary.id, 'no', secKarnaPrimary.id);

  // At the end of Sparsha Detailed -> Jump to Karna Primary
  await addLogicNotEmpty(qSparshaDetailedLast.id, secKarnaPrimary.id);

  // ==========================================
  // SECTION 7 (Karna Primary) RULES
  // ==========================================
  // We need to route participants based on:
  // 1. If they have ear complaints -> Detailed Karna
  // 2. If they do NOT have ear complaints:
  //    - If they are Student/Intern/Teaching -> MANAS ASSESSMENT
  //    - If they are Non-teaching -> Their specific profession section
  
  // Rule: If they have complaints, go to Detailed Karna
  await addLogic(qKarnaPrimary1.id, 'yes', secKarnaDetailed.id);
  await addLogic(qKarnaPrimary2.id, 'yes', secKarnaDetailed.id);
  await addLogic(qKarnaPrimary3.id, 'yes', secKarnaDetailed.id);
  await addLogic(qKarnaPrimary4.id, 'yes', secKarnaDetailed.id);

  // If no complaints (i.e., we evaluate the last question Q23/qKarnaPrimary4 as 'no')
  // We check their professional role to jump to the right place:
  await prisma.surveyLogic.create({
    data: {
      surveyId: survey.id,
      conditionQuestionId: qKarnaPrimary4.id,
      operator: LogicOperator.EQUALS,
      conditionValue: 'no',
      action: LogicAction.JUMP_TO_SECTION,
      targetSectionId: secManas.id, // Default to Manas for Students/Interns/Teaching (who have empty qProfession)
      order: order++,
    },
  });

  // For non-teaching staff with 'no' ear complaints, route to their specific profession
  // (We use qProfession.id to jump to their specific profession section)
  await addLogic(qProfession.id, 'nurse', secNurse.id);
  await addLogic(qProfession.id, 'driver', secDriver.id);
  await addLogic(qProfession.id, 'watchmen', secWatchmen.id);
  await addLogic(qProfession.id, 'receptionist', secReceptionist.id);
  await addLogic(qProfession.id, 'gardener', secGardener.id);
  await addLogic(qProfession.id, 'cleaner', secSweeper.id);

  // ==========================================
  // SECTION 12 (Detailed Karna) RULES
  // ==========================================
  // At the end of Detailed Karna, jump to their profession section or Manas
  // Default to Manas (for students/interns/teaching staff)
  await prisma.surveyLogic.create({
    data: {
      surveyId: survey.id,
      conditionQuestionId: qKarnaDetailedLast.id,
      operator: LogicOperator.IS_NOT_EMPTY,
      conditionValue: '',
      action: LogicAction.JUMP_TO_SECTION,
      targetSectionId: secManas.id,
      order: order++,
    },
  });

  // For non-teaching staff, override default jump to go to their profession
  await addLogic(qProfession.id, 'nurse', secNurse.id);
  await addLogic(qProfession.id, 'driver', secDriver.id);
  await addLogic(qProfession.id, 'watchmen', secWatchmen.id);
  await addLogic(qProfession.id, 'receptionist', secReceptionist.id);
  await addLogic(qProfession.id, 'gardener', secGardener.id);
  await addLogic(qProfession.id, 'cleaner', secSweeper.id);

  // ==========================================
  // END OF PROFESSIONAL SECTIONS RULES
  // ==========================================
  // At the end of every professional section, jump directly to Manas Assessment
  await addLogicNotEmpty(qNurseLast.id, secManas.id);
  await addLogicNotEmpty(qDriverLast.id, secManas.id);
  await addLogicNotEmpty(qWatchmenLast.id, secManas.id);
  await addLogicNotEmpty(qReceptionistLast.id, secManas.id);
  await addLogicNotEmpty(qGardenerLast.id, secManas.id);
  await addLogicNotEmpty(qSweeperLast.id, secManas.id);

  console.log('🎉 Seeding Ayurgram 3.0 Survey Branching Logic completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding logic failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
