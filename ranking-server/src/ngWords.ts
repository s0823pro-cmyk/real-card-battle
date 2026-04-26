/**
 * ニックネーム用の簡易 NG ワード（部分一致・ASCII は大文字小文字無視）。
 */
const NG_WORDS: readonly string[] = [
	// 性的（英語）
	"sex",
	"porn",
	"fuck",
	"dick",
	"cock",
	"cum",
	"anal",
	"rape",
	"hentai",
	"nude",
	"nsfw",
	// 性的（日本語）
	"セックス",
	"えっち",
	"エッチ",
	"ちんこ",
	"チンコ",
	"まんこ",
	"マンコ",
	"おっぱい",
	"パイズリ",
	"射精",
	"勃起",
	// 差別・ヘイト
	"nazi",
	"kkk",
	"hitler",
	"retard",
	"chingchong",
	"ゴキブリ",
	"キチガイ",
	"きちがい",
	"支那",
	"ジプシー",
	// 暴力・犯罪
	"kill",
	"murder",
	"bomb",
	"terror",
	"殺す",
	"殺し",
	"死ね",
	"しね",
	"テロ",
	"爆弾",
	"銃撃",
	// 権威の偽装
	"admin",
	"administrator",
	"moderator",
	"sysop",
	"root",
	"staff",
	"official",
	"運営",
	"管理者",
	"公式",
	"開発者",
	"サポート",
	"カスタマーサポート",
];

function normalizeForMatch(s: string): string {
	return s.toLowerCase();
}

export function containsNgWord(nickname: string): boolean {
	const lower = normalizeForMatch(nickname);
	for (const word of NG_WORDS) {
		const w = word.toLowerCase();
		if (w.length === 0) continue;
		if (/[a-z0-9]/.test(w)) {
			if (lower.includes(w)) return true;
		} else if (nickname.includes(word)) {
			return true;
		}
	}
	return false;
}
