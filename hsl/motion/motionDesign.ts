export type HslMotionTemplate =
  | 'FLOW_MAP'
  | 'BRANCHING_ROUTES'
  | 'PROCESS_CUTAWAY'
  | 'STATE_TRANSITION'
  | 'CAPACITY_VS_AVAILABILITY'
  | 'BOTTLENECK'
  | 'PARALLEL_TURNAROUND'
  | 'DELAY_PROPAGATION'
  | 'BEFORE_AFTER'
  | 'EVIDENCE_CARD';

export type HslMotionAccent = 'yellow' | 'blue' | 'orange';

export interface HslMotionBeat {
  readonly at_percent: number;
  readonly text: string;
  readonly role: 'QUESTION' | 'MECHANISM' | 'CHANGE' | 'CONSEQUENCE';
}

export interface HslMotionDesign {
  readonly schema: 'hsl.motion-design.v2';
  readonly schema_version: '2.0.0';
  readonly template: HslMotionTemplate;
  readonly accent: HslMotionAccent;
  readonly eyebrow: string;
  readonly headline: string;
  readonly stages: readonly string[];
  readonly takeaway: string;
  readonly beats: readonly HslMotionBeat[];
  readonly direction: 'FORWARD' | 'REVERSE' | 'DIVERGE' | 'CONVERGE' | 'PARALLEL';
  readonly metric?: Readonly<{value: string; label: string}>;
}

export interface HslMotionDesignInput {
  readonly narrativeFunction: string;
  readonly visualSubject: string;
  readonly voiceover?: string;
  readonly variant: 'ESTABLISH' | 'PROCESS' | 'DETAIL' | 'CONSEQUENCE';
}

interface MotionStory {
  readonly eyebrow: string;
  readonly headline: string;
  readonly stages: readonly string[];
  readonly takeaway: string;
  readonly accent?: HslMotionAccent;
  readonly direction?: HslMotionDesign['direction'];
  readonly metric?: HslMotionDesign['metric'];
  readonly preferred: HslMotionTemplate;
}

const suffixes = [
  'establish the system context and scale',
  'isolate the active process and primary handoff',
  'reveal the critical operational detail',
  'resolve into the stated consequence'
];

export function stripShotIntent(value: string): string {
  let result = value.trim();
  for (const suffix of suffixes) result = result.replace(new RegExp(`\\s+-\\s+${suffix}$`, 'i'), '').trim();
  return result;
}

