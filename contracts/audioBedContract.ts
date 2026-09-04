import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { EpisodeContract } from './episodeContract';
import { SceneVisualContract } from './sceneVisualContract';

export const AudioCueSchema = z.object({
  cueId: z.string().min(3),
  description: z.string().min(5),
  atSeconds: z.number().min(0),
  durationSeconds: z.number().positive()
});

export type AudioCue = z.infer<typeof AudioCueSchema>;

export const SceneSfxItemSchema = z.object({
  sceneId: z.string().min(3),
  order: z.number().int().positive(),
  take_type: z.enum(['CINEMATIC_TAKE', 'KEYFRAME_DOSSIER']),
  cues: z.array(AudioCueSchema),
  targetSeconds: z.number().positive(),
  outPath: z.string().min(5)
});

export type SceneSfxItem = z.infer<typeof SceneSfxItemSchema>;

export const AudioBedContractSchema = z.object({
  episodeId: z.string().min(3),
  musicMood: z.string().min(3),
  sfxDensity: z.enum(['low', 'medium', 'high']),
  music: z.object({
    outPath: z.string().min(5),
    targetSeconds: z.number().positive(),
    mood: z.string()
  }),
  sfx: z.array(SceneSfxItemSchema).min(1),
  mix: z.object({
    outPath: z.string().min(5),
    targetSeconds: z.number().positive()
  })
});

export type AudioBedContract = z.infer<typeof AudioBedContractSchema>;

export interface AudioBedPlanReport {
  timestamp: string;
  episodeId: string;
  runId: string;
  totalScenes: number;
  totalSfxCues: number;
  musicTargetSeconds: number;
  musicMood: string;
  contract: AudioBedContract;
}

