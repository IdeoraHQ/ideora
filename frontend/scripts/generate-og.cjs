const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080E1E"/>
      <stop offset="50%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#0A0F1D"/>
    </linearGradient>
    <radialGradient id="glow-top-left" cx="15%" cy="20%" r="45%">
      <stop offset="0%" stop-color="#2563EB" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="#1D4ED8" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#080E1E" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow-bottom-right" cx="85%" cy="80%" r="50%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#080E1E" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bolt-spark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#93C5FD"/>
    </linearGradient>
    <linearGradient id="text-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="100%" stop-color="#38BDF8"/>
    </linearGradient>
    <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" stroke-width="0.8" stroke-opacity="0.4"/>
    </pattern>
  </defs>

  <!-- Background Base -->
  <rect width="1200" height="630" fill="url(#bg-grad)"/>
  <rect width="1200" height="630" fill="url(#grid-pattern)"/>
  <rect width="1200" height="630" fill="url(#glow-top-left)"/>
  <rect width="1200" height="630" fill="url(#glow-bottom-right)"/>

  <!-- Top Brand Row -->
  <g transform="translate(80, 75)">
    <!-- Bulb Logo Container -->
    <rect width="56" height="56" rx="16" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
    <g transform="translate(8, 8) scale(0.625)">
      <!-- Official IDEORA Lightbulb outline -->
      <path
        d="M32 6C20.9543 6 12 14.9543 12 26C12 32.5516 15.158 38.3582 20.082 42.0625C21.9015 43.4312 23 45.5842 23 47.8687V48.5C23 50.433 24.567 52 26.5 52H37.5C39.433 52 41 50.433 41 48.5V47.8687C41 45.5842 42.0985 43.4312 43.918 42.0625C48.842 38.3582 52 32.5516 52 26C52 14.9543 43.0457 6 32 6Z"
        stroke="#38BDF8"
        stroke-width="4.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
      <!-- Base cap -->
      <path
        d="M26 58C26 58 28.5 60 32 60C35.5 60 38 58 38 58"
        stroke="#38BDF8"
        stroke-width="4.5"
        stroke-linecap="round"
      />
      <!-- Lightning bolt inside -->
      <path
        d="M34 16L24 30H32L30 42L40 28H32L34 16Z"
        fill="url(#bolt-spark)"
        stroke-linejoin="round"
      />
    </g>

    <!-- Wordmark -->
    <text x="72" y="38" font-family="'Outfit', -apple-system, sans-serif" font-weight="300" font-size="32" fill="#FFFFFF" letter-spacing="-0.5">IDEORA</text>

    <!-- Category Pill -->
    <rect x="230" y="12" width="285" height="32" rx="16" fill="#1E293B" stroke="#38BDF8" stroke-width="1" stroke-opacity="0.4"/>
    <circle cx="248" cy="28" r="4" fill="#38BDF8"/>
    <text x="260" y=\"33\" font-family="'Outfit', -apple-system, sans-serif" font-weight="600" font-size="12" fill="#93C5FD" letter-spacing="0.8">VENTURE-GRADE ADOPTION NETWORK</text>
  </g>

  <!-- Main Headline -->
  <g transform="translate(80, 220)">
    <text font-family="'Outfit', -apple-system, sans-serif" font-weight="300" font-size="58" fill="#FFFFFF" letter-spacing="-1.5">
      Where ambitious ideas
    </text>
    <text y="68" font-family="'Outfit', -apple-system, sans-serif" font-weight="400" font-size="58" fill="url(#text-gradient)" letter-spacing="-1.5">
      find their builders.
    </text>
  </g>

  <!-- Subtitle -->
  <g transform="translate(80, 360)">
    <text font-family="'Outfit', -apple-system, sans-serif" font-weight="400" font-size="20" fill="#94A3B8" letter-spacing="-0.2">
      Publish early concepts, assemble senior engineering teams, and co-found real software ventures.
    </text>
  </g>

  <!-- Feature Cards Row (3 Cards) -->
  <g transform="translate(80, 440)">
    <!-- Card 1 -->
    <rect width="325" height="115" rx="18" fill="#0F172A" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="36" cy="38" r="14" fill="#1E293B"/>
    <text x="30" y="43" font-size="14" fill="#38BDF8">&#10022;</text>
    <text x="60" y="42" font-family="'Outfit', -apple-system, sans-serif" font-weight="600" font-size="16" fill="#F8FAFC">Verified Builders</text>
    <text x="24" y="75" font-family="'Outfit', -apple-system, sans-serif" font-weight="400" font-size="13" fill="#64748B">Senior engineers, AI architects &amp;</text>
    <text x="24" y="94" font-family="'Outfit', -apple-system, sans-serif" font-weight="400" font-size="13" fill="#64748B">technical product designers</text>

    <!-- Card 2 -->
    <g transform="translate(355, 0)">
      <rect width="325" height="115" rx="18" fill="#0F172A" stroke="#1E293B" stroke-width="1.5"/>
      <circle cx="36" cy="38" r="14" fill="#1E293B"/>
      <text x="29" y="43" font-size="13" fill="#60A5FA">&#9889;</text>
      <text x="60" y="42" font-family="'Outfit', -apple-system, sans-serif" font-weight="600" font-size="16" fill="#F8FAFC">Structured Adoption</text>
      <text x="24" y="75" font-family="'Outfit', -apple-system, sans-serif" font-weight="400" font-size="13" fill="#64748B">Co-founder matching, open source &amp;</text>
      <text x="24" y="94" font-family="'Outfit', -apple-system, sans-serif" font-weight="400" font-size="13" fill="#64748B">contributor workspace seats</text>
    </g>

    <!-- Card 3 -->
    <g transform="translate(710, 0)">
      <rect width="330" height="115" rx="18" fill="#0F172A" stroke="#1E293B" stroke-width="1.5"/>
      <circle cx="36" cy="38" r="14" fill="#1E293B"/>
      <text x="30" y="43" font-size="13" fill="#34D399">&#10003;</text>
      <text x="60" y="42" font-family="'Outfit', -apple-system, sans-serif" font-weight="600" font-size="16" fill="#F8FAFC">Zero Intermediary</text>
      <text x="24" y="75" font-family="'Outfit', -apple-system, sans-serif" font-weight="400" font-size="13" fill="#64748B">100% builder autonomy, zero equity</text>
      <text x="24" y="94" font-family="'Outfit', -apple-system, sans-serif" font-weight="400" font-size="13" fill="#64748B">cuts or intermediary platform fees</text>
    </g>
  </g>
</svg>`;

const publicDir = path.resolve(__dirname, '../public');
fs.writeFileSync(path.join(publicDir, 'og-image.svg'), svg);

const resvg = new Resvg(svg, {
  fitTo: {
    mode: 'width',
    value: 1200,
  },
});
const pngData = resvg.render();
const pngBuffer = pngData.asPng();
fs.writeFileSync(path.join(publicDir, 'og-image.png'), pngBuffer);
console.log('SUCCESS: Generated public/og-image.svg and public/og-image.png (size:', pngBuffer.length, 'bytes)');

