import fs from 'fs';
import path from 'path';

type Asset = 'REALISTIC_IMAGE' | 'VIDEO' | 'MOTION_GRAPHICS' | 'MOTION_IMAGE';
type Canon = 'matter' | 'evidence' | 'maps' | 'reveal';
type Seed = [number, string, string, string, Asset, Canon];

const chapters = [
  'A CORRIDA COMEÇA',
  'RESFRIAR ANTES QUE SEJA TARDE',
  'O TANQUE E O LABORATÓRIO',
  'CALOR CONTROLADO',
  'A EMBALAGEM NÃO TRABALHA SOZINHA',
  'A VALIDADE É UMA CADEIA'
] as const;

const seeds: Seed[] = [
  [1, 'fresh raw milk flowing through a closed stainless-steel receiver at a present-day dairy farm', 'the white stream moves continuously through a transparent sanitary sight glass', 'Quando o leite sai da vaca, começa uma corrida contra milhões de microrganismos que já estavam no ambiente.', 'VIDEO', 'matter'],
  [1, 'macro view of warm raw milk droplets on the inner wall of a sanitized stainless-steel pipe', 'condensation beads remain visible beside the fresh milk film', 'Ele nasce quente, perto da temperatura do corpo, onde a multiplicação microbiana pode acelerar.', 'REALISTIC_IMAGE', 'evidence'],
  [1, 'flat technical time-temperature chart anchored to a real stainless dairy tank photograph', 'restrained lines mark elapsed time and measured temperature', 'A partir desse instante, cada minuto e cada grau ajudam a decidir quanto tempo esse litro continuará seguro.', 'MOTION_GRAPHICS', 'reveal'],
  [1, 'present-day insulated bulk milk cooling tank inside a clean Brazilian dairy milk room', 'the vessel, sanitary pipes and practical wall lighting remain fully observable', 'A primeira máquina invisível não é a embalagem. É o tanque onde o leite começa a ser resfriado.', 'REALISTIC_IMAGE', 'matter'],
  [1, 'documentary view through the inspection glass of a bulk milk tank agitator', 'the stainless agitator rotates slowly through the milk surface', 'Pás lentas misturam o volume para que nenhuma parte fique quente demais.', 'VIDEO', 'matter'],
  [1, 'cutaway documentary image of the real cooling jacket around a stainless bulk milk tank', 'thin audit lines trace heat leaving the metal wall toward the refrigeration circuit', 'Uma camisa térmica retira calor sem tocar diretamente no alimento.', 'MOTION_IMAGE', 'evidence'],
  [1, 'sealed raw milk sample vial beside a stainless sampling port', 'the vial, tamper seal and port fill a macro evidence frame', 'Uma pequena amostra acompanha o lote como testemunha química e microbiológica do percurso.', 'REALISTIC_IMAGE', 'evidence'],
  [1, 'insulated milk tanker parked at a real dairy reception bay with rural access road visible', 'the tanker, reception canopy and route geometry share the wide frame', 'Dali, o litro entra numa rota que liga propriedades rurais, estradas e a plataforma da indústria.', 'REALISTIC_IMAGE', 'maps'],
  [2, 'milking cluster attached to a dairy cow udder inside a present-day parlor with no humans present', 'closed liners and milk tubes remain clearly visible beneath the animal', 'A ordenha moderna reduz contato com o ar usando conjuntos fechados, mangueiras sanitárias e vácuo controlado.', 'REALISTIC_IMAGE', 'matter'],
  [2, 'raw milk moving through a transparent sanitary section of a closed milking pipeline', 'pulses of milk and air alternate visibly inside the line', 'O leite atravessa tubulações fechadas enquanto o fluxo pulsa no ritmo do equipamento.', 'VIDEO', 'matter'],
  [2, 'stainless plate pre-cooler connected to sanitary milk piping and a real water circuit', 'parallel plates, valves and condensation are visible under practical light', 'Placas metálicas podem antecipar a retirada de calor e aliviar o sistema de refrigeração.', 'REALISTIC_IMAGE', 'matter'],
  [2, 'documentary thermal curve over a real bulk milk tank and calibrated probe', 'the graph descends from body temperature toward the refrigerated control band', 'A curva precisa cair rápido para desacelerar o crescimento microbiano.', 'MOTION_GRAPHICS', 'evidence'],
  [2, 'working refrigeration condenser and compressor serving a dairy bulk milk tank', 'condenser fans spin while copper lines vibrate subtly', 'Compressor e condensador expulsam para o ambiente o calor retirado daquele volume.', 'VIDEO', 'matter'],
  [2, 'calibrated temperature probe and analog backup gauge mounted on a bulk milk tank', 'probe tip, cable seal and gauge face are shown in macro focus', 'O termômetro registra se o lote chegou à faixa de conservação planejada.', 'REALISTIC_IMAGE', 'evidence'],
  [2, 'flat cartographic route connecting several dairy farms to one processing plant', 'thin route lines follow real roads and mark collection points', 'Em mapas de coleta, distância vira tempo. E tempo, sem frio, vira risco acumulado.', 'MOTION_IMAGE', 'maps'],
  [2, 'sealed sanitary hatch, gasket and outlet valve on a bulk milk tank', 'the intact seal and clean contact surfaces fill the frame', 'Tampas, juntas e válvulas precisam ficar fechadas porque uma entrada suja pode comprometer o lote.', 'REALISTIC_IMAGE', 'matter'],
  [3, 'locked sanitary hose coupling between a bulk tank and an insulated milk tanker with no humans present', 'milk moves through the closed hose while the coupling remains stable', 'Na coleta, a mangueira conecta tanque e caminhão sem expor o leite ao ambiente.', 'VIDEO', 'matter'],
  [3, 'sectioned view of an insulated stainless milk tanker showing sealed compartments', 'insulation, internal baffles and sanitary outlet are physically visible', 'O caminhão-tanque preserva o frio conquistado, mas não corrige leite que já saiu quente demais.', 'REALISTIC_IMAGE', 'matter'],
  [3, 'flat logistics map of a milk tanker collecting from multiple rural points', 'route segments appear sequentially with restrained time markers', 'Cada parada soma quilômetros, volumes e relógios diferentes dentro do mesmo roteiro.', 'MOTION_GRAPHICS', 'maps'],
  [3, 'insulated stainless milk tanker traveling on a real Brazilian rural highway', 'the tanker follows a curve while the camera tracks laterally', 'Na estrada, o litro viaja dentro de paredes metálicas sem poder quebrar a cadeia térmica.', 'VIDEO', 'maps'],
  [3, 'automated dairy laboratory sample rack beside milk analyzer instruments with no people present', 'sealed vials, analyzer ports and calibration controls are visible', 'Antes da descarga, novas amostras medem composição, acidez e sinais de contaminação.', 'REALISTIC_IMAGE', 'evidence'],
  [3, 'paired close-up of a dairy hydrometer cylinder and titration flask containing milk samples', 'a restrained comparison line aligns the two physical measurements', 'Densidade e acidez revelam alterações que a cor branca sozinha esconderia.', 'MOTION_IMAGE', 'reveal'],
  [3, 'automated milk analyzer carousel inside a dairy intake laboratory with no humans present', 'the sample carousel indexes one position and the instrument door closes', 'Equipamentos automatizados repetem leituras para decidir se o lote pode entrar na fábrica.', 'REALISTIC_IMAGE', 'matter'],
  [3, 'dairy antibiotic residue test strip and sealed control ampoule on a clean laboratory bench', 'the test window and control marking remain visible with no brand text', 'Resíduos de antibióticos podem interromper fermentações e indicar que o leite não deveria seguir.', 'REALISTIC_IMAGE', 'evidence'],
  [3, 'flat audit flow built around a real milk sample, intake valve and quarantine tank photograph', 'three thin paths identify release, segregation and rejection', 'O resultado cria uma bifurcação: liberar, segregar ou rejeitar. A embalagem ainda nem apareceu.', 'MOTION_GRAPHICS', 'reveal'],
  [4, 'wide elevated view of a real dairy plant reception area and connected stainless process lines', 'pipe geometry traces the physical route from tanker bay to processing hall', 'Aprovado, o leite entra na indústria por linhas fechadas que ligam recepção e tratamento.', 'VIDEO', 'maps'],
  [4, 'opened industrial plate heat exchanger used for milk pasteurization', 'gaskets, corrugated plates and sanitary connections are sharply observable', 'No pasteurizador, muitas placas finas criam grande área de troca de calor em pouco espaço.', 'REALISTIC_IMAGE', 'matter'],
  [4, 'technical pasteurization curve over real heat exchanger plates and a calibrated holding tube', 'the 72 to 75 degree band and 15 to 20 second interval appear as audit marks', 'Na pasteurização rápida, o leite pode passar por 72 a 75 graus durante 15 a 20 segundos.', 'MOTION_GRAPHICS', 'evidence'],
  [4, 'sanitary flow-diversion valve and holding tube in an operating milk pasteurization line', 'the valve actuator changes position while milk continues through closed pipes', 'Se a temperatura cair, uma válvula desvia o leite para repetir o tratamento.', 'VIDEO', 'matter'],
  [4, 'real milk sample beside restrained before-and-after microbial count plates', 'a subtle comparison reveals reduction without fictional microbes', 'O calor reduz microrganismos perigosos, mas não transforma leite pasteurizado em produto eterno.', 'MOTION_IMAGE', 'reveal'],
  [4, 'industrial milk homogenizer valve assembly with high-pressure sanitary piping', 'the valve block, pressure housing and outlet line are clearly observable', 'A homogeneização quebra glóbulos de gordura para evitar separação visível.', 'REALISTIC_IMAGE', 'matter'],
  [4, 'operating UHT milk processing skid with steam lines, heat exchanger and sterile piping', 'steam valves pulse and condensate moves through the real process skid', 'No UHT, o choque é mais intenso: temperatura muito alta por poucos segundos.', 'VIDEO', 'matter'],
  [4, 'UHT time-temperature diagram anchored to a real sterile holding tube and cooling section', 'axes mark 130 to 150 degrees for two to four seconds and rapid cooling', 'A referência industrial fica entre 130 e 150 graus por dois a quatro segundos.', 'MOTION_GRAPHICS', 'evidence'],
  [4, 'sterile surge tank, filtered air assembly and aseptic milk piping inside a real filling area', 'sealed connections and practical clean-room surfaces remain visible', 'Depois do calor, tanque e tubulações protegem o produto contra uma nova contaminação.', 'REALISTIC_IMAGE', 'matter'],
  [5, 'aseptic milk carton forming machine behind transparent safety guards with no people present', 'packaging web advances while one carton body is folded', 'Só agora a embalagem entra em cena, formada e sincronizada com o fluxo do produto.', 'VIDEO', 'matter'],
  [5, 'macro cross-section of real multilayer aseptic milk carton material', 'paper fiber, polymer films and thin aluminum barrier are distinguishable', 'Papel, polímeros e alumínio trabalham contra luz, oxigênio, umidade e vazamentos.', 'REALISTIC_IMAGE', 'matter'],
  [5, 'real aseptic carton layer sample beside a sealed seam', 'thin audit lines connect each physical layer to its protective function', 'Essas camadas não matam microrganismos; elas preservam o resultado do processo térmico.', 'MOTION_IMAGE', 'matter'],
  [5, 'aseptic milk filling and top-sealing station operating with no people present', 'cartons advance, fill and seal in a continuous mechanical cycle', 'O enchimento ocorre em ambiente controlado e a selagem fecha cada unidade.', 'VIDEO', 'matter'],
  [5, 'industrial lot-code printer marking sealed milk cartons on a real conveyor', 'the print head pulses while cartons move beneath it with unreadable text', 'Código de lote e data ligam aquela caixa aos testes e condições registrados.', 'REALISTIC_IMAGE', 'matter'],
  [5, 'split flat logistics map linking one dairy plant to refrigerated and ambient routes', 'cold and ambient route lines remain cartographic and restrained', 'O pasteurizado continua refrigerado; o UHT fechado pode seguir pela rota ambiente.', 'MOTION_GRAPHICS', 'maps'],
  [5, 'refrigerated dairy truck carrying sealed milk crates on a real distribution road', 'the vehicle enters a cold-store loading bay under ordinary daylight', 'No leite pasteurizado, caminhão e câmara fria mantêm a corrida até o ponto de venda.', 'VIDEO', 'maps'],
  [5, 'supermarket refrigerated milk shelf with sealed cartons and no shoppers present', 'evaporator vents, shelf thermometer and product rows remain visible', 'Na loja, a geladeira é a última máquina comercial antes de o litro chegar até você.', 'REALISTIC_IMAGE', 'matter'],
  [6, 'opened milk carton stored on an interior refrigerator shelf with no people present', 'a restrained clock marker appears beside the cap and cold-air vent', 'Em casa, abrir a embalagem inicia uma nova contagem.', 'MOTION_IMAGE', 'matter'],
  [6, 'sealed pasteurized milk bottle developing condensation beside a refrigerator with no people present', 'condensation grows while the practical room remains still', 'Tempo demais fora do frio reduz a margem criada pela indústria.', 'VIDEO', 'matter'],
  [6, 'opened UHT milk carton standing upright on a clean refrigerator shelf', 'the open cap, cold vent and interior thermometer are observable', 'Mesmo o UHT precisa de geladeira depois de aberto, porque a barreira foi rompida.', 'REALISTIC_IMAGE', 'matter'],
  [6, 'flat audit triangle over a real milk pipe, thermometer and sealed sample vial', 'each side links time, temperature or contamination to one physical object', 'No centro do sistema existe um triângulo: tempo, temperatura e contaminação.', 'MOTION_GRAPHICS', 'reveal'],
  [6, 'macro documentary view of spoiled milk curdling inside a clear laboratory glass', 'small curds form and separate from the liquid in real time', 'Quando a proteção falha, proteínas se agregam, a acidez sobe e o líquido pode coalhar.', 'VIDEO', 'evidence'],
  [6, 'sealed aseptic UHT carton beside a refrigerated pasteurized milk bottle', 'package seams, cold condensation and storage symbols remain observable', 'Duas caixas parecidas podem exigir cuidados diferentes porque processo e logística não são iguais.', 'REALISTIC_IMAGE', 'matter'],
  [6, 'sealed milk carton crossing an automated seal inspection checkpoint with no people present', 'the carton moves through the sensor arch and continues on the conveyor', 'O último controle verifica passagem, selagem e rastreabilidade antes da saída.', 'VIDEO', 'matter'],
  [6, 'one-liter milk carton among real artifacts from cooling, transport, testing, heating and filling', 'a restrained route line connects tank, tanker, sample vial, heat exchanger and carton', 'A validade do leite não vem da embalagem; ela é fabricada por uma cadeia de tempo e temperatura.', 'MOTION_IMAGE', 'matter']
];

