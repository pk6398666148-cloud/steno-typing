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
  const words = [...paragraphs.join(" ").split(/\s+/)];
  const result: string[] = [];

  while (result.length < count) {
    result.push(...words);
  }

  return result.slice(0, count).join(" ");
}