function storyFor(input: HslMotionDesignInput): MotionStory {
  const subject = stripShotIntent(input.visualSubject);
  const value = `${input.narrativeFunction} ${subject} ${input.voiceover || ''}`.toLowerCase();

  // 0. ENGENHARIA DE PROCESSOS, FLUIDOS & CONTAMINAÇÃO
  if (/specification|performance envelope|temperature, density|fuel droplet/.test(value)) return {
    eyebrow: 'QUALITY ENVELOPE', headline: 'THE FUEL MUST STAY INSIDE THE LIMITS',
    stages: ['TEMPERATURE', 'DENSITY', 'COMPATIBILITY'], takeaway: 'QUALITY TRAVELS WITH THE BATCH', accent: 'blue', preferred: 'PROCESS_CUTAWAY'
  };
  if (/contamination|water droplets|particulate|filter vessel|filtering/.test(value)) return {
    eyebrow: 'CONTAMINATION CONTROL', headline: 'REMOVE WHAT DOES NOT BELONG',
    stages: ['FUEL + WATER', 'SEPARATION', 'CLEAN FLOW'], takeaway: 'ONE CHECKPOINT PROTECTS THE NEXT', accent: 'blue', preferred: 'PROCESS_CUTAWAY'
  };
  if (/verification|sample jar|batch record/.test(value) && !/failed verification|verification hold|quality constraint|status change/.test(value)) return {
    eyebrow: 'THREE-LAYER CHECK', headline: 'NO SINGLE TEST CARRIES THE SYSTEM',
    stages: ['SAMPLE', 'RECORD', 'TRANSFER PATH'], takeaway: 'ALL THREE MUST AGREE', accent: 'blue', preferred: 'EVIDENCE_CARD'
  };
  if (/bonding|electrical path|static electricity/.test(value)) return {
    eyebrow: 'SAFE SEQUENCE', headline: 'CONNECT BEFORE FLOW BEGINS',
    stages: ['BOND', 'VERIFY', 'OPEN FLOW'], takeaway: 'THE ORDER OF ACTIONS MANAGES THE HAZARD', accent: 'blue', preferred: 'STATE_TRANSITION'
  };

  // 1. TEMPO ATÔMICO, GPS, FÍSICA QUÂNTICA & RELATIVIDADE
  if (/césio|cesio|rubídio|rubidio|relógio atômico|relogio atomico|atomic clock|9\.192|nanossegundo|nanosecond/.test(value)) return {
    eyebrow: 'PADRÃO DE FREQUÊNCIA ATÔMICA', headline: '9.192.631.770 OSCILAÇÕES DEFINEM 1 SEGUNDO',
    stages: ['ÁTOMO CÉSIO-133', 'MICRO-ONDAS', 'TRANSIÇÃO QUÂNTICA', 'SINAL UTC'], takeaway: 'A PRECISÃO DA CIVILIZAÇÃO NASCE NO ÁTOMO', accent: 'blue', preferred: 'PROCESS_CUTAWAY', metric: {value: '9.192 GHz', label: 'RESSONÂNCIA'}
  };
  if (/relatividade|einstein|dilatação|dilatacao|gravitacional|cinemática|cinematica|\+38|38\.7|microssegundos/.test(value)) return {
    eyebrow: 'CORREÇÃO RELATIVÍSTICA', headline: 'A GRAVIDADE E A VELOCIDADE ALTERAM O TEMPO',
    stages: ['-7.2µs VELOCIDADE', '+45.9µs GRAVIDADE', '+38.7µs SALDO LÍQUIDO'], takeaway: 'SEM A CORREÇÃO DE EINSTEIN, O ERRO SERIA DE 11.6 KM/DIA', accent: 'orange', preferred: 'BEFORE_AFTER', metric: {value: '+38.7 µs/dia', label: 'DERIVA LÍQUIDA'}
  };
  if (/trilateração|trilateracao|satélites|satelites|constelação|constelacao|órbita|orbita|20\.200|distância|distancia/.test(value)) return {
    eyebrow: 'GEOMETRIA TEMPORAL', headline: 'D = VELOCIDADE DA LUZ × INTERVALO DE TEMPO',
    stages: ['SINAL EMITIDO', 'TEMPO DE VOO (ΔT)', 'ESFERAS DE DISTÂNCIA', 'PONTO EXATO'], takeaway: 'POSIÇÃO É APENAS O TEMPO DA LUZ NO ESPAÇO', accent: 'blue', preferred: 'FLOW_MAP'
  };
  if (/spoofing|jamming|guerra eletrônica|guerra eletronica|interferência|interferencia|sinal falso/.test(value)) return {
    eyebrow: 'AMEAÇA ELETRÔNICA', headline: 'O SINAL CIVIL DO GPS É FRÁGIL E DESPROTEGIDO',
    stages: ['POTÊNCIA 50 WATTS', '20.000 KM DE DISTÂNCIA', 'SINAL FRACO NO SOLO', 'INTERFERÊNCIA'], takeaway: 'UM TRANSMISSOR CLANDESTINO CEGA UMA REGIÃO', accent: 'orange', preferred: 'BOTTLENECK'
  };

  // 2. FINANÇAS DE ALTA FREQUÊNCIA, PIX & BANCOS
  if (/pix|transação|transacao|banco central|bacen|spb|iso 20022|pagamento|ted|doc/.test(value)) return {
    eyebrow: 'INFRAESTRUTURA DE PAGAMENTOS', headline: 'LIQUIDAÇÃO FINANCEIRA EM TEMPO REAL',
    stages: ['AUTENTICAÇÃO', 'MENSAGERIA ISO 20022', 'SPI / BACEN', 'CRÉDITO NA CONTA'], takeaway: 'A DECISÃO FINANCEIRA OCORRE EM FRAÇÕES DE SEGUNDO', accent: 'blue', preferred: 'FLOW_MAP'
  };
  if (/hft|alta frequência|alta frequencia|wall street|faria lima|ordens|nanosegundos|ordem duplicada/.test(value)) return {
    eyebrow: 'SINCRONISMO HFT', headline: 'QUANDO UM MICROSEGUNDO VALE BILHÕES',
    stages: ['ORDEM ENVIADA', 'CARIMBO TEMPORAL (PTP)', 'MATCHING ENGINE', 'EXECUÇÃO'], takeaway: 'ORDENS SEM CARIMBO SINCRONIZADO CAUSAM CAOS', accent: 'orange', preferred: 'BOTTLENECK'
  };

  // 3. CABOS SUBMARINOS, FIBRA ÓPTICA & TELECOMUNICAÇÕES
  if (/cabo submarino|fibra óptica|fibra optica|erbium|edfa|amplificador|laser|silica/.test(value)) return {
    eyebrow: 'ESTRUTURA FÍSICA DA INTERNET', headline: '99% DO TRÁFEGO MUNDIAL PASSA PELO FUNDO DO OCEANO',
    stages: ['LASER DE SÍLICA', 'AMPLIFICAÇÃO ERBIUM', 'CABO BLINDADO', 'LANDING STATION'], takeaway: 'A NUVEM É FEITA DE CABOS NO ABISSO OCEÂNICO', accent: 'blue', preferred: 'PROCESS_CUTAWAY'
  };
  if (/5g|beamforming|antena|fase|mhz|ghz|largura de banda/.test(value)) return {
    eyebrow: 'SINCRONIZAÇÃO 5G', headline: 'TRANSMISSÃO MILIMÉTRICA EXIGE PRECISÃO TEMPORAL',
    stages: ['ANTENA MIMO', 'SINCRONIA DE FASE', 'BEAM DIRECIONADO', 'DISPOSITIVO'], takeaway: 'DESALINHAMENTO TEMPORAL DERRUBA A REDE MÓVEL', accent: 'blue', preferred: 'STATE_TRANSITION'
  };

  // 4.1 AGRICULTURA DE PRECISAO E DRONES COMERCIAIS
  if (/downwash|vorticidade|efeito solo|microgota|micro-gota|verso da folha|bico centrifugo|bico centrífugo/.test(value)) return {
    eyebrow: 'EVIDENCIA AERODINAMICA', headline: 'O FLUXO DAS HELICES MUDA O CAMINHO DAS GOTAS',
    stages: ['ROTACAO DAS HELICES', 'COLUNA DE AR', 'PENETRACAO NA FOLHAGEM'], takeaway: 'A COBERTURA DEPENDE DO FLUXO OBSERVADO EM CAMPO', accent: 'orange', preferred: 'PROCESS_CUTAWAY'
  };
  if (/lidar|radar milimetrico|radar milimétrico|perfil do terreno|sensor de obstaculo|sensor de obstáculo/.test(value)) return {
    eyebrow: 'LEITURA DO TERRENO', headline: 'O SENSOR MEDE O QUE EXISTE DIANTE DA AERONAVE',
    stages: ['VARREDURA', 'CONTORNO MEDIDO', 'CORRECAO DE ALTURA'], takeaway: 'A ROTA MUDA A PARTIR DE UMA MEDICAO REAL', accent: 'blue', preferred: 'FLOW_MAP'
  };
  if (/bateria|recarga|gerador movel|gerador móvel|estacao movel|estação móvel/.test(value)) return {
    eyebrow: 'CICLO DE ENERGIA', headline: 'A OPERACAO CONTINUA NA TROCA DE BATERIA',
    stages: ['POUSO', 'TROCA', 'RECARGA', 'RETOMADA'], takeaway: 'A ESTACAO MOVEL DEFINE O RITMO DA EQUIPE', preferred: 'STATE_TRANSITION'
  };
  if (/enxame|rtk|gnss|rede mesh|malha de drones/.test(value)) return {
    eyebrow: 'COORDENACAO DE CAMPO', headline: 'POSICAO E ROTA SAO COMPARTILHADAS ENTRE AS AERONAVES',
    stages: ['BASE RTK', 'CORRECAO', 'ROTA INDIVIDUAL', 'AREA COBERTA'], takeaway: 'A PRECISAO APARECE NA GEOMETRIA DAS PASSAGENS', accent: 'blue', preferred: 'FLOW_MAP'
  };
  if (/drone agricola|drone agrícola|octocoptero|octocóptero|pulverizacao autonoma|pulverização autônoma/.test(value)) return {
    eyebrow: 'OPERACAO OBSERVADA', headline: subject,
    stages: ['DECOLAGEM', 'PASSAGEM SOBRE A CULTURA', 'RETORNO A BASE'], takeaway: 'A ACAO FISICA PERMANECE VISIVEL DURANTE A EXPLICACAO', preferred: 'FLOW_MAP'
  };

  // 4. ENERGIA, REDE ELÉTRICA & SMART GRID
  if (/rede elétrica|rede eletrica|subestação|subestacao|60 hz|transformador|apagão|apagao|grid/.test(value)) return {
    eyebrow: 'SINCRONISMO DE FASE DO GRID', headline: 'TODA A ENERGIA PRECISA OSCILAR NA MESMA FASE',
    stages: ['GERAÇÃO', 'SINAIS PMU (FASORES)', 'COMPARAÇÃO TEMPORAL', 'DISTRIBUIÇÃO'], takeaway: 'DESVIO DE FASE DESCONECTA SUBESTAÇÕES EM CASCATA', accent: 'orange', preferred: 'DELAY_PROPAGATION'
  };

  // 5. GARGALOS, VULNERABILIDADES & COLAPSO SISTÊMICO
  if (/gargalo|colapso|falha|vulnerabilidade|apagão|estrangulamento|crise|ponto único/.test(value)) return {
    eyebrow: 'PONTO CRÍTICO DE FALHA', headline: 'A REDE É TÃO FORTE QUANTO SEU ELO MAIS ESTREITO',
    stages: ['FLUXO NORMAL', 'PONTO DE TENSÃO', 'ESTRANGULAMENTO', 'COLAPSO'], takeaway: 'UM ÚNICO NÓ PODE PARAR TODO O SISTEMA', accent: 'orange', preferred: 'BOTTLENECK'
  };

  // 6. ENGENHARIA DE COMBUSTÍVEL E FLUXOS INDUSTRIAIS (LEGACY PRESERVED)
  if (/receipt|entering airport storage|airport boundary/.test(value) && !/custody|record remain attached/.test(value)) return {
    eyebrow: 'CONTROLLED RECEIPT', headline: 'ARRIVAL IS NOT AVAILABILITY',
    stages: ['ARRIVES', 'IDENTIFIED', 'ACCEPTED'], takeaway: 'THE GATE DECIDES WHAT ENTERS STORAGE', preferred: 'STATE_TRANSITION'
  };
  if (/inventory|tank levels labeled|settling|available for dispatch/.test(value)) return {
    eyebrow: 'INVENTORY STATE', headline: 'THE TOTAL IS NOT THE USABLE AMOUNT',
    stages: ['RECEIVED', 'SETTLING / CHECK', 'AVAILABLE'], takeaway: 'AVAILABILITY IS A STATE, NOT A NUMBER', preferred: 'CAPACITY_VS_AVAILABILITY', metric: {value: '3', label: 'DIFFERENT STATES'}
  };
  if (/storage|buffer|absorb uneven|buys time/.test(value) && !/tank constraint/.test(value)) return {
    eyebrow: 'TIMING BUFFER', headline: 'STORAGE ABSORBS UNEVEN ARRIVALS',
    stages: ['PULSED ARRIVAL', 'BUFFER', 'STEADY RELEASE'], takeaway: 'MORE VOLUME BUYS TIME, NOT FLOW', preferred: 'CAPACITY_VS_AVAILABILITY'
  };
  if (/capacity scales|explain_design|future demand/.test(value)) return {
    eyebrow: 'DESIGN INPUTS', headline: 'CAPACITY IS SIZED FOR UNCERTAINTY',
    stages: ['SUPPLY RELIABILITY', 'AIRCRAFT MIX', 'FUTURE DEMAND'], takeaway: 'THE TANK IS DESIGNED AROUND THE NETWORK', preferred: 'EVIDENCE_CARD'
  };
  if (/control.room|dashboard|visibility|decision view|alert/.test(value)) return {
    eyebrow: 'OPERATING PICTURE', headline: 'SIGNALS BECOME ONE DECISION',
    stages: ['INVENTORY', 'SYSTEM STATE', 'DEMAND'], takeaway: 'VISIBILITY SHORTENS THE RESPONSE', accent: 'blue', direction: 'CONVERGE', preferred: 'EVIDENCE_CARD'
  };
  if (/human.factor|operator actions|people and time/.test(value)) return {
    eyebrow: 'HUMAN CONTROL', headline: 'HARDWARE STILL NEEDS DECISIONS',
    stages: ['READ', 'DECIDE', 'ACT'], takeaway: 'TRAINING IS PART OF THE INFRASTRUCTURE', preferred: 'EVIDENCE_CARD'
  };
  if (/fuel order|aircraft identity|requested amount|tank distribution/.test(value)) return {
    eyebrow: 'VERIFIED ORDER', headline: 'FOUR FACTS DEFINE ONE DELIVERY',
    stages: ['AIRCRAFT', 'FUEL GRADE', 'QUANTITY', 'TANK SPLIT'], takeaway: 'THE ORDER CONNECTS REQUEST TO AIRCRAFT', accent: 'blue', preferred: 'EVIDENCE_CARD'
  };
  if (/custody|handoff|identity card|batch identity|record remain attached/.test(value)) return {
    eyebrow: 'BATCH IDENTITY', headline: 'LIQUID AND RECORD MOVE TOGETHER',
    stages: ['SUPPLIER', 'TERMINAL', 'TRANSPORT', 'AIRPORT'], takeaway: 'EVERY HANDOFF CHANGES RESPONSIBILITY', direction: 'FORWARD', preferred: 'FLOW_MAP'
  };
  if (/five transport|compare_routes|supply paths|pipeline flow and bridger/.test(value)) return {
    eyebrow: 'ROUTE OPTIONS', headline: 'THERE IS NO UNIVERSAL PATH',
    stages: ['PIPELINE', 'SHIP / BARGE', 'RAIL', 'ROAD'], takeaway: 'GEOGRAPHY AND SCALE CHOOSE THE ROUTE', direction: /converge/.test(value) ? 'CONVERGE' : 'DIVERGE', preferred: 'BRANCHING_ROUTES'
  };
  if (/hydrant loop|fuel farm pumps|underground hydrant/.test(value)) return {
    eyebrow: 'UNDERGROUND DELIVERY', headline: 'THE APRON HIDES A PIPE NETWORK',
    stages: ['FUEL FARM', 'HYDRANT LOOP', 'STAND PIT', 'AIRCRAFT'], takeaway: 'THE DISPENSER CONNECTS, IT DOES NOT CARRY', preferred: 'FLOW_MAP'
  };
  if (/refueler truck|remote aircraft stand/.test(value)) return {
    eyebrow: 'MOBILE DELIVERY', headline: 'THE VEHICLE CARRIES THE INVENTORY',
    stages: ['LOADING RACK', 'REFUELER', 'REMOTE STAND'], takeaway: 'DISTANCE BECOMES PART OF CAPACITY', preferred: 'FLOW_MAP'
  };
  if (/compare_systems|hydrant and refueler routes/.test(value)) return {
    eyebrow: 'TWO ROUTES', headline: 'DIFFERENT SYSTEMS. SAME FINAL CONNECTION.',
    stages: ['HYDRANT', 'VERSUS', 'REFUELER'], takeaway: 'BOTH END BENEATH THE WING', direction: 'CONVERGE', preferred: 'BEFORE_AFTER'
  };
  if (/parallel_turnaround|catering, baggage|boarding and technical/.test(value)) return {
    eyebrow: 'TURNAROUND CLOCK', headline: 'FOUR OPERATIONS SHARE ONE DEADLINE',
    stages: ['FUEL', 'BAGGAGE', 'BOARDING', 'TECHNICAL'], takeaway: 'THE SLOWEST PATH CAN HOLD THE FLIGHT', direction: 'PARALLEL', preferred: 'PARALLEL_TURNAROUND'
  };
  if (/explain_completion|transfer stops|hose disconnects|service zone clears/.test(value)) return {
    eyebrow: 'DELIVERY COMPLETE', headline: 'FLOW ENDS BEFORE THE AIRCRAFT IS READY',
    stages: ['STOP', 'CONFIRM', 'DISCONNECT', 'CLEAR'], takeaway: 'COMPLETION IS A VERIFIED SEQUENCE', preferred: 'STATE_TRANSITION'
  };
  if (/peak demand|demand curve|simultaneous departures/.test(value)) return {
    eyebrow: 'PEAK DEMAND', headline: 'SMOOTH DEMAND BECOMES A SHARP BANK',
    stages: ['NORMAL FLOW', 'DEPARTURE BANK', 'PEAK LOAD'], takeaway: 'SIMULTANEITY CREATES THE PRESSURE', accent: 'orange', preferred: 'BOTTLENECK', metric: {value: 'PEAK', label: 'SIMULTANEOUS CALLS'}
  };
  if (/bottleneck|constraint|throughput|congested|usable capacity|outbound throughput/.test(value) && !/trace_propagation|connect_consequence|human_consequence/.test(value)) return {
    eyebrow: 'ACTIVE CONSTRAINT', headline: 'INVENTORY CAN BE HIGH WHILE FLOW IS LOW',
    stages: ['SUPPLY', 'NARROW HANDOFF', 'DEMAND'], takeaway: 'THE SMALLEST ACTIVE STEP SETS THROUGHPUT', accent: 'orange', preferred: 'BOTTLENECK'
  };
  if (/tank constraint|one storage tank receives|third feeds/.test(value)) return {
    eyebrow: 'TANK CONFIGURATION', headline: 'THREE TANKS. ONLY ONE FEEDS DEMAND.',
    stages: ['RECEIVING', 'UNAVAILABLE', 'DISPATCHING'], takeaway: 'CONFIGURATION CHANGES USABLE CAPACITY', accent: 'orange', preferred: 'CAPACITY_VS_AVAILABILITY'
  };
  if (/route constraint|pipeline stops|truck deliveries/.test(value)) return {
    eyebrow: 'ROUTE FAILURE', headline: 'TRUCKS REPLACE ONLY PART OF THE FLOW',
    stages: ['PIPELINE STOPS', 'TRUCKS RESPOND', 'GAP REMAINS'], takeaway: 'BACKUP CAPACITY IS NOT AUTOMATIC', accent: 'orange', preferred: 'BEFORE_AFTER'
  };
  if (/quality constraint|verification hold|failed verification|status change/.test(value)) return {
    eyebrow: 'STATUS CHANGE', headline: 'ONE HOLD REMOVES USABLE CAPACITY',
    stages: ['AVAILABLE', 'QUESTION RAISED', 'ISOLATED'], takeaway: 'SAFETY PROTECTS THE SYSTEM BY STOPPING IT', accent: 'orange', preferred: 'STATE_TRANSITION'
  };
  if (/vehicle constraint|aircraft calls compete|refuelers/.test(value)) return {
    eyebrow: 'FLEET CONSTRAINT', headline: 'THREE CALLS COMPETE FOR TWO VEHICLES',
    stages: ['3 AIRCRAFT', '2 REFUELERS', 'TRAVEL TIME'], takeaway: 'THE QUEUE MOVES WITH THE VEHICLES', accent: 'orange', preferred: 'BOTTLENECK', metric: {value: '3 : 2', label: 'CALLS TO VEHICLES'}
  };
  if (/propagation|local fueling delay|departure readiness|downstream/.test(value)) return {
    eyebrow: 'DELAY PROPAGATION', headline: 'A LOCAL DELAY DOES NOT STAY LOCAL',
    stages: ['FUEL DISPATCH', 'GATE READY', 'DEPARTURE', 'NEXT ROTATION'], takeaway: 'TIME MOVES THROUGH THE NETWORK', accent: 'orange', preferred: 'DELAY_PROPAGATION'
  };
  if (/recovery|rerouting|resequencing/.test(value)) return {
    eyebrow: 'RECOVERY', headline: 'OPERATIONS CREATE A NEW PATH',
    stages: ['REROUTE', 'RESEQUENCE', 'USE MARGIN'], takeaway: 'RECOVERY SPENDS OPTIONS AND TIME', direction: 'DIVERGE', preferred: 'BRANCHING_ROUTES'
  };
  if (/redundancy|two upstream routes|alternatives/.test(value)) return {
    eyebrow: 'REDUNDANCY', headline: 'ALTERNATIVES ROUTE AROUND THE FAILURE',
    stages: ['ROUTE A', 'FAILED SEGMENT', 'ROUTE B'], takeaway: 'REDUNDANCY PRESERVES CONTINUITY', direction: 'DIVERGE', preferred: 'BRANCHING_ROUTES'
  };
  if (/reverse.flow|complete map|refinery production|refinery|final route|dispatch path|toward the apron/.test(value)) return {
    eyebrow: 'SYSTEM MAP', headline: /reverse/.test(value) ? 'FOLLOW THE CHAIN BACKWARD' : 'FOLLOW THE FLOW FORWARD',
    stages: ['REFINERY', 'TERMINAL', 'FUEL FARM', 'WING'], takeaway: 'EVERY LINK MUST HAND OFF TO THE NEXT', direction: /reverse/.test(value) ? 'REVERSE' : 'FORWARD', preferred: 'FLOW_MAP'
  };
  if (/same fuel map|limitation/.test(value)) return {
    eyebrow: 'SYSTEM VARIATION', headline: 'THE PRINCIPLES REPEAT. THE MAP DOES NOT.',
    stages: ['GEOGRAPHY', 'SCALE', 'INFRASTRUCTURE'], takeaway: 'EACH AIRPORT CONFIGURES THE CHAIN DIFFERENTLY', preferred: 'BEFORE_AFTER'
  };
  if (/chapter_reframe|open_question|partial_payoff|conclusion|synchronization|continuity|hose is the end/.test(value)) return {
    eyebrow: 'SYSTEM REFRAME', headline: subject,
    stages: ['VISIBLE EVENT', 'HIDDEN CHAIN', 'OPERATIONAL RESULT'], takeaway: 'THE OUTCOME DEPENDS ON SYNCHRONIZATION', preferred: 'BEFORE_AFTER'
  };
  const factualStages = subject
    .split(/\s*(?:->|→|;|,)\s*|\s+(?:then|depois|seguido de)\s+/i)
    .map((part) => part.trim())
    .filter((part, index, parts) => part.length >= 3 && parts.indexOf(part) === index)
    .slice(0, 4);
  return {
    eyebrow: 'EVIDENCIA DECLARADA', headline: subject,
    stages: factualStages.length ? factualStages : [subject],
    takeaway: 'O GRAFISMO DEVE PERMANECER VINCULADO A EVIDENCIA', preferred: 'EVIDENCE_CARD'
  };
}

