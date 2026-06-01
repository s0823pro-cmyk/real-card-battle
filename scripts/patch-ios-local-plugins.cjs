const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'ios', 'App', 'App', 'capacitor.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const list = Array.isArray(config.packageClassList) ? config.packageClassList : [];
if (!list.includes('AppleAccountPlugin')) {
  list.push('AppleAccountPlugin');
  config.packageClassList = list;
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, '\t')}\n`);
  console.log('Added AppleAccountPlugin to ios/App/App/capacitor.config.json');
} else {
  console.log('AppleAccountPlugin already registered');
}
