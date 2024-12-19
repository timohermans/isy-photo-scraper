import { FileDownload } from './types';
import * as zip from "@zip.js/zip.js"; import sgMail from '@sendgrid/mail';
import { readFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { Data, doneWith, get, persist } from './data';
import dotenv from 'dotenv';
import { downloadPhotosFrom } from './downloader';
import { Page } from '@playwright/test';
import { join } from 'path';

export async function handlePhotosScrape(dashboardPage: Page) {
    dotenv.config({ path: '.env' });

    if (!process.env.SCHOOL_URL) throw new Error('missing SCHOOL_URL env');
    if (!process.env.SCHOOL_USERNAME) throw new Error('missing SCHOOL_USERNAME env');
    if (!process.env.SCHOOL_PASSWORD) throw new Error('missing SCHOOL_PASSWORD env');
    if (!process.env.SCHOOL_NAME) throw new Error('missing SCHOOL_NAME env');
    if (!process.env.DOWNLOAD_PATH) throw new Error('missing DOWNLOAD_PATH env');

    const url = process.env.SCHOOL_URL;
    const username = process.env.SCHOOL_USERNAME;
    const password = process.env.SCHOOL_PASSWORD;
    const schoolName = process.env.SCHOOL_NAME;
    const downloadDir = process.env.DOWNLOAD_PATH;

    const dbPath = `${downloadDir}/db.json`;
    const db = await get(dbPath);

    const filesToPersist = await downloadPhotosFrom({
        page: dashboardPage,
        downloadDir,
        downloads: db.files.map(f => f.title),
        username,
        password,
        schoolName,
        url,
    });

    for (const result of filesToPersist) {
        if (db.files.some(file => file.title === result.title)) {
            console.log(`Skipping ${result.title}. Already done`);
            continue;
        }

        await handleZipResult(result, db, dbPath);

        console.log(`Done with ${result.title}`);
    }

    await persist(db, dbPath);
}

async function handleZipResult(result: FileDownload, db: Data, dbPath: string) {
    const skipMail = process.env.SKIP_MAIL?.toLowerCase() === 'true';
    if (!process.env.SENDGRID_API_KEY) throw new Error('missing SENDGRID_API_KEY');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    const buffer = await readFile(result.fullPath);
    // if you want to send the zip as mail, do this
    // const zipBase64 = buffer.toString('base64');

    const blob = new Blob([buffer]);
    const zipFileReader = new zip.BlobReader(blob);
    const zipReader = new zip.ZipReader(zipFileReader);
    const photos = await zipReader.getEntries();

    const attachments: { content: string, filename: string, type: string, disposition: string }[] = [];

    for (const entry of photos) {
        if (!entry.getData) continue;

        const fileBase64 = await zipEntryToBase64(entry)

        attachments.push(
            {
                content: fileBase64,
                filename: entry.filename,
                type: 'image/jpeg',
                disposition: 'attachment',
            }
        );
    }

    if (!skipMail) {
        await sgMail.send({
            from: 'timo.hermans@outlook.com',
            attachments: attachments,
            to: ['tmhermans@gmail.com', 'ryanne90@hotmail.com'],
            subject: `${new Date().toISOString().split('T')[0]} Foto\'s ISY`,
            text: `Hooooj, hier zijn de ISY foto\'s van ${result.title}`
        });
    }
    else {
        console.log('Skipping mail. set SKIP_MAIL to false if you want to send mail');
    }

    await zipReader.close();

    doneWith(result.title, result.fullPath, db);

    await persist(db, dbPath);
}

async function zipEntryToBase64(entry) {
    const uint8Array = await entry.getData(new zip.Uint8ArrayWriter());
    const buffer = Buffer.from(uint8Array);
    return buffer.toString('base64');
}

export async function handleNewsPhotosScrape(page: Page) {
    dotenv.config({ path: '.env' });

    if (!process.env.SCHOOL_URL) throw new Error('missing SCHOOL_URL env');
    if (!process.env.SCHOOL_USERNAME) throw new Error('missing SCHOOL_USERNAME env');
    if (!process.env.SCHOOL_PASSWORD) throw new Error('missing SCHOOL_PASSWORD env');
    if (!process.env.SCHOOL_NAME) throw new Error('missing SCHOOL_NAME env');
    if (!process.env.DOWNLOAD_PATH) throw new Error('missing DOWNLOAD_PATH env');

    const url = process.env.SCHOOL_URL;
    const username = process.env.SCHOOL_USERNAME;
    const password = process.env.SCHOOL_PASSWORD;
    const downloadDir = process.env.DOWNLOAD_PATH;

    const dbPath = `${downloadDir}/db-news.json`;
    const db = await get(dbPath);
    const downloads = db.files.map(f => f.title);

    await page.goto(url + '/login');

    await page.getByLabel('Emailadres').click();
    await page.getByLabel('Emailadres').fill(username);
    await page.getByLabel('Emailadres').press('Tab');
    await page.getByLabel('Wachtwoord').fill(password);
    await page.getByRole('button', { name: 'Inloggen' }).click();

    await page.getByRole('link', { name: 'Nieuws', exact: true }).click()
    const posts = await page.locator('.post:has(.news-preview-attachment):has(.float-xs-right) a').all();
    const hrefs = posts.map(async p => (await p.getAttribute('href')));

    for (const hrefPr of hrefs) {
        const href = await hrefPr;
        await page.goto(url + href);
        const subTitle = (await page.locator('.float-xs-right').textContent())?.trim();
        const title = (subTitle + (await page.locator('.post-title').textContent() ?? '').trim());

        if (downloads.every(d => d !== title)) {
            const imageLinks = await page.locator('.news-attachment').all();
            const attachments: { content: string, filename: string, type: string, disposition: string }[] = [];

            for (const imageLink of imageLinks) {
                const imageUrl = await imageLink.getAttribute('href');
                if (!imageUrl || !imageUrl.includes('jpg')) continue;
                const base64 = await downloadImage(url + imageUrl, page);

                const fileTitle = (await imageLink.textContent())?.trim() ?? 'image naamloos';
                const dirTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const finalDirPath = join(downloadDir, dirTitle);

                if (!existsSync(finalDirPath)) {
                    mkdirSync(finalDirPath)
                }

                require("fs").writeFile(join(finalDirPath, fileTitle), base64, 'base64', function (err) {
                    if (err) console.log('something went wrong saving files to disk:', err);
                });

                attachments.push(
                    {
                        content: base64,
                        filename: fileTitle,
                        type: 'image/jpeg',
                        disposition: 'attachment',
                    }
                );

                console.log('image successfully added to attachments');
            }

            const skipMail = process.env.SKIP_MAIL?.toLowerCase() === 'true';
            if (!process.env.SENDGRID_API_KEY) throw new Error('missing SENDGRID_API_KEY');
            sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

            if (!skipMail && attachments.length > 0) {
                try {
                    await sgMail.send({
                        from: 'timo.hermans@outlook.com',
                        attachments: attachments,
                        to: ['tmhermans@gmail.com', 'ryanne90@hotmail.com'],
                        subject: `${new Date().toISOString().split('T')[0]} Foto\'s ISY`,
                        text: `Hooooj, hier zijn de ISY foto\'s van ${title}`
                    });
                    console.log('mail sent');
                } catch (error) {
                    console.log(JSON.stringify(error));
                    throw error;
                }
            }
            else {
                console.log('Skipping mail. set SKIP_MAIL to false if you want to send mail');
            }

            doneWith(title, '', db);

            console.log(`Done with ${title}`);
        }
    }
    await persist(db, dbPath);
}

async function downloadImage(link: string, page: Page) {
    const response = await page.request.get(link);
    const buffer: Buffer = await response.body();

    return buffer.toString('base64');
}