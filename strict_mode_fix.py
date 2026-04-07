import re

def main():
    with open('js/game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Add 'var ' in front of undeclared constructor assignments
    constructors = [
        "Sky", "Sea", "Cloud", "Ennemy", "EnnemiesHolder", 
        "Particle", "ParticlesHolder", "Coin", "CoinsHolder"
    ]
    
    for c in constructors:
        # Ex: Sky = function() -> var Sky = function()
        # Be careful not to replace inside words
        content = re.sub(r'(?<!var\s)(?<!\.)\b' + c + r'\s*=\s*function', f'var {c} = function', content)

    # Some instances inside functions might be missing vars:
    # sky = new Sky();
    content = re.sub(r'(?<!var\s)(?<!\.)\bsky\s*=\s*new\s+Sky', 'var sky = new Sky', content)
    
    # coinsHolder = new CoinsHolder(20);
    content = re.sub(r'(?<!var\s)(?<!\.)\bcoinsHolder\s*=\s*new\s+CoinsHolder', 'var coinsHolder = new CoinsHolder', content)
    
    # ennemiesHolder = new EnnemiesHolder();
    content = re.sub(r'(?<!var\s)(?<!\.)\bennemiesHolder\s*=\s*new\s+EnnemiesHolder', 'var ennemiesHolder = new EnnemiesHolder', content)

    # particlesHolder = new ParticlesHolder();
    content = re.sub(r'(?<!var\s)(?<!\.)\bparticlesHolder\s*=\s*new\s+ParticlesHolder', 'var particlesHolder = new ParticlesHolder', content)
    
    with open('js/game.js', 'w', encoding='utf-8') as f:
        f.write(content)
        
if __name__ == "__main__":
    main()
