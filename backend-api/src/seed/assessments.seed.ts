import { DataSource } from 'typeorm';
import { Assessment } from '../modules/assessments/entities/assessment.entity';
import { Question } from '../modules/assessments/entities/question.entity';
import { AnswerOption } from '../modules/assessments/entities/answer-option.entity';

const seedData = [
  {
    code: 'PHQ9',
    name: 'PHQ-9',
    description: 'Przesiewowa ocena nasilenia objawów depresyjnych',
    timeframe: 'Ostatnie 2 tygodnie',
    questionCount: 9,
    version: '1.0',
    questions: [
      { order: 1, theme: 'Brak zainteresowania', text: 'Brak zainteresowania lub przyjemności z wykonywanych czynności' },
      { order: 2, theme: 'Obniżony nastrój', text: 'Uczucie smutku, przygnębienia lub poczucie beznadziei' },
      { order: 3, theme: 'Sen', text: 'Problemy z zasypianiem lub snem, lub też przesypianie' },
      { order: 4, theme: 'Energia', text: 'Uczucie zmęczenia lub braku energii' },
      { order: 5, theme: 'Apetyt', text: 'Brak łaknienia lub przejadanie się' },
      { order: 6, theme: 'Poczucie własnej wartości', text: 'Poczucie winy lub małej wartości' },
      { order: 7, theme: 'Koncentracja', text: 'Trudności z koncentracją' },
      { order: 8, theme: 'Psychomotoryka', text: 'Spowolnienie lub nadmierne pobudzenie ruchowe' },
      { order: 9, theme: 'Myśli samouszkadzające', text: 'Myśli o tym, że lepiej byłoby umrzeć lub chęć samookaleczenia', reverseScored: false },
    ],
    answerOptions: [
      { value: 0, label: 'Wcale', order: 1 },
      { value: 1, label: 'Kilka dni', order: 2 },
      { value: 2, label: 'Więcej niż połowę dni', order: 3 },
      { value: 3, label: 'Niemal codziennie', order: 4 },
    ],
  },
  {
    code: 'GAD7',
    name: 'GAD-7',
    description: 'Przesiewowa ocena nasilenia objawów lęku uogólnionego',
    timeframe: 'Ostatnie 2 tygodnie',
    questionCount: 7,
    version: '1.0',
    questions: [
      { order: 1, theme: 'Napięcie', text: 'Odczuwanie nerwowości, niepokoju lub napięcia' },
      { order: 2, theme: 'Brak kontroli nad zamartwianiem', text: 'Niemożność powstrzymania się od zamartwiania lub kontrolowania go' },
      { order: 3, theme: 'Nadmierne martwienie się', text: 'Nadmierne martwienie się różnymi sprawami' },
      { order: 4, theme: 'Relaks', text: 'Trudności z relaksem' },
      { order: 5, theme: 'Niepokój ruchowy', text: 'Nadmierne niepokojenie się, niemożność usiedzenia w miejscu' },
      { order: 6, theme: 'Drażliwość', text: 'Łatwe wpadanie w złość lub rozdrażnienie' },
      { order: 7, theme: 'Obawa przed czymś złym', text: 'Poczucie, że może wydarzyć się coś strasznego' },
    ],
    answerOptions: [
      { value: 0, label: 'Wcale', order: 1 },
      { value: 1, label: 'Kilka dni', order: 2 },
      { value: 2, label: 'Więcej niż połowę dni', order: 3 },
      { value: 3, label: 'Niemal codziennie', order: 4 },
    ],
  },
  {
    code: 'PSS10',
    name: 'PSS-10',
    description: 'Ocena subiektywnie postrzeganego stresu',
    timeframe: 'Ostatni miesiąc',
    questionCount: 10,
    version: '1.0',
    questions: [
      { order: 1, theme: 'Nieprzewidywalność', text: 'Zdenerwowanie z powodu czegoś, co wydarzyło się niespodziewanie', reverseScored: false },
      { order: 2, theme: 'Brak kontroli', text: 'Poczucie braku kontroli nad ważnymi sprawami w swoim życiu', reverseScored: false },
      { order: 3, theme: 'Napięcie', text: 'Odczuwanie napięcia i stresu', reverseScored: false },
      { order: 4, theme: 'Radzenie sobie', text: 'Pewność, że poradzisz sobie z osobistymi problemami', reverseScored: true },
      { order: 5, theme: 'Poczucie wpływu', text: 'Poczucie, że sprawy układały się po Twojej myśli', reverseScored: true },
      { order: 6, theme: 'Przeciążenie', text: 'Poczucie, że nie możesz poradzić sobie ze wszystkim, co musisz zrobić', reverseScored: false },
      { order: 7, theme: 'Kontrola emocji', text: 'Umiejętność kontrolowania rozdrażnienia', reverseScored: true },
      { order: 8, theme: 'Sprawy idą dobrze', text: 'Poczucie, że wszystko idzie dobrze', reverseScored: true },
      { order: 9, theme: 'Bezsilność', text: 'Złość z powodu braku wpływu na sprawy poza Twoją kontrolą', reverseScored: false },
      { order: 10, theme: 'Przytłoczenie trudnościami', text: 'Poczucie, że trudności nagromadziły się tak bardzo, że nie możesz ich pokonać', reverseScored: false },
    ],
    answerOptions: [
      { value: 0, label: 'Nigdy', order: 1 },
      { value: 1, label: 'Prawie nigdy', order: 2 },
      { value: 2, label: 'Czasem', order: 3 },
      { value: 3, label: 'Dość często', order: 4 },
      { value: 4, label: 'Bardzo często', order: 5 },
    ],
  },
  {
    code: 'WHO5',
    name: 'WHO-5 Well-Being Index',
    description: 'Ocena subiektywnego dobrostanu psychicznego',
    timeframe: 'Ostatnie 2 tygodnie',
    questionCount: 5,
    version: '1.0',
    questions: [
      { order: 1, theme: 'Pozytywny nastrój', text: 'Czułem(am) się pogodnie i w dobrym nastroju' },
      { order: 2, theme: 'Spokój', text: 'Czułem(am) się spokojnie i zrelaksowanie' },
      { order: 3, theme: 'Energia', text: 'Czułem(am) się aktywnie i energicznie' },
      { order: 4, theme: 'Wypoczynek', text: 'Budziłem(am) się wypoczęty(a) i świeży(a)' },
      { order: 5, theme: 'Zaangażowanie w życie', text: 'Moje codzienne życie było wypełnione interesującymi mnie rzeczami' },
    ],
    answerOptions: [
      { value: 5, label: 'Przez cały czas', order: 1 },
      { value: 4, label: 'Przez większość czasu', order: 2 },
      { value: 3, label: 'Przez więcej niż połowę czasu', order: 3 },
      { value: 2, label: 'Przez mniej niż połowę czasu', order: 4 },
      { value: 1, label: 'Od czasu do czasu', order: 5 },
      { value: 0, label: 'Nigdy', order: 6 },
    ],
  },
  {
    code: 'MOOD10',
    name: 'Skala nastroju ogólnego',
    description: 'Krótka ocena aktualnego nastroju ogólnego',
    timeframe: 'Aktualny stan',
    questionCount: 10,
    version: '1.0',
    questions: [
      { order: 1, theme: 'Zły humor', text: 'Jestem w złym humorze', reverseScored: true },
      { order: 2, theme: 'Świetne samopoczucie', text: 'Czuję się świetnie', reverseScored: false },
      { order: 3, theme: 'Zły nastrój', text: 'Mam zły nastrój', reverseScored: true },
      { order: 4, theme: 'Spokój', text: 'Czuję się rozluźniony(a) i spokojny(a)', reverseScored: false },
      { order: 5, theme: 'Beznadziejność', text: 'Wszystko wydaje mi się szare i bez sensu', reverseScored: true },
      { order: 6, theme: 'Dobry humor', text: 'Jestem w dobrym humorze', reverseScored: false },
      { order: 7, theme: 'Pogoda ducha', text: 'Jestem pogodny(a) i zadowolony(a)', reverseScored: false },
      { order: 8, theme: 'Przygnębienie', text: 'Czuję się przygnębiony(a)', reverseScored: true },
      { order: 9, theme: 'Złe samopoczucie', text: 'Czuję się źle', reverseScored: true },
      { order: 10, theme: 'Dobre samopoczucie', text: 'Czuję się dobrze', reverseScored: false },
    ],
    answerOptions: [
      { value: 1, label: 'Nie zgadzam się', order: 1 },
      { value: 2, label: 'Raczej się nie zgadzam', order: 2 },
      { value: 3, label: 'Trochę tak, trochę nie', order: 3 },
      { value: 4, label: 'Raczej się zgadzam', order: 4 },
      { value: 5, label: 'Zgadzam się', order: 5 },
    ],
  },
  {
    code: 'DAILY_MOOD',
    name: 'Codzienny check-in nastroju',
    description: 'Błyskawiczny codzienny pomiar samopoczucia',
    timeframe: 'Dzisiaj',
    questionCount: 1,
    requiresAllAnswers: true,
    version: '1.0',
    questions: [
      { order: 1, theme: 'Ogólny nastrój dnia', text: 'Jak się dzisiaj czujesz?' },
    ],
    answerOptions: [
      { value: 5, label: 'Bardzo dobrze', order: 1 },
      { value: 4, label: 'Dobrze', order: 2 },
      { value: 3, label: 'Neutralnie', order: 3 },
      { value: 2, label: 'Słabo', order: 4 },
      { value: 1, label: 'Bardzo źle', order: 5 },
    ],
  },
];

