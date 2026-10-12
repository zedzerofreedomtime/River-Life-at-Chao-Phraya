const fs = require('fs');

let app = fs.readFileSync('apps/web/src/App.tsx', 'utf8');
app = app.replace(/"\.\/components\/Payment"/g, '"./components/page/Payment"');
app = app.replace(/"\.\/components\/Help"/g, '"./components/page/Help"');
app = app.replace('import { api, formatPier, type Booking, type EventInfo } from "./data/api";', 'import { api, formatPier, type Booking, type EventInfo } from "./data/api";\nimport { type Booking as ApiBooking } from "./data/api";');
app = app.replace('onCompleted={(updated) => {', 'onCompleted={(updated: Booking) => {');
app = app.replace('onPay={(updated) => {', 'onPay={(updated: Booking) => {');
app = app.replace('onOpenTickets={(updated) => {', 'onOpenTickets={(updated?: Booking) => {');
app = app.replace('onOpenTickets={(updated) => {', 'onOpenTickets={(updated?: Booking) => {'); // 2 occurrences

fs.writeFileSync('apps/web/src/App.tsx', app);

let header = fs.readFileSync('apps/web/src/components/layout/Header.tsx', 'utf8');
header = header.replace('"../Help"', '"../page/Help"');
header = header.replace('language,', 'language: Language,');
header = header.replace('setLanguage,', 'setLanguage: any,');
header = header.replace('goHelp,', 'goHelp: any,');
header = header.replace('helpTopics.map((item)', 'helpTopics.map((item: any)');
fs.writeFileSync('apps/web/src/components/layout/Header.tsx', header);
