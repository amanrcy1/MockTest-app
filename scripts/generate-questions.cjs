/**
 * Generate question bank CSV for Mockzam
 * Run: node scripts/generate-questions.cjs
 * Then upload via Admin > Bulk Upload
 */

const fs = require('fs');
const path = require('path');

// CSV escape helper
const esc = (str) => {
  if (!str) return '';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
};

const HEADERS = ['examType','subject','topic','subtopic','difficulty','questionText','optionA','optionB','optionC','optionD','correctAnswer','solution','tags'];

const questions = [];

// ============================================================
// CDS - ENGLISH (120+ questions)
// ============================================================

const cdsEnglishGrammar = [
  { q: 'Choose the correct form: "Neither the teacher nor the students ___ present."', a: 'were', b: 'was', c: 'is', d: 'has been', ans: 'A', sol: 'When "neither...nor" connects a singular and plural subject, the verb agrees with the nearer subject. "Students" is plural, so "were" is correct.', diff: 'Medium' },
  { q: 'Identify the error: "Each of the boys have completed their assignment."', a: '"have" should be "has"', b: '"their" should be "his"', c: 'Both A and B', d: 'No error', ans: 'C', sol: '"Each" is singular, requiring "has" (not "have"). Also, "each of the boys" takes singular pronoun "his" (not "their") in formal grammar.', diff: 'Medium' },
  { q: 'Select the correct sentence:', a: 'He is one of those who believes in hard work.', b: 'He is one of those who believe in hard work.', c: 'He is one of those who is believing in hard work.', d: 'He is one of those who has believed in hard work.', ans: 'B', sol: 'In "one of those who" construction, the relative pronoun "who" refers to "those" (plural), so the verb should be plural: "believe".', diff: 'Hard' },
  { q: 'Choose the correct option: "The committee ___ divided in their opinions."', a: 'was', b: 'were', c: 'is', d: 'are', ans: 'B', sol: 'When a collective noun refers to individual members acting separately, a plural verb is used. Since opinions are divided, "were" is correct.', diff: 'Medium' },
  { q: '"Had I known about the meeting, I ___ attended it."', a: 'would have', b: 'will have', c: 'would', d: 'shall have', ans: 'A', sol: 'This is a past unreal conditional (Type 3). The structure is: Had + subject + past participle, subject + would have + past participle.', diff: 'Easy' },
  { q: 'Which sentence uses the subjunctive mood correctly?', a: 'I wish I was taller.', b: 'I wish I were taller.', c: 'I wish I am taller.', d: 'I wish I be taller.', ans: 'B', sol: 'The subjunctive mood uses "were" for all persons after "wish" to express unreal or hypothetical situations.', diff: 'Medium' },
  { q: '"Scarcely had he reached the station ___ the train departed."', a: 'than', b: 'when', c: 'then', d: 'before', ans: 'B', sol: '"Scarcely...when" is the correct correlative conjunction pair. "Hardly/Scarcely" is always followed by "when" (not "than").', diff: 'Medium' },
  { q: 'Choose the correct passive voice: "People say that he is a genius."', a: 'It is said that he is a genius.', b: 'He is said to be a genius.', c: 'Both A and B are correct.', d: 'It is being said he is genius.', ans: 'C', sol: 'Both constructions are valid passive forms. "It is said that..." (impersonal passive) and "He is said to be..." (personal passive) are both grammatically correct.', diff: 'Easy' },
  { q: 'Identify the correct sentence:', a: 'The news are very disturbing.', b: 'The news is very disturbing.', c: 'The news were very disturbing.', d: 'The news have been very disturbing.', ans: 'B', sol: '"News" is an uncountable noun and always takes a singular verb. Other examples: mathematics, physics, economics.', diff: 'Easy' },
  { q: '"No sooner did the bell ring ___ the students rushed out."', a: 'when', b: 'than', c: 'then', d: 'that', ans: 'B', sol: '"No sooner...than" is the correct correlative pair. Note: "Hardly/Scarcely...when" but "No sooner...than".', diff: 'Medium' },
  { q: 'Choose the correct form: "The furniture in the room ___ been rearranged."', a: 'have', b: 'has', c: 'are', d: 'were', ans: 'B', sol: '"Furniture" is an uncountable noun and takes a singular verb. Other uncountable nouns: luggage, information, advice, equipment.', diff: 'Easy' },
  { q: '"If I ___ you, I would accept the offer."', a: 'am', b: 'was', c: 'were', d: 'be', ans: 'C', sol: 'In second conditional (present unreal), "were" is used for all persons: "If I were you..." This is the subjunctive mood.', diff: 'Easy' },
  { q: 'Identify the error: "He is more taller than his brother."', a: '"more" is redundant', b: '"taller" should be "tall"', c: '"than" should be "then"', d: 'No error', ans: 'A', sol: 'Comparative adjectives ending in "-er" do not take "more". Correct: "He is taller than his brother." Use "more" only with longer adjectives: more beautiful, more intelligent.', diff: 'Easy' },
  { q: '"The teacher, along with her students, ___ going on a field trip."', a: 'are', b: 'is', c: 'were', d: 'have been', ans: 'B', sol: 'When the subject is followed by "along with", "together with", "as well as", the verb agrees with the main subject. "Teacher" is singular, so "is" is correct.', diff: 'Medium' },
  { q: 'Choose the correct sentence:', a: 'He has been working here since five years.', b: 'He has been working here for five years.', c: 'He has been working here from five years.', d: 'He is working here since five years.', ans: 'B', sol: '"For" is used with a period of time (five years, two hours). "Since" is used with a point in time (2019, Monday, morning). Present perfect continuous is correct for ongoing actions.', diff: 'Easy' },
  { q: '"Not only ___ he pass the exam, but he also topped the class."', a: 'do', b: 'did', c: 'does', d: 'has', ans: 'B', sol: 'When "not only" begins a clause, it requires subject-verb inversion. Since the sentence is in past tense, "did" is correct: "Not only did he pass..."', diff: 'Medium' },
  { q: 'Which sentence has correct use of articles?', a: 'He is a honest man.', b: 'He is an honest man.', c: 'He is the honest man.', d: 'He is honest man.', ans: 'B', sol: '"An" is used before words beginning with a vowel sound. "Honest" starts with a silent "h", so the vowel sound "o" follows. Hence "an honest man".', diff: 'Easy' },
  { q: '"The number of students who ___ passed is impressive."', a: 'has', b: 'have', c: 'is', d: 'was', ans: 'B', sol: 'In "students who have passed", the relative pronoun "who" refers to "students" (plural), so the verb is "have". The main verb "is" agrees with "number" (singular).', diff: 'Hard' },
  { q: 'Choose the correct form: "One of the boys ___ selected for the team."', a: 'were', b: 'was', c: 'are', d: 'have been', ans: 'B', sol: '"One of" always takes a singular verb because the subject is "one", not the plural noun that follows. "One... was selected."', diff: 'Easy' },
  { q: '"Hardly ___ I entered the room when the phone rang."', a: 'did', b: 'had', c: 'have', d: 'was', ans: 'B', sol: '"Hardly had I..." uses past perfect because the action of entering was completed before the phone rang. Inversion: Hardly + had + subject + past participle.', diff: 'Hard' },
];

const cdsEnglishVocab = [
  { q: 'Choose the synonym of "EPHEMERAL":', a: 'Eternal', b: 'Transient', c: 'Permanent', d: 'Durable', ans: 'B', sol: 'Ephemeral means lasting for a very short time. Transient also means temporary or brief. Antonyms: eternal, permanent.', diff: 'Medium' },
  { q: 'The antonym of "BENEVOLENT" is:', a: 'Malevolent', b: 'Generous', c: 'Kind', d: 'Charitable', ans: 'A', sol: 'Benevolent means well-meaning and kindly. Malevolent means having or showing a wish to do evil to others.', diff: 'Easy' },
  { q: 'Choose the word that best completes: "The politician\'s ___ remarks offended many people."', a: 'prudent', b: 'tactful', c: 'inflammatory', d: 'diplomatic', ans: 'C', sol: 'Inflammatory means arousing strong feelings, especially anger. Context clue: "offended many people" indicates negative, provocative remarks.', diff: 'Medium' },
  { q: '"UBIQUITOUS" most nearly means:', a: 'Rare', b: 'Present everywhere', c: 'Unique', d: 'Invisible', ans: 'B', sol: 'Ubiquitous means present, appearing, or found everywhere. Example: "Smartphones have become ubiquitous in modern life."', diff: 'Medium' },
  { q: 'The word "PRAGMATIC" means:', a: 'Idealistic', b: 'Theoretical', c: 'Practical and realistic', d: 'Pessimistic', ans: 'C', sol: 'Pragmatic means dealing with things sensibly and realistically, based on practical rather than theoretical considerations.', diff: 'Easy' },
  { q: 'Choose the synonym of "AMELIORATE":', a: 'Worsen', b: 'Improve', c: 'Maintain', d: 'Destroy', ans: 'B', sol: 'Ameliorate means to make something bad or unsatisfactory better. Synonym: improve, enhance. Antonym: worsen, deteriorate.', diff: 'Hard' },
  { q: '"SYCOPHANT" refers to a person who:', a: 'Speaks the truth boldly', b: 'Flatters to gain advantage', c: 'Lives in isolation', d: 'Studies ancient texts', ans: 'B', sol: 'A sycophant is a person who acts obsequiously toward someone important to gain advantage. Synonyms: toady, flatterer.', diff: 'Hard' },
  { q: 'The antonym of "VERBOSE" is:', a: 'Wordy', b: 'Concise', c: 'Lengthy', d: 'Elaborate', ans: 'B', sol: 'Verbose means using more words than needed. Concise means giving information clearly and briefly. They are antonyms.', diff: 'Medium' },
  { q: '"CACOPHONY" means:', a: 'A pleasant melody', b: 'A harsh mixture of sounds', c: 'Complete silence', d: 'A rhythmic pattern', ans: 'B', sol: 'Cacophony means a harsh, discordant mixture of sounds. Opposite: euphony (pleasant sounds). Greek: kakos (bad) + phone (sound).', diff: 'Medium' },
  { q: 'Choose the correct meaning of "EQUANIMITY":', a: 'Inequality', b: 'Mental calmness and composure', c: 'Physical strength', d: 'Mathematical equality', ans: 'B', sol: 'Equanimity means mental calmness, composure, and evenness of temper, especially in a difficult situation. Latin: aequus (equal) + animus (mind).', diff: 'Hard' },
  { q: 'The synonym of "LETHARGIC" is:', a: 'Energetic', b: 'Sluggish', c: 'Alert', d: 'Enthusiastic', ans: 'B', sol: 'Lethargic means lacking energy, sluggish, drowsy. Antonyms: energetic, vigorous, active.', diff: 'Easy' },
  { q: '"MAGNANIMOUS" means:', a: 'Petty and mean', b: 'Generous and forgiving', c: 'Wealthy and powerful', d: 'Magnetic and attractive', ans: 'B', sol: 'Magnanimous means generous or forgiving, especially toward a rival or less powerful person. Latin: magnus (great) + animus (soul).', diff: 'Medium' },
  { q: 'The antonym of "FRUGAL" is:', a: 'Thrifty', b: 'Economical', c: 'Extravagant', d: 'Careful', ans: 'C', sol: 'Frugal means sparing or economical with money or food. Extravagant means spending freely, lacking restraint. They are antonyms.', diff: 'Easy' },
  { q: '"PERNICIOUS" most nearly means:', a: 'Beneficial', b: 'Harmful in a gradual way', c: 'Obvious', d: 'Temporary', ans: 'B', sol: 'Pernicious means having a harmful effect, especially in a gradual or subtle way. Example: "the pernicious effects of pollution."', diff: 'Hard' },
  { q: 'Choose the synonym of "ARDUOUS":', a: 'Easy', b: 'Simple', c: 'Strenuous', d: 'Pleasant', ans: 'C', sol: 'Arduous means involving or requiring strenuous effort; difficult and tiring. Synonyms: strenuous, laborious, grueling.', diff: 'Medium' },
  { q: 'The word "GREGARIOUS" describes someone who is:', a: 'Shy and withdrawn', b: 'Fond of company and sociable', c: 'Aggressive and hostile', d: 'Quiet and reserved', ans: 'B', sol: 'Gregarious means fond of company; sociable. From Latin gregarius, from grex (flock). Antonym: reclusive, introverted.', diff: 'Medium' },
  { q: '"PERFIDIOUS" means:', a: 'Loyal and faithful', b: 'Deceitful and untrustworthy', c: 'Perfect and flawless', d: 'Persistent and determined', ans: 'B', sol: 'Perfidious means deceitful and untrustworthy. Synonyms: treacherous, disloyal, faithless. Example: "a perfidious ally."', diff: 'Hard' },
  { q: 'The antonym of "TACITURN" is:', a: 'Silent', b: 'Reserved', c: 'Loquacious', d: 'Shy', ans: 'C', sol: 'Taciturn means reserved or uncommunicative in speech. Loquacious means very talkative. They are antonyms.', diff: 'Hard' },
  { q: '"ALTRUISTIC" means:', a: 'Selfish', b: 'Showing unselfish concern for others', c: 'Proud and arrogant', d: 'Indifferent', ans: 'B', sol: 'Altruistic means showing a disinterested and selfless concern for the well-being of others. Antonym: selfish, egotistic.', diff: 'Medium' },
  { q: 'Choose the synonym of "COGENT":', a: 'Weak', b: 'Convincing', c: 'Confusing', d: 'Irrelevant', ans: 'B', sol: 'Cogent means clear, logical, and convincing. Example: "a cogent argument." Synonyms: compelling, persuasive, forceful.', diff: 'Hard' },
];

