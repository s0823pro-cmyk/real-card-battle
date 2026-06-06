import courierStory1 from '../../assets/story/courier/story_courier_1.png';
import courierStory2 from '../../assets/story/courier/story_courier_2.png';
import courierStory3 from '../../assets/story/courier/story_courier_3.png';
import courierStory4 from '../../assets/story/courier/story_courier_4.png';
import courierStory5 from '../../assets/story/courier/story_courier_5.png';
import courierE1Story1 from '../../assets/story/courier/story_courier_e1_1.png';
import courierE1Story2 from '../../assets/story/courier/story_courier_e1_2.png';
import courierE1Story3 from '../../assets/story/courier/story_courier_e1_3.png';
import courierE1Story4 from '../../assets/story/courier/story_courier_e1_4.png';
import courierE2Story1 from '../../assets/story/courier/story_courier_e2_1.png';
import courierE2Story2 from '../../assets/story/courier/story_courier_e2_2.png';
import courierE2Story3 from '../../assets/story/courier/story_courier_e2_3.png';
import courierE2Story4 from '../../assets/story/courier/story_courier_e2_4.png';
import courierE3Story1 from '../../assets/story/courier/story_courier_e3_1.png';
import courierE3Story2 from '../../assets/story/courier/story_courier_e3_2.png';
import courierE3Story3 from '../../assets/story/courier/story_courier_e3_3.png';
import courierE3Story4 from '../../assets/story/courier/story_courier_e3_4.png';
import courierE3Story5 from '../../assets/story/courier/story_courier_e3_5.png';
import type { StoryScene } from './carpenterStory';


export const COURIER_STORY: StoryScene[] = [
  {
    id: 'scene1',
    background: courierStory1,
    lines: [
      '本日の配達、残り一件。',
      '雨で伝票はにじみ、スマホの電池も残り少ない。',
      'これを届ければ、今日は終わりだ。',
    ],
  },
  {
    id: 'scene2',
    background: courierStory2,
    lines: [
      'バイクを走らせ、いつもの高架下を抜けた。',
      'そのはずだった。',
      '気がついたら、知らない森の道を走っていた。',
    ],
  },
  {
    id: 'scene3',
    background: courierStory3,
    lines: [
      '街灯はない。コンビニもない。スマホは圏外。',
      'なのに配達アプリだけが、前方を指し続けている。',
      'なんでここにいるのか、まるで分からない。',
    ],
  },
  {
    id: 'scene4',
    background: courierStory4,
    lines: [
      '雨の向こうに、ありえないほど巨大な木が見えた。',
      '世界樹。そう呼ぶしかないものが、夜空を塞いでいる。',
      '荷台の箱が、小さく震えた気がした。',
    ],
  },
  {
    id: 'scene5',
    background: courierStory5,
    lines: [
      '帰り道は見えない。',
      'だが、荷物はまだここにある。',
      'なら、配達員としてやることは一つだ。',
    ],
  },
];

export const COURIER_E1_STORY: StoryScene[] = [
  {
    id: 'e1_scene1',
    background: courierE1Story1,
    lines: [
      '最初の街を抜けた。',
      '置き配泥棒、吠える犬、道を塞ぐコーンの列。',
      'いつもの配達トラブルに似ているのに、全部どこかおかしい。',
    ],
  },
  {
    id: 'e1_scene2',
    background: courierE1Story2,
    lines: [
      '街の連中は、俺を見てざわめいていた。',
      'バイクも配達バッグも、この世界では珍しいらしい。',
      'だが、荷物を待っている誰かがいることだけは分かる。',
    ],
  },
  {
    id: 'e1_scene3',
    background: courierE1Story3,
    lines: [
      '世界樹はまだ遠い。',
      '走っても走っても、少しずつしか近づかない。',
      '焦って飛ばせば、先に体が止まる。',
    ],
  },
  {
    id: 'e1_scene4',
    background: courierE1Story4,
    lines: [
      '路肩にバイクを寄せ、水を飲む。',
      '無理に走るだけが仕事じゃない。',
      '最後まで届けるために、次の区域へ向かう。',
    ],
  },
];

export const COURIER_E2_STORY: StoryScene[] = [
  {
    id: 'e2_scene1',
    background: courierE2Story1,
    lines: [
      '再配達の山みたいな街を越えた。',
      '文句を言う客も、鳴り止まない通知も、全部置いてきた。',
      'それでも、荷台の箱はまだ静かに震えている。',
    ],
  },
  {
    id: 'e2_scene2',
    background: courierE2Story2,
    lines: [
      '道路はもうほとんど残っていない。',
      'アスファルトを割って伸びた根が、世界樹までの道になっている。',
      'ここがどこなのか、まだ分からない。',
    ],
  },
  {
    id: 'e2_scene3',
    background: courierE2Story3,
    lines: [
      '足は重い。握る手も痺れている。',
      'それでも、荷物を落とすわけにはいかない。',
      '誰かが受け取るまで、配達は完了じゃない。',
    ],
  },
  {
    id: 'e2_scene4',
    background: courierE2Story4,
    lines: [
      '世界樹の根元が見えた。',
      '理由は分からない。だが、あそこに答えがある気がする。',
      '倒れる前に届け切る。これが最後の一件だ。',
    ],
  },
];

export const COURIER_E3_STORY: StoryScene[] = [
  {
    id: 'e3_scene1',
    background: courierE3Story1,
    lines: [
      'バイクを止め、荷物を抱えて世界樹の根元に立つ。',
      '伝票の文字は、もう読めない。',
      'ただ、この場所が届け先だと分かった。',
    ],
  },
  {
    id: 'e3_scene2',
    background: courierE3Story2,
    lines: [
      '世界樹の奥から、静かな声がした。',
      'この世界には、届かなかった想いが積もりすぎた、と。',
      'だから、最後まで届ける者を呼んだのだと。',
    ],
  },
  {
    id: 'e3_scene3',
    background: courierE3Story3,
    lines: [
      '箱を開けると、光があふれた。',
      '中に入っていたものが何なのか、言葉にはできない。',
      'ただ、誰かがずっと待っていたものだと分かった。',
    ],
  },
  {
    id: 'e3_scene4',
    background: courierE3Story4,
    lines: [
      '光は世界樹の根を伝い、遠くの街へ流れていく。',
      '未配達だった何かが、少しずつ届いていく。',
      '根の間に、元の世界へ続く道が開いた。',
    ],
  },
  {
    id: 'e3_scene5',
    background: courierE3Story5,
    lines: [
      'スマホに、新しい通知が届く。',
      '配達依頼。場所は、まだ知らない道の先。',
      '届けるものがあるなら、俺はまた走る。',
    ],
  },
];
