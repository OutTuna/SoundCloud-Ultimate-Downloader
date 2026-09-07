# SoundCloud Ultimate Downloader
Скрипт для загрузки контента из SoundCloud.

## Файлы
- `SoundCloud Ultimate Downloader 3.0.js` — **Full** версия.
- `SoundCloud Ultimate Downloader Lite.js` — **Lightweight** версия.

## Установка
1. Установите Tampermonkey (или аналог).
2. Откройте нужный `.js` файл из репозитория или релиза.
3. Импортируйте файл в Tampermonkey.
4. Откройте SoundCloud и используйте кнопки загрузки.

## Разница версий (RU)
### Lightweight (Lite)
- Легковесный скрипт без внешних библиотек.
- Скачивание: аватар, баннер, обложка, отдельные треки.
- Меньше интерфейса и ниже нагрузка на страницу.

### Full
- Полная версия с расширенным интерфейсом.
- Включает всё из Lite.
- Дополнительно: загрузка альбома/плейлиста в ZIP.
- Использует внешние библиотеки: `JSZip`, `StreamSaver`, `web-streams-polyfill`.
