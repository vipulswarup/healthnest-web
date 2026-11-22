import sharp from 'sharp';
// A reproducible graphic using the website's palette and existing brand mark.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#e8f0ff"/>
<rect x="40" y="40" width="1120" height="550" rx="32" fill="#fff"/>
<g font-family="Arial, sans-serif">
<text x="166" y="137" font-size="42" font-weight="700" fill="#362f2f">SanoVault</text>
<text x="80" y="255" font-size="56" font-weight="700" fill="#362f2f">All your family’s medical</text>
<text x="80" y="326" font-size="56" font-weight="700" fill="#362f2f">records in one place.</text>
<text x="80" y="395" font-size="27" fill="#625d66">Lab reports. Prescriptions. A history you can find.</text>
<rect x="80" y="456" width="350" height="65" rx="16" fill="#165fcf"/>
<text x="108" y="498" font-size="26" font-weight="700" fill="#fff">Create your family folder</text>
<text x="829" y="504" font-size="23" fill="#625d66">www.sanovault.com</text>
</g></svg>`;
const logo = await sharp('public/logo.png').resize(64, 64).toBuffer();
await sharp(Buffer.from(svg)).composite([{ input: logo, left: 80, top: 85 }]).png({ compressionLevel: 9 }).toFile('app/opengraph-image.png');
