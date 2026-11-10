# RedeMap — Correlação Climática Multi-API, Concessões e Motor Preditivo Customizável

Plataforma de mapeamento dinâmico de rede adaptada às concessões de infraestrutura e saneamento, com suporte a múltiplos provedores meteorológicos (INMET, Open-Meteo, CEMADEN e CPTEC/INPE), análise de correlação entre alarmes/incidentes e eventos climáticos históricos, e motor de alarmes preditivos com **customização total** de limiares, pesos e regras.

---

## Decisões Confirmadas e Escopo do Cliente

> [!IMPORTANT]
> **Definições Estruturantes Confirmadas:**
> - **Multi-Provedor Meteorológico Integrado**:
>   1. **INMET**: Estações meteorológicas oficiais no Brasil (600+ estações com cálculo de proximidade por Haversine, rajada convertida em km/h, precipitação e umidade).
>   2. **Open-Meteo**: Coordenada exata, previsão horária 72h e histórico retroativo para qualquer localidade.
>   3. **CEMADEN**: Alertas municipais geo-hidrológicos (deslizamento, enxurrada, cheia) com peso de alta severidade na correlação.
>   4. **CPTEC/INPE**: Previsão oficial por município brasileiro.
> - **Customização Total da Ferramenta**:
>   - Painel de configuração de limiares (velocidade de rajada, mm de chuva por hora, acumulado 24h, temperatura crítica, umidade mínima).
>   - Ajuste dinâmico de pesos da matriz de correlação com recálculo instantâneo do histórico.
>   - Gestor visual de Concessões (17 padrão + adição de novas) e tipos de unidade (`SEDE`, `LOJA`, `OPERACIONAL`).
>   - Seleção de provedor meteorológico preferencial por concessão e gestão de tokens/chaves.
> - **Concessões atendidas (17)**: `RIOMAIS`, `CAC`, `CAP`, `CAAN`, `SAAL`, `CAPAM`, `CAV`, `JAHU`, `CAIZ`, `CAN`, `CAJ`, `CANF`, `SAAB`, `CAI`, `CAPY`, `SANEJ`, `CAJA`.
> - **Tipos de Localidade padronizados (3)**: `SEDE` (Administrativo/Central), `LOJA` (Atendimento Comercial) e `OPERACIONAL` (ETAs, ETEs, Elevatórias, Reservatórios, Poços, Torres SCADA).
> - **Contratos de Dados**: Suporte nativo aos 3 modelos de arquivo CSV:
>   1. `modelo-inventario.csv`: `Hostname; TIPO; Operadora; Localidade`.
>   2. `modelo-alertas.csv`: `Alarme; Dispositivo; Responsável; Horário Inicial; Horário Final; DuracaoMinutos; TIPO; Operadora; Localidade; Tipo de Dispositivo; Gerado por Trap; Ticket; Comentários`.
>   3. `modelo-incidentes.csv`: `Chave do item; ID do item; Resumo; Tipo de item; Status; Responsável; Criado; Atualizado; Resolvido; Motivo do alarme`.

---

## 1. Visão Geral e Conceito do Produto

O **RedeMap Concessões & Clima** unifica a infraestrutura de telecom/SCADA das concessões com a rede meteorológica brasileira:
1. **Histórico Correlacionado**: Cruza registros históricos de alarmes de rede e tickets de incidentes com a base meteorológica horária (precipitação, rajadas de vento, descargas atmosféricas e temperatura) no exato momento da ocorrência, calculando o score de correlação de acordo com as diretrizes do documento técnico.
2. **Motor Multi-Provedor (INMET + CEMADEN + Open-Meteo + CPTEC)**:
   - Busca a estação INMET mais próxima da localidade (com indicação da distância em km).
   - Consulta alertas vigentes do CEMADEN para o município da concessão.
   - Utiliza Open-Meteo na latitude/longitude exata e CPTEC/INPE para validação cruzada.
3. **Alarmes Preditivos (Previsão do Tempo)**: Avalia a previsão das próximas 24h a 72h e emite alarmes preditivos preventivos (ex.: risco de queda de enlace micro-ondas por rajadas > 60 km/h ou alagamento de poços/caixas ópticas por chuva > 30 mm/24h), permitindo atuação proativa das equipes de campo do NOC antes que a parada aconteça.
4. **Painel de Customização Total**:
   - Ajuste em tempo real de limiares e pesos de cálculo.
   - Alternância de provedores (INMET como primário, Open-Meteo como fallback).
   - Customização de concessões e inclusão de novas operadoras e circuitos.