if (seeds.length !== 50) throw new Error(`MILK_SCENE_COUNT_INVALID:${seeds.length}`);

const assetCounts = seeds.reduce<Record<Asset, number>>((acc, seed) => {
  acc[seed[4]]++;
  return acc;
}, {REALISTIC_IMAGE: 0, VIDEO: 0, MOTION_GRAPHICS: 0, MOTION_IMAGE: 0});
const expectedAssets = {REALISTIC_IMAGE: 20, VIDEO: 15, MOTION_GRAPHICS: 8, MOTION_IMAGE: 7};
for (const key of Object.keys(expectedAssets) as Asset[]) {
  if (assetCounts[key] !== expectedAssets[key]) throw new Error(`MILK_VISUAL_MIX_INVALID:${key}:${assetCounts[key]}`);
}

const canonCounts = seeds.reduce<Record<Canon, number>>((acc, seed) => {
  acc[seed[5]]++;
  return acc;
}, {matter: 0, evidence: 0, maps: 0, reveal: 0});
const expectedCanon = {matter: 28, evidence: 10, maps: 7, reveal: 5};
if (JSON.stringify(canonCounts) !== JSON.stringify(expectedCanon)) {
  throw new Error(`MILK_CANON_MIX_INVALID:${JSON.stringify(canonCounts)}`);
}

