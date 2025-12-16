# PWA Icons Setup

## Required Icons

For a complete PWA experience, you need the following icons in the `public` folder:

1. **pwa-192x192.png** - 192x192 pixels
2. **pwa-512x512.png** - 512x512 pixels
3. **apple-touch-icon.png** - 180x180 pixels
4. **favicon.ico** - 32x32 pixels (optional, for older browsers)

## How to Create Icons

### Option 1: Use an Online Tool
1. Go to https://realfavicongenerator.net or https://favicon.io
2. Upload your logo/icon (use the favicon.svg as base)
3. Download the generated icons
4. Place them in the `public` folder

### Option 2: Use Image Editor
1. Open favicon.svg in an image editor (Figma, Photoshop, GIMP)
2. Export as PNG with these sizes:
   - 192x192 → pwa-192x192.png
   - 512x512 → pwa-512x512.png
   - 180x180 → apple-touch-icon.png
3. Place in the `public` folder

### Option 3: Use ImageMagick (Command Line)
```bash
# Install ImageMagick first
# Then convert the SVG to different sizes:

convert -background none -resize 192x192 public/favicon.svg public/pwa-192x192.png
convert -background none -resize 512x512 public/favicon.svg public/pwa-512x512.png
convert -background none -resize 180x180 public/favicon.svg public/apple-touch-icon.png
```

## Verification

After adding icons:
1. Build the project: `npm run build`
2. Deploy to GitHub Pages
3. Open the site on mobile
4. Check if "Install App" prompt appears
5. Install and verify the icon looks good

## Current Status

✅ favicon.svg - Created (base icon)
⚠️ pwa-192x192.png - **You need to create this**
⚠️ pwa-512x512.png - **You need to create this**
⚠️ apple-touch-icon.png - **You need to create this**

The app will work without these, but won't be installable as PWA until they're added.
