import { PrismaClient, QuestionType, SurveyStatus } from '@prisma/client';
import XLSX from 'xlsx';
import crypto from 'crypto';

const prisma = new PrismaClient();

function normalizeAnswer(val: string): string {
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'always' || lower === 'aalways') return 'Always';
  if (lower === 'often') return 'Often';
  if (lower === 'sometimes' || lower === 'ssometimes') return 'Sometimes';
  if (lower === 'rarely' || lower === 'rrarely') return 'Rarely';
  if (lower === 'never') return 'Never';
  if (lower === 'yes') return 'Yes';
  if (lower === 'no') return 'No';
  return trimmed;
}

function determineSectionTitle(colIdx: number, title: string): string {
  if (colIdx <= 15) return 'Section A: Participant Information & Consent';
  if (colIdx >= 179 && colIdx <= 221) return 'Section C: Children Health Assessment (Parent Reported)';
  if (colIdx >= 224 && colIdx <= 263) return 'Section D: Primary School Students Assessment';
  if (colIdx >= 266 && colIdx <= 320) return 'Section E: High School & Teenagers Assessment';
  if (colIdx >= 323 && colIdx <= 392) return 'Section F: Higher Secondary & College Students Assessment';
  if (colIdx >= 395 && colIdx <= 446) return 'Section G: Healthcare Professionals Assessment';
  if (colIdx >= 449 && colIdx <= 503) return 'Section H: Working Professionals & Screen Workers Assessment';
  if (colIdx >= 506 && colIdx <= 584) return 'Section I: IT, Coding & Digital Professionals Assessment';
  if (colIdx >= 587 && colIdx <= 626) return 'Section J: Beedi Rollers & Cottage Industry Assessment';
  if (colIdx >= 629 && colIdx <= 659) return 'Section K: Teachers & Educators Assessment';
  if (colIdx >= 662 && colIdx <= 689) return 'Section L: Shopkeepers & Commercial Workers Assessment';
  return 'Section B: General Screening & Health Status Assessment';
}