const contract = {
  episodeId: 'leite-cadeia-frio',
  title: 'Por que o leite não estraga antes de chegar à sua geladeira?',
  theme: 'A corrida física de um litro de leite contra tempo, temperatura e contaminação',
  domainTags: ['milk', 'dairy-farm', 'cold-chain', 'pasteurization', 'uht', 'aseptic-packaging', 'food-safety', 'brazil'],
  targetDurationSeconds: 360,
  minDurationRatio: 0.9,
  minScenes: 50,
  requiredStages: ['narration', 'visuals', 'sfx', 'music', 'mix', 'thumbnail', 'render', 'cinematic_grade'],
  voiceProfile: 'ElevenLabs Chris iP95p4xoKVk53GoZ742B',
  musicMood: 'field documentary cold-chain restrained mechanical pulse',
  sfxDensity: 'narrative sparse',
  visualMix: {
    targetPercentages: {realisticImages: 40, videos: 30, motionGraphics: 15, motionImages: 15},
    plannedCounts: {realisticImages: 20, videos: 15, motionGraphics: 8, motionImages: 7}
  },
  startFramePeoplePolicy: 'FORBIDDEN'
};

const scenes = seeds.map((seed, index) => {
  const [chapter, subject, action, voiceover, asset, canon] = seed;
  const sceneId = `LEITE_${String(index + 1).padStart(3, '0')}`;
  return {
    sceneId,
    episodeId: contract.episodeId,
    chapterId: `CH${chapter}`,
    chapterTitle: chapters[chapter - 1],
    voiceover,
    visualSubject: subject,
    visual_must_include: [subject, action],
    visual_must_not: [
      `unrelated generic dairy advertising in ${sceneId}`,
      `substituting ${subject} with an icon or abstract symbol`,
      `static showroom pose instead of ${action}`
    ],
    required_category: `milk_chain_${String(index + 1).padStart(3, '0')}`,
    canon_category: canon,
    visual_asset_class: asset,
    take_type: asset === 'VIDEO' ? 'CINEMATIC_TAKE' : 'KEYFRAME_DOSSIER',
    targetSeconds: 7.2,
    domainTags: contract.domainTags,
    allowed_sources: asset === 'VIDEO' ? ['firefly'] : ['dossier']
  };
});

