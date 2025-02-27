# nekozane-manga-api

API ini dirancang untuk mengakses data manga/manhwa dari situs komikstation. API ini memungkinkan pengguna untuk mencari komik, melihat detail komik, dan membaca chapter.

## Fitur

- Pencarian komik berdasarkan kata kunci
- Melihat detail komik termasuk sinopsis, metadata, dan daftar chapter
- Membaca chapter komik dengan gambar

## Endpoint

### Root Endpoint

```
GET /
```

Respons:
```
miaw :3
```

### Pencarian Komik

```
GET /search/:query
```

Parameter:
- `query`: Kata kunci pencarian

Contoh:
```
GET /search/solo%20leveling
```

Respons:
```json
{
  "results": [
    {
      "title": "Solo Leveling",
      "manhwa_id": "solo-leveling",
      "image": "https://example.com/image.jpg",
      "latest_chapter": "Chapter 179",
      "rating": "9.5"
    },
    ...
  ]
}
```

### Detail Komik

```
GET /manhwa-detail/:manhwaId
```

Parameter:
- `manhwaId`: ID komik

Contoh:
```
GET /manhwa-detail/solo-leveling
```

Respons:
```json
{
  "title": "Solo Leveling",
  "image": "https://example.com/image.jpg",
  "synopsis": "Dalam dunia di mana pemburu harus melawan monster...",
  "metadata": {
    "status": "Completed",
    "author": "Chugong",
    "artist": "DUBU",
    "genre": "Action, Adventure, Fantasy"
  },
  "chapters": [
    {
      "title": "Chapter 179",
      "url": "https://komikstation.co/solo-leveling-chapter-179/",
      "date": "2021-12-29"
    },
    ...
  ]
}
```

### Membaca Chapter

```
GET /manga/:chapterId
```

Parameter:
- `chapterId`: ID chapter

Contoh:
```
GET /manga/solo-leveling-chapter-179
```

Respons:
```json
{
  "title": "Solo Leveling Chapter 179",
  "images": [
    {
      "src": "https://example.com/chapter-179-page-1.jpg"
    },
    ...
  ],
  "prev_chapter": "solo-leveling-chapter-178",
  "next_chapter": null
}
```

## Teknologi yang Digunakan

- [Elysia](https://elysiajs.com/) - Framework web untuk Bun/Deno
- [DOMParser](https://deno.land/x/deno_dom/deno-dom-wasm.ts) - Parser HTML untuk Deno
- [TypeBox](https://github.com/sinclairzx81/typebox) - Validasi tipe data

## Catatan Penggunaan

- API ini menggunakan CORS sehingga dapat diakses dari domain manapun
- API mengembalikan respons dalam format JSON
- Beberapa endpoint menggunakan delay untuk menghindari pembatasan rate dari sumber data
- API ini menggunakan teknik web scraping dan bergantung pada struktur HTML dari situs Komik Station

## Peringatan

API ini hanya untuk tujuan pendidikan dan pengembangan. Pastikan untuk mematuhi ketentuan layanan dari situs yang datanya diambil.

## Contoh Penggunaan

### JavaScript

```javascript
// Mencari komik
fetch('https://your-api-url.com/search/solo%20leveling')
  .then(response => response.json())
  .then(data => console.log(data));

// Melihat detail komik
fetch('https://your-api-url.com/manhwa-detail/solo-leveling')
  .then(response => response.json())
  .then(data => console.log(data));

// Membaca chapter
fetch('https://your-api-url.com/manga/solo-leveling-chapter-1')
  .then(response => response.json())
  .then(data => console.log(data));
```
