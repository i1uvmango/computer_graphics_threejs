import re

def main():
    with open('js/game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Rollback the specific inline 'var' additions that break scope
    content = content.replace('var sky = new Sky', 'sky = new Sky')
    content = content.replace('var coinsHolder = new CoinsHolder', 'coinsHolder = new CoinsHolder')
    content = content.replace('var ennemiesHolder = new EnnemiesHolder', 'ennemiesHolder = new EnnemiesHolder')
    content = content.replace('var particlesHolder = new ParticlesHolder', 'particlesHolder = new ParticlesHolder')

    # Add them to the global / module scope declarations instead
    # The original file has: 
    # // 3D Models
    # var sea;
    # var airplane;
    
    better_globals = """// 3D Models
var sea;
var airplane;
var sky;
var coinsHolder;
var ennemiesHolder;
var particlesHolder;
"""
    if "var sky;" not in content:
        content = content.replace("// 3D Models\nvar sea;\nvar airplane;", better_globals)

    with open('js/game.js', 'w', encoding='utf-8') as f:
        f.write(content)
        
if __name__ == "__main__":
    main()
