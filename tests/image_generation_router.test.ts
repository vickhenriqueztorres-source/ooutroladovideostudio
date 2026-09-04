import test from 'node:test';
import assert from 'node:assert/strict';
import { ImageGenerationConfig } from '../config/imageGenerationConfig';
import { ImageGenerationRouter } from '../hsl/startframe/imageGenerationRouter';

test('ImageGenerationConfig - Detecção Padrão em Antigravity', () => {
  const originalCodex = process.env.CODEX;
  const originalPlatform = process.env.AGENT_PLATFORM;
  const originalProvider = process.env.IMAGE_PROVIDER;
  delete process.env.CODEX;
  delete process.env.AGENT_PLATFORM;
  delete process.env.IMAGE_PROVIDER;

  try {
    const env = ImageGenerationConfig.detectEnvironment();
    assert.equal(env, 'ANTIGRAVITY', 'Ambiente padrão do projeto deve ser ANTIGRAVITY');

    const provider = ImageGenerationConfig.getActiveProvider();
    assert.equal(provider, 'codex_cli', 'O provedor padrão deve ser codex_cli');
  } finally {
    if (originalCodex !== undefined) process.env.CODEX = originalCodex;
    if (originalPlatform !== undefined) process.env.AGENT_PLATFORM = originalPlatform;
    if (originalProvider !== undefined) process.env.IMAGE_PROVIDER = originalProvider;
  }
});

test('ImageGenerationConfig - Detecção de Ambiente Codex', () => {
  const originalCodex = process.env.CODEX;
  const originalPlatform = process.env.AGENT_PLATFORM;
  const originalProvider = process.env.IMAGE_PROVIDER;
  delete process.env.IMAGE_PROVIDER;

  try {
    process.env.CODEX = '1';
    const env = ImageGenerationConfig.detectEnvironment();
    assert.equal(env, 'CODEX', 'Com CODEX=1, deve detectar ambiente CODEX');

    const provider = ImageGenerationConfig.getActiveProvider();
    assert.equal(provider, 'codex_cli', 'No Codex sem override, o provedor ativo deve ser codex_cli');
  } finally {
    if (originalCodex !== undefined) process.env.CODEX = originalCodex;
    else delete process.env.CODEX;
    if (originalPlatform !== undefined) process.env.AGENT_PLATFORM = originalPlatform;
    if (originalProvider !== undefined) process.env.IMAGE_PROVIDER = originalProvider;
  }
});

test('ImageGenerationConfig - Override Manual via IMAGE_PROVIDER', () => {
  const originalCodex = process.env.CODEX;
  const originalProvider = process.env.IMAGE_PROVIDER;

  try {
    process.env.CODEX = '1';
    process.env.IMAGE_PROVIDER = 'chatgpt_image_bot';
    assert.equal(
      ImageGenerationConfig.getActiveProvider(),
      'chatgpt_image_bot',
      'IMAGE_PROVIDER=chatgpt_image_bot deve sobrepor a flag CODEX'
    );

    delete process.env.CODEX;
    process.env.IMAGE_PROVIDER = 'codex_native';
    assert.equal(
      ImageGenerationConfig.getActiveProvider(),
      'codex_native',
      'IMAGE_PROVIDER=codex_native deve permitir uso da rota nativa'
    );
  } finally {
    if (originalCodex !== undefined) process.env.CODEX = originalCodex;
    else delete process.env.CODEX;
    if (originalProvider !== undefined) process.env.IMAGE_PROVIDER = originalProvider;
    else delete process.env.IMAGE_PROVIDER;
  }
});

test('ImageGenerationRouter - Singleton e Status Ativo', () => {
  const router = ImageGenerationRouter.getInstance();
  assert.ok(router, 'O roteador ImageGenerationRouter deve ser instanciado');

  const status = router.getStatus();
  assert.ok(status.environment, 'Status deve conter o ambiente');
  assert.ok(status.provider, 'Status deve conter o provedor');
});