const cdsEnglishIdioms = [
  { q: '"To burn the midnight oil" means:', a: 'To waste resources', b: 'To work or study late into the night', c: 'To start a fire', d: 'To cook at night', ans: 'B', sol: 'This idiom means to work or study late at night. It originates from the time when oil lamps were used for lighting.', diff: 'Easy' },
  { q: '"A Pyrrhic victory" refers to:', a: 'A decisive win', b: 'A victory won at too great a cost', c: 'A military strategy', d: 'An unexpected triumph', ans: 'B', sol: 'Named after King Pyrrhus of Epirus, whose army suffered irreplaceable casualties defeating the Romans. It means a victory that inflicts such devastating losses that it is tantamount to defeat.', diff: 'Hard' },
  { q: '"To let the cat out of the bag" means:', a: 'To release an animal', b: 'To reveal a secret', c: 'To make a mistake', d: 'To start a fight', ans: 'B', sol: 'This idiom means to reveal a secret or disclose something that was meant to be kept hidden.', diff: 'Easy' },
  { q: '"Hobson\'s choice" means:', a: 'A difficult choice', b: 'The best choice', c: 'No real choice at all', d: 'A random choice', ans: 'C', sol: 'Named after Thomas Hobson, a stable owner who offered customers the horse nearest the door or none at all. It means an apparently free choice when there is no real alternative.', diff: 'Hard' },
  { q: '"To be on cloud nine" means:', a: 'To be confused', b: 'To be extremely happy', c: 'To be very high up', d: 'To be dreaming', ans: 'B', sol: 'This idiom means to be extremely happy or elated. It suggests a state of bliss or euphoria.', diff: 'Easy' },
  { q: '"To cry wolf" means:', a: 'To be afraid', b: 'To raise a false alarm', c: 'To hunt animals', d: 'To shout loudly', ans: 'B', sol: 'From Aesop\'s fable "The Boy Who Cried Wolf." It means to raise a false alarm so often that a genuine warning is ignored.', diff: 'Easy' },
  { q: '"A white elephant" refers to:', a: 'A rare animal', b: 'A costly but useless possession', c: 'A lucky charm', d: 'A large building', ans: 'B', sol: 'A white elephant is a possession that is useless or troublesome, especially one that is expensive to maintain. Originates from the practice of Thai kings gifting rare white elephants to courtiers they wished to ruin.', diff: 'Medium' },
  { q: '"To hit the nail on the head" means:', a: 'To use a hammer', b: 'To describe exactly what is causing a situation', c: 'To hurt someone', d: 'To build something', ans: 'B', sol: 'This idiom means to describe exactly what is causing a situation or problem; to be exactly right.', diff: 'Easy' },
  { q: '"A red herring" is:', a: 'A type of fish', b: 'Something that misleads or distracts', c: 'A warning sign', d: 'An important clue', ans: 'B', sol: 'A red herring is something that misleads or distracts from a relevant or important question. Originally, smoked herring was used to train hunting dogs.', diff: 'Medium' },
  { q: '"To bite the bullet" means:', a: 'To eat something hard', b: 'To endure a painful situation with courage', c: 'To shoot a gun', d: 'To make a mistake', ans: 'B', sol: 'To bite the bullet means to decide to do something difficult or unpleasant that one has been putting off. Originates from battlefield surgery before anesthesia.', diff: 'Easy' },
  { q: '"The Achilles\' heel" refers to:', a: 'A strong point', b: 'A weak or vulnerable point', c: 'A type of injury', d: 'A Greek weapon', ans: 'B', sol: 'From Greek mythology: Achilles was invulnerable except for his heel. An Achilles\' heel is a weakness or vulnerable point in someone otherwise strong.', diff: 'Easy' },
  { q: '"To turn over a new leaf" means:', a: 'To read a book', b: 'To start behaving in a better way', c: 'To change seasons', d: 'To plant a tree', ans: 'B', sol: 'To turn over a new leaf means to make a fresh start; to change one\'s behavior for the better. "Leaf" here refers to a page, not a tree leaf.', diff: 'Easy' },
  { q: '"A bird in the hand is worth two in the bush" means:', a: 'Birds are valuable', b: 'It is better to keep what you have than risk losing it for something better', c: 'Hunting is difficult', d: 'Nature is beautiful', ans: 'B', sol: 'This proverb means it is better to hold onto something you already have than to risk losing it by trying to get something better.', diff: 'Easy' },
  { q: '"To add insult to injury" means:', a: 'To hurt someone physically', b: 'To make a bad situation worse', c: 'To apologize', d: 'To be sarcastic', ans: 'B', sol: 'To add insult to injury means to make a bad situation even worse by doing something additionally hurtful or offensive.', diff: 'Easy' },
  { q: '"A dark horse" refers to:', a: 'A black-colored horse', b: 'A person about whom little is known but who may have unexpected qualities', c: 'A villain', d: 'A night rider', ans: 'B', sol: 'A dark horse is a person who is not well known but who surprises others by winning or doing well. Originally a horse-racing term.', diff: 'Medium' },
];


const cdsEnglishSentence = [
  { q: 'Choose the correctly punctuated sentence:', a: 'Its a beautiful day isnt it?', b: "It's a beautiful day, isn't it?", c: "Its a beautiful day, isnt it?", d: "It's a beautiful day isn't it?", ans: 'B', sol: '"It\'s" (contraction of "it is") needs an apostrophe. "Isn\'t" also needs an apostrophe. A comma separates the statement from the tag question.', diff: 'Easy' },
  { q: 'Select the sentence with correct word usage:', a: 'The principal reason for his absence was illness.', b: 'The principle reason for his absence was illness.', c: 'The principal reason for his absense was illness.', d: 'The principle reason for his absense was illness.', ans: 'A', sol: '"Principal" (adjective) means main/chief. "Principle" (noun) means a fundamental truth or rule. "Absence" is the correct spelling.', diff: 'Medium' },
  { q: 'Identify the correct sentence:', a: 'Between you and I, this plan will fail.', b: 'Between you and me, this plan will fail.', c: 'Between you and myself, this plan will fail.', d: 'Between I and you, this plan will fail.', ans: 'B', sol: 'After prepositions like "between", objective case pronouns (me, him, her) are used, not subjective (I) or reflexive (myself).', diff: 'Medium' },
  { q: 'Choose the correct form: "The data ___ collected over three years."', a: 'was', b: 'were', c: 'Both A and B are acceptable', d: 'has', ans: 'C', sol: '"Data" is technically the plural of "datum". In formal writing, "were" is preferred. However, in modern usage, "was" (treating data as uncountable) is widely accepted.', diff: 'Hard' },
  { q: 'Which sentence is grammatically correct?', a: 'Whom do you think will win the election?', b: 'Who do you think will win the election?', c: 'Whose do you think will win the election?', d: 'Which do you think will win the election?', ans: 'B', sol: '"Who" is the subject form (nominative case). Here, "who" is the subject of "will win". Test: "He will win" (not "Him will win"), so use "who" not "whom".', diff: 'Medium' },
  { q: 'Choose the correct sentence:', a: 'She is elder than me.', b: 'She is older than me.', c: 'She is elder than I.', d: 'She is more older than me.', ans: 'B', sol: '"Elder" is used for family relationships (elder brother/sister) and is not followed by "than". "Older" is the comparative form used with "than".', diff: 'Medium' },
  { q: 'Identify the correct sentence:', a: 'I have visited Agra last year.', b: 'I visited Agra last year.', c: 'I had visited Agra last year.', d: 'I was visiting Agra last year.', ans: 'B', sol: 'Simple past is used with definite past time expressions like "last year". Present perfect ("have visited") is used when the time is not specified.', diff: 'Easy' },
  { q: '"He asked me where ___."', a: 'did I live', b: 'do I live', c: 'I lived', d: 'I live', ans: 'C', sol: 'In reported speech, the word order is subject + verb (not inverted). The tense shifts back: "Where do you live?" becomes "where I lived."', diff: 'Medium' },
  { q: 'Choose the correct sentence:', a: 'The sceneries of Kashmir are beautiful.', b: 'The scenery of Kashmir is beautiful.', c: 'The sceneries of Kashmir is beautiful.', d: 'The scenery of Kashmir are beautiful.', ans: 'B', sol: '"Scenery" is an uncountable noun and has no plural form. It takes a singular verb. Similar words: machinery, poetry, jewellery.', diff: 'Easy' },
  { q: 'Which is correct?', a: 'He gave me an useful advice.', b: 'He gave me a useful advice.', c: 'He gave me useful advice.', d: 'He gave me some useful advices.', ans: 'C', sol: '"Advice" is uncountable and cannot take "a/an" or be pluralized. Correct: "useful advice" or "a piece of advice". "Useful" starts with a "y" sound, so "a" not "an".', diff: 'Medium' },
  { q: 'Identify the correct sentence:', a: 'Despite of the rain, we went out.', b: 'Despite the rain, we went out.', c: 'Despite about the rain, we went out.', d: 'Despite for the rain, we went out.', ans: 'B', sol: '"Despite" is never followed by "of". Use "despite + noun" or "in spite of + noun". Both mean the same thing.', diff: 'Easy' },
  { q: 'Choose the correct form:', a: 'He is one of the best player in the team.', b: 'He is one of the best players in the team.', c: 'He is one of the best player of the team.', d: 'He is one of best players in the team.', ans: 'B', sol: '"One of" is always followed by a plural noun. "One of the best players" is correct. Also, "in the team" is the correct preposition.', diff: 'Easy' },
  { q: '"She said that she ___ the movie the previous day."', a: 'watched', b: 'had watched', c: 'has watched', d: 'watches', ans: 'B', sol: 'In reported speech with past reporting verb, past simple becomes past perfect. "I watched" becomes "she had watched". "Yesterday" becomes "the previous day".', diff: 'Medium' },
  { q: 'Which sentence is correct?', a: 'Less people attended the meeting today.', b: 'Fewer people attended the meeting today.', c: 'Lesser people attended the meeting today.', d: 'Little people attended the meeting today.', ans: 'B', sol: '"Fewer" is used with countable nouns (people, books). "Less" is used with uncountable nouns (water, time, money). People are countable, so "fewer" is correct.', diff: 'Medium' },
  { q: 'Choose the correct sentence:', a: 'He availed of the opportunity.', b: 'He availed the opportunity.', c: 'He availed himself of the opportunity.', d: 'He availed himself the opportunity.', ans: 'C', sol: 'The correct usage is "avail oneself of something". "He availed himself of the opportunity" is grammatically correct.', diff: 'Hard' },
];

const cdsEnglishComprehension = [
  { q: 'In the sentence "The government\'s decision was met with widespread opprobrium," the word "opprobrium" most likely means:', a: 'Approval', b: 'Harsh criticism or public disgrace', c: 'Indifference', d: 'Celebration', ans: 'B', sol: 'Opprobrium means harsh criticism or censure; public disgrace. Context clue: "met with" suggests a reaction, and the formal tone implies a negative one.', diff: 'Hard' },
  { q: 'Which of the following is an example of a complex sentence?', a: 'She sang and danced.', b: 'Although it rained, we went out.', c: 'He came. He saw. He conquered.', d: 'The sun rose and the birds sang.', ans: 'B', sol: 'A complex sentence has one independent clause and at least one dependent clause. "Although it rained" is a dependent (subordinate) clause joined to the independent clause "we went out".', diff: 'Medium' },
  { q: 'The literary device used in "The wind whispered through the trees" is:', a: 'Metaphor', b: 'Simile', c: 'Personification', d: 'Hyperbole', ans: 'C', sol: 'Personification gives human qualities to non-human things. Here, the wind is given the human ability to "whisper".', diff: 'Easy' },
  { q: '"To be or not to be, that is the question" is an example of:', a: 'Irony', b: 'Soliloquy', c: 'Allegory', d: 'Satire', ans: 'B', sol: 'This famous line from Shakespeare\'s Hamlet is a soliloquy - a speech in which a character speaks their thoughts aloud while alone on stage.', diff: 'Easy' },
  { q: 'Choose the correct meaning of the underlined word: "His PERFUNCTORY greeting showed he was not interested."', a: 'Enthusiastic', b: 'Carried out with minimum effort', c: 'Warm and friendly', d: 'Loud and clear', ans: 'B', sol: 'Perfunctory means carried out with a minimum of effort or reflection; lacking interest or enthusiasm. Context: "not interested" confirms this meaning.', diff: 'Medium' },
  { q: '"O Romeo, Romeo! Wherefore art thou Romeo?" uses which literary device?', a: 'Apostrophe', b: 'Alliteration', c: 'Onomatopoeia', d: 'Oxymoron', ans: 'A', sol: 'Apostrophe (literary device) is when a speaker addresses an absent person, a dead person, or an abstract idea. Juliet addresses Romeo who is not present before her.', diff: 'Medium' },
  { q: '"Life is a journey" is an example of:', a: 'Simile', b: 'Metaphor', c: 'Personification', d: 'Alliteration', ans: 'B', sol: 'A metaphor directly compares two unlike things without using "like" or "as". Life is compared to a journey. A simile would be "Life is like a journey."', diff: 'Easy' },
  { q: 'The figure of speech in "She sells sea shells on the sea shore" is:', a: 'Metaphor', b: 'Alliteration', c: 'Hyperbole', d: 'Irony', ans: 'B', sol: 'Alliteration is the repetition of the same consonant sound at the beginning of closely connected words. Here, the "s/sh" sound is repeated.', diff: 'Easy' },
  { q: '"The pen is mightier than the sword" is an example of:', a: 'Metonymy', b: 'Simile', c: 'Personification', d: 'Paradox', ans: 'A', sol: 'Metonymy replaces the name of a thing with something closely associated. "Pen" represents writing/ideas, "sword" represents military force/violence.', diff: 'Hard' },
  { q: 'An "oxymoron" is best illustrated by:', a: 'Brave as a lion', b: 'Deafening silence', c: 'The world is a stage', d: 'The wind howled', ans: 'B', sol: 'An oxymoron combines two contradictory terms. "Deafening silence" pairs "deafening" (loud) with "silence" (no sound). Other examples: bittersweet, living dead, cruel kindness.', diff: 'Medium' },
  { q: '"I have told you a million times" is an example of:', a: 'Metaphor', b: 'Simile', c: 'Hyperbole', d: 'Litotes', ans: 'C', sol: 'Hyperbole is deliberate exaggeration for emphasis or effect. "A million times" is an exaggeration to stress that something has been said many times.', diff: 'Easy' },
  { q: 'The tone of the passage "The soldiers marched silently through the devastated village, their eyes hollow with exhaustion" is:', a: 'Joyful', b: 'Somber', c: 'Humorous', d: 'Optimistic', ans: 'B', sol: 'The tone is somber (dark, gloomy). Key words: "silently", "devastated", "hollow with exhaustion" all convey a serious, melancholic mood.', diff: 'Easy' },
  { q: '"Not bad" meaning "good" is an example of:', a: 'Hyperbole', b: 'Litotes', c: 'Irony', d: 'Euphemism', ans: 'B', sol: 'Litotes is an understatement using a negative to express a positive. "Not bad" = good. "Not uncommon" = fairly common. It is a form of deliberate understatement.', diff: 'Hard' },
  { q: 'In the sentence "The camel is the ship of the desert," the figure of speech is:', a: 'Simile', b: 'Metaphor', c: 'Personification', d: 'Hyperbole', ans: 'B', sol: 'This is a metaphor because the camel is directly called "the ship of the desert" without using "like" or "as". It compares the camel\'s role in the desert to a ship\'s role at sea.', diff: 'Easy' },
  { q: 'Which sentence contains an example of irony?', a: 'The fire station burned down.', b: 'The sun is bright today.', c: 'She ran quickly to the store.', d: 'The flowers bloomed in spring.', ans: 'A', sol: 'Situational irony occurs when the outcome is the opposite of what is expected. A fire station, meant to fight fires, burning down is ironic.', diff: 'Medium' },
];