export const CANONICAL_SCENE_AUDIO_CUES: Record<string, AudioCue[]> = {
  GAS_001: [
    { cueId: 'GAS_001_CUE_01', description: 'Heavy metallic nozzle latch click into vehicle fuel tank neck', atSeconds: 0.0, durationSeconds: 3.5 },
    { cueId: 'GAS_001_CUE_02', description: 'Continuous high-pressure liquid fuel pumping drone with wet asphalt resonance', atSeconds: 3.5, durationSeconds: 8.5 }
  ],
  GAS_002: [
    { cueId: 'GAS_002_CUE_01', description: 'Analog dashboard gauge servo motor whir and electrical needle deflection', atSeconds: 0.0, durationSeconds: 4.0 },
    { cueId: 'GAS_002_CUE_02', description: 'Low-frequency automobile cabin rumble and subtle amber backlight hum', atSeconds: 4.0, durationSeconds: 8.0 }
  ],
  GAS_003: [
    { cueId: 'GAS_003_CUE_01', description: 'Heavy steel chassis access panel latch hinge creak', atSeconds: 0.0, durationSeconds: 3.0 },
    { cueId: 'GAS_003_CUE_02', description: 'Hydraulic fuel flow hum through vintage bronze pipework', atSeconds: 3.0, durationSeconds: 9.0 }
  ],
  GAS_004: [
    { cueId: 'GAS_004_CUE_01', description: 'Four-piston positive displacement flow meter synchronized mechanical reciprocating stroke', atSeconds: 0.0, durationSeconds: 12.0 }
  ],
  GAS_005: [
    { cueId: 'GAS_005_CUE_01', description: 'Precision piston hydraulic displacement stroke and cylinder chamber pressurized sweep', atSeconds: 0.0, durationSeconds: 12.0 }
  ],
  GAS_006: [
    { cueId: 'GAS_006_CUE_01', description: 'Crankshaft rotational click and angular magnetic encoder disc spin', atSeconds: 0.0, durationSeconds: 5.0 },
    { cueId: 'GAS_006_CUE_02', description: 'High-speed magnetic pulse disc whir with slotted optical sensor clicks', atSeconds: 5.0, durationSeconds: 7.0 }
  ],
  GAS_007: [
    { cueId: 'GAS_007_CUE_01', description: 'Solid-state Hall effect sensor micro-transistor switching tick', atSeconds: 0.0, durationSeconds: 4.0 },
    { cueId: 'GAS_007_CUE_02', description: 'High-frequency square wave pulse train digital pulse oscillation', atSeconds: 4.0, durationSeconds: 8.0 }
  ],
  GAS_008: [
    { cueId: 'GAS_008_CUE_01', description: 'Digital 200 Hz metrology pulse frequency tone and oscilloscope CRT beam hum', atSeconds: 0.0, durationSeconds: 12.0 }
  ],
  GAS_009: [
    { cueId: 'GAS_009_CUE_01', description: 'Braided steel wire harness flex and internal column metallic cable pull', atSeconds: 0.0, durationSeconds: 4.5 },
    { cueId: 'GAS_009_CUE_02', description: 'Low electrical shielding transmission buzz rising up pump column', atSeconds: 4.5, durationSeconds: 7.5 }
  ],
  GAS_010: [
    { cueId: 'GAS_010_CUE_01', description: 'Mainboard microcontroller clock quartz oscillator high-pitched hum', atSeconds: 0.0, durationSeconds: 5.0 },
    { cueId: 'GAS_010_CUE_02', description: 'Seven-segment liquid crystal LCD digit rapid counting micro-clicks', atSeconds: 5.0, durationSeconds: 7.0 }
  ],
  GAS_011: [
    { cueId: 'GAS_011_CUE_01', description: 'Macro soldering iron tip flux sizzle on PCB copper track', atSeconds: 0.0, durationSeconds: 4.5 },
    { cueId: 'GAS_011_CUE_02', description: 'Clandestine bypass wire electrical jumper contact buzz', atSeconds: 4.5, durationSeconds: 7.5 }
  ],
  GAS_012: [
    { cueId: 'GAS_012_CUE_01', description: 'Microscopic rogue microchip SMD component contact click', atSeconds: 0.0, durationSeconds: 3.5 },
    { cueId: 'GAS_012_CUE_02', description: 'Black epoxy resin chemical curing thermal hum over electronic mainboard', atSeconds: 3.5, durationSeconds: 8.5 }
  ],
  GAS_013: [
    { cueId: 'GAS_013_CUE_01', description: 'Synthetic rogue pulse injection clock telemetry ping and data bus interrupt hum', atSeconds: 0.0, durationSeconds: 12.0 }
  ],
  GAS_014: [
    { cueId: 'GAS_014_CUE_01', description: 'LCD dispenser numeric display rapid digit rolling click-stream', atSeconds: 0.0, durationSeconds: 5.0 },
    { cueId: 'GAS_014_CUE_02', description: 'Electronic solenoid valve throttle valve closure thump', atSeconds: 5.0, durationSeconds: 7.0 }
  ],
  GAS_015: [
    { cueId: 'GAS_015_CUE_01', description: 'Volumetric 4-liter delta calculation digital counter tick and audit chime', atSeconds: 0.0, durationSeconds: 12.0 }
  ],
  GAS_016: [
    { cueId: 'GAS_016_CUE_01', description: 'Forensic metrology ledger keystroke data pulse and financial audit alert tone', atSeconds: 0.0, durationSeconds: 12.0 }
  ],
  GAS_017: [
    { cueId: 'GAS_017_CUE_01', description: 'Miniature 2.4 GHz RF Bluetooth antenna pairing telemetry ping', atSeconds: 0.0, durationSeconds: 4.0 },
    { cueId: 'GAS_017_CUE_02', description: 'Radio transceiver micro-carrier wave oscillation inside steel casing', atSeconds: 4.0, durationSeconds: 8.0 }
  ],
  GAS_018: [
    { cueId: 'GAS_018_CUE_01', description: 'Smartphone touchscreen remote trigger button tap haptic click', atSeconds: 0.0, durationSeconds: 3.0 },
    { cueId: 'GAS_018_CUE_02', description: 'Encrypted remote radio frequency command packet transmission pulse', atSeconds: 3.0, durationSeconds: 9.0 }
  ],
  GAS_019: [
    { cueId: 'GAS_019_CUE_01', description: 'Metrology inspection patrol car wet pavement tire roll and deceleration brake hiss', atSeconds: 0.0, durationSeconds: 5.0 },
    { cueId: 'GAS_019_CUE_02', description: 'Emergency beacon strobe generator low electrical rotation buzz', atSeconds: 5.0, durationSeconds: 7.0 }
  ],
  GAS_020: [
    { cueId: 'GAS_020_CUE_01', description: 'Tactile microswitch keyfob button click', atSeconds: 0.0, durationSeconds: 2.5 },
    { cueId: 'GAS_020_CUE_02', description: 'Long-range RF deactivation burst and pump safety transceiver beep', atSeconds: 2.5, durationSeconds: 9.5 }
  ],
  GAS_021: [
    { cueId: 'GAS_021_CUE_01', description: 'Electromechanical miniature relay coil snap and transparent bypass mode connection pulse', atSeconds: 0.0, durationSeconds: 12.0 }
  ],
  GAS_022: [
    { cueId: 'GAS_022_CUE_01', description: 'Calibrated 20-liter stainless steel standard volumetric flask metallic ring', atSeconds: 0.0, durationSeconds: 4.5 },
    { cueId: 'GAS_022_CUE_02', description: 'Nozzle spout alignment and heavy base placement on concrete floor', atSeconds: 4.5, durationSeconds: 7.5 }
  ],
  GAS_023: [
    { cueId: 'GAS_023_CUE_01', description: 'Swirling fuel liquid filling calibrated neck with glass resonance', atSeconds: 0.0, durationSeconds: 6.0 },
    { cueId: 'GAS_023_CUE_02', description: 'Fluid settling meniscal optical line alignment stillness', atSeconds: 6.0, durationSeconds: 6.0 }
  ],
  GAS_024: [
    { cueId: 'GAS_024_CUE_01', description: 'Inviolable tamper-evident holographic seal application foil peel', atSeconds: 0.0, durationSeconds: 3.5 },
    { cueId: 'GAS_024_CUE_02', description: 'Official lead clamp stamp pressing crunch onto pump chassis', atSeconds: 3.5, durationSeconds: 8.5 }
  ],
  GAS_025: [
    { cueId: 'GAS_025_CUE_01', description: 'Patrol vehicle engine hum fading into wet highway distance', atSeconds: 0.0, durationSeconds: 5.5 },
    { cueId: 'GAS_025_CUE_02', description: 'Dispenser LCD microprocessor switching back to rogue pulse multiplier mode click', atSeconds: 5.5, durationSeconds: 6.5 }
  ],
  GAS_026: [
    { cueId: 'GAS_026_CUE_01', description: 'Infrared thermal camera sensor calibration shutter click and hotspot frequency hum', atSeconds: 0.0, durationSeconds: 12.0 }
  ],
  GAS_027: [
    { cueId: 'GAS_027_CUE_01', description: 'Cryptographic tamper audit memory bus sealing latch lock and digital certificate tone', atSeconds: 0.0, durationSeconds: 12.0 }
  ],
  GAS_028: [
    { cueId: 'GAS_028_CUE_01', description: 'Anti-tamper silicon hardware self-destruct fuse pop and circuit lockout snap', atSeconds: 0.0, durationSeconds: 4.0 },
    { cueId: 'GAS_028_CUE_02', description: 'Pulsing red LED alarm relay oscillation and digital lockdown tone', atSeconds: 4.0, durationSeconds: 8.0 }
  ],
  GAS_029: [
    { cueId: 'GAS_029_CUE_01', description: 'Distant highway night rain atmospheric ambience with sodium canopy amber hum', atSeconds: 0.0, durationSeconds: 6.0 },
    { cueId: 'GAS_029_CUE_02', description: 'Industrial wind gust and distant transformer station 60 Hz electrical hum', atSeconds: 6.0, durationSeconds: 6.0 }
  ],
  GAS_030: [
    { cueId: 'GAS_030_CUE_01', description: 'Heavy metallic nozzle holster impact clunk into dispenser cradle', atSeconds: 0.0, durationSeconds: 3.5 },
    { cueId: 'GAS_030_CUE_02', description: 'Submersible fuel pump motor spin-down winding sound into deep silence', atSeconds: 3.5, durationSeconds: 8.5 }
  ]
};

