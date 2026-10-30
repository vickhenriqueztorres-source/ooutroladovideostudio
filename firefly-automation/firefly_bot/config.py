"""Configuração única e imutável do projeto."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Config:
    """Valores deliberados para uma UI lenta, sem depender de arquivo externo."""

    # A UI pode demorar para materializar elementos mesmo após a navegação terminar.
    SELECTOR_TIMEOUT: int = 60_000
    # Vinte minutos cobrem o tempo de renderização em filas de alta demanda no Firefly.
    GENERATION_BUDGET: int = 1_200_000
    # O watchdog recebe margem de vinte e cinco minutos.
    WATCHDOG_WALL_CLOCK: int = 1_500_000
    # Navegação do Firefly é pesada e não deve falhar por um timeout de poucos segundos.
    NAV_TIMEOUT: int = 90_000
    # Exportação pode iniciar renderização adicional antes de disponibilizar o arquivo.
    DOWNLOAD_TIMEOUT: int = 120_000
    UI_RESPONSE_TIMEOUT: int = 8_000
    DOWNLOAD_START_TIMEOUT: int = 12_000
    DOWNLOAD_COMPLETION_TIMEOUT: int = 300_000
    DOWNLOAD_STABILITY_CHECKS: int = 3
    DOWNLOAD_STABILITY_DELAY_MS: int = 1_000
    # Cada leitura do DOM deve ceder o controle; uma página pesada não pode
    # bloquear o slot inteiro até o watchdog de processo.
    STATE_READ_TIMEOUT: int = 15_000

    # Pausas variáveis entre jobs reduzem cadência rígida sem bloquear sincronização da UI.
    JITTER_MIN: int = 8
    JITTER_MAX: int = 20

    # Uma única sessão Chrome pode atender várias abas. O padrão continua serial
    # para preservar compatibilidade; o operador habilita paralelismo pela CLI.
    DEFAULT_CONCURRENCY: int = 1
    MAX_CONCURRENT_TABS: int = 6
    # As abas permanecem simultâneas, mas os cliques de geração não acontecem
    # exatamente no mesmo instante.
    TAB_START_STAGGER_SECONDS: float = 3.0

    # Limite explícito impede tentativa infinita para o mesmo prompt com falha de infraestrutura.
    MAX_ATTEMPTS: int = 3
    # Três telas desconhecidas consecutivas indicam mudança de UI ou bloqueio e exigem pausa.
    UNKNOWN_THRESHOLD: int = 3

    # Teto horário protege a conta e mantém a operação dentro de um ritmo controlado.
    MAX_GENERATIONS_PER_HOUR: int = 500

    # Arquivos menores que 100 KB são implausíveis para um vídeo exportado válido.
    MIN_FILE_SIZE_BYTES: int = 100_000

    # Caminhos relativos permitem mover o projeto sem alterar configuração local.
    DB_PATH: str = "data/firefly_jobs.db"
    DOWNLOAD_DIR: str = "downloads"
    SCREENSHOT_DIR: str = "screenshots"
    OUTPUT_DIR: str = "saida"
    CHROME_PROFILE_DIR: str = "data/chrome_profile"

    # Página alvo e viewport estável para a execução headed com Chrome real.
    FIREFLY_URL: str = "https://firefly.adobe.com/generate/video"
    VIEWPORT_WIDTH: int = 1920
    VIEWPORT_HEIGHT: int = 1080

    @classmethod
    def from_root(cls, root_dir: Path | None = None) -> Config:
        """Adaptador temporário para os entrypoints posteriores ao Sprint 1."""
        config = cls()
        object.__setattr__(config, "_root_dir", (root_dir or Path.cwd()).resolve())
        return config

    @property
    def root_dir(self) -> Path:
        return getattr(self, "_root_dir", Path.cwd().resolve())

    @property
    def db_path(self) -> Path:
        return self.root_dir / self.DB_PATH

    @property
    def profile_dir(self) -> Path:
        env_profile = os.environ.get("FIREFLY_CHROME_PROFILE_DIR")
        if env_profile and Path(env_profile).exists():
            return Path(env_profile).resolve()
        return self.root_dir / self.CHROME_PROFILE_DIR

    @property
    def downloads_dir(self) -> Path:
        return self.root_dir / self.DOWNLOAD_DIR

    @property
    def screenshots_dir(self) -> Path:
        return self.root_dir / self.SCREENSHOT_DIR

    @property
    def output_dir(self) -> Path:
        return self.root_dir / self.OUTPUT_DIR

    @property
    def selector_timeout_ms(self) -> int:
        return self.SELECTOR_TIMEOUT

    @property
    def nav_timeout_ms(self) -> int:
        return self.NAV_TIMEOUT

    @property
    def export_timeout_ms(self) -> int:
        return self.DOWNLOAD_TIMEOUT

    @property
    def ui_response_timeout_ms(self) -> int:
        return self.UI_RESPONSE_TIMEOUT

    @property
    def download_start_timeout_ms(self) -> int:
        return self.DOWNLOAD_START_TIMEOUT

    @property
    def download_completion_timeout_ms(self) -> int:
        return self.DOWNLOAD_COMPLETION_TIMEOUT

    @property
    def download_stability_checks(self) -> int:
        return self.DOWNLOAD_STABILITY_CHECKS

    @property
    def download_stability_delay_seconds(self) -> float:
        return self.DOWNLOAD_STABILITY_DELAY_MS / 1000

    @property
    def state_read_timeout_seconds(self) -> float:
        return self.STATE_READ_TIMEOUT / 1000

    @property
    def generation_budget_seconds(self) -> int:
        override = os.environ.get("FIREFLY_GENERATION_BUDGET_MS") or os.environ.get(
            "GENERATION_BUDGET"
        )
        if override:
            return int(override) // 1000
        return self.GENERATION_BUDGET // 1000

    @property
    def watchdog_wall_clock_seconds(self) -> int:
        override = os.environ.get("FIREFLY_WATCHDOG_WALL_CLOCK_MS") or os.environ.get(
            "WATCHDOG_WALL_CLOCK"
        )
        if override:
            return int(override) // 1000
        return self.WATCHDOG_WALL_CLOCK // 1000

    def validate_concurrency(self, value: int) -> int:
        if not 1 <= value <= self.MAX_CONCURRENT_TABS:
            raise ValueError(
                f"concorrência precisa estar entre 1 e {self.MAX_CONCURRENT_TABS}: {value}"
            )
        return value

    @property
    def tab_start_stagger_seconds(self) -> float:
        return self.TAB_START_STAGGER_SECONDS

    @property
    def jitter_min_seconds(self) -> float:
        return float(self.JITTER_MIN)

    @property
    def jitter_max_seconds(self) -> float:
        return float(self.JITTER_MAX)

    @property
    def poll_interval_seconds(self) -> float:
        return 3.0

    @property
    def min_file_size_bytes(self) -> int:
        return self.MIN_FILE_SIZE_BYTES

    @property
    def chrome_channel(self) -> str:
        return "chrome"

    @property
    def firefly_url(self) -> str:
        return self.FIREFLY_URL

    @property
    def max_watchdog_restarts(self) -> int:
        return 5

    @property
    def watchdog_restart_window_seconds(self) -> int:
        return 3600

    @property
    def watchdog_backoff_cap_seconds(self) -> int:
        return 60
