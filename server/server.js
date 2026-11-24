const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_default';

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'carousel.db');
const LEGACY_JSON_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new Database(DB_FILE);

// Création des tables
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    speed INTEGER NOT NULL DEFAULT 3000,
    transition TEXT NOT NULL DEFAULT 'fade',
    saintsEnabled INTEGER NOT NULL DEFAULT 0,
    saintsImageId TEXT NOT NULL DEFAULT '',
    weatherEnabled INTEGER NOT NULL DEFAULT 0,
    weatherCity TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS saints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL,
    day TEXT NOT NULL,
    saint TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT ''
  );
`);

// Ajout des colonnes météo si la table settings existait déjà avant cette mise à jour
try { db.exec(`ALTER TABLE settings ADD COLUMN weatherEnabled INTEGER NOT NULL DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN weatherCity TEXT NOT NULL DEFAULT ''`); } catch {}

db.prepare(`
  INSERT OR IGNORE INTO settings (id, speed, transition, saintsEnabled, saintsImageId, weatherEnabled, weatherCity)
  VALUES (1, 3000, 'fade', 0, '', 0, '')
`).run();

const defaultSaints = [
  { month: '01', day: '01', saint: 'Marie, Mère de Dieu / Jour de l’an', note: 'Solennité mariale' },
  { month: '01', day: '02', saint: 'Saint Basile le Grand et Saint Grégoire de Naziance', note: 'Pères de l’Église' },
  { month: '01', day: '03', saint: 'Sainte Geneviève', note: 'Sainte patronne de Paris' },
  { month: '01', day: '07', saint: 'Saint Raymond de Penyafort', note: 'Dominicain espagnol (XIIIe s.)' },
  { month: '01', day: '13', saint: 'Saint Hilaire de Poitiers', note: 'Docteur de l’Église' },
  { month: '01', day: '17', saint: 'Saint Antoine le Grand', note: 'Père du monachisme désertique' },
  { month: '01', day: '20', saint: 'Saint Sébastien', note: 'Martyr romain' },
  { month: '01', day: '21', saint: 'Sainte Agnès', note: 'Martyre romaine' },
  { month: '01', day: '24', saint: 'Saint François de Sales', note: 'Évêque et docteur de l’Église' },
  { month: '01', day: '25', saint: 'Conversion de saint Paul', note: 'Fête apostolique' },
  { month: '01', day: '28', saint: 'Saint Thomas d’Aquin', note: 'Philosophe et théologien dominicain' },
  { month: '01', day: '31', saint: 'Saint Jean Bosco', note: 'Fondateur des Salésiens' },

  { month: '02', day: '02', saint: 'Présentation du Seigneur (Chandeleur)', note: 'Fête liturgique' },
  { month: '02', day: '03', saint: 'Saint Blaise', note: 'Évêque et martyr' },
  { month: '02', day: '05', saint: 'Sainte Agathe', note: 'Martyre en Sicile' },
  { month: '02', day: '11', saint: 'Notre-Dame de Lourdes', note: 'Apparitions mariales de 1858' },
  { month: '02', day: '14', saint: 'Saint Valentin', note: 'Martyr romain' },
  { month: '02', day: '22', saint: 'Chaire de saint Pierre', note: 'Fête de l’unité de l’Église' },
  { month: '02', day: '24', saint: 'Saint Matthias', note: 'Apôtre' },

  { month: '03', day: '07', saint: 'Sainte Perpétue et Sainte Félicité', note: 'Martyres de Carthage' },
  { month: '03', day: '08', saint: 'Saint Jean de Dieu', note: 'Fondateur des hospitaliers' },
  { month: '03', day: '17', saint: 'Saint Patrick', note: 'Évangélisateur de l’Irlande' },
  { month: '03', day: '19', saint: 'Saint Joseph', note: 'Époux de Marie' },
  { month: '03', day: '25', saint: 'Annonciation du Seigneur', note: 'Solennité' },

  { month: '04', day: '07', saint: 'Saint Jean-Baptiste de la Salle', note: 'Patron des éducateurs chrétiens' },
  { month: '04', day: '11', saint: 'Saint Stanislas', note: 'Évêque et martyr de Cracovie' },
  { month: '04', day: '21', saint: 'Saint Anselme', note: 'Archevêque de Cantorbéry et docteur' },
  { month: '04', day: '23', saint: 'Saint Georges', note: 'Martyr' },
  { month: '04', day: '25', saint: 'Saint Marc', note: 'Évangéliste' },
  { month: '04', day: '29', saint: 'Sainte Catherine de Sienne', note: 'Docteur de l’Église, patronne d’Europe' },
  { month: '04', day: '30', saint: 'Saint Pie V', note: 'Pape' },

  { month: '05', day: '01', saint: 'Saint Joseph artisan', note: 'Fête du travail chrétienne' },
  { month: '05', day: '02', saint: 'Saint Athanase', note: 'Évêque d’Alexandrie et docteur' },
  { month: '05', day: '03', saint: 'Saints Philippe et Jacques', note: 'Apôtres' },
  { month: '05', day: '14', saint: 'Saint Matthias / Sainte Marie-Dominique Mazzarello', note: 'Co-fondatrice des Salésiennes' },
  { month: '05', day: '22', saint: 'Sainte Rita de Cascia', note: 'Religieuse italienne' },
  { month: '05', day: '25', saint: 'Saint Bède le Vénérable', note: 'Moine et historien' },
  { month: '05', day: '26', saint: 'Saint Philippe Néri', note: 'Fondateur de l’Oratoire' },
  { month: '05', day: '27', saint: 'Saint Augustin de Cantorbéry', note: 'Évêque missionnaire' },
  { month: '05', day: '31', saint: 'Visitation de la Vierge Marie', note: 'Fête mariale' },

  { month: '06', day: '01', saint: 'Saint Justin', note: 'Philosophe et martyr' },
  { month: '06', day: '03', saint: 'Saint Charles Lwanga et ses compagnons', note: 'Martyrs de l’Ouganda' },
  { month: '06', day: '05', saint: 'Saint Boniface', note: 'Évêque et martyr, apôtre de Germanie' },
  { month: '06', day: '09', saint: 'Saint Éphrem', note: 'Diacre et docteur de l’Église' },
  { month: '06', day: '11', saint: 'Saint Barnabé', note: 'Apôtre' },
  { month: '06', day: '13', saint: 'Saint Antoine de Padoue', note: 'Franciscain et docteur de l’Église' },
  { month: '06', day: '21', saint: 'Saint Louis de Gonzague', note: 'Religieux jésuite' },
  { month: '06', day: '22', saint: 'Saint Thomas More et Saint John Fisher', note: 'Martyrs anglais' },
  { month: '06', day: '24', saint: 'Nativité de saint Jean-Baptiste', note: 'Solennité' },
  { month: '06', day: '28', saint: 'Saint Irénée de Lyon', note: 'Évêque et martyr' },
  { month: '06', day: '29', saint: 'Saints Pierre et Paul', note: 'Apôtres, solennité' },

  { month: '07', day: '03', saint: 'Saint Thomas', note: 'Apôtre' },
  { month: '07', day: '06', saint: 'Sainte Maria Goretti', note: 'Vierge et martyre' },
  { month: '07', day: '11', saint: 'Saint Benoît de Nursie', note: 'Fondateur du monachisme occidental, patron d’Europe' },
  { month: '07', day: '15', saint: 'Saint Bonaventure', note: 'Franciscain et docteur de l’Église' },
  { month: '07', day: '16', saint: 'Notre-Dame du Mont-Carmel', note: 'Mémoire mariale' },
  { month: '07', day: '22', saint: 'Sainte Marie-Madeleine', note: 'Disciple du Christ' },
  { month: '07', day: '23', saint: 'Sainte Brigitte de Suède', note: 'Patronne d’Europe' },
  { month: '07', day: '25', saint: 'Saint Jacques le Majeur', note: 'Apôtre' },
  { month: '07', day: '26', saint: 'Saints Joachim et Anne', note: 'Parents de la Vierge Marie' },
  { month: '07', day: '29', saint: 'Sainte Marthe, Sainte Marie et Saint Lazare', note: 'Amis de Jésus à Béthanie' },
  { month: '07', day: '30', saint: 'Saint Pierre Chrysologue', note: 'Évêque et docteur de l’Église' },
  { month: '07', day: '31', saint: 'Saint Ignace de Loyola', note: 'Fondateur de la Compagnie de Jésus' },

  { month: '08', day: '01', saint: 'Saint Alphonse de Liguori', note: 'Évêque et docteur de l’Église' },
  { month: '08', day: '04', saint: 'Saint Jean-Marie Vianney (Curé d’Ars)', note: 'Patron des curés' },
  { month: '08', day: '06', saint: 'Transfiguration du Seigneur', note: 'Fête liturgique' },
  { month: '08', day: '08', saint: 'Saint Dominique', note: 'Fondateur des Dominicains' },
  { month: '08', day: '10', saint: 'Saint Laurent', note: 'Diacre et martyr à Rome' },
  { month: '08', day: '11', saint: 'Sainte Claire d’Assise', note: 'Fondatrice des Clarisses' },
  { month: '08', day: '14', saint: 'Saint Maximilien Kolbe', note: 'Franciscain martyr à Auschwitz' },
  { month: '08', day: '15', saint: 'Assomption de la Vierge Marie', note: 'Solennité' },
  { month: '08', day: '20', saint: 'Saint Bernard de Clairvaux', note: 'Abbé cistercien et docteur de l’Église' },
  { month: '08', day: '24', saint: 'Saint Barthélemy', note: 'Apôtre' },
  { month: '08', day: '27', saint: 'Sainte Monique', note: 'Mère de saint Augustin' },
  { month: '08', day: '28', saint: 'Saint Augustin d’Hippone', note: 'Évêque et docteur de l’Église' },
  { month: '08', day: '29', saint: 'Martyre de saint Jean-Baptiste', note: 'Mémoire' },

  { month: '09', day: '03', saint: 'Saint Grégoire le Grand', note: 'Pape et docteur de l’Église' },
  { month: '09', day: '08', saint: 'Nativité de la Vierge Marie', note: 'Fête mariale' },
  { month: '09', day: '13', saint: 'Saint Jean Chrysostome', note: 'Évêque de Constantinople et docteur' },
  { month: '09', day: '14', saint: 'La Croix glorieuse', note: 'Fête liturgique' },
  { month: '09', day: '15', saint: 'Notre-Dame des Douleurs', note: 'Mémoire mariale' },
  { month: '09', day: '21', saint: 'Saint Matthieu', note: 'Apôtre et évangéliste' },
  { month: '09', day: '23', saint: 'Saint Padre Pio (Pie de Pietrelcina)', note: 'Capucin italien' },
  { month: '09', day: '27', saint: 'Saint Vincent de Paul', note: 'Fondateur de la charité organisée' },
  { month: '09', day: '29', saint: 'Saints Michel, Gabriel et Raphaël', note: 'Archanges' },
  { month: '09', day: '30', saint: 'Saint Jérôme', note: 'Traducteur de la Bible et docteur' },

  { month: '10', day: '01', saint: 'Sainte Thérèse de l’Enfant-Jésus (de Lisieux)', note: 'Carmélite et docteur de l’Église' },
  { month: '10', day: '02', saint: 'Saints Anges gardiens', note: 'Mémoire' },
  { month: '10', day: '04', saint: 'Saint François d’Assise', note: 'Fondateur des Franciscains' },
  { month: '10', day: '06', saint: 'Saint Bruno', note: 'Fondateur des Chartreux' },
  { month: '10', day: '07', saint: 'Notre-Dame du Rosaire', note: 'Mémoire mariale' },
  { month: '10', day: '15', saint: 'Sainte Thérèse d’Avila', note: 'Carmélite et docteur de l’Église' },
  { month: '10', day: '18', saint: 'Saint Luc', note: 'Évangéliste' },
  { month: '10', day: '28', saint: 'Saints Simon et Jude', note: 'Apôtres' },

  { month: '11', day: '01', saint: 'Tous les saints (La Toussaint)', note: 'Solennité' },
  { month: '11', day: '02', saint: 'Commémoration des fidèles défunts', note: 'Jour des défunts' },
  { month: '11', day: '04', saint: 'Saint Charles Borromée', note: 'Évêque de Milan' },
  { month: '11', day: '09', saint: 'Dédicace de la basilique du Latran', note: 'Fête liturgique' },
  { month: '11', day: '11', saint: 'Saint Martin de Tours', note: 'Évêque de Tours' },
  { month: '11', day: '17', saint: 'Sainte Élisabeth de Hongrie', note: 'Religieuse franciscaine' },
  { month: '11', day: '21', saint: 'Présentation de la Vierge Marie', note: 'Mémoire mariale' },
  { month: '11', day: '22', saint: 'Sainte Cécile', note: 'Martyre, patronne des musiciens' },
  { month: '11', day: '24', saint: 'Saints André Dũng-Lạc et ses compagnons', note: 'Martyrs du Vietnam' },
  { month: '11', day: '25', saint: 'Sainte Catherine d’Alexandrie', note: 'Vierge et martyre' },
  { month: '11', day: '30', saint: 'Saint André', note: 'Apôtre' },

  { month: '12', day: '03', saint: 'Saint François Xavier', note: 'Jésuite missionnaire' },
  { month: '12', day: '04', saint: 'Saint Jean Damascène / Sainte Barbe', note: 'Docteur de l’Église / Martyre' },
  { month: '12', day: '06', saint: 'Saint Nicolas', note: 'Évêque de Myre' },
  { month: '12', day: '07', saint: 'Saint Ambroise', note: 'Évêque de Milan et docteur de l’Église' },
  { month: '12', day: '08', saint: 'Immaculée Conception de la Vierge Marie', note: 'Solennité' },
  { month: '12', day: '13', saint: 'Sainte Lucie', note: 'Vierge et martyre de Syracuse' },
  { month: '12', day: '14', saint: 'Saint Jean de la Croix', note: 'Carme et docteur de l’Église' },
  { month: '12', day: '25', saint: 'Nativité du Seigneur (Noël)', note: 'Solennité' },
  { month: '12', day: '26', saint: 'Saint Étienne', note: 'Premier martyr chrétien' },
  { month: '12', day: '27', saint: 'Saint Jean', note: 'Apôtre et évangéliste' },
  { month: '12', day: '28', saint: 'Saints Innocents', note: 'Martyrs' },
  { month: '12', day: '31', saint: 'Saint Sylvestre Ier', note: 'Pape' }
];

const saintsCount = db.prepare('SELECT COUNT(*) AS count FROM saints').get().count;
if (saintsCount === 0) {
  const insertSaint = db.prepare('INSERT INTO saints (month, day, saint, note) VALUES (?, ?, ?, ?)');
  const seedTransaction = db.transaction((items) => {
    for (const s of items) {
      insertSaint.run(s.month, s.day, s.saint, s.note);
    }
  });
  seedTransaction(defaultSaints);
}

// Supprime d'éventuels doublons (month, day) avant de créer l'index unique
db.exec(`
  DELETE FROM saints
  WHERE id NOT IN (
    SELECT MIN(id)
    FROM saints
    GROUP BY month, day
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_saints_month_day ON saints (month, day);
`);

// Migration automatique depuis db.json si présent
if (fs.existsSync(LEGACY_JSON_FILE)) {
  try {
    const legacy = JSON.parse(fs.readFileSync(LEGACY_JSON_FILE, 'utf8'));
    if (legacy.settings) {
      db.prepare(`
        UPDATE settings
        SET speed = ?, transition = ?, saintsEnabled = ?, saintsImageId = ?
        WHERE id = 1
      `).run(
        legacy.settings.speed ?? 3000,
        legacy.settings.transition ?? 'fade',
        legacy.settings.saintsEnabled ? 1 : 0,
        legacy.settings.saintsImageId ?? ''
      );
    }
    if (Array.isArray(legacy.images)) {
      const insertImg = db.prepare(`
        INSERT OR IGNORE INTO images (id, title, filename, startDate, endDate)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const img of legacy.images) {
        insertImg.run(img.id, img.title, img.filename, img.startDate, img.endDate);
      }
    }
    fs.renameSync(LEGACY_JSON_FILE, LEGACY_JSON_FILE + '.bak');
  } catch (e) {
    console.error('Erreur migration db.json :', e);
  }
}

