
export type Passage = {
  id: number;
  title: string;
  category: string;
  text: string;
};

export type Session = {
  date: string;
  wpm: number;
  accuracy: number;
  duration: number;
  words: number;
};

export type DailyWordSet = {
  day: number;
  common: string[];
  difficult: string[];
};

const topics = [
  ["SSC English", "Education"],
  ["SSC English", "Discipline"],
  ["Government", "Public Service"],
  ["Government", "Indian Democracy"],
  ["Current Affairs", "Technology"],
  ["Current Affairs", "Environment"],
  ["General English", "Time Management"],
  ["General English", "Communication"],
  ["News Practice", "National Development"],
  ["News Practice", "Economic Growth"]
];

const paragraphs = [
  "Education develops knowledge and confidence. Students should read regularly, practise their skills and manage their time wisely.",
  "Discipline teaches people to respect time, follow rules and complete responsibilities with patience and dedication.",
  "Public institutions provide essential services and support the development and welfare of society.",
  "Democracy allows citizens to participate in government and contribute to the future of their country.",
  "Technology improves communication, education and business. Digital services make information more accessible.",
  "Environmental protection is necessary for a healthy future. Everyone should save resources and reduce waste.",
  "Time management helps people complete important tasks and improve their productivity.",
  "Good communication helps people understand one another and work together effectively.",
  "National development depends on education, healthcare, infrastructure and employment opportunities.",
  "Economic growth creates opportunities through investment, innovation and skill development."
];

export const passages: Passage[] = topics.map((topic, index) => ({
  id: index + 1,
  category: topic[0],
  title: topic[1],
  text: paragraphs[index]
}));

export const categories = [
  "All",
  ...Array.from(new Set(passages.map(p => p.category)))
];

export function makeChallenge(count: number): string {
  const words = paragraphs.join(" ").split(/\s+/);
  const result: string[] = [];

  while (result.length < count) {
    result.push(...words);
  }

  return result.slice(0, count).join(" ");
}

const commonWords = [
  "the","and","that","have","with","this","from","they","will","would",
  "there","their","about","which","when","where","your","people","government","because",
  "through","before","after","between","important","education","practice","knowledge","development","information",
  "public","service","national","country","student","learning","working","business","system","different",
  "another","should","could","while","under","every","always","often","during","without",
  "provide","support","increase","improve","achieve","complete","understand","communication","responsibility","opportunity",
  "available","necessary","experience","community","society","department","organization","management","performance","effective",
  "general","specific","following","including","according","decision","information","success","progress","regular",
  "possible","continue","consider","remember","receive","believe","together","problem","solution","example",
  "result","reason","change","important","government","official","employee","department","application","document",
  "knowledge","confidence","ability","quality","attention","interest","national","regional","central","economic",
  "industry","service","policy","public","private","education","technology","environment","agriculture","employment",
  "healthcare","infrastructure","transport","communication","security","administration","citizen","election","democracy","development",
  "training","examination","candidate","qualification","selection","appointment","requirement","instruction","preparation","practice",
  "accuracy","speed","sentence","paragraph","language","reading","writing","speaking","listening","regularly",
  "quickly","carefully","clearly","properly","correctly","usually","actually","especially","generally","recently",
  "however","therefore","although","because","unless","whether","perhaps","already","almost","enough",
  "within","across","around","towards","against","among","during","until","since","beyond",
  "simple","common","modern","future","present","current","basic","advanced","major","minor",
  "strong","better","higher","lower","further","greater","several","various","similar","certain",
  "create","manage","prepare","deliver","explain","describe","identify","compare","analyse","review",
  "report","record","process","submit","check","verify","maintain","develop","establish","organize",
  "improve","increase","reduce","provide","include","require","follow","complete","achieve","perform"
];

const difficultWords = [
  "accommodate","acknowledgement","acquaintance","administration","approximately","bureaucracy","conscientious","consequence","contemporary","correspondence",
  "definitely","disappointment","embarrassment","environment","entrepreneur","exaggeration","extraordinary","fluorescent","government","guarantee",
  "hierarchy","immediately","independent","indispensable","intelligence","interference","irresistible","maintenance","millennium","miscellaneous",
  "necessary","occasionally","occurrence","parliamentary","particularly","perseverance","personnel","phenomenon","possession","privilege",
  "pronunciation","questionnaire","recommendation","reconciliation","recognition","referred","relevant","restaurant","rhythm","secretary",
  "separate","supersede","surveillance","threshold","tomorrow","transferred","unnecessary","vacuum","Wednesday","wilderness",
  "withdrawal","accessible","accidentally","accompany","achievement","acquisition","aggressive","analysis","annually","apparent",
  "appreciation","argument","attendance","beneficial","calendar","category","cemetery","colleague","committee","comparative",
  "competitive","complement","complicated","compulsory","confidence","convenience","criticism","declaration","dedication","deficiency",
  "demonstration","description","determination","dilemma","discipline","discrepancy","efficient","eligible","eliminate","emergency",
  "emphasize","encouragement","engineering","enthusiasm","essential","eventually","examination","exception","excessive","existence",
  "experience","explanation","familiar","fascinating","financial","frequently","fulfilment","fundamental","generally","generous",
  "grateful","guaranteed","guidance","imagination","imitation","inadequate","incredible","individual","influential","initiative",
  "innovation","inquiry","inspiration","institution","interpretation","introduction","legitimate","literature","magnificent","management",
  "measurement","memorandum","ministerial","motivation","negotiation","noticeable","obligation","opportunity","organization","original",
  "parliament","participation","particularly","permanent","permission","perspective","persuasion","phenomenal","possibility","practical",
  "preceding","preference","preliminary","preparation","prescription","presentation","procedure","professional","proportion","qualification",
  "reasonable","reception","recognition","recommend","reference","regardless","regulation","reliable","representative","requirement",
  "responsibility","satisfactory","significant","sincerely","specialist","statement","successful","sufficient","technique","temperature",
  "tendency","theoretical","throughout","traditionally","transferable","transparent","unbelievable","undertaking","unfortunately","valuable",
  "variation","vocabulary","voluntary","warranted","widespread","yielding","abbreviation","accelerate","accomplishment","accountability",
  "accumulate","adaptation","advantageous","affiliation","alternative","anniversary","anticipation","application","artificial","assessment",
  "association","authorization","availability","calculation","capability","circumstance","classification","collaboration","commencement","communication",
  "concentration","configuration","confirmation","consideration","construction","consultation","contribution","coordination","declaration","determination",
  "distinguished","documentation","effectiveness","establishment","expenditure","favourable","illustration","implementation","infrastructure","investigation",
  "jurisdiction","legislation","methodology","notification","observation","organization","qualification","questioning","reorganization","revolutionary"
];

export const dailyWordSets: DailyWordSet[] = Array.from(
  { length: 30 },
  (_, index) => ({
    day: index + 1,
    common: commonWords.slice(index * 10, index * 10 + 10),
    difficult: difficultWords.slice(index * 10, index * 10 + 10)
  })
);
