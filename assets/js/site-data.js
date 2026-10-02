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
      fr: "Carnets d'architecture MMO",
      zh: "MMO 架構實戰筆記"
    }
  };

  var levels = {
    1: { en: "Foundation", fr: "Fondation", zh: "基礎" },
    2: { en: "Core", fr: "Cœur", zh: "核心" },
    3: { en: "Advanced", fr: "Avancé", zh: "進階" }
  };

  var categories = {
    method: { en: "Method", fr: "Méthode", zh: "方法", den: "How to approach the work: order, measurement, trade-offs.", dfr: "Comment aborder le travail : ordre, mesure, compromis.", dzh: "如何著手：順序、量測與取捨。" },
    net: { en: "Networking", fr: "Réseau", zh: "網路", den: "Transport, framing, encoding and message flows.", dfr: "Transport, trames, encodage et flux de messages.", dzh: "傳輸、訊框、編碼與訊息流程。" },
    sec: { en: "Security", fr: "Sécurité", zh: "資安", den: "Trust boundaries, encryption, abuse and integrity.", dfr: "Frontières de confiance, chiffrement, abus et intégrité.", dzh: "信任邊界、加密、濫用與完整性。" },
    sim: { en: "Simulation", fr: "Simulation", zh: "模擬", den: "The authoritative world: ticks, physics, entities.", dfr: "Le monde autoritaire : ticks, physique, entités.", dzh: "權威世界：tick、物理與實體。" },
    conc: { en: "Concurrency", fr: "Concurrence", zh: "並行", den: "Threads, locks, publication and ordering.", dfr: "Threads, verrous, publication et ordonnancement.", dzh: "執行緒、鎖、發布與順序。" },
    perf: { en: "Performance", fr: "Performance", zh: "效能", den: "CPU, allocations, bandwidth and what they cost.", dfr: "CPU, allocations, bande passante et leur coût.", dzh: "CPU、記憶體配置、頻寬，以及它們的代價。" },
    repl: { en: "Replication", fr: "Réplication", zh: "同步複寫", den: "What each player is told, when, and in how many bytes.", dfr: "Ce qu'on dit à chaque joueur, quand, et en combien d'octets.", dzh: "要告訴每位玩家什麼、何時告訴，以及要花多少位元組。" },
    client: { en: "Client", fr: "Client", zh: "用戶端", den: "Making the game feel right on the player's machine.", dfr: "Rendre le jeu agréable sur la machine du joueur.", dzh: "讓遊戲在玩家的電腦上感覺對味。" },
    data: { en: "Persistence", fr: "Persistance", zh: "持久化", den: "Databases, durability and data integrity.", dfr: "Bases de données, durabilité et intégrité des données.", dzh: "資料庫、持久性與資料完整性。" },
    fleet: { en: "Fleet & scaling", fr: "Parc & échelle", zh: "叢集與擴展", den: "Many servers and machines, placed and sized automatically.", dfr: "Plusieurs serveurs et machines, placés et dimensionnés automatiquement.", dzh: "大量伺服器與機器，自動配置、自動調整規模。" },
    ship: { en: "Distribution", fr: "Distribution", zh: "發行", den: "Publishing builds, updating and launching the game.", dfr: "Publier des builds, mettre à jour et lancer le jeu.", dzh: "發布組建、更新與啟動遊戲。" },
    test: { en: "Testing", fr: "Tests", zh: "測試", den: "Tests and load benches that catch real failures.", dfr: "Tests et bancs de charge qui attrapent de vraies pannes.", dzh: "能抓到真實故障的測試與負載實驗。" },
    obs: { en: "Observability", fr: "Observabilité", zh: "可觀測性", den: "Measuring the running system without lying to yourself.", dfr: "Mesurer le système en marche sans se mentir.", dzh: "量測運作中的系統，而不自欺欺人。" },
    tools: { en: "Tooling", fr: "Outillage", zh: "工具", den: "Editors, hot reload and developer tools.", dfr: "Éditeurs, rechargement à chaud et outils de développement.", dzh: "編輯器、熱重載與開發工具。" }
  };

  // Architecture nodes, used by the "where this lives" mini-map on every chapter.
  var nodes = {
    launcher: { en: "Launcher", fr: "Launcher", zh: "啟動器" },
    update: { en: "Update server", fr: "Serveur de MAJ", zh: "更新伺服器" },
    client: { en: "Game client", fr: "Client de jeu", zh: "遊戲用戶端" },
    gateway: { en: "Gateway", fr: "Gateway", zh: "閘道" },
    gs: { en: "Game servers", fr: "Serveurs de jeu", zh: "遊戲伺服器" },
    db: { en: "Database", fr: "Base de données", zh: "資料庫" },
    agent: { en: "Node agents", fr: "Agents de machine", zh: "節點代理程式" },
    sim: { en: "World sim", fr: "Simu du monde", zh: "世界模擬" },
    monitor: { en: "Monitor", fr: "Monitor", zh: "監控器" }
  };

  var parts = [
    { id: "orientation", n: 0, en: "Orientation", fr: "Orientation", zh: "導覽",
      wen: "What an MMO backend is made of, and where to start.",
      wfr: "De quoi est fait un backend de MMO, et par où commencer.",
      wzh: "MMO 後端由哪些部分組成，以及該從哪裡開始。",
      chapters: ["start-here", "big-picture"] },
    { id: "wire", n: 1, en: "The wire", fr: "Le fil", zh: "線路",
      wen: "Bytes between two machines: transport, framing, encoding, encryption, and keeping both ends in agreement.",
      wfr: "Des octets entre deux machines : transport, trames, encodage, chiffrement, et garder les deux bouts d'accord.",
      wzh: "兩台機器之間的位元組：傳輸、訊框、編碼、加密，以及讓兩端保持一致。",
      chapters: ["transport", "packet-format", "encoding", "encryption", "receiving", "protocol-testing"] },
    { id: "front-door", n: 2, en: "The front door", fr: "La porte d'entrée", zh: "大門",
      wen: "Who you are, where you play, and how you move from one server to another.",
      wfr: "Qui vous êtes, où vous jouez, et comment on passe d'un serveur à l'autre.",
      wzh: "你是誰、你在哪裡玩，以及如何從一台伺服器移到另一台。",
      chapters: ["gateway", "login-flow", "handover"] },
    { id: "simulation", n: 3, en: "The simulation", fr: "La simulation", zh: "模擬",
      wen: "One authoritative world, advanced in fixed steps, that never waits for anything.",
      wfr: "Un monde autoritaire, avancé par pas fixes, qui n'attend jamais rien.",
      wzh: "一個權威的世界，以固定步長推進，從不等待任何東西。",
      chapters: ["tick-loop", "tick-anatomy", "threading", "no-db-in-tick", "physics", "entities"] },
    { id: "replication", n: 4, en: "Replication", fr: "La réplication", zh: "同步複寫",
      wen: "Deciding what each player needs to know, and paying for it in bytes.",
      wfr: "Décider ce que chaque joueur doit savoir, et le payer en octets.",
      wzh: "決定每位玩家需要知道什麼，並用位元組付出代價。",
      chapters: ["aoi", "snapshots", "serialize-once", "deltas", "freshness-budget", "bandwidth"] },
    { id: "client", n: 5, en: "The client", fr: "Le client", zh: "用戶端",
      wen: "Turning 25 snapshots a second into smooth motion and responsive controls.",
      wfr: "Transformer 25 snapshots par seconde en mouvement fluide et en contrôles réactifs.",
      wzh: "把每秒 25 份快照變成流暢的動作與靈敏的操控。",
      chapters: ["client-architecture", "interpolation", "prediction", "client-rendering"] },
    { id: "persistence", n: 6, en: "Persistence & integrity", fr: "Persistance & intégrité", zh: "持久化與完整性",
      wen: "RAM is the authority, the database is the journal, and nothing may ever duplicate.",
      wfr: "La RAM fait autorité, la base est le journal, et rien ne doit jamais se dupliquer.",
      wzh: "RAM 是權威，資料庫是日誌，任何東西都絕不能複製出第二份。",
      chapters: ["persistence", "transactions", "data-and-catalogs"] },
    { id: "fleet", n: 7, en: "Scaling out", fr: "Passer à l'échelle", zh: "向外擴展",
      wen: "Many maps, many processes, many machines, placed and sized automatically.",
      wfr: "Beaucoup de cartes, de processus et de machines, placés et dimensionnés automatiquement.",
      wzh: "大量地圖、大量程序、大量機器，自動配置、自動調整規模。",
      chapters: ["map-hosting", "capacity", "node-agents"] },
    { id: "shipping", n: 8, en: "Shipping builds", fr: "Livrer le jeu", zh: "發行組建",
      wen: "Getting exactly the right bytes onto players' machines, safely and incrementally.",
      wfr: "Poser exactement les bons octets sur la machine des joueurs, sûrement et par incréments.",
      wzh: "把剛好正確的位元組送到玩家電腦上，安全且漸進。",
      chapters: ["updater", "launcher"] },
    { id: "world", n: 9, en: "The living world", fr: "Le monde vivant", zh: "活的世界",
      wen: "A second simulation that runs by the hour, far from the game loop.",
      wfr: "Une seconde simulation qui tourne à l'heure, loin de la boucle de jeu.",
      wzh: "第二套模擬，以小時為單位運轉，遠離遊戲迴圈。",
      chapters: ["world-sim"] },
    { id: "measure", n: 10, en: "Measure & harden", fr: "Mesurer & durcir", zh: "量測與強化",
      wen: "Instruments, load tests, and the rules that stopped bugs from coming back.",
      wfr: "Des instruments, des bancs de charge, et les règles qui ont empêché les bugs de revenir.",
      wzh: "量測工具、負載測試，以及讓 bug 不再回來的規則。",
      chapters: ["observability", "allocations", "load-testing", "bench-journal", "principles", "open-problems"] }
  ];

  var chapters = {
    "start-here": { level: 1, cats: ["method"], nodes: [], req: [],
      en: { t: "Where to start", d: "The order I would build an MMO backend in today, what to postpone, and how to tell that a stage is finished." },
      fr: { t: "Par où commencer", d: "L'ordre dans lequel je construirais un backend de MMO aujourd'hui, ce qu'il faut repousser, et comment savoir qu'une étape est finie." },
      zh: { t: "從哪裡開始", d: "如果今天要打造 MMO 後端，我會採取的順序、哪些可以延後，以及如何判斷一個階段已經完成。" } },
    "big-picture": { level: 1, cats: ["method", "net", "fleet"], nodes: ["launcher", "update", "client", "gateway", "gs", "db", "agent", "sim", "monitor"], req: ["start-here"],
      en: { t: "The system at a glance", d: "Every process in the architecture, what it owns, and the path a player's packets take through it." },
      fr: { t: "Le système d'un coup d'œil", d: "Chaque processus de l'architecture, ce qu'il possède, et le chemin que prennent les paquets d'un joueur." },
      zh: { t: "系統全貌", d: "架構中的每個程序、各自負責什麼，以及玩家的封包在其中走過的路徑。" } },

    "transport": { level: 1, cats: ["net"], nodes: ["client", "gateway", "gs"], req: ["big-picture"],
      en: { t: "Choosing a transport", d: "TCP, raw UDP or reliable UDP: delivery guarantees, head-of-line blocking, packet size limits, and why LiteNetLib." },
      fr: { t: "Choisir un transport", d: "TCP, UDP brut ou UDP fiable : garanties de livraison, blocage en tête de file, taille des paquets, et pourquoi LiteNetLib." },
      zh: { t: "選擇傳輸層", d: "TCP、原始 UDP 還是可靠 UDP：遞送保證、隊頭阻塞、封包大小限制，以及為什麼選 LiteNetLib。" } },
    "packet-format": { level: 1, cats: ["net", "test"], nodes: ["client", "gateway", "gs"], req: ["transport"],
      en: { t: "A binary protocol of your own", d: "Framing, positional payloads, and the discipline that keeps a hand-written serializer honest." },
      fr: { t: "Un protocole binaire à soi", d: "Les trames, les charges utiles positionnelles, et la discipline qui garde un sérialiseur écrit à la main honnête." },
      zh: { t: "自訂二進位協定", d: "訊框、依位置排列的酬載，以及讓手寫序列化器保持誠實的紀律。" } },
    "encoding": { level: 2, cats: ["net", "perf"], nodes: ["client", "gs"], req: ["packet-format"],
      en: { t: "Squeezing bytes", d: "Variable-length integers, zig-zag, quantization, and the size cliffs that quietly decide your bandwidth." },
      fr: { t: "Économiser les octets", d: "Les entiers de taille variable, le zig-zag, la quantification, et les falaises de taille qui décident en silence de la bande passante." },
      zh: { t: "壓榨位元組", d: "可變長度整數、zig-zag、量化，以及默默決定頻寬的長度斷崖。" } },
    "encryption": { level: 2, cats: ["net", "sec"], nodes: ["client", "gateway", "gs"], req: ["transport"],
      en: { t: "Encrypting the session", d: "An X25519 key exchange, HKDF, one AES-GCM key per direction, and a clear list of what it does not protect." },
      fr: { t: "Chiffrer la session", d: "Un échange de clés X25519, HKDF, une clé AES-GCM par sens, et la liste claire de ce que ça ne protège pas." },
      zh: { t: "加密連線階段", d: "X25519 金鑰交換、HKDF、每個方向一把 AES-GCM 金鑰，以及一份清楚列出它不保護什麼的清單。" } },
    "receiving": { level: 2, cats: ["net", "sec", "conc"], nodes: ["gateway", "gs"], req: ["packet-format"],
      en: { t: "Receiving safely", d: "Parsing, dispatching, exception boundaries, rate limits and peer caps: the edge where untrusted bytes come in." },
      fr: { t: "Recevoir sans tomber", d: "Parser, distribuer, frontières d'exceptions, limites de débit et plafonds de pairs : la lisière où entrent des octets non fiables." },
      zh: { t: "安全地接收", d: "解析、分派、例外邊界、速率限制與連線數上限：不可信的位元組進入的那道邊界。" } },
    "protocol-testing": { level: 2, cats: ["net", "test"], nodes: ["client", "gateway", "gs"], req: ["packet-format", "encoding"],
      en: { t: "Keeping both ends in agreement", d: "A protocol version gate, byte-exact round-trip tests, golden bytes, shared codecs, and codes instead of words." },
      fr: { t: "Garder les deux bouts d'accord", d: "Une porte de version, des tests aller-retour à l'octet près, des octets d'or, des codecs partagés, et des codes plutôt que des mots." },
      zh: { t: "讓兩端保持一致", d: "協定版本閘門、逐位元組的往返測試、黃金位元組、共用編解碼器，以及用代碼取代文字。" } },

    "gateway": { level: 1, cats: ["net", "sec", "fleet"], nodes: ["gateway", "gs", "db"], req: ["big-picture", "encryption"],
      en: { t: "The gateway", d: "Why a separate front door, what it owns, how game servers prove who they are, and why it carries the social layer." },
      fr: { t: "La gateway", d: "Pourquoi une porte d'entrée séparée, ce qu'elle possède, comment les serveurs de jeu prouvent qui ils sont, et pourquoi elle porte le social." },
      zh: { t: "閘道", d: "為什麼要獨立的大門、它負責什麼、遊戲伺服器如何證明身分，以及為什麼社交功能由它承擔。" } },
    "login-flow": { level: 1, cats: ["net", "sec"], nodes: ["client", "gateway", "gs", "db"], req: ["gateway"],
      en: { t: "From login to first snapshot", d: "Password hashing, session tokens, game tokens, and an arrival phase that finally defines what 'arrived' means." },
      fr: { t: "Du login au premier snapshot", d: "Hachage des mots de passe, jetons de session, jetons de jeu, et une phase d'arrivée qui définit enfin « arrivé »." },
      zh: { t: "從登入到第一份快照", d: "密碼雜湊、連線階段權杖、遊戲權杖，以及終於定義清楚「抵達」意義的抵達階段。" } },
    "handover": { level: 2, cats: ["net", "fleet", "conc"], nodes: ["client", "gateway", "gs"], req: ["login-flow"],
      en: { t: "Moving between servers", d: "Map transitions, reconnecting to another process, session takeover, and the ordering that keeps a group together." },
      fr: { t: "Passer d'un serveur à l'autre", d: "Transitions de carte, reconnexion vers un autre processus, reprise de session, et l'ordre qui garde un groupe uni." },
      zh: { t: "在伺服器之間移動", d: "切換地圖、重新連線到另一個程序、連線階段接管，以及讓隊伍不會走散的順序。" } },

    "tick-loop": { level: 1, cats: ["sim", "perf", "conc"], nodes: ["gs"], req: ["big-picture"],
      en: { t: "The heartbeat", d: "A fixed-rate loop that neither drifts nor spirals, and three Windows timer traps that each quietly stole ticks." },
      fr: { t: "Le battement de cœur", d: "Une boucle à cadence fixe qui ne dérive ni ne s'emballe, et trois pièges de minuterie Windows qui ont chacun volé des ticks en silence." },
      zh: { t: "心跳", d: "一個既不漂移也不失控的固定頻率迴圈，以及三個各自默默偷走 tick 的 Windows 計時器陷阱。" } },
    "tick-anatomy": { level: 2, cats: ["sim", "perf"], nodes: ["gs"], req: ["tick-loop"],
      en: { t: "Anatomy of a tick", d: "The phases of one 40 ms world step, in order, and why each one sits exactly where it does." },
      fr: { t: "Anatomie d'un tick", d: "Les phases d'un pas de monde de 40 ms, dans l'ordre, et pourquoi chacune est exactement à sa place." },
      zh: { t: "Tick 解剖", d: "一個 40 ms 世界步進的各個階段、執行順序，以及每個階段為什麼剛好放在那裡。" } },
    "threading": { level: 3, cats: ["conc", "perf", "sim"], nodes: ["gs"], req: ["tick-anatomy"],
      en: { t: "Threads without tears", d: "Maps as islands, deferred mutation, immutable publication, and dedicated workers instead of the thread pool." },
      fr: { t: "Des threads sans larmes", d: "Les cartes comme des îles, la mutation différée, la publication immuable, et des ouvriers dédiés plutôt que le ThreadPool." },
      zh: { t: "不流淚的多執行緒", d: "地圖是孤島、延後修改、不可變的發布，以及用專屬工作執行緒取代執行緒集區。" } },
    "no-db-in-tick": { level: 2, cats: ["sim", "data", "conc"], nodes: ["gs", "db"], req: ["tick-anatomy"],
      en: { t: "The tick never waits", d: "No database call inside the loop, ever: a guard that watches for it, and three ways to do without." },
      fr: { t: "Le tick n'attend jamais", d: "Aucun appel à la base dans la boucle, jamais : un garde qui la surveille, et trois façons de s'en passer." },
      zh: { t: "Tick 從不等待", d: "迴圈內絕不呼叫資料庫：一個負責盯著它的守衛，以及三種不需要它的做法。" } },
    "physics": { level: 3, cats: ["sim", "perf"], nodes: ["gs"], req: ["tick-anatomy"],
      en: { t: "Physics at MMO scale", d: "One Box2D world per map, collision filters, bullets without bodies, and the eightfold shape cut that fixed the broad-phase." },
      fr: { t: "La physique à l'échelle d'un MMO", d: "Un monde Box2D par carte, les filtres de collision, des balles sans corps, et la division par huit des formes qui a réparé la broad-phase." },
      zh: { t: "MMO 規模的物理", d: "每張地圖一個 Box2D 世界、碰撞過濾、沒有剛體的子彈，以及把形狀數砍成八分之一、修好 broad-phase 的那一刀。" } },
    "entities": { level: 2, cats: ["sim", "net"], nodes: ["gs"], req: ["tick-anatomy"],
      en: { t: "Entities, ids and membership", d: "How objects join a map, tick, get a network id, and act through composable behaviours." },
      fr: { t: "Entités, identifiants et appartenance", d: "Comment les objets rejoignent une carte, tickent, reçoivent un identifiant réseau et agissent par comportements composables." },
      zh: { t: "實體、ID 與歸屬", d: "物件如何加入地圖、執行 tick、取得網路 ID，並透過可組合的行為來行動。" } },

    "aoi": { level: 2, cats: ["repl", "perf", "conc"], nodes: ["gs"], req: ["tick-anatomy"],
      en: { t: "Area of interest", d: "A flat grid instead of a quadtree, radius queries, cell sizing, and an index rebuilt and published every tick." },
      fr: { t: "La zone d'intérêt", d: "Une grille plate plutôt qu'un quadtree, des requêtes par rayon, le dimensionnement des cellules, et un index reconstruit et publié à chaque tick." },
      zh: { t: "興趣區域", d: "用平面網格取代四元樹、半徑查詢、格子大小的決定，以及每個 tick 重建並發布的索引。" } },
    "snapshots": { level: 2, cats: ["repl", "net"], nodes: ["gs", "client"], req: ["aoi", "packet-format"],
      en: { t: "Snapshots: state and events", d: "What a snapshot means, why absence stopped meaning 'gone', and how bullets, missiles and debris each live differently." },
      fr: { t: "Snapshots : état et événements", d: "Ce que veut dire un snapshot, pourquoi l'absence a cessé de vouloir dire « parti », et comment balles, missiles et débris vivent chacun à leur façon." },
      zh: { t: "快照：狀態與事件", d: "快照代表什麼、為什麼「不在快照裡」不再代表「消失了」，以及子彈、飛彈和碎片各自不同的生命週期。" } },
    "serialize-once": { level: 3, cats: ["repl", "perf", "conc"], nodes: ["gs"], req: ["snapshots", "threading"],
      en: { t: "Serialize once, copy many", d: "Turning O(players × objects) serialization into O(objects), and the data race it hid until 780 players." },
      fr: { t: "Sérialiser une fois, copier souvent", d: "Passer d'une sérialisation en O(joueurs × objets) à O(objets), et la course de données qu'elle a cachée jusqu'à 780 joueurs." },
      zh: { t: "序列化一次，複製多次", d: "把 O(玩家 × 物件) 的序列化變成 O(物件)，以及它一直藏到 780 名玩家才現形的資料競爭。" } },
    "deltas": { level: 3, cats: ["repl", "net"], nodes: ["gs", "client"], req: ["snapshots"],
      en: { t: "Deltas that survive loss", d: "Dirty bits, baselines, and why a global delta broke the moment each viewer started receiving a different stream." },
      fr: { t: "Des deltas qui survivent aux pertes", d: "Bits sales, références, et pourquoi un delta global a cassé dès que chaque spectateur a reçu un flux différent." },
      zh: { t: "禁得起掉包的差量", d: "髒位元、基準，以及為什麼全域差量在每位觀察者開始收到不同資料流的那一刻就壞了。" } },
    "freshness-budget": { level: 3, cats: ["repl", "perf"], nodes: ["gs"], req: ["snapshots", "deltas"],
      en: { t: "The freshness budget", d: "Bounding the per-player cost of a crowd with three cadence rings, a heartbeat and a histogram instead of a sort." },
      fr: { t: "Le budget de fraîcheur", d: "Borner le coût par joueur d'une foule avec trois anneaux de cadence, un battement et un histogramme plutôt qu'un tri." },
      zh: { t: "新鮮度預算", d: "用三圈更新頻率、一個心跳與一個直方圖（而不是排序），限制人潮對每位玩家造成的成本。" } },
    "bandwidth": { level: 2, cats: ["repl", "net", "perf"], nodes: ["gs", "client"], req: ["encoding", "freshness-budget"],
      en: { t: "Bandwidth accounting", d: "Where every byte of a snapshot goes, the arithmetic that predicts megabytes per second, and the MTU wall." },
      fr: { t: "La comptabilité de la bande passante", d: "Où va chaque octet d'un snapshot, l'arithmétique qui prédit les mégaoctets par seconde, et le mur du MTU." },
      zh: { t: "頻寬帳本", d: "快照的每個位元組花在哪裡、預測每秒 MB 數的算式，以及 MTU 這道牆。" } },

    "client-architecture": { level: 1, cats: ["client", "net"], nodes: ["client"], req: ["snapshots"],
      en: { t: "The client's network layer", d: "Main-thread marshalling, keeping only the newest snapshot, discovering unknown objects, and loading screens that mean something." },
      fr: { t: "La couche réseau du client", d: "Le passage au thread principal, ne garder que le dernier snapshot, découvrir les objets inconnus, et des écrans de chargement qui veulent dire quelque chose." },
      zh: { t: "用戶端的網路層", d: "交給主執行緒處理、只保留最新的快照、發現未知物件，以及真正有意義的載入畫面。" } },
    "interpolation": { level: 2, cats: ["client", "repl"], nodes: ["client"], req: ["client-architecture"],
      en: { t: "Smoothing remote objects", d: "Interpolation, damped extrapolation, render buffers in tick space, and dead-zones against micro-corrections." },
      fr: { t: "Lisser les objets distants", d: "Interpolation, extrapolation amortie, tampons de rendu en espace de ticks, et zones mortes contre les micro-corrections." },
      zh: { t: "平滑遠端物件", d: "內插、阻尼外插、以 tick 為時間軸的繪製緩衝，以及對抗微小修正的死區。" } },
    "prediction": { level: 2, cats: ["client"], nodes: ["client", "gs"], req: ["interpolation"],
      en: { t: "Prediction and reconciliation", d: "Moving your own character instantly, and correcting it against the server without visible snaps." },
      fr: { t: "Prédiction et réconciliation", d: "Déplacer son propre personnage instantanément, et le corriger contre le serveur sans à-coup visible." },
      zh: { t: "預測與校正", d: "讓自己的角色立即移動，並在不出現明顯跳動的情況下依伺服器結果修正。" } },
    "client-rendering": { level: 2, cats: ["client", "perf"], nodes: ["client"], req: ["client-architecture"],
      en: { t: "Rendering thousands of objects", d: "ECS for bullets, one mesh for eight hundred debris, and the per-instance traps that only show under load." },
      fr: { t: "Afficher des milliers d'objets", d: "L'ECS pour les balles, une seule maille pour huit cents débris, et les pièges par instance qui n'apparaissent qu'en charge." },
      zh: { t: "繪製成千上萬個物件", d: "子彈用 ECS、八百塊碎片用一個網格，以及只在高負載下才現形的逐實例陷阱。" } },

    "persistence": { level: 2, cats: ["data"], nodes: ["gs", "db"], req: ["no-db-in-tick"],
      en: { t: "RAM is the authority", d: "What may live in memory until later, what must be written now, and the one rule that tells them apart." },
      fr: { t: "La RAM fait autorité", d: "Ce qui peut vivre en mémoire jusqu'à plus tard, ce qui doit être écrit tout de suite, et la règle qui les sépare." },
      zh: { t: "RAM 是權威", d: "什麼可以先留在記憶體晚點再寫、什麼必須立刻寫入，以及區分兩者的那一條規則。" } },
    "transactions": { level: 3, cats: ["data", "conc", "sec"], nodes: ["gs", "db"], req: ["persistence"],
      en: { t: "Moving goods without duplicating them", d: "Escrow in the same write, locks ordered by id, re-reading under the lock, all or nothing." },
      fr: { t: "Déplacer des biens sans les dupliquer", d: "Séquestre dans la même écriture, verrous ordonnés par identifiant, relecture sous le verrou, tout ou rien." },
      zh: { t: "轉移物品而不複製", d: "在同一次寫入中託管、依 ID 排序上鎖、在鎖內重新讀取，全有或全無。" } },
    "data-and-catalogs": { level: 2, cats: ["data", "tools"], nodes: ["gs", "db", "client"], req: ["persistence"],
      en: { t: "Schema, seeding and live catalogs", d: "Migrations, a seed lock shared by several processes, and game data you can change without restarting anything." },
      fr: { t: "Schéma, amorçage et catalogues à chaud", d: "Les migrations, un verrou d'amorçage partagé par plusieurs processus, et des données de jeu modifiables sans rien redémarrer." },
      zh: { t: "結構描述、初始資料與即時目錄", d: "資料庫遷移、多個程序共用的初始化鎖，以及不必重新啟動任何東西就能修改的遊戲資料。" } },

    "map-hosting": { level: 3, cats: ["fleet", "conc"], nodes: ["gateway", "gs", "db"], req: ["handover", "no-db-in-tick"],
      en: { t: "Hosting maps on demand", d: "Assigning a map to exactly one server, waiting for reinforcements, and living under a hard ceiling of physics worlds." },
      fr: { t: "Héberger les cartes à la demande", d: "Confier une carte à exactement un serveur, attendre les renforts, et vivre sous un plafond dur de mondes physiques." },
      zh: { t: "按需託管地圖", d: "把一張地圖指派給恰好一台伺服器、等待支援，以及在物理世界數量的硬上限下生存。" } },
    "capacity": { level: 3, cats: ["fleet"], nodes: ["gateway", "db", "agent"], req: ["map-hosting"],
      en: { t: "The capacity controller", d: "A desired server count per world, rules to grow and shrink, placement scoring, draining and pardons." },
      fr: { t: "Le contrôleur de capacité", d: "Un nombre de serveurs désiré par monde, des règles pour monter et descendre, un score de placement, des retraits et des grâces." },
      zh: { t: "容量控制器", d: "每個世界的期望伺服器數、擴增與縮減的規則、配置評分、排空與赦免。" } },
    "node-agents": { level: 3, cats: ["fleet", "conc"], nodes: ["agent", "db", "gs"], req: ["capacity"],
      en: { t: "Node agents", d: "One reconciler per machine: claiming work through the database, sizing to the hardware, and retiring empty servers." },
      fr: { t: "Les agents de machine", d: "Un réconciliateur par machine : prendre du travail via la base, se dimensionner sur le matériel, et retirer les serveurs vides." },
      zh: { t: "節點代理程式", d: "每台機器一個調和器：透過資料庫認領工作、依硬體調整規模，以及讓空伺服器退役。" } },

    "updater": { level: 2, cats: ["ship", "sec"], nodes: ["update", "launcher"], req: ["big-picture"],
      en: { t: "Content-addressed updates", d: "Manifests of hashes, one shared object store, a pointer written last, and an update server with no logic at all." },
      fr: { t: "Des mises à jour adressées par contenu", d: "Des manifestes de hachages, un magasin d'objets partagé, un pointeur écrit en dernier, et un serveur de mise à jour sans aucune logique." },
      zh: { t: "內容定址的更新", d: "雜湊清單、一個共用的物件儲存區、最後才寫入的指標，以及完全沒有邏輯的更新伺服器。" } },
    "launcher": { level: 2, cats: ["ship", "sec"], nodes: ["launcher", "update", "client"], req: ["updater"],
      en: { t: "The launcher", d: "Planning, verifying and applying an update atomically, and replacing yourself while you are running." },
      fr: { t: "Le launcher", d: "Planifier, vérifier et appliquer une mise à jour de façon atomique, et se remplacer soi-même en cours d'exécution." },
      zh: { t: "啟動器", d: "以不可分割的方式規劃、驗證並套用更新，以及在執行中替換自己。" } },

    "world-sim": { level: 2, cats: ["sim", "data"], nodes: ["sim", "db", "gs"], req: ["persistence"],
      en: { t: "A simulation beside the simulation", d: "An hourly world tick in its own process: its own clock, a replayable seed, a pipeline of steps, and a ledger of facts." },
      fr: { t: "Une simulation à côté de la simulation", d: "Un tick du monde à l'heure dans son propre processus : sa propre horloge, une graine rejouable, un pipeline d'étapes et un registre de faits." },
      zh: { t: "模擬旁的模擬", d: "在獨立程序中每小時執行一次的世界 tick：自己的時鐘、可重播的種子、步驟管線，以及事實帳本。" } },

    "observability": { level: 2, cats: ["obs", "perf"], nodes: ["gs", "monitor"], req: ["tick-anatomy"],
      en: { t: "Instruments that tell the truth", d: "Wall time versus CPU time, periodic photos versus thresholds, and a monitor built to be pasted into a bug report." },
      fr: { t: "Des instruments qui disent vrai", d: "Temps mural contre temps CPU, photos périodiques contre seuils, et un moniteur conçu pour être collé dans un rapport de bug." },
      zh: { t: "說真話的量測工具", d: "牆鐘時間與 CPU 時間、定期快照與門檻觸發，以及一個專為貼進 bug 回報而設計的監控器。" } },
    "allocations": { level: 2, cats: ["perf"], nodes: ["gs", "client"], req: ["observability"],
      en: { t: "Allocation discipline", d: "In a tick, don't build: fill. Pools, ownership contracts, and the GC settings for a 25 Hz server." },
      fr: { t: "La discipline des allocations", d: "Dans un tick, on ne construit pas : on remplit. Pools, contrats de propriété, et réglages du GC pour un serveur à 25 Hz." },
      zh: { t: "記憶體配置紀律", d: "在 tick 裡不要建立，要填入。物件池、所有權契約，以及 25 Hz 伺服器的 GC 設定。" } },
    "load-testing": { level: 2, cats: ["test", "perf", "obs"], nodes: ["client", "gateway", "gs"], req: ["observability"],
      en: { t: "Load testing an MMO", d: "Bots that are real clients, a bench that doesn't fabricate its own failures, and measuring the server rather than the machine." },
      fr: { t: "Tester la charge d'un MMO", d: "Des bots qui sont de vrais clients, un banc qui ne fabrique pas ses propres pannes, et mesurer le serveur plutôt que la machine." },
      zh: { t: "MMO 負載測試", d: "本身就是真實用戶端的機器人、不會自己製造故障的測試台，以及量測伺服器而不是量測機器。" } },
    "bench-journal": { level: 2, cats: ["perf", "obs", "method"], nodes: ["gs", "monitor"], req: ["load-testing"],
      en: { t: "The bench journal", d: "Load tests from 100 to 800 players on a single map: what each one showed, what changed, and what it cost to find out." },
      fr: { t: "Le journal des bancs d'essai", d: "Des bancs de charge de 100 à 800 joueurs sur une seule carte : ce que chacun a montré, ce qui a changé, et ce que ça a coûté de le trouver." },
      zh: { t: "測試台日誌", d: "單一地圖從 100 到 800 名玩家的負載測試：每次測出了什麼、改了什麼，以及找出答案花了多少代價。" } },
    "principles": { level: 2, cats: ["method", "test"], nodes: [], req: ["protocol-testing"],
      en: { t: "Making mistakes impossible", d: "Invariants held by code instead of comments: exhaustive switches, coverage tests, and compiler warnings promoted from real incidents." },
      fr: { t: "Rendre les erreurs impossibles", d: "Des invariants tenus par le code plutôt que par des commentaires : switchs exhaustifs, tests de couverture, et avertissements promus en erreurs à partir de vrais incidents." },
      zh: { t: "讓錯誤不可能發生", d: "由程式碼而非註解守住的不變條件：窮舉式 switch、涵蓋率測試，以及從真實事故升級為錯誤的編譯器警告。" } },
    "open-problems": { level: 2, cats: ["method", "sec", "fleet"], nodes: ["client", "gateway", "gs", "update"], req: ["principles"],
      en: { t: "Known gaps and next steps", d: "What is not solved yet, why it is acceptable for now, and what I would do next." },
      fr: { t: "Limites connues et prochaines étapes", d: "Ce qui n'est pas encore résolu, pourquoi c'est acceptable pour l'instant, et ce que je ferais ensuite." },
      zh: { t: "已知缺口與下一步", d: "哪些還沒解決、為什麼目前可以接受，以及我接下來會做什麼。" } }
  };

  // Reference pages (not part of the numbered curriculum)
  var reference = [
    { id: "index", file: "index.html", en: "Home", fr: "Accueil", zh: "首頁" },
    { id: "topics", file: "topics.html", en: "Topics", fr: "Thèmes", zh: "主題" },
    { id: "glossary", file: "glossary.html", en: "Glossary", fr: "Glossaire", zh: "詞彙表" },
    { id: "lessons", file: "lessons.html", en: "Rules of thumb", fr: "Règles d'or", zh: "經驗法則" },
    { id: "takeaways", file: "takeaways.html", en: "Key takeaways", fr: "À retenir", zh: "重點整理" }
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
