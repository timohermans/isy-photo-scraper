import { Page } from "@playwright/test";
import { FileDownload } from "./types";

export async function downloadPhotosFrom(
    { url, username, password, downloadDir, schoolName, page, downloads }:
        { url: string, username: string, password: string, schoolName: string, downloadDir: string, page: Page, downloads: string[] }) {
    await page.goto(url + '/login');

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