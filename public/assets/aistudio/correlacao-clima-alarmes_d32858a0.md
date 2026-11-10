# Correlação entre alarmes e condições climáticas

## 1. O que existe no NetBox (v4.7.5)

Busca no código-fonte:

| Termo | Ocorrências |
|---|---|
| `weather`, `climate`, `chuva`, `rainfall`, `temperatura` | **0** |
| `alarm` | 0 no domínio; apenas nomes de ícone (`mdi-alert`) e payloads de XSS em testes |

O NetBox **não** possui modelo de alarme, série temporal ou integração meteorológica. Ele tem
infraestrutura de eventos, que é diferente:

| Recurso | Arquivo | Serve para |
|---|---|---|
| **Event Rules** | `netbox/netbox/events.py`, `extras/models/models.py:66` | disparar ação quando um objeto do NetBox muda, com condição em JSON |
| **Ações** | `event_rules/` | executar script, enviar webhook, gerar notificação |
| **Webhooks** | `extras/models/models.py:210` | POST com `body_template` Jinja2 e assinatura HMAC (`X-Hook-Signature`) via campo `secret` |
| **Site.latitude/longitude** | `dcim/models/sites.py` | georreferência já pronta (decimal 6 casas) |
| **Data Backends** | `core/data_backends.py` | baixar arquivos de git/S3/local — não é cliente HTTP genérico |
| **Jobs** | `core/jobs.py`, RQ | execução assíncrona e agendada |

Conclusão: o NetBox é **fonte de contexto** (site, UF, coordenadas, hierarquia), não motor de
correlação. Ele não recebe alarme do Zabbix nem consulta INMET. A correlação pertence ao RedeMap
ou a um serviço dedicado.

## 2. APIs meteorológicas recomendadas

| API | Custo | Cobertura | Histórico | Autenticação | Melhor uso |
|---|---|---|---|---|---|
| [INMET](https://portal.inmet.gov.br) | gratuito | 600+ estações no Brasil | ZIP anual público (sem token) | token para observação quase real | fonte oficial, estação mais próxima, alertas |
| [Open-Meteo](https://open-meteo.com/en/docs) | grátis p/ não comercial (10k/dia, 5k/h, 600/min); planos pagos p/ uso comercial | global, modelo 1–11 km | API histórica inclusa no tier gratuito | nenhuma (chave só no plano pago) | fallback global, séries horárias, coordenada exata |
| [CEMADEN](https://www.cemaden.gov.br) | gratuito | municipal, Brasil | — | — | alertas geo-hidrológicos (deslizamento, enchente) |
| [CPTEC/INPE](https://servicos.cptec.inpe.br/XML/) | gratuito | Brasil | limitado | — | previsão oficial por cidade (XML legado) |
| OpenWeather / Tomorrow.io | pago | global | pago | chave | SLA contratual, suporte |

**Recomendação:** INMET como fonte primária (dado oficial, horário, com rajada e precipitação) e
Open-Meteo como fallback quando a estação estiver a mais de ~50 km ou com lacuna. CEMADEN apenas
para alerta municipal, que é sinal de alto peso.

Campos do INMET relevantes: `precipitacao_mm`, `vento_rajada_ms`, `vento_ms`, `temperatura`,
`umidade`, `pressao_hpa`. Converta rajada de m/s para km/h (×3,6) antes de comparar com limiar.

## 3. Modelo de dados da correlação

```text
alarm_sources(id, name, kind)                    -- zabbix, prometheus, snmp-trap
alarms(id, source_id, external_id, host_id, site_id, severity, category,
       message, started_at, cleared_at, status, raw jsonb)
weather_stations(id, provider, external_id, name, lat, lon, uf, distance_km)
weather_observations(id, station_id, observed_at, precipitation_mm, gust_kmh,
                     wind_kmh, temperature_c, humidity, pressure_hpa, raw jsonb)
weather_alerts(id, provider, external_id, level, title, municipality,
               starts_at, ends_at, url)
correlation_rules(id, name, enabled, window_before_min, window_after_min, weight, conditions jsonb)
correlations(id, alarm_id, rule_id, score, window_start, window_end, evidence jsonb, created_at)
```

Índices: `alarms(site_id, started_at)`, `weather_observations(station_id, observed_at)`,
`correlations(alarm_id)`.

## 4. Regras de correlação (pesos somam, teto 1,0)

| Sinal | Janela | Peso |
|---|---|---|
| Alerta INMET/CEMADEN ativo para o município do site | −6 h a +6 h | 0,90 |
| Rajada > 60 km/h | −60 min a +30 min | 0,60 |
| Precipitação > 10 mm/h | −60 min a +30 min | 0,50 |
| Precipitação acumulada > 30 mm/24 h | −24 h a +6 h | 0,40 |
| Temperatura > 35 °C (falha térmica) | −120 min a +60 min | 0,35 |
| Umidade < 20 % (incêndio, poeira) | −6 h a +6 h | 0,30 |

Classificação: `≥ 0,70` provável · `0,40–0,69` possível · `< 0,40` improvável.

Regras de ouro:

- **Correlação não é causalidade.** Exiba a evidência ("rajada 74 km/h às 14:20, 12 min antes do
  alarme"), nunca um veredito de causa.
- **Um alerta explica N alarmes.** Agrupe em incidente; não gere N correlações idênticas.
- **Reavalie com dado atrasado.** Clima chega depois do alarme; a janela deve ser recalculada
  quando a observação entra (job de reconciliação, não só no ingest do alarme).
- **Fuso:** armazene UTC, exiba America/Sao_Paulo. Janela em UTC evita erro de horário de verão.
- **Estação:** escolha a mais próxima por Haversine; registre a distância e não use acima de 50 km
  sem sinalizar baixa confiança.
- **Lacuna:** observação ausente não é "sem chuva"; é `unknown` e não pontua.

## 5. Encaixe no RedeMap

1. `sites` ganha `latitude`, `longitude` (geocodificação única por município).
2. Coletor `weather` (job horário) grava `weather_observations` e `weather_alerts`.
3. Coletor de alarmes normaliza Zabbix/Prometheus para `alarms` com `site_id`.
4. Motor de correlação roda ao ingerir alarme **e** ao ingerir observação atrasada.
5. `GET /api/v1/alarms?with_correlation=true` devolve o score e a evidência.
6. UI: badge "provável causa climática" no alarme + filtro por incidente climático.

## 6. Cuidados práticos

- Open-Meteo gratuito é **não comercial**; uso interno corporativo pede avaliação de licença.
- INMET exige token para observação quase real; o histórico anual é ZIP de ~100 MB por ano.
- Dados de estação têm falhas e manutenção; trate `null` explicitamente.
- Raio (lightning) não é gratuito nas APIs comerciais; se for essencial, é contrato à parte.
- Rate limit: Open-Meteo 10k/dia é suficiente para ~1 chamada por site a cada 2 h; agrupe por
  coordenada para não estourar em inventários grandes.
