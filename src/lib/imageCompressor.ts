/**
 * Utility to compress and resize images client-side before uploading to storage.
 * 
 * @param file The original File uploaded by the user.
 * @param maxWidth The maximum width constraint (defaults to 2048 for 2K ultra-sharp quality).
 * @param quality The compression quality sweet-spot (defaults to 0.9 for 90% quality).
 * @returns A Promise that resolves to a compressed Blob (or original File if skipped/failed).
 */
export async function compressImage(file: File, maxWidth = 2048, quality = 0.9): Promise<Blob | File> {
  // Only compress standard image files
  if (!file.type.startsWith('image/')) {
    return file;
  }
  
  // Reject vector/animated images — must not be uploaded as-is
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    throw new Error('SVG e GIF não são permitidos. Use JPEG, PNG ou WebP.');
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize down to maxWidth preserving the aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Draw image onto the canvas context
        ctx.drawImage(img, 0, 0, width, height);

        // Convert PNGs to JPEG for massive space savings since PNGs are lossless and heavy
        const outputType = file.type === 'image/png' ? 'image/jpeg' : file.type;
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Convert blob to file-like object preserving the original name
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + (outputType === 'image/jpeg' ? '.jpg' : ''), {
                type: outputType,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          outputType,
          quality
        );
      };
      
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
