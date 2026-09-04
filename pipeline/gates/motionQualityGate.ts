import { MotionPackage } from '../../contracts/motionContract';
import { isRegisteredComponent } from '../../remotion/cinema/componentRegistry';
import { REQUIRED_EDITORIAL_PROPS_BY_COMPONENT } from '../../contracts/timelineContract';

export interface MotionValidationResult {
  valid: boolean;
  score: number;
  reasons: string[];
}

export class MotionQualityGate {
  /**
   * Validador Numérico de Qualidade (Score >= 7) baseado no padrão multiagente HSL 2026.
   * Impede que o render avance se os motion graphics não cumprirem a Lei de Identidade Visual.
   */
  public static validate(pkg: MotionPackage): MotionValidationResult {
    const reasons: string[] = [];
    let score = 10;

    const rep = pkg.distributionReport;

    // 1. Proporção Canônica de Motion Graphics (15% a 35%)
    if (rep.motionGraphicsPercentage < 15) {
      score -= 3;
      reasons.push(`MOTION_PERCENTAGE_TOO_LOW: Apenas ${rep.motionGraphicsPercentage}% das cenas possuem componentes de Motion Graphics (Mínimo exigido: 15%).`);
    }

    // 2. Cobertura Mínima de Callouts Cinéticos (Mínimo 6)
    if (rep.totalCallouts < 6) {
      score -= 2;
      reasons.push(`CALLOUTS_COUNT_INSUFFICIENT: Apenas ${rep.totalCallouts} KineticEditorialCallouts declarados (Mínimo exigido: 6).`);
    }

    // 3. Janela de Telemetria Global do HudDirector
    if (!pkg.hudWindows || pkg.hudWindows.length === 0) {
      score -= 2;
      reasons.push('MISSING_HUD_DIRECTOR_WINDOWS: Nenhuma janela de telemetria ou cronômetro declarada para o HudDirector.');
    }

    // 4. Verificação Estrita de Componentes e Props Editoriais
    for (const [sceneId, assignment] of Object.entries(pkg.sceneAssignments)) {
      if (!isRegisteredComponent(assignment.component)) {
        score -= 4;
        reasons.push(`UNKNOWN_SCENE_COMPONENT: Componente '${assignment.component}' na cena '${sceneId}' não existe no componentRegistry.`);
      }

      const reqProps = REQUIRED_EDITORIAL_PROPS_BY_COMPONENT[assignment.component];
      if (reqProps && reqProps.length > 0) {
        for (const prop of reqProps) {
          const val = assignment.props?.[prop];
          if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
            score -= 1;
            reasons.push(`MISSING_EDITORIAL_PROP: Cena '${sceneId}' usando '${assignment.component}' está sem a prop obrigatória '${prop}'.`);
          }
        }
      }
    }

    const finalScore = Math.max(0, score);
    const valid = finalScore >= 7 && reasons.length === 0;

    return {
      valid,
      score: finalScore,
      reasons
    };
  }
}