const cdsEnglishFill = [
  { q: '"The scientist\'s theory was so ___ that even experts found it difficult to understand."', a: 'lucid', b: 'abstruse', c: 'simple', d: 'transparent', ans: 'B', sol: 'Abstruse means difficult to understand; obscure. Context clue: "even experts found it difficult" indicates something complex.', diff: 'Hard' },
  { q: '"Despite his ___ nature, he managed to make many friends."', a: 'gregarious', b: 'sociable', c: 'reticent', d: 'extroverted', ans: 'C', sol: '"Despite" indicates contrast. Reticent (reserved, not revealing thoughts) contrasts with "making many friends". Gregarious and sociable would not create contrast.', diff: 'Medium' },
  { q: '"The ___ of evidence against the accused was overwhelming."', a: 'paucity', b: 'plethora', c: 'absence', d: 'lack', ans: 'B', sol: 'Plethora means an excess or overabundance. Context: "overwhelming" suggests a large amount. Paucity means scarcity (opposite).', diff: 'Medium' },
  { q: '"She spoke with such ___ that everyone was convinced of her sincerity."', a: 'duplicity', b: 'eloquence', c: 'ambiguity', d: 'reticence', ans: 'B', sol: 'Eloquence means fluent or persuasive speaking. Context: "everyone was convinced" indicates effective, persuasive speech.', diff: 'Easy' },
  { q: '"The old building was in a state of ___ and needed immediate repair."', a: 'opulence', b: 'dilapidation', c: 'renovation', d: 'grandeur', ans: 'B', sol: 'Dilapidation means the state of being in disrepair or ruin. Context: "needed immediate repair" confirms a state of decay.', diff: 'Easy' },
  { q: '"His ___ behavior at the party embarrassed everyone present."', a: 'decorous', b: 'boorish', c: 'refined', d: 'elegant', ans: 'B', sol: 'Boorish means rough, bad-mannered, insensitive. Context: "embarrassed everyone" indicates rude behavior. Decorous means dignified and proper (opposite).', diff: 'Medium' },
  { q: '"The ___ student always submitted assignments before the deadline."', a: 'dilatory', b: 'punctilious', c: 'negligent', d: 'indolent', ans: 'B', sol: 'Punctilious means showing great attention to detail or correct behavior. Context: "always submitted before deadline" shows conscientiousness. Dilatory means slow, causing delay.', diff: 'Hard' },
  { q: '"The judge was known for his ___ decisions, never favoring either side."', a: 'biased', b: 'partial', c: 'impartial', d: 'prejudiced', ans: 'C', sol: 'Impartial means treating all rivals or disputants equally; fair and just. Context: "never favoring either side" confirms fairness.', diff: 'Easy' },
  { q: '"After the long drought, the ___ rain was welcomed by the farmers."', a: 'sporadic', b: 'copious', c: 'scanty', d: 'meager', ans: 'B', sol: 'Copious means abundant in supply or quantity. After a drought, abundant rain would be welcomed. Sporadic means occurring at irregular intervals.', diff: 'Medium' },
  { q: '"The ___ child refused to obey any rules set by the teachers."', a: 'docile', b: 'obedient', c: 'recalcitrant', d: 'compliant', ans: 'C', sol: 'Recalcitrant means having an obstinately uncooperative attitude. Context: "refused to obey any rules" indicates defiance. Docile means submissive (opposite).', diff: 'Hard' },
  { q: '"The politician\'s speech was full of ___, saying much but meaning little."', a: 'substance', b: 'rhetoric', c: 'clarity', d: 'brevity', ans: 'B', sol: 'Rhetoric here means language designed to have a persuasive effect but lacking sincerity or meaningful content. Context: "saying much but meaning little."', diff: 'Medium' },
  { q: '"The ___ weather forced the cancellation of the outdoor event."', a: 'clement', b: 'inclement', c: 'pleasant', d: 'balmy', ans: 'B', sol: 'Inclement means (of weather) unpleasantly cold or wet. Context: forced cancellation of outdoor event. Clement means mild and pleasant (opposite).', diff: 'Easy' },
  { q: '"Her ___ remarks during the meeting created an uncomfortable atmosphere."', a: 'diplomatic', b: 'tactful', c: 'caustic', d: 'courteous', ans: 'C', sol: 'Caustic means sarcastic in a scathing and bitter way. Context: "created an uncomfortable atmosphere" indicates harsh, biting remarks.', diff: 'Medium' },
  { q: '"The company\'s ___ growth over the past decade has been remarkable."', a: 'stagnant', b: 'exponential', c: 'negligible', d: 'sluggish', ans: 'B', sol: 'Exponential means becoming more and more rapid; increasing at a very fast rate. Context: "remarkable" indicates impressive, rapid growth.', diff: 'Easy' },
  { q: '"The ___ nature of the disease made early detection difficult."', a: 'conspicuous', b: 'insidious', c: 'obvious', d: 'apparent', ans: 'B', sol: 'Insidious means proceeding in a gradual, subtle way but with harmful effects. Context: "early detection difficult" suggests something that develops gradually and is hard to notice.', diff: 'Hard' },
];

// Add all CDS English questions
const allEnglish = [
  { arr: cdsEnglishGrammar, topic: 'Grammar' },
  { arr: cdsEnglishVocab, topic: 'Synonyms and Antonyms' },
  { arr: cdsEnglishIdioms, topic: 'Idioms and Phrases' },
  { arr: cdsEnglishSentence, topic: 'Sentence Correction' },
  { arr: cdsEnglishComprehension, topic: 'Comprehension' },
  { arr: cdsEnglishFill, topic: 'Fill in the Blanks' },
];

allEnglish.forEach(({ arr, topic }) => {
  arr.forEach(item => {
    questions.push({
      examType: 'CDS', subject: 'English', topic, subtopic: '', difficulty: item.diff,
      questionText: item.q, optionA: item.a, optionB: item.b, optionC: item.c, optionD: item.d,
      correctAnswer: item.ans, solution: item.sol, tags: `CDS,English,${topic}`
    });
  });
});


// ============================================================
// CDS - GENERAL KNOWLEDGE (120+ questions)
// ============================================================

const cdsGKHistory = [
  { q: 'The Battle of Plassey (1757) was fought between:', a: 'British East India Company and Siraj-ud-Daulah', b: 'British and Marathas', c: 'British and Tipu Sultan', d: 'French and British', ans: 'A', sol: 'The Battle of Plassey was fought on 23 June 1757 between the British East India Company led by Robert Clive and the Nawab of Bengal, Siraj-ud-Daulah. Mir Jafar\'s betrayal led to British victory.', diff: 'Easy' },
  { q: 'The Doctrine of Lapse was introduced by:', a: 'Lord Dalhousie', b: 'Lord Wellesley', c: 'Lord Cornwallis', d: 'Lord Hastings', ans: 'A', sol: 'Lord Dalhousie (Governor-General, 1848-1856) introduced the Doctrine of Lapse, which stated that any princely state without a natural heir would be annexed by the British. States annexed: Satara, Jhansi, Nagpur.', diff: 'Easy' },
  { q: 'The Quit India Movement was launched in:', a: '1940', b: '1942', c: '1944', d: '1946', ans: 'B', sol: 'The Quit India Movement (August Kranti) was launched on 8 August 1942 by Mahatma Gandhi at the Bombay session of the All India Congress Committee. The slogan was "Do or Die".', diff: 'Easy' },
  { q: 'Who was the first Governor-General of independent India?', a: 'Lord Mountbatten', b: 'C. Rajagopalachari', c: 'Jawaharlal Nehru', d: 'Dr. Rajendra Prasad', ans: 'A', sol: 'Lord Mountbatten was the first Governor-General of independent India (1947-1948). C. Rajagopalachari was the first and last Indian Governor-General (1948-1950).', diff: 'Easy' },
  { q: 'The Jallianwala Bagh massacre took place on:', a: '13 April 1919', b: '13 March 1919', c: '13 April 1920', d: '26 January 1919', ans: 'A', sol: 'On 13 April 1919 (Baisakhi day), General Dyer ordered troops to fire on a peaceful gathering at Jallianwala Bagh, Amritsar. Approximately 379 people were killed (official figure).', diff: 'Easy' },
  { q: 'The Permanent Settlement was introduced in Bengal by:', a: 'Lord Cornwallis', b: 'Lord Wellesley', c: 'Warren Hastings', d: 'Lord Ripon', ans: 'A', sol: 'Lord Cornwallis introduced the Permanent Settlement (Zamindari System) in 1793 in Bengal and Bihar. It fixed the land revenue to be paid by zamindars permanently.', diff: 'Medium' },
  { q: 'The Indian National Congress was founded in:', a: '1880', b: '1885', c: '1890', d: '1895', ans: 'B', sol: 'The Indian National Congress was founded on 28 December 1885 in Bombay by A.O. Hume. The first president was W.C. Bonnerjee. 72 delegates attended the first session.', diff: 'Easy' },
  { q: 'The Rowlatt Act was passed in:', a: '1917', b: '1918', c: '1919', d: '1920', ans: 'C', sol: 'The Rowlatt Act (Anarchical and Revolutionary Crimes Act) was passed on 10 March 1919. It allowed detention without trial and trial without jury. Gandhi called it "Black Act".', diff: 'Medium' },
  { q: 'Who founded the Arya Samaj?', a: 'Raja Ram Mohan Roy', b: 'Swami Dayanand Saraswati', c: 'Swami Vivekananda', d: 'Ishwar Chandra Vidyasagar', ans: 'B', sol: 'Swami Dayanand Saraswati founded the Arya Samaj in 1875 in Bombay. Its motto was "Krinvanto Vishwam Aryam" (Make the world noble). He advocated "Back to the Vedas".', diff: 'Easy' },
  { q: 'The Simon Commission visited India in:', a: '1927', b: '1928', c: '1929', d: '1930', ans: 'B', sol: 'The Simon Commission arrived in India on 3 February 1928. It was boycotted because it had no Indian members. Lala Lajpat Rai was fatally injured during protests against it in Lahore.', diff: 'Medium' },
  { q: 'The first Battle of Panipat (1526) was fought between:', a: 'Babur and Ibrahim Lodi', b: 'Akbar and Hemu', c: 'Humayun and Sher Shah', d: 'Babur and Rana Sanga', ans: 'A', sol: 'The First Battle of Panipat (21 April 1526) was fought between Babur and Ibrahim Lodi. Babur won using superior tactics and artillery, establishing the Mughal Empire in India.', diff: 'Easy' },
  { q: 'The Swadeshi Movement was associated with:', a: 'Non-Cooperation Movement', b: 'Partition of Bengal (1905)', c: 'Quit India Movement', d: 'Civil Disobedience Movement', ans: 'B', sol: 'The Swadeshi Movement (1905-1911) was launched in response to Lord Curzon\'s partition of Bengal. It promoted Indian goods and boycotted British goods. It was the first mass movement.', diff: 'Medium' },
  { q: 'Who gave the slogan "Jai Hind"?', a: 'Mahatma Gandhi', b: 'Subhas Chandra Bose', c: 'Bhagat Singh', d: 'Jawaharlal Nehru', ans: 'B', sol: 'Subhas Chandra Bose popularized the slogan "Jai Hind" (Victory to India). He also gave the call "Give me blood, and I shall give you freedom" and founded the Indian National Army (INA).', diff: 'Easy' },
  { q: 'The Treaty of Srirangapatna (1792) was signed between:', a: 'British and Tipu Sultan', b: 'British and Marathas', c: 'British and Nizam', d: 'British and Mysore Kingdom', ans: 'A', sol: 'The Treaty of Srirangapatna was signed after the Third Anglo-Mysore War (1792) between Tipu Sultan and the British (Lord Cornwallis). Tipu ceded half his territory and paid a large indemnity.', diff: 'Medium' },
  { q: 'The Cripps Mission came to India in:', a: '1940', b: '1942', c: '1944', d: '1946', ans: 'B', sol: 'The Cripps Mission (March 1942) was sent by the British government under Sir Stafford Cripps. It offered Dominion Status after the war. It was rejected by both Congress and Muslim League.', diff: 'Medium' },
  { q: 'Who was the Viceroy of India during the Quit India Movement?', a: 'Lord Irwin', b: 'Lord Linlithgow', c: 'Lord Wavell', d: 'Lord Mountbatten', ans: 'B', sol: 'Lord Linlithgow was the Viceroy during the Quit India Movement (1942). He served as Viceroy from 1936 to 1943, the longest-serving Viceroy.', diff: 'Hard' },
  { q: 'The Morley-Minto Reforms (1909) introduced:', a: 'Separate electorates for Muslims', b: 'Universal adult franchise', c: 'Responsible government', d: 'Provincial autonomy', ans: 'A', sol: 'The Indian Councils Act 1909 (Morley-Minto Reforms) introduced separate electorates for Muslims, which was a policy of "divide and rule". It also increased the size of legislative councils.', diff: 'Medium' },
  { q: 'The Champaran Satyagraha (1917) was related to:', a: 'Salt tax', b: 'Indigo cultivation', c: 'Land revenue', d: 'Textile workers', ans: 'B', sol: 'The Champaran Satyagraha was Gandhi\'s first civil disobedience movement in India. It was against the tinkathia system that forced farmers to grow indigo on 3/20th of their land for British planters.', diff: 'Easy' },
  { q: 'The Indian Independence Act was passed by the British Parliament on:', a: '15 August 1947', b: '18 July 1947', c: '3 June 1947', d: '26 January 1950', ans: 'B', sol: 'The Indian Independence Act 1947 received Royal Assent on 18 July 1947. It provided for the partition of India and the creation of two independent dominions: India and Pakistan, effective 15 August 1947.', diff: 'Hard' },
  { q: 'Who presided over the Lahore Session of Congress (1929)?', a: 'Mahatma Gandhi', b: 'Jawaharlal Nehru', c: 'Subhas Chandra Bose', d: 'Motilal Nehru', ans: 'B', sol: 'Jawaharlal Nehru presided over the Lahore Session (December 1929) where the demand for Purna Swaraj (complete independence) was adopted. 26 January 1930 was declared Independence Day.', diff: 'Medium' },
];

const cdsGKPolity = [
  { q: 'The Indian Constitution came into effect on:', a: '26 January 1950', b: '15 August 1947', c: '26 November 1949', d: '26 January 1947', ans: 'A', sol: '26 January 1950 is Republic Day. The Constitution was adopted on 26 November 1949 but came into effect on 26 January 1950, chosen to honor the Purna Swaraj declaration of 1930.', diff: 'Easy' },
  { q: 'Which article of the Indian Constitution abolishes untouchability?', a: 'Article 14', b: 'Article 15', c: 'Article 17', d: 'Article 21', ans: 'C', sol: 'Article 17 abolishes untouchability and forbids its practice in any form. The Protection of Civil Rights Act, 1955 provides penalties for the enforcement of any disability arising from untouchability.', diff: 'Easy' },
  { q: 'The 73rd Constitutional Amendment deals with:', a: 'Panchayati Raj', b: 'Municipalities', c: 'Fundamental Duties', d: 'Anti-Defection Law', ans: 'A', sol: 'The 73rd Amendment (1992) gave constitutional status to Panchayati Raj institutions. It added Part IX and Schedule 11 to the Constitution. The 74th Amendment deals with Municipalities.', diff: 'Medium' },
  { q: 'The concept of Fundamental Duties was borrowed from:', a: 'USSR Constitution', b: 'US Constitution', c: 'French Constitution', d: 'German Constitution', ans: 'A', sol: 'Fundamental Duties (Article 51A) were added by the 42nd Amendment (1976) on the recommendation of the Swaran Singh Committee. The concept was borrowed from the USSR (Soviet) Constitution.', diff: 'Medium' },
  { q: 'Who is known as the "Father of the Indian Constitution"?', a: 'Jawaharlal Nehru', b: 'Mahatma Gandhi', c: 'Dr. B.R. Ambedkar', d: 'Sardar Patel', ans: 'C', sol: 'Dr. B.R. Ambedkar was the Chairman of the Drafting Committee of the Constituent Assembly and is regarded as the chief architect of the Indian Constitution.', diff: 'Easy' },
  { q: 'The Rajya Sabha can have a maximum of ___ members.', a: '238', b: '245', c: '250', d: '260', ans: 'C', sol: 'Article 80 provides that Rajya Sabha can have a maximum of 250 members: 238 elected by state/UT legislatures and 12 nominated by the President for expertise in literature, science, art, and social service.', diff: 'Medium' },
  { q: 'Which Schedule of the Constitution deals with the allocation of seats in the Rajya Sabha?', a: 'Third Schedule', b: 'Fourth Schedule', c: 'Fifth Schedule', d: 'Sixth Schedule', ans: 'B', sol: 'The Fourth Schedule allocates seats to states and UTs in the Rajya Sabha. The allocation is roughly proportional to population.', diff: 'Hard' },
  { q: 'The President of India can be removed by:', a: 'Impeachment by Parliament', b: 'No-confidence motion', c: 'Supreme Court order', d: 'Cabinet resolution', ans: 'A', sol: 'Article 61 provides for impeachment of the President for "violation of the Constitution". The process requires a special majority in both Houses of Parliament.', diff: 'Easy' },
  { q: 'Which writ is known as the "bulwark of individual liberty"?', a: 'Mandamus', b: 'Habeas Corpus', c: 'Certiorari', d: 'Quo Warranto', ans: 'B', sol: 'Habeas Corpus (meaning "produce the body") is considered the bulwark of individual liberty. It is issued to produce a detained person before the court to examine the legality of detention.', diff: 'Medium' },
  { q: 'The 42nd Constitutional Amendment is known as:', a: 'Mini Constitution', b: 'Magna Carta of India', c: 'Bill of Rights', d: 'Charter of Liberty', ans: 'A', sol: 'The 42nd Amendment (1976), passed during the Emergency, is called the "Mini Constitution" because it made the most extensive changes: added Fundamental Duties, changed Preamble (added Socialist, Secular, Integrity), and more.', diff: 'Medium' },
  { q: 'The concept of Judicial Review in India is based on:', a: 'Rule of Law', b: 'Due Process of Law', c: 'Procedure Established by Law', d: 'Both A and C', ans: 'D', sol: 'Judicial Review in India is based on the Rule of Law (from UK) and Procedure Established by Law (Article 21). The Supreme Court can review laws for constitutionality under Articles 13, 32, and 226.', diff: 'Hard' },
  { q: 'The Finance Commission is constituted under Article:', a: '280', b: '300', c: '320', d: '340', ans: 'A', sol: 'Article 280 provides for the constitution of a Finance Commission every five years by the President. It recommends the distribution of tax revenues between the Centre and States.', diff: 'Medium' },
  { q: 'The Right to Education was made a Fundamental Right by the:', a: '86th Amendment', b: '91st Amendment', c: '93rd Amendment', d: '97th Amendment', ans: 'A', sol: 'The 86th Amendment (2002) inserted Article 21A, making free and compulsory education for children aged 6-14 a Fundamental Right. The RTE Act was enacted in 2009.', diff: 'Medium' },
  { q: 'The Inter-State Council is established under Article:', a: '243', b: '263', c: '280', d: '300', ans: 'B', sol: 'Article 263 empowers the President to establish an Inter-State Council to investigate and discuss subjects of common interest between the Centre and States.', diff: 'Hard' },
  { q: 'The maximum strength of the Lok Sabha is:', a: '545', b: '550', c: '552', d: '555', ans: 'C', sol: 'Article 81 provides for a maximum of 552 members: 530 from states, 20 from UTs, and 2 nominated Anglo-Indians (though the 104th Amendment removed Anglo-Indian nomination in 2020).', diff: 'Medium' },
  { q: 'Which part of the Constitution deals with Fundamental Rights?', a: 'Part II', b: 'Part III', c: 'Part IV', d: 'Part V', ans: 'B', sol: 'Part III (Articles 12-35) deals with Fundamental Rights. Part IV deals with Directive Principles. Part IVA deals with Fundamental Duties.', diff: 'Easy' },
  { q: 'The concept of "Basic Structure" of the Constitution was established in:', a: 'Golaknath case (1967)', b: 'Kesavananda Bharati case (1973)', c: 'Minerva Mills case (1980)', d: 'Maneka Gandhi case (1978)', ans: 'B', sol: 'In Kesavananda Bharati v. State of Kerala (1973), the Supreme Court held that Parliament can amend any part of the Constitution but cannot alter its "basic structure". This is a landmark doctrine.', diff: 'Hard' },
  { q: 'The Election Commission of India is a:', a: 'Single-member body', b: 'Multi-member body', c: 'Constitutional body that can be single or multi-member', d: 'Statutory body', ans: 'C', sol: 'Article 324 provides for the Election Commission. It can be single-member or multi-member. Currently it has a Chief Election Commissioner and two Election Commissioners.', diff: 'Medium' },
  { q: 'The Comptroller and Auditor General of India is appointed by:', a: 'Prime Minister', b: 'President', c: 'Parliament', d: 'Chief Justice', ans: 'B', sol: 'Article 148 provides that the CAG is appointed by the President. The CAG audits all government expenditure and reports to Parliament. The CAG can be removed only by impeachment.', diff: 'Easy' },
  { q: 'Residuary powers under the Indian Constitution belong to:', a: 'State Legislature', b: 'Central Government (Parliament)', c: 'Concurrent List', d: 'Local Bodies', ans: 'B', sol: 'Article 248 gives residuary powers to Parliament. Any matter not in the State List or Concurrent List falls under Parliament\'s jurisdiction. This is borrowed from the Canadian Constitution.', diff: 'Medium' },
];

