import { Dialogue } from '../types';

export const defaultDialogues: Dialogue[] = [
  // ================ LEVEL A1 ================
  {
    id: "a1-coffee",
    title: "At the Coffee Shop",
    situation: "Pedindo um café e lidando com o caixa em uma típica cafeteria americana.",
    level: "A1",
    order: 1,
    imageUrl: "https://images.pexels.com/photos/19373865/pexels-photo-19373865.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=800",
    lines: [
      {
        id: "a1-c1",
        speaker: "Barista (Cashier)",
        text: "Hi there! Welcome to Brewed Awakening. What can I get started for you today?",
        translation: "Olá! Bem-vindo ao Brewed Awakening. O que posso preparar para você hoje?",
        pronunciationGuide: "Hai dér! Uél-cam tu brud a-uêi-ke-ning. Uát can ai guét star-ted fór iu tu-dei?",
        keyVocabulary: [
          { word: "What can I get started", translation: "O que posso começar/preparar" },
          { word: "Hi there", translation: "Olá" }
        ]
      },
      {
        id: "a1-c2",
        speaker: "You (Student)",
        text: "Hello! Quick question, is the pumpkin spice latte still available?",
        translation: "Olá! Uma pergunta rápida, o latte de abóbora com especiarias ainda está disponível?",
        pronunciationGuide: "Helou! Cuík cuést-tian, iz dé pam-pkin spais la-tei s-til a-vêi-la-bol?",
        keyVocabulary: [
          { word: "Quick question", translation: "Pergunta rápida" },
          { word: "Available", translation: "Disponível" }
        ]
      },
      {
        id: "a1-c3",
        speaker: "Barista (Cashier)",
        text: "It absolutely is! Would you like that hot, or iced?",
        translation: "Com certeza está! Você gostaria dele quente ou com gelo?",
        pronunciationGuide: "It ab-so-lut-ly iz! Ud iu laik dét hót, ór aist?",
        keyVocabulary: [
          { word: "It absolutely is", translation: "Com certeza está" },
          { word: "Iced", translation: "Com gelo / Gelado" }
        ]
      },
      {
        id: "a1-c4",
        speaker: "You (Student)",
        text: "I'll take a medium iced one with oat milk, please.",
        translation: "Vou querer um médio gelado com leite de aveia, por favor.",
        pronunciationGuide: "Ai-ol teik ei mi-di-um aist uán uíd out milk, pliz.",
        keyVocabulary: [
          { word: "I'll take", translation: "Eu vou querer / Eu levo" },
          { word: "Oat milk", translation: "Leite de aveia" }
        ]
      },
      {
        id: "a1-c5",
        speaker: "Barista (Cashier)",
        text: "You got it! Can I get a name for the order? It will be ready at the bar.",
        translation: "Pode deixar! Posso pegar um nome para o pedido? Ficará pronto no balcão.",
        pronunciationGuide: "Iu gót it! Can ai guét ei neim fór di ór-der? It uíl bi ré-di ét dé bar.",
        keyVocabulary: [
          { word: "You got it", translation: "Entendido / Com certeza" },
          { word: "Ready at the bar", translation: "Pronto no balcão de retirada" }
        ]
      }
    ]
  },
  {
    id: "a1-office",
    title: "First Day at Work",
    situation: "Se apresentando ao seu colega de equipe no primeiro dia na empresa.",
    level: "A1",
    order: 2,
    imageUrl: "https://images.pexels.com/photos/5439153/pexels-photo-5439153.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=800",
    lines: [
      {
        id: "a1-o1",
        speaker: "Sarah (Co-worker)",
        text: "Hey! You must be the new software designer, right? I'm Sarah.",
        translation: "Ei! Você deve ser o novo designer de software, certo? Eu sou a Sarah.",
        pronunciationGuide: "Hei! Iu mást bi dé nu sóft-uér di-zai-ner, rait? Aim sé-ra.",
        keyVocabulary: [
          { word: "You must be", translation: "Você deve ser" },
          { word: "Co-worker", translation: "Colega de trabalho" }
        ]
      },
      {
        id: "a1-o2",
        speaker: "You (Student)",
        text: "Yes, that's me! Nice to meet you, Sarah. It is my very first day.",
        translation: "Sim, sou eu mesmo! Prazer em te conhecer, Sarah. É o meu primeiríssimo dia.",
        pronunciationGuide: "Ies, déts mi! Nais tu mit iu, sé-ra. It iz mai vé-ri fêrst dei.",
        keyVocabulary: [
          { word: "Nice to meet you", translation: "Prazer em te conhecer" },
          { word: "Very first day", translation: "Primeiríssimo dia" }
        ]
      },
      {
        id: "a1-o3",
        speaker: "Sarah (Co-worker)",
        text: "Welcome aboard! Let me show you where the coffee machine and restrooms are.",
        translation: "Bem-vindo a bordo! Deixe-me mostrar onde ficam a máquina de café e os banheiros.",
        pronunciationGuide: "Uél-cam a-bórd! Lét mi xou iu uér dé cóf-i ma-xin ênd rést-rumz ar.",
        keyVocabulary: [
          { word: "Welcome aboard", translation: "Bem-vindo a bordo" },
          { word: "Restrooms", translation: "Banheiros" }
        ]
      }
    ]
  },
  {
    id: "a1-grocery",
    title: "At the Grocery Store",
    situation: "Daniel e Maria fazem compras no supermercado para preparar uma massa deliciosa.",
    level: "A1",
    order: 3,
    imageUrl: "https://images.pexels.com/photos/9705821/pexels-photo-9705821.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=800",
    lines: [
      {
        id: "a1-g1",
        speaker: "Daniel",
        text: "Hello, Maria! How are you today?",
        translation: "Olá, Maria! Como você está hoje?",
        pronunciationGuide: "He-lou, Ma-ri-a! Hau ar iu tu-dei?",
        keyVocabulary: [
          { word: "How are you", translation: "Como você está" }
        ]
      },
      {
        id: "a1-g2",
        speaker: "You (Student)",
        text: "I'm doing great, Daniel! I need to buy some ingredients for pasta tonight.",
        translation: "Estou ótima, Daniel! Preciso comprar alguns ingredientes para massa hoje à noite.",
        pronunciationGuide: "Aim du-ing greit, Dé-niel! Ai nid tu bai sam in-gri-di-ents for pás-ta tu-nait.",
        keyVocabulary: [
          { word: "I'm doing great", translation: "Estou ótimo/ótima" },
          { word: "Ingredients", translation: "Ingredientes" }
        ]
      },
      {
        id: "a1-g3",
        speaker: "Daniel",
        text: "Nice! Do you need help finding anything? The pasta sauce is in aisle three.",
        translation: "Legal! Você precisa de ajuda para encontrar algo? O molho de massa está no corredor três.",
        pronunciationGuide: "Nais! Du iu nid help fain-ding é-ni-ting? Dé pás-ta sós iz in ail tri.",
        keyVocabulary: [
          { word: "Do you need help", translation: "Você precisa de ajuda" },
          { word: "Aisle", translation: "Corredor (de supermercado)" }
        ]
      },
      {
        id: "a1-g4",
        speaker: "You (Student)",
        text: "Thank you so much! I also need fresh tomatoes and mozzarella cheese.",
        translation: "Muito obrigada! Eu também preciso de tomates frescos e queijo mozzarella.",
        pronunciationGuide: "Thénk iu sou match! Ai ól-so nid frex to-mei-touz ênd mo-za-ré-la tchiz.",
        keyVocabulary: [
          { word: "Thank you so much", translation: "Muito obrigado(a)" },
          { word: "Fresh", translation: "Fresco" }
        ]
      }
    ]
  },
  // ================ LEVEL A2 ================
  {
    id: "a2-directions",
    title: "Asking for Directions",
    situation: "Perdido no centro da cidade e pedindo direções a um morador local.",
    level: "A2",
    order: 1,
    imageUrl: "https://images.pexels.com/photos/17758034/pexels-photo-17758034.png?auto=compress&cs=tinysrgb&fit=crop&h=400&w=800",
    lines: [
      {
        id: "a2-d1",
        speaker: "You (Student)",
        text: "Excuse me, could you tell me how to get to the nearest subway station?",
        translation: "Com licença, você poderia me dizer como chegar à estação de metrô mais próxima?",
        pronunciationGuide: "Eks-kiuz mi, cud iu tel mi hau tu guét tu dé nir-est sáb-uei stei-xon?",
        keyVocabulary: [
          { word: "Excuse me", translation: "Com licença" },
          { word: "Subway station", translation: "Estação de metrô" }
        ]
      },
      {
        id: "a2-d2",
        speaker: "Local Resident",
        text: "Sure! Go straight ahead for two blocks, then turn left at the traffic light.",
        translation: "Claro! Siga em frente por dois quarteirões, depois vire à esquerda no semáforo.",
        pronunciationGuide: "Xur! Gou streit a-héd for tu blóks, den turn left ét dé tré-fik lait.",
        keyVocabulary: [
          { word: "Go straight ahead", translation: "Siga em frente" },
          { word: "Traffic light", translation: "Semáforo" }
        ]
      },
      {
        id: "a2-d3",
        speaker: "You (Student)",
        text: "Got it! And how long does it take to walk there?",
        translation: "Entendi! E quanto tempo leva para andar até lá?",
        pronunciationGuide: "Gót it! Ênd hau long daz it teik tu uók dér?",
        keyVocabulary: [
          { word: "How long does it take", translation: "Quanto tempo leva" },
          { word: "Got it", translation: "Entendi" }
        ]
      },
      {
        id: "a2-d4",
        speaker: "Local Resident",
        text: "About five minutes. You can't miss it — there's a big blue sign right above the entrance.",
        translation: "Cerca de cinco minutos. Você não tem como errar — tem uma grande placa azul bem acima da entrada.",
        pronunciationGuide: "A-baut faiv mí-nits. Iu cânt mis it — dérs a big blu sain rait a-bóv di ên-trans.",
        keyVocabulary: [
          { word: "You can't miss it", translation: "Você não tem como errar" },
          { word: "Entrance", translation: "Entrada" }
        ]
      }
    ]
  },
  {
    id: "a2-restaurant",
    title: "Ordering at a Restaurant",
    situation: "Jantando em um restaurante americano e fazendo seu pedido ao garçom.",
    level: "A2",
    order: 2,
    imageUrl: "https://images.pexels.com/photos/370984/pexels-photo-370984.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=800",
    lines: [
      {
        id: "a2-r1",
        speaker: "Waiter",
        text: "Good evening! Are you ready to order, or do you need a few more minutes?",
        translation: "Boa noite! Você está pronto para pedir, ou precisa de mais alguns minutos?",
        pronunciationGuide: "Gud iv-ning! Ar iu ré-di tu ór-der, or du iu nid a fiu mor mí-nits?",
        keyVocabulary: [
          { word: "Ready to order", translation: "Pronto para pedir" },
          { word: "A few more minutes", translation: "Mais alguns minutos" }
        ]
      },
      {
        id: "a2-r2",
        speaker: "You (Student)",
        text: "I think I'm ready! I'd like the grilled chicken with a side of mashed potatoes, please.",
        translation: "Acho que estou pronto! Eu gostaria do frango grelhado com um acompanhamento de purê de batatas, por favor.",
        pronunciationGuide: "Ai think aim ré-di! Aid laik dé grild tchi-ken uid a said ov méxd po-tei-touz, pliz.",
        keyVocabulary: [
          { word: "I'd like", translation: "Eu gostaria" },
          { word: "A side of", translation: "Um acompanhamento de" }
        ]
      },
      {
        id: "a2-r3",
        speaker: "Waiter",
        text: "Great choice! And would you like something to drink with that?",
        translation: "Ótima escolha! E gostaria de algo para beber com isso?",
        pronunciationGuide: "Greit tchóis! Ênd uud iu laik sám-ting tu drink uid dét?",
        keyVocabulary: [
          { word: "Great choice", translation: "Ótima escolha" },
          { word: "Something to drink", translation: "Algo para beber" }
        ]
      },
      {
        id: "a2-r4",
        speaker: "You (Student)",
        text: "Yes, I'll have a glass of water and a small Caesar salad to start.",
        translation: "Sim, vou querer um copo de água e uma pequena salada Caesar para começar.",
        pronunciationGuide: "Ies, ail hév a glés ov uó-ter ênd a smól si-zar sé-lad tu start.",
        keyVocabulary: [
          { word: "I'll have", translation: "Vou querer" },
          { word: "To start", translation: "Para começar" }
        ]
      }
    ]
  },
  // ================ LEVEL B1 ================
  {
    id: "b1-doctor",
    title: "At the Doctor's Office",
    situation: "Visitando o médico para uma consulta de rotina e descrevendo seus sintomas.",
    level: "B1",
    order: 1,
    imageUrl: "https://images.pexels.com/photos/7579823/pexels-photo-7579823.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=800",
    lines: [
      {
        id: "b1-d1",
        speaker: "Doctor",
        text: "Good morning! What brings you in today? How have you been feeling lately?",
        translation: "Bom dia! O que te traz aqui hoje? Como você tem se sentido ultimamente?",
        pronunciationGuide: "Gud mór-ning! Uát brings iu in tu-dei? Hau hév iu bin fi-ling leit-li?",
        keyVocabulary: [
          { word: "What brings you in", translation: "O que te traz aqui" },
          { word: "Lately", translation: "Ultimamente" }
        ]
      },
      {
        id: "b1-d2",
        speaker: "You (Student)",
        text: "Well, I've been having headaches almost every day for the past two weeks. I also feel really tired.",
        translation: "Bom, eu tenho tido dores de cabeça quase todo dia nas últimas duas semanas. Também me sinto muito cansado.",
        pronunciationGuide: "Uél, aiv bin hé-ving héd-eiks ól-moust évri dei for dé pést tu uiks. Ai ól-so fil ri-li tai-erd.",
        keyVocabulary: [
          { word: "I've been having", translation: "Eu tenho tido" },
          { word: "For the past two weeks", translation: "Nas últimas duas semanas" }
        ]
      },
      {
        id: "b1-d3",
        speaker: "Doctor",
        text: "I see. Have you noticed any changes in your sleep patterns or stress levels recently?",
        translation: "Entendo. Você notou alguma mudança nos seus padrões de sono ou níveis de estresse recentemente?",
        pronunciationGuide: "Ai si. Hév iu no-tist é-ni tchein-djez in iór slip pé-terns or strés lé-velz ri-sent-li?",
        keyVocabulary: [
          { word: "Sleep patterns", translation: "Padrões de sono" },
          { word: "Stress levels", translation: "Níveis de estresse" }
        ]
      },
      {
        id: "b1-d4",
        speaker: "You (Student)",
        text: "Actually yes. I've been working long hours and haven't been sleeping well. Maybe six hours a night at most.",
        translation: "Na verdade sim. Tenho trabalhado muitas horas e não tenho dormido bem. Talvez seis horas por noite no máximo.",
        pronunciationGuide: "Ék-tchu-a-li ies. Aiv bin uôr-king long aurs ênd hé-vent bin sli-ping uél. Mei-bi siks aurs a nait ét moust.",
        keyVocabulary: [
          { word: "Long hours", translation: "Muitas horas" },
          { word: "At most", translation: "No máximo" }
        ]
      }
    ]
  },
  // ================ LEVEL B2 ================
  {
    id: "b2-interview",
    title: "Job Interview",
    situation: "Participando de uma entrevista de emprego para uma posição de desenvolvedor em uma startup.",
    level: "B2",
    order: 1,
    imageUrl: "https://images.pexels.com/photos/5256522/pexels-photo-5256522.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=800",
    lines: [
      {
        id: "b2-i1",
        speaker: "Interviewer",
        text: "Thanks for coming in! Could you start by telling me about your experience with agile development?",
        translation: "Obrigado por vir! Você poderia começar me contando sobre sua experiência com desenvolvimento ágil?",
        pronunciationGuide: "Thénks for cá-ming in! Cud iu start bai té-ling mi a-baut iór iks-pi-ri-ens uid é-djail di-vé-lop-ment?",
        keyVocabulary: [
          { word: "Thanks for coming in", translation: "Obrigado por vir" },
          { word: "Agile development", translation: "Desenvolvimento ágil" }
        ]
      },
      {
        id: "b2-i2",
        speaker: "You (Student)",
        text: "Of course! I've been working in agile teams for over three years, primarily using Scrum methodology.",
        translation: "Claro! Eu tenho trabalhado em equipes ágeis por mais de três anos, principalmente usando a metodologia Scrum.",
        pronunciationGuide: "Ov córs! Aiv bin uôr-king in é-djail tims for ou-ver tri iirs, prai-mé-ri-li iu-zing Scram me-thó-do-lo-dji.",
        keyVocabulary: [
          { word: "For over three years", translation: "Por mais de três anos" },
          { word: "Primarily", translation: "Principalmente" }
        ]
      },
      {
        id: "b2-i3",
        speaker: "Interviewer",
        text: "That's impressive. What would you say is your biggest strength when it comes to teamwork?",
        translation: "Isso é impressionante. Qual você diria que é sua maior força quando se trata de trabalho em equipe?",
        pronunciationGuide: "Déts im-pré-siv. Uát uud iu sei iz iór bí-guest strénth uen it cams tu tim-uôrk?",
        keyVocabulary: [
          { word: "Biggest strength", translation: "Maior força/qualidade" },
          { word: "When it comes to", translation: "Quando se trata de" }
        ]
      },
      {
        id: "b2-i4",
        speaker: "You (Student)",
        text: "I believe my ability to communicate complex technical ideas in simple terms sets me apart from others.",
        translation: "Acredito que minha habilidade de comunicar ideias técnicas complexas em termos simples me diferencia dos outros.",
        pronunciationGuide: "Ai bi-liv mai a-bí-li-ti tu co-miu-ni-keit cóm-pleks ték-ni-cal ai-dí-as in sím-pol terms sets mi a-part from á-ders.",
        keyVocabulary: [
          { word: "Sets me apart", translation: "Me diferencia" },
          { word: "Complex technical ideas", translation: "Ideias técnicas complexas" }
        ]
      }
    ]
  },
  // ================ LEVEL C1 ================
  {
    id: "c1-negotiation",
    title: "Business Negotiation",
    situation: "Negociando um contrato de serviço com um cliente corporativo importante.",
    level: "C1",
    order: 1,
    imageUrl: "https://images.pexels.com/photos/7433853/pexels-photo-7433853.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=800",
    lines: [
      {
        id: "c1-n1",
        speaker: "Client",
        text: "We appreciate your proposal, but the pricing seems somewhat steep for what's being offered. Can we discuss alternatives?",
        translation: "Agradecemos sua proposta, mas o preço parece um pouco elevado para o que está sendo oferecido. Podemos discutir alternativas?",
        pronunciationGuide: "Ui a-pri-xi-eit iór pro-pou-zal, bát dé prai-sing sims sám-uat stip for uáts bi-ing ó-ferd. Cén ui dis-cás ól-ter-na-tivs?",
        keyVocabulary: [
          { word: "Somewhat steep", translation: "Um pouco elevado" },
          { word: "Discuss alternatives", translation: "Discutir alternativas" }
        ]
      },
      {
        id: "c1-n2",
        speaker: "You (Student)",
        text: "Absolutely. I understand your concern. Perhaps we could explore a phased implementation approach to spread the cost over several quarters.",
        translation: "Com certeza. Eu entendo sua preocupação. Talvez possamos explorar uma abordagem de implementação em fases para distribuir o custo ao longo de vários trimestres.",
        pronunciationGuide: "Ab-so-lut-li. Ai ân-der-stênd iór con-sérn. Per-héps ui cud iks-plor a feizd im-pli-men-tei-xon a-proutch tu spréd dé cóst ou-ver sé-vral cuór-ters.",
        keyVocabulary: [
          { word: "Phased implementation", translation: "Implementação em fases" },
          { word: "Spread the cost", translation: "Distribuir o custo" }
        ]
      }
    ]
  },
  // ================ LEVEL C2 ================
  {
    id: "c2-debate",
    title: "Academic Debate",
    situation: "Participando de um debate acadêmico sobre inteligência artificial na educação.",
    level: "C2",
    order: 1,
    imageUrl: "https://images.pexels.com/photos/8199151/pexels-photo-8199151.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=800",
    lines: [
      {
        id: "c2-db1",
        speaker: "Moderator",
        text: "The floor is yours. What's your stance on AI-driven personalized learning replacing traditional classroom methods?",
        translation: "A palavra é sua. Qual é sua posição sobre aprendizado personalizado por IA substituindo métodos tradicionais de sala de aula?",
        pronunciationGuide: "Dé flor iz iurs. Uáts iór stêns on ei-ai dri-ven pér-so-na-laizd lér-ning ri-plei-sing tra-dí-xo-nal clés-rum mé-thods?",
        keyVocabulary: [
          { word: "The floor is yours", translation: "A palavra é sua" },
          { word: "Stance", translation: "Posição/Postura" }
        ]
      },
      {
        id: "c2-db2",
        speaker: "You (Student)",
        text: "While I acknowledge the transformative potential of AI in education, I would argue that it should complement rather than supplant human instruction, particularly given the irreplaceable value of mentorship and critical discourse.",
        translation: "Embora eu reconheça o potencial transformador da IA na educação, eu argumentaria que ela deveria complementar em vez de suplantar a instrução humana, especialmente dado o valor insubstituível da mentoria e do discurso crítico.",
        pronunciationGuide: "Uáil ai ak-ná-lej dé trans-for-ma-tiv po-tén-xal ov ei-ai in é-dju-kei-xon, ai uud ar-giu dét it xud cóm-pli-ment ré-der dén sa-plênt hiu-man in-strák-xon.",
        keyVocabulary: [
          { word: "Complement rather than supplant", translation: "Complementar em vez de suplantar" },
          { word: "Critical discourse", translation: "Discurso crítico" }
        ]
      }
    ]
  }
];