---

## 2. Experiência do Usuário e Design Visual

### 2.1 Fluxos Principais
1. **Aba de Correlação Histórica Clima x Incidentes**:
   - Tabela comparativa e timeline interativa cruzando alarmes com o histórico climático do dia/hora.
   - Detalhe do alarme com cards de evidências: *"Rajada de 74 km/h registrada na estação INMET (a 12 km do site) 14 min antes da queda do link — Score: 0.85 (Provável Causa Climática)"*.
   - Importador para os arquivos `modelo-alertas.csv` e `modelo-incidentes.csv` com dataset pré-carregado de demonstração para as concessões.
2. **Painel de Alarmes Preditivos (Early Warning)**:
   - Radar de risco preventivo com sites em risco iminente nas próximas 12h–48h.
   - Ações recomendadas de contingência (acionar equipe de campo, vistoriar baterias/gerador de ETA, alternar para rota de redundância 4G/Satélite).
   - Simulação de disparo de alarme preditivo com emissão de notificação e ticket JIRA sugerido.
3. **Central de Customização & Configurações da Ferramenta**:
   - Sliders e inputs numéricos para ajustar limiares de vento (km/h), precipitação (mm/h) e pesos da correlação.
   - Configuração de chaves e parâmetros dos 4 provedores (INMET, Open-Meteo, CEMADEN, CPTEC).
   - Gerenciador de Concessões com edição de nomes, regiões e tipos de unidade (`SEDE`, `LOJA`, `OPERACIONAL`).
4. **Visão Geográfica e Topológica Enriquecida**:
   - Filtros dinâmicos rápidos por Concessão (`RIOMAIS`, `CAN`, `CAC`, etc.) e por Tipo (`SEDE`, `LOJA`, `OPERACIONAL`).
   - Marcadores do Google Maps com ícones diferenciados para Sedes (prédio), Lojas (comércio) e Operacionais (engrenagem/torre), com radar meteorológico ativo.

### 2.2 Identidade Visual e Estilo
- **Aparência**: Interface profissional de console operacional de telecom/saneamento, com base neutra elegante (`slate-950` / `slate-900`) e paleta 60-30-10 restrita (acento em ciano `#0891b2`, alertas em âmbar `#d97706` e vermelho `#dc2626`).
- **Disciplina Anti-Slop**: Tipografia limpa (`Plus Jakarta Sans`), numerais tabulares em métricas e horários (`tabular-nums font-mono`), sem badges inflados nem elementos decorativos supérfluos.
- **Top Bar**: Conforme contrato de 3 zonas, com marca à esquerda, links diretos de navegação e perfil/ações à direita.

---

## 3. Decisões de Produto e Arquitetura

1. **Abstração Multi-Provedor Meteorológico**:
   - Camada unificada `WeatherGateway` que orquestra INMET, Open-Meteo, CEMADEN e CPTEC/INPE.
   - Se o INMET tiver estação próxima (< 50 km), usa dados reais de estação física; se houver alerta CEMADEN ativo no município, aplica peso prioritário; usa Open-Meteo para coordenadas milimétricas e previsão horária.
2. **Customização Total e Persistência**:
   - Objeto de configuração `SystemSettings` salvo no banco de dados persistente:
     - Limiar de rajada (default: 60 km/h)
     - Limiar de chuva horária (default: 10 mm/h)
     - Limiar de acumulado 24h (default: 30 mm)
     - Limiar de temperatura crítica (default: 35°C)
     - Pesos da matriz de correlação (editáveis de 0.0 a 1.0)
     - Lista dinâmica de concessões e tipos de unidade
3. **Mecanismo de Previsão e Alarme Preditivo**:
   - Avalia a previsão meteorológica das próximas 72 horas em relação aos limiares configurados pelo usuário.
   - Emite alarmes preventivos antes do evento acontecer, categorizados por severidade (Crítico, Alerta, Preventivo).
4. **Persistência e Arquivos de Entrada**:
   - Suporte aos schemas exatos de `modelo-alertas.csv`, `modelo-incidentes.csv` e `modelo-inventario.csv`.
   - Seed realista com histórico de incidentes em dias de chuva/vento para as concessões do cliente (Rio de Janeiro, Niterói, Região dos Lagos, Cuiabá, Interior Paulista).

---

