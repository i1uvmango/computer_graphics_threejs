import re

def main():
    with open('js/game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to find the entire var AirPlane = function(){ ... }
    # Since it's long, we can use regex to match from var AirPlane = function to the end of the constructor
    
    # AirPlane constructor starts at "var AirPlane = function(){"
    # and ends right before "AirPlane.prototype.propellerSpins" or similar, or just find the end bracket.
    
    # We will replace it safely.
    # To be extremely safe, we will capture from 'var AirPlane = function(){' up to 'var airplane;' or 'function createPlane()'
    # Wait, 'var airplane;' is at the top. 
    # Let's match starting exactly at "var AirPlane = function(){" till "var Sky = function()"
    match = re.search(r'var AirPlane = function\(\){.*?};(?:(?!\nvar Sky).)*', content, re.DOTALL)
    
    new_airplane = """var AirPlane = function(){
  this.mesh = new THREE.Object3D();
  this.mesh.name = "airPlane";

  // Load user image (LeBron)
  var textureLoader = new THREE.TextureLoader();
  var texture = textureLoader.load('img/lebron.png');

  // Create a 2D plane mapped with the texture
  var geom = new THREE.PlaneGeometry(350, 350); 
  var mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide
  });

  var lebronMesh = new THREE.Mesh(geom, mat);
  
  // LeBron is facing forward, but original airplane flew towards +X
  // So we may need to rotate the plane so it faces the camera properly when moving
  lebronMesh.rotation.y = Math.PI / 2; // looking right
  
  this.mesh.add(lebronMesh);

  // Dummy propeller to prevent error in loop()
  this.propeller = new THREE.Object3D();
  this.mesh.add(this.propeller);
  
  // Dummy pilot to prevent error in updatePlane()
  this.pilot = {
      updateHairs: function(){}
  };
};

"""
    
    # Regex to replace just AirPlane
    content = re.sub(r'var AirPlane = function\(\)\{.*?\n\};\n', new_airplane, content, flags=re.DOTALL)

    with open('js/game.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    main()