/**
 * Constrói e valida o plano determinístico de SFX, Trilha Musical e Mixagem para o episódio.
 */
export function buildAudioBedPlan(
  contract: EpisodeContract,
  sceneContracts: SceneVisualContract[],
  runId: string = 'latest'
): AudioBedPlanReport {
  const timestamp = new Date().toISOString();

  if (sceneContracts.length === 0) {
    throw new Error('SFX_PLAN_INCOMPLETE: Nenhum contrato de cena recebido.');
  }

  const sfxItems: SceneSfxItem[] = [];
  let totalCues = 0;

  for (let i = 0; i < sceneContracts.length; i++) {
    const sc = sceneContracts[i];
    const targetSeconds = sc.targetSeconds || 12.0;
    const isCinematic = sc.take_type === 'CINEMATIC_TAKE';

    const isNarrativeCue = i === 0 || i === sceneContracts.length - 1 || i % 6 === 0;
    const cues = CANONICAL_SCENE_AUDIO_CUES[sc.sceneId] || (isNarrativeCue ? [
      {cueId: `${sc.sceneId}_CUE_01`, description: `Restrained documentary evidence punctuation for ${sc.sceneId}`, atSeconds: 0.35, durationSeconds: Math.min(1.0, targetSeconds - 0.35)},
    ] : []);

    // Regra 2: Duração das cues não pode exceder o targetSeconds da cena
    const cuesDurationSum = cues.reduce((acc, c) => acc + c.durationSeconds, 0);
    if (cuesDurationSum > targetSeconds + 0.01) {
      throw new Error(`SFX_TIMING_OVERFLOW: Soma das cues (${cuesDurationSum}s) excede target da cena '${sc.sceneId}' (${targetSeconds}s).`);
    }

    // Regra 3: Proibição estrita de "whoosh" ou "impact" isolados
    for (const cue of cues) {
      const descLower = cue.description.toLowerCase().trim();
      if (descLower === 'whoosh' || descLower === 'impact' || descLower === 'transicao' || descLower === 'hit') {
        throw new Error(`FORBIDDEN_GENERIC_SFX: Cue '${cue.cueId}' utiliza descrição genérica proibida '${cue.description}'.`);
      }
    }

    totalCues += cues.length;
    sfxItems.push({
      sceneId: sc.sceneId,
      order: i + 1,
      take_type: sc.take_type,
      cues,
      targetSeconds,
      outPath: `runs/${contract.episodeId}/${runId}/audio/sfx/${sc.sceneId}.wav`
    });
  }

  const audioBedContract: AudioBedContract = {
    episodeId: contract.episodeId,
    musicMood: contract.musicMood || 'dark_industrial_investigative',
    sfxDensity: 'low',
    music: {
      outPath: `runs/${contract.episodeId}/${runId}/audio/music/bed.wav`,
      targetSeconds: contract.targetDurationSeconds || 360.0,
      mood: contract.musicMood || 'dark_industrial_investigative'
    },
    sfx: sfxItems as [SceneSfxItem, ...SceneSfxItem[]],
    mix: {
      outPath: `runs/${contract.episodeId}/${runId}/audio/mix/mix.wav`,
      targetSeconds: contract.targetDurationSeconds || 360.0
    }
  };

  // Validação Zod estrita
  AudioBedContractSchema.parse(audioBedContract);

  const report: AudioBedPlanReport = {
    timestamp,
    episodeId: contract.episodeId,
    runId,
    totalScenes: sfxItems.length,
    totalSfxCues: totalCues,
    musicTargetSeconds: audioBedContract.music.targetSeconds,
    musicMood: audioBedContract.musicMood,
    contract: audioBedContract
  };

  // Grava artefatos
  const audioBase = path.join(process.cwd(), 'runs', contract.episodeId, 'audio');
  const runAudioDir = path.join(audioBase, runId);
  const latestAudioDir = path.join(audioBase, 'latest');

  fs.mkdirSync(runAudioDir, { recursive: true });
  fs.mkdirSync(latestAudioDir, { recursive: true });

  fs.writeFileSync(path.join(runAudioDir, 'audio-bed-plan.json'), JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(path.join(latestAudioDir, 'audio-bed-plan.json'), JSON.stringify(report, null, 2), 'utf8');

  const mdLines: string[] = [
    `# 🎧 PLANO DE SFX, MÚSICA & MIX // ${contract.title.toUpperCase()}`,
    '',
    `> **Episódio:** \`${contract.episodeId}\`  `,
    `> **Trilha Musical:** \`${audioBedContract.musicMood}\` (${audioBedContract.music.targetSeconds.toFixed(1)}s)  `,
    `> **Densidade SFX:** \`${audioBedContract.sfxDensity}\` | **Total de Cenas:** \`${report.totalScenes}\` | **Total de Cues:** \`${report.totalSfxCues}\``,
    '',
    '| # | Cena | Tipo | Cues | Descrições Técnicas dos Efeitos Sonoros |',
    '|---|---|---|---|---|'
  ];

  for (const item of sfxItems) {
    const cueSummary = item.cues.map(c => `\`${c.atSeconds}s-${c.atSeconds + c.durationSeconds}s\`: ${c.description}`).join('<br>');
    mdLines.push(`| ${item.order} | **\`${item.sceneId}\`** | \`${item.take_type}\` | ${item.cues.length} | ${cueSummary} |`);
  }

  mdLines.push('');
  mdLines.push('---');
  mdLines.push('Plano de áudio imersivo pronto para renderização via stems independentes sem arquivos dummy.');

  const mdContent = mdLines.join('\n');
  fs.writeFileSync(path.join(runAudioDir, 'audio-bed-plan.md'), mdContent, 'utf8');
  fs.writeFileSync(path.join(latestAudioDir, 'audio-bed-plan.md'), mdContent, 'utf8');

  return report;
}