const cdsGKGeography = [
  { q: 'Which river is known as the "Sorrow of Bengal"?', a: 'Ganga', b: 'Brahmaputra', c: 'Damodar', d: 'Hooghly', ans: 'C', sol: 'The Damodar River is called the "Sorrow of Bengal" due to its devastating floods. After the Damodar Valley Corporation (DVC) was established in 1948, flooding has been controlled. The Kosi is the "Sorrow of Bihar".', diff: 'Easy' },
  { q: 'The Tropic of Cancer passes through how many Indian states?', a: '6', b: '7', c: '8', d: '9', ans: 'C', sol: 'The Tropic of Cancer (23.5 N) passes through 8 Indian states: Gujarat, Rajasthan, Madhya Pradesh, Chhattisgarh, Jharkhand, West Bengal, Tripura, and Mizoram.', diff: 'Medium' },
  { q: 'Which soil type is most suitable for cotton cultivation?', a: 'Alluvial soil', b: 'Black soil (Regur)', c: 'Red soil', d: 'Laterite soil', ans: 'B', sol: 'Black soil (Regur/Black Cotton Soil) is ideal for cotton cultivation. It is rich in iron, lime, calcium, and magnesium. Found in Maharashtra, Gujarat, MP. It has high moisture retention capacity.', diff: 'Easy' },
  { q: 'The Western Ghats are also known as:', a: 'Sahyadri', b: 'Vindhya', c: 'Satpura', d: 'Aravalli', ans: 'A', sol: 'The Western Ghats are also called Sahyadri. They run parallel to the western coast from the Tapi River to Kanyakumari, covering about 1,600 km. They are a UNESCO World Heritage Site.', diff: 'Easy' },
  { q: 'Which Indian state has the longest coastline?', a: 'Tamil Nadu', b: 'Andhra Pradesh', c: 'Gujarat', d: 'Maharashtra', ans: 'C', sol: 'Gujarat has the longest coastline in India at approximately 1,600 km. It is followed by Andhra Pradesh and Tamil Nadu.', diff: 'Easy' },
  { q: 'The Chilika Lake is located in:', a: 'Odisha', b: 'Andhra Pradesh', c: 'Tamil Nadu', d: 'Kerala', ans: 'A', sol: 'Chilika Lake is Asia\'s largest brackish water lagoon, located in Odisha. It is a Ramsar site and home to the Irrawaddy dolphin.', diff: 'Easy' },
  { q: 'Which pass connects Srinagar to Leh?', a: 'Rohtang Pass', b: 'Zoji La', c: 'Khyber Pass', d: 'Banihal Pass', ans: 'B', sol: 'Zoji La (3,528m) connects Srinagar (Kashmir Valley) to Leh (Ladakh) on NH1. Banihal Pass connects Jammu to Srinagar. Rohtang Pass connects Manali to Lahaul-Spiti.', diff: 'Medium' },
  { q: 'The Sundarbans delta is formed by rivers:', a: 'Ganga and Brahmaputra', b: 'Ganga and Yamuna', c: 'Brahmaputra and Meghna', d: 'Krishna and Godavari', ans: 'A', sol: 'The Sundarbans is the world\'s largest mangrove forest, formed by the delta of the Ganga and Brahmaputra rivers in the Bay of Bengal. It spans India and Bangladesh.', diff: 'Easy' },
  { q: 'Which is the largest freshwater lake in India?', a: 'Dal Lake', b: 'Wular Lake', c: 'Chilika Lake', d: 'Loktak Lake', ans: 'B', sol: 'Wular Lake in Jammu & Kashmir is the largest freshwater lake in India (area about 189 sq km). It is fed by the Jhelum River. Chilika is brackish, not freshwater.', diff: 'Medium' },
  { q: 'The Narmada River flows into:', a: 'Bay of Bengal', b: 'Arabian Sea', c: 'Indian Ocean', d: 'Palk Strait', ans: 'B', sol: 'The Narmada flows westward into the Arabian Sea. It is one of only three major rivers in peninsular India that flow westward (Narmada, Tapi, and Mahi). Most peninsular rivers flow eastward.', diff: 'Easy' },
  { q: 'The highest rainfall in India is recorded at:', a: 'Cherrapunji', b: 'Mawsynram', c: 'Agumbe', d: 'Mahabaleshwar', ans: 'B', sol: 'Mawsynram in Meghalaya receives the highest average annual rainfall in India (about 11,871 mm). Cherrapunji holds the record for highest rainfall in a single year.', diff: 'Medium' },
  { q: 'The Palk Strait separates India from:', a: 'Myanmar', b: 'Sri Lanka', c: 'Maldives', d: 'Bangladesh', ans: 'B', sol: 'The Palk Strait separates India (Tamil Nadu) from Sri Lanka. It is about 53-80 km wide. Adam\'s Bridge (Ram Setu) is a chain of limestone shoals in the Palk Strait.', diff: 'Easy' },
  { q: 'Which Indian state is the largest producer of tea?', a: 'Kerala', b: 'West Bengal', c: 'Assam', d: 'Tamil Nadu', ans: 'C', sol: 'Assam is the largest producer of tea in India, accounting for over 50% of total production. The Assam tea variety is known for its strong, malty flavor.', diff: 'Easy' },
  { q: 'The Thar Desert is located in:', a: 'Gujarat only', b: 'Rajasthan only', c: 'Rajasthan and Gujarat', d: 'Rajasthan, Gujarat, Punjab, and Haryana', ans: 'D', sol: 'The Thar Desert (Great Indian Desert) extends across Rajasthan, Gujarat, Punjab, and Haryana in India, and Sindh and Punjab in Pakistan. It covers about 200,000 sq km.', diff: 'Medium' },
  { q: 'The Andaman and Nicobar Islands are separated by:', a: 'Ten Degree Channel', b: 'Eight Degree Channel', c: 'Palk Strait', d: 'Duncan Passage', ans: 'A', sol: 'The Ten Degree Channel (10 N latitude) separates the Andaman Islands from the Nicobar Islands. The Eight Degree Channel separates Minicoy from the Maldives.', diff: 'Medium' },
  { q: 'Which river is known as "Dakshin Ganga" (Ganga of the South)?', a: 'Krishna', b: 'Kaveri', c: 'Godavari', d: 'Tungabhadra', ans: 'C', sol: 'The Godavari is called "Dakshin Ganga" (Ganga of the South). It is the longest peninsular river (1,465 km), originating at Trimbakeshwar in Maharashtra.', diff: 'Easy' },
  { q: 'The Siachen Glacier is located in:', a: 'Himachal Pradesh', b: 'Uttarakhand', c: 'Ladakh (Karakoram Range)', d: 'Sikkim', ans: 'C', sol: 'The Siachen Glacier is in the eastern Karakoram Range in Ladakh. At 76 km, it is the longest glacier in the Karakoram and the second-longest in the non-polar world.', diff: 'Medium' },
  { q: 'Which type of forest is found in the Western Ghats?', a: 'Tropical Deciduous', b: 'Tropical Evergreen', c: 'Alpine', d: 'Mangrove', ans: 'B', sol: 'The Western Ghats receive heavy rainfall (over 200 cm) and support Tropical Evergreen Forests (also called Tropical Rain Forests). These are dense, multi-layered forests with no definite time for shedding leaves.', diff: 'Medium' },
  { q: 'India\'s longest river bridge (Dhola-Sadiya) is over which river?', a: 'Ganga', b: 'Brahmaputra', c: 'Lohit', d: 'Godavari', ans: 'C', sol: 'The Bhupen Hazarika Setu (Dhola-Sadiya Bridge), at 9.15 km, is India\'s longest river bridge. It crosses the Lohit River (a tributary of the Brahmaputra) in Assam.', diff: 'Hard' },
  { q: 'The Konkan Coast stretches from:', a: 'Goa to Kanyakumari', b: 'Mumbai to Goa', c: 'Daman to Goa', d: 'Gujarat to Kerala', ans: 'C', sol: 'The Konkan Coast is the western coastal stretch from Daman (north) to Goa (south), covering parts of Maharashtra and Goa. South of Goa is the Malabar Coast (Karnataka and Kerala).', diff: 'Medium' },
];

const cdsGKScience = [
  { q: 'Which vitamin is produced in the human body when exposed to sunlight?', a: 'Vitamin A', b: 'Vitamin B12', c: 'Vitamin C', d: 'Vitamin D', ans: 'D', sol: 'Vitamin D (calciferol) is synthesized in the skin when exposed to ultraviolet B (UVB) radiation from sunlight. It is essential for calcium absorption and bone health.', diff: 'Easy' },
  { q: 'The pH value of human blood is approximately:', a: '6.4', b: '7.0', c: '7.4', d: '8.0', ans: 'C', sol: 'Normal human blood pH is 7.35-7.45 (slightly alkaline). pH below 7.35 is acidosis; above 7.45 is alkalosis.', diff: 'Medium' },
  { q: 'Which gas is used in the manufacture of vanaspati ghee?', a: 'Oxygen', b: 'Hydrogen', c: 'Nitrogen', d: 'Carbon dioxide', ans: 'B', sol: 'Hydrogen gas is used in the hydrogenation process to convert liquid vegetable oils into solid vanaspati ghee. A nickel catalyst is used at 200 C.', diff: 'Easy' },
  { q: 'The powerhouse of the cell is:', a: 'Nucleus', b: 'Ribosome', c: 'Mitochondria', d: 'Golgi body', ans: 'C', sol: 'Mitochondria are called the "powerhouse of the cell" because they produce ATP (adenosine triphosphate) through cellular respiration.', diff: 'Easy' },
  { q: 'Which metal is the best conductor of electricity?', a: 'Copper', b: 'Gold', c: 'Silver', d: 'Aluminium', ans: 'C', sol: 'Silver is the best conductor of electricity, followed by copper, gold, and aluminium. However, copper is more commonly used in wiring due to its lower cost.', diff: 'Easy' },
  { q: 'The chemical formula of baking soda is:', a: 'NaCl', b: 'NaHCO3', c: 'Na2CO3', d: 'CaCO3', ans: 'B', sol: 'Baking soda is sodium bicarbonate (NaHCO3). Na2CO3 is washing soda. NaCl is common salt. CaCO3 is limestone/chalk.', diff: 'Easy' },
  { q: 'Which planet is known as the "Red Planet"?', a: 'Venus', b: 'Jupiter', c: 'Mars', d: 'Saturn', ans: 'C', sol: 'Mars is called the Red Planet due to iron oxide (rust) on its surface giving it a reddish appearance. It has two moons: Phobos and Deimos.', diff: 'Easy' },
  { q: 'The process of conversion of sugar into alcohol is called:', a: 'Oxidation', b: 'Fermentation', c: 'Hydrogenation', d: 'Distillation', ans: 'B', sol: 'Fermentation is the anaerobic process where yeast converts sugar (glucose) into ethanol (alcohol) and carbon dioxide.', diff: 'Easy' },
  { q: 'Which organ in the human body produces insulin?', a: 'Liver', b: 'Kidney', c: 'Pancreas', d: 'Spleen', ans: 'C', sol: 'Insulin is produced by the beta cells of the Islets of Langerhans in the pancreas. Insulin regulates blood sugar levels. Deficiency causes diabetes mellitus.', diff: 'Easy' },
  { q: 'The hardest natural substance is:', a: 'Gold', b: 'Iron', c: 'Diamond', d: 'Platinum', ans: 'C', sol: 'Diamond (pure carbon in crystalline form) is the hardest known natural substance, scoring 10 on the Mohs hardness scale.', diff: 'Easy' },
  { q: 'Which blood group is known as the "universal donor"?', a: 'A', b: 'B', c: 'AB', d: 'O', ans: 'D', sol: 'Blood group O negative is the universal donor because it has no A, B, or Rh antigens. Blood group AB positive is the universal recipient.', diff: 'Easy' },
  { q: 'The SI unit of electric current is:', a: 'Volt', b: 'Watt', c: 'Ampere', d: 'Ohm', ans: 'C', sol: 'The SI unit of electric current is the Ampere (A). Volt is for potential difference, Watt for power, and Ohm for resistance.', diff: 'Easy' },
  { q: 'Photosynthesis takes place in which part of the plant cell?', a: 'Mitochondria', b: 'Chloroplast', c: 'Nucleus', d: 'Ribosome', ans: 'B', sol: 'Photosynthesis occurs in chloroplasts, which contain chlorophyll (green pigment). The equation: 6CO2 + 6H2O + light energy -> C6H12O6 + 6O2.', diff: 'Easy' },
  { q: 'The chemical name of Vitamin C is:', a: 'Retinol', b: 'Ascorbic acid', c: 'Thiamine', d: 'Calciferol', ans: 'B', sol: 'Vitamin C is ascorbic acid. Vitamin A is retinol. Vitamin B1 is thiamine. Vitamin D is calciferol. Vitamin C deficiency causes scurvy.', diff: 'Easy' },
  { q: 'Sound cannot travel through:', a: 'Air', b: 'Water', c: 'Steel', d: 'Vacuum', ans: 'D', sol: 'Sound requires a medium (solid, liquid, or gas) to travel. It cannot travel through a vacuum because there are no particles to vibrate and transmit the wave.', diff: 'Easy' },
  { q: 'The element with the highest electronegativity is:', a: 'Oxygen', b: 'Chlorine', c: 'Fluorine', d: 'Nitrogen', ans: 'C', sol: 'Fluorine has the highest electronegativity (3.98 on the Pauling scale). Electronegativity increases across a period and decreases down a group in the periodic table.', diff: 'Medium' },
  { q: 'Which disease is caused by deficiency of Vitamin B1 (Thiamine)?', a: 'Scurvy', b: 'Beriberi', c: 'Rickets', d: 'Pellagra', ans: 'B', sol: 'Beriberi is caused by Vitamin B1 (Thiamine) deficiency. Scurvy = Vitamin C. Rickets = Vitamin D. Pellagra = Vitamin B3 (Niacin). Night blindness = Vitamin A.', diff: 'Medium' },
  { q: 'The ozone layer is found in which layer of the atmosphere?', a: 'Troposphere', b: 'Stratosphere', c: 'Mesosphere', d: 'Thermosphere', ans: 'B', sol: 'The ozone layer is in the stratosphere (15-35 km altitude). It absorbs 97-99% of the Sun\'s harmful ultraviolet radiation. CFCs deplete the ozone layer.', diff: 'Easy' },
  { q: 'Which acid is present in the human stomach?', a: 'Sulphuric acid', b: 'Nitric acid', c: 'Hydrochloric acid', d: 'Acetic acid', ans: 'C', sol: 'Hydrochloric acid (HCl) is secreted by parietal cells in the stomach. It helps in digestion of proteins and kills bacteria. The stomach pH is 1.5-3.5.', diff: 'Easy' },
  { q: 'The speed of light in vacuum is approximately:', a: '3 x 10^6 m/s', b: '3 x 10^8 m/s', c: '3 x 10^10 m/s', d: '3 x 10^5 m/s', ans: 'B', sol: 'The speed of light in vacuum is approximately 3 x 10^8 m/s (299,792,458 m/s exactly). It is the fastest speed possible in the universe according to Einstein\'s theory of relativity.', diff: 'Easy' },
];

