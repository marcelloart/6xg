'use strict';
// User photos are cropped locally to a small raster; the original file never leaves the device.
async function prepareFarmPhoto(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Pilih JPG, PNG, atau WebP, maksimal 10 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>48000000)throw new Error('Ukuran gambar terlalu besar. Pilih foto hingga 48 megapiksel.');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=192;const c=canvas.getContext('2d'),side=Math.min(bitmap.width,bitmap.height);
  c.fillStyle='#f5eedc';c.fillRect(0,0,192,192);c.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,192,192);
  for(const quality of[.88,.76,.64,.52,.4]){const photo=canvas.toDataURL('image/jpeg',quality);if(photo.length<=16384)return photo;}
  throw new Error('Foto terlalu rumit untuk disimpan. Pilih gambar lain.');
 }finally{bitmap.close();}
}
