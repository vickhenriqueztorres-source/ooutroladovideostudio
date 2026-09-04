export type EnergiaIaCategory = 'matter' | 'evidence' | 'maps' | 'reveal';

export interface EnergiaIaSceneBlueprint {
  sceneId: string;
  chapterId: string;
  chapterTitle: string;
  voiceover: string;
  visualSubject: string;
  visual_must_include: string[];
  visual_must_not: string[];
  required_category: EnergiaIaCategory;
  take_type: 'CINEMATIC_TAKE';
  targetSeconds: number;
  title?: string;
  subtitle?: string;
}

type RawBlueprint = Omit<EnergiaIaSceneBlueprint, 'sceneId' | 'targetSeconds' | 'take_type'>;

const row = (
  chapterId: string,
  chapterTitle: string,
  required_category: EnergiaIaCategory,
  voiceover: string,
  visualSubject: string,
  action: string,
  forbidden: string,
  title?: string,
  subtitle?: string,
): RawBlueprint => ({
  chapterId,
  chapterTitle,
  required_category,
  voiceover,
  visualSubject,
  visual_must_include: [visualSubject, action],
  visual_must_not: [
    forbidden,
    `substituting ${visualSubject} with an abstract glowing AI symbol`,
    `static showroom pose instead of ${action}`,
  ],
  title,
  subtitle,
});