const getSettings = () => {
  const row = db.prepare(`
    SELECT speed, transition, saintsEnabled, saintsImageId, weatherEnabled, weatherCity
    FROM settings WHERE id = 1
  `).get();
  return {
    speed: row.speed,
    transition: row.transition,
    saintsEnabled: Boolean(row.saintsEnabled),
    saintsImageId: row.saintsImageId,
    weatherEnabled: Boolean(row.weatherEnabled),
    weatherCity: row.weatherCity || ''
  };
};

// Météo (Open-Meteo + cache 15 min)
const weatherDescriptions = {
  0: { label: 'Ciel dégagé', icon: '☀️' },
  1: { label: 'Globalement dégagé', icon: '🌤️' },
  2: { label: 'Partiellement nuageux', icon: '⛅' },
  3: { label: 'Couvert', icon: '☁️' },
  45: { label: 'Brouillard', icon: '🌫️' },
  48: { label: 'Brouillard givrant', icon: '🌫️' },
  51: { label: 'Bruine légère', icon: '🌦️' },
  53: { label: 'Bruine modérée', icon: '🌦️' },
  55: { label: 'Bruine dense', icon: '🌧️' },
  61: { label: 'Pluie faible', icon: '🌧️' },
  63: { label: 'Pluie modérée', icon: '🌧️' },
  65: { label: 'Pluie forte', icon: '🌧️' },
  71: { label: 'Neige faible', icon: '🌨️' },
  73: { label: 'Neige modérée', icon: '🌨️' },
  75: { label: 'Neige forte', icon: '❄️' },
  80: { label: 'Averses faibles', icon: '🌦️' },
  81: { label: 'Averses modérées', icon: '🌧️' },
  82: { label: 'Averses violentes', icon: '⛈️' },
  95: { label: 'Orage', icon: '⛈️' },
  96: { label: 'Orage avec grêle', icon: '⛈️' },
  99: { label: 'Orage violent avec grêle', icon: '⛈️' }
};

