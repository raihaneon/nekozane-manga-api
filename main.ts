import { Elysia, swagger } from './deps.ts';
import { DOMParser } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts';
import { Static, Type } from 'https://esm.sh/@sinclair/typebox';
import { puppeteer }from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

// --- Type Definitions ---
interface SearchResult {
  title: string;
  manga_id: string;
  image: string;
  latest_chapter: string;
  rating: string;
}

interface ChapterImage {
  pageNumber: number;
  imageUrl: string;
}

interface ChapterData {
  title: string;
  images: ChapterImage[];
  prev_chapter: string | null;
  next_chapter: string | null;
}

interface MangaDetail {
  title: string;
  image: string;
  description: string;
  author: string;
  genres: string[];
  rating: string;
  chapters: { number: string; title: string; url: string; uploadDate: string }[];
}

// --- Utility function for delays ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to add CORS headers to responses
function addCorsHeaders(set: any) {
  set.headers = {
    ...set.headers,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  };
}

// Helper function for scraping manga details using Puppeteer
async function scrapeMangaDetails(mangaUrl: string): Promise<MangaDetail> {
  const browser = await launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to manga page
    await page.goto(mangaUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for the content to load
    await page.waitForSelector('.manga-container', { timeout: 30000 });
    
    // Extract manga details
    const mangaDetails = await page.evaluate(() => {
      const title = document.querySelector('.manga-title')?.textContent?.trim() || 'Unknown Title';
      const description = document.querySelector('.manga-description')?.textContent?.trim() || 'No description available';
      
      // Get author information
      const author = document.querySelector('.author-name')?.textContent?.trim() || 'Unknown Author';
      
      // Get genres
      const genreElements = document.querySelectorAll('.genre-tag');
      const genres = Array.from(genreElements).map(el => el.textContent.trim());
      
      // Get rating
      const rating = document.querySelector('.rating-value')?.textContent?.trim() || 'No rating';
      
      // Get cover image URL
      const coverImage = document.querySelector('.cover-image')?.getAttribute('src') || null;
      
      // Get chapters
      const chapterElements = document.querySelectorAll('.chapter-item');
      const chapters = Array.from(chapterElements).map(el => {
        return {
          number: el.querySelector('.chapter-number')?.textContent?.trim() || 'Unknown',
          title: el.querySelector('.chapter-title')?.textContent?.trim() || 'No title',
          uploadDate: el.querySelector('.upload-date')?.textContent?.trim() || 'Unknown date',
          url: el.querySelector('a')?.getAttribute('href') || '#'
        };
      });
      
      return {
        title,
        image: coverImage,
        description,
        author,
        genres,
        rating,
        chapters
      };
    });
    
    return mangaDetails;
  } catch (error) {
    console.error('Error scraping manga:', error);
    throw new Error(`Failed to scrape manga: ${error.message}`);
  } finally {
    await browser.close();
  }
}

