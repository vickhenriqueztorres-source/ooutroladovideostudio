import fs from 'fs';
import { MotionSquadOrchestrator } from '../pipeline/motion-squad/motionSquadOrchestrator';

const scenesPath = 'contracts/episodes/raio-x-aeroporto.scenes.json';
const scenes = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));

console.log(`Carregando ${scenes.length} cenas de ${scenesPath}...`);
const results = MotionSquadOrchestrator.developMotionsForEpisode('raio-x-aeroporto', scenes);

console.log(`\n🎉 Total de componentes desenvolvidos pelo Squad: ${Object.keys(results).length}`);
for (const [scId, res] of Object.entries(results)) {
  console.log(`\n[${scId}] -> ${res.componentName}`);
  console.log(` Arquétipo: ${res.blueprint.archetype}`);
  console.log(` Arquivo: ${res.filePath}`);
  console.log(` Título: ${res.blueprint.title}`);
  console.log(` Subtítulo: ${res.blueprint.subtitle}`);
  console.log(` Variáveis Metrológicas: ${res.blueprint.physicalVariables.map(v => `${v.name} (${v.value} ${v.unit})`).join(' | ')}`);
}
