import { test, expect } from '@playwright/test';
import { handleNewsPhotosScrape, handlePhotosScrape } from '../lib/usecase';

// test('scrapes photos successfuly', async ({ page: dashboardPage }) => {
//   await handlePhotosScrape(dashboardPage);
// });

test('downloads photos from news successfuly', async ({ page: dashboardPage }) => {
  await handleNewsPhotosScrape(dashboardPage);
});
