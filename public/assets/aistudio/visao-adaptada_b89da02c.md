# Visão adaptada — inventário por localidade (fatia 1)

Esta é a versão que vale a partir de agora: a fonte primária é o **arquivo de inventário**
(`Hostname; TIPO; Operadora; Localidade`), não a descoberta ativa. O prompt original
(`prompt-mapeamento-dinamico.md`) foi ajustado no mesmo sentido.

## 1. O que o anexo permite — e o que não permite

| Pergunta | Resposta com estas 4 colunas |
|---|---|
| Quantos ativos existem por localidade? | Sim |
| Quais tipos de ativo há em cada localidade? | Sim |
| Quais localidades dependem de quais operadoras? | Sim |
| Quantos circuitos (LINK) cada localidade tem? | Sim |
| O que mudou entre a versão de ontem e a de hoje? | Sim, via diff entre arquivos |
| Qual porta conecta em qual porta? | **Não** — exige LLDP/CDP ou cadastro de portas |
| Qual o IP/VLAN de cada host? | **Não** — exige coluna extra ou coleta ativa |
| O ativo está no ar agora? | **Não** — exige monitoração |

Consequência de projeto: a topologia desta fatia é **lógica/contratual** (localidade ↔ operadora),
não física. Ela responde "de quem depende esta localidade", que é a pergunta que o inventário
consegue sustentar com honestidade.

## 2. Decisões de modelagem

1. **`LINK` não é equipamento.** É um circuito. Por isso `Operadora` é obrigatória para `LINK`
   e opcional para os demais tipos.
2. **Localidade é a unidade de agrupamento.** `Cidade/UF` é separado em `name` + `uf`; sem UF,
   `uf` fica nulo. Grafias conhecidas convergem via tabela de aliases (`sao paulo` → `São Paulo`).
3. **Hostname é a chave natural.** Normalizado para maiúsculas, sem espaços; duplicata é erro.
4. **Nada é apagado.** Um host que sai do arquivo aparece como removido no diff, mas o snapshot
   anterior permanece — é isso que torna o mapeamento "dinâmico" e auditável.
5. **Colunas desconhecidas não são descartadas.** Vão para `extra`/`metadata`, o que permite
   enriquecer o CSV (IP, serial, VLAN…) sem migração e sem quebrar a ferramenta.

## 3. Contrato do arquivo

### 3.1 Colunas obrigatórias

| Coluna | Aliases aceitos | Regra |
|---|---|---|
| `Hostname` | host, nome, equipamento, device | 1–64 caracteres `A-Z 0-9 . _ -`, único (case-insensitive) |
| `TIPO` | tipo, type, categoria | vocabulário controlado; desconhecido gera **aviso**, não erro |
| `Localidade` | local, cidade, city, site, unidade | obrigatória; `Cidade/UF` ou `Cidade - UF` |
| `Operadora` | carrier, provedor, provider | **obrigatória quando `TIPO=LINK`** |

### 3.2 Tipos reconhecidos

`LINK`, `ROTEADOR`, `SWITCH`, `FIREWALL`, `SERVIDOR`, `AP`, `MODEM`, `ONU`, `OLT`,
`STORAGE`, `NOBREAK`, `TELEFONE`, `IMPRESSORA`, `CAMERA`, `NVR`.
Sinônimos (`router`, `sw`, `circuito`, `access point`, `ups`…) são convertidos.

### 3.3 Formato do arquivo

- Delimitador `;` ou `,` (detectado automaticamente).
- Codificação UTF-8 (com ou sem BOM) ou cp1252/latin-1 (Excel pt-BR).
- Campos entre aspas opcionais; linhas em branco ignoradas.
- `.xlsx` também é aceito (primeira aba, primeira linha como cabeçalho), requer `openpyxl`.

### 3.4 Extensões previstas (opcionais, sem quebrar o contrato)

`IP`, `MASCARA`, `GATEWAY`, `VLAN`, `MODELO`, `SERIAL`, `PATRIMONIO`, `STATUS`,
`CIRCUITO`, `CAPACIDADE_MBPS`, `LATITUDE`, `LONGITUDE`, `DATA_INSTALACAO`.
Todas entram em `extra` hoje e serão promovidas a campos de primeira classe quando houver
consenso de uso.

## 4. Modelo alvo (evolução da fatia 1)

```text
sites(id, name, uf, parent_id)
hosts(id, hostname, type, site_id, carrier_id, status, first_seen, last_seen, metadata jsonb)
carriers(id, name)
circuits(id, code, site_id, carrier_id, capacity_mbps, status, host_id)
snapshots(id, imported_at, source_file, sha256, host_count, site_count)
snapshot_hosts(snapshot_id, host_id, payload jsonb)     -- estado imutável por importação
changes(id, snapshot_id, kind, hostname, field, before, after, detected_at)
```

O `sha256` do arquivo evita reprocessar importações idênticas. Cada importação gera um
`snapshot`; o diff compara o snapshot atual com o anterior, não os arquivos em disco.

## 5. Mapeamento conceitual NetBox → RedeMap

| NetBox | RedeMap | Observação |
|---|---|---|
| Site / Location | Localidade | com `uf` e hierarquia opcional |
| Device | Host | hostname como chave natural |
| Manufacturer/DeviceType | `MODELO` (coluna futura) | não obrigatório nesta fase |
| Circuit + Provider | `LINK` + `Operadora` | um LINK = um circuito |
| Custom fields | colunas extras | JSONB, sem migração |
| ObjectChange | `changes` | diff por importação |
| Cable / CablePath | — | só na fase de descoberta ativa |

## 6. Regras de alerta já implementadas

- Localidade com **uma única operadora** → risco de ponto único de falha.
- `LINK` sem operadora → erro de validação.
- Hostname duplicado → erro com as duas linhas.
- Tipo desconhecido → aviso (não bloqueia a importação).

## 7. Roadmap adaptado

| Fase | Entrega | Estado |
|---|---|---|
| F1 | Ingestão CSV/XLSX, normalização, validação, relatório, Mermaid, diff | **concluída** |
| F2 | Persistência (SQLite/Postgres), snapshots por importação, diff contra o último snapshot | próxima |
| F3 | API REST + upload pela web | |
| F4 | UI: tabela por localidade + grafo interativo + timeline | |
| F5 | Descoberta ativa (SNMP/LLDP) enriquecendo o mesmo modelo | |
| F6 | Alertas/webhooks e integração com monitoração | |

## 8. Riscos conhecidos

- **Planilha manual desatualiza.** O diff resolve a detecção, não a disciplina de atualização;
  a fase F3 deve permitir que a coleta ativa corrija o inventário.
- **Sem IP não há topologia L3.** O grafo atual é de dependência, não de conectividade.
- **Nomes livres geram duplicidade.** A tabela de aliases precisa de curadoria contínua;
  o relatório de avisos é o insumo para isso.