export async function seedAssessments(dataSource: DataSource): Promise<void> {
  const assessmentRepo = dataSource.getRepository(Assessment);
  const questionRepo = dataSource.getRepository(Question);
  const answerOptionRepo = dataSource.getRepository(AnswerOption);

  for (const data of seedData) {
    const exists = await assessmentRepo.findOne({ where: { code: data.code } });
    if (exists) continue;

    const assessment = assessmentRepo.create({
      code: data.code,
      name: data.name,
      description: data.description,
      timeframe: data.timeframe,
      questionCount: data.questionCount,
      version: data.version,
      isAnonymousForHR: true,
      requiresAllAnswers: data.requiresAllAnswers ?? true,
    });
    const savedAssessment = await assessmentRepo.save(assessment);

    for (const q of data.questions) {
      const question = questionRepo.create({
        assessmentId: savedAssessment.id,
        order: q.order,
        theme: q.theme,
        text: q.text,
        reverseScored: (q as any).reverseScored ?? false,
        required: true,
      });
      await questionRepo.save(question);
    }

    for (const opt of data.answerOptions) {
      const option = answerOptionRepo.create({
        assessmentId: savedAssessment.id,
        value: opt.value,
        label: opt.label,
        order: opt.order,
      });
      await answerOptionRepo.save(option);
    }
  }

  console.log('Seed assessments: ukończono');
}