function templateFor(story: MotionStory, variant: HslMotionDesignInput['variant']): HslMotionTemplate {
  if (variant === 'PROCESS') return story.preferred;
  if (variant === 'DETAIL') {
    if (story.preferred === 'PROCESS_CUTAWAY' || story.preferred === 'EVIDENCE_CARD') return story.preferred;
    if (story.preferred === 'BOTTLENECK' || story.preferred === 'CAPACITY_VS_AVAILABILITY') return story.preferred;
    return 'EVIDENCE_CARD';
  }
  if (variant === 'CONSEQUENCE') {
    if (story.preferred === 'DELAY_PROPAGATION') return story.preferred;
    if (story.preferred === 'STATE_TRANSITION') return story.preferred;
    return 'BEFORE_AFTER';
  }
  if (story.preferred === 'PROCESS_CUTAWAY' || story.preferred === 'STATE_TRANSITION') return 'FLOW_MAP';
  return story.preferred;
}

export function buildMotionDesign(input: HslMotionDesignInput): HslMotionDesign {
  const story = storyFor(input);
  const headline = story.headline.length > 72 ? `${story.headline.slice(0, 69).trim()}...` : story.headline;
  const stages = story.stages.slice(0, 5).map((stage) => stage.length > 26 ? `${stage.slice(0, 23).trim()}...` : stage);
  const template = templateFor(story, input.variant);
  const beatPercents: Record<HslMotionTemplate, readonly [number, number, number, number]> = {
    FLOW_MAP: [8, 31, 58, 84], BRANCHING_ROUTES: [7, 29, 55, 86], PROCESS_CUTAWAY: [10, 34, 62, 85],
    STATE_TRANSITION: [9, 36, 64, 87], CAPACITY_VS_AVAILABILITY: [8, 32, 60, 84], BOTTLENECK: [7, 35, 63, 88],
    PARALLEL_TURNAROUND: [8, 28, 56, 86], DELAY_PROPAGATION: [6, 30, 61, 89], BEFORE_AFTER: [10, 42, 67, 88],
    EVIDENCE_CARD: [11, 37, 66, 86],
  };
  const cues = beatPercents[template];
  return {
    schema: 'hsl.motion-design.v2', schema_version: '2.0.0', template,
    accent: story.accent || 'yellow', eyebrow: story.eyebrow, headline, stages, takeaway: story.takeaway,
    direction: story.direction || 'FORWARD', metric: story.metric,
    beats: [
      {at_percent: cues[0], text: headline, role: 'QUESTION'},
      {at_percent: cues[1], text: stages[0] || headline, role: 'MECHANISM'},
      {at_percent: cues[2], text: stages[Math.min(1, stages.length - 1)] || headline, role: 'CHANGE'},
      {at_percent: cues[3], text: story.takeaway, role: 'CONSEQUENCE'}
    ]
  };
}
