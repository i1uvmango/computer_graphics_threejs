import re

def main():
    with open('js/game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    new_airplane = """var AirPlane = function(){
  this.mesh = new THREE.Object3D();
  this.mesh.name = "airPlane";

  // 색상 셋팅
  var skinColor = 0xf4ce93;  // 살구색
  var shirtColor = 0x23190f; // 검은색/짙은갈색
  var pantsColor = 0x68c3c0; // 파란색
  var shoesColor = 0xf25346; // 빨간색
  var capeColor = 0xf25346;  // 망토 (빨간색)

  var matSkin = new THREE.MeshPhongMaterial({color: skinColor, flatShading: true});
  var matShirt = new THREE.MeshPhongMaterial({color: shirtColor, flatShading: true});
  var matPants = new THREE.MeshPhongMaterial({color: pantsColor, flatShading: true});
  var matShoes = new THREE.MeshPhongMaterial({color: shoesColor, flatShading: true});
  var matCape = new THREE.MeshPhongMaterial({color: capeColor, flatShading: true, side: THREE.DoubleSide});

  // 몸통 (가로로 누워서 X축 방향으로 날아가는 자세)
  // X: 길이, Y: 두께, Z: 어깨 너비
  var geomTorso = new THREE.BoxGeometry(60, 20, 30);
  var torso = new THREE.Mesh(geomTorso, matShirt);
  torso.castShadow = true;
  torso.receiveShadow = true;
  this.mesh.add(torso);

  // 머리 (앞쪽 +X)
  var geomHead = new THREE.BoxGeometry(25, 25, 25);
  var head = new THREE.Mesh(geomHead, matSkin);
  head.position.set(40, 0, 0); // 몸통보다 앞에 위치
  head.castShadow = true;
  head.receiveShadow = true;
  this.mesh.add(head);

  // 팔 (앞으로 뻗은 슈퍼맨 자세)
  var geomArm = new THREE.BoxGeometry(50, 12, 12);
  var armR = new THREE.Mesh(geomArm, matSkin);
  armR.position.set(30, 0, 20); // 우측
  armR.castShadow = true;
  armR.receiveShadow = true;
  this.mesh.add(armR);

  var armL = new THREE.Mesh(geomArm, matSkin);
  armL.position.set(30, 0, -20); // 좌측
  armL.castShadow = true;
  armL.receiveShadow = true;
  this.mesh.add(armL);

  // 다리 (뒤로 뻗은 자세)
  var geomLeg = new THREE.BoxGeometry(60, 15, 15);
  var legR = new THREE.Mesh(geomLeg, matPants);
  legR.position.set(-50, 0, 8);
  legR.castShadow = true;
  legR.receiveShadow = true;
  this.mesh.add(legR);

  var legL = new THREE.Mesh(geomLeg, matPants);
  legL.position.set(-50, 0, -8);
  legL.castShadow = true;
  legL.receiveShadow = true;
  this.mesh.add(legL);

  // 신발
  var geomShoe = new THREE.BoxGeometry(20, 18, 16);
  var shoeR = new THREE.Mesh(geomShoe, matShoes);
  shoeR.position.set(-85, 0, 8);
  shoeR.castShadow = true;
  shoeR.receiveShadow = true;
  this.mesh.add(shoeR);

  var shoeL = new THREE.Mesh(geomShoe, matShoes);
  shoeL.position.set(-85, 0, -8);
  shoeL.castShadow = true;
  shoeL.receiveShadow = true;
  this.mesh.add(shoeL);

  // 망토 (등 위에 부착, 펄럭이는 느낌)
  var geomCape = new THREE.PlaneGeometry(80, 40);
  this.cape = new THREE.Mesh(geomCape, matCape);
  this.cape.position.set(-30, 13, 0); // 등 위쪽
  this.cape.rotation.x = Math.PI / 2;     // 평면을 눕힘
  this.cape.rotation.y = -Math.PI / 12;   // 위로 살짝 들리게 각도 줌
  this.cape.castShadow = true;
  this.mesh.add(this.cape);

  // 더미 객체 (기존 충돌 및 렌더링 에러 방지용)
  this.propeller = new THREE.Object3D(); 
  this.mesh.add(this.propeller);
  
  this.pilot = {
      updateHairs: function(){}
  };
};
"""
    
    # Replace from var AirPlane = function(){ to the end of the block.
    # The current block in game.js ends with `};` and has dummy objects.
    
    # We will search using regex
    content = re.sub(r'var AirPlane = function\(\)\{.*?\n\};\n', new_airplane + '\n', content, flags=re.DOTALL)

    with open('js/game.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    main()
