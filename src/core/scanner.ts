import puppeteer from 'puppeteer'
import type { ViewportConfig } from './types'

export async function captureScreenshot(
  url: string,
  viewport?: ViewportConfig
): Promise<string> {
  const width = viewport?.width ?? 1280
  const height = viewport?.height ?? 800

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width, height })
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: true,
      type: 'png'
    })
    return screenshot as string
  } finally {
    await browser.close()
  }
}
