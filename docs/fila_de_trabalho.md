# Pilar 1 — O prazo já está andando sozinho

Hoje, mesmo com prazo calculado, o advogado ainda precisa:

- lembrar
- cobrar
- acompanhar

## O que o sistema deve fazer

Transformar prazo em **linha de produção automática**.

### Exemplo real de fluxo ideal

Publicação entra (já temos)

Sistema:

- classifica (já temos)
- sugere providência (já temos)
- calcula prazo (já temos)
- cria tarefa automaticamente (**ainda não temos**)

A tarefa já nasce com:

- vínculo da **providência**, **evento** e **prazo** selecionados na interface de análise
- responsável sugerido
- checklist
- modelo vinculado

> 👉 O advogado só entra quando a tarefa já está “quente”.

---

# Objetivo da fila de tarefas

A fila **não** serve para listar tudo.

Ela serve para responder em **5 segundos**:

> 👉 “O que eu preciso fazer agora para não perder prazo?”

Se o advogado abriu a tela e ainda precisa pensar, o **UX falhou**.

---

# Estrutura da tela (layout ideal)

## Estrutura em 3 blocos

```
[Filtros rápidos]
[Fila Prioritária]
[Fila Normal]
[Fila Futura]
```

Nada além disso no MVP.

---

# Componentes essenciais da tarefa

Cada item da fila deve mostrar:

1. **Indicador visual forte**
   - 🔴 prazo crítico
   - 🟡 atenção
   - 🟢 tranquilo

2. **Nome da tarefa**
   - Ex: Elaborar Contestação

3. **Processo**
   - Proc. 0001234 – 3ª Vara Cível

4. **Prazo**
   - Vence em 2 dias (20/02)

5. **Status**
   - Em elaboração

6. **Ação principal**
   - Abrir tarefa

> 👉 Sem botões extras aqui.

---

# Lógica invisível da fila

## Ordem padrão

- prazo mais próximo
- maior risco (se existir)
- status “não iniciado”

## Agrupamento visual

- 🔴 Hoje / Urgente
- 🟡 Próximos dias
- 🟢 Futuro

> ⚠️ Não obrigue o usuário a configurar isso.

---

# Filtros rápidos (mínimo viável)

No topo:

- 👤 Minhas tarefas
- ⏳ Hoje
- ⚠️ Críticas
- 📁 Por processo

Sem filtros avançados no início.

---

# Tela de execução da tarefa

Ao clicar na tarefa:

- título + prazo
- checklist sempre visível (lado esquerdo)
- conteúdo / peça (lado direito)
- ações claras por status

Checklist guia o trabalho.

---

# Fluxos de interação

## Início

- clicar em **Iniciar**
- status muda automaticamente
- sistema registra data/hora

## Checklist

- marcar itens gera sensação de progresso
- status pode avançar automaticamente (opcional)

## Protocolo

- botão **Protocolado**
- anexa comprovante
- tarefa finalizada
- prazo cumprido

---

# O que NÃO colocar

- 🚫 Kanban complexo
- 🚫 Calendário como tela principal
- 🚫 Lista gigante sem prioridade
- 🚫 Campos obrigatórios demais
- 🚫 UX corporativo pesado

> Advogado quer agir, não administrar.

---

# Exemplo de uso diário

08:30 — advogado abre o sistema:

- 🔴 Contestação – vence amanhã
- 🟡 Audiência – vence em 5 dias

Escolha óbvia.

Clica na primeira e começa a trabalhar.

---

# Regra de ouro do UX jurídico

❗ Se o advogado não souber o que fazer em 5 segundos, o UX falhou.

---

# Botões como mudança de fase

Os botões **não** são ações soltas.

Cada botão representa uma **mudança clara de etapa**.

---

# Estados da tarefa

1. Aguardando execução
2. Em elaboração
3. Em revisão
4. Pronto para protocolo
5. Protocolado

---

# Botões e comportamentos

## ▶️ Iniciar tarefa

- Status: Aguardando execução
- Ação: muda para Em elaboração
- Registra quem iniciou e quando

## 🔍 Enviar para revisão

- Status: Em elaboração
- Ação: muda para Em revisão
- Opcional: escolher revisor

## ✅ Aprovar para protocolo

- Status: Em revisão
- Ação: muda para Pronto para protocolo

## 🚀 Marcar como protocolado

- Status: Pronto para protocolo
- Ação:
  - confirmar data
  - anexar comprovante
  - salvar documento no processo
  - marcar prazo como cumprido

---

# Fluxo visual

```
Aguardando execução
        ↓
▶️ Iniciar
        ↓
Em elaboração
        ↓
🔍 Enviar para revisão
        ↓
Em revisão
        ↓
✅ Aprovar para protocolo
        ↓
Pronto para protocolo
        ↓
🚀 Marcar como protocolado
        ↓
Protocolado
```

---

# Revisão opcional

Se não houver revisor:

- Em elaboração → Pronto para protocolo

Botão:

- 🔄 Pular revisão

---

# Área Conteúdo / Peça

Checklist = o que fazer  
Conteúdo / Peça = onde o trabalho acontece

## Estrutura

1. Contexto do processo
2. Publicação / andamento
3. Peça / conteúdo
4. Anexos

---

## Contexto do processo

- número do processo
- vara / tribunal
- classe
- partes
- advogado responsável

Modo leitura.

---

## Publicação / Andamento

- texto resumido
- data
- tipo
- link para publicação completa

---

## Peça / Conteúdo

### Com peça

- editor de texto
- modelo pré-carregado
- campos preenchidos automaticamente
- trechos sensíveis destacados

### Sem peça

- campo de observações
- orientações da providência

---

## Anexos

- upload de documentos
- minuta
- comprovante de protocolo

UX: drag & drop

---

# Regra de ouro da tela da tarefa

❗ Se o advogado precisar sair dessa tela para trabalhar, ela falhou.

