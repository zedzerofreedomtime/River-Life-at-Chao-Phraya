const fs = require('fs');
const file = 'apps/web/src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldHeader = '<header className={`market-header ${page === "tickets" ? "market-header-dark !border-white/10 !bg-gradient-to-b !from-[#071c37]/80 !via-[#102641]/80 !to-[#071c37]/80 !text-white" : "!border-[#091d3a]/10 !bg-gradient-to-b !from-white/80 !via-[#f8fafc]/80 !to-white/80 !text-[#091d3a]"} !sticky !top-4 !z-50 !max-w-[calc(100%-2rem)] xl:!max-w-7xl !mx-auto !py-[6px] xl:!px-6 !rounded-4xl !backdrop-blur-md !border !shadow-sm transition-colors duration-300`}>';
const newHeader = '<header className={`market-header ${page === "tickets" ? "market-header-dark !border-white/10 !bg-gradient-to-b !from-[#071c37]/80 !via-[#102641]/80 !to-[#071c37]/80 !text-white" : "!border-[#091d3a]/10 !bg-gradient-to-b !from-white/80 !via-[#f8fafc]/80 !to-white/80 !text-[#091d3a]"} !sticky !top-4 !z-50 !max-w-[calc(100%-2rem)] xl:!max-w-7xl !mx-auto !py-[6px] xl:!px-6 !rounded-4xl !backdrop-blur-md !border !shadow-sm transition-colors duration-300 !font-medium`}>';

code = code.replace(oldHeader, newHeader);
fs.writeFileSync(file, code);
