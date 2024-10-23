import { Page } from "@playwright/test";
import { FileDownload } from "./types";

export async function downloadPhotosFrom(
    { url, username, password, downloadDir, schoolName, dashboardPage, downloads }:
        { url: string, username: string, password: string, schoolName: string, downloadDir: string, dashboardPage: Page, downloads: string[] }) {
    await dashboardPage.goto(url);
    const loginPagePromise = dashboardPage.waitForEvent('popup');
    await dashboardPage.getByRole('link', { name: 'Login' }).click();
    const loginPage = await loginPagePromise;
    await loginPage.getByLabel('Emailadres').click();
    await loginPage.getByLabel('Emailadres').fill(username);
    await loginPage.getByLabel('Emailadres').press('Tab');
    await loginPage.getByLabel('Wachtwoord').fill(password);
    await loginPage.getByRole('button', { name: 'Inloggen' }).click();

    const pagePromise = loginPage.waitForEvent('popup');
    await loginPage.getByText(schoolName).click();
    const page = await pagePromise;

    await page.getByLabel('Emailadres').click();
    await page.getByLabel('Emailadres').fill(username);
    await page.getByLabel('Emailadres').press('Tab');
    await page.getByLabel('Wachtwoord').fill(password);
    await page.getByRole('button', { name: 'Inloggen' }).click();
    await page.getByText('Fotoboeken').click();

    const files: FileDownload[] = [];

    for (const card of await page.locator('.card-title').all()) {
        const title = await card.textContent();

        if (downloads.every(d => d !== title)) {
            await card.click();

            await page.locator('[data-original-title="Afbeelding(en) downloaden"]').click();
            await page.getByText('Selecteer/deselecteer allemaal').click();

            const downloadPromise = page.waitForEvent('download');
            await page.getByRole('button', { name: 'Afbeelding(en) downloaden' }).click();
            const download = await downloadPromise;
            const filePath = `${downloadDir}/${title?.replaceAll('/', '-')}.zip`;
            await download.saveAs(filePath);

            files.push({
                title: title ?? 'unkown download',
                fullPath: filePath
            });

            await page.getByRole('link', { name: 'Fotoboeken', exact: true }).click();
        }
        else {
            console.log('Already downloaded ' + title);
        }
    }

    return files;
}