const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/login');
  
  await page.type('input[type="email"]', 'admin@dochub.com');
  await page.type('input[type="password"]', 'pass-Admin@123');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0' })
  ]);
  
  await page.screenshot({ path: 'c:\\dochub_mono\\dochub\\scratch\\login_success.png' });
  
  const docsText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log("Logged in! Text on page:");
  console.log(docsText);
  
  await browser.close();
})();
