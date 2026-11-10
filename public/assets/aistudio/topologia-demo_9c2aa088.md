# Topologia de demonstração

Gerado por `python scripts/gerar_demo.py` a partir de `data/inventario-demo-v1.csv`.

## Visão por localidade e operadora

```mermaid
graph LR
  S_Belo_Horizonte["Belo Horizonte/MG<br/>2 hosts"]
  S_Curitiba["Curitiba/PR<br/>2 hosts"]
  S_Recife["Recife/PE<br/>1 host"]
  S_Rio_de_Janeiro["Rio de Janeiro/RJ<br/>2 hosts"]
  S_Sao_Paulo["São Paulo/SP<br/>5 hosts"]
  C_Algar(["Algar"])
  C_Claro(["Claro"])
  C_Embratel(["Embratel"])
  C_Oi(["Oi"])
  C_Vivo(["Vivo"])
  S_Belo_Horizonte -->|"1 circuito"| C_Embratel
  S_Curitiba -->|"1 circuito"| C_Algar
  S_Recife -->|"1 circuito"| C_Oi
  S_Rio_de_Janeiro -->|"1 circuito"| C_Vivo
  S_Sao_Paulo -->|"1 circuito"| C_Claro
  S_Sao_Paulo -->|"1 circuito"| C_Vivo
```

## Visão por host

```mermaid
graph LR
  subgraph S_Belo_Horizonte["Belo Horizonte/MG"]
    direction TB
    H_LINK_MG_01["LINK-MG-01<br/>LINK"]
    H_RT_EDGE_MG01["RT-EDGE-MG01<br/>ROTEADOR"]
  end
  subgraph S_Curitiba["Curitiba/PR"]
    direction TB
    H_LINK_PR_01["LINK-PR-01<br/>LINK"]
    H_SRV_NTP_01["SRV-NTP-01<br/>SERVIDOR"]
  end
  subgraph S_Recife["Recife/PE"]
    direction TB
    H_LINK_PE_01["LINK-PE-01<br/>LINK"]
  end
  subgraph S_Rio_de_Janeiro["Rio de Janeiro/RJ"]
    direction TB
    H_LINK_RJ_01["LINK-RJ-01<br/>LINK"]
    H_SW_CORE_RJ01["SW-CORE-RJ01<br/>SWITCH"]
  end
  subgraph S_Sao_Paulo["São Paulo/SP"]
    direction TB
    H_FW_SP01["FW-SP01<br/>FIREWALL"]
    H_LINK_SP_01["LINK-SP-01<br/>LINK"]
    H_LINK_SP_02["LINK-SP-02<br/>LINK"]
    H_RT_EDGE_SP01["RT-EDGE-SP01<br/>ROTEADOR"]
    H_SW_CORE_SP01["SW-CORE-SP01<br/>SWITCH"]
  end
  C_Algar(["Algar"])
  C_Claro(["Claro"])
  C_Embratel(["Embratel"])
  C_Oi(["Oi"])
  C_Vivo(["Vivo"])
  H_LINK_SP_01 -->|"Vivo"| C_Vivo
  H_LINK_SP_02 -->|"Claro"| C_Claro
  H_LINK_RJ_01 -->|"Vivo"| C_Vivo
  H_LINK_MG_01 -->|"Embratel"| C_Embratel
  H_LINK_PR_01 -->|"Algar"| C_Algar
  H_LINK_PE_01 -->|"Oi"| C_Oi
```

## Resumo

```text
Inventário: C:\Users\VictorLeitedeAraujo\Downloads\Mapeamento de Redes\data\inventario-demo-v1.csv
Hosts: 12 | Localidades: 5 | Operadoras: 5 | Circuitos (LINK): 6
Tipos: FIREWALL=1, LINK=6, ROTEADOR=2, SERVIDOR=1, SWITCH=2

Dependência por localidade:
  Belo Horizonte: Embratel (1)
  Curitiba: Algar (1)
  Recife: Oi (1)
  Rio de Janeiro: Vivo (1)
  São Paulo: Claro (1), Vivo (1)

Atenção: 4 localidade(s) dependem de uma única operadora: Belo Horizonte, Curitiba, Recife, Rio de Janeiro

Nenhum problema de validação encontrado.
```
