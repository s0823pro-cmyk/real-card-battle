import cookStory1 from '../../assets/story/cook/story_cook_1.png';
import cookStory2 from '../../assets/story/cook/story_cook_2.png';
import cookStory3 from '../../assets/story/cook/story_cook_3.png';
import cookStory4 from '../../assets/story/cook/story_cook_4.png';
import cookStory5 from '../../assets/story/cook/story_cook_5.png';
import cookE1Story1 from '../../assets/story/cook/story_cook_e1_1.png';
import cookE1Story2 from '../../assets/story/cook/story_cook_e1_2.png';
import cookE1Story3 from '../../assets/story/cook/story_cook_e1_3.png';
import cookE1Story4 from '../../assets/story/cook/story_cook_e1_4.png';
import cookE2Story1 from '../../assets/story/cook/story_cook_e2_1.png';
import cookE2Story2 from '../../assets/story/cook/story_cook_e2_2.png';
import cookE2Story3 from '../../assets/story/cook/story_cook_e2_3.png';
import cookE2Story4 from '../../assets/story/cook/story_cook_e2_4.png';
import cookE3Story1 from '../../assets/story/cook/story_cook_e3_1.png';
import cookE3Story2 from '../../assets/story/cook/story_cook_e3_2.png';
import cookE3Story3 from '../../assets/story/cook/story_cook_e3_3.png';
import cookE3Story4 from '../../assets/story/cook/story_cook_e3_4.png';
import cookE3Story5 from '../../assets/story/cook/story_cook_e3_5.png';
import type { StoryScene } from './carpenterStory';

export const COOK_STORY: StoryScene[] = [
  {
    id: 'scene1',
    background: cookStory1,
    lines: ['...熱い。どこだ、ここは。', '確か厨房で火が上がって...客を逃がして...', '気がついたら、知らない森の中だった。'],
  },
  {
    id: 'scene2',
    background: cookStory2,
    lines: ['空の色が違う。匂いも違う。', 'だが...この風に乗ってくる香り。', 'どこかで誰かが、飯を作っている。'],
  },
  {
    id: 'scene3',
    background: cookStory3,
    lines: ['包丁ダコは残ってる。この手は覚えている。', '火の扱い方も、味の整え方も。', '料理人の腕は、世界が変わっても錆びない。'],
  },
  {
    id: 'scene4',
    background: cookStory4,
    lines: ['腹が減っては戦はできぬ、ってな。', 'まずはあの街で食材を探す。', '...邪魔するやつには、フランベをお見舞いしてやる。'],
  },
  {
    id: 'scene5',
    background: cookStory5,
    lines: ['異世界だろうが関係ない。', '腹を空かせてるやつがいるなら、俺が作る。', 'さあ、厨房を探しに行くか。'],
  },
];

export const COOK_E1_STORY: StoryScene[] = [
  {
    id: 'e1_scene1',
    background: cookE1Story1,
    lines: ['...片付いたか。', '腐った食材で人を騙すなんざ、料理人以前の問題だ。', '料理をなめるな。'],
  },
  {
    id: 'e1_scene2',
    background: cookE1Story2,
    lines: ['街の連中が集まってきた。', '腹減ってるのか？...そうだろうな。', 'まともな飯を食ってない顔をしてる。'],
  },
  {
    id: 'e1_scene3',
    background: cookE1Story3,
    lines: ['ありあわせの食材で、ひと鍋作ってやった。', 'うまいうまいと泣きながら食う奴までいる。', '...やっぱり、料理ってのはいいもんだ。'],
  },
  {
    id: 'e1_scene4',
    background: cookE1Story4,
    lines: ['この先に、街の食を支配している奴がいるらしい。', '毒を盛って人を従わせる料理長だと。', '...許せねえな。行くぞ。'],
  },
];

export const COOK_E2_STORY: StoryScene[] = [
  {
    id: 'e2_scene1',
    background: cookE2Story1,
    lines: ['毒の料理長を倒した。', '料理で人を傷つけるなんて、本末転倒だ。', '包丁は人を生かすために使うもんだろうが。'],
  },
  {
    id: 'e2_scene2',
    background: cookE2Story2,
    lines: ['解放された人々が、俺に食材を差し出してくる。', 'お前に作ってほしい、と。', '...ああ、任せろ。全員分作ってやる。'],
  },
  {
    id: 'e2_scene3',
    background: cookE2Story3,
    lines: ['ふと、あの巨大な木が目に入った。', 'あの根元に、何かがある。俺を呼んでいる気がする。', '...あそこに、最後の食材があるのかもな。'],
  },
  {
    id: 'e2_scene4',
    background: cookE2Story4,
    lines: ['どんな厨房にも立ってきた。修羅場は慣れてる。', 'あの木に向かう。', 'これが、最後のフルコースだ。'],
  },
];

export const COOK_E3_STORY: StoryScene[] = [
  {
    id: 'e3_scene1',
    background: cookE3Story1,
    lines: ['お前が俺を呼んだのか。', 'こんな料理人に、何の用だ。', '...腹でも減ったか？'],
  },
  {
    id: 'e3_scene2',
    background: cookE3Story2,
    lines: ['番人は静かに語った。', 'この世界は飢えている、と。', '人々の心も、体も。'],
  },
  {
    id: 'e3_scene3',
    background: cookE3Story3,
    lines: ['...だから料理人を呼んだってわけか。', '世界を救うのが俺の一皿か。大きく出たな。', 'だが、嫌いじゃない。その注文。'],
  },
  {
    id: 'e3_scene4',
    background: cookE3Story4,
    lines: ['元の世界に帰れる、と番人は言った。', '少し迷った。', '...いや、迷ってねえな。最初から答えは出てる。'],
  },
  {
    id: 'e3_scene5',
    background: cookE3Story5,
    lines: ['この世界には、腹を空かせてる奴がまだいる。', '全員に食わせるまで、俺の仕事は終わらない。', '料理人ってのは、そういうもんだ。'],
  },
];