const cdsGKDefence = [
  { q: 'The motto of the Indian Army is:', a: 'Nabhah Sparsham Deeptam', b: 'Service Before Self', c: 'Sham No Varunah', d: 'Satyamev Jayate', ans: 'B', sol: 'The Indian Army\'s motto is "Service Before Self". The Indian Navy\'s motto is "Sham No Varunah" (May the Lord of Water be auspicious unto us). The IAF\'s motto is "Nabhah Sparsham Deeptam" (Touch the Sky with Glory).', diff: 'Easy' },
  { q: 'The Indian Military Academy (IMA) is located at:', a: 'Pune', b: 'Dehradun', c: 'Chennai', d: 'Khadakwasla', ans: 'B', sol: 'The Indian Military Academy (IMA) is located in Dehradun, Uttarakhand. It was established in 1932. The National Defence Academy (NDA) is in Khadakwasla, Pune.', diff: 'Easy' },
  { q: 'Operation Vijay (1999) is associated with:', a: 'Liberation of Goa', b: 'Kargil War', c: 'Indo-Pak War 1971', d: 'Siachen conflict', ans: 'B', sol: 'Operation Vijay was the Indian military operation to recapture territory in the Kargil district during the 1999 Kargil War. India successfully evicted Pakistani intruders from the heights.', diff: 'Easy' },
  { q: 'The Chief of Defence Staff (CDS) post was created in:', a: '2018', b: '2019', c: '2020', d: '2021', ans: 'C', sol: 'The post of Chief of Defence Staff was created on 1 January 2020. General Bipin Rawat was the first CDS. The CDS serves as the permanent chairman of the Chiefs of Staff Committee.', diff: 'Medium' },
  { q: 'INS Vikrant is India\'s first:', a: 'Nuclear submarine', b: 'Indigenous aircraft carrier', c: 'Destroyer', d: 'Frigate', ans: 'B', sol: 'INS Vikrant (IAC-1) is India\'s first indigenously designed and built aircraft carrier, commissioned on 2 September 2022. It was built by Cochin Shipyard Limited.', diff: 'Easy' },
  { q: 'The National Defence Academy (NDA) is located at:', a: 'Dehradun', b: 'Khadakwasla, Pune', c: 'Chennai', d: 'Hyderabad', ans: 'B', sol: 'The NDA is located at Khadakwasla near Pune, Maharashtra. It is the joint services academy of the Indian Armed Forces where cadets of Army, Navy, and Air Force train together.', diff: 'Easy' },
  { q: 'The Param Vir Chakra is India\'s highest:', a: 'Civilian award', b: 'Wartime gallantry award', c: 'Peacetime gallantry award', d: 'Sports award', ans: 'B', sol: 'The Param Vir Chakra (PVC) is India\'s highest wartime gallantry award. It was instituted on 26 January 1950. The Ashoka Chakra is the highest peacetime gallantry award.', diff: 'Easy' },
  { q: 'The Indian Air Force was established in:', a: '1930', b: '1932', c: '1935', d: '1947', ans: 'B', sol: 'The Indian Air Force was established on 8 October 1932 as the Royal Indian Air Force. It was renamed the Indian Air Force after independence. 8 October is celebrated as Air Force Day.', diff: 'Medium' },
  { q: 'BrahMos missile is a joint venture between India and:', a: 'France', b: 'Israel', c: 'Russia', d: 'USA', ans: 'C', sol: 'BrahMos is a joint venture between India (DRDO) and Russia (NPO Mashinostroyeniya). It is a supersonic cruise missile with a range of about 290-450 km. Named after Brahmaputra and Moskva rivers.', diff: 'Easy' },
  { q: 'The Agni-V missile has a range of approximately:', a: '1000 km', b: '3000 km', c: '5000 km', d: '8000 km', ans: 'C', sol: 'Agni-V is an intercontinental ballistic missile (ICBM) with a range of over 5,000 km. It is a three-stage solid-fueled missile developed by DRDO. It can carry nuclear warheads.', diff: 'Medium' },
];

const cdsGKEconomy = [
  { q: 'The Reserve Bank of India was established in:', a: '1935', b: '1947', c: '1950', d: '1949', ans: 'A', sol: 'The RBI was established on 1 April 1935 based on the recommendations of the Hilton Young Commission (1926). It was nationalized on 1 January 1949.', diff: 'Easy' },
  { q: 'GST was implemented in India on:', a: '1 April 2017', b: '1 July 2017', c: '1 January 2017', d: '1 October 2017', ans: 'B', sol: 'The Goods and Services Tax (GST) was implemented on 1 July 2017 through the 101st Constitutional Amendment. It replaced multiple indirect taxes with a unified tax structure.', diff: 'Easy' },
  { q: 'Which Five Year Plan is known as the "Mahalanobis Plan"?', a: 'First', b: 'Second', c: 'Third', d: 'Fourth', ans: 'B', sol: 'The Second Five Year Plan (1956-1961) is known as the Mahalanobis Plan, named after statistician P.C. Mahalanobis. It focused on rapid industrialization with emphasis on heavy industries.', diff: 'Medium' },
  { q: 'NITI Aayog replaced the Planning Commission in:', a: '2014', b: '2015', c: '2016', d: '2017', ans: 'B', sol: 'NITI Aayog (National Institution for Transforming India) was established on 1 January 2015, replacing the Planning Commission (est. 1950). It serves as a think tank for the government.', diff: 'Easy' },
  { q: 'The fiscal deficit of the government refers to:', a: 'Total expenditure minus total revenue', b: 'Total expenditure minus total receipts excluding borrowings', c: 'Revenue expenditure minus revenue receipts', d: 'Capital expenditure minus capital receipts', ans: 'B', sol: 'Fiscal Deficit = Total Expenditure - Total Receipts (excluding borrowings). It indicates the total borrowing requirements of the government.', diff: 'Medium' },
  { q: 'SEBI was established in:', a: '1988', b: '1990', c: '1992', d: '1995', ans: 'C', sol: 'The Securities and Exchange Board of India (SEBI) was established as a statutory body on 12 April 1992 through the SEBI Act. It regulates the securities market in India.', diff: 'Medium' },
  { q: 'The largest commercial bank in India is:', a: 'Punjab National Bank', b: 'Bank of Baroda', c: 'State Bank of India', d: 'ICICI Bank', ans: 'C', sol: 'State Bank of India (SBI) is the largest commercial bank in India by assets, deposits, branches, and employees. It was established in 1955 (originally Imperial Bank of India, 1806).', diff: 'Easy' },
  { q: 'The base year for the current GDP calculation in India is:', a: '2004-05', b: '2011-12', c: '2015-16', d: '2017-18', ans: 'B', sol: 'The current base year for GDP calculation in India is 2011-12. The Central Statistics Office (CSO) revised the base year from 2004-05 to 2011-12 in January 2015.', diff: 'Hard' },
  { q: 'Which committee recommended the introduction of GST in India?', a: 'Kelkar Committee', b: 'Vijay Kelkar Task Force', c: 'Raja Chelliah Committee', d: 'Rangarajan Committee', ans: 'A', sol: 'The Kelkar Task Force (2004) first recommended a comprehensive GST. The Empowered Committee of State Finance Ministers then worked on the GST design.', diff: 'Hard' },
  { q: 'The currency of India is issued by:', a: 'Government of India', b: 'Reserve Bank of India', c: 'State Bank of India', d: 'Finance Ministry', ans: 'B', sol: 'The RBI issues all currency notes (except Re 1 note, which is issued by the Ministry of Finance). Coins are minted by the Government of India but distributed by the RBI.', diff: 'Easy' },
];

// Add all CDS GK questions
const allGK = [
  { arr: cdsGKHistory, topic: 'History' },
  { arr: cdsGKPolity, topic: 'Polity' },
  { arr: cdsGKGeography, topic: 'Geography' },
  { arr: cdsGKScience, topic: 'Science' },
  { arr: cdsGKDefence, topic: 'Defence' },
  { arr: cdsGKEconomy, topic: 'Economy' },
];

allGK.forEach(({ arr, topic }) => {
  arr.forEach(item => {
    questions.push({
      examType: 'CDS', subject: 'General Knowledge', topic, subtopic: '', difficulty: item.diff,
      questionText: item.q, optionA: item.a, optionB: item.b, optionC: item.c, optionD: item.d,
      correctAnswer: item.ans, solution: item.sol, tags: `CDS,GK,${topic}`
    });
  });
});


// ============================================================
// CDS - ELEMENTARY MATHEMATICS (100+ questions)
// ============================================================

const cdsMathArithmetic = [
  { q: 'If the cost price of an article is Rs 400 and it is sold at a profit of 25%, the selling price is:', a: 'Rs 450', b: 'Rs 475', c: 'Rs 500', d: 'Rs 525', ans: 'C', sol: 'SP = CP + Profit = 400 + (25/100 x 400) = 400 + 100 = Rs 500.', diff: 'Easy' },
  { q: 'A train 150m long passes a pole in 15 seconds. Its speed is:', a: '36 km/h', b: '10 km/h', c: '54 km/h', d: '40 km/h', ans: 'A', sol: 'Speed = Distance/Time = 150/15 = 10 m/s. Converting: 10 x 18/5 = 36 km/h.', diff: 'Easy' },
  { q: 'The simple interest on Rs 5000 at 8% per annum for 3 years is:', a: 'Rs 1000', b: 'Rs 1200', c: 'Rs 1500', d: 'Rs 800', ans: 'B', sol: 'SI = PRT/100 = 5000 x 8 x 3 / 100 = Rs 1200.', diff: 'Easy' },
  { q: 'If A can do a work in 12 days and B can do it in 18 days, together they can finish it in:', a: '7.2 days', b: '6 days', c: '8 days', d: '9 days', ans: 'A', sol: 'A\'s rate = 1/12, B\'s rate = 1/18. Combined = 1/12 + 1/18 = 5/36. Time = 36/5 = 7.2 days.', diff: 'Easy' },
  { q: 'The ratio of two numbers is 3:5 and their sum is 64. The larger number is:', a: '24', b: '36', c: '40', d: '48', ans: 'C', sol: 'Let numbers be 3x and 5x. 3x + 5x = 64, so 8x = 64, x = 8. Larger number = 5 x 8 = 40.', diff: 'Easy' },
  { q: 'A shopkeeper marks an article 40% above cost price and gives a discount of 20%. His profit percentage is:', a: '10%', b: '12%', c: '15%', d: '20%', ans: 'B', sol: 'Let CP = 100. MP = 140. SP = 140 x 80/100 = 112. Profit = 12%.', diff: 'Medium' },
  { q: 'The compound interest on Rs 10000 at 10% per annum for 2 years is:', a: 'Rs 2000', b: 'Rs 2100', c: 'Rs 2200', d: 'Rs 2500', ans: 'B', sol: 'CI = P[(1+R/100)^n - 1] = 10000[(1.1)^2 - 1] = 10000 x 0.21 = Rs 2100.', diff: 'Medium' },
  { q: 'A boat goes 24 km upstream in 6 hours and 24 km downstream in 4 hours. The speed of the boat in still water is:', a: '4 km/h', b: '5 km/h', c: '6 km/h', d: '7 km/h', ans: 'B', sol: 'Upstream speed = 24/6 = 4 km/h. Downstream speed = 24/4 = 6 km/h. Speed in still water = (4+6)/2 = 5 km/h.', diff: 'Medium' },
  { q: 'The average of first 50 natural numbers is:', a: '25', b: '25.5', c: '26', d: '50', ans: 'B', sol: 'Average = Sum/Count = [n(n+1)/2]/n = (n+1)/2 = (50+1)/2 = 25.5.', diff: 'Easy' },
  { q: 'If 40% of a number is 80, the number is:', a: '160', b: '200', c: '240', d: '320', ans: 'B', sol: '40% of x = 80. x = 80 x 100/40 = 200.', diff: 'Easy' },
  { q: 'A pipe can fill a tank in 6 hours. Another pipe can empty it in 8 hours. If both are opened, the tank will be filled in:', a: '12 hours', b: '18 hours', c: '24 hours', d: '20 hours', ans: 'C', sol: 'Net rate = 1/6 - 1/8 = (4-3)/24 = 1/24. Time = 24 hours.', diff: 'Medium' },
  { q: 'The LCM of 12, 18, and 24 is:', a: '36', b: '48', c: '72', d: '144', ans: 'C', sol: '12 = 2^2 x 3, 18 = 2 x 3^2, 24 = 2^3 x 3. LCM = 2^3 x 3^2 = 8 x 9 = 72.', diff: 'Easy' },
  { q: 'A man walks at 5 km/h for 6 hours and at 4 km/h for 12 hours. His average speed is:', a: '4.33 km/h', b: '4.5 km/h', c: '4.67 km/h', d: '5 km/h', ans: 'A', sol: 'Total distance = 5x6 + 4x12 = 30 + 48 = 78 km. Total time = 18 hours. Average speed = 78/18 = 4.33 km/h.', diff: 'Medium' },
  { q: 'Two numbers are in the ratio 2:3. If 4 is added to each, the ratio becomes 5:7. The numbers are:', a: '16 and 24', b: '8 and 12', c: '12 and 18', d: '20 and 30', ans: 'A', sol: 'Let numbers be 2x and 3x. (2x+4)/(3x+4) = 5/7. 14x+28 = 15x+20. x = 8. Numbers: 16 and 24.', diff: 'Medium' },
  { q: 'A sum of money doubles itself in 8 years at simple interest. The rate of interest is:', a: '10%', b: '12.5%', c: '15%', d: '20%', ans: 'B', sol: 'If P doubles, SI = P. SI = PRT/100. P = P x R x 8/100. R = 100/8 = 12.5%.', diff: 'Medium' },
  { q: 'The difference between CI and SI on Rs 5000 for 2 years at 10% per annum is:', a: 'Rs 25', b: 'Rs 50', c: 'Rs 75', d: 'Rs 100', ans: 'B', sol: 'Difference for 2 years = P(R/100)^2 = 5000 x (10/100)^2 = 5000 x 0.01 = Rs 50.', diff: 'Medium' },
  { q: 'A mixture of 40 litres has milk and water in the ratio 3:1. How much water must be added to make the ratio 2:1?', a: '5 litres', b: '10 litres', c: '15 litres', d: '20 litres', ans: 'A', sol: 'Milk = 30L, Water = 10L. Let x litres of water be added. 30/(10+x) = 2/1. 30 = 20+2x. x = 5 litres.', diff: 'Medium' },
  { q: 'Three taps A, B, C can fill a tank in 10, 15, and 20 hours respectively. If all three are opened together, the tank will be filled in:', a: '4 hours 37 min', b: '5 hours', c: '6 hours', d: '7 hours 30 min', ans: 'A', sol: 'Combined rate = 1/10 + 1/15 + 1/20 = 6/60 + 4/60 + 3/60 = 13/60. Time = 60/13 = 4 hours 37 min (approx).', diff: 'Hard' },
  { q: 'A car covers 360 km in 6 hours. A bike covers the same distance in 8 hours. The ratio of their speeds is:', a: '3:4', b: '4:3', c: '2:3', d: '3:2', ans: 'B', sol: 'Car speed = 360/6 = 60 km/h. Bike speed = 360/8 = 45 km/h. Ratio = 60:45 = 4:3.', diff: 'Easy' },
  { q: 'If the selling price of 12 articles equals the cost price of 15 articles, the profit percentage is:', a: '20%', b: '25%', c: '30%', d: '33.33%', ans: 'B', sol: 'Let CP of 1 article = 1. CP of 12 = 12. SP of 12 = CP of 15 = 15. Profit = 3. Profit% = 3/12 x 100 = 25%.', diff: 'Medium' },
  { q: 'A and B together can complete a work in 8 days. B and C together in 12 days. A and C together in 16 days. All three together can complete it in:', a: '48/13 days', b: '5 days', c: '6 days', d: '96/13 days', ans: 'D', sol: '1/A+1/B = 1/8, 1/B+1/C = 1/12, 1/A+1/C = 1/16. Adding all: 2(1/A+1/B+1/C) = 1/8+1/12+1/16 = 13/48. So 1/A+1/B+1/C = 13/96. Time = 96/13 days.', diff: 'Hard' },
  { q: 'The population of a town increases by 10% annually. If the present population is 10000, what will it be after 2 years?', a: '11000', b: '12000', c: '12100', d: '11100', ans: 'C', sol: 'Population after 2 years = 10000 x (1.1)^2 = 10000 x 1.21 = 12100.', diff: 'Easy' },
  { q: 'A train 200m long crosses a bridge 300m long in 25 seconds. The speed of the train is:', a: '72 km/h', b: '60 km/h', c: '80 km/h', d: '54 km/h', ans: 'A', sol: 'Total distance = 200 + 300 = 500m. Speed = 500/25 = 20 m/s = 20 x 18/5 = 72 km/h.', diff: 'Easy' },
  { q: 'The HCF of 36 and 48 is:', a: '6', b: '8', c: '12', d: '24', ans: 'C', sol: '36 = 2^2 x 3^2. 48 = 2^4 x 3. HCF = 2^2 x 3 = 12.', diff: 'Easy' },
];