let weatherCache = { city: '', fetchedAt: 0, data: null };

async function fetchWeatherForCity(city) {
  const cleanCity = city.trim();
  if (!cleanCity) return null;

  const now = Date.now();
  if (
    weatherCache.data &&
    weatherCache.city.toLowerCase() === cleanCity.toLowerCase() &&
    now - weatherCache.fetchedAt < 15 * 60 * 1000
  ) {
    return weatherCache.data;
  }

  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=fr&format=json`;
  const geoRes = await fetch(geoUrl);
  if (!geoRes.ok) return null;
  const geoJson = await geoRes.json();
  const place = geoJson.results && geoJson.results[0];
  if (!place) return null;

  const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`;
  const meteoRes = await fetch(meteoUrl);
  if (!meteoRes.ok) return null;
  const meteoJson = await meteoRes.json();

  const code = meteoJson.current?.weather_code ?? 0;
  const info = weatherDescriptions[code] || { label: 'Conditions variables', icon: '🌡️' };

  // Extraction des 2 prochains jours (indices 1 et 2 du tableau daily)
  const forecast = [];
  if (meteoJson.daily && Array.isArray(meteoJson.daily.time)) {
    for (let i = 1; i <= 2 && i < meteoJson.daily.time.length; i++) {
      const dayCode = meteoJson.daily.weather_code?.[i] ?? 0;
      const dayInfo = weatherDescriptions[dayCode] || { label: 'Variable', icon: '🌡️' };
      const dateObj = new Date(meteoJson.daily.time[i] + 'T12:00:00');
      const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });

      forecast.push({
        date: meteoJson.daily.time[i],
        dayLabel: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        icon: dayInfo.icon,
        condition: dayInfo.label,
        tempMin: Math.round(meteoJson.daily.temperature_2m_min[i]),
        tempMax: Math.round(meteoJson.daily.temperature_2m_max[i]),
        precipitationProb: meteoJson.daily.precipitation_probability_max?.[i] ?? 0
      });
    }
  }

  const result = {
    city: place.name,
    region: place.admin1 || place.country || '',
    temperature: Math.round(meteoJson.current.temperature_2m),
    apparentTemperature: Math.round(meteoJson.current.apparent_temperature),
    humidity: meteoJson.current.relative_humidity_2m,
    windSpeed: Math.round(meteoJson.current.wind_speed_10m),
    tempMin: Math.round(meteoJson.daily.temperature_2m_min[0]),
    tempMax: Math.round(meteoJson.daily.temperature_2m_max[0]),
    precipitationProb: meteoJson.daily.precipitation_probability_max?.[0] ?? 0,
    condition: info.label,
    icon: info.icon,
    forecast
  };

  weatherCache = { city: cleanCity, fetchedAt: now, data: result };
  return result;
}

