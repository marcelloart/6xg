"""Prepare licensed scan textures for web delivery. Input is a download cache, never player data.
Run: python tools/import-cc0-textures.py <cache-directory>
Then: node tools/import-cc0-models.mjs <cache-directory>
The source URLs and processing records are written alongside the shipped assets.
"""
from pathlib import Path
from PIL import Image, ImageChops
import sys,json,zipfile,io,hashlib

ROOT=Path(__file__).resolve().parents[1]
CACHE=Path(sys.argv[1]).resolve(); DEST=ROOT/'assets/cc0';DEST.mkdir(exist_ok=True)
records=[]
def image(z,name):return Image.open(io.BytesIO(z.read(name))).copy()
def write(im,path,size=None,alpha=False):
    im=im.copy()
    if size:im.thumbnail((size,size),Image.Resampling.LANCZOS)
    path=DEST/path;path.parent.mkdir(parents=True,exist_ok=True)
    im=im.convert('RGBA' if alpha else 'RGB')
    if alpha:im.save(path,'WEBP',quality=88,method=6)
    else:im.save(path,'JPEG',quality=86,optimize=True,subsampling=0)
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'resolution':list(im.size),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}

# 4K colour stays at its genuine source resolution. Data maps have a smaller GPU budget.
for id in ['Grass005','Ground112','Wood096','Bark012','Plaster001','RoofingTiles013A','Rock064','Metal055A','ThatchedRoof001A']:
    folder=id;files=[]
    zip_path=CACHE/(id+'_4K-JPG.zip')
    if zip_path.exists():z=zipfile.ZipFile(zip_path)
    else:
        # The three previously imported scans are already in the repository.
        z=None
    def read(suffix):
        name=id+'_4K-JPG_'+suffix+'.jpg'
        if z:return image(z,name) if name in z.namelist() else None
        path=ROOT/'assets/textures'/name
        return Image.open(path).copy() if path.exists() else None
    color=read('Color');normal=read('NormalGL');rough=read('Roughness');metal=read('Metalness');ao=read('AmbientOcclusion')
    for quality,colour_size,data_size in [('ultra',4096,1024),('high',2048,512),('low',512,256)]:
        files.append(write(color,f'{folder}/color-{quality}.jpg',colour_size))
        files.append(write(normal,f'{folder}/normal-{quality}.jpg',min(2048,colour_size)))
        size=data_size
        grey=lambda im,default:im.convert('L').resize((size,size),Image.Resampling.LANCZOS) if im else Image.new('L',(size,size),default)
        packed=Image.merge('RGB',(grey(ao,255),grey(rough,210),grey(metal,0)))
        files.append(write(packed,f'{folder}/arm-{quality}.jpg'))
    records.append({'id':id,'provider':'ambientCG','type':'material','source':'https://ambientcg.com/a/'+id,'download':'https://ambientcg.com/get?file='+id+'_4K-JPG.zip','license':'CC0-1.0','files':files,'processing':'JPEG recompression; 4K source colour retained for Ultra, lower presets resized; AO/roughness/metalness packed in RGB.'})

def atlas(id,version,box=None):
    z=zipfile.ZipFile(CACHE/(id+'_'+version+'.zip'));prefix=id+'_'+version+'_'
    color=image(z,prefix+'Color.png').convert('RGBA');alpha=image(z,prefix+'Opacity.png').convert('L')
    if box:
        rect=tuple(round(v*s) for v,s in zip(box,(color.width,color.height,color.width,color.height)))
        color=color.crop(rect);alpha=alpha.crop(rect)
        # Some scans contain white guide lines outside the leaf. They are not foliage.
        rgb=color.convert('RGB');white=ImageChops.darker(ImageChops.darker(rgb.getchannel('R'),rgb.getchannel('G')),rgb.getchannel('B')).point(lambda v:0 if v>225 else 255)
        alpha=ImageChops.multiply(alpha,white)
    color.putalpha(alpha)
    files=[]
    for quality,size in [('ultra',2048),('high',1024),('low',512)]:
        files.append(write(color,f'{id}/color-{quality}.webp',size,True))
        for kind in ['NormalGL','Roughness']:
            name=prefix+kind+'.png'
            if name not in z.namelist():continue
            im=image(z,name)
            if box:im=im.crop(rect)
            files.append(write(im,f'{id}/{"normal" if kind=="NormalGL" else "rough"}-{quality}.jpg',min(size,1024)))
    records.append({'id':id,'provider':'ambientCG','type':'atlas','source':'https://ambientcg.com/a/'+id,'download':'https://ambientcg.com/get?file='+id+'_'+version+'.zip','license':'CC0-1.0','files':files,'processing':'Opacity merged into WebP alpha; source leaf or food slice cropped where specified. No generated image content.'})