const cdsMathAlgebra = [
  { q: 'If x + 1/x = 5, then x^2 + 1/x^2 = ?', a: '23', b: '25', c: '27', d: '21', ans: 'A', sol: '(x + 1/x)^2 = x^2 + 2 + 1/x^2. So x^2 + 1/x^2 = 25 - 2 = 23.', diff: 'Medium' },
  { q: 'The roots of x^2 - 5x + 6 = 0 are:', a: '2 and 3', b: '-2 and -3', c: '1 and 6', d: '-1 and -6', ans: 'A', sol: 'x^2 - 5x + 6 = (x-2)(x-3) = 0. So x = 2 or x = 3.', diff: 'Easy' },
  { q: 'If a - b = 4 and ab = 21, then a^2 + b^2 = ?', a: '56', b: '58', c: '60', d: '62', ans: 'B', sol: '(a-b)^2 = a^2 - 2ab + b^2. 16 = a^2 + b^2 - 42. a^2 + b^2 = 58.', diff: 'Medium' },
  { q: 'The sum of the first 20 terms of the AP 3, 7, 11, 15, ... is:', a: '820', b: '840', c: '860', d: '880', ans: 'A', sol: 'a = 3, d = 4, n = 20. S = n/2[2a + (n-1)d] = 10[6 + 76] = 10 x 82 = 820.', diff: 'Medium' },
  { q: 'If 2^x = 32, then x = ?', a: '4', b: '5', c: '6', d: '8', ans: 'B', sol: '2^x = 32 = 2^5. Therefore x = 5.', diff: 'Easy' },
  { q: 'The value of (a+b)^2 - (a-b)^2 is:', a: '2ab', b: '4ab', c: '2(a^2+b^2)', d: 'a^2-b^2', ans: 'B', sol: '(a+b)^2 = a^2+2ab+b^2. (a-b)^2 = a^2-2ab+b^2. Difference = 4ab.', diff: 'Easy' },
  { q: 'The 10th term of the GP 2, 6, 18, 54, ... is:', a: '2 x 3^9', b: '2 x 3^10', c: '3^10', d: '3^9', ans: 'A', sol: 'a = 2, r = 3. nth term = ar^(n-1) = 2 x 3^(10-1) = 2 x 3^9 = 39366.', diff: 'Medium' },
  { q: 'If log(x) = 2, then x = ?', a: '20', b: '100', c: '1000', d: '10', ans: 'B', sol: 'log(x) = 2 means log base 10 of x = 2. So x = 10^2 = 100.', diff: 'Easy' },
  { q: 'The sum of first n natural numbers is:', a: 'n(n-1)/2', b: 'n(n+1)/2', c: 'n^2/2', d: '(n+1)^2/2', ans: 'B', sol: 'Sum = 1+2+3+...+n = n(n+1)/2. This is a standard formula derived by Gauss.', diff: 'Easy' },
  { q: 'If x^2 - 3x - 10 = 0, the roots are:', a: '5 and -2', b: '-5 and 2', c: '5 and 2', d: '-5 and -2', ans: 'A', sol: 'x^2 - 3x - 10 = (x-5)(x+2) = 0. x = 5 or x = -2. Sum = 3, Product = -10.', diff: 'Easy' },
  { q: 'The value of (x+y+z)^2 when x=1, y=2, z=3 is:', a: '25', b: '36', c: '49', d: '16', ans: 'B', sol: '(1+2+3)^2 = 6^2 = 36.', diff: 'Easy' },
  { q: 'If the sum of three consecutive even numbers is 48, the middle number is:', a: '14', b: '16', c: '18', d: '20', ans: 'B', sol: 'Let numbers be (x-2), x, (x+2). Sum = 3x = 48. x = 16. Numbers: 14, 16, 18.', diff: 'Easy' },
  { q: 'The discriminant of 2x^2 + 3x - 5 = 0 is:', a: '31', b: '41', c: '49', d: '59', ans: 'C', sol: 'D = b^2 - 4ac = 9 - 4(2)(-5) = 9 + 40 = 49. Since D > 0, roots are real and distinct.', diff: 'Medium' },
  { q: 'If a:b = 2:3 and b:c = 4:5, then a:b:c = ?', a: '8:12:15', b: '2:3:5', c: '4:6:5', d: '6:9:10', ans: 'A', sol: 'Make b common: a:b = 2:3 = 8:12. b:c = 4:5 = 12:15. So a:b:c = 8:12:15.', diff: 'Medium' },
  { q: 'The sum of an infinite GP with first term 4 and common ratio 1/2 is:', a: '6', b: '8', c: '10', d: '12', ans: 'B', sol: 'Sum of infinite GP = a/(1-r) = 4/(1-1/2) = 4/(1/2) = 8. Valid when |r| < 1.', diff: 'Medium' },
  { q: 'If 3^(x+1) = 81, then x = ?', a: '2', b: '3', c: '4', d: '5', ans: 'B', sol: '3^(x+1) = 81 = 3^4. So x+1 = 4, x = 3.', diff: 'Easy' },
];

const cdsMathGeometry = [
  { q: 'The sum of interior angles of a hexagon is:', a: '540 degrees', b: '720 degrees', c: '900 degrees', d: '1080 degrees', ans: 'B', sol: 'Sum of interior angles = (n-2) x 180 = (6-2) x 180 = 720 degrees.', diff: 'Easy' },
  { q: 'If the radius of a circle is doubled, its area becomes:', a: '2 times', b: '3 times', c: '4 times', d: '8 times', ans: 'C', sol: 'Area = pi*r^2. New area = pi*(2r)^2 = 4*pi*r^2 = 4 times the original area.', diff: 'Easy' },
  { q: 'In a right triangle with legs 6 and 8, the hypotenuse is:', a: '9', b: '10', c: '12', d: '14', ans: 'B', sol: 'By Pythagoras theorem: h^2 = 36 + 64 = 100. h = 10. This is a 3-4-5 triple scaled by 2.', diff: 'Easy' },
  { q: 'The area of an equilateral triangle with side 6 cm is:', a: '9*sqrt(3) sq cm', b: '12*sqrt(3) sq cm', c: '18*sqrt(3) sq cm', d: '36*sqrt(3) sq cm', ans: 'A', sol: 'Area = (sqrt(3)/4) x a^2 = (sqrt(3)/4) x 36 = 9*sqrt(3) sq cm.', diff: 'Medium' },
  { q: 'Two angles of a triangle are 45 and 65 degrees. The third angle is:', a: '60 degrees', b: '70 degrees', c: '80 degrees', d: '90 degrees', ans: 'B', sol: 'Sum of angles = 180. Third angle = 180 - 45 - 65 = 70 degrees.', diff: 'Easy' },
  { q: 'The circumference of a circle with radius 14 cm is:', a: '44 cm', b: '66 cm', c: '88 cm', d: '176 cm', ans: 'C', sol: 'Circumference = 2*pi*r = 2 x 22/7 x 14 = 88 cm.', diff: 'Easy' },
  { q: 'The diagonal of a rectangle with length 12 cm and breadth 5 cm is:', a: '11 cm', b: '13 cm', c: '15 cm', d: '17 cm', ans: 'B', sol: 'Diagonal = sqrt(12^2 + 5^2) = sqrt(144 + 25) = sqrt(169) = 13 cm. This is a 5-12-13 Pythagorean triple.', diff: 'Easy' },
  { q: 'Each interior angle of a regular octagon is:', a: '120 degrees', b: '135 degrees', c: '140 degrees', d: '150 degrees', ans: 'B', sol: 'Interior angle = (n-2) x 180/n = (8-2) x 180/8 = 6 x 22.5 = 135 degrees.', diff: 'Medium' },
  { q: 'The area of a circle with diameter 14 cm is:', a: '154 sq cm', b: '308 sq cm', c: '616 sq cm', d: '77 sq cm', ans: 'A', sol: 'Radius = 7 cm. Area = pi*r^2 = 22/7 x 49 = 154 sq cm.', diff: 'Easy' },
  { q: 'In a parallelogram, opposite angles are:', a: 'Supplementary', b: 'Complementary', c: 'Equal', d: 'Right angles', ans: 'C', sol: 'In a parallelogram, opposite angles are equal and adjacent angles are supplementary (sum = 180 degrees).', diff: 'Easy' },
  { q: 'The angle subtended by a diameter at any point on the circle is:', a: '60 degrees', b: '90 degrees', c: '120 degrees', d: '180 degrees', ans: 'B', sol: 'The angle in a semicircle is always 90 degrees (Thales\' theorem). Any angle subtended by a diameter at a point on the circle is a right angle.', diff: 'Easy' },
  { q: 'If two parallel lines are cut by a transversal, co-interior angles are:', a: 'Equal', b: 'Supplementary', c: 'Complementary', d: 'None of these', ans: 'B', sol: 'Co-interior (same-side interior) angles are supplementary, meaning they add up to 180 degrees. Alternate interior angles are equal.', diff: 'Easy' },
  { q: 'The perimeter of a square with area 64 sq cm is:', a: '16 cm', b: '24 cm', c: '32 cm', d: '64 cm', ans: 'C', sol: 'Side = sqrt(64) = 8 cm. Perimeter = 4 x 8 = 32 cm.', diff: 'Easy' },
  { q: 'A chord of length 24 cm is at a distance of 5 cm from the center. The radius of the circle is:', a: '12 cm', b: '13 cm', c: '14 cm', d: '15 cm', ans: 'B', sol: 'Half chord = 12 cm. By Pythagoras: r^2 = 12^2 + 5^2 = 144 + 25 = 169. r = 13 cm.', diff: 'Medium' },
  { q: 'The area of a rhombus with diagonals 10 cm and 24 cm is:', a: '60 sq cm', b: '120 sq cm', c: '240 sq cm', d: '100 sq cm', ans: 'B', sol: 'Area of rhombus = (d1 x d2)/2 = (10 x 24)/2 = 120 sq cm.', diff: 'Easy' },
];