app.use(cors());
app.use(express.json());

// Configuration Multer (Upload d'images)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Middleware d'authentification
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token manquant' });

  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Token invalide ou expiré' });
  }
};

// --- ROUTES API ---

// 1. Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token });
  }
  res.status(401).json({ error: 'Identifiants incorrects' });
});

// Accès aux images uploadées
app.use('/uploads', (req, res, next) => {
  const token = req.query.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(403).send('Accès refusé');
  }
}, express.static(UPLOADS_DIR));

// 2. Récupérer toutes les images (Admin)
app.get('/api/images', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT id, title, filename, startDate, endDate FROM images').all();
  res.json(rows);
});

// 3. Récupérer uniquement les images actives aujourd'hui (+ texte du saint du jour + slide météo)
app.get('/api/images/active', authMiddleware, async (req, res) => {
  const settings = getSettings();
  const allImages = db.prepare('SELECT id, title, filename, startDate, endDate FROM images').all();
  const now = new Date();

  const saintsEnabled = Boolean(settings.saintsEnabled && settings.saintsImageId);
  const saintsImageId = saintsEnabled ? settings.saintsImageId : null;

  let todaySaintText = '';
  if (saintsEnabled) {
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayRow = db
      .prepare('SELECT saint FROM saints WHERE month = ? AND day = ?')
      .get(month, day);

    todaySaintText = todayRow ? todayRow.saint : '';
  }

  const active = allImages
    .filter(img => {
      const start = new Date(img.startDate);
      const end = new Date(img.endDate);
      end.setHours(23, 59, 59, 999);
      return now >= start && now <= end;
    })
    .map(img => ({
      ...img,
      type: 'image',
      saintsText: saintsEnabled && img.id === saintsImageId ? todaySaintText : ''
    }));

  if (saintsEnabled && !active.some(img => img.id === saintsImageId)) {
    const saintsImg = allImages.find(img => img.id === saintsImageId);
    if (saintsImg) {
      active.push({
        ...saintsImg,
        type: 'image',
        saintsText: todaySaintText
      });
    }
  }

  if (settings.weatherEnabled && settings.weatherCity) {
    try {
      const weather = await fetchWeatherForCity(settings.weatherCity);
      if (weather) {
        active.push({
          id: 'weather-slide',
          type: 'weather',
          title: `Météo - ${weather.city}`,
          weather
        });
      }
    } catch (err) {
      console.error('Erreur récupération météo :', err);
    }
  }

  res.json(active);
});

