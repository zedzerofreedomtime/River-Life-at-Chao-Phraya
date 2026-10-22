import { test, expect } from "@playwright/test";
test.use({baseURL: process.env.TEST_BASE_URL || "http://localhost:3000", reducedMotion: "reduce"});
for (const width of [390,1440]) test(`sailing keeps the reference summary without lower sections at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.locator('.mj-tools,.rj-credits')).toHaveCount(0);
 await expect(page.locator('footer .footer-photo-credits')).toHaveCount(1);
 await page.goto('/concert');
 await expect(page.locator('.event-purchase-card')).toBeVisible();
 await expect(page.locator('.booking-before-you-book')).toBeVisible();
 await expect(page.locator('.event-detail-content,.event-vessel-gallery,.event-food-menu')).toHaveCount(0);
 await page.locator('.event-buy-button').click();
 await expect(page).toHaveURL(/table-preview/);
 expect(errors).toEqual([]);
});
