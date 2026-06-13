const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const blocks = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
const script = blocks.map(block => block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')).join('\n');
fs.writeFileSync('temp-dashboard-check.js', script);