// 4. Uploader une image avec plage de dates
app.post('/api/images', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier envoyé' });
  const { startDate, endDate, title } = req.body;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Dates obligatoires' });

  const newImage = {
    id: Date.now().toString(),
    title: title || req.file.originalname,
    filename: req.file.filename,
    startDate,
    endDate
  };

  db.prepare(`
    INSERT INTO images (id, title, filename, startDate, endDate)
    VALUES (@id, @title, @filename, @startDate, @endDate)
  `).run(newImage);

  res.json(newImage);
});

// 5. Modifier les dates / titre d'une image existante
app.put('/api/images/:id', authMiddleware, (req, res) => {
  const { startDate, endDate, title } = req.body;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Dates obligatoires' });

  const existing = db.prepare('SELECT id, title, filename, startDate, endDate FROM images WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Introuvable' });

  const updatedTitle = title !== undefined && String(title).trim() !== '' ? String(title).trim() : existing.title;
  db.prepare('UPDATE images SET title = ?, startDate = ?, endDate = ? WHERE id = ?')
    .run(updatedTitle, startDate, endDate, req.params.id);

  res.json({ ...existing, title: updatedTitle, startDate, endDate });
});

// 6. Supprimer une image
app.delete('/api/images/:id', authMiddleware, (req, res) => {
  const existing = db.prepare('SELECT id, filename FROM images WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Introuvable' });

  const filePath = path.join(UPLOADS_DIR, existing.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM images WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// 7. Paramètres du carrousel
app.get('/api/settings', authMiddleware, (req, res) => {
  res.json(getSettings());
});

app.put('/api/settings', authMiddleware, (req, res) => {
  const current = getSettings();
  const next = {
    speed: req.body.speed !== undefined ? Number(req.body.speed) : current.speed,
    transition: req.body.transition !== undefined ? String(req.body.transition) : current.transition,
    saintsEnabled: req.body.saintsEnabled !== undefined ? Boolean(req.body.saintsEnabled) : current.saintsEnabled,
    saintsImageId: req.body.saintsImageId !== undefined ? String(req.body.saintsImageId) : current.saintsImageId,
    weatherEnabled: req.body.weatherEnabled !== undefined ? Boolean(req.body.weatherEnabled) : current.weatherEnabled,
    weatherCity: req.body.weatherCity !== undefined ? String(req.body.weatherCity).trim() : current.weatherCity
  };

  db.prepare(`
    UPDATE settings
    SET speed = ?, transition = ?, saintsEnabled = ?, saintsImageId = ?, weatherEnabled = ?, weatherCity = ?
    WHERE id = 1
  `).run(
    next.speed,
    next.transition,
    next.saintsEnabled ? 1 : 0,
    next.saintsImageId,
    next.weatherEnabled ? 1 : 0,
    next.weatherCity
  );

  res.json(next);
});

// 8. CRUD Table des saints chrétiens (unicité garantie sur month + day)
app.get('/api/saints', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT id, month, day, saint, note FROM saints ORDER BY month ASC, day ASC, id ASC').all();
  res.json(rows);
});

app.post('/api/saints', authMiddleware, (req, res) => {
  const month = String(req.body.month || '').padStart(2, '0');
  const day = String(req.body.day || '').padStart(2, '0');
  const saint = String(req.body.saint || '').trim();
  const note = String(req.body.note || '').trim();

  if (!saint || month.length !== 2 || day.length !== 2) {
    return res.status(400).json({ error: 'Date et nom du saint obligatoires' });
  }

  const duplicate = db.prepare('SELECT id FROM saints WHERE month = ? AND day = ?').get(month, day);
  if (duplicate) {
    return res.status(409).json({ error: 'Un saint est déjà enregistré pour cette date.' });
  }

  try {
    const info = db.prepare('INSERT INTO saints (month, day, saint, note) VALUES (?, ?, ?, ?)')
      .run(month, day, saint, note);

    const created = db.prepare('SELECT id, month, day, saint, note FROM saints WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Un saint est déjà enregistré pour cette date.' });
    }
    res.status(500).json({ error: 'Erreur serveur lors de l’ajout.' });
  }
});

