import { PrismaClient, Question, QuestionType } from '@prisma/client';
import * as XLSX from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const filePath = path.resolve(__dirname, '../../Ayurgrama 3.0 (Responses).xlsx');
  console.log('📖 Reading Excel file:', filePath);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Read rows as array of arrays
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  if (rows.length < 2) {
    console.error('❌ Excel file contains no data rows!');
    return;
  }

  const headers = rows[0].map(h => String(h || '').trim());
  console.log(`📊 Found ${rows.length - 1} response rows and ${headers.length} columns.`);

  // Get the survey from database
  const survey = await prisma.survey.findUnique({
    where: { slug: 'ayurgram-3-0' },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { questions: { orderBy: { order: 'asc' } } }
      }
    }
  });

  if (!survey) {
    console.error('❌ Survey "ayurgram-3-0" not found in the database. Make sure it is seeded first!');
    return;
  }

  const dbQuestions = survey.sections.flatMap(s => s.questions);
  console.log(`🔍 Survey in DB has ${dbQuestions.length} questions.`);

  // Clear previous test responses and tokens to prevent key conflicts
  console.log('🧹 Clearing old response and token data...');
  await prisma.answer.deleteMany({});
  await prisma.response.deleteMany({});
  await prisma.participantToken.deleteMany({});
  console.log('✅ Cleared old database rows.');

  // Mapping columns directly by order:
  // Col 0: Timestamp
  // Col 1: Score
  // Col 2: Consent -> DB Q 0 (Consent)
  // Col 3 to Col 9 -> DB Q 1 to 7 (Participant Info & Category)
  // Col 10 to Col 48 -> DB Q 8 to 46 (Primary Screenings & Detailed Assessments)
  // Col 49: "You are.." -> Skipped (Placeholder text in Google Forms)
  // Col 50 to Col 135 -> DB Q 47 to 132 (Professional & Manas Assessments & Risk Factors)

  const columnMapping: { colIndex: number; question: Question }[] = [];

  // Group 1: Consent, Info, and Categories (Col 2 to 9 -> DB Q 0 to 7)
  for (let i = 0; i < 8; i++) {
    const colIndex = 2 + i;
    columnMapping.push({ colIndex, question: dbQuestions[i] });
  }

  // Group 2: Screenings & Detailed Assessments (Col 10 to 48 -> DB Q 8 to 46)
  for (let colIndex = 10; colIndex <= 48; colIndex++) {
    const dbIndex = 8 + (colIndex - 10);
    columnMapping.push({ colIndex, question: dbQuestions[dbIndex] });
  }

  // Group 3: Professional Assessments & Risk Factors (Col 50 to 135 -> DB Q 47 to 132)
  for (let colIndex = 50; colIndex <= 135; colIndex++) {
    const dbIndex = 47 + (colIndex - 50);
    columnMapping.push({ colIndex, question: dbQuestions[dbIndex] });
  }

  console.log(`✅ Successfully mapped ${columnMapping.length} columns to database questions by sequence.`);

  // Verify mappings
  console.log('📝 Mapping verification sample:');
  [0, 1, 5, 6, 7, 8, 46, 47, 125, 132].forEach(idx => {
    const map = columnMapping[idx];
    if (map) {
      console.log(`  - Excel Col ${map.colIndex} ("${headers[map.colIndex].slice(0, 45)}") -> DB Q ${dbQuestions.indexOf(map.question)} "${map.question.title.slice(0, 45)}"`);
    }
  });

  console.log('🚀 Importing responses into database...');

  let successCount = 0;

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row || row.length === 0) continue;

    // Convert Excel serial date to Date object
    let startedAt = new Date();
    const excelTimestamp = row[0];
    if (typeof excelTimestamp === 'number') {
      // Excel timestamps are days since 1900-01-01
      startedAt = new Date((excelTimestamp - 25569) * 86400 * 1000);
    }

    // Find the participant categories
    const roleCol = columnMapping[6]; // "Are you.."
    const profCol = columnMapping[7]; // "Are you? (For Non-teaching staff)"

    const roleValue = String(row[roleCol.colIndex] || '').trim();
    const profValue = profCol ? String(row[profCol.colIndex] || '').trim() : '';

    const ageCol = columnMapping[1];
    const genderCol = columnMapping[2];
    const idCol = columnMapping[3];

    const ageVal = ageCol ? String(row[ageCol.colIndex] || '') : '';
    const genderVal = genderCol ? String(row[genderCol.colIndex] || '') : '';
    const campusIdVal = idCol ? String(row[idCol.colIndex] || '').trim() : '';
    const cleanId = campusIdVal !== '' ? campusIdVal : `MOCK-${rowIndex}`;

    const mockEmail = `${roleValue.toLowerCase().replace(/[^a-z]/g, '')}_${cleanId.toLowerCase()}@rsms.edu`;

    // 1. Create Participant Token
    const expiresAt = new Date(startedAt);
    expiresAt.setDate(expiresAt.getDate() + 30);

    const participantToken = await prisma.participantToken.create({
      data: {
        surveyId: survey.id,
        email: mockEmail,
        expiresAt,
        createdAt: startedAt,
        lastSeenAt: startedAt,
      },
    });

    // 2. Create Response
    const response = await prisma.response.create({
      data: {
        surveyId: survey.id,
        participantTokenId: participantToken.id,
        status: 'COMPLETED',
        startedAt,
        completedAt: new Date(startedAt.getTime() + 8 * 60 * 1000), // Mock 8 min completion time
        completionTime: 480,
      },
    });

    // 3. Insert Answers for mapped columns
    const answersData: { responseId: string; questionId: string; value: any }[] = [];

    columnMapping.forEach(({ colIndex, question }) => {
      let value = row[colIndex];
      if (value === undefined || value === null || String(value).trim() === '') {
        return;
      }

      // Format values based on question types
      if (question.type === QuestionType.CHECKBOX || question.type === QuestionType.MULTIPLE_SELECT) {
        if (typeof value === 'string') {
          value = value.split(',').map(s => s.trim());
        } else {
          value = [String(value).trim()];
        }
      } else {
        value = String(value).trim();
      }

      // Standardize yes/no options
      if (['yes', 'no'].includes(String(value).toLowerCase())) {
        value = String(value).toLowerCase();
      }

      // Map categories to standard values
      if (question.title.startsWith('Are you..')) {
        const valLower = String(value).toLowerCase();
        if (valLower.includes('student')) value = 'student';
        else if (valLower.includes('intern')) value = 'intern';
        else if (valLower.includes('non')) value = 'non_teaching_staff';       // MUST come before 'teaching' check
        else if (valLower.includes('teaching')) value = 'teaching_staff';
      }

      if (question.title.includes('(For Non-teaching staff)')) {
        const valLower = String(value).toLowerCase();
        if (valLower.includes('nurse')) value = 'nurse';
        else if (valLower.includes('driver')) value = 'driver';
        else if (valLower.includes('watchman') || valLower.includes('watchmen')) value = 'watchmen';
        else if (valLower.includes('receptionist')) value = 'receptionist';
        else if (valLower.includes('gardener')) value = 'gardener';
        else if (valLower.includes('cleaner') || valLower.includes('sweeper')) value = 'cleaner';
      }

      answersData.push({
        responseId: response.id,
        questionId: question.id,
        value: value as any,
      });
    });

    // Insert all answers in bulk for this response
    if (answersData.length > 0) {
      await prisma.answer.createMany({
        data: answersData,
      });
    }

    successCount++;
    if (successCount % 50 === 0) {
      console.log(`⏳ Imported ${successCount} responses...`);
    }
  }

  console.log(`✅ Successfully imported all ${successCount} responses into the database!`);
}

main()
  .catch(e => {
    console.error('❌ Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
