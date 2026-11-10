# Prompt — Ferramenta de Mapeamento Dinâmico de Ativos de Rede

> Copie o bloco abaixo inteiro para o agente de código. Ele é autossuficiente: não depende desta conversa.
>
> **v2 (adaptada):** a fonte primária passa a ser o arquivo de inventário por localidade
> (`Hostname; TIPO; Operadora; Localidade`). A descoberta ativa virou fase posterior. Contexto e
> contrato do arquivo em [`docs/visao-adaptada.md`](docs/visao-adaptada.md).

---

## 1. Papel e missão

Você é um engenheiro de software sênior e arquiteto de redes. Sua missão é projetar e implementar, de ponta a ponta, uma aplicação web chamada provisoriamente **RedeMap** para **mapeamento dinâmico do ambiente de ativos de rede monitorados**.

A aplicação deve descobrir e ingerir ativos a partir de fontes de monitoramento, reconciliar a identidade desses ativos entre coletas, inferir e manter a topologia de conexões ao longo do tempo, e oferecer visualização interativa com histórico de mudanças.

Trabalhe como um engenheiro de produto: entregue em fases, com código executável, testes e documentação a cada fase. Não entregue esqueleto vazio nem pseudocódigo.

## 2. Contexto e problema

O ambiente possui ativos monitorados (roteadores, switches, firewalls, servidores, access points) cuja composição e interconexão mudam com o tempo. Hoje esse mapa é mantido manualmente, fica desatualizado e não responde a perguntas como:

- O que existe hoje que não existia ontem?
- Quem está conectado a quem, e por qual evidência?
- Um ativo sumiu da rede ou apenas parou de responder à coleta?
- Qual era a topologia no momento do incidente?

O conceito é o de um *source of truth* de rede, como o NetBox, mas com uma diferença fundamental:

| Conceito | NetBox | RedeMap |
|---|---|---|
| Natureza do dado | Estado **desejado** (intenção, documentado por humanos) | Estado **observado** (descoberto automaticamente) |
| Atualização | Manual / via API | Coletas agendadas e incrementais |
| Foco | Inventário e IPAM | Topologia dinâmica + histórico de mudanças |
| Verdade | Declarada | Evidenciada, com nível de confiança |

**Regra de ouro:** nunca misture dado volátil de monitoração (métricas, latência, CPU) com o inventário. Métricas ficam na ferramenta de monitoração; o RedeMap guarda identidade, atributos duráveis, relações e evidências.

## 3. O que herdar do NetBox — e o que não herdar

Herde **conceitos e modelagem**, não código:

1. **Hierarquia de localização**: Site → Location → Rack → Asset, com árvore eficiente (`ltree` no PostgreSQL ou `parent_id` + CTE recursiva).
2. **Modelo de componentes**: Asset tem Interfaces (físicas e lógicas); cabos/links conectam terminações. A topologia é um grafo de terminações, não de caixas.
3. **IPAM hierárquico**: Aggregate → Prefix → IPRange → IPAddress, com VRF, VLAN e sobreposição de prefixos permitida por VRF.
4. **Extensibilidade sem migração**: custom fields em JSONB, tags genéricas e "context data" por escopo (site/rack/asset) — necessários porque cada tipo de ativo expõe atributos diferentes.
5. **Auditoria**: change log append-only por objeto, com autor, timestamp e diff antes/depois; journal de anotações humanas.
6. **API-first**: toda funcionalidade acessível por API, com OpenAPI gerado; UI é apenas um consumidor.
7. **Permissões granulares**: papéis + escopo por site, não apenas "admin/não-admin".

Não herde:

- Acoplamento a Django, HTMX e templates server-side na camada de apresentação.
- MPTT legado, `django-tables2`, formulários Django.
- A API de plugins do NetBox (instável entre versões) — crie a sua, mínima e versionada.
- O modelo de "intended state" como obrigatório: o RedeMap deve funcionar só com descoberta.