app.put('/api/saints/:id', authMiddleware, (req, res) => {
  const existing = db.prepare('SELECT id FROM saints WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Saint introuvable' });

  const month = String(req.body.month || '').padStart(2, '0');
  const day = String(req.body.day || '').padStart(2, '0');
  const saint = String(req.body.saint || '').trim();
  const note = String(req.body.note || '').trim();

  if (!saint || month.length !== 2 || day.length !== 2) {
    return res.status(400).json({ error: 'Date et nom du saint obligatoires' });
  }

  const duplicate = db.prepare('SELECT id FROM saints WHERE month = ? AND day = ? AND id != ?').get(month, day, req.params.id);
  if (duplicate) {
    return res.status(409).json({ error: 'Un autre saint existe déjà pour cette date.' });
  }

  try {
    db.prepare('UPDATE saints SET month = ?, day = ?, saint = ?, note = ? WHERE id = ?')
      .run(month, day, saint, note, req.params.id);

    const updated = db.prepare('SELECT id, month, day, saint, note FROM saints WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Un autre saint existe déjà pour cette date.' });
    }
    res.status(500).json({ error: 'Erreur serveur lors de la modification.' });
  }
});

app.delete('/api/saints/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM saints WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Saint introuvable' });
  res.json({ success: true });
});

// Servir l'application Vue.js pour toutes les autres routes
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
