import re

def main():
    with open('js/game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    new_airplane = """var AirPlane = function(){
  this.mesh = new THREE.Object3D();
  this.mesh.name = "airPlane";

  // 사용자의 이미지를 3D 입체로 만들기 위한 텍스처 로드
  var textureLoader = new THREE.TextureLoader();
  var texture = textureLoader.load('img/youngseo.png');

  // 재질 설정 (투명도 지원 및 알파테스트로 픽셀을 자름)
  var mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.5, // 투명한 배경을 완전히 잘라냅니다.
    side: THREE.FrontSide // 앞뒷면 렌더링 중복 방지
  });

  var matBack = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.5,
    side: THREE.BackSide
  });

  var geom = new THREE.PlaneGeometry(350, 350); 
  
  // 2D 이미지를 3D처럼 보이게 하는 기법 (Volumetric Sprite)
  // 동일한 평면을 Z축으로 미세하게 여러 장 겹쳐서 입체(두께)를 만듭니다.
  var depth = 20; // 두께 조절 (20장)
  for(var i=0; i<depth; i++) {
     var layer = new THREE.Mesh(geom, mat);
     layer.position.z = i * 2 - (depth); // 2단위 간격으로 배치
     this.mesh.add(layer);
     
     // 마지막 뒷면은 BackSide 재질로 덮어 뒤에서도 보이게 함
     if(i === 0) {
         var backLayer = new THREE.Mesh(geom, matBack);
         backLayer.position.z = i * 2 - (depth) - 1;
         this.mesh.add(backLayer);
     }
  }

  // 게임 시점(우측 방향 비행)에 맞게 축 회전
  // X축으로 날아가기 때문에 이미지가 바라보는 방향을 정렬합니다.
  this.mesh.rotation.x = Math.PI / 2; // 평면 뷰트 수정 (상황에 따라 주석처리 가능)
  // 기존 Orbit 적용 시 화면에 수직으로 보이려면 로테이션을 초기 상태로 두는 것이 좋습니다.
  this.mesh.rotation.set(0, 0, 0);

  // 더미 객체 (기존 충돌 및 렌더링 에러 방지용)
  this.propeller = new THREE.Object3D(); 
  this.mesh.add(this.propeller);
  
  this.pilot = {
      updateHairs: function(){}
  };
};
"""
    
    # Replace AirPlane
    content = re.sub(r'var AirPlane = function\(\)\{.*?\n\};\n', new_airplane + '\n', content, flags=re.DOTALL)

    with open('js/game.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    main()
