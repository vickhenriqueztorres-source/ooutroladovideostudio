import fs from 'fs';
import path from 'path';
import {validateCanonBalance} from '../pipeline/canonBalanceCheck';
import {
  ENERGIA_IA_EPISODE_ID,
  ENERGIA_IA_RUN_ID,
  ENERGIA_IA_SCENES,
  ENERGIA_IA_TOTAL_SECONDS,
} from '../episodes/energiaIaDataCentersBlueprint';

const root = process.cwd();

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function main(): void {
  if (ENERGIA_IA_SCENES.length !== 75) {
    throw new Error(`ENERGIA_IA_SCENE_COUNT_INVALID:${ENERGIA_IA_SCENES.length}`);
  }

  const balance = validateCanonBalance(ENERGIA_IA_SCENES, {throwOnViolation: true});
  const episodeContract = {
    episodeId: ENERGIA_IA_EPISODE_ID,
    title: 'Quanta Energia Custa Uma Resposta da IA?',
    theme: 'A cadeia física entre uma pergunta para IA e a infraestrutura elétrica que sustenta seu cálculo',
    domainTags: ['artificial-intelligence', 'data-center', 'gpu', 'electricity', 'cooling', 'power-grid', 'brazil'],
    targetDurationSeconds: ENERGIA_IA_TOTAL_SECONDS,
    minDurationRatio: 0.9,
    minScenes: ENERGIA_IA_SCENES.length,
    requiredStages: ['narration', 'visuals', 'sfx', 'music', 'mix', 'thumbnail', 'render', 'cinematic_grade'],
    voiceProfile: 'ElevenLabs Chris iP95p4xoKVk53GoZ742B',
    musicMood: 'field documentary electrical infrastructure restrained',
    sfxDensity: 'narrative sparse',
  };

  const sceneContracts = ENERGIA_IA_SCENES.map((scene) => ({
    ...scene,
    episodeId: ENERGIA_IA_EPISODE_ID,
    domainTags: ['artificial-intelligence', 'data-center', 'gpu', 'electricity', 'cooling', 'power-grid', 'brazil'],
    allowed_sources: ['firefly'],
  }));

  writeJson(path.join(root, 'contracts', 'episodes', `${ENERGIA_IA_EPISODE_ID}.episode.json`), episodeContract);
  writeJson(path.join(root, 'contracts', 'episodes', `${ENERGIA_IA_EPISODE_ID}.scenes.json`), sceneContracts);
  writeJson(path.join(root, 'runs', ENERGIA_IA_EPISODE_ID, ENERGIA_IA_RUN_ID, 'canon-balance-report.json'), balance);
  writeJson(path.join(root, 'runs', ENERGIA_IA_EPISODE_ID, ENERGIA_IA_RUN_ID, 'research-sources.json'), {
    episodeId: ENERGIA_IA_EPISODE_ID,
    sources: [
      {publisher: 'International Energy Agency', title: 'Energy and AI', year: 2025, url: 'https://www.iea.org/reports/energy-and-ai'},
      {publisher: 'International Energy Agency', title: 'Energy demand from AI', year: 2025, url: 'https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai'},
      {publisher: 'International Energy Agency', title: 'Energy security concerns', year: 2025, url: 'https://www.iea.org/reports/energy-and-ai/energy-security-concerns'},
      {publisher: 'NVIDIA', title: 'H100 Tensor Core GPU', url: 'https://www.nvidia.com/en-us/data-center/h100/'},
      {publisher: 'U.S. Department of Energy', title: 'Data Center Energy Efficiency', url: 'https://www.energy.gov/femp/data-center-energy-efficiency'},
      {publisher: 'Empresa de Pesquisa Energetica', title: 'Data centers e demanda de energia no SIN', url: 'https://www.epe.gov.br/'},
      {publisher: 'Schneider Electric Brasil', title: 'Infraestrutura eletrica definira expansao de data centers no Brasil', year: 2026, url: 'https://www.se.com/br/pt/about-us/newsroom/news/press-releases/infraestrutura-el%C3%A9trica-definir%C3%A1-se-brasil-chegar%C3%A1-at%C3%A9-26-gw-ou-at%C3%A9-45-gw-em-data-centers-at%C3%A9-2050-aponta-estudo-69bd871eb63eca815204e8cc/'},
    ],
    editorialRule: 'No universal per-query energy number is asserted; variability by model, tokens, batching, hardware, facility efficiency, location and time is explicit.',
  });

  process.stdout.write(`${JSON.stringify({episodeId: ENERGIA_IA_EPISODE_ID, runId: ENERGIA_IA_RUN_ID, scenes: ENERGIA_IA_SCENES.length, totalSeconds: ENERGIA_IA_TOTAL_SECONDS, canonBalance: balance}, null, 2)}\n`);
}

main();

