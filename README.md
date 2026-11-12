# RedeMap

Painel de mapeamento e inventário de ativos de rede com visualização geográfica e topológica.

## Funcionalidades

- Cadastro de sites e ativos, com importação CSV e conversão de CEP.
- Visualização da topologia de rede e dos ativos no mapa.
- Dados meteorológicos, correlação histórica, alertas preditivos e simulador de descoberta.

## Executar localmente

Node.js e npm.

Para usar a visualização com Google Maps, crie um `.env` a partir de [`.env.example`](.env.example) e configure `VITE_GOOGLE_MAPS_API_KEY`.

Na raiz do projeto, execute:

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite. Cadastre os sites ou importe o inventário por CSV e revise os dados nas telas de mapa e topologia.

## Comandos

- `npm run lint` — Verifica os tipos do TypeScript.
- `npm run build` — Gera a versão de distribuição.
- `npm run preview` — Pré-visualiza o build do Vite.

## Arquivos de referência

- [Importação CSV](src/services/csvParser.ts)
- [Mapa](src/components/GoogleMapsView.tsx)
- [Correlação](src/services/correlationEngine.ts)
