export interface RimeSpeaker {
  id: string;
  name: string;
  gender?: 'female' | 'male' | 'neutral';
}

export interface RimeLanguage {
  id: string; // Rime language code: 'eng', 'spa', 'fra', 'ger', 'hin', 'jpn', 'por', 'ara', 'ita', 'heb'
  name: string;
  nativeName: string;
  flag: string;
  bcp47: string; // Speech recognition and browser locale
  defaultModel: 'coda' | 'mistv3' | 'arcana';
  defaultSpeaker: string;
  speakers: RimeSpeaker[];
  samplePhrase: string;
  welcomeGreeting: string;
}

// 100% verified against live Rime API (coda & arcana models)
export const RIME_LANGUAGES: RimeLanguage[] = [
  {
    id: 'eng',
    name: 'English',
    nativeName: 'English (US/UK)',
    flag: '🇺🇸',
    bcp47: 'en-US',
    defaultModel: 'coda',
    defaultSpeaker: 'alpine',
    samplePhrase: 'Hello! I am P.H.I., powered by Rime voice synthesis and ultra-fast intelligence.',
    welcomeGreeting: 'English voice mode activated.',
    speakers: [
      { id: 'alpine', name: 'Alpine', gender: 'male' },
      { id: 'adeline', name: 'Adeline', gender: 'female' },
      { id: 'albion', name: 'Albion', gender: 'male' },
      { id: 'astra', name: 'Astra', gender: 'female' },
      { id: 'celeste', name: 'Celeste', gender: 'female' },
      { id: 'orion', name: 'Orion', gender: 'male' },
      { id: 'amarante', name: 'Amarante', gender: 'female' },
      { id: 'arcade', name: 'Arcade', gender: 'male' },
      { id: 'atrium', name: 'Atrium', gender: 'male' },
      { id: 'azura', name: 'Azura', gender: 'female' },
      { id: 'baobab', name: 'Baobab', gender: 'male' },
      { id: 'belle', name: 'Belle', gender: 'female' },
      { id: 'bronte', name: 'Bronte', gender: 'female' },
      { id: 'castro', name: 'Castro', gender: 'male' },
      { id: 'clara', name: 'Clara', gender: 'female' },
      { id: 'dayform', name: 'Dayform', gender: 'male' },
      { id: 'drift', name: 'Drift', gender: 'male' },
      { id: 'estelle', name: 'Estelle', gender: 'female' },
      { id: 'fleetfox', name: 'Fleetfox', gender: 'male' },
      { id: 'hugo', name: 'Hugo', gender: 'male' },
      { id: 'luna', name: 'Luna', gender: 'female' },
      { id: 'sirius', name: 'Sirius', gender: 'male' }
    ]
  },
  {
    id: 'hin',
    name: 'Hindi',
    nativeName: 'हिन्दी (Hindi)',
    flag: '🇮🇳',
    bcp47: 'hi-IN',
    defaultModel: 'coda',
    defaultSpeaker: 'taru',
    samplePhrase: 'नमस्ते! मैं पी.एच.आई. हूँ, राइम की अत्यंत तेज़ और स्पष्ट आवाज़ के साथ।',
    welcomeGreeting: 'हिन्दी वॉइस मोड सक्रिय हो गया है।',
    speakers: [
      { id: 'taru', name: 'Taru (तरु)', gender: 'male' },
      { id: 'nadi', name: 'Nadi (नदी)', gender: 'female' }
    ]
  },
  {
    id: 'spa',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    bcp47: 'es-ES',
    defaultModel: 'coda',
    defaultSpeaker: 'alonso',
    samplePhrase: '¡Hola! Soy P.H.I., con la síntesis de voz natural y ultra rápida de Rime.',
    welcomeGreeting: 'Modo de voz en español activado.',
    speakers: [
      { id: 'alonso', name: 'Alonso', gender: 'male' },
      { id: 'abril', name: 'Abril', gender: 'female' },
      { id: 'alba', name: 'Alba', gender: 'female' },
      { id: 'amanecer', name: 'Amanecer', gender: 'female' },
      { id: 'atardecer', name: 'Atardecer', gender: 'male' },
      { id: 'azulado', name: 'Azulado', gender: 'male' },
      { id: 'brisa', name: 'Brisa', gender: 'female' },
      { id: 'celestino', name: 'Celestino', gender: 'male' },
      { id: 'cielo', name: 'Cielo', gender: 'female' },
      { id: 'ciro', name: 'Ciro', gender: 'male' },
      { id: 'claridad', name: 'Claridad', gender: 'female' },
      { id: 'cristhian', name: 'Cristhian', gender: 'male' },
      { id: 'estrella', name: 'Estrella', gender: 'female' },
      { id: 'frieda', name: 'Frieda', gender: 'female' },
      { id: 'isla', name: 'Isla', gender: 'female' },
      { id: 'kiara', name: 'Kiara', gender: 'female' },
      { id: 'luciana', name: 'Luciana', gender: 'female' },
      { id: 'luz', name: 'Luz', gender: 'female' },
      { id: 'mar', name: 'Mar', gender: 'female' },
      { id: 'milagros', name: 'Milagros', gender: 'female' },
      { id: 'nova', name: 'Nova', gender: 'female' },
      { id: 'renato', name: 'Renato', gender: 'male' },
      { id: 'seraphina', name: 'Seraphina', gender: 'female' },
      { id: 'solsticio', name: 'Solsticio', gender: 'male' },
      { id: 'xavier', name: 'Xavier', gender: 'male' },
      { id: 'yara', name: 'Yara', gender: 'female' }
    ]
  },
  {
    id: 'fra',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    bcp47: 'fr-FR',
    defaultModel: 'coda',
    defaultSpeaker: 'aurelie',
    samplePhrase: 'Bonjour ! Je suis P.H.I., propulsé par la voix intelligente et naturelle de Rime.',
    welcomeGreeting: 'Mode vocal français activé.',
    speakers: [
      { id: 'aurelie', name: 'Aurélie', gender: 'female' },
      { id: 'destin', name: 'Destin', gender: 'male' },
      { id: 'fredrique', name: 'Frédérique', gender: 'female' },
      { id: 'margarette', name: 'Margarette', gender: 'female' },
      { id: 'marielle', name: 'Marielle', gender: 'female' },
      { id: 'seraphine', name: 'Séraphine', gender: 'female' },
      { id: 'solstice', name: 'Solstice', gender: 'male' },
      { id: 'violette', name: 'Violette', gender: 'female' }
    ]
  },
  {
    id: 'ger',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    bcp47: 'de-DE',
    defaultModel: 'coda',
    defaultSpeaker: 'aura',
    samplePhrase: 'Hallo! Ich bin P.H.I. mit natürlicher und schneller Sprachausgabe von Rime.',
    welcomeGreeting: 'Deutscher Sprachmodus aktiviert.',
    speakers: [
      { id: 'aura', name: 'Aura', gender: 'female' },
      { id: 'baldur', name: 'Baldur', gender: 'male' },
      { id: 'greta', name: 'Greta', gender: 'female' },
      { id: 'kumara', name: 'Kumara', gender: 'female' },
      { id: 'liesel', name: 'Liesel', gender: 'female' },
      { id: 'lina', name: 'Lina', gender: 'female' },
      { id: 'lorelei', name: 'Lorelei', gender: 'female' },
      { id: 'nacht', name: 'Nacht', gender: 'male' },
      { id: 'runa', name: 'Runa', gender: 'female' }
    ]
  },
  {
    id: 'jpn',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    bcp47: 'ja-JP',
    defaultModel: 'coda',
    defaultSpeaker: 'akari',
    samplePhrase: 'こんにちは！Rimeの超低遅延音声エンジンを搭載したP.H.I.です。',
    welcomeGreeting: '日本語音声モードが起動しました。',
    speakers: [
      { id: 'akari', name: 'Akari (あかり)', gender: 'female' },
      { id: 'akatsuki', name: 'Akatsuki (暁)', gender: 'male' },
      { id: 'hirake', name: 'Hirake (拓け)', gender: 'male' },
      { id: 'hiru', name: 'Hiru (昼)', gender: 'female' },
      { id: 'marika', name: 'Marika (まりか)', gender: 'female' },
      { id: 'noriko', name: 'Noriko (紀子)', gender: 'female' },
      { id: 'nozomi', name: 'Nozomi (望)', gender: 'female' },
      { id: 'ren', name: 'Ren (蓮)', gender: 'male' },
      { id: 'sakura', name: 'Sakura (桜)', gender: 'female' },
      { id: 'sota', name: 'Sota (蒼太)', gender: 'male' },
      { id: 'taiyo', name: 'Taiyo (太陽)', gender: 'male' },
      { id: 'yoru', name: 'Yoru (夜)', gender: 'male' },
      { id: 'yugata', name: 'Yugata (夕方)', gender: 'male' }
    ]
  },
  {
    id: 'por',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇧🇷',
    bcp47: 'pt-BR',
    defaultModel: 'coda',
    defaultSpeaker: 'celso',
    samplePhrase: 'Olá! Eu sou P.H.I., usando a síntese de voz ultra rápida da Rime.',
    welcomeGreeting: 'Modo de voz em português ativado.',
    speakers: [
      { id: 'celso', name: 'Celso', gender: 'male' },
      { id: 'alzira', name: 'Alzira', gender: 'female' },
      { id: 'baltasar', name: 'Baltasar', gender: 'male' },
      { id: 'bruno', name: 'Bruno', gender: 'male' },
      { id: 'estela', name: 'Estela', gender: 'female' },
      { id: 'henrique', name: 'Henrique', gender: 'male' },
      { id: 'isadora', name: 'Isadora', gender: 'female' },
      { id: 'leandro', name: 'Leandro', gender: 'male' },
      { id: 'lucia', name: 'Lúcia', gender: 'female' },
      { id: 'rio', name: 'Rio', gender: 'male' },
      { id: 'sol', name: 'Sol', gender: 'female' }
    ]
  },
  {
    id: 'ara',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    bcp47: 'ar-SA',
    defaultModel: 'coda',
    defaultSpeaker: 'fadil',
    samplePhrase: 'مرحباً! أنا P.H.I.، أعمل بتقنية الذكاء الصوتي الفائق والتوليف السريع من Rime.',
    welcomeGreeting: 'تم تفعيل وضع الصوت باللغة العربية.',
    speakers: [
      { id: 'fadil', name: 'Fadil (فاضل)', gender: 'male' },
      { id: 'layla', name: 'Layla (ليلى)', gender: 'female' },
      { id: 'batin', name: 'Batin (باطن)', gender: 'male' },
      { id: 'qadir', name: 'Qadir (قادر)', gender: 'male' },
      { id: 'sakina', name: 'Sakina (سكينة)', gender: 'female' },
      { id: 'zahir', name: 'Zahir (ظاهر)', gender: 'male' }
    ]
  },
  {
    id: 'ita',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    bcp47: 'it-IT',
    defaultModel: 'coda',
    defaultSpeaker: 'livia',
    samplePhrase: 'Ciao! Sono P.H.I., con la voce naturale e immediata generata da Rime.',
    welcomeGreeting: 'Modalità vocale italiana attivata.',
    speakers: [
      { id: 'livia', name: 'Livia', gender: 'female' },
      { id: 'viola', name: 'Viola', gender: 'female' }
    ]
  },
  {
    id: 'heb',
    name: 'Hebrew',
    nativeName: 'עברית',
    flag: '🇮🇱',
    bcp47: 'he-IL',
    defaultModel: 'arcana',
    defaultSpeaker: 'aviva',
    samplePhrase: 'שלום! אני P.H.I., מופעל באמצעות סינתזת הקול המהירה של Rime.',
    welcomeGreeting: 'מצב קולי בעברית הופעל.',
    speakers: [
      { id: 'aviva', name: 'Aviva (אביבה)', gender: 'female' },
      { id: 'ori', name: 'Ori (אורי)', gender: 'male' }
    ]
  }
];

export function getLanguageById(id: string): RimeLanguage {
  const found = RIME_LANGUAGES.find((lang) => lang.id === id);
  return found || RIME_LANGUAGES[0];
}
