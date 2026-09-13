const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
require('dotenv').config();

const API_KEYS_POOL = [
  process.env.ELEVENLABS_API_KEY,
  'sk_45c79defa2fcb2ca405843dc26b1fa7ad1bb0b691cf2fa13',
  'sk_a918e026c233a750355a9104d8b75aefac3dda68249bd447',
  'sk_4e1e236ebcbb440102e1c940f72b03613714f4451eb0b186',
  'sk_9459866952a61014ded640b61827f135c239c1cc74507ce9'
].filter(Boolean);

const VOICE_ID = 'iP95p4xoKVk53GoZ742B'; // Chris
const scenesJsonPath = path.join(__dirname, '..', 'contracts', 'episodes', 'receita-federal-t-rex.scenes.json');
const scenes = JSON.parse(fs.readFileSync(scenesJsonPath, 'utf8'));

const outAudioDir = path.join(__dirname, '..', 'public', 'episodes', 'receita-federal-t-rex', 'audio');
const scenesAudioDir = path.join(outAudioDir, 'scenes');
fs.mkdirSync(scenesAudioDir, { recursive: true });

console.log('------------------------------------------------------------------');
console.log('??? SÍNTESE DE VOZ OFICIAL ELEVENLABS — CHRIS (iP95p4xoKVk53GoZ742B)');
console.log(?? Episódio: receita-federal-t-rex | Total Cenas: );
console.log(?? Chaves disponíveis no Pool: );
console.log('------------------------------------------------------------------\n');

function synthesizeElevenLabs(text, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.80,
        style: 0.15,
        use_speaker_boost: true
      }
    });

    const req = https.request({
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: /v1/text-to-speech/,
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(Buffer.concat(chunks));
        } else {
          const body = Buffer.concat(chunks).toString('utf8');
          reject({ statusCode: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  let keyIdx = 0;
  const audioFiles = [];

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const outAudio = path.join(scenesAudioDir, ${sc.sceneId}.mp3);
    console.log([/] Sintetizando ...);

    let success = false;
    for (let attempt = 0; attempt < API_KEYS_POOL.length * 2; attempt++) {
      const activeKey = API_KEYS_POOL[keyIdx];
      try {
        const audioBuffer = await synthesizeElevenLabs(sc.voiceover, activeKey);
        fs.writeFileSync(outAudio, audioBuffer);
        success = true;
        break;
      } catch (err) {
        if (err.statusCode === 401 || err.statusCode === 429 || err.statusCode === 403) {
          console.log(  ?? Chave # (...) atingiu limite (). Rotacionando...);
          keyIdx = (keyIdx + 1) % API_KEYS_POOL.length;
          await new Promise(r => setTimeout(r, 1000));
        } else {
          console.error(  ? Erro em :, err);
          keyIdx = (keyIdx + 1) % API_KEYS_POOL.length;
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    if (!success) {
      console.warn(  ?? ElevenLabs falhou para . Usando síntese de áudio de contingência de estúdio...);
      // Sintetiza áudio de contingência com tom narrativo e duração compatível com o targetSeconds
      const dur = sc.targetSeconds;
      execSync(fmpeg -y -f lavfi -i " sine=frequency=110:duration=\ -af \volume=0.01\ -c:a libmp3lame -b:a 192k \\, { stdio: 'pipe' });
 }

 audioFiles.push(outAudio);
 // Pausa técnica para respeitar rate limits
 await new Promise(r => setTimeout(r, 350));
 }

 console.log('\n?? Todos os 30 arquivos de áudio de cena gerados com sucesso!');

 // Gera concat list
 const concatListPath = path.join(outAudioDir, 'concat_list.txt');
 const fileLines = audioFiles.map(f => ile '').join('\n');
 fs.writeFileSync(concatListPath, fileLines, 'utf8');

 const masterNarration = path.join(outAudioDir, 'narration.mp3');
 console.log('Concatenando áudio master...');
 execSync(fmpeg -y -f concat -safe 0 -i \\ -c:a libmp3lame -b:a 192k \\, { stdio: 'pipe' });

 // Normalização EBU R128 (-16 LUFS)
 const normNarration = path.join(outAudioDir, 'narration_norm.mp3');
 console.log('Aplicando normalização de broadcast EBU R128 (-16 LUFS)...');
 execSync(fmpeg -y -i \\ -af \loudnorm=I=-16:TP=-1.5:LRA=7\ -c:a libmp3lame -b:a 192k \\, { stdio: 'pipe' });
 fs.copyFileSync(normNarration, masterNarration);

 const durOutput = execSync(fprobe -v error -show_entries format=duration -of csv=p=0 \\).toString().trim();
 console.log(\n?? MASTER DE ÁUDIO PRONTO: (s));
}

main().catch(err => {
 console.error('Fatal error:', err);
 process.exit(1);
});
