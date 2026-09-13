import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// Paleta Oficial Inviolável - Dossiê do Sistema 3.0
const COLOR_BG = '#060709';
const COLOR_SURFACE = '#0D0E15';
const COLOR_PRIMARY_AMBER = '#FF5500';
const COLOR_TELEMETRY_CYAN = '#00F0FF';
const COLOR_TEXT_PRIMARY = '#F4F4F0';
const COLOR_TEXT_MUTED = '#8A8D9F';

// =========================================================================
// 1. GLOBAL ROUTE TRACKER (Shenzhen -> Curitiba: 18.340 km)
// =========================================================================
export interface GlobalRouteTrackerProps {
  title?: string;
  subtitle?: string;
  distanceKm?: number;
  originName?: string;
  destinationName?: string;
  elapsedTime?: string;
}

export const GlobalRouteTracker: React.FC<GlobalRouteTrackerProps> = ({
  title = 'TRAJETÓRIA AÉREA TRANSCONTINENTAL // ROTA DE CARGA',
  subtitle = 'SHENZHEN (SZX) -> VIRACOPOS (VCP) -> CEINT CURITIBA',
  distanceKm = 18340,
  originName = 'SHENZHEN HUB // GUANGDONG [22.54°N, 114.05°E]',
  destinationName = 'CEINT CORREIOS // CURITIBA [-25.42°S, -49.27°W]',
  elapsedTime = '26H 40M TEMPO DE TRÂNSITO'
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = interpolate(frame, [15, 180], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const animatedKm = Math.round(progress * distanceKm);
  const pulse = Math.sin(frame / 6) * 0.15 + 0.85;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(6, 7, 9, 0.82)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px 80px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: COLOR_TEXT_PRIMARY,
        zIndex: 20
      }}
    >
      {/* Cabeçalho de Telemetria Forense com Fontes Ampliadas */}
      <div style={{ borderBottom: `2px solid rgba(255, 85, 0, 0.4)`, paddingBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
          <div
            style={{
              width: '14px',
              height: '14px',
              backgroundColor: COLOR_PRIMARY_AMBER,
              borderRadius: '50%',
              boxShadow: `0 0 12px ${COLOR_PRIMARY_AMBER}`
            }}
          />
          <span
            style={{
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '3px',
              color: COLOR_PRIMARY_AMBER,
              textTransform: 'uppercase'
            }}
          >
            TELEMETRIA DE CARGA // O OUTRO LADO
          </span>
        </div>
        <h1
          style={{
            fontSize: '38px',
            fontWeight: 900,
            margin: '0 0 8px 0',
            letterSpacing: '1px',
            color: COLOR_TEXT_PRIMARY
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: '24px', margin: 0, color: COLOR_TELEMETRY_CYAN, fontWeight: 600 }}>
          {subtitle}
        </p>
      </div>

      {/* Cartografia e Arco de Voo */}
      <div
        style={{
          flex: 1,
          margin: '40px 0',
          position: 'relative',
          backgroundColor: 'rgba(13, 14, 21, 0.7)',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Grade de Radar de Fundo */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(0, 240, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        {/* SVG do Arco Geodésico Transcontinental */}
        <svg
          viewBox="0 0 1000 400"
          style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        >
          {/* Rota Total Tracejada */}
          <path
            d="M 150 120 Q 500 40 850 300"
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="4"
            strokeDasharray="8,8"
          />
          {/* Rota Percorrida Ativa */}
          <path
            d="M 150 120 Q 500 40 850 300"
            fill="none"
            stroke={COLOR_TELEMETRY_CYAN}
            strokeWidth="5"
            strokeDasharray="1200"
            strokeDashoffset={1200 * (1 - progress)}
          />
          {/* Ponto de Origem: Shenzhen */}
          <circle cx="150" cy="120" r="10" fill={COLOR_PRIMARY_AMBER} />
          <circle cx="150" cy="120" r="22" fill="none" stroke={COLOR_PRIMARY_AMBER} strokeWidth="2" opacity={pulse} />
          <text x="175" y="125" fill="#FFFFFF" fontSize="20" fontWeight="bold">
            SHENZHEN (SZX)
          </text>

          {/* Ponto de Destino: Curitiba */}
          <circle cx="850" cy="300" r="10" fill={COLOR_TELEMETRY_CYAN} />
          <circle cx="850" cy="300" r="22" fill="none" stroke={COLOR_TELEMETRY_CYAN} strokeWidth="2" opacity={pulse} />
          <text x="730" y="340" fill="#FFFFFF" fontSize="20" fontWeight="bold">
            CEINT CURITIBA
          </text>
        </svg>

        {/* Display Central Monumental de Distância */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            backgroundColor: 'rgba(6, 7, 9, 0.92)',
            border: `2px solid ${COLOR_PRIMARY_AMBER}`,
            borderRadius: '6px',
            padding: '20px 40px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '18px', color: COLOR_TEXT_MUTED, letterSpacing: '2px', textTransform: 'uppercase' }}>
            DISTÂNCIA TOTAL PERCORRIDA
          </div>
          <div style={{ fontSize: '58px', fontWeight: 900, color: COLOR_PRIMARY_AMBER, margin: '6px 0' }}>
            {animatedKm.toLocaleString('pt-BR')} <span style={{ fontSize: '28px', color: COLOR_TEXT_PRIMARY }}>KM</span>
          </div>
          <div style={{ fontSize: '20px', color: COLOR_TELEMETRY_CYAN, fontWeight: 700 }}>
            {elapsedTime}
          </div>
        </div>
      </div>

      {/* Rodapé com Coordenadas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', color: COLOR_TEXT_MUTED, fontWeight: 600 }}>
        <div>ORIGEM: <span style={{ color: COLOR_TEXT_PRIMARY }}>{originName}</span></div>
        <div>DESTINO: <span style={{ color: COLOR_TEXT_PRIMARY }}>{destinationName}</span></div>
      </div>
    </div>
  );
};

// =========================================================================
// 2. CROSS-BELT SORTER HUD (3.2 m/s / Mecânica de Ejeção)
// =========================================================================
export interface CrossBeltSorterHUDProps {
  title?: string;
  speedMps?: number;
  throughputDay?: string;
  ejectionPulseMs?: number;
}

export const CrossBeltSorterHUD: React.FC<CrossBeltSorterHUDProps> = ({
  title = 'ESTEIRA DE ALTA VELOCIDADE // CROSS-BELT SORTER',
  speedMps = 3.2,
  throughputDay = '400.000 PACOTES / DIA',
  ejectionPulseMs = 100
}) => {
  const frame = useCurrentFrame();
  const trayPosition = (frame * 12) % 600;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(6, 7, 9, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px 80px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: COLOR_TEXT_PRIMARY,
        zIndex: 20
      }}
    >
      <div style={{ borderBottom: `2px solid rgba(0, 240, 255, 0.4)`, paddingBottom: '20px' }}>
        <div style={{ fontSize: '20px', fontWeight: 800, color: COLOR_TELEMETRY_CYAN, letterSpacing: '2px' }}>
          MECÂNICA INDUSTRIAL AUTOMATIZADA // CEINT CURITIBA
        </div>
        <h1 style={{ fontSize: '38px', fontWeight: 900, margin: '8px 0 0 0', color: COLOR_TEXT_PRIMARY }}>
          {title}
        </h1>
      </div>

      {/* Esquema da Esteira de Bandejas Motorizadas */}
      <div
        style={{
          display: 'flex',
          gap: '40px',
          alignItems: 'center',
          margin: '40px 0',
          backgroundColor: 'rgba(13, 14, 21, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '8px',
          padding: '40px'
        }}
      >
        {/* Painel de Métricas Gigantes */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div style={{ backgroundColor: 'rgba(6, 7, 9, 0.85)', padding: '24px', borderRadius: '6px', borderLeft: `6px solid ${COLOR_PRIMARY_AMBER}` }}>
            <div style={{ fontSize: '18px', color: COLOR_TEXT_MUTED, letterSpacing: '2px' }}>VELOCIDADE CONTÍNUA DA BANDEJA</div>
            <div style={{ fontSize: '56px', fontWeight: 900, color: COLOR_PRIMARY_AMBER, margin: '4px 0' }}>
              {speedMps} <span style={{ fontSize: '28px', color: COLOR_TEXT_PRIMARY }}>M/S (11.5 KM/H)</span>
            </div>
            <div style={{ fontSize: '18px', color: COLOR_TEXT_MUTED }}>Sem desaceleração nas curvas helicoidais</div>
          </div>

          <div style={{ backgroundColor: 'rgba(6, 7, 9, 0.85)', padding: '24px', borderRadius: '6px', borderLeft: `6px solid ${COLOR_TELEMETRY_CYAN}` }}>
            <div style={{ fontSize: '18px', color: COLOR_TEXT_MUTED, letterSpacing: '2px' }}>CAPACIDADE DE PROCESSAMENTO</div>
            <div style={{ fontSize: '50px', fontWeight: 900, color: COLOR_TELEMETRY_CYAN, margin: '4px 0' }}>
              {throughputDay}
            </div>
            <div style={{ fontSize: '18px', color: COLOR_TEXT_MUTED }}>Fluxo 24 horas ininterrupto</div>
          </div>
        </div>

        {/* Ejeção Eletromecânica Lateral */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'rgba(6, 7, 9, 0.95)',
            border: '2px dashed rgba(255, 85, 0, 0.5)',
            borderRadius: '8px',
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div style={{ fontSize: '22px', fontWeight: 800, color: COLOR_PRIMARY_AMBER }}>
            DISPARO DE EJEÇÃO LATERAL
          </div>
          <p style={{ fontSize: '20px', color: COLOR_TEXT_PRIMARY, lineHeight: '1.5', margin: 0 }}>
            Um motor linear sob cada carrinho aciona a esteira transversal em <strong style={{ color: COLOR_TELEMETRY_CYAN }}>{ejectionPulseMs} milissegundos</strong> exatamente quando o código de barras alinha com a rampa do CEP.
          </p>
          <div
            style={{
              marginTop: '15px',
              padding: '16px',
              backgroundColor: 'rgba(255, 85, 0, 0.1)',
              border: `1px solid ${COLOR_PRIMARY_AMBER}`,
              borderRadius: '4px',
              fontSize: '18px',
              fontWeight: 700,
              color: COLOR_PRIMARY_AMBER
            }}
          >
            PRECISÃO MILIMÉTRICA: DESVIO MÁXIMO TOLERADO ± 2MM
          </div>
        </div>
      </div>

      <div style={{ fontSize: '18px', color: COLOR_TEXT_MUTED, textAlign: 'right' }}>
        CENTRO INTERNACIONAL DE CURITIBA (CEINT) // CORREIOS AUTOMATION
      </div>
    </div>
  );
};

// =========================================================================
// 3. X-RAY TOMOGRAPHY DOSSIER (Dual Energy / Receita Federal)
// =========================================================================
export interface XRayTomographyDossierProps {
  title?: string;
  matchScore?: string;
  declaredCategory?: string;
  detectedMaterial?: string;
}

export const XRayTomographyDossier: React.FC<XRayTomographyDossierProps> = ({
  title = 'AUDITORIA RADIOGRÁFICA DE DUPLA ENERGIA // RECEITA FEDERAL',
  matchScore = '99.4% CONFORME',
  declaredCategory = 'ELETRÔNICOS / FONE SEM FIO BLUETOOTH',
  detectedMaterial = 'POLÍMERO ORGÂNICO + BATERIA DE ÍON-LÍTIO'
}) => {
  const frame = useCurrentFrame();
  const scanLine = (frame * 8) % 360;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(6, 7, 9, 0.88)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px 80px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: COLOR_TEXT_PRIMARY,
        zIndex: 20
      }}
    >
      <div style={{ borderBottom: `2px solid rgba(255, 85, 0, 0.4)`, paddingBottom: '20px' }}>
        <div style={{ fontSize: '20px', fontWeight: 800, color: COLOR_PRIMARY_AMBER, letterSpacing: '2px' }}>
          SCANNER ADUANEIRO ESPECTRAL // FISCALIZAÇÃO AUTOMATIZADA
        </div>
        <h1 style={{ fontSize: '38px', fontWeight: 900, margin: '8px 0 0 0', color: COLOR_TEXT_PRIMARY }}>
          {title}
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '40px', margin: '30px 0', flex: 1 }}>
        {/* Espectro Radiográfico com Cores de Atenuação Atômica */}
        <div
          style={{
            flex: 1.2,
            backgroundColor: 'rgba(13, 14, 21, 0.95)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '8px',
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '22px', fontWeight: 800, color: COLOR_TELEMETRY_CYAN, marginBottom: '15px' }}>
            ESCALA DE NÚMERO ATÔMICO EFETIVO (Z_eff)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ borderLeft: '6px solid #FF7700', paddingLeft: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#FF7700' }}>
                LARANJA ÂMBAR (Z_eff: 6 a 8)
              </div>
              <div style={{ fontSize: '18px', color: COLOR_TEXT_MUTED }}>
                Matéria Orgânica, Plásticos, Papel, Polímeros
              </div>
            </div>

            <div style={{ borderLeft: '6px solid #00FF88', paddingLeft: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#00FF88' }}>
                VERDE ESMERALDA (Z_eff: 10 a 14)
              </div>
              <div style={{ fontSize: '18px', color: COLOR_TEXT_MUTED }}>
                Vidro, Alumínio, Silício, Circuitos Impressos
              </div>
            </div>

            <div style={{ borderLeft: '6px solid #00AAFF', paddingLeft: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#00AAFF' }}>
                AZUL COBALTO (Z_eff: 26+)
              </div>
              <div style={{ fontSize: '18px', color: COLOR_TEXT_MUTED }}>
                Aço, Cobre denso, Baterias de Lítio, Blindagens Metálicas
              </div>
            </div>
          </div>

          <div style={{ fontSize: '16px', color: COLOR_TEXT_MUTED, marginTop: '20px' }}>
            DUAL ENERGY X-RAY // GERADORES DE 140kV & 100kV
          </div>
        </div>

        {/* Parecer de Inteligência Artificial da Receita */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'rgba(6, 7, 9, 0.95)',
            border: `2px solid ${COLOR_PRIMARY_AMBER}`,
            borderRadius: '8px',
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '18px', color: COLOR_TEXT_MUTED, letterSpacing: '2px' }}>
              RESULTADO DO ALGORITMO NEURAL
            </div>
            <div style={{ fontSize: '52px', fontWeight: 900, color: '#00FF88', margin: '10px 0' }}>
              {matchScore}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '18px' }}>
            <div>
              <span style={{ color: COLOR_TEXT_MUTED }}>DECLARADO NO MANIFESTO:</span>
              <div style={{ color: COLOR_TEXT_PRIMARY, fontWeight: 700, marginTop: '4px' }}>{declaredCategory}</div>
            </div>
            <div>
              <span style={{ color: COLOR_TEXT_MUTED }}>DETECTADO NA RADIOGRAFIA:</span>
              <div style={{ color: COLOR_PRIMARY_AMBER, fontWeight: 700, marginTop: '4px' }}>{detectedMaterial}</div>
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              backgroundColor: 'rgba(0, 255, 136, 0.1)',
              border: '1px solid #00FF88',
              borderRadius: '4px',
              color: '#00FF88',
              fontSize: '18px',
              fontWeight: 800,
              textAlign: 'center'
            }}
          >
            DESEMBARAÇO AUTOMÁTICO AUTORIZADO // CANAL VERDE
          </div>
        </div>
      </div>

      <div style={{ fontSize: '18px', color: COLOR_TEXT_MUTED, display: 'flex', justifyContent: 'space-between' }}>
        <div>SISTEMA DE AUDITORIA ADUANEIRA ELETRÔNICA</div>
        <div>PROGRAMA REMESSA CONFORME // RECEITA FEDERAL</div>
      </div>
    </div>
  );
};

// =========================================================================
// 4. BARCODE VERIFICATION MATRIX (Code 128 / Tolerância de Erro)
// =========================================================================
export interface BarcodeVerificationMatrixProps {
  title?: string;
  toleranceMm?: number;
  barcodeStandard?: string;
  errorRisk?: string;
}

export const BarcodeVerificationMatrix: React.FC<BarcodeVerificationMatrixProps> = ({
  title = 'GARGALO CRÍTICO // O CÓDIGO DE BARRAS DE 1 MILÍMETRO',
  toleranceMm = 0.12,
  barcodeStandard = 'GS1-128 & DATAMATRIX 2D',
  errorRisk = 'RETENÇÃO EM TRIAGEM MANUAL // 500 MIL PACOTES PARADOS'
}) => {
  const frame = useCurrentFrame();
  const scanLine = (frame * 10) % 400;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(6, 7, 9, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px 80px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: COLOR_TEXT_PRIMARY,
        zIndex: 20
      }}
    >
      <div style={{ borderBottom: `2px solid rgba(255, 85, 0, 0.4)`, paddingBottom: '20px' }}>
        <div style={{ fontSize: '20px', fontWeight: 800, color: COLOR_PRIMARY_AMBER, letterSpacing: '2px' }}>
          PONTO DE FALHA DO SISTEMA // TOLERÂNCIA ZERO
        </div>
        <h1 style={{ fontSize: '38px', fontWeight: 900, margin: '8px 0 0 0', color: COLOR_TEXT_PRIMARY }}>
          {title}
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '40px', margin: '30px 0', flex: 1, alignItems: 'center' }}>
        {/* Painel do Código e Leitura Laser */}
        <div
          style={{
            flex: 1.2,
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            padding: '40px',
            position: 'relative',
            color: '#000000',
            boxShadow: '0 0 40px rgba(0,0,0,0.8)'
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#333333', marginBottom: '15px' }}>
            PADRÃO DE ETIQUETA INTERNACIONAL: {barcodeStandard}
          </div>

          {/* Gráfico Simulado do Código 128 */}
          <div style={{ height: '140px', display: 'flex', alignItems: 'stretch', gap: '3px', position: 'relative' }}>
            {[
              4, 2, 6, 2, 3, 5, 2, 7, 3, 2, 5, 3, 2, 6, 4, 2, 5, 3, 2, 7, 4, 3, 5, 2, 6, 2, 4, 3, 7, 2,
              5, 4, 2, 6, 3, 5, 2, 4, 6, 2, 3, 7, 2, 5, 4, 2, 6, 3, 5, 2, 4, 6, 2, 3, 7, 2, 5, 4, 2, 6
            ].map((w, idx) => (
              <div
                key={idx}
                style={{
                  width: `${w}px`,
                  backgroundColor: idx === 28 ? '#FF0000' : '#000000' // Simulação de rasgo no meio
                }}
              />
            ))}

            {/* Linha Laser Vermelha Animada */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${(scanLine / 400) * 100}%`,
                width: '3px',
                backgroundColor: '#FF0000',
                boxShadow: '0 0 10px #FF0000'
              }}
            />
          </div>

          <div style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 900, marginTop: '20px', letterSpacing: '4px' }}>
            NL 482 910 439 BR
          </div>
        </div>

        {/* Diagnóstico do Gargalo */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ backgroundColor: 'rgba(13, 14, 21, 0.95)', border: `2px solid ${COLOR_PRIMARY_AMBER}`, borderRadius: '6px', padding: '24px' }}>
            <div style={{ fontSize: '18px', color: COLOR_TEXT_MUTED, letterSpacing: '2px' }}>TOLERÂNCIA DE DEFORMAÇÃO</div>
            <div style={{ fontSize: '52px', fontWeight: 900, color: COLOR_PRIMARY_AMBER, margin: '6px 0' }}>
              ± {toleranceMm} <span style={{ fontSize: '26px', color: COLOR_TEXT_PRIMARY }}>MM</span>
            </div>
            <div style={{ fontSize: '18px', color: COLOR_TEXT_MUTED }}>
              Um rasgo de 1mm interrompe a decodificação da câmera omnidirecional
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(13, 14, 21, 0.95)', border: '2px solid rgba(255, 0, 0, 0.6)', borderRadius: '6px', padding: '24px' }}>
            <div style={{ fontSize: '18px', color: '#FF4444', fontWeight: 800, letterSpacing: '2px' }}>CONSEQUÊNCIA IMEDIATA</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: COLOR_TEXT_PRIMARY, margin: '8px 0' }}>
              {errorRisk}
            </div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: '18px', color: COLOR_TEXT_MUTED, textAlign: 'right' }}>
        SISTEMA DE TRIAGEM AUTOMATIZADA // LEITURA ÓPTICA A 3,2 M/S
      </div>
    </div>
  );
};
