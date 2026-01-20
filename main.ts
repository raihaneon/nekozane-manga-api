import { Elysia, swagger } from './deps.ts';
import { DOMParser } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts';
import { Static, Type } from 'https://esm.sh/@sinclair/typebox';

// --- Type Definitions ---
interface SearchResult {
  title: string;
  manhwa_id: string;
  image: string;
  latest_chapter: string;
  rating: string;
}

interface ChapterImage {
  src: string;
}

  title: string;
  images: ChapterImage[];
  prev_chapter: string | null;
  next_chapter: string | null;
}

interface MangaDetail {
  title: string;
  image: string;
  synopsis: string;
  metadata: Record<string, string>;
  chapters: { title: string; url: string; date: string }[];
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
    return 'miaw :3';
  })
  .get('/search/:query', async ({ params: { query }, set }) => {
    try {
      await delay(1500);
      const response = await fetch(`https://komikstation.org/?s=${query}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        },
      });
      const html = await response.text();
      const document = new DOMParser().parseFromString(html, 'text/html');

      const results: SearchResult[] = [];
      document?.querySelectorAll('.bsx').forEach((element) => {
        const link = element.querySelector('a');
        const url = link?.getAttribute('href') || '';

        let manhwaId = '';
        const match = url.match(/manga\/(.*?)\/?$/);
        if (match) {
          manhwaId = match[1];
        }

        results.push({
          title: link?.getAttribute('title') || '',
          manhwa_id: manhwaId,
          image: element.querySelector('img')?.getAttribute('src') || '',
          latest_chapter: element.querySelector('.epxs')?.textContent?.trim() || '',
          rating: element.querySelector('.numscore')?.textContent?.trim() || '',
        });
      });

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
      await delay(1000);
      const decodedChapterId = decodeURIComponent(chapterId);
      const url = `https://komikstation.org/${decodedChapterId}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        },
      });
      const html = await response.text();
      const document = new DOMParser().parseFromString(html, 'text/html');

      let readerData = null;
      document?.querySelectorAll('script').forEach((element) => {
        const scriptText = element.textContent || '';
        if (scriptText.includes('ts_reader.run')) {
          try {
            const match = scriptText.match(/ts_reader\.run\((.*?)\);/);
            if (match && match[1]) {
              readerData = JSON.parse(match[1]);
            }
          } catch (e) {
            console.error('Error parsing reader data:', e);
            set.status = 500;
            return { error: 'Error parsing reader data', images: [] };
          }
        }
      });

      if (!readerData || !readerData.sources || !readerData.sources[0]) {
        set.status = 404;
        return { error: 'Reader data not found', images: [] };
      }

      const chapterTitle = document?.querySelector('h1.entry-title')?.textContent?.trim() || '';
      const prevLink = document?.querySelector('.ch-prev-btn')?.getAttribute('href');
      const nextLink = document?.querySelector('.ch-next-btn')?.getAttribute('href');

      const navigationLinks = {
        prev_chapter: prevLink ? new URL(prevLink, 'https://komikstation.org').pathname.slice(1) : null,
        next_chapter: nextLink ? new URL(nextLink, 'https://komikstation.org').pathname.slice(1) : null,
      };

      return {
        title: chapterTitle,
        images: readerData.sources[0].images,
        ...navigationLinks,
      };
    } catch (error) {
      console.error('Reader error:', error);
      set.status = 500;
      return { error: 'An error occurred while fetching the chapter.', images: [] };
    }
  }, {
    params: Type.Object({
      chapterId: Type.String(),
    }),
  })
  .get('/detail/:manhwaId', async ({ params: { manhwaId }, set }) => {
    try {
      await delay(1000);
      const response = await fetch(`https://komikstation.org/manga/${manhwaId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        },
      });
      const html = await response.text();
      const document = new DOMParser().parseFromString(html, 'text/html');

      const title = document?.querySelector('.entry-title')?.textContent?.trim() || '';
      const image = document?.querySelector('.thumb img')?.getAttribute('src') || '';
      const synopsis = document?.querySelector('.entry-content p')?.textContent?.trim() || '';

      const metadata: Record<string, string> = {};
      document?.querySelectorAll('.infox .info-content').forEach((element) => {
        const label = element.querySelector('.info-label')?.textContent?.trim() || '';
        const value = element.querySelector('.info-value')?.textContent?.trim() || '';
        metadata[label.toLowerCase().replace(':', '')] = value;
      });

      const chapters: { title: string; url: string; date: string }[] = [];
      document?.querySelectorAll('#chapterlist li').forEach((element) => {
        const link = element.querySelector('a');
        chapters.push({
          title: link?.textContent?.trim() || '',
          url: link?.getAttribute('href') || '',
          date: element.querySelector('.chapterdate')?.textContent?.trim() || '',
        });
      });

      return {
        title,
        image,
        synopsis,
        metadata,
        chapters,
      };
    } catch (error) {
      console.error('Manga detail error:', error);
      set.status = 500;
      return { error: 'An error occurred while fetching manga details.' };
    }
  }, {
    params: Type.Object({
      manhwaId: Type.String(),
    }),
  })
  .listen();