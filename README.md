# Sécurité
Il faut commencer par créer le fichier .env
```
cp .env_exemple .env
```

Pour créer une nouvelle clé secret JWT_SECRET à renseigner dans .env
```
openssl rand -hex 32
```

Changer également le user et le password dans .env

# Créer et démarer le conteneur
```
docker compose up -d --build
```

