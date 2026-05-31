/**
 * Respostas simuladas para 2 campanhas completas (21 dias cada).
 * Campanha 1: cética, ansiosa, muitos pensamentos destrutivos.
 * Campanha 2: mais consciente, esperançosa, evolução clara.
 */

const campaign1 = {
  1: {
    thoughts_recurring:
      'Dinheiro nunca sobra. Todo mês é a mesma luta. Vejo colegas comprando coisa que eu não posso. Penso "não é pra mim". Comparo minha vida com a dos outros o tempo todo. Tenho medo de investir e perder. Acho que vou falhar de novo.',
    emotions:
      'Ansiedade forte pela manhã. Preocupação constante com contas. Irritação quando alguém fala de prosperidade — parece distante demais. Pouca gratidão, muito peso no peito.',
    automatic_language:
      '"As coisas são difíceis pra mim." "Não adianta tentar." "Fulano teve sorte, eu não." Reclamo do trânsito, do governo, do mercado. Falo mal do meu próprio progresso.',
  },
  2: {
    when_wrong:
      'Quando algo dá errado no trabalho, penso que sou incapaz. Quando gasto mais do que devia, me culpo por dias. Quando alguém critica, levo pra identidade.',
    future_focus:
      'Quase sempre imagino o pior cenário: demissão, dívidas, vergonha. Raramente penso num futuro leve.',
    self_description:
      'Sou uma pessoa que tenta, mas que sempre fica aquém. Trabalho duro e mesmo assim sinto que estou atrasada na vida.',
    alignment_q1:
      'Não. Minhas ações mostram medo, não confiança. Eu digo que quero mudar, mas continuo nos mesmos padrões.',
  },
  3: {
    negative_phrases:
      '"Não vai dar certo." "Eu não nasci pra isso." "Dinheiro é complicado pra mim." "Melhor não arriscar."',
    positive_replacements:
      'Tentei substituir por "Posso aprender." e "Hoje faço o que consigo." — mas ainda parecem frases de cartaz, não sinto de verdade.',
  },
  4: {
    financial_patterns:
      'Compro por impulso quando estou ansiosa. Evito olhar extrato. Adio decisões financeiras por medo de errar.',
    financial_commitment:
      'Vou tentar anotar gastos por 3 dias. Não tenho muita fé que vá mudar algo.',
    behavior_patterns:
      'Procrastino tarefas importantes. Rolo feed quando me sinto mal. Evito conversas difíceis.',
    behavior_commitment:
      'Quero acordar 15 minutos mais cedo. Sei que vou resistir.',
    thought_patterns:
      'Catastrofização sobre dinheiro e carreira.',
    chosen_pattern: 'Catastrofização financeira',
    clarity_question:
      'Se eu continuar assim, daqui 1 ano estarei no mesmo lugar, só mais cansada.',
  },
  5: {
    comparison_moment:
      'Vi uma amiga postando viagem e pensei: "Pra ela é fácil, pra mim impossível." Fiquei mal o resto do dia.',
    redirect_step:
      'Tentei respirar e focar no meu trabalho, mas voltei a comparar à noite.',
    reduce_comparison:
      'Preciso sair menos do Instagram, mas uso como escape.',
    what_matters:
      'Honestamente ainda não sei. Sinto que estou perdida.',
  },
  6: {
    life_not_want: [
      'Viver sempre preocupada com dinheiro',
      'Trabalhar muito e não ver resultado',
      'Comparar minha vida com a dos outros',
      'Me sabotar antes de tentar',
      'Acordar com ansiedade todos os dias',
    ],
    new_life: [
      'Ter tranquilidade financeira básica',
      'Trabalhar com propósito, não só por medo',
      'Celebrar minhas pequenas vitórias',
      'Tomar decisões com calma',
      'Acordar com sensação de direção',
    ],
  },
  7: {
    reality_14_days:
      'Quero pelo menos não piorar. Talvez pagar uma conta atrasada e não entrar em pânico. Não sei se consigo "criar" algo grande.',
    god_quality:
      'Providência. Tenho dificuldade de acreditar que sou cuidada. Declaro, mas não sinto.',
  },
  8: {
    focus_area: 'Finanças',
    altered_reality:
      'Ainda não consigo visualizar com clareza. Vejo um cenário vago de contas em dia, mas parece distante.',
    where_are_you: 'Em casa, olhando planilha no notebook',
    what_changed: 'As contas estão organizadas (imagino)',
    how_you_feel: 'Aliviada, mas desconfiada',
    routine_diff: 'Olho o extrato sem medo (seria bom)',
  },
  9: {
    why_transform: 'Porque estou cansada de viver em modo sobrevivência.',
    impact_loved: 'Quero dar mais segurança pra minha família, não passar ansiedade.',
    who_become: 'Alguém mais calma e confiante com dinheiro.',
    why_important: 'Porque minha saúde mental está ligada a isso.',
  },
  10: {
    scene_where: 'No meu apartamento, manhã de sábado',
    scene_doing: 'Revisando metas financeiras com calma',
    scene_feeling: 'Paz, leveza',
    scene_routine: 'Acordar sem aquela angústia no peito',
    scene_different: 'Não evitar olhar o banco',
    full_scene:
      'Acordo, tomo café, abro o app do banco sem medo, vejo que está tudo ok, sorrio. Sinto que estou no controle.',
  },
  11: {
    gratitude_financial: [
      'Tenho um emprego fixo',
      'Consigo pagar aluguel em dia',
      'Tenho comida na geladeira',
      'Já sobrevivi a meses difíceis',
      'Tenho pessoas que me apoiam',
    ],
    gratitude_phrase:
      'Agradeço pelo que tenho hoje, mesmo achando que deveria ser mais.',
  },
  12: {
    identity_phrases: [
      'Eu sou alguém que está aprendendo',
      'Eu sou alguém que não desiste fácil',
      'Eu sou alguém que se observa',
      'Eu sou alguém que quer mudar',
      'Eu sou alguém que ainda tem medo, mas tenta',
    ],
  },
  13: {
    qualities: ['Persistência', 'Empatia', 'Organização', 'Criatividade', 'Honestidade'],
    qualities_help:
      'Minha persistência me mantém de pé. Organização pode me ajudar com finanças se eu parar de evitar.',
    deserve_belief:
      'Sim. Tenho uma voz interna que diz que prosperidade é "pra outros". Vem da infância, ouvi muito "dinheiro é difícil".',
  },
  14: {
    reality_build:
      'Quero estabilidade financeira e menos ansiedade. Quero acreditar que posso construir algo.',
    why_change: 'Porque do jeito que está não dá mais — estou exausta.',
    becoming: 'Uma mulher mais consciente e menos reativa.',
    signature_name: 'Marina',
    signature_date: '2026-02-10',
  },
  15: {
    who_was: 'Alguém que vivia reagindo ao medo, comparando, se sabotando.',
    what_changed_14:
      'Comecei a observar mais. Ainda caio nos padrões, mas percebo mais rápido.',
    who_becoming_now: 'Alguém que escolhe com mais intenção, mesmo com medo.',
  },
  16: {
    financial_decision: 'Decidi cancelar uma assinatura inútil e guardar R$50 este mês.',
    smallest_step: 'Separar R$50 na segunda-feira.',
    alignment_decision: 'Parar de comprar por impulso quando estou ansiosa.',
  },
  17: {
    coherent_action: 'Fiz a transferência de R$50 e anotei no caderno.',
    action_done: 'Sim, transferi. Foi pequeno, mas foi.',
  },
  18: {
    money_habit: 'Compro por impulso quando estou estressada.',
    money_thoughts: 'Dinheiro vai embora rápido. Nunca sobra.',
    childhood_belief: 'Ouvia "não temos dinheiro pra isso" constantemente.',
    new_relation: 'Quero ver dinheiro como ferramenta, não inimigo.',
    belief_replacement: 'Posso aprender a administrar melhor, passo a passo.',
    money_alignment: 'Hoje escolhi não comprar algo desnecessário.',
  },
  19: {
    pause_1: 'Antes de abrir o app de delivery, respirei e bebi água.',
    pause_2: 'Quando vi promoção online, esperei 10 minutos.',
    pause_3: 'Antes de reclamar do trabalho, parei e listei 1 coisa boa.',
    returns_count: '3 vezes consegui pausar hoje.',
  },
  20: {
    who_before: 'Ansiosa, cética, comparativa, reativa.',
    who_today: 'Mais observadora. Ainda ansiosa, mas com mais consciência.',
    biggest_fruit: 'Perceber meus padrões antes de agir neles.',
  },
  21: {
    day1_self: 'Estava perdida, cheia de medo e pensamentos destrutivos.',
    changes_21:
      'Aprendi a observar, nomear emoções, fazer pequenas ações coerentes. Não estou "curada", mas estou diferente.',
    reality_sustain:
      'Continuar pausas conscientes, guardar todo mês, revisar metas semanalmente.',
  },
}

