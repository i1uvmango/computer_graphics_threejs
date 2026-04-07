import re
import sys

def main():
    with open('js/game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Imports
    imports = """import * as THREE from 'three';
import { gsap, Power2 } from 'gsap';

"""
    if "import * as THREE" not in content:
        content = imports + content

    # 2. TweenMax -> gsap
    content = content.replace("TweenMax", "gsap")
    
    # 3. .applyMatrix( -> .applyMatrix4(
    # Only if not already applyMatrix4
    content = re.sub(r'\.applyMatrix\s*\(', '.applyMatrix4(', content)

    # 4. FLAT SHADING
    content = re.sub(r'shading\s*:\s*THREE\.FlatShading', 'flatShading:true', content)

    # 5. ALL OLD Geometries
    content = content.replace('THREE.CubeGeometry', 'THREE.BoxGeometry')

    # 6. Cabin Vertices specific fix
    cabin_old = """  geomCabin.vertices[4].y-=10;
  geomCabin.vertices[4].z+=20;
  geomCabin.vertices[5].y-=10;
  geomCabin.vertices[5].z-=20;
  geomCabin.vertices[6].y+=30;
  geomCabin.vertices[6].z+=20;
  geomCabin.vertices[7].y+=30;
  geomCabin.vertices[7].z-=20;"""
    cabin_new = """  var pos = geomCabin.attributes.position;
  for (let i=0; i<pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    if (x > 0 && y < 0 && z > 0) { pos.setY(i, y - 10); pos.setZ(i, z + 20); }
    else if (x > 0 && y < 0 && z < 0) { pos.setY(i, y - 10); pos.setZ(i, z - 20); }
    else if (x > 0 && y > 0 && z > 0) { pos.setY(i, y + 30); pos.setZ(i, z + 20); }
    else if (x > 0 && y > 0 && z < 0) { pos.setY(i, y + 30); pos.setZ(i, z - 20); }
  }"""
    content = content.replace(cabin_old, cabin_new)

    # 7. Propeller Vertices specific fix
    prop_old = """  geomPropeller.vertices[4].y-=5;
  geomPropeller.vertices[4].z+=5;
  geomPropeller.vertices[5].y-=5;
  geomPropeller.vertices[5].z-=5;
  geomPropeller.vertices[6].y+=5;
  geomPropeller.vertices[6].z+=5;
  geomPropeller.vertices[7].y+=5;
  geomPropeller.vertices[7].z-=5;"""
    prop_new = """  var prPos = geomPropeller.attributes.position;
  for (let i=0; i<prPos.count; i++) {
    let x = prPos.getX(i);
    let y = prPos.getY(i);
    let z = prPos.getZ(i);
    if (x > 0 && y < 0 && z > 0) { prPos.setY(i, y - 5); prPos.setZ(i, z + 5); }
    else if (x > 0 && y < 0 && z < 0) { prPos.setY(i, y - 5); prPos.setZ(i, z - 5); }
    else if (x > 0 && y > 0 && z > 0) { prPos.setY(i, y + 5); prPos.setZ(i, z + 5); }
    else if (x > 0 && y > 0 && z < 0) { prPos.setY(i, y + 5); prPos.setZ(i, z - 5); }
  }"""
    content = content.replace(prop_old, prop_new)

    # 8. Sea fix
    sea_init_old = """  geom.mergeVertices();
  var l = geom.vertices.length;

  this.waves = [];

  for (var i=0;i<l;i++){
    var v = geom.vertices[i];
    //v.y = Math.random()*30;
    this.waves.push({y:v.y,
                     x:v.x,
                     z:v.z,
                     ang:Math.random()*Math.PI*2,
                     amp:game.wavesMinAmp + Math.random()*(game.wavesMaxAmp-game.wavesMinAmp),
                     speed:game.wavesMinSpeed + Math.random()*(game.wavesMaxSpeed - game.wavesMinSpeed)
                    });
  };"""
    sea_init_new = """  var pos = geom.attributes.position;
  var l = pos.count;

  this.waves = [];
  var waveLookup = {}; // UV Seam splitting fix

  for (var i=0;i<l;i++){
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    let key = Math.round(x*10) + '_' + Math.round(y*10) + '_' + Math.round(z*10);

    if(!waveLookup[key]) {
      waveLookup[key] = {
         y: y,
         x: x,
         z: z,
         ang: Math.random()*Math.PI*2,
         amp: game.wavesMinAmp + Math.random()*(game.wavesMaxAmp-game.wavesMinAmp),
         speed: game.wavesMinSpeed + Math.random()*(game.wavesMaxSpeed - game.wavesMinSpeed)
      };
    }
    this.waves.push(waveLookup[key]);
  }"""
    content = content.replace(sea_init_old, sea_init_new)
    
    # 9. Sea moveWaves fix
    sea_update_old = """Sea.prototype.moveWaves = function (){
  var verts = this.mesh.geometry.vertices;
  var l = verts.length;
  for (var i=0; i<l; i++){
    var v = verts[i];
    var vprops = this.waves[i];
    v.x =  vprops.x + Math.cos(vprops.ang)*vprops.amp;
    v.y = vprops.y + Math.sin(vprops.ang)*vprops.amp;
    vprops.ang += vprops.speed*deltaTime;
    this.mesh.geometry.verticesNeedUpdate=true;
  }
}"""
    sea_update_new = """Sea.prototype.moveWaves = function (){
  var pos = this.mesh.geometry.attributes.position;
  for (var i=0; i<pos.count; i++){
    var vprops = this.waves[i];
    pos.setX(i, vprops.x + Math.cos(vprops.ang)*vprops.amp);
    pos.setY(i, vprops.y + Math.sin(vprops.ang)*vprops.amp);
    vprops.ang += vprops.speed*deltaTime;
  }
  pos.needsUpdate = true;
}"""
    content = content.replace(sea_update_old, sea_update_new)

    with open('js/game.js', 'w', encoding='utf-8') as f:
        f.write(content)
    
main()
