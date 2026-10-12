const fs = require('fs');

let code = fs.readFileSync('apps/web/src/App.tsx', 'utf8');

// Replace header
const headerRegex = /<header className=\{\`market-header[\s\S]*?<\/header>/;
code = code.replace(headerRegex, `<Header 
        page={page} 
        language={language} 
        setLanguage={setLanguage} 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen}
        openNavigationMenu={openNavigationMenu}
        setOpenNavigationMenu={setOpenNavigationMenu}
        profile={profile}
        isAuthenticated={isAuthenticated}
        go={go}
        goHelp={goHelp}
        openAuthDialog={openAuthDialog}
        logoutCustomer={logoutCustomer}
        navigationRef={navigationRef}
      />`);

// Replace footer
const footerRegex = /<footer>[\s\S]*?<\/footer>/;
code = code.replace(footerRegex, `<Footer language={language} />`);

// Add imports
code = code.replace('import { ChevronDown, Menu, X } from "lucide-react";', 'import { X } from "lucide-react";\nimport Header from "./components/layout/Header";\nimport Footer from "./components/layout/Footer";');

fs.writeFileSync('apps/web/src/App.tsx', code);