// Function to search for manga
async function searchManga(searchTerm: string): Promise<SearchResult[]> {
  const browser = await launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to search page
    const searchUrl = `https://mangadex.org/search?q=${encodeURIComponent(searchTerm)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for search results to load
    await page.waitForSelector('.manga-card', { timeout: 30000 });
    
    // Extract search results
    const searchResults = await page.evaluate(() => {
      const resultElements = document.querySelectorAll('.manga-card');
      
      return Array.from(resultElements).map(el => {
        const title = el.querySelector('.manga-title')?.textContent?.trim() || 'Unknown Title';
        const url = el.querySelector('a')?.getAttribute('href') || '#';
        const thumbnail = el.querySelector('.thumbnail')?.getAttribute('src') || null;
        const latestChapter = el.querySelector('.latest-chapter')?.textContent?.trim() || '';
        const rating = el.querySelector('.rating')?.textContent?.trim() || '';
        
        let mangaId = '';
        const match = url.match(/title\/(.*?)\/?$/);
        if (match) {
          mangaId = match[1];
        }
        
        return {
          title,
          manga_id: mangaId,
          image: thumbnail,
          latest_chapter: latestChapter,
          rating
        };
      });
    });
    
    return searchResults;
  } catch (error) {
    console.error('Error searching manga:', error);
    throw new Error(`Failed to search manga: ${error.message}`);
  } finally {
    await browser.close();
  }
}

// Function to get chapter pages
async function getChapterData(chapterUrl: string): Promise<ChapterData> {
  const browser = await launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to chapter page
    await page.goto(chapterUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for pages to load
    await page.waitForSelector('.page-container', { timeout: 30000 });
    
    // Extract chapter data
    const chapterData = await page.evaluate(() => {
      const title = document.querySelector('.chapter-title')?.textContent?.trim() || 'Unknown Chapter';
      
      // Extract page images
      const imageElements = document.querySelectorAll('.page-image');
      const images = Array.from(imageElements).map((el, index) => {
        return {
          pageNumber: index + 1,
          imageUrl: el.getAttribute('src') || el.getAttribute('data-src') || null
        };
      });
      
      // Get navigation links
      const prevLink = document.querySelector('.prev-chapter')?.getAttribute('href');
      const nextLink = document.querySelector('.next-chapter')?.getAttribute('href');
      
      let prevChapter = null;
      if (prevLink) {
        const prevMatch = prevLink.match(/chapter\/(.*?)\/?$/);
        if (prevMatch) {
          prevChapter = prevMatch[1];
        }
      }
      
      let nextChapter = null;
      if (nextLink) {
        const nextMatch = nextLink.match(/chapter\/(.*?)\/?$/);
        if (nextMatch) {
          nextChapter = nextMatch[1];
        }
      }
      
      return {
        title,
        images,
        prev_chapter: prevChapter,
        next_chapter: nextChapter
      };
    });
    
    return chapterData;
  } catch (error) {
    console.error('Error getting chapter pages:', error);
    throw new Error(`Failed to get chapter pages: ${error.message}`);
  } finally {
    await browser.close();
  }
}

// Create Elysia app instance
new Elysia()
  // Middleware to handle OPTIONS requests (preflight)
  .options('*', ({ set }) => {
    set.status = 204;
    addCorsHeaders(set);
    return null;
  })
  // Global hook to add CORS headers to all responses
  .onBeforeHandle(({ set }) => {
    addCorsHeaders(set);
  })
  .get('/', () => {
    return 'MangaDex Scraper API - Use /search/:query, /detail/:mangaId, or /read/:chapterId';
  })
  .get('/search/:query', async ({ params: { query }, set }) => {
    try {
      await delay(1500); // Add delay to avoid rate limiting
      const results = await searchManga(query);
      return { results };
    } catch (error) {
      console.error('Search error:', error);
      set.status = 500;
      return { error: 'An error occurred during the search.' };
    }
  }, {
    params: Type.Object({
      query: Type.String(),
    }),
  })
  .get('/read/:chapterId', async ({ params: { chapterId }, set }) => {
    try {
      await delay(1000); // Add delay to avoid rate limiting
      const decodedChapterId = decodeURIComponent(chapterId);
      const url = `https://mangadex.org/chapter/${decodedChapterId}`;
      const chapterData = await getChapterData(url);
      return chapterData;
    } catch (error) {
      console.error('Reader error:', error);
      set.status = 500;
      return { 
        error: 'An error occurred while fetching the chapter.', 
        images: [],
        prev_chapter: null,
        next_chapter: null
      };
    }
  }, {
    params: Type.Object({
      chapterId: Type.String(),
    }),
  })
  .get('/detail/:mangaId', async ({ params: { mangaId }, set }) => {
    try {
      await delay(1000); // Add delay to avoid rate limiting
      const url = `https://mangadex.org/title/${mangaId}`;
      const mangaDetails = await scrapeMangaDetails(url);
      return mangaDetails;
    } catch (error) {
      console.error('Manga detail error:', error);
      set.status = 500;
      return { error: 'An error occurred while fetching manga details.' };
    }
  }, {
    params: Type.Object({
      mangaId: Type.String(),
    }),
  })
  .listen();