const cdsMathTrig = [
  { q: 'The value of sin 30 degrees is:', a: '1/2', b: '1/sqrt(2)', c: 'sqrt(3)/2', d: '1', ans: 'A', sol: 'sin 30 = 1/2. Standard values: sin 0=0, sin 30=1/2, sin 45=1/sqrt(2), sin 60=sqrt(3)/2, sin 90=1.', diff: 'Easy' },
  { q: 'If tan A = 3/4, then sin A = ?', a: '3/5', b: '4/5', c: '3/4', d: '5/3', ans: 'A', sol: 'tan A = 3/4 means opposite = 3, adjacent = 4. Hypotenuse = sqrt(9+16) = 5. sin A = 3/5.', diff: 'Easy' },
  { q: 'The value of sin^2(45) + cos^2(45) is:', a: '0', b: '1/2', c: '1', d: '2', ans: 'C', sol: 'sin^2(x) + cos^2(x) = 1 for all values of x. This is the Pythagorean identity.', diff: 'Easy' },
  { q: 'cos 60 degrees equals:', a: '0', b: '1/2', c: 'sqrt(3)/2', d: '1', ans: 'B', sol: 'cos 60 = 1/2. Note: cos 60 = sin 30 = 1/2 (complementary angles).', diff: 'Easy' },
  { q: 'The value of tan 45 degrees is:', a: '0', b: '1/2', c: '1', d: 'sqrt(3)', ans: 'C', sol: 'tan 45 = sin 45/cos 45 = (1/sqrt(2))/(1/sqrt(2)) = 1.', diff: 'Easy' },
  { q: 'If sin A = 12/13, then cos A = ?', a: '5/13', b: '12/13', c: '5/12', d: '13/12', ans: 'A', sol: 'sin^2 A + cos^2 A = 1. cos^2 A = 1 - 144/169 = 25/169. cos A = 5/13.', diff: 'Easy' },
  { q: 'The value of sin 0 + cos 0 is:', a: '0', b: '1', c: '2', d: '1/2', ans: 'B', sol: 'sin 0 = 0, cos 0 = 1. Sum = 0 + 1 = 1.', diff: 'Easy' },
  { q: 'sec 60 degrees equals:', a: '1', b: '2', c: 'sqrt(2)', d: '2/sqrt(3)', ans: 'B', sol: 'sec 60 = 1/cos 60 = 1/(1/2) = 2.', diff: 'Easy' },
  { q: 'If cos A = 0, then A = ?', a: '0 degrees', b: '30 degrees', c: '60 degrees', d: '90 degrees', ans: 'D', sol: 'cos 90 = 0. At 90 degrees, the adjacent side becomes 0, making cosine = 0.', diff: 'Easy' },
  { q: 'The value of 2*sin(30)*cos(30) is:', a: '1/2', b: 'sqrt(3)/2', c: '1', d: 'sqrt(3)', ans: 'B', sol: '2*sin(30)*cos(30) = sin(60) = sqrt(3)/2. Using the identity: sin(2A) = 2*sin(A)*cos(A).', diff: 'Medium' },
  { q: 'In a right triangle, if one angle is 30 degrees and the hypotenuse is 10 cm, the side opposite to 30 degrees is:', a: '5 cm', b: '5*sqrt(3) cm', c: '10 cm', d: '10*sqrt(3) cm', ans: 'A', sol: 'sin 30 = opposite/hypotenuse. 1/2 = opposite/10. Opposite = 5 cm.', diff: 'Easy' },
  { q: 'The value of (1 + tan^2 A) equals:', a: 'sin^2 A', b: 'cos^2 A', c: 'sec^2 A', d: 'cosec^2 A', ans: 'C', sol: '1 + tan^2 A = sec^2 A. This is a standard trigonometric identity derived from sin^2 A + cos^2 A = 1 by dividing by cos^2 A.', diff: 'Easy' },
];

const cdsMathMensuration = [
  { q: 'The volume of a cube with side 5 cm is:', a: '25 cu cm', b: '75 cu cm', c: '100 cu cm', d: '125 cu cm', ans: 'D', sol: 'Volume of cube = a^3 = 5^3 = 125 cu cm.', diff: 'Easy' },
  { q: 'The curved surface area of a cylinder with radius 7 cm and height 10 cm is:', a: '220 sq cm', b: '440 sq cm', c: '660 sq cm', d: '880 sq cm', ans: 'B', sol: 'CSA = 2*pi*r*h = 2 x 22/7 x 7 x 10 = 440 sq cm.', diff: 'Easy' },
  { q: 'The volume of a sphere with radius 3 cm is:', a: '36*pi cu cm', b: '27*pi cu cm', c: '108*pi cu cm', d: '12*pi cu cm', ans: 'A', sol: 'Volume = (4/3)*pi*r^3 = (4/3)*pi*27 = 36*pi cu cm.', diff: 'Medium' },
  { q: 'A rectangular tank is 10m long, 8m wide, and 6m deep. Its capacity in litres is:', a: '48000', b: '480000', c: '4800', d: '4800000', ans: 'B', sol: 'Volume = 10 x 8 x 6 = 480 cu m. 1 cu m = 1000 litres. Capacity = 480000 litres.', diff: 'Medium' },
  { q: 'The total surface area of a cube with side 4 cm is:', a: '64 sq cm', b: '96 sq cm', c: '128 sq cm', d: '48 sq cm', ans: 'B', sol: 'TSA = 6a^2 = 6 x 16 = 96 sq cm.', diff: 'Easy' },
  { q: 'The volume of a cone with radius 7 cm and height 12 cm is:', a: '308 cu cm', b: '616 cu cm', c: '924 cu cm', d: '154 cu cm', ans: 'B', sol: 'Volume = (1/3)*pi*r^2*h = (1/3) x 22/7 x 49 x 12 = 616 cu cm.', diff: 'Medium' },
  { q: 'The slant height of a cone with radius 6 cm and height 8 cm is:', a: '8 cm', b: '10 cm', c: '12 cm', d: '14 cm', ans: 'B', sol: 'Slant height = sqrt(r^2 + h^2) = sqrt(36 + 64) = sqrt(100) = 10 cm.', diff: 'Easy' },
  { q: 'If the radius of a sphere is halved, its volume becomes:', a: '1/2 of original', b: '1/4 of original', c: '1/8 of original', d: '1/16 of original', ans: 'C', sol: 'V = (4/3)*pi*r^3. New V = (4/3)*pi*(r/2)^3 = (4/3)*pi*r^3/8 = V/8. Volume becomes 1/8.', diff: 'Medium' },
  { q: 'The area of a trapezium with parallel sides 10 cm and 14 cm, and height 8 cm is:', a: '80 sq cm', b: '96 sq cm', c: '112 sq cm', d: '120 sq cm', ans: 'B', sol: 'Area = (1/2) x (sum of parallel sides) x height = (1/2) x (10+14) x 8 = (1/2) x 24 x 8 = 96 sq cm.', diff: 'Easy' },
  { q: 'The lateral surface area of a cone with radius 5 cm and slant height 13 cm is:', a: '65*pi sq cm', b: '130*pi sq cm', c: '25*pi sq cm', d: '50*pi sq cm', ans: 'A', sol: 'LSA = pi*r*l = pi x 5 x 13 = 65*pi sq cm.', diff: 'Easy' },
];

const cdsMathStats = [
  { q: 'The median of 3, 7, 2, 9, 5 is:', a: '3', b: '5', c: '7', d: '9', ans: 'B', sol: 'Arrange in order: 2, 3, 5, 7, 9. Median (middle value for odd n) = 5.', diff: 'Easy' },
  { q: 'The mode of 2, 3, 4, 3, 5, 3, 6 is:', a: '2', b: '3', c: '4', d: '5', ans: 'B', sol: 'Mode is the most frequently occurring value. 3 appears 3 times, more than any other value.', diff: 'Easy' },
  { q: 'The range of the data set 12, 5, 18, 3, 9 is:', a: '9', b: '12', c: '15', d: '18', ans: 'C', sol: 'Range = Maximum - Minimum = 18 - 3 = 15.', diff: 'Easy' },
  { q: 'The mean of 10, 20, 30, 40, 50 is:', a: '25', b: '30', c: '35', d: '40', ans: 'B', sol: 'Mean = (10+20+30+40+50)/5 = 150/5 = 30.', diff: 'Easy' },
  { q: 'If the mean of 5 observations is 20 and one observation 15 is removed, the new mean is:', a: '20', b: '21.25', c: '22.5', d: '25', ans: 'B', sol: 'Sum = 5 x 20 = 100. New sum = 100 - 15 = 85. New mean = 85/4 = 21.25.', diff: 'Medium' },
  { q: 'The probability of getting a head in a single toss of a fair coin is:', a: '0', b: '1/4', c: '1/2', d: '1', ans: 'C', sol: 'P(Head) = Favorable outcomes/Total outcomes = 1/2. A fair coin has equal probability for head and tail.', diff: 'Easy' },
  { q: 'The probability of getting a number greater than 4 when rolling a fair die is:', a: '1/6', b: '1/3', c: '1/2', d: '2/3', ans: 'B', sol: 'Numbers greater than 4: {5, 6}. P = 2/6 = 1/3.', diff: 'Easy' },
  { q: 'The median of 2, 4, 6, 8 is:', a: '4', b: '5', c: '6', d: '7', ans: 'B', sol: 'For even number of observations, median = average of two middle values = (4+6)/2 = 5.', diff: 'Easy' },
];

// Add all CDS Math questions
const allMath = [
  { arr: cdsMathArithmetic, topic: 'Arithmetic' },
  { arr: cdsMathAlgebra, topic: 'Algebra' },
  { arr: cdsMathGeometry, topic: 'Geometry' },
  { arr: cdsMathTrig, topic: 'Trigonometry' },
  { arr: cdsMathMensuration, topic: 'Mensuration' },
  { arr: cdsMathStats, topic: 'Statistics' },
];

allMath.forEach(({ arr, topic }) => {
  arr.forEach(item => {
    questions.push({
      examType: 'CDS', subject: 'Elementary Mathematics', topic, subtopic: '', difficulty: item.diff,
      questionText: item.q, optionA: item.a, optionB: item.b, optionC: item.c, optionD: item.d,
      correctAnswer: item.ans, solution: item.sol, tags: `CDS,Math,${topic}`
    });
  });
});


// ============================================================
// CDS ENGLISH - Additional questions to reach 120+
// ============================================================

const cdsEnglishExtra = [
  // More Grammar
  { q: '"Either Ram or his friends ___ responsible for this."', a: 'is', b: 'are', c: 'was', d: 'has been', ans: 'B', sol: 'With "either...or", the verb agrees with the nearer subject. "Friends" is plural, so "are" is correct.', diff: 'Medium', topic: 'Grammar' },
  { q: 'Choose the correct sentence:', a: 'He is knowing the answer.', b: 'He knows the answer.', c: 'He has knowing the answer.', d: 'He is know the answer.', ans: 'B', sol: 'Stative verbs like "know", "believe", "understand", "love" are not used in continuous tenses. Simple present "knows" is correct.', diff: 'Easy', topic: 'Grammar' },
  { q: '"The train ___ before we reached the station."', a: 'left', b: 'had left', c: 'has left', d: 'was leaving', ans: 'B', sol: 'Past perfect "had left" is used for an action completed before another past action. The train left (earlier) before we reached (later).', diff: 'Medium', topic: 'Grammar' },
  { q: 'Identify the correct sentence:', a: 'He is more wiser than his brother.', b: 'He is wiser than his brother.', c: 'He is most wiser than his brother.', d: 'He is much wiser then his brother.', ans: 'B', sol: '"Wiser" is already comparative; "more" is redundant. Also, "than" (not "then") is used for comparisons.', diff: 'Easy', topic: 'Grammar' },
  { q: '"By this time next year, I ___ my degree."', a: 'will complete', b: 'will have completed', c: 'will be completing', d: 'complete', ans: 'B', sol: 'Future perfect "will have completed" is used for actions that will be finished before a specific future time.', diff: 'Medium', topic: 'Grammar' },
  // More Vocabulary
  { q: 'The synonym of "TENACIOUS" is:', a: 'Weak', b: 'Persistent', c: 'Flexible', d: 'Gentle', ans: 'B', sol: 'Tenacious means holding firmly to something; persistent and determined. Synonyms: persistent, dogged, resolute.', diff: 'Medium', topic: 'Synonyms and Antonyms' },
  { q: 'The antonym of "OPAQUE" is:', a: 'Dark', b: 'Cloudy', c: 'Transparent', d: 'Dense', ans: 'C', sol: 'Opaque means not able to be seen through; not transparent. Transparent means allowing light to pass through so that objects behind can be seen.', diff: 'Easy', topic: 'Synonyms and Antonyms' },
  { q: '"ENIGMA" means:', a: 'A clear statement', b: 'A puzzle or mystery', c: 'An enemy', d: 'An energy source', ans: 'B', sol: 'An enigma is a person or thing that is mysterious, puzzling, or difficult to understand. Synonyms: mystery, puzzle, riddle.', diff: 'Medium', topic: 'Synonyms and Antonyms' },
  { q: 'The synonym of "VORACIOUS" is:', a: 'Moderate', b: 'Insatiable', c: 'Calm', d: 'Slow', ans: 'B', sol: 'Voracious means wanting or devouring great quantities; having a very eager approach. Synonyms: insatiable, ravenous, greedy.', diff: 'Medium', topic: 'Synonyms and Antonyms' },
  { q: 'The antonym of "AFFLUENT" is:', a: 'Wealthy', b: 'Rich', c: 'Destitute', d: 'Prosperous', ans: 'C', sol: 'Affluent means having a great deal of money; wealthy. Destitute means without the basic necessities of life; extremely poor.', diff: 'Easy', topic: 'Synonyms and Antonyms' },
  // More Idioms
  { q: '"To bury the hatchet" means:', a: 'To hide a weapon', b: 'To make peace and end a quarrel', c: 'To dig a hole', d: 'To start a war', ans: 'B', sol: 'To bury the hatchet means to end a quarrel or conflict and become friendly. It comes from a Native American custom of burying weapons to signify peace.', diff: 'Easy', topic: 'Idioms and Phrases' },
  { q: '"A storm in a teacup" means:', a: 'A natural disaster', b: 'A great fuss about a trivial matter', c: 'A tea party', d: 'A weather forecast', ans: 'B', sol: 'A storm in a teacup means a lot of unnecessary anger and worry about a matter that is not important.', diff: 'Easy', topic: 'Idioms and Phrases' },
  { q: '"To have an axe to grind" means:', a: 'To sharpen tools', b: 'To have a private reason for doing something', c: 'To work hard', d: 'To be angry', ans: 'B', sol: 'To have an axe to grind means to have a private, sometimes selfish, reason for doing or being involved in something.', diff: 'Medium', topic: 'Idioms and Phrases' },
  { q: '"The ball is in your court" means:', a: 'You are playing a game', b: 'It is your turn to take action', c: 'You have lost', d: 'The game is over', ans: 'B', sol: 'This idiom means it is now your responsibility to take the next step or make the next decision. From tennis/basketball.', diff: 'Easy', topic: 'Idioms and Phrases' },
  { q: '"To read between the lines" means:', a: 'To read carefully', b: 'To understand the hidden meaning', c: 'To read quickly', d: 'To skip lines while reading', ans: 'B', sol: 'To read between the lines means to look for or discover a meaning that is hidden or implied rather than explicitly stated.', diff: 'Easy', topic: 'Idioms and Phrases' },
  // More Fill in the Blanks
  { q: '"The ___ student topped the examination without any coaching."', a: 'mediocre', b: 'prodigious', c: 'average', d: 'ordinary', ans: 'B', sol: 'Prodigious means remarkably great in extent, size, or degree; having exceptional talent. Context: topped without coaching suggests exceptional ability.', diff: 'Medium', topic: 'Fill in the Blanks' },
  { q: '"The witness gave a ___ account of the accident, leaving out no detail."', a: 'vague', b: 'meticulous', c: 'brief', d: 'ambiguous', ans: 'B', sol: 'Meticulous means showing great attention to detail; very careful and precise. Context: "leaving out no detail" confirms thoroughness.', diff: 'Medium', topic: 'Fill in the Blanks' },
  { q: '"His ___ nature made him popular among his colleagues."', a: 'morose', b: 'affable', c: 'hostile', d: 'aloof', ans: 'B', sol: 'Affable means friendly, good-natured, and easy to talk to. Context: "made him popular" indicates a pleasant personality.', diff: 'Medium', topic: 'Fill in the Blanks' },
  { q: '"The ___ of the desert stretched endlessly before the travelers."', a: 'fertility', b: 'vastness', c: 'greenery', d: 'moisture', ans: 'B', sol: 'Vastness means immense size or extent. Context: "stretched endlessly" indicates a huge, expansive area.', diff: 'Easy', topic: 'Fill in the Blanks' },
  { q: '"The new policy was met with ___ from the opposition party."', a: 'acclaim', b: 'derision', c: 'support', d: 'praise', ans: 'B', sol: 'Derision means contemptuous ridicule or mockery. Context: opposition party would naturally criticize, not praise, a new policy.', diff: 'Medium', topic: 'Fill in the Blanks' },
];

cdsEnglishExtra.forEach(item => {
  questions.push({
    examType: 'CDS', subject: 'English', topic: item.topic, subtopic: '', difficulty: item.diff,
    questionText: item.q, optionA: item.a, optionB: item.b, optionC: item.c, optionD: item.d,
    correctAnswer: item.ans, solution: item.sol, tags: `CDS,English,${item.topic}`
  });
});

