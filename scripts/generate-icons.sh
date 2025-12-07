#!/bin/bash

# Script per generare icone PWA da un'immagine sorgente
# Richiede ImageMagick: brew install imagemagick

ICONS_DIR="public/icons"
SOURCE_SVG="$ICONS_DIR/icon.svg"

# Array di dimensioni necessarie
SIZES=(72 96 128 144 152 192 384 512)

echo "Generazione icone PWA..."

# Controlla se ImageMagick è installato
if ! command -v convert &> /dev/null; then
    echo "ImageMagick non trovato. Installalo con: brew install imagemagick"
    echo ""
    echo "In alternativa, puoi usare un servizio online come:"
    echo "- https://realfavicongenerator.net/"
    echo "- https://pwa-asset-generator.vercel.app/"
    exit 1
fi

# Genera ogni dimensione
for SIZE in "${SIZES[@]}"; do
    OUTPUT="$ICONS_DIR/icon-${SIZE}x${SIZE}.png"
    echo "Generando $OUTPUT..."
    convert -background none -resize ${SIZE}x${SIZE} "$SOURCE_SVG" "$OUTPUT"
done

echo ""
echo "Icone generate con successo!"
echo ""
echo "Per testare la PWA:"
echo "1. npm run build && npm start"
echo "2. Apri Chrome DevTools > Application > Manifest"
echo "3. Controlla che tutto sia verde"
echo "4. Su mobile, visita il sito e clicca 'Aggiungi a Home'"
