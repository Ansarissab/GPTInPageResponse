# How to Create Icons

You need 3 icon files in an `icons` folder:
- icon16.png (16x16 pixels)
- icon48.png (48x48 pixels)  
- icon128.png (128x128 pixels)

## Quick Method - Use an Online Tool:

1. Go to https://www.favicon-generator.org/ or similar
2. Upload any image (or create a simple one)
3. Download the generated icons
4. Rename them to icon16.png, icon48.png, icon128.png
5. Put them in an `icons` folder

## Or Use This HTML Generator:

Save this as `generate-icons.html` and open in browser:

```html
<!DOCTYPE html>
<html>
<head><title>Icon Generator</title></head>
<body style="font-family: Arial; padding: 20px;">
  <h2>ChatGPT Assistant Icon Generator</h2>
  <p>Right-click each canvas below and select "Save image as..."</p>
  
  <div style="margin: 20px 0;">
    <p>icon16.png:</p>
    <canvas id="canvas16" width="16" height="16" style="border: 1px solid #ccc;"></canvas>
  </div>
  
  <div style="margin: 20px 0;">
    <p>icon48.png:</p>
    <canvas id="canvas48" width="48" height="48" style="border: 1px solid #ccc;"></canvas>
  </div>
  
  <div style="margin: 20px 0;">
    <p>icon128.png:</p>
    <canvas id="canvas128" width="128" height="128" style="border: 1px solid #ccc;"></canvas>
  </div>

  <script>
    function drawIcon(canvasId, size) {
      const canvas = document.getElementById(canvasId);
      const ctx = canvas.getContext('2d');
      
      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#10a37f');
      gradient.addColorStop(1, '#0d8c6d');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      // Letter "C"
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.floor(size * 0.6)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C', size / 2, size / 2);
    }
    
    drawIcon('canvas16', 16);
    drawIcon('canvas48', 48);
    drawIcon('canvas128', 128);
  </script>
</body>
</html>
```

## Or Use Any Image:

Just resize any image you like to 16x16, 48x48, and 128x128 pixels.
You can use:
- Photoshop
- GIMP (free)
- Online tools like Pixlr or Photopea
- Even MS Paint!

## Folder Structure Should Be:

```
chatgpt-assistant/
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── manifest.json
├── background.js
├── content.js
├── popup.css
├── settings.html
├── settings.js
├── README.md
└── QUICK_START.md
```

**Note:** Icons are just for visual appearance. The extension will work even with placeholder icons!