**Licença e marca:** o NetBox é Apache-2.0. Se reutilizar trechos de código, preserve cabeçalhos, `LICENSE` e `NOTICE`, e registre a origem no `NOTICE` do projeto. Não use o nome ou logo "NetBox" no produto. Conceitos e modelagem de domínio não são protegidos; código é.

## 4. Premissas (confirme antes de divergir)

O solicitante não definiu todos os parâmetros. Assuma os valores abaixo, registre-os em `docs/adr/0001-premissas.md` e **pergunte antes de mudá-los**:

- **Fonte inicial (fatia 1)**: arquivo de inventário CSV/XLSX com `Hostname; TIPO; Operadora; Localidade`, organizado por localidade. A descoberta ativa (SNMP/LLDP) entra depois, enriquecendo o mesmo modelo — não o substituindo.
- **Escala**: até 10.000 ativos, 100.000 interfaces, 50.000 links; coleta incremental a cada 15 minutos.
- **Equipe**: 1 a 3 desenvolvedores; prioriza-se simplicidade operacional.
- **Deploy**: contêiner único + PostgreSQL + Redis via Docker Compose; Kubernetes é opcional e fora do MVP.
- **Stack**: Python 3.12+, FastAPI, SQLAlchemy 2.x + Alembic, PostgreSQL 16, Redis, worker RQ, React + TypeScript + Vite + React Flow (ou Cytoscape.js), pytest, Ruff.
- **Idioma**: interface e documentação em português do Brasil; código, nomes de tabelas e API em inglês.

## 5. Escopo funcional

### Épico 1 — Fontes e coleta

- CRUD de **Sources** (`kind`: `csv`, `xlsx`, `snmp`, `api`), com configuração em JSON, segredo referenciado por variável de ambiente (nunca em texto plano no banco), agenda cron e `enabled`.
- **Collectors** plugáveis via interface estável:

```python
class Collector(Protocol):
    kind: str
    def test_connection(self, source: Source) -> ConnectionResult: ...
    def collect(self, source: Source, ctx: CollectionContext) -> Iterable[Observation]: ...
```

- Collector SNMP: descobre `sysName`, `sysDescr`, `sysObjectID`, `sysLocation`, interfaces (`ifName`, `ifType`, `ifPhysAddress`, `ifOperStatus`, `ifSpeed`, `ifAlias`), vizinhos LLDP/CDP (`lldpRemTable`, `cdpCacheTable`) e tabela ARP.
- Collector de API: lê hosts/itens do Zabbix ou targets do Prometheus e converte em observações.
- **Coleta incremental e idempotente**: cada execução gera um `CollectionRun` com estatísticas (descobertos, atualizados, ausentes, erros). Falha em um ativo não aborta a execução inteira; falha em uma fonte não bloqueia as demais.
- Timeouts, retry com backoff, rate limit por fonte e registro de erro por ativo.

### Épico 2 — Inventário observado

- Ativos com nome, categoria, fabricante, modelo, serial, asset tag, IP de gerência, site/rack, status de ciclo de vida (`active`, `maintenance`, `missing`, `retired`, `unknown`), `first_seen`, `last_seen`, `confidence` e `metadata` (JSONB).
- Interfaces e endereços IP vinculados ao ativo, com `first_seen`/`last_seen` e origem.
- Nenhum registro é apagado por ausência: após N execuções sem ser visto (padrão 3), o ativo vira `missing` e emite evento. Exclusão é sempre manual e auditada.

### Épico 3 — Reconciliação de identidade

- Chaves de identidade por ativo: serial + modelo, MAC de interface, `sysObjectID` + `sysName`, IP de gerência dentro do site.
- Algoritmo determinístico em camadas, com score:

| Condição | Score | Ação |
|---|---|---|
| Serial + modelo iguais | 1,00 | Vincular automaticamente |
| MAC de interface igual | 0,95 | Vincular automaticamente |
| `sysName` + `sysObjectID` iguais | 0,90 | Vincular automaticamente |
| IP de gerência + site iguais | 0,75 | Fila de revisão manual |
| Nome normalizado similar (Levenshtein/Jaro-Winkler ≥ 0,9) | 0,60–0,74 | Fila de revisão manual |
| Nenhum | 0 | Criar novo ativo |

