# Web-development TikTok ad

A one-minute, 1080×1920 ad on a plain white background that uses ZawadiMart as a portfolio piece to win website-development
clients. Every screen in it is a real, full-length screenshot of the working site (`assets/screens/`),
so the phone and laptop scroll, tap, click, type and change page like a real visit.

## Change the text, number or link

Edit `config.json`. Everything on screen comes from it:

| Field | What it controls |
| --- | --- |
| `whatsapp` | The number on the closing card |
| `portfolio` | The portfolio address on the closing card |
| `role` | The small label above the closing headline |
| `hook`, `showcase`, `pitch`, `cta` | Headlines, points, services and the call to action |
| `brand` | The logo and slogan shown in the opening clip |
| `pages` | The screenshots the devices can open, with each page's height in CSS pixels |
| `features` | The six feature cuts: label, one-line detail, `phone` or `laptop`, and `steps`, which run one after another: `go` (open a page), `scroll` (to a position), `tap`/`click` at `[x, y]`, `type` text into a `field`, and `wait` (seconds). Positions are in page CSS pixels. Each cut lasts as long as its steps need |
| `scrollSpeed` | How fast pages scroll, in page pixels per second, for `phone` and `desktop`. Lower is calmer and makes the video longer |
| `output` | The file name of the finished video |

Keep feature labels to about 28 characters so they stay on one line.

## Render

Needs Node 18+, Playwright with Chromium (`npm i playwright && npx playwright install chromium`),
ffmpeg, and Python 3 with numpy.

```bash
node render.cjs --stills   # quick preview frames in stills/
node render.cjs            # full video, about 16 minutes
node safe-check.cjs        # QA: text inside TikTok's safe area, no text touching the screens
node text-check.cjs        # QA: all on-screen text, exact WhatsApp number and portfolio address
```

The video is H.264 (High, yuv420p) at 30 fps with AAC audio normalised to about −14 LUFS, which
TikTok, Instagram Reels and WhatsApp Status accept.

## Files

- `ad.html`: the template. Builds every scene from `config.json`; all motion is in the script at the end.
- `render.cjs`: renders frames with Playwright, builds the soundtrack, encodes the MP4 with ffmpeg.
- `soundtrack.py`: an original, generated backing track plus sound effects timed to the video's cues.
  Nothing in it is sampled, so there is no copyright claim on it. You can also mute it in TikTok and
  pick a sound from TikTok's licensed library.
- `assets/whatsapp.svg`: the WhatsApp mark from Simple Icons (CC0), as published on Meta's WhatsApp
  brand page. Use it unaltered and only to point people to WhatsApp.
- `assets/fonts/`: Roboto (Apache 2.0).

## Suggested TikTok caption

> Business owner in Kenya? 🇰🇪 Your customers are already shopping on their phones. I build
> professional e-commerce websites with product catalogues, cart & checkout, M-PESA payments,
> customer accounts and an admin dashboard for your orders. This one is ZawadiMart, a live project
> I built. 📲 WhatsApp me on +254 117 561 192 to talk about your website. Portfolio:
> baracksilasmungai.onrender.com

#websitedeveloperkenya #webdesignkenya #kenyanbusiness #smallbusinesskenya #nairobibusiness
#ecommercekenya #onlineshopkenya #mpesa #businessownerskenya #nairobi #kenyantiktok #webdeveloper
#digitalkenya #entrepreneurkenya