atlas('LeafSet004','4K-PNG',(.36,.02,.65,.49))
atlas('Foliage008','4K-PNG')
atlas('ColdCutsSet002','2K-PNG')
atlas('FoodCrossSectionSet001','2K-PNG')

for id in ['3DApple002','3DAvocado001','3DTreeStump001']:
    z=zipfile.ZipFile(CACHE/(id+'_LQ-4K-JPG.zip'));folder=DEST/id;folder.mkdir(exist_ok=True)
    obj=id+'_LQ-4K-JPG.obj';(folder/'source.obj').write_bytes(z.read(obj))
    files=[]
    for quality,size in [('ultra',4096),('high',2048),('low',512)]:
        for suffix,field in [('Color','color'),('NormalGL','normal'),('Roughness','rough')]:
            name=id+'_LQ-4K-JPG_'+suffix+'.jpg'
            if name in z.namelist():files.append(write(image(z,name),f'{id}/{field}-{quality}.jpg',size if field=='color' else min(size,1024)))
    records.append({'id':id,'provider':'ambientCG','type':'3d-model','source':'https://ambientcg.com/a/'+id,'download':'https://ambientcg.com/get?file='+id+'_LQ-4K-JPG.zip','license':'CC0-1.0','files':files,'processing':'Original LQ OBJ mesh converted to indexed glTF; genuine 4K colour scan plus normal map; lower presets resized.'})

for id in ['island_tree_02','boulder_01','wooden_crate_02']:
    src=CACHE/id;gltf=json.loads((src/(id+'.gltf')).read_text(encoding='utf-8'));files=[]
    for im in gltf['images']:
        original=Image.open(src/im['uri']).copy();name=Path(im['uri']).name.replace('_4k.jpg','')
        alpha=False
        if 'leaves_diff' in name:
            # glTF JPG strips the alpha channel. Restore the provider's matching alpha scan.
            mask=Image.open(src/'leaves-alpha.png').convert('L')
            original=original.convert('RGBA');original.putalpha(mask.resize(original.size));alpha=True
        for quality,size in [('ultra',4096 if 'diff' in name and 'branches' not in name else 1024),('high',1024),('low',512)]:
            files.append(write(original,f'{id}/{name}-{quality}.{"webp" if alpha else "jpg"}',size,alpha))
    records.append({'id':id,'provider':'Poly Haven','type':'3d-model','source':'https://polyhaven.com/a/'+id,'download':'https://api.polyhaven.com/files/'+id,'license':'CC0-1.0','files':files,'processing':'Original glTF mesh optimized with attribute-aware meshoptimizer simplification; embedded LODs for Ultra/high/low; provider alpha restored for foliage. Genuine 4K colour for selected Ultra maps; data maps downsampled.'})

id='DaySkyHDRI069A';z=zipfile.ZipFile(CACHE/(id+'_2K.zip'));folder=DEST/id;folder.mkdir(exist_ok=True);path=folder/'environment.exr';path.write_bytes(z.read(id+'_2K_HDR.exr'))
records.append({'id':id,'provider':'ambientCG','type':'hdri','source':'https://ambientcg.com/a/'+id,'download':'https://ambientcg.com/get?file='+id+'_2K.zip','license':'CC0-1.0','files':[{'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}],'processing':'Original 2K EXR for physical image-based lighting, sky background, and water reflections. Sky is not upscaled to 4K.'})
manifest={'license':'CC0-1.0','licenseUrls':{'ambientCG':'https://docs.ambientcg.com/license/','Poly Haven':'https://polyhaven.com/license'},'assets':records,'coverage':{'landscape':['Grass005','Ground112','Rock064','boulder_01'],'trees':['island_tree_02','Bark012','LeafSet004','3DTreeStump001'],'grassClumps':['Foliage008'],'buildings':['Wood096','Plaster001','RoofingTiles013A','Metal055A','ThatchedRoof001A'],'fruitModels':{'apple':'3DApple002','avocado':'3DAvocado001'},'vegetableDetails':['LeafSet004','FoodCrossSectionSet001'],'shop':['3DApple002','3DAvocado001','ColdCutsSet002','wooden_crate_02'],'environment':['DaySkyHDRI069A']},'authorship':'House, barn, shed, well, bridge, crop growth meshes and animated water geometry are original game geometry using the registered CC0 scan materials. Carrot, tomato, corn, strawberry, potato, chili and orange do not have imported full photogrammetry models; their shapes remain authored for this game. Player-uploaded profile images, brand/UI graphics and the 2D compatibility renderer are not stock 3D assets.'}
(DEST/'sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'assets':len(records),'files':sum(len(r['files']) for r in records),'bytes':sum(f['bytes'] for r in records for f in r['files'])}))