// ============================================================
// CDS GK - Additional questions to reach 120+
// ============================================================

const cdsGKExtra = [
  // More History
  { q: 'The Home Rule Movement was started by:', a: 'Annie Besant and Bal Gangadhar Tilak', b: 'Mahatma Gandhi', c: 'Jawaharlal Nehru', d: 'Subhas Chandra Bose', ans: 'A', sol: 'Two Home Rule Leagues were started in 1916: one by Tilak (April, in Maharashtra) and one by Annie Besant (September, in Madras). They demanded self-governance within the British Empire.', diff: 'Easy', topic: 'History' },
  { q: 'The Partition of Bengal was annulled in:', a: '1905', b: '1908', c: '1911', d: '1915', ans: 'C', sol: 'The Partition of Bengal (1905) by Lord Curzon was annulled in 1911 by King George V at the Delhi Durbar due to widespread protests and the Swadeshi Movement.', diff: 'Medium', topic: 'History' },
  { q: 'Who was the last Mughal Emperor?', a: 'Aurangzeb', b: 'Shah Alam II', c: 'Bahadur Shah Zafar', d: 'Muhammad Shah', ans: 'C', sol: 'Bahadur Shah Zafar (Bahadur Shah II) was the last Mughal Emperor (1837-1857). He was exiled to Rangoon (Myanmar) by the British after the 1857 revolt, where he died in 1862.', diff: 'Easy', topic: 'History' },
  { q: 'The Battle of Buxar (1764) was fought between:', a: 'British and Siraj-ud-Daulah', b: 'British and combined forces of Mir Qasim, Shuja-ud-Daulah, and Shah Alam II', c: 'British and Marathas', d: 'British and Tipu Sultan', ans: 'B', sol: 'The Battle of Buxar (22 October 1764) was fought between the British (under Major Hector Munro) and the combined forces of Mir Qasim, Shuja-ud-Daulah, and Shah Alam II. British victory consolidated their power.', diff: 'Medium', topic: 'History' },
  { q: 'The Ryotwari System was introduced by:', a: 'Lord Cornwallis', b: 'Thomas Munro', c: 'Lord Dalhousie', d: 'Warren Hastings', ans: 'B', sol: 'The Ryotwari System was introduced by Thomas Munro and Captain Read in Madras Presidency (1820). Under this system, revenue was collected directly from individual cultivators (ryots).', diff: 'Medium', topic: 'History' },
  // More Polity
  { q: 'The concept of "Welfare State" in the Indian Constitution is enshrined in:', a: 'Fundamental Rights', b: 'Directive Principles of State Policy', c: 'Preamble', d: 'Fundamental Duties', ans: 'B', sol: 'The Directive Principles (Part IV, Articles 36-51) embody the concept of a Welfare State. They direct the state to promote the welfare of the people by securing social, economic, and political justice.', diff: 'Medium', topic: 'Polity' },
  { q: 'The Attorney General of India is appointed by:', a: 'Chief Justice of India', b: 'Prime Minister', c: 'President', d: 'Parliament', ans: 'C', sol: 'Article 76 provides that the Attorney General is appointed by the President. He must be qualified to be a Supreme Court judge. He is the highest law officer of the government.', diff: 'Easy', topic: 'Polity' },
  { q: 'A joint sitting of both Houses of Parliament is presided over by:', a: 'President', b: 'Vice President', c: 'Speaker of Lok Sabha', d: 'Prime Minister', ans: 'C', sol: 'Article 118(4) provides that the Speaker of Lok Sabha presides over a joint sitting of both Houses. Joint sittings are called by the President under Article 108 to resolve deadlocks.', diff: 'Medium', topic: 'Polity' },
  { q: 'The minimum age to become a member of the Rajya Sabha is:', a: '25 years', b: '30 years', c: '35 years', d: '21 years', ans: 'B', sol: 'The minimum age for Rajya Sabha membership is 30 years (Article 84). For Lok Sabha, it is 25 years. For President, it is 35 years.', diff: 'Easy', topic: 'Polity' },
  { q: 'Which article deals with the amendment of the Constitution?', a: 'Article 352', b: 'Article 356', c: 'Article 368', d: 'Article 370', ans: 'C', sol: 'Article 368 deals with the power of Parliament to amend the Constitution and the procedure for it. Some amendments need simple majority, some need special majority, and some need ratification by states.', diff: 'Medium', topic: 'Polity' },
  // More Geography
  { q: 'The longest river in India is:', a: 'Godavari', b: 'Ganga', c: 'Brahmaputra', d: 'Yamuna', ans: 'B', sol: 'The Ganga is the longest river in India at 2,525 km. It originates at Gangotri glacier (Uttarakhand) and flows into the Bay of Bengal. The Godavari (1,465 km) is the longest peninsular river.', diff: 'Easy', topic: 'Geography' },
  { q: 'Which state in India has the largest area?', a: 'Madhya Pradesh', b: 'Maharashtra', c: 'Rajasthan', d: 'Uttar Pradesh', ans: 'C', sol: 'Rajasthan is the largest state in India by area (342,239 sq km), followed by Madhya Pradesh and Maharashtra. Uttar Pradesh is the most populous state.', diff: 'Easy', topic: 'Geography' },
  { q: 'The Brahmaputra River enters India through which state?', a: 'Assam', b: 'Arunachal Pradesh', c: 'Meghalaya', d: 'Nagaland', ans: 'B', sol: 'The Brahmaputra enters India through Arunachal Pradesh (where it is called Dihang/Siang). It then flows through Assam (where it is called Brahmaputra) before entering Bangladesh (Jamuna).', diff: 'Medium', topic: 'Geography' },
  { q: 'Which Indian city is known as the "Silicon Valley of India"?', a: 'Hyderabad', b: 'Pune', c: 'Bengaluru', d: 'Chennai', ans: 'C', sol: 'Bengaluru (Bangalore) is known as the Silicon Valley of India due to its large number of IT companies and tech startups. It is the IT capital of India.', diff: 'Easy', topic: 'Geography' },
  { q: 'The Kaziranga National Park is famous for:', a: 'Bengal Tiger', b: 'Asiatic Lion', c: 'One-horned Rhinoceros', d: 'Snow Leopard', ans: 'C', sol: 'Kaziranga National Park in Assam is famous for the Indian one-horned rhinoceros. It hosts two-thirds of the world\'s great one-horned rhinoceros population. It is a UNESCO World Heritage Site.', diff: 'Easy', topic: 'Geography' },
  // More Science
  { q: 'The chemical formula of common salt is:', a: 'NaOH', b: 'NaCl', c: 'NaHCO3', d: 'Na2CO3', ans: 'B', sol: 'Common salt is sodium chloride (NaCl). NaOH is caustic soda. NaHCO3 is baking soda. Na2CO3 is washing soda.', diff: 'Easy', topic: 'Science' },
  { q: 'The unit of frequency is:', a: 'Watt', b: 'Hertz', c: 'Newton', d: 'Pascal', ans: 'B', sol: 'The SI unit of frequency is Hertz (Hz), named after Heinrich Hertz. 1 Hz = 1 cycle per second.', diff: 'Easy', topic: 'Science' },
  { q: 'Which gas is known as "laughing gas"?', a: 'Carbon dioxide', b: 'Nitrous oxide', c: 'Nitrogen', d: 'Helium', ans: 'B', sol: 'Nitrous oxide (N2O) is known as laughing gas. It is used as an anesthetic in dentistry and surgery. It produces a feeling of euphoria when inhaled.', diff: 'Easy', topic: 'Science' },
  { q: 'The largest organ of the human body is:', a: 'Liver', b: 'Brain', c: 'Skin', d: 'Heart', ans: 'C', sol: 'The skin is the largest organ of the human body, covering about 1.5-2 sq meters. The liver is the largest internal organ.', diff: 'Easy', topic: 'Science' },
  { q: 'Which lens is used to correct myopia (short-sightedness)?', a: 'Convex lens', b: 'Concave lens', c: 'Bifocal lens', d: 'Cylindrical lens', ans: 'B', sol: 'Concave (diverging) lens is used to correct myopia. Convex (converging) lens is used to correct hypermetropia (long-sightedness).', diff: 'Easy', topic: 'Science' },
];

cdsGKExtra.forEach(item => {
  questions.push({
    examType: 'CDS', subject: 'General Knowledge', topic: item.topic, subtopic: '', difficulty: item.diff,
    questionText: item.q, optionA: item.a, optionB: item.b, optionC: item.c, optionD: item.d,
    correctAnswer: item.ans, solution: item.sol, tags: `CDS,GK,${item.topic}`
  });
});

// ============================================================
// CDS MATH - Additional questions to reach 100+
// ============================================================

const cdsMathExtra = [
  { q: 'The sum of the squares of first 10 natural numbers is:', a: '285', b: '385', c: '485', d: '585', ans: 'B', sol: 'Sum of squares = n(n+1)(2n+1)/6 = 10 x 11 x 21/6 = 2310/6 = 385.', diff: 'Medium', topic: 'Algebra' },
  { q: 'If x = 2 + sqrt(3), then x + 1/x = ?', a: '4', b: '2*sqrt(3)', c: '3', d: '2 + sqrt(3)', ans: 'A', sol: '1/x = 1/(2+sqrt(3)) = (2-sqrt(3))/((2+sqrt(3))(2-sqrt(3))) = (2-sqrt(3))/(4-3) = 2-sqrt(3). x + 1/x = 2+sqrt(3) + 2-sqrt(3) = 4.', diff: 'Hard', topic: 'Algebra' },
  { q: 'A number when divided by 5 gives remainder 3. What is the remainder when the square of the number is divided by 5?', a: '1', b: '2', c: '3', d: '4', ans: 'D', sol: 'Let number = 5k + 3. Square = (5k+3)^2 = 25k^2 + 30k + 9 = 5(5k^2+6k+1) + 4. Remainder = 4.', diff: 'Hard', topic: 'Arithmetic' },
  { q: 'The area of a triangle with sides 3, 4, and 5 cm is:', a: '6 sq cm', b: '7.5 sq cm', c: '10 sq cm', d: '12 sq cm', ans: 'A', sol: '3-4-5 is a right triangle (3^2+4^2=5^2). Area = (1/2) x base x height = (1/2) x 3 x 4 = 6 sq cm.', diff: 'Easy', topic: 'Geometry' },
  { q: 'The total surface area of a hemisphere with radius 7 cm is:', a: '231 sq cm', b: '462 sq cm', c: '693 sq cm', d: '154 sq cm', ans: 'B', sol: 'TSA of hemisphere = 3*pi*r^2 = 3 x 22/7 x 49 = 462 sq cm. (Curved surface = 2*pi*r^2, flat circle = pi*r^2).', diff: 'Medium', topic: 'Mensuration' },
  { q: 'Two dice are thrown. The probability of getting a sum of 7 is:', a: '1/6', b: '5/36', c: '1/9', d: '7/36', ans: 'A', sol: 'Favorable outcomes for sum 7: (1,6),(2,5),(3,4),(4,3),(5,2),(6,1) = 6. Total = 36. P = 6/36 = 1/6.', diff: 'Medium', topic: 'Statistics' },
  { q: 'If the perimeter of a semicircle is 36 cm, its radius is:', a: '7 cm', b: '14 cm', c: '10 cm', d: '12 cm', ans: 'A', sol: 'Perimeter of semicircle = pi*r + 2r = r(pi+2) = r(22/7+2) = r(36/7). 36 = r x 36/7. r = 7 cm.', diff: 'Medium', topic: 'Mensuration' },
  { q: 'The value of tan 60 degrees is:', a: '1', b: 'sqrt(3)', c: '1/sqrt(3)', d: '2', ans: 'B', sol: 'tan 60 = sin 60/cos 60 = (sqrt(3)/2)/(1/2) = sqrt(3).', diff: 'Easy', topic: 'Trigonometry' },
  { q: 'If the diagonal of a square is 10*sqrt(2) cm, its area is:', a: '50 sq cm', b: '100 sq cm', c: '200 sq cm', d: '150 sq cm', ans: 'B', sol: 'Diagonal = a*sqrt(2). 10*sqrt(2) = a*sqrt(2). a = 10 cm. Area = a^2 = 100 sq cm.', diff: 'Easy', topic: 'Geometry' },
  { q: 'A man invests Rs 12000 at 10% per annum compound interest. The amount after 3 years is:', a: 'Rs 15000', b: 'Rs 15600', c: 'Rs 15972', d: 'Rs 16200', ans: 'C', sol: 'A = P(1+R/100)^n = 12000(1.1)^3 = 12000 x 1.331 = Rs 15972.', diff: 'Medium', topic: 'Arithmetic' },
  { q: 'The number of diagonals in a decagon (10-sided polygon) is:', a: '25', b: '30', c: '35', d: '40', ans: 'C', sol: 'Number of diagonals = n(n-3)/2 = 10 x 7/2 = 35.', diff: 'Medium', topic: 'Geometry' },
  { q: 'If the ratio of the areas of two circles is 4:9, the ratio of their radii is:', a: '2:3', b: '4:9', c: '16:81', d: '1:2', ans: 'A', sol: 'Area ratio = pi*r1^2/pi*r2^2 = r1^2/r2^2 = 4/9. So r1/r2 = 2/3.', diff: 'Easy', topic: 'Geometry' },
  { q: 'A cylindrical tank has radius 7m and height 14m. Its volume is:', a: '2156 cu m', b: '2156*pi cu m', c: '2156 litres', d: '4312 cu m', ans: 'A', sol: 'Volume = pi*r^2*h = 22/7 x 49 x 14 = 22 x 7 x 14 = 2156 cu m.', diff: 'Easy', topic: 'Mensuration' },
  { q: 'The value of cosec 30 degrees is:', a: '1', b: '2', c: 'sqrt(2)', d: '2/sqrt(3)', ans: 'B', sol: 'cosec 30 = 1/sin 30 = 1/(1/2) = 2.', diff: 'Easy', topic: 'Trigonometry' },
  { q: 'If the mean of a, b, c, d, e is 28, and the mean of a, b, c is 24, then the mean of d and e is:', a: '30', b: '32', c: '34', d: '36', ans: 'C', sol: 'Sum of all 5 = 5 x 28 = 140. Sum of first 3 = 3 x 24 = 72. Sum of d+e = 140-72 = 68. Mean = 68/2 = 34.', diff: 'Medium', topic: 'Statistics' },
];

cdsMathExtra.forEach(item => {
  questions.push({
    examType: 'CDS', subject: 'Elementary Mathematics', topic: item.topic, subtopic: '', difficulty: item.diff,
    questionText: item.q, optionA: item.a, optionB: item.b, optionC: item.c, optionD: item.d,
    correctAnswer: item.ans, solution: item.sol, tags: `CDS,Math,${item.topic}`
  });
});

// ============================================================
// GENERATE CSV
// ============================================================

const rows = [HEADERS.join(',')];
questions.forEach(q => {
  rows.push(HEADERS.map(h => esc(q[h])).join(','));
});

const csvContent = rows.join('\n');
const outPath = path.join(__dirname, 'data', 'questions_bank.csv');
fs.writeFileSync(outPath, csvContent, 'utf-8');

console.log(`\nGenerated ${questions.length} questions`);
console.log(`CSV saved to: ${outPath}`);

// Summary by exam type
const summary = {};
questions.forEach(q => {
  if (!summary[q.examType]) summary[q.examType] = {};
  if (!summary[q.examType][q.subject]) summary[q.examType][q.subject] = 0;
  summary[q.examType][q.subject]++;
});
console.log('\nBreakdown:');
Object.entries(summary).forEach(([exam, subjects]) => {
  const total = Object.values(subjects).reduce((a, b) => a + b, 0);
  console.log(`  ${exam}: ${total} questions`);
  Object.entries(subjects).forEach(([subj, count]) => {
    console.log(`    - ${subj}: ${count}`);
  });
});
