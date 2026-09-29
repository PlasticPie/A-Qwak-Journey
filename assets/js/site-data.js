/* MoonQwak — site registry.
   The single source of truth for navigation: parts, chapters, levels, topics and the
   architecture nodes each chapter lives in. Adding a chapter = add an entry here, create
   the HTML file from TEMPLATE.html, run `node tools/build-index.mjs`. */
(function () {
  "use strict";

  var site = {
    name: "MoonQwak",
    author: "MoonQwak",
    // Fill these in once; they appear in the footer and on the home page.
    links: {
      github: "",   // e.g. "https://github.com/your-handle"
      linkedin: "https://www.linkedin.com/in/matthieu-bastianel-80656b7b/",
      contact: ""   // shown as selectable text, e.g. "you@example.com"
    },
    tagline: {
      en: "MMO architecture field notes",
      fr: "Carnets d'architecture MMO"
    }
  };

  var levels = {
    1: { en: "Foundation", fr: "Fondation" },
    2: { en: "Core", fr: "Cœur" },
    3: { en: "Advanced", fr: "Avancé" }
  };

  var categories = {
    method: { en: "Method", fr: "Méthode", den: "How to approach the work: order, measurement, trade-offs.", dfr: "Comment aborder le travail : ordre, mesure, compromis." },
    net: { en: "Networking", fr: "Réseau", den: "Transport, framing, encoding and message flows.", dfr: "Transport, trames, encodage et flux de messages." },
    sec: { en: "Security", fr: "Sécurité", den: "Trust boundaries, encryption, abuse and integrity.", dfr: "Frontières de confiance, chiffrement, abus et intégrité." },
    sim: { en: "Simulation", fr: "Simulation", den: "The authoritative world: ticks, physics, entities.", dfr: "Le monde autoritaire : ticks, physique, entités." },
    conc: { en: "Concurrency", fr: "Concurrence", den: "Threads, locks, publication and ordering.", dfr: "Threads, verrous, publication et ordonnancement." },
    perf: { en: "Performance", fr: "Performance", den: "CPU, allocations, bandwidth and what they cost.", dfr: "CPU, allocations, bande passante et leur coût." },
    repl: { en: "Replication", fr: "Réplication", den: "What each player is told, when, and in how many bytes.", dfr: "Ce qu'on dit à chaque joueur, quand, et en combien d'octets." },
    client: { en: "Client", fr: "Client", den: "Making the game feel right on the player's machine.", dfr: "Rendre le jeu agréable sur la machine du joueur." },
    data: { en: "Persistence", fr: "Persistance", den: "Databases, durability and data integrity.", dfr: "Bases de données, durabilité et intégrité des données." },
    fleet: { en: "Fleet & scaling", fr: "Parc & échelle", den: "Many servers and machines, placed and sized automatically.", dfr: "Plusieurs serveurs et machines, placés et dimensionnés automatiquement." },
    ship: { en: "Distribution", fr: "Distribution", den: "Publishing builds, updating and launching the game.", dfr: "Publier des builds, mettre à jour et lancer le jeu." },
    test: { en: "Testing", fr: "Tests", den: "Tests and load benches that catch real failures.", dfr: "Tests et bancs de charge qui attrapent de vraies pannes." },
    obs: { en: "Observability", fr: "Observabilité", den: "Measuring the running system without lying to yourself.", dfr: "Mesurer le système en marche sans se mentir." },
    tools: { en: "Tooling", fr: "Outillage", den: "Editors, hot reload and developer tools.", dfr: "Éditeurs, rechargement à chaud et outils de développement." }
  };

  // Architecture nodes, used by the "where this lives" mini-map on every chapter.
  var nodes = {
    launcher: { en: "Launcher", fr: "Launcher" },
    update: { en: "Update server", fr: "Serveur de MAJ" },
    client: { en: "Game client", fr: "Client de jeu" },
    gateway: { en: "Gateway", fr: "Gateway" },
    gs: { en: "Game servers", fr: "Serveurs de jeu" },
    db: { en: "Database", fr: "Base de données" },
    agent: { en: "Node agents", fr: "Agents de machine" },
    sim: { en: "World sim", fr: "Simu du monde" },
    monitor: { en: "Monitor", fr: "Monitor" }
  };

  var parts = [
    { id: "orientation", n: 0, en: "Orientation", fr: "Orientation",
      wen: "What an MMO backend is made of, and where to start.",
      wfr: "De quoi est fait un backend de MMO, et par où commencer.",
      chapters: ["start-here", "big-picture"] },
    { id: "wire", n: 1, en: "The wire", fr: "Le fil",
      wen: "Bytes between two machines: transport, framing, encoding, encryption, and keeping both ends in agreement.",
      wfr: "Des octets entre deux machines : transport, trames, encodage, chiffrement, et garder les deux bouts d'accord.",
      chapters: ["transport", "packet-format", "encoding", "encryption", "receiving", "protocol-testing"] },
    { id: "front-door", n: 2, en: "The front door", fr: "La porte d'entrée",
      wen: "Who you are, where you play, and how you move from one server to another.",
      wfr: "Qui vous êtes, où vous jouez, et comment on passe d'un serveur à l'autre.",
      chapters: ["gateway", "login-flow", "handover"] },
    { id: "simulation", n: 3, en: "The simulation", fr: "La simulation",
      wen: "One authoritative world, advanced in fixed steps, that never waits for anything.",
      wfr: "Un monde autoritaire, avancé par pas fixes, qui n'attend jamais rien.",
      chapters: ["tick-loop", "tick-anatomy", "threading", "no-db-in-tick", "physics", "entities"] },
    { id: "replication", n: 4, en: "Replication", fr: "La réplication",
      wen: "Deciding what each player needs to know, and paying for it in bytes.",
      wfr: "Décider ce que chaque joueur doit savoir, et le payer en octets.",
      chapters: ["aoi", "snapshots", "serialize-once", "deltas", "freshness-budget", "bandwidth"] },
    { id: "client", n: 5, en: "The client", fr: "Le client",
      wen: "Turning 25 snapshots a second into smooth motion and responsive controls.",
      wfr: "Transformer 25 snapshots par seconde en mouvement fluide et en contrôles réactifs.",
      chapters: ["client-architecture", "interpolation", "prediction", "client-rendering"] },
    { id: "persistence", n: 6, en: "Persistence & integrity", fr: "Persistance & intégrité",
      wen: "RAM is the authority, the database is the journal, and nothing may ever duplicate.",
      wfr: "La RAM fait autorité, la base est le journal, et rien ne doit jamais se dupliquer.",
      chapters: ["persistence", "transactions", "data-and-catalogs"] },
    { id: "fleet", n: 7, en: "Scaling out", fr: "Passer à l'échelle",
      wen: "Many maps, many processes, many machines, placed and sized automatically.",
      wfr: "Beaucoup de cartes, de processus et de machines, placés et dimensionnés automatiquement.",
      chapters: ["map-hosting", "capacity", "node-agents"] },
    { id: "shipping", n: 8, en: "Shipping builds", fr: "Livrer le jeu",
      wen: "Getting exactly the right bytes onto players' machines, safely and incrementally.",
      wfr: "Poser exactement les bons octets sur la machine des joueurs, sûrement et par incréments.",
      chapters: ["updater", "launcher"] },
    { id: "world", n: 9, en: "The living world", fr: "Le monde vivant",
      wen: "A second simulation that runs by the hour, far from the game loop.",
      wfr: "Une seconde simulation qui tourne à l'heure, loin de la boucle de jeu.",
      chapters: ["world-sim"] },
    { id: "measure", n: 10, en: "Measure & harden", fr: "Mesurer & durcir",
      wen: "Instruments, load tests, and the rules that stopped bugs from coming back.",
      wfr: "Des instruments, des bancs de charge, et les règles qui ont empêché les bugs de revenir.",
      chapters: ["observability", "allocations", "load-testing", "bench-journal", "principles", "open-problems"] }
  ];

  var chapters = {
    "start-here": { level: 1, cats: ["method"], nodes: [], req: [],
      en: { t: "Where to start", d: "The order I would build an MMO backend in today, what to postpone, and how to tell that a stage is finished." },
      fr: { t: "Par où commencer", d: "L'ordre dans lequel je construirais un backend de MMO aujourd'hui, ce qu'il faut repousser, et comment savoir qu'une étape est finie." } },
    "big-picture": { level: 1, cats: ["method", "net", "fleet"], nodes: ["launcher", "update", "client", "gateway", "gs", "db", "agent", "sim", "monitor"], req: ["start-here"],
      en: { t: "The system at a glance", d: "Every process in the architecture, what it owns, and the path a player's packets take through it." },
      fr: { t: "Le système d'un coup d'œil", d: "Chaque processus de l'architecture, ce qu'il possède, et le chemin que prennent les paquets d'un joueur." } },

    "transport": { level: 1, cats: ["net"], nodes: ["client", "gateway", "gs"], req: ["big-picture"],
      en: { t: "Choosing a transport", d: "TCP, raw UDP or reliable UDP: delivery guarantees, head-of-line blocking, packet size limits, and why LiteNetLib." },
      fr: { t: "Choisir un transport", d: "TCP, UDP brut ou UDP fiable : garanties de livraison, blocage en tête de file, taille des paquets, et pourquoi LiteNetLib." } },
    "packet-format": { level: 1, cats: ["net", "test"], nodes: ["client", "gateway", "gs"], req: ["transport"],
      en: { t: "A binary protocol of your own", d: "Framing, positional payloads, and the discipline that keeps a hand-written serializer honest." },
      fr: { t: "Un protocole binaire à soi", d: "Les trames, les charges utiles positionnelles, et la discipline qui garde un sérialiseur écrit à la main honnête." } },
    "encoding": { level: 2, cats: ["net", "perf"], nodes: ["client", "gs"], req: ["packet-format"],
      en: { t: "Squeezing bytes", d: "Variable-length integers, zig-zag, quantization, and the size cliffs that quietly decide your bandwidth." },
      fr: { t: "Économiser les octets", d: "Les entiers de taille variable, le zig-zag, la quantification, et les falaises de taille qui décident en silence de la bande passante." } },
    "encryption": { level: 2, cats: ["net", "sec"], nodes: ["client", "gateway", "gs"], req: ["transport"],
      en: { t: "Encrypting the session", d: "An X25519 key exchange, HKDF, one AES-GCM key per direction, and a clear list of what it does not protect." },
      fr: { t: "Chiffrer la session", d: "Un échange de clés X25519, HKDF, une clé AES-GCM par sens, et la liste claire de ce que ça ne protège pas." } },
    "receiving": { level: 2, cats: ["net", "sec", "conc"], nodes: ["gateway", "gs"], req: ["packet-format"],
      en: { t: "Receiving safely", d: "Parsing, dispatching, exception boundaries, rate limits and peer caps: the edge where untrusted bytes come in." },
      fr: { t: "Recevoir sans tomber", d: "Parser, distribuer, frontières d'exceptions, limites de débit et plafonds de pairs : la lisière où entrent des octets non fiables." } },
    "protocol-testing": { level: 2, cats: ["net", "test"], nodes: ["client", "gateway", "gs"], req: ["packet-format", "encoding"],
      en: { t: "Keeping both ends in agreement", d: "A protocol version gate, byte-exact round-trip tests, golden bytes, shared codecs, and codes instead of words." },
      fr: { t: "Garder les deux bouts d'accord", d: "Une porte de version, des tests aller-retour à l'octet près, des octets d'or, des codecs partagés, et des codes plutôt que des mots." } },

    "gateway": { level: 1, cats: ["net", "sec", "fleet"], nodes: ["gateway", "gs", "db"], req: ["big-picture", "encryption"],
      en: { t: "The gateway", d: "Why a separate front door, what it owns, how game servers prove who they are, and why it carries the social layer." },
      fr: { t: "La gateway", d: "Pourquoi une porte d'entrée séparée, ce qu'elle possède, comment les serveurs de jeu prouvent qui ils sont, et pourquoi elle porte le social." } },
    "login-flow": { level: 1, cats: ["net", "sec"], nodes: ["client", "gateway", "gs", "db"], req: ["gateway"],
      en: { t: "From login to first snapshot", d: "Password hashing, session tokens, game tokens, and an arrival phase that finally defines what 'arrived' means." },
      fr: { t: "Du login au premier snapshot", d: "Hachage des mots de passe, jetons de session, jetons de jeu, et une phase d'arrivée qui définit enfin « arrivé »." } },
    "handover": { level: 2, cats: ["net", "fleet", "conc"], nodes: ["client", "gateway", "gs"], req: ["login-flow"],
      en: { t: "Moving between servers", d: "Map transitions, reconnecting to another process, session takeover, and the ordering that keeps a group together." },
      fr: { t: "Passer d'un serveur à l'autre", d: "Transitions de carte, reconnexion vers un autre processus, reprise de session, et l'ordre qui garde un groupe uni." } },

    "tick-loop": { level: 1, cats: ["sim", "perf", "conc"], nodes: ["gs"], req: ["big-picture"],
      en: { t: "The heartbeat", d: "A fixed-rate loop that neither drifts nor spirals, and three Windows timer traps that each quietly stole ticks." },
      fr: { t: "Le battement de cœur", d: "Une boucle à cadence fixe qui ne dérive ni ne s'emballe, et trois pièges de minuterie Windows qui ont chacun volé des ticks en silence." } },
    "tick-anatomy": { level: 2, cats: ["sim", "perf"], nodes: ["gs"], req: ["tick-loop"],
      en: { t: "Anatomy of a tick", d: "The phases of one 40 ms world step, in order, and why each one sits exactly where it does." },
      fr: { t: "Anatomie d'un tick", d: "Les phases d'un pas de monde de 40 ms, dans l'ordre, et pourquoi chacune est exactement à sa place." } },
    "threading": { level: 3, cats: ["conc", "perf", "sim"], nodes: ["gs"], req: ["tick-anatomy"],
      en: { t: "Threads without tears", d: "Maps as islands, deferred mutation, immutable publication, and dedicated workers instead of the thread pool." },
      fr: { t: "Des threads sans larmes", d: "Les cartes comme des îles, la mutation différée, la publication immuable, et des ouvriers dédiés plutôt que le ThreadPool." } },
    "no-db-in-tick": { level: 2, cats: ["sim", "data", "conc"], nodes: ["gs", "db"], req: ["tick-anatomy"],
      en: { t: "The tick never waits", d: "No database call inside the loop, ever: a guard that watches for it, and three ways to do without." },
      fr: { t: "Le tick n'attend jamais", d: "Aucun appel à la base dans la boucle, jamais : un garde qui la surveille, et trois façons de s'en passer." } },
    "physics": { level: 3, cats: ["sim", "perf"], nodes: ["gs"], req: ["tick-anatomy"],
      en: { t: "Physics at MMO scale", d: "One Box2D world per map, collision filters, bullets without bodies, and the eightfold shape cut that fixed the broad-phase." },
      fr: { t: "La physique à l'échelle d'un MMO", d: "Un monde Box2D par carte, les filtres de collision, des balles sans corps, et la division par huit des formes qui a réparé la broad-phase." } },
    "entities": { level: 2, cats: ["sim", "net"], nodes: ["gs"], req: ["tick-anatomy"],
      en: { t: "Entities, ids and membership", d: "How objects join a map, tick, get a network id, and act through composable behaviours." },
      fr: { t: "Entités, identifiants et appartenance", d: "Comment les objets rejoignent une carte, tickent, reçoivent un identifiant réseau et agissent par comportements composables." } },

    "aoi": { level: 2, cats: ["repl", "perf", "conc"], nodes: ["gs"], req: ["tick-anatomy"],
      en: { t: "Area of interest", d: "A flat grid instead of a quadtree, radius queries, cell sizing, and an index rebuilt and published every tick." },
      fr: { t: "La zone d'intérêt", d: "Une grille plate plutôt qu'un quadtree, des requêtes par rayon, le dimensionnement des cellules, et un index reconstruit et publié à chaque tick." } },
    "snapshots": { level: 2, cats: ["repl", "net"], nodes: ["gs", "client"], req: ["aoi", "packet-format"],
      en: { t: "Snapshots: state and events", d: "What a snapshot means, why absence stopped meaning 'gone', and how bullets, missiles and debris each live differently." },
      fr: { t: "Snapshots : état et événements", d: "Ce que veut dire un snapshot, pourquoi l'absence a cessé de vouloir dire « parti », et comment balles, missiles et débris vivent chacun à leur façon." } },
    "serialize-once": { level: 3, cats: ["repl", "perf", "conc"], nodes: ["gs"], req: ["snapshots", "threading"],
      en: { t: "Serialize once, copy many", d: "Turning O(players × objects) serialization into O(objects), and the data race it hid until 780 players." },
      fr: { t: "Sérialiser une fois, copier souvent", d: "Passer d'une sérialisation en O(joueurs × objets) à O(objets), et la course de données qu'elle a cachée jusqu'à 780 joueurs." } },
    "deltas": { level: 3, cats: ["repl", "net"], nodes: ["gs", "client"], req: ["snapshots"],
      en: { t: "Deltas that survive loss", d: "Dirty bits, baselines, and why a global delta broke the moment each viewer started receiving a different stream." },
      fr: { t: "Des deltas qui survivent aux pertes", d: "Bits sales, références, et pourquoi un delta global a cassé dès que chaque spectateur a reçu un flux différent." } },
    "freshness-budget": { level: 3, cats: ["repl", "perf"], nodes: ["gs"], req: ["snapshots", "deltas"],
      en: { t: "The freshness budget", d: "Bounding the per-player cost of a crowd with three cadence rings, a heartbeat and a histogram instead of a sort." },
      fr: { t: "Le budget de fraîcheur", d: "Borner le coût par joueur d'une foule avec trois anneaux de cadence, un battement et un histogramme plutôt qu'un tri." } },
    "bandwidth": { level: 2, cats: ["repl", "net", "perf"], nodes: ["gs", "client"], req: ["encoding", "freshness-budget"],
      en: { t: "Bandwidth accounting", d: "Where every byte of a snapshot goes, the arithmetic that predicts megabytes per second, and the MTU wall." },
      fr: { t: "La comptabilité de la bande passante", d: "Où va chaque octet d'un snapshot, l'arithmétique qui prédit les mégaoctets par seconde, et le mur du MTU." } },

    "client-architecture": { level: 1, cats: ["client", "net"], nodes: ["client"], req: ["snapshots"],
      en: { t: "The client's network layer", d: "Main-thread marshalling, keeping only the newest snapshot, discovering unknown objects, and loading screens that mean something." },
      fr: { t: "La couche réseau du client", d: "Le passage au thread principal, ne garder que le dernier snapshot, découvrir les objets inconnus, et des écrans de chargement qui veulent dire quelque chose." } },
    "interpolation": { level: 2, cats: ["client", "repl"], nodes: ["client"], req: ["client-architecture"],
      en: { t: "Smoothing remote objects", d: "Interpolation, damped extrapolation, render buffers in tick space, and dead-zones against micro-corrections." },
      fr: { t: "Lisser les objets distants", d: "Interpolation, extrapolation amortie, tampons de rendu en espace de ticks, et zones mortes contre les micro-corrections." } },
    "prediction": { level: 2, cats: ["client"], nodes: ["client", "gs"], req: ["interpolation"],
      en: { t: "Prediction and reconciliation", d: "Moving your own character instantly, and correcting it against the server without visible snaps." },
      fr: { t: "Prédiction et réconciliation", d: "Déplacer son propre personnage instantanément, et le corriger contre le serveur sans à-coup visible." } },
    "client-rendering": { level: 2, cats: ["client", "perf"], nodes: ["client"], req: ["client-architecture"],
      en: { t: "Rendering thousands of objects", d: "ECS for bullets, one mesh for eight hundred debris, and the per-instance traps that only show under load." },
      fr: { t: "Afficher des milliers d'objets", d: "L'ECS pour les balles, une seule maille pour huit cents débris, et les pièges par instance qui n'apparaissent qu'en charge." } },

    "persistence": { level: 2, cats: ["data"], nodes: ["gs", "db"], req: ["no-db-in-tick"],
      en: { t: "RAM is the authority", d: "What may live in memory until later, what must be written now, and the one rule that tells them apart." },
      fr: { t: "La RAM fait autorité", d: "Ce qui peut vivre en mémoire jusqu'à plus tard, ce qui doit être écrit tout de suite, et la règle qui les sépare." } },
    "transactions": { level: 3, cats: ["data", "conc", "sec"], nodes: ["gs", "db"], req: ["persistence"],
      en: { t: "Moving goods without duplicating them", d: "Escrow in the same write, locks ordered by id, re-reading under the lock, all or nothing." },
      fr: { t: "Déplacer des biens sans les dupliquer", d: "Séquestre dans la même écriture, verrous ordonnés par identifiant, relecture sous le verrou, tout ou rien." } },
    "data-and-catalogs": { level: 2, cats: ["data", "tools"], nodes: ["gs", "db", "client"], req: ["persistence"],
      en: { t: "Schema, seeding and live catalogs", d: "Migrations, a seed lock shared by several processes, and game data you can change without restarting anything." },
      fr: { t: "Schéma, amorçage et catalogues à chaud", d: "Les migrations, un verrou d'amorçage partagé par plusieurs processus, et des données de jeu modifiables sans rien redémarrer." } },

    "map-hosting": { level: 3, cats: ["fleet", "conc"], nodes: ["gateway", "gs", "db"], req: ["handover", "no-db-in-tick"],
      en: { t: "Hosting maps on demand", d: "Assigning a map to exactly one server, waiting for reinforcements, and living under a hard ceiling of physics worlds." },
      fr: { t: "Héberger les cartes à la demande", d: "Confier une carte à exactement un serveur, attendre les renforts, et vivre sous un plafond dur de mondes physiques." } },
    "capacity": { level: 3, cats: ["fleet"], nodes: ["gateway", "db", "agent"], req: ["map-hosting"],
      en: { t: "The capacity controller", d: "A desired server count per world, rules to grow and shrink, placement scoring, draining and pardons." },
      fr: { t: "Le contrôleur de capacité", d: "Un nombre de serveurs désiré par monde, des règles pour monter et descendre, un score de placement, des retraits et des grâces." } },
    "node-agents": { level: 3, cats: ["fleet", "conc"], nodes: ["agent", "db", "gs"], req: ["capacity"],
      en: { t: "Node agents", d: "One reconciler per machine: claiming work through the database, sizing to the hardware, and retiring empty servers." },
      fr: { t: "Les agents de machine", d: "Un réconciliateur par machine : prendre du travail via la base, se dimensionner sur le matériel, et retirer les serveurs vides." } },

    "updater": { level: 2, cats: ["ship", "sec"], nodes: ["update", "launcher"], req: ["big-picture"],
      en: { t: "Content-addressed updates", d: "Manifests of hashes, one shared object store, a pointer written last, and an update server with no logic at all." },
      fr: { t: "Des mises à jour adressées par contenu", d: "Des manifestes de hachages, un magasin d'objets partagé, un pointeur écrit en dernier, et un serveur de mise à jour sans aucune logique." } },
    "launcher": { level: 2, cats: ["ship", "sec"], nodes: ["launcher", "update", "client"], req: ["updater"],
      en: { t: "The launcher", d: "Planning, verifying and applying an update atomically, and replacing yourself while you are running." },
      fr: { t: "Le launcher", d: "Planifier, vérifier et appliquer une mise à jour de façon atomique, et se remplacer soi-même en cours d'exécution." } },

    "world-sim": { level: 2, cats: ["sim", "data"], nodes: ["sim", "db", "gs"], req: ["persistence"],
      en: { t: "A simulation beside the simulation", d: "An hourly world tick in its own process: its own clock, a replayable seed, a pipeline of steps, and a ledger of facts." },
      fr: { t: "Une simulation à côté de la simulation", d: "Un tick du monde à l'heure dans son propre processus : sa propre horloge, une graine rejouable, un pipeline d'étapes et un registre de faits." } },

    "observability": { level: 2, cats: ["obs", "perf"], nodes: ["gs", "monitor"], req: ["tick-anatomy"],
      en: { t: "Instruments that tell the truth", d: "Wall time versus CPU time, periodic photos versus thresholds, and a monitor built to be pasted into a bug report." },
      fr: { t: "Des instruments qui disent vrai", d: "Temps mural contre temps CPU, photos périodiques contre seuils, et un moniteur conçu pour être collé dans un rapport de bug." } },
    "allocations": { level: 2, cats: ["perf"], nodes: ["gs", "client"], req: ["observability"],
      en: { t: "Allocation discipline", d: "In a tick, don't build: fill. Pools, ownership contracts, and the GC settings for a 25 Hz server." },
      fr: { t: "La discipline des allocations", d: "Dans un tick, on ne construit pas : on remplit. Pools, contrats de propriété, et réglages du GC pour un serveur à 25 Hz." } },
    "load-testing": { level: 2, cats: ["test", "perf", "obs"], nodes: ["client", "gateway", "gs"], req: ["observability"],
      en: { t: "Load testing an MMO", d: "Bots that are real clients, a bench that doesn't fabricate its own failures, and measuring the server rather than the machine." },
      fr: { t: "Tester la charge d'un MMO", d: "Des bots qui sont de vrais clients, un banc qui ne fabrique pas ses propres pannes, et mesurer le serveur plutôt que la machine." } },
    "bench-journal": { level: 2, cats: ["perf", "obs", "method"], nodes: ["gs", "monitor"], req: ["load-testing"],
      en: { t: "The bench journal", d: "Load tests from 100 to 800 players on a single map: what each one showed, what changed, and what it cost to find out." },
      fr: { t: "Le journal des bancs d'essai", d: "Des bancs de charge de 100 à 800 joueurs sur une seule carte : ce que chacun a montré, ce qui a changé, et ce que ça a coûté de le trouver." } },
    "principles": { level: 2, cats: ["method", "test"], nodes: [], req: ["protocol-testing"],
      en: { t: "Making mistakes impossible", d: "Invariants held by code instead of comments: exhaustive switches, coverage tests, and compiler warnings promoted from real incidents." },
      fr: { t: "Rendre les erreurs impossibles", d: "Des invariants tenus par le code plutôt que par des commentaires : switchs exhaustifs, tests de couverture, et avertissements promus en erreurs à partir de vrais incidents." } },
    "open-problems": { level: 2, cats: ["method", "sec", "fleet"], nodes: ["client", "gateway", "gs", "update"], req: ["principles"],
      en: { t: "Known gaps and next steps", d: "What is not solved yet, why it is acceptable for now, and what I would do next." },
      fr: { t: "Limites connues et prochaines étapes", d: "Ce qui n'est pas encore résolu, pourquoi c'est acceptable pour l'instant, et ce que je ferais ensuite." } }
  };

  // Reference pages (not part of the numbered curriculum)
  var reference = [
    { id: "index", file: "index.html", en: "Home", fr: "Accueil" },
    { id: "topics", file: "topics.html", en: "Topics", fr: "Thèmes" },
    { id: "glossary", file: "glossary.html", en: "Glossary", fr: "Glossaire" },
    { id: "lessons", file: "lessons.html", en: "Rules of thumb", fr: "Règles d'or" },
    { id: "takeaways", file: "takeaways.html", en: "Key takeaways", fr: "À retenir" }
  ];

  // Derive numbering, order and file names once.
  var order = [];
  parts.forEach(function (p) {
    p.chapters.forEach(function (id, i) {
      var c = chapters[id];
      if (!c) { throw new Error("site-data: missing chapter " + id); }
      c.id = id;
      c.part = p.id;
      c.partN = p.n;
      c.n = p.n + "." + (i + 1);
      c.file = id + ".html";
      c.index = order.length;
      order.push(id);
    });
  });

  window.MQ = window.MQ || {};
  window.MQ.data = {
    site: site, levels: levels, categories: categories, nodes: nodes,
    parts: parts, chapters: chapters, order: order, reference: reference
  };
})();