- Limiares configuráveis; toda decisão automática é registrada com a evidência que a sustentou.
- Overrides manuais persistem e vencem o algoritmo (tabela `identity_overrides`).
- Interface de revisão: mesclar, separar e "não é o mesmo ativo".

### Épico 4 — Topologia

- **Links** entre interfaces, com `type` (`physical`, `l2`, `l3`, `tunnel`, `unknown`), `discovery_protocol` (`lldp`, `cdp`, `fdb`, `arp`, `route`, `manual`), `confidence`, `first_seen`, `last_seen` e `status`.
- Regras de inferência (implemente como pipeline, cada regra é um módulo testável):

| Evidência | Tipo | Confiança |
|---|---|---|
| LLDP/CDP bidirecional | physical | 0,95 |
| LLDP/CDP unidirecional | physical | 0,80 |
| FDB + ARP correlacionados | l2 | 0,70 |
| Mesma sub-rede + gateway padrão | l3 | 0,50 |
| Cadastro manual | manual | 1,00 |

- Deduplicação de arestas não ordenadas; múltiplas evidências para o mesmo par somam confiança (nunca passam de 1,0) e ficam registradas.
- **Snapshots de topologia** imutáveis, com `created_at`, gatilho e contagens; permitem reconstruir o mapa em qualquer data.
- Busca de caminho entre dois ativos (BFS com peso por confiança) e detecção de loops.

### Épico 5 — Visualização

- Grafo interativo: zoom, pan, layout hierárquico e força, agrupamento por site/rack, arestas coloridas por tipo e espessura por confiança.
- Filtros por site, categoria, status, VLAN e período; busca por nome/IP/serial com foco no nó.
- Drawer do nó com abas: atributos, interfaces, IPs, vizinhos, evidências, histórico.
- **Linha do tempo**: slider que troca o snapshot exibido; destaque em vermelho para o que desapareceu e verde para o que surgiu no intervalo.
- Tabelas paginadas para ativos, links, mudanças, fontes e execuções, com exportação CSV.

### Épico 6 — Mudanças e notificações

- `ChangeEvent` para: ativo criado/removido/alterado, link criado/removido, link up/down, IP adicionado/removido, ativo ausente.
- Cada evento guarda `before`/`after` (JSONB), severidade, origem e `acknowledged`.
- Webhooks com retry e assinatura HMAC; filtros por tipo de evento e site.
- Feed de mudanças na home, agrupado por execução de coleta.

### Épico 7 — Administração e API

- Autenticação local (e-mail/senha) + chave de API por usuário; sessão para a UI.
- RBAC: `admin`, `operator`, `viewer`, com escopo opcional por site.
- REST versionada em `/api/v1/` com OpenAPI 3 em `/api/v1/openapi.json` e Swagger UI.
- Endpoints mínimos: `assets`, `interfaces`, `ips`, `links`, `topology` (nodes/edges), `changes`, `sources`, `runs`, `snapshots`, `health`.
- Paginação por cursor ou `limit/offset`, filtros por campo e ordenação; erros no formato `application/problem+json`.
- GraphQL somente-leitura é desejável, não obrigatório no MVP.

## 6. Modelo de dados mínimo

Implemente com SQLAlchemy 2.x e migrações Alembic. Todas as tabelas têm `id` (UUID), `created_at` e `updated_at`.

```text
sites(id, name, slug, parent_id, address, timezone, tags jsonb)
racks(id, site_id, name, row, position, u_height)
assets(id, name, site_id, rack_id, rack_unit, category, manufacturer, model,
       serial, asset_tag, mgmt_ip, status, confidence, metadata jsonb,
       first_seen, last_seen, source_id, merged_into_id)
interfaces(id, asset_id, name, if_index, type, mac, mtu, speed,
           admin_status, oper_status, description, first_seen, last_seen)
ip_addresses(id, address inet, vrf_id, interface_id, asset_id, is_primary,
             first_seen, last_seen, source_id)
prefixes(id, prefix cidr, vrf_id, site_id, vlan_id, role)
vlans(id, vid, name, site_id)
vrfs(id, name, rd)
links(id, a_interface_id, b_interface_id, type, discovery_protocol,
      confidence, status, first_seen, last_seen, evidence jsonb)
sources(id, name, kind, config jsonb, secret_ref, schedule_cron, enabled)
collection_runs(id, source_id, started_at, finished_at, status, stats jsonb, error)
observations(id, run_id, asset_id, kind, payload jsonb, observed_at)   -- append-only
identity_keys(id, asset_id, kind, value, source_id, confidence, first_seen, last_seen)
identity_overrides(id, key_kind, key_value, asset_id, created_by, reason)
change_events(id, entity_type, entity_id, type, severity, before jsonb,
              after jsonb, detected_at, acknowledged, run_id)
topology_snapshots(id, created_at, trigger, node_count, edge_count)
users(id, email, password_hash, role, is_active)
api_keys(id, user_id, prefix, hash, expires_at)
audit_log(id, user_id, action, entity_type, entity_id, diff jsonb, created_at)
```

Índices obrigatórios: `assets(name)`, `assets(serial)`, `assets(status)`, `interfaces(asset_id)`, `interfaces(mac)`, `ip_addresses(address)`, GIN em `assets.metadata`, `links(a_interface_id)`, `links(b_interface_id)`, `change_events(detected_at)`.

## 7. Arquitetura

Monólito modular, sem microserviços no MVP:

```text
api/          rotas, schemas, dependências, versionamento
domain/       entidades, regras, reconciliação, inferência de topologia
collectors/   um pacote por fonte, implementando o Protocol Collector
storage/      modelos SQLAlchemy, repositórios, migrações
workers/      jobs de coleta, agregação e webhooks
web/          frontend React (build servido pelo FastAPI em produção)
tests/        unitários, integração e e2e
```

Regras:

- Dependências apontam para dentro: `api`/`collectors` → `domain`; `storage` implementa interfaces do `domain`. O `domain` não importa FastAPI nem SQLAlchemy.
- Coletores são *ports & adapters*: adicionar uma fonte nova não pode exigir mudança no núcleo.
- Ingestão sempre idempotente: `upsert` por chave natural, nunca `INSERT` cego.
- Eventos de mudança são gerados em transação com a escrita que os originou (outbox pattern simples).
- Toda operação de coleta é registrada e reproduzível a partir de `observations`.

## 8. Requisitos não funcionais

- **Desempenho**: lista de ativos paginada em < 300 ms (p95); endpoint de topologia com 5.000 nós e 8.000 arestas em < 2 s; renderização inicial do grafo em < 3 s.
- **Confiabilidade**: coleta é *at-least-once*; reprocessar a mesma execução não duplica dados. Um coletor travado não derruba o worker (timeout duro).
- **Segurança**: senhas com Argon2/bcrypt; segredos de SNMP/API somente em variáveis de ambiente ou cofre; API keys armazenadas como hash; rate limit por chave; auditoria de ações administrativas; HTTPS obrigatório em produção.
- **Observabilidade**: logs estruturados em JSON com `request_id` e `run_id`; métricas Prometheus (`collections_total`, `collection_duration_seconds`, `assets_total`, `links_total`); `/health` e `/ready`.
- **Operação**: `docker compose up` sobe app, worker, PostgreSQL e Redis; migrações no start; seed de demonstração com 50 ativos e topologia.
- **Qualidade**: cobertura ≥ 80% no `domain`; Ruff e `mypy` sem erros; nenhum segredo ou dado real em fixtures.

## 9. Fases de entrega

Entregue em incrementos verticais; **pare ao final de cada fase para revisão**.

| Fase | Entrega | Critério de saída |
|---|---|---|
| F0 | Scaffold, Docker Compose, CI, lint, health check | `docker compose up` responde `/health` |
| F1 | Importador CSV/XLSX com validação, normalização e relatório | Arquivo real do cliente gera inventário válido |
| F2 | Persistência, snapshots por importação e diff entre versões | Duas versões produzem lista de mudanças |
| F3 | API REST + upload pela web | Importação via HTTP, sem CLI |
| F4 | Frontend: tabela por localidade, detalhe e grafo interativo | Fluxo completo pela UI |
| F5 | Descoberta ativa (SNMP/LLDP) + reconciliação de identidade | Coleta não duplica ativos do CSV |
| F6 | Change events, timeline, webhooks, exportação | Mudança simulada aparece no feed e no webhook |
| F7 | Hardening: métricas, retenção, backup, documentação | Runbook e ADRs completos |

## 10. Critérios de aceite (testáveis)

Escreva um teste automatizado para cada item:

1. Dado um CSV com 3 ativos e 2 links, quando importo duas vezes, então existem 3 ativos e 2 links (idempotência).
2. Dado um ativo com serial `ABC123`, quando uma nova coleta retorna o mesmo serial com IP diferente, então o ativo é atualizado e **um** `ChangeEvent` de `ip_change` é emitido.
3. Dado um ativo ausente por 3 execuções consecutivas, então seu status vira `missing` e um evento é emitido; ao reaparecer, volta a `active` sem duplicação.
4. Dado LLDP de A→B e B→A, então existe exatamente um link físico com confiança 0,95 e duas evidências registradas.
5. Dado LLDP apenas de A→B, então o link existe com confiança 0,80.
6. Dado dois ativos na mesma sub-rede sem LLDP, então há um link `l3` com confiança 0,50, marcado como inferido.
7. Dado o endpoint `/api/v1/topology?site=X&at=2026-01-01`, então o grafo corresponde ao snapshot daquela data.
8. Dado um usuário `viewer` do site A, quando consulta o site B, então recebe 404 (não 403), sem vazar existência.
9. Dado um webhook cadastrado, quando um link cai, então a entrega ocorre com assinatura HMAC válida e retry em caso de 5xx.
10. Dado 5.000 nós, então `/topology` responde em menos de 2 s no ambiente de teste de carga documentado.

## 11. Anti-padrões proibidos

- Criar uma tabela por tipo de ativo (switch, firewall, servidor). Use `category` + `metadata`/custom fields.
- Sobrescrever histórico: `observations` e snapshots são append-only.
- Apagar ativo automaticamente por ausência de coleta.
- Guardar métricas de monitoração (CPU, latência, bytes) no banco de inventário.
- Fazer o frontend falar direto com SNMP ou com o banco.
- Bloquear a execução inteira por causa de um ativo inacessível.
- Deixar credenciais em `config` JSONB ou no repositório.
- Implementar tudo antes de validar a fase F1.

## 12. Formato da resposta

Para cada fase, responda nesta ordem:

1. **Plano curto** (o que será feito e por quê, em até 10 linhas).
2. **Árvore de diretórios** alterada.
3. **Código completo** de cada arquivo criado ou modificado, sem `...` ou trechos omitidos.
4. **Comandos** para rodar (migração, seed, testes).
5. **Saída real** dos testes e do lint que você executou.
6. **Decisões e riscos**: o que assumiu, o que ficou de fora, o que precisa de decisão humana.

Se algo do escopo estiver ambíguo e a decisão mudar a arquitetura, faça **uma** pergunta objetiva e prossiga com a premissa registrada. Não peça aprovação para detalhes reversíveis.

## 13. Definição de pronto

Uma fase só está pronta quando: código compila e roda, migrações aplicam do zero, testes passam, lint e tipos limpos, OpenAPI atualizado, `README` com instruções reproduzíveis, e um exemplo demonstrável de ponta a ponta. Caso contrário, declare explicitamente o que falta.
