# greencode - Plataforma de Logística Reversa de Resíduos Eletrônicos (CLI)

**Aluno:** João Gabriel Barros Guimarães  
**Curso:** Desenvolvimento de Software Multiplataforma - 2º DSM  
**Disciplina:** Técnicas de Programação I  
**Professor:** Prof. Dr. Eng. Gerson Penha  
**Avaliação:** Atividade de Avaliação Individual 1 (AV1)  

---

## 1. Guia Rápido


### Passo 1: Instalação das Dependências
Instala o runtime e as ferramentas de suporte:
```bash
npm install
```

### Passo 2: Inicialização da Aplicação CLI (Interativo)
Inicia o terminal interativo do sistema:
```bash
npm start
```

### Passo 3: Execução da Suíte de Testes Automatizados (E2E)
Executa a bateria de testes de integração ponta a ponta via Vitest, validando a jornada completa, criptografia AES-256 em repouso, hashing SHA-256 com Salt dinâmico, RBAC e validação estrita de CNPJ (Módulo 11):
```bash
npm test
```

### Passo 4: Compilação Estática (Build)
Verifica as tipagens em TypeScript e gera os artefatos de distribuição compilados em `dist/`:
```bash
npm run build
```

---

## 2. Guia da CLI

Ao executar `npm start` pela primeira vez, o sistema detecta a ausência da chave mestra e ativa o **Provisionamento Automático**:

1. **Definição da Credencial Mestra:** Digite a senha desejada para o usuário `admin` quando solicitado no console (exemplo: `admin123`). O sistema gerará a chave simétrica de 256 bits em `dados/master.key` e o arquivo cifrado `dados/credenciais.dat`.
2. **Login no Sistema:**
   ```text
   login admin admin123
   ```
3. **Criação de Contas com Segregação RBAC:**
   ```text
   usuario criar --usuario operador1 --senha senha123 --papel OPERADOR_CADASTRO
   usuario criar --usuario gestor1 --senha senha123 --papel GESTOR_ALMOXARIFADO
   usuario criar --usuario auditor1 --senha senha123 --papel AUDITOR
   ```
4. **Cadastro de Organização Parceira (Validação de CNPJ Módulo 11):**
   ```text
   org cadastrar --razao "Eletrônicos Reversos SA" --cnpj 11.222.333/0001-81 --cidade "São José dos Campos" --uf SP
   org listar
   ```
5. **Entrada de Lote de Resíduos (Regra Temporal $\le 90$ dias e sem datas futuras):**
   ```text
   lote criar --org <ID_DA_ORG> --nf NF-8899 --transp "LogExpress"
   lote listar
   ```
6. **Triagem de Equipamento e Geração do Código Único:**
   ```text
   equip triar --lote <ID_DO_LOTE> --tipo NOTEBOOK --modelo "Dell Latitude 5420" --peso 1.8 --valor 2800 --estado BOM_ESTADO
   equip listar
   ```
7. **Rastreabilidade e Journaling Imutável:**
   ```text
   auditoria rastrear --codigo <CODIGO_GERADO_GC-2026-XXXXXX>
   auditoria journal
   ```
8. **Verificação de Criptografia em Repouso no Terminal:**
   Em outra aba do terminal, inspecione os arquivos gravados no diretório `dados/` para constatar que nenhum dado trafega ou descansa em texto legível:
   ```bash
   cat dados/credenciais.dat
   cat dados/organizacoes.dat
   cat dados/equipamentos.dat
   ```


---

## 3. Matriz de Controle de Acesso Baseado em Papéis

| Papel | Escopo de Acesso | Operações Permitidas |
| :--- | :--- | :--- |
| **`ADMINISTRADOR`** | Irrestrito | Gestão total de usuários, chaves, organizações, lotes, equipamentos e logs de auditoria |
| **`OPERADOR_CADASTRO`** | Parceiros e Contratos | `org cadastrar`, `org listar`, `ajuda`, `sessao`, `login`, `logout` |
| **`GESTOR_ALMOXARIFADO`** | Logística e Triagem | `lote criar`, `lote listar`, `equip triar`, `equip mover`, `equip listar` |
| **`AUDITOR`** | Governança e Rastreio | `auditoria rastrear`, `auditoria journal`, `sessao` (estritamente somente leitura) |

O menu interativo da CLI renderiza dinamicamente apenas as opções correspondentes ao perfil do usuário logado.

---

## 5. Cenários de Falha e Regras de Negócio Validadas

A conformidade do sistema foi atestada pelos testes automatizados cobrindo os seguintes cenários de exceção:

1. **Tentativa de Reprovisionamento:** Tentativas de rodar o setup inicial em um ambiente já provisionado disparam erro de contenção: `"O sistema já foi provisionado anteriormente."`.
2. **Autenticação Inválida:** Rejeição de senhas incorretas ou identidades inexistentes com `"Credenciais inválidas ou usuário inativo."`.
3. **Bloqueio de Privilégio (RBAC):** Operadores comuns tentando invocar comandos administrativos recebem `"Apenas administradores podem cadastrar novos usuários."`.
4. **Dígito Verificador de CNPJ Inválido:** Validação estrita via algoritmo de **Módulo 11** rejeita sequências forjadas com `"CNPJ Inválido: [motivo]"`.
5. **Unicidade de Identificador Fiscal:** Bloqueio de duplicidade cadastral via `"Violação de Unicidade: O CNPJ informado já está cadastrado."`.
6. **Controle Temporal de Lotes:** Bloqueio de lançamentos futuros ou com defasagem superior a 90 dias: `"A data de entrada do lote não pode ser futura."` ou `"A data de entrada do lote não pode ser anterior a mais de noventa dias."`.
7. **Desmonte Sem Triagem:** Equipamentos não podem ir para desmonte sem passar por triagem prévia: `"Violação de Regra: O equipamento só pode ser encaminhado para desmonte após passar por triagem."`.
8. **Degradação Física Acentuada Sem Justificativa:** Quedas de 2 ou mais níveis de conservação física sem preenchimento do campo de justificativa são bloqueadas: `"Violação de Regra: Degradação de estado físico em 2 ou mais categorias exige justificativa textual obrigatória."`.
9. **Expiração Automática de Sessão:** Comandos executados após 31 minutos de inatividade resultam em desautenticação forçada: `"Sessão expirada por inatividade (limite de 30 minutos)."`.