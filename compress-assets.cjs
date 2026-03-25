/**
 * エントリ: node compress-assets.cjs
 * 実体は scripts/compress-images.cjs（プロジェクトルートで実行すること）
 */
const path = require('path');
require(path.join(__dirname, 'scripts', 'compress-images.cjs'));