const campaign2 = {
  1: {
    thoughts_recurring:
      'Ainda aparece "e se não der certo?", mas percebo mais rápido. Hoje pensei em abundância quando vi uma conta paga. Notei 3 pensamentos de comparação e redirecionei 2. Sinto que estou aprendendo a escolher o foco.',
    emotions:
      'Acordei com leve ansiedade, mas consegui acalmar com respiração. Gratidão pela manhã — sol, café, saúde. Esperança apareceu quando organizei a semana. Menos peso no peito que na primeira jornada.',
    automatic_language:
      'Ainda escorreguei em "é difícil", mas corrigi para "estou construindo". Evitei fofoca no almoço. Falei comigo mesma de forma mais gentil.',
  },
  2: {
    when_wrong:
      'Errei um prazo e, em vez de me definir como incapaz, perguntei o que posso ajustar.',
    future_focus:
      'Imagino um futuro estável, com reserva de emergência e projetos que me empolgam.',
    self_description:
      'Sou alguém em transformação. Aprendo, aplico, reviso. Não sou perfeita, mas sou consistente.',
    alignment_q1:
      'Sim, mais do que antes. Minhas ações pequenas estão alinhadas com quem quero ser.',
  },
  3: {
    negative_phrases:
      'Identifiquei só 2 hoje: "não vai dar" e "sou atrasada".',
    positive_replacements:
      '"Estou no meu ritmo." "Cada passo conta." Sinto mais verdade nelas agora.',
  },
  4: {
    financial_patterns:
      'Ainda sinto impulso às vezes, mas anoto antes de comprar. Olho extrato toda semana.',
    financial_commitment:
      'Guardar R$100 toda segunda e revisar assinaturas no domingo.',
    behavior_patterns:
      'Menos scroll infinito. Mais pausas. Começo tarefas difíceis de manhã.',
    behavior_commitment:
      'Manter rotina de 20 min de planejamento diário.',
    thought_patterns:
      'Gratidão e visão de futuro aparecem mais.',
    chosen_pattern: 'Gratidão antecipada',
    clarity_question:
      'Se continuar assim, em 1 ano terei reserva, mais calma e clareza de direção.',
  },
  5: {
    comparison_moment:
      'Vi post de viagem e pensei: "Que legal por ela." Senti inspiração, não inveja.',
    redirect_step:
      'Fui caminhar 10 minutos e voltei pro meu plano da semana.',
    reduce_comparison:
      'Limitei Instagram a 30 min/dia. Funcionou.',
    what_matters:
      'Construir minha estabilidade com paz, não com pressa.',
  },
  6: {
    life_not_want: [
      'Ansiedade crônica com dinheiro',
      'Compras por impulso',
      'Autossabotagem',
      'Comparação constante',
      'Procrastinar sonhos',
    ],
    new_life: [
      'Reserva financeira crescente',
      'Decisões conscientes',
      'Rotina de gratidão',
      'Projetos com propósito',
      'Corpo e mente mais leves',
    ],
  },
  7: {
    reality_14_days:
      'Quero fechar o mês no azul, guardar R$400 e sentir paz ao revisar contas.',
    god_quality:
      'Abundância. Declaro: sou providenciada e sou co-criadora da minha vida.',
  },
  8: {
    focus_area: 'Finanças',
    altered_reality:
      'Estou no meu apartamento, contas em dia, planilha clara, sensação de controle e leveza.',
    where_are_you: 'Home office, manhã ensolarada',
    what_changed: 'Tenho reserva, gastos conscientes, metas claras',
    how_you_feel: 'Grata, confiante, tranquila',
    routine_diff: 'Revisão financeira semanal virou hábito',
  },
  9: {
    why_transform: 'Porque mereço viver com paz e propósito.',
    impact_loved: 'Quero ser exemplo de calma e responsabilidade pra minha família.',
    who_become: 'Uma mulher próspera, consciente e generosa.',
    why_important: 'Transformação interior reflete em tudo — saúde, relações, dinheiro.',
  },
  10: {
    scene_where: 'Apartamento organizado, plantas, luz natural',
    scene_doing: 'Planejando investimentos e projetos',
    scene_feeling: 'Empolgação calma, gratidão',
    scene_routine: 'Manhãs sem urgência, noites de descanso real',
    scene_different: 'Dinheiro é aliado, não ameaça',
    full_scene:
      'Acordo grata, medito 5 min, reviso metas, trabalho focada, almoço com presença, guardo dinheiro, durmo em paz.',
  },
  11: {
    gratitude_financial: [
      'Renda estável que cresceu',
      'Reserva de emergência iniciada',
      'Aprendi a dizer não a gastos desnecessários',
      'Tenho mentores e amigos que me elevam',
      'Vejo frutos da primeira jornada',
    ],
    gratitude_phrase:
      'Eu agradeço porque minha nova realidade financeira já está acontecendo.',
  },
  12: {
    identity_phrases: [
      'Eu sou abundante',
      'Eu sou disciplinada com leveza',
      'Eu sou grata pelo presente',
      'Eu sou criadora da minha vida',
      'Eu sou alguém que prospera com consciência',
    ],
  },
  13: {
    qualities: ['Disciplina', 'Gratidão', 'Visão', 'Coragem', 'Generosidade'],
    qualities_help:
      'Disciplina me mantém consistente. Gratidão abre espaço para receber mais.',
    deserve_belief:
      'A crença de "não mereço" enfraqueceu muito. Quando aparece, eu questiono e substituo.',
  },
  14: {
    reality_build:
      'Prosperidade consciente, reserva sólida, projetos alinhados ao propósito.',
    why_change: 'Porque experimentei que mudança real é possível.',
    becoming: 'A versão de mim que escolhe abundância todos os dias.',
    signature_name: 'Marina',
    signature_date: '2026-05-20',
  },
  15: {
    who_was: 'Na primeira campanha: cética, reativa, cheia de medo.',
    what_changed_14:
      'Hoje observo, escolho, ajo. Emoções negativas existem, mas não comandam.',
    who_becoming_now: 'Uma mulher crente no processo e coerente com suas escolhas.',
  },
  16: {
    financial_decision: 'Aumentei aporte mensal e abri conta separada para reserva.',
    smallest_step: 'Transferir R$150 hoje.',
    alignment_decision: 'Investir em conhecimento financeiro toda semana.',
  },
  17: {
    coherent_action: 'Transferi R$150 e assisti aula sobre investimentos.',
    action_done: 'Sim, com satisfação.',
  },
  18: {
    money_habit: 'Reviso gastos semanalmente e celebro metas batidas.',
    money_thoughts: 'Dinheiro circula e retorna quando administro bem.',
    childhood_belief: 'Reescrevi: "Posso aprender e prosperar."',
    new_relation: 'Dinheiro é ferramenta de liberdade e impacto.',
    belief_replacement: 'Abundância é meu estado natural quando escolho consciência.',
    money_alignment: 'Hoje investi em mim (curso) sem culpa.',
  },
  19: {
    pause_1: 'Pausei antes de compra online — não comprei.',
    pause_2: 'Respirei antes de responder e-mail estressante.',
    pause_3: 'Gratidão antes de reclamar do trânsito.',
    returns_count: '5 pausas conscientes hoje.',
  },
  20: {
    who_before: 'Cética, ansiosa, comparativa.',
    who_today: 'Grata, motivada, consciente, mais crente.',
    biggest_fruit: 'Reduzi pensamentos destrutivos e aumentei ações alinhadas.',
  },
  21: {
    day1_self:
      'Na primeira campanha estava cheia de dúvida. Na segunda, cheguei mais aberta.',
    changes_21:
      'Vejo evolução clara: menos medo, mais gratidão, mais ação. Comparando dia 1 das duas campanhas, sou outra pessoa.',
    reality_sustain:
      'Manter práticas diárias, revisão semanal, gratidão e metas financeiras.',
  },
}

module.exports = { campaign1, campaign2 }
