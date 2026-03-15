import carpenterStory1 from '../../assets/story/story_carpenter_1.jpg';
import carpenterStory2 from '../../assets/story/story_carpenter_2.jpg';
import carpenterStory3 from '../../assets/story/story_carpenter_3.jpg';
import carpenterStory4 from '../../assets/story/story_carpenter_4.jpg';
import carpenterStory5 from '../../assets/story/story_carpenter_5.jpg';
import carpenterE1Story1 from '../../assets/story/carpenter/story_carpenter_e1_1.png';
import carpenterE1Story2 from '../../assets/story/carpenter/story_carpenter_e1_2.png';
import carpenterE1Story3 from '../../assets/story/carpenter/story_carpenter_e1_3.png';
import carpenterE1Story4 from '../../assets/story/carpenter/story_carpenter_e1_4.png';
import carpenterE2Story1 from '../../assets/story/carpenter/story_carpenter_e2_1.png';
import carpenterE2Story2 from '../../assets/story/carpenter/story_carpenter_e2_2.png';
import carpenterE2Story3 from '../../assets/story/carpenter/story_carpenter_e2_3.png';
import carpenterE2Story4 from '../../assets/story/carpenter/story_carpenter_e2_4.png';
import carpenterE3Story1 from '../../assets/story/carpenter/story_carpenter_e3_1.png';
import carpenterE3Story2 from '../../assets/story/carpenter/story_carpenter_e3_2.png';
import carpenterE3Story3 from '../../assets/story/carpenter/story_carpenter_e3_3.png';
import carpenterE3Story4 from '../../assets/story/carpenter/story_carpenter_e3_4.png';
import carpenterE3Story5 from '../../assets/story/carpenter/story_carpenter_e3_5.png';

export interface StoryScene {
  id: string;
  background: string;
  speaker?: string;
  lines: string[];
}

const STORY_SEEN_PREFIX = 'story_seen_';

const resolveStorySeenKey = (jobId: string): string => {
  if (jobId === 'carpenter_opening') {
    return 'carpenter';
  }
  return jobId;
};

export const hasSeenStory = (jobId: string): boolean => {
  if (import.meta.env.DEV) {
    return true;
  }
  const storyKey = resolveStorySeenKey(jobId);
  return window.localStorage.getItem(`${STORY_SEEN_PREFIX}${storyKey}`) === 'true';
};

export const markStorySeen = (jobId: string): void => {
  window.localStorage.setItem(`${STORY_SEEN_PREFIX}${jobId}`, 'true');
};

export const CARPENTER_STORY: StoryScene[] = [
  {
    id: 'scene1',
    background: carpenterStory1,
    lines: [
      '...ここは、どこだ？',
      '確か俺は、現場で作業中に足場が崩れて...',
      '気がついたら、でかい木の根元に倒れていた。',
    ],
  },
  {
    id: 'scene2',
    background: carpenterStory2,
    lines: [
      'この木...でかすぎる。見たことがない。',
      'スマホも電波もない。',
      '俺が知ってる世界じゃない、ここは。',
    ],
  },
  {
    id: 'scene3',
    background: carpenterStory3,
    lines: [
      '...ま、どこでも関係ない。',
      '大工ってのはな、どんな現場でも形にするもんだ。',
      '道具と腕さえあれば、生き残れる。',
    ],
  },
  {
    id: 'scene4',
    background: carpenterStory4,
    lines: [
      '向こうに街が見える。まずはあそこを目指すか。',
      '...邪魔するやつは、ハンマーで黙らせる。',
      '職人の仕事は、丁寧に。そして確実に。',
    ],
  },
  {
    id: 'scene5',
    background: carpenterStory5,
    lines: [
      '異世界だろうが何だろうが、やることは変わらない。',
      '俺の仕事は、最後まで完成させること。',
      'さあ、行くか。',
    ],
  },
];

export const CARPENTER_E1_STORY: StoryScene[] = [
  {
    id: 'e1_scene1',
    background: carpenterE1Story1,
    lines: [
      '…倒した。',
      'とんでもないクレーマーだったな。',
      'こんな世界でも、モンスターカスタマーはいるのか。',
    ],
  },
  {
    id: 'e1_scene2',
    background: carpenterE1Story2,
    lines: [
      '街の連中が俺を見てざわめいている。',
      'なんだ、礼でも言いたいのか。',
      '…照れくさいな。俺は仕事をしただけだ。',
    ],
  },
  {
    id: 'e1_scene3',
    background: carpenterE1Story3,
    lines: [
      '酒場で話を聞いた。',
      'この先には悪徳ゼネコンが街を牛耳っているらしい。',
      '手抜き工事で職人を踏みにじる男だ、と。',
    ],
  },
  {
    id: 'e1_scene4',
    background: carpenterE1Story4,
    lines: [
      '職人として、それだけは許せない。',
      '俺の仕事は、最後まで仕上げることだ。',
      '次の現場に向かうか。',
    ],
  },
];

export const CARPENTER_E2_STORY: StoryScene[] = [
  {
    id: 'e2_scene1',
    background: carpenterE2Story1,
    lines: [
      '…終わったか。',
      '金と権力で職人を踏みにじってきた男だ。',
      'こういう奴は、どの世界にもいる。',
    ],
  },
  {
    id: 'e2_scene2',
    background: carpenterE2Story2,
    lines: [
      '搾取されていた職人たちが、俺を取り囲んだ。',
      'お前のおかげで解放された、と言っている。',
      '…俺は仕事をしただけだ。それだけだ。',
    ],
  },
  {
    id: 'e2_scene3',
    background: carpenterE2Story3,
    lines: [
      'ふと気づいた。',
      '俺が最初に目覚めたあの世界樹。',
      'あそこに何かいる。俺をここに呼んだ何かが。',
    ],
  },
  {
    id: 'e2_scene4',
    background: carpenterE2Story4,
    lines: [
      'どんな現場も、逃げたことはない。',
      'あの世界樹に向かう。',
      'これが、最後の現場だ。',
    ],
  },
];

export const CARPENTER_E3_STORY: StoryScene[] = [
  {
    id: 'e3_scene1',
    background: carpenterE3Story1,
    lines: [
      'お前が俺をここに呼んだのか。',
      'なぜ、俺なんだ。',
      '答えろ。',
    ],
  },
  {
    id: 'e3_scene2',
    background: carpenterE3Story2,
    lines: [
      '番人は静かに言った。',
      'この世界は崩れかけている、と。',
      '建て直せる者を、呼んだ。',
    ],
  },
  {
    id: 'e3_scene3',
    background: carpenterE3Story3,
    lines: [
      '…俺が、この世界を建て直す者か。',
      '笑えるな。大工が世界を救うとは。',
      'でも、俺の仕事は最後まで仕上げることだ。',
    ],
  },
  {
    id: 'e3_scene4',
    background: carpenterE3Story4,
    lines: [
      '番人が言った。元の世界に戻る道を開く、と。',
      '俺は少し考えた。',
      '…いや、まだここにやることがある。',
    ],
  },
  {
    id: 'e3_scene5',
    background: carpenterE3Story5,
    lines: [
      'この世界には、俺の腕を必要としている現場がある。',
      '元の世界は…またいつか。',
      '俺はまだ、大工だ。',
    ],
  },
];