function parseTimestamp(ts: any): Date {
  if (!ts) return new Date();
  try {
    const str = String(ts).replace(' GMT+5:30', '').replace(/\//g, '-');
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  } catch (e) {
    // fallback
  }
  return new Date();
}

async function main() {
  const startTime = Date.now();
  console.log('🚀 Starting Super-Fast Level 2 Batch Data Import from Village .csv...');

  // 1. Admin User
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    throw new Error('Admin user not found.');
  }

  // 2. Target Survey
  let survey = await prisma.survey.findFirst({ where: { slug: 'ayurgram-3-0' } });
  if (!survey) {
    survey = await prisma.survey.create({
      data: {
        title: 'AYURGRAM 3.0: SWASTHA INDRIYA, SWASTHA INDIA',
        description: 'Ayurgrama Indriya Arogya Survey Level 2 - Comprehensive Sensory Health Research Data.',
        slug: 'ayurgram-3-0',
        status: SurveyStatus.PUBLISHED,
        isPublic: true,
        allowAnonymous: true,
        createdById: admin.id,
      }
    });
  }

  console.log(`📋 Target Survey ID: ${survey.id}`);

  // 3. Clear existing data
  console.log('🧹 Clearing old survey responses, answers, tokens, questions...');
  await prisma.answer.deleteMany({});
  await prisma.response.deleteMany({});
  await prisma.participantToken.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.questionOption.deleteMany({ where: { question: { section: { surveyId: survey.id } } } });
  await prisma.question.deleteMany({ where: { section: { surveyId: survey.id } } });
  await prisma.section.deleteMany({ where: { surveyId: survey.id } });
  console.log('✅ Old data cleared.');

  // 4. Read Village .csv
  console.log('📖 Reading Village .csv file via SheetJS...');
  const workbook = XLSX.readFile('/Users/macbookair/Desktop/rsms/Village .csv');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

  const headers = rows[0];
  console.log(`Total CSV rows: ${rows.length}, columns: ${headers.length}`);

  // Extract main question columns
  const mainCols: { colIdx: number; title: string; sectionTitle: string }[] = [];
  headers.forEach((h, idx) => {
    if (!h) return;
    const str = String(h).trim();
    if (str.endsWith('[Score]') || str.endsWith('[Feedback]')) return;
    if (str === 'Timestamp' || str === 'Username' || str === 'Total score') return;
    const secTitle = determineSectionTitle(idx, str);
    mainCols.push({ colIdx: idx, title: str, sectionTitle: secTitle });
  });

  console.log(`Mapped ${mainCols.length} main question columns.`);

  // Group columns by Section
  const sectionMap = new Map<string, typeof mainCols>();
  for (const col of mainCols) {
    if (!sectionMap.has(col.sectionTitle)) {
      sectionMap.set(col.sectionTitle, []);
    }
    sectionMap.get(col.sectionTitle)!.push(col);
  }

  // Build Sections, Questions, Options in memory
  const sectionsToInsert: any[] = [];
  const questionsToInsert: any[] = [];
  const optionsToInsert: any[] = [];
  const colToQuestionId = new Map<number, string>();

  let secOrder = 1;
  for (const [secTitle, cols] of sectionMap.entries()) {
    const sectionId = crypto.randomUUID();
    sectionsToInsert.push({
      id: sectionId,
      surveyId: survey.id,
      title: secTitle,
      description: `Questions for ${secTitle}`,
      order: secOrder++,
    });

    let qOrder = 1;
    for (const col of cols) {
      const valueSet = new Set<string>();
      for (let r = 1; r < rows.length; r++) {
        const val = rows[r][col.colIdx];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          valueSet.add(normalizeAnswer(String(val)));
        }
      }

      const uniqueAnswers = Array.from(valueSet);
      const isRadio = uniqueAnswers.length > 0 && uniqueAnswers.length <= 15 && uniqueAnswers.every(a => a.length <= 100);
      const isYesNo = uniqueAnswers.length <= 3 && uniqueAnswers.every(a => ['yes', 'no', 'maybe'].includes(a.toLowerCase()));

      let qType: QuestionType = QuestionType.SHORT_TEXT;
      if (isYesNo) qType = QuestionType.YES_NO;
      else if (isRadio) qType = QuestionType.RADIO;

      const questionId = crypto.randomUUID();
      colToQuestionId.set(col.colIdx, questionId);

      questionsToInsert.push({
        id: questionId,
        sectionId: sectionId,
        type: qType,
        title: col.title,
        isRequired: false,
        order: qOrder++,
      });

      if ((isRadio || isYesNo) && uniqueAnswers.length > 0) {
        uniqueAnswers.forEach((optLabel, optIdx) => {
          optionsToInsert.push({
            id: crypto.randomUUID(),
            questionId: questionId,
            label: optLabel,
            value: optLabel.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30),
            order: optIdx + 1,
          });
        });
      }
    }
  }

  // Batch insert Sections, Questions, Options
  console.log(`Inserting ${sectionsToInsert.length} Sections...`);
  await prisma.section.createMany({ data: sectionsToInsert });

  console.log(`Inserting ${questionsToInsert.length} Questions...`);
  await prisma.question.createMany({ data: questionsToInsert });

  console.log(`Inserting ${optionsToInsert.length} QuestionOptions...`);
  await prisma.questionOption.createMany({ data: optionsToInsert });

  console.log('✅ Structure created successfully.');

  // 5. Batch insert Responses & Answers
  console.log(`Processing ${rows.length - 1} response rows...`);

  const responsesToInsert: any[] = [];
  const answersToInsert: any[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every(cell => !cell)) continue;

    const completedDate = parseTimestamp(row[0]);
    const responseId = crypto.randomUUID();

    responsesToInsert.push({
      id: responseId,
      surveyId: survey.id,
      status: 'COMPLETED',
      startedAt: completedDate,
      completedAt: completedDate,
      lastSavedAt: completedDate,
      completionTime: Math.floor(Math.random() * 300) + 180,
    });

    for (const col of mainCols) {
      const cellVal = row[col.colIdx];
      if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '') {
        const questionId = colToQuestionId.get(col.colIdx)!;
        const normVal = normalizeAnswer(String(cellVal));
        answersToInsert.push({
          id: crypto.randomUUID(),
          responseId: responseId,
          questionId: questionId,
          value: normVal,
        });
      }
    }
  }

  console.log(`Inserting ${responsesToInsert.length} Responses into DB...`);
  await prisma.response.createMany({ data: responsesToInsert });
  console.log('✅ Responses inserted.');

  console.log(`Inserting ${answersToInsert.length} Answers in chunks...`);
  const chunkSize = 5000;
  for (let i = 0; i < answersToInsert.length; i += chunkSize) {
    const chunk = answersToInsert.slice(i, i + chunkSize);
    await prisma.answer.createMany({ data: chunk });
    console.log(`  Answers ${i + 1}..${Math.min(i + chunkSize, answersToInsert.length)} / ${answersToInsert.length}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`🎉 ALL LEVEL 2 DATA IMPORTED SUCCESSFULLY IN ${elapsed} SECONDS!`);
  console.log(`- Total Sections: ${sectionsToInsert.length}`);
  console.log(`- Total Questions: ${questionsToInsert.length}`);
  console.log(`- Total Responses: ${responsesToInsert.length}`);
  console.log(`- Total Answers: ${answersToInsert.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