const sources = {
  episodeId: contract.episodeId,
  checkedAt: '2026-09-01',
  sources: [
    {
      authority: 'Ministério da Agricultura e Pecuária — IN 76/2018, texto consolidado',
      supports: ['recepção, conservação e qualidade microbiológica do leite cru refrigerado'],
      url: 'https://www.gov.br/agricultura/pt-br/assuntos/inspecao/produtos-animal/legislacao/IN762018RTIQLeite.pdf'
    },
    {
      authority: 'RIISPOA — Decreto 9.013/2017, com alterações',
      supports: ['pasteurização rápida a 72–75 °C por 15–20 s', 'UHT a 130–150 °C por 2–4 s', 'envase asséptico'],
      url: 'https://www.rj.gov.br/agricultura/sites/default/files/2022-07/RIISPOA.pdf'
    },
    {
      authority: 'MAPA — Manual de inspeção do leite e derivados',
      supports: ['inspeção e controles de processo do leite e derivados'],
      url: 'https://wikisda.agricultura.gov.br/Inspe%C3%A7%C3%A3o-Animal/Produto-Origem-Animal/manual_leite'
    }
  ]
};

const outputDir = path.join(process.cwd(), 'contracts', 'episodes');
fs.mkdirSync(outputDir, {recursive: true});
fs.writeFileSync(path.join(outputDir, `${contract.episodeId}.episode.json`), `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(outputDir, `${contract.episodeId}.scenes.json`), `${JSON.stringify(scenes, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(outputDir, `${contract.episodeId}.sources.json`), `${JSON.stringify(sources, null, 2)}\n`, 'utf8');

process.stdout.write(`${JSON.stringify({episodeId: contract.episodeId, scenes: scenes.length, visualMix: assetCounts, canonMix: canonCounts}, null, 2)}\n`);