const raw: RawBlueprint[] = [
  row('CH1', 'A PERGUNTA SAI DA TELA', 'matter', 'Você escreve uma frase. Em outro lugar, máquinas começam a aquecer.', 'present-day laptop sending a short AI question from a modest home desk', 'finger presses enter while the screen remains unreadable and the camera holds beside the keyboard', 'luxury office advertisement with a smiling user', 'UMA FRASE', 'a viagem começa fora da tela'),
  row('CH1', 'A PERGUNTA SAI DA TELA', 'matter', 'O clique vira pacotes elétricos atravessando cabos, roteadores e cidades.', 'fiber router cabinet in a real Brazilian telecom room carrying active network traffic', 'status lights blink irregularly while a technician hand closes the cabinet', 'decorative transparent internet globe'),
  row('CH1', 'A PERGUNTA SAI DA TELA', 'maps', 'A rota não aponta para uma nuvem. Aponta para um prédio.', 'slow elevated view approaching a contemporary data center campus beside a Brazilian transmission corridor', 'camera descends toward the physical utility entrance and fenced buildings', 'fantasy cloud city above the horizon'),
  row('CH1', 'A PERGUNTA SAI DA TELA', 'matter', 'Por fora, o data center parece apenas um galpão muito vigiado.', 'ground-level exterior of a present-day commercial data center with security fence and utility yard', 'service vehicle crosses the foreground under ordinary daylight', 'secret underground bunker entrance'),
  row('CH1', 'A PERGUNTA SAI DA TELA', 'matter', 'Por dentro, corredores inteiros aguardam perguntas como a sua.', 'real occupied server hall with modern black racks and neutral white work lighting', 'camera walks slowly down the aisle while cooling fans visibly spin', 'empty blue neon server showroom'),
  row('CH1', 'A PERGUNTA SAI DA TELA', 'evidence', 'Cada rack reúne servidores, fontes, placas e cabos de rede.', 'macro documentary view of real server trays, power supplies and labeled network cables', 'rack focus moves from cable connectors to spinning server fans', 'unconnected decorative cables arranged for advertising'),
  row('CH1', 'A PERGUNTA SAI DA TELA', 'matter', 'O pedido chega a uma fila compartilhada com milhares de outros.', 'operations technician hands monitoring a real job queue on an ordinary data center console', 'cursor advances through rows while the operator remains out of frame', 'readable customer prompts or private data'),
  row('CH1', 'A PERGUNTA SAI DA TELA', 'evidence', 'O sistema separa tokens, contexto e instruções antes do cálculo.', 'close physical view of server activity indicators beside an out-of-focus tokenization console', 'camera racks focus between the monitor edge and network activity lights', 'floating words orbiting a digital brain'),
  row('CH1', 'A PERGUNTA SAI DA TELA', 'matter', 'Então uma GPU recebe matrizes, pesos e números em alta velocidade.', 'real current-generation data center GPU server being serviced on an antistatic bench', 'technician gloved hands slide the dense accelerator tray into place', 'consumer gaming computer with rainbow lights'),
  row('CH1', 'A PERGUNTA SAI DA TELA', 'evidence', 'A resposta nasce de bilhões de multiplicações feitas em paralelo.', 'macro shot across real accelerator board heat spreaders and dense memory packages', 'focus travels along the board as cooling airflow disturbs a small inspection tag', 'imaginary quantum processor floating in darkness'),
  row('CH1', 'A PERGUNTA SAI DA TELA', 'reveal', 'Mas energia por pergunta não é um número universal e fixo.', 'real rack power meter beside operating AI servers in a measured laboratory aisle', 'meter changes subtly while the live rack remains fully visible', 'large fake electricity price printed over the frame'),
  row('CH1', 'A PERGUNTA SAI DA TELA', 'matter', 'Ela muda com modelo, tokens, lote, hardware e ocupação.', 'two different real server racks operating at visibly different utilization levels', 'camera tracks laterally between the quieter rack and the heavily ventilated rack', 'identical duplicated server racks with synchronized lights'),
  row('CH1', 'A PERGUNTA SAI DA TELA', 'matter', 'Para entender o custo, precisamos seguir o calor que sobra.', 'technician hand holds a thermal camera toward the rear of an operating rack', 'hot exhaust pattern shifts as the camera moves behind the server aisle', 'red laser beam scanning an imaginary machine'),

  row('CH2', 'O CHIP VIRA CALOR', 'matter', 'A GPU recebe eletricidade pela fonte instalada dentro do servidor.', 'open real GPU server showing redundant power supplies feeding accelerator boards', 'cooling fans rotate while a gloved hand checks a power connector', 'desktop computer power supply on a gaming table'),
  row('CH2', 'O CHIP VIRA CALOR', 'evidence', 'Uma H100 pode chegar a setecentos watts em formato SXM.', 'real NVIDIA-class SXM accelerator module on an engineering inspection bench without visible brand text', 'macro camera circles the module heat spreader and electrical contacts', 'oversized fictional chip labeled 700 watts'),
  row('CH2', 'O CHIP VIRA CALOR', 'matter', 'Sistemas completos reúnem oito aceleradores trabalhando no mesmo chassi.', 'real eight-accelerator enterprise GPU chassis partially opened in a service bay', 'technician slides the heavy chassis rail while internal fans remain moving', 'single consumer graphics card in a glass case'),
  row('CH2', 'O CHIP VIRA CALOR', 'evidence', 'Some processadores, memória, rede, fontes e ventiladores ao cálculo.', 'close side view inside a running enterprise server showing CPU heatsinks memory and fans', 'rack focus steps from memory banks to fan wall to network cards', 'exploded CGI parts suspended in air'),
  row('CH2', 'O CHIP VIRA CALOR', 'matter', 'Agora multiplique o servidor por dezenas dentro de cada rack.', 'loaded AI rack with dense server trays and thick rear power cables', 'camera tilts slowly from lower power strips to the topmost servers', 'mostly empty rack with decorative blue lights'),
  row('CH2', 'O CHIP VIRA CALOR', 'reveal', 'Racks atuais de IA podem alcançar cento e vinte quilowatts.', 'real high-density liquid-cooled AI rack connected to industrial power distribution', 'camera holds wide enough to show the full rack and physical feeder cables', 'fictional one megawatt label painted on the rack'),
  row('CH2', 'O CHIP VIRA CALOR', 'matter', 'Essa potência entra por barramentos de cobre grossos e protegidos.', 'real overhead copper busway feeding a modern data center row', 'camera follows the busway toward a visible rack tap box', 'exposed unsafe household wiring above servers'),
  row('CH2', 'O CHIP VIRA CALOR', 'evidence', 'Dentro da PDU, tensão e corrente são medidas continuamente.', 'open industrial power distribution unit with real breakers meters and insulated busbars', 'indicator needles and status lamps move subtly during inspection', 'unprotected hands touching energized copper'),
  row('CH2', 'O CHIP VIRA CALOR', 'matter', 'Fontes convertem a corrente e também perdem energia como calor.', 'rear of operating servers with hot-swappable power supplies and strong airflow', 'thin paper inspection strip flutters in the exhaust stream', 'smoke or flames coming from healthy equipment'),
  row('CH2', 'O CHIP VIRA CALOR', 'evidence', 'O chip usa parte. O restante aquece silício, cobre e ar.', 'thermal inspection of a real accelerator cold plate and adjacent power components', 'focus shifts from warm copper fitting to temperature sensor probe', 'lava glowing inside the processor'),
  row('CH2', 'O CHIP VIRA CALOR', 'matter', 'Quase toda eletricidade consumida termina como calor no edifício.', 'wide rear hot aisle of operating racks with visible containment doors', 'heat shimmer and moving fan exhaust remain physically subtle and plausible', 'dense theatrical fog filling the aisle'),
  row('CH2', 'O CHIP VIRA CALOR', 'maps', 'A pergunta já ocupa um ponto mensurável na planta elétrica.', 'real printed single-line electrical diagram held beside the corresponding switchgear room', 'camera pans from the paper route to the physical feeder cabinet', 'glowing three-dimensional schematic floating over equipment'),
  row('CH2', 'O CHIP VIRA CALOR', 'matter', 'E antes de responder, o prédio precisa remover esse calor.', 'data center operator opens the door to a real mechanical cooling gallery', 'camera follows from server corridor into pumps and insulated pipes', 'spacecraft engine room behind the server aisle'),

  row('CH3', 'A FÁBRICA DE FRIO', 'matter', 'Ventiladores puxam ar frio pela frente de cada servidor.', 'front cold aisle of real servers with perforated floor and neutral lighting', 'airflow ribbons move gently toward spinning intake fans', 'frozen mist pouring from server fronts'),
  row('CH3', 'A FÁBRICA DE FRIO', 'evidence', 'Sensores comparam entrada, saída, pressão e umidade do corredor.', 'real environmental sensors mounted at three heights on a server rack', 'technician probe moves between lower and upper measurement points', 'floating digital thermometer graphics'),
  row('CH3', 'A FÁBRICA DE FRIO', 'matter', 'No corredor quente, o ar retorna dezenas de graus acima.', 'contained hot aisle behind active racks with practical white service lights', 'camera walks against the visible movement of exhaust airflow', 'orange neon tunnel with no equipment detail'),
  row('CH3', 'A FÁBRICA DE FRIO', 'matter', 'Unidades de tratamento devolvem esse ar à temperatura planejada.', 'real computer room air handler with filters coils and access panels', 'maintenance worker hands replace a filter while the blower runs', 'domestic wall air conditioner cooling a server rack'),
  row('CH3', 'A FÁBRICA DE FRIO', 'evidence', 'Em alta densidade, líquido chega mais perto dos chips.', 'macro shot of real liquid-cooling hoses and quick-disconnect fittings on an AI server', 'coolant pulses subtly through a transparent inspection segment', 'bright blue fantasy liquid glowing inside tubes'),
  row('CH3', 'A FÁBRICA DE FRIO', 'matter', 'Cold plates encostam no processador e carregam calor para fora.', 'real copper cold plate being installed onto an accelerator module', 'gloved hands torque mounting screws in a precise sequence', 'ice block placed directly on electronics'),
  row('CH3', 'A FÁBRICA DE FRIO', 'evidence', 'Bombas mantêm vazão enquanto trocadores separam circuitos de água.', 'industrial coolant distribution unit with pumps gauges and plate heat exchanger', 'pump coupling spins and analog gauge needle settles under load', 'transparent CGI water cycle animation'),
  row('CH3', 'A FÁBRICA DE FRIO', 'matter', 'Do salão, tubulações seguem até chillers no pátio mecânico.', 'insulated data center cooling pipes leaving the server building toward real chillers', 'tracking camera follows pipe supports through a service corridor', 'steam pipes in an unrelated oil refinery'),
  row('CH3', 'A FÁBRICA DE FRIO', 'maps', 'O circuito forma outra rede, paralela à rede de dados.', 'elevated documentary view of a real data center mechanical yard and pipe routes', 'camera rises slowly to reveal chillers pumps and cooling towers together', 'abstract glowing circuit board landscape'),
  row('CH3', 'A FÁBRICA DE FRIO', 'matter', 'Torres de resfriamento descarregam calor para o ar exterior.', 'present-day cooling towers operating in a real data center utility yard', 'fans rotate and genuine water vapor drifts with the local wind', 'factory smokestacks emitting dark pollution'),
  row('CH3', 'A FÁBRICA DE FRIO', 'evidence', 'Parte dos sistemas também consome água para ganhar eficiência.', 'real cooling tower basin with makeup water valve and treatment instruments', 'water ripples while a technician samples the basin without showing a face', 'clean drinking glass used as industrial evidence'),
  row('CH3', 'A FÁBRICA DE FRIO', 'reveal', 'Refrigeração pode representar de sete a trinta por cento.', 'real data center energy dashboard beside visible cooling pumps in operation', 'camera keeps the pumps dominant while the dashboard remains partially legible', 'full-screen infographic replacing the equipment'),
  row('CH3', 'A FÁBRICA DE FRIO', 'matter', 'Economizar no chip não resolve um projeto térmico mal dimensionado.', 'maintenance team seen from behind inspecting an undersized cooling manifold in a real server room', 'one worker points from flow meter to the loaded rack', 'dramatic emergency scene with flashing red sirens'),

  row('CH4', 'ANTES DO RACK, A REDE', 'matter', 'Antes do rack, a energia atravessa quadros, UPS e transformadores.', 'real medium-voltage switchgear corridor inside a contemporary data center', 'camera tracks past closed labeled cabinets and practical status lamps', 'open dangerous switchgear with electrical arcs'),
  row('CH4', 'ANTES DO RACK, A REDE', 'evidence', 'A UPS sustenta a carga durante qualquer interrupção instantânea.', 'real modular UPS cabinets and battery strings in a protected electrical room', 'cooling fans run while an operator hand checks a status panel', 'small consumer power strip pretending to be a UPS'),
  row('CH4', 'ANTES DO RACK, A REDE', 'matter', 'Baterias cobrem segundos até geradores assumirem o edifício inteiro.', 'industrial standby generators beside a data center with real fuel and exhaust systems', 'one generator starts and louvers open during a scheduled test', 'portable camping generator powering server racks'),
  row('CH4', 'ANTES DO RACK, A REDE', 'matter', 'Chaves de transferência movem a carga sem desligar os servidores.', 'real automatic transfer switch cabinet during supervised maintenance', 'mechanical indicator changes position while equipment remains enclosed', 'knife switch operated by bare hands'),
  row('CH4', 'ANTES DO RACK, A REDE', 'maps', 'Duas alimentações independentes reduzem o risco de uma falha única.', 'wide aerial view showing two real utility feeders entering a data center campus', 'camera moves laterally until both substations and the campus are visible', 'two glowing lines drawn across a fictional city'),
  row('CH4', 'ANTES DO RACK, A REDE', 'matter', 'Na subestação, transformadores abaixam tensão para uso interno.', 'working electrical substation serving a present-day data center in daylight', 'camera passes a real power transformer with cooling fans turning', 'tiny decorative transformer inside an office'),
  row('CH4', 'ANTES DO RACK, A REDE', 'evidence', 'Proteções observam corrente, temperatura, pressão e qualidade do óleo.', 'macro documentary view of transformer gauges bushings and protection relays', 'focus moves between oil temperature gauge and relay cabinet window', 'sparking damaged transformer presented as normal operation'),
  row('CH4', 'ANTES DO RACK, A REDE', 'maps', 'Depois vem a linha de transmissão, compartilhada com toda região.', 'real high-voltage transmission corridor crossing an inhabited Brazilian region', 'elevated camera follows pylons toward distant city and industrial loads', 'isolated tower against an empty fantasy desert'),
  row('CH4', 'ANTES DO RACK, A REDE', 'reveal', 'A rede precisa entregar potência firme exatamente onde o prédio nasce.', 'survey crew seen from behind marking a real substation expansion site beside transmission lines', 'camera pans from ground stakes to the constrained transformer bay', 'finished futuristic megacity replacing the construction site'),
  row('CH4', 'ANTES DO RACK, A REDE', 'matter', 'Sem conexão aprovada, servidores comprados permanecem desligados em caixas.', 'real warehouse receiving unopened enterprise server crates beside an unfinished electrical room', 'forklift stops while electricians continue work in the background', 'abandoned dusty computers from the nineteen nineties'),
  row('CH4', 'ANTES DO RACK, A REDE', 'evidence', 'Transformadores grandes podem exigir anos entre pedido e entrega.', 'heavy power transformer transported slowly on a specialized multi-axle trailer', 'camera observes the convoy negotiating a real industrial access road', 'small household transformer delivered by van'),
  row('CH4', 'ANTES DO RACK, A REDE', 'maps', 'Por isso, capacidade anunciada não significa capacidade imediatamente disponível.', 'real regional grid control map displayed on a physical operations wall without readable secrets', 'operator silhouettes remain peripheral while the camera studies constrained corridors', 'financial growth chart occupying the whole screen'),

  row('CH5', 'O LIMITE APARECE NO BRASIL', 'maps', 'No Brasil, pedidos de conexão crescem ao redor dos grandes centros.', 'slow aerial survey of present-day data center construction near a Brazilian metropolitan power corridor', 'camera reveals substations roads and occupied neighborhoods in one spatial relationship', 'generic North American desert data center campus'),
  row('CH5', 'O LIMITE APARECE NO BRASIL', 'reveal', 'A EPE projeta salto de cinquenta e três para mil megawatts.', 'real Brazilian power planning document open beside a control room map', 'page is turned by a hand while the physical grid display remains visible', 'invented government seal or fabricated table'),
  row('CH5', 'O LIMITE APARECE NO BRASIL', 'matter', 'O intervalo vai de dois mil e vinte e cinco a vinte e nove.', 'real utility planners seen from behind comparing dated substation construction schedules', 'hands move paper milestones across a large worktable', 'corporate team posing and smiling for camera'),
  row('CH5', 'O LIMITE APARECE NO BRASIL', 'maps', 'Isso concentra muita carga nova em poucos pontos do sistema.', 'aerial view of transmission lines converging on a dense Brazilian industrial and data center zone', 'camera pulls sideways to expose the limited number of incoming corridors', 'nationwide electric grid rendered as neon web'),
  row('CH5', 'O LIMITE APARECE NO BRASIL', 'matter', 'Novas linhas exigem licenciamento, terreno, torres, cabos e tempo.', 'real transmission line construction crew working from a tower foundation without visible faces', 'crane lifts a steel section while workers guide it from the ground', 'instant time-lapse city transformation'),
  row('CH5', 'O LIMITE APARECE NO BRASIL', 'evidence', 'Cabos e equipamentos também enfrentam filas industriais de fabricação.', 'real high-voltage cable factory floor with reels moving through production', 'camera tracks alongside a heavy cable reel and inspection station', 'small electronics assembly line making phone chargers'),
  row('CH5', 'O LIMITE APARECE NO BRASIL', 'matter', 'Enquanto isso, o data center continua pedindo operação ininterrupta.', 'real data center night shift viewed from behind in a restrained operations room', 'operators monitor ordinary screens while equipment hum remains visible through glass', 'dramatic command center with giant holographic wall'),
  row('CH5', 'O LIMITE APARECE NO BRASIL', 'maps', 'Solar e eólica ajudam, mas variam ao longo do dia.', 'real Brazilian solar farm and wind turbines connected to visible substations', 'cloud shadows move across panels while turbine speed changes naturally', 'perfect weather with all generators synchronized'),
  row('CH5', 'O LIMITE APARECE NO BRASIL', 'matter', 'Hidrelétricas oferecem flexibilidade, porém transmissão continua sendo física.', 'real hydroelectric switchyard sending power into long-distance transmission lines', 'camera follows conductors away from the generating station', 'waterfall landscape with no electrical infrastructure'),
  row('CH5', 'O LIMITE APARECE NO BRASIL', 'reveal', 'Estudo aponta vinte e seis a quarenta e cinco gigawatts.', 'printed Brazilian data center infrastructure study beside real construction plans and electrical drawings', 'camera settles on highlighted capacity range without replacing the documents', 'glossy investor presentation on a stage'),
  row('CH5', 'O LIMITE APARECE NO BRASIL', 'maps', 'O cenário depende justamente de rede, licenciamento e coordenação.', 'real planning table combining cadastral map substation drawing and construction schedule', 'hands align the three physical documents into one route', 'fictional satellite control interface'),
  row('CH5', 'O LIMITE APARECE NO BRASIL', 'matter', 'A corrida por IA virou também uma corrida por conexão.', 'data center construction and substation expansion occurring side by side', 'tracking shot keeps electricians and server building equally visible', 'chip fabrication cleanroom unrelated to grid connection'),

  row('CH6', 'O PREÇO REAL DA RESPOSTA', 'reveal', 'Então, quanto custa energeticamente uma única resposta da inteligência artificial?', 'real clamp power meter measuring an active AI server feeder during a controlled test', 'technician hand records the changing reading on paper', 'fixed universal watt-hour answer printed into the image'),
  row('CH6', 'O PREÇO REAL DA RESPOSTA', 'evidence', 'Sem modelo, tamanho e infraestrutura, qualquer número isolado engana.', 'two real power measurement setups testing different enterprise AI servers', 'camera compares both meters while the hardware stays in the same frame', 'one unlabeled meter disconnected from any server'),
  row('CH6', 'O PREÇO REAL DA RESPOSTA', 'matter', 'Perguntas curtas podem compartilhar processamento com várias outras solicitações.', 'real batch-processing server rack during ordinary production operation', 'activity lights rise in grouped bursts rather than one uniform rhythm', 'people represented as glowing avatars inside servers'),
  row('CH6', 'O PREÇO REAL DA RESPOSTA', 'matter', 'Respostas longas mantêm memória, rede e aceleradores ativos por mais tempo.', 'rear view of AI servers sustaining a longer computational workload', 'fan speed gradually increases while power supplies remain stable', 'clock graphics covering the entire rack'),
  row('CH6', 'O PREÇO REAL DA RESPOSTA', 'evidence', 'O PUE adiciona refrigeração, distribuição e perdas ao consumo computacional.', 'real facility power meter and IT rack meter photographed together in an operating data center', 'camera racks focus between facility input and rack measurement', 'equation floating in front of empty darkness'),
  row('CH6', 'O PREÇO REAL DA RESPOSTA', 'maps', 'A mesma pergunta muda de impacto conforme local e horário.', 'real regional dispatch map beside changing daytime renewable generation conditions', 'camera transitions physically from map wall to window view of grid infrastructure', 'world map made from glowing binary digits'),
  row('CH6', 'O PREÇO REAL DA RESPOSTA', 'matter', 'Operadores podem deslocar cargas flexíveis para momentos menos críticos.', 'real data center scheduler console used by an operator seen from behind', 'queued maintenance workload moves to a lower-demand time slot', 'autonomous robot deciding energy policy'),
  row('CH6', 'O PREÇO REAL DA RESPOSTA', 'matter', 'Também podem reaproveitar calor e reduzir água onde fizer sentido.', 'real heat recovery pipes leaving a data center toward a neighboring utility plant', 'camera follows insulated pipes across the property boundary', 'steam used as decorative cinematic atmosphere'),
  row('CH6', 'O PREÇO REAL DA RESPOSTA', 'reveal', 'Mas eficiência não cria uma subestação onde ela não existe.', 'unfinished real substation bay beside a completed data center building', 'camera holds the empty transformer foundation in the foreground', 'magical transformer appearing through animation'),
  row('CH6', 'O PREÇO REAL DA RESPOSTA', 'matter', 'Nem encurta sozinho a fabricação de transformadores e cabos.', 'real transformer factory assembly hall with large coils and steel cores', 'overhead crane moves a heavy component through the long production line', 'small rapid three-dimensional printer making a transformer'),
  row('CH6', 'O PREÇO REAL DA RESPOSTA', 'matter', 'O chip responde rápido. A infraestrutura elétrica responde em anos.', 'real GPU server running in foreground with substation construction visible through service window', 'focus shifts from fast server lights to slow civil work outside', 'split-screen graphic replacing the physical relationship'),
  row('CH6', 'O PREÇO REAL DA RESPOSTA', 'matter', 'O gargalo da IA pode ser a energia disponível no lugar certo.', 'wide present-day data center connected to a real substation at dusk with normal practical lights', 'camera retreats slowly to reveal transmission lines and occupied landscape', 'futuristic skyline or triumphant product advertisement'),
];

// Firefly Video entrega takes temporais de 5 s. A janela editorial varia entre
// 3,3 e 4,5 s para alternar observação, evidência e respiro sem criar slides.
const durations = [3.3, 3.9, 4.3, 3.7, 4.5, 4.1, 3.5, 4.5, 4.2, 4.5] as const;

export const ENERGIA_IA_SCENES: EnergiaIaSceneBlueprint[] = raw.map((scene, index) => ({
  ...scene,
  sceneId: `EIA_${String(index + 1).padStart(3, '0')}`,
  take_type: 'CINEMATIC_TAKE',
  targetSeconds: durations[index % durations.length],
}));

export const ENERGIA_IA_EPISODE_ID = 'energia-ia-data-centers';
export const ENERGIA_IA_RUN_ID = 'energia-ia-data-centers-v1';
export const ENERGIA_IA_TOTAL_SECONDS = ENERGIA_IA_SCENES.reduce((sum, scene) => sum + scene.targetSeconds, 0);