## 4. Arquitetura Técnica e Fluxo de Dados

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                              RedeMap Front-End                                 │
│                                                                                │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │ Google Maps  │   │ Topologia    │   │ Correlação   │   │ Alarmes Predit. │  │
│  │ Concessões   │   │ Rede/Circuit.│   │ Histórica    │   │ & Customização  │  │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └────────┬────────┘  │
│         │                  │                  │                    │           │
└─────────┼──────────────────┼──────────────────┼────────────────────┼───────────┘
          │                  │                  │                    │
┌─────────▼──────────────────▼──────────────────▼────────────────────▼───────────┐
│                        Serviços e Motores de Negócio                           │
│                                                                                │
│  ┌───────────────────────────────────┐    ┌─────────────────────────────────┐  │
│  │ Concession & Unit Taxonomy        │    │ Weather Multi-Provider Gateway  │  │
│  │ Service (17 Concessões + Custom)  │    │ (INMET, CEMADEN, Open-Meteo,    │  │
│  │ (SEDE, LOJA, OPERACIONAL)         │    │  CPTEC/INPE)                    │  │
│  └───────────────────────────────────┘    └─────────────────────────────────┘  │
│  ┌───────────────────────────────────┐    ┌─────────────────────────────────┐  │
│  │ CSV Importer Pipeline             │    │ Dynamic Correlation Engine      │  │
│  │ (Alertas, Incidentes, Inventário) │    │ & Customizable Threshold Matrix │  │
│  └───────────────────────────────────┘    └─────────────────────────────────┘  │
│  ┌───────────────────────────────────┐    ┌─────────────────────────────────┐  │
│  │ Settings & Customization Service  │    │ Predictive Weather Alarmer      │  │
│  │ (Limiares, Pesos, Provedores)     │    │ (Early Warning Engine 72h)      │  │
│  └───────────────────────────────────┘    └─────────────────────────────────┘  │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼─────────────────────────────────────────┐
│                  Camada de Persistência & Provedores Externos                  │
│                                                                                │
│  • DatabaseService (Sites, Assets, Alarms, Incidents, Settings, History)      │
│  • INMET API (Estações Meteorológicas Nacionais)                               │
│  • CEMADEN API (Alertas Geo-Hidrológicos)                                      │
│  • Open-Meteo REST API (Histórico Horário & Previsão)                          │
│  • CPTEC/INPE API (Previsão por Município)                                     │
│  • Google Maps JavaScript API (@vis.gl/react-google-maps)                     │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Roteiro de Implementação

- [ ] **Etapa 1: Modelos de Domínio e Configuração Customizável**
  - Adicionar as 17 Concessões (`RIOMAIS`, `CAC`, etc.) e os 3 Tipos de Localidade (`SEDE`, `LOJA`, `OPERACIONAL`).
  - Modelar `SystemSettings` com limiares (rajada, chuva, temperatura) e pesos customizáveis da matriz de correlação.
  - Modelar schemas de `modelo-alertas.csv`, `modelo-incidentes.csv` e alertas preditivos.
- [ ] **Etapa 2: Gateway Meteorológico Multi-Provedor (INMET, CEMADEN, Open-Meteo, CPTEC)**
  - Implementar o cliente unificado que gerencia a consulta às estações do INMET, alertas municipais do CEMADEN, Open-Meteo e previsão CPTEC.
  - Cálculo de distância geodésica (Haversine) até a estação INMET mais próxima do site.
- [ ] **Etapa 3: Motor de Correlação Histórica e Parser de CSVs**
  - Implementar parser para `modelo-alertas.csv` e `modelo-incidentes.csv`.
  - Cruzar eventos históricos com as observações meteorológicas do dia/hora, gerando score de correlação e descrição detalhada de evidência.
- [ ] **Etapa 4: Motor de Alarmes Preditivos por Previsão do Tempo**
  - Avaliar previsão horária (próximas 72h) com os limiares configurados.
  - Gerar alertas preventivos segmentados por Concessão e Tipo de Localidade.
- [ ] **Etapa 5: Interface do Usuário e Painel de Customização**
  - Nova aba **"Correlação Histórica"** com tabela de alarmes, incidentes e evidências climáticas.
  - Nova aba **"Alertas Preditivos"** com radar de risco e ações preventivas.
  - Nova aba/painel **"Configurações & Customização"** para editar limiares, pesos, provedores e concessões em tempo real.
  - Filtros por Concessão e Tipo (`SEDE`, `LOJA`, `OPERACIONAL`) no Google Maps e na Topologia.
- [ ] **Etapa 6: Validação, Lint e Compilação**
  - Execução de `compile_applet` e `lint_applet` para garantir zero erros.
