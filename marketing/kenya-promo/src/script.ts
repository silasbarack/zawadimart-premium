// Everything the promo says and shows, in one place. Times are in seconds on the 45 s timeline.
// Edit this file to change dialogue, subtitles, shot timings or contact details.
import footageStatus from './footage-status.json';

export const FPS = 30;
export const DURATION = 45;

export const CONTACT = {
  name: 'Barack Silas Mungai',
  whatsapp: '+254 117 561 192',
  waLink: 'wa.me/254117561192',
  portfolio: 'baracksilasmungai.onrender.com',
};

export const DISCLOSURE = 'Dramatization — actors portraying customers';

// Live-action shots. Each one is a slot: drop the clip into public/footage/<id>.mp4 (1080x1920, 30 fps,
// with its own synced dialogue audio) and run `npm run check-footage`; until then a labelled
// placeholder card is rendered in its place. See STORYBOARD.md for the full shot list and prompts.
export type Shot = { id: string; from: number; to: number; who: string; frame: string; action: string; line?: string };
export const SHOTS: Shot[] = [
  { id: 's1-a', from: 0, to: 1.6, who: 'Woman A (23–30)', frame: 'MCU, bright Nairobi cafe, window light, 35mm look', action: 'Scrolling the site on her phone, eyebrows up, turns to her friend', line: 'Weh, hii website iko clean aje!…' },
  { id: 's1-b', from: 3.0, to: 4.6, who: 'Woman B (23–30)', frame: 'MCU over a laptop, same cafe, reverse angle', action: 'Taps the trackpad, nods, smiles to Woman A', line: 'Ata ku-order ni rahisi sana…' },
  { id: 's2-a', from: 6.0, to: 8.4, who: 'Male entrepreneur (25–35)', frame: 'MS, modern office, desktop monitor beside him, soft key light', action: 'Turns from the monitor to camera, confident smile, starts his line', line: 'Ukitaka boyz mwenye anajua kudesgin website…' },
  { id: 's2-b', from: 11.0, to: 15.0, who: 'Male entrepreneur', frame: 'MCU, same set, slight push-in', action: 'Finishes the line, points to the screen, laughs', line: '…pigia Barack Silas Mungai na atakusort vibaya sana.' },
  { id: 's3-a', from: 15.0, to: 16.8, who: 'Women C and D (23–35)', frame: '2-shot on a sofa in a co-working lounge, golden hour', action: 'C holds the phone between them and opens the menu', line: 'Imagine biashara yako ikiwa na website smart hivi…' },
  { id: 's3-b', from: 19.4, to: 21.2, who: 'Woman D', frame: 'CU, same lounge', action: 'Looks up from the phone to C, impressed', line: 'Na iko fast kwa simu pia!…' },
  { id: 's3-c', from: 23.8, to: 25.0, who: 'Women C and D', frame: '2-shot', action: 'Both smile; C taps the phone once more', line: '' },
];
export const footageReady = (id: string): boolean => Boolean((footageStatus as Record<string, boolean>)[id]);

// Genuine screen recordings of the working ZawadiMart site (tools/record-screens.cjs)
export type Insert = { from: number; to: number; clip: string; startAt: number; kind: 'phone' | 'desktop' | 'both'; label?: string; second?: { clip: string; startAt: number } };
export const INSERTS: Insert[] = [
  { from: 1.6, to: 3.0, clip: 'recordings/phone-browse.mp4', startAt: 1.0, kind: 'phone' },
  { from: 4.6, to: 6.0, clip: 'recordings/phone-browse.mp4', startAt: 8.0, kind: 'phone' },
  { from: 8.4, to: 11.0, clip: 'recordings/desktop-home.mp4', startAt: 0.6, kind: 'both', second: { clip: 'recordings/phone-menu-product.mp4', startAt: 0.0 } },
  { from: 16.8, to: 19.4, clip: 'recordings/phone-menu-product.mp4', startAt: 0.5, kind: 'phone' },
  { from: 21.2, to: 23.8, clip: 'recordings/phone-checkout.mp4', startAt: 3.6, kind: 'phone', label: 'Demo checkout' },
];

// Subtitles: the spoken words (spelling tidied for reading only) plus an English line
export type Sub = { from: number; to: number; who?: string; text: string; en: string };
export const SUBS: Sub[] = [
  { from: 0.2, to: 2.9, who: 'A', text: 'Weh, hii website iko clean aje! Na products zote zinaonekana poa!', en: 'Wow, this website is so clean! All the products look great!' },
  { from: 3.0, to: 5.9, who: 'B', text: 'Ata ku-order ni rahisi sana. Hii design iko next level!', en: 'Even ordering is really easy. This design is next level!' },
  { from: 6.3, to: 10.2, text: 'Ukitaka boyz mwenye anajua ku-design website smart kama hii,', en: 'If you want a guy who knows how to design a smart website like this,' },
  { from: 10.2, to: 14.7, text: 'pigia Barack Silas Mungai na atakusort vibaya sana.', en: 'call Barack Silas Mungai and he will sort you out big time.' },
  { from: 15.2, to: 19.3, who: 'C', text: 'Imagine biashara yako ikiwa na website smart hivi. Customers wanaweza kuona bidhaa zako anytime!', en: 'Imagine your business with a smart website like this. Customers can see your products anytime!' },
  { from: 19.5, to: 22.9, who: 'D', text: 'Na iko fast kwa simu pia! Hii ni professional kabisa.', en: 'And it is fast on the phone too! This is totally professional.' },
  { from: 25.3, to: 28.7, text: 'Unataka biashara yako ionekane professional online?', en: 'Want your business to look professional online?' },
  { from: 28.8, to: 34.7, text: 'Barack Silas Mungai anakutengenezea website ya kisasa, fast, secure, na mobile-friendly.', en: 'Barack Silas Mungai builds you a modern website: fast, secure and mobile-friendly.' },
];

// Scene 4 services. Only features that exist in a working project get footage; the rest are listed as services.
export type Service = { title: string; clip?: string; startAt?: number; kind?: 'phone' | 'desktop'; note?: string };
export const SERVICES: Service[] = [
  { title: 'E-commerce product catalogues', clip: 'recordings/phone-browse.mp4', startAt: 2.6, kind: 'phone' },
  { title: 'M-PESA payment integration', clip: 'recordings/phone-checkout.mp4', startAt: 4.6, kind: 'phone', note: 'Demo checkout' },
  { title: 'Admin dashboard & order management', clip: 'recordings/desktop-admin.mp4', startAt: 0.4, kind: 'desktop' },
  { title: 'Order-tracking forms', clip: 'recordings/phone-track-order.mp4', startAt: 0.2, kind: 'phone' },
];
export const MORE_SERVICES = ['Business websites', 'Booking systems', 'Contact forms', 'Ongoing maintenance'];

// Scene 5
export const CTA = {
  headline: 'YOUR BUSINESS DESERVES A BETTER WEBSITE',
  button: "WhatsApp Now — Let's Build Yours!",
  message: "Hello Barack, I'm interested in getting a professional website for my business.",
  chatTime: '10:24',
};

// Audio slots: drop finished files here (see STORYBOARD.md). Missing files are skipped.
export const AUDIO = {
  music: 'audio/music.wav',
  voiceover: 'audio/vo-scene4.wav', // Kenyan male or female voice, Kiswahili/Sheng, 25.3–34.7 s
};
