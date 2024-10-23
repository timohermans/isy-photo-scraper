import { test, expect } from '@playwright/test';
import { handlePhotosScrape } from '../lib/usecase';

test('scrapes photos successfuly', async ({ page: dashboardPage }) => {
  await handlePhotosScrape(dashboardPage);
});
