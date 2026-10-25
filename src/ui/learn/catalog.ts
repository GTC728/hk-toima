/** 學打牌課程目錄（Chess.com Learn 式）
 *
 * - zero：零基礎 → 識組 17（design/learn-zero-whiteboard.md）
 * - better：識糊之後 → 打好啲（design/learn-better-whiteboard.md）
 * - master：打好啲之後 → 大師（design/learn-master-whiteboard.md）
 */

export type LearnStep = {
  title: string
  body: string
  /** 可選示範牌 */
  tiles?: string[]
}

export type LearnTrack = 'zero' | 'better' | 'master'

export type LearnLesson = {
  id: string
  title: string
  blurb: string
  level: '入門' | '進階' | '進深'
  track: LearnTrack
  minutes: number
  steps: LearnStep[]
}

export const LEARN_LESSONS: LearnLesson[] = [
  {
    id: 'what-is-this',
    title: '呢個遊戲係咩',
    blurb: '四人一枱、輪流摸打；目標係砌成一套完整手牌。',
    level: '入門',
    track: 'zero',
    minutes: 3,
    steps: [
      {
        title: '四人圍一枱',
        body: '香港台麻係四個人打。每人前面有一對手牌（只得自己睇到）。中間會放出大家打出嚟嘅牌。你唔使識其他桌游——記住：輪到你就「攞一張、出一張」。',
      },
      {
        title: '點算贏',
        body: '唔係打到對手冇牌。贏係「食糊」：你手上嘅牌組成指定形狀（下面會教），差一張齊，再攞到／食到嗰張。組得成先有分數；呢階段你只需要識組形。',
      },
      {
        title: '你而家識咗',
        body: '四人、輪流、目標係砌完整手牌食糊。下一課學點認每一隻牌。',
      },
    ],
  },
  {
    id: 'read-tiles',
    title: '點認每一隻牌',
    blurb: '萬筒索點睇、字牌同花牌係咩。',
    level: '入門',
    track: 'zero',
    minutes: 5,
    steps: [
      {
        title: '三種數牌',
        body: '萬＝寫住「萬」同數字；筒＝圓點（點愈多數字愈大）；索＝竹竿樣條紋。每種都有 1 至 9。同一個花色（例如全部係筒）先可以排成「連續」。',
        tiles: ['man-1', 'man-5', 'man-9', 'pin-1', 'pin-5', 'pin-9', 'sou-1', 'sou-5', 'sou-9'],
      },
      {
        title: '字牌',
        body: '東南西北＝風；中、發、白＝三元。字牌無「2·3·4」連續，只可以三隻一樣做一組，或者兩隻一樣做「眼」。',
        tiles: [
          'wind-east',
          'wind-south',
          'wind-west',
          'wind-north',
          'dragon-zhong',
          'dragon-fa',
          'dragon-bai',
        ],
      },
      {
        title: '花牌',
        body: '春夏秋冬、梅蘭菊竹唔入你砌糊嘅組。摸到就要亮出嚟，再從牆尾補一張普通牌——補完先當你呢輪摸咗牌，之後通常都要打一張。',
        tiles: ['flower-spring', 'flower-plum'],
      },
    ],
  },
  {
    id: 'sixteen-seventeen',
    title: '十六同十七',
    blurb: '平時揸 16；食糊嗰下係 17。',
    level: '入門',
    track: 'zero',
    minutes: 3,
    steps: [
      {
        title: '平時十六張',
        body: '港式台麻每人面前維持十六張（未計已亮出嘅碰／上等）。輪到你：摸第十七張入嚟，再揀一張打走，變返十六。',
      },
      {
        title: '食糊十七張',
        body: '當你「差一張就齊」時叫聽牌／叫糊。嗰下食到嘅牌算入去，成手一共十七張——呢十七張要啱個公式（下一課）。',
      },
      {
        title: '記住一句',
        body: '摸打循環睇 16；贏嘅形睇 17。',
      },
    ],
  },
  {
    id: 'melds-and-pair',
    title: '面子同眼——糊嘅公式',
    blurb: '5 組面子 + 1 對眼 = 17 張。',
    level: '入門',
    track: 'zero',
    minutes: 5,
    steps: [
      {
        title: '公式',
        body: '標準糊：五個「面子」加一對「眼」。每個面子 3 張，眼 2 張：5×3＋2＝17。你只要砌到呢個數同呢個結構，就係一副標準糊。',
      },
      {
        title: '面子得兩種',
        body: '① 順子：同一花色（萬或筒或索）三張連續數字，例如筒 4·5·6。字牌唔可以做順。② 刻子：三張完全一樣，例如三隻紅中、三隻九萬。',
        tiles: ['pin-4', 'pin-5', 'pin-6', 'dragon-zhong', 'dragon-zhong', 'dragon-zhong'],
      },
      {
        title: '眼（將）',
        body: '眼就係兩張一樣，例如兩隻五索、兩隻西風。五個面子齊咗，最後要有呢一對。',
        tiles: ['sou-5', 'sou-5'],
      },
    ],
  },
  {
    id: 'build-chows',
    title: '點砌順子',
    blurb: '只可以同花色、連續三張。',
    level: '入門',
    track: 'zero',
    minutes: 4,
    steps: [
      {
        title: '合法例子',
        body: '一萬二萬三萬 ✓；五筒六筒七筒 ✓；二索三索四索 ✓。',
        tiles: ['man-1', 'man-2', 'man-3', 'pin-5', 'pin-6', 'pin-7'],
      },
      {
        title: '唔得嘅',
        body: '一萬二筒三索 ✗（花色唔同）。一索二索四索 ✗（唔連續）。東南北 ✗（字牌無順）。',
      },
      {
        title: '小練習心法',
        body: '睇手牌時，試下將同花色排好，搵有冇三張捱住嘅數字——嗰堆就係順胚。',
      },
    ],
  },
  {
    id: 'build-pungs-pair',
    title: '點砌刻同眼',
    blurb: '三隻一樣＝刻；兩隻一樣＝眼。',
    level: '入門',
    track: 'zero',
    minutes: 3,
    steps: [
      {
        title: '刻',
        body: '三隻九筒、三隻南風、三隻發財都係刻。第四隻一樣就變成槓（之後先教）。',
        tiles: ['pin-9', 'pin-9', 'pin-9', 'wind-south', 'wind-south', 'wind-south'],
      },
      {
        title: '眼',
        body: '淨係兩隻一樣就係眼候補。一副糊只需要一對眼；多出來嘅對可以之後拆或者等第三隻變刻。',
      },
      {
        title: '串起嚟',
        body: '你要嘅係：刻同順加埋五組，再加一對眼。下一課睇一副完整示範。',
      },
    ],
  },
  {
    id: 'full-hand-17',
    title: '一副完整十七張',
    blurb: '睇實物點樣加到 17。',
    level: '入門',
    track: 'zero',
    minutes: 4,
    steps: [
      {
        title: '示範（全門清）',
        body: '順：萬123、筒456、索789、萬567；刻：中中中；眼：白白。數下：4 順×3＋1 刻×3＋眼 2＝12＋3＋2＝17。',
        tiles: [
          'man-1',
          'man-2',
          'man-3',
          'pin-4',
          'pin-5',
          'pin-6',
          'sou-7',
          'sou-8',
          'sou-9',
          'man-5',
          'man-6',
          'man-7',
          'dragon-zhong',
          'dragon-zhong',
          'dragon-zhong',
          'dragon-bai',
          'dragon-bai',
        ],
      },
      {
        title: '叫糊時少一張',
        body: '若果未有最後嗰隻白，你手上就係 16 張、听「白」。摸到或者食人打出嘅白，就變 17 食糊。',
      },
      {
        title: '有人鳴過',
        body: '若果其中一組已經碰／上亮咗出嚟，嗰 3 張唔再揸喺暗手，但仍然計入五個面子之一。暗手張數會少啲，公式一樣成立。',
      },
    ],
  },
  {
    id: 'turn-flow',
    title: '一輪點過',
    blurb: '牆、河、座位、摸打。',
    level: '入門',
    track: 'zero',
    minutes: 4,
    steps: [
      {
        title: '牆同河',
        body: '未摸嘅牌砌成「牆」。打出嚟畀大家睇嘅叫「河」（或者棄牌區）。牆摸晒仲未有人糊＝流局，呢舖完。',
      },
      {
        title: '座位名',
        body: '上家＝你上一個出牌嗰位（通常係左手邊，視畫面）。下家＝下一個。對家＝對面。記住「上」呢個動作只可以食上家打出嘅牌。',
      },
      {
        title: '你嘅回合',
        body: '除非有人鳴牌打斷：輪到你 → 從牆摸一張（花就亮完再補）→ 揀一張打出河 → 下家。',
      },
    ],
  },
  {
    id: 'table-seats-dealer',
    title: '莊、圈、同畫面',
    blurb: '邊個先打、東圈係咩；你喺螢幕邊。',
    level: '入門',
    track: 'zero',
    minutes: 3,
    steps: [
      {
        title: '本站畫面',
        body: '開局之後，你通常坐喺畫面下方；左手邊近上家、右手邊近下家、對面係對家（實際以枱面標記為準）。手牌喺近你一邊；河同人哋亮牌喺枱中央附近。',
      },
      {
        title: '莊同圈',
        body: '莊家呢舖先出牌。港式常見打東、南、西、北四圈；圈風會影響「圈風刻」有番。連莊則莊家繼續坐莊（細節見枱規）。',
      },
      {
        title: '門風',
        body: '你座位對應一個風位（東家門風就係東）。之後「夠番」課會再用。',
      },
    ],
  },
  {
    id: 'claims-chi',
    title: '上（吃）',
    blurb: '只用上家打出嘅牌湊順。',
    level: '入門',
    track: 'zero',
    minutes: 4,
    steps: [
      {
        title: '條件',
        body: '手上已有兩張，加上家打出嗰張，剛剛好成一個順。例：手有二萬三萬，上家打四萬 → 可上成 234 萬。',
        tiles: ['man-2', 'man-3', 'man-4'],
      },
      {
        title: '限制',
        body: '對家、下家打出嚟嘅，唔可以上。上完要亮嗰組順，再打一張出河（因為你「多攞」咗人哋嗰張）。',
      },
      {
        title: '你而家識咗',
        body: '上＝順嘅鳴法，只食上家。下一課碰。',
      },
    ],
  },
  {
    id: 'claims-pong',
    title: '碰',
    blurb: '任何人打出第三張一樣都可以碰。',
    level: '入門',
    track: 'zero',
    minutes: 3,
    steps: [
      {
        title: '條件',
        body: '手有兩隻七筒，任何人打出七筒 → 可碰成刻，亮出嚟，再打一張。',
        tiles: ['pin-7', 'pin-7', 'pin-7'],
      },
      {
        title: '同「上」分別',
        body: '碰上任何一家；上只得上家。同一張牌若有人要碰、有人要上，碰優先。',
      },
      {
        title: '注意',
        body: '碰咗就亮咗，對手睇到你有咩。初學可以先識規則；好唔好碰之後先練。',
      },
    ],
  },
  {
    id: 'claims-kong',
    title: '槓（簡介）',
    blurb: '四張一樣；槓完要補牌。',
    level: '入門',
    track: 'zero',
    minutes: 4,
    steps: [
      {
        title: '三種槓',
        body: '明槓：人哋打出第四張。暗槓：自己手裏四張。加槓：已經碰咗，再摸到第四張。',
      },
      {
        title: '補牌',
        body: '槓完會從牆尾再補一張入嚟，然後你通常都要打一張。槓都算一個面子（特殊種）。',
      },
      {
        title: '初學重點',
        body: '未熟組糊之前，唔使急住槓；識得「四張→槓→補」就夠。',
      },
    ],
  },
  {
    id: 'claim-priority',
    title: '邊個先鳴得到',
    blurb: '食糊 ＞ 碰／槓 ＞ 上。',
    level: '入門',
    track: 'zero',
    minutes: 2,
    steps: [
      {
        title: '次序',
        body: '同一張打出嚟：有人可以食糊就食糊優先；否則碰／槓優先於上。',
      },
      {
        title: '點解要知',
        body: '唔好以為「我先撳上」就一定得——遊戲會跟呢個次序判。',
      },
      {
        title: '下一課',
        body: '講「聽牌／叫糊」——差一張嗰種狀態。',
      },
    ],
  },
  {
    id: 'tenpai-ready',
    title: '聽牌同叫糊',
    blurb: '差一張就 17——等邊張。',
    level: '進階',
    track: 'zero',
    minutes: 4,
    steps: [
      {
        title: '聽牌',
        body: '你手上 16 張已經差一張就啱公式。你等待嘅嗰一兩種牌，就係聽張。',
      },
      {
        title: '叫糊',
        body: '喺介面宣告你听緊（叫糊）。之後人哋打出聽張你可以食；自己摸到可以自摸。',
      },
      {
        title: '叮（簡述）',
        body: '有啲枱叫糊之後可以「叮」鎖死聽張：之後摸到非聽張就要原樣打走。細則見枱規；初學可先唔叮。',
      },
    ],
  },
  {
    id: 'how-to-win',
    title: '自摸同出銃',
    blurb: '兩種食糊方式。',
    level: '進階',
    track: 'zero',
    minutes: 3,
    steps: [
      {
        title: '自摸',
        body: '輪到你摸牌，摸到嘅就係聽張 → 自摸食糊。',
      },
      {
        title: '出銃',
        body: '其他人打出你嘅聽張 → 你可以食（出銃）。通常唔夠「起糊番」會食唔到——呢個網站預設要夠番（多數三番）。',
      },
      {
        title: '初學目標',
        body: '先追求「形啱 17 張」；番數用番數表／計番機慢慢補。練習模式可以跟住打一舖手感。',
      },
    ],
  },
  {
    id: 'pass-and-instant',
    title: '過水同即食',
    blurb: '听之後放過嘅銃，同叮後即食。',
    level: '進階',
    track: 'zero',
    minutes: 3,
    steps: [
      {
        title: '過水（常見）',
        body: '你听緊，人哋打出聽張你選擇過；之後好短時間內多數唔可以再食「同一類出銃」（自摸通常仍可）。精確以枱規為準。',
      },
      {
        title: '自己打過聽張',
        body: '河上已有你打出嘅聽張，再食人哋同一張出銃，好多枱禁止。唔好以為「听就一定食得」。',
      },
      {
        title: '即食',
        body: '有啲規矩同「叮」一齊：叮後人哋一打聽張你就要食（即食）。未叮就無呢條逼食。細節見枱規。',
      },
    ],
  },
  {
    id: 'basic-discard',
    title: '打邊張（極簡）',
    blurb: '留成組、打散嘅——唔理高階牌效。',
    level: '進階',
    track: 'zero',
    minutes: 4,
    steps: [
      {
        title: '優先打走',
        body: '① 孤零零一隻字牌（得一隻中／一隻西）。② 孤零零嘅 1 或者 9。③ 同其他牌無挨住嘅數。',
      },
      {
        title: '優先留',
        body: '已經三張連續、已經兩隻一樣、同花色挨近嘅搭（例如四五筒）。',
      },
      {
        title: '一句',
        body: '散嘅打、熟嘅留。打完就去題庫練「碰定過／打邊張」，或者跟住打一舖。',
      },
    ],
  },
  {
    id: 'enough-faan',
    title: '夠唔夠番先食',
    blurb: '形啱之外仲要起糊番。',
    level: '進階',
    track: 'zero',
    minutes: 4,
    steps: [
      {
        title: '點解有時食唔到',
        body: '形係 17 張標準糊都可能因為「番唔夠」食唔到。預設好多枱三番起糊。',
      },
      {
        title: '初學最易夠番',
        body: '碰齊中／發／白（番牌刻）、門風／圈風刻、或者走「一色數牌＋字」（混一色）。詳細見番數表。',
        tiles: ['dragon-zhong', 'dragon-zhong', 'dragon-zhong'],
      },
      {
        title: '正花',
        body: '打花嘅枱：東家對春／梅、南對夏／蘭、西對秋／菊、北對冬／竹（常見對照；以枱規為準）叫正花，可計花番。摸到要亮完再補，唔入 17 公式。',
        tiles: ['flower-spring', 'flower-plum'],
      },
    ],
  },
  {
    id: 'score-later',
    title: '底・番・銀（略讀）',
    blurb: '組得成之後先至要理錢。',
    level: '進深',
    track: 'zero',
    minutes: 3,
    steps: [
      {
        title: '底同番',
        body: '每舖有「底」；糊嘅牌型計「番」。銀碼大致跟（底＋番）同枱規倍率——引擎會計，你睇結果就得。側欄有「番數表」「計番機」可查。',
      },
      {
        title: '拉數',
        body: '有啲局贏家可以「拉」記欠帳，拉滿口可以斬。結算畫面會問；拉數簿喺側欄。未食過糊可先不理。',
      },
      {
        title: '基礎線出口',
        body: '你而家應該識組 17、摸打鳴、听食、極簡打牌、知三番同正花。下一站：跟住打一舖 或 題庫，之後開「打好啲」。',
      },
    ],
  },

  // —— 打好啲（識糊之後）——
  {
    id: 'better-goals',
    title: '打好啲係咩意思',
    blurb: '先定練習目標：速度、少放銃、夠番。',
    level: '進深',
    track: 'better',
    minutes: 3,
    steps: [
      {
        title: '三個刻度',
        body: '① 快啲聽、多啲糊（速度／牌效）。② 少出銃（防守）。③ 糊嘅時候夠番、甚至高啲番（番路）。三樣往往矛盾——好形進攻會險，死守又慢。',
      },
      {
        title: '練習次序',
        body: '建議：先牌效（打邊張）→ 再鳴牌取捨 → 再夠番路線 → 最後推收／防守。題庫主題就係依呢排。',
      },
      {
        title: '一句',
        body: '「打好啲」＝同一手牌，揀接受面闊、風險講得通、番路講得通嘅那著。',
      },
    ],
  },
  {
    id: 'better-distance',
    title: '仲差幾遠先聽',
    blurb: '向聽口語：聽＝0；一向聽＝差一手形。',
    level: '進深',
    track: 'better',
    minutes: 4,
    steps: [
      {
        title: '聽牌＝零向聽',
        body: '16 張已經差一張就 17 公式 → 你係听緊。再遠一格叫「一向聽」：再摸／鳴啱一組，就會變听。',
      },
      {
        title: '點用',
        body: '打牌時問：呢著之後我近咗定遠咗？同樣「近」，揀有效牌多嗰著。',
      },
      {
        title: '薄听 vs 好形',
        body: '可以即刻單騎听、但好薄；或者退返一向聽搏兩面听。好多時後者長期糊率更高——題庫有同類題。',
      },
    ],
  },
  {
    id: 'better-ukeire',
    title: '有效牌：兩面嵌邊',
    blurb: '同樣差一組，闊窄差好遠。',
    level: '進深',
    track: 'better',
    minutes: 5,
    steps: [
      {
        title: '兩面',
        body: '例如四五萬，等三或六。理論上兩頭×最多四張≈八張有效（未計已見）。',
        tiles: ['man-4', 'man-5'],
      },
      {
        title: '嵌同邊',
        body: '嵌（四六等五）同邊（一二等三）大約得四張級。所以要拆搭時：先拆邊／嵌，留兩面。',
        tiles: ['man-4', 'man-6', 'sou-1', 'sou-2'],
      },
      {
        title: '複合形',
        body: '四五六七一條龍咁連住，進張極多——千祈唔好中間拆開去「整理」。優先打別路孤張。',
        tiles: ['pin-4', 'pin-5', 'pin-6', 'pin-7'],
      },
    ],
  },
  {
    id: 'better-wait-shapes',
    title: '听口形點叫',
    blurb: '兩面、嵌、邊、雙碰、單騎——方便對答同題庫。',
    level: '進深',
    track: 'better',
    minutes: 4,
    steps: [
      {
        title: '兩面／嵌／邊',
        body: '两面：四五听三或六。嵌：四六听五。邊：一二听三（或八九听七）。闊度：兩面 ＞ 嵌≈邊。',
      },
      {
        title: '雙碰同單騎',
        body: '雙碰：兩對，听變成刻嘅嗰兩款。單騎：淨等一隻做眼。通常單騎最薄，除非别无选择。',
      },
      {
        title: '點用',
        body: '聽牌時優先做兩面；題庫「牌效」好多問你拆邊留兩面。搶槓＝人加槓你听嗰張可食（見題庫規則題）。',
      },
    ],
  },
  {
    id: 'better-cut-order',
    title: '打牌優先序',
    blurb: '孤字 → 一九 → 二八 → 先至中張。',
    level: '進深',
    track: 'better',
    minutes: 4,
    steps: [
      {
        title: '階梯',
        body: '① 孤客風／孤三元（未成對）。② 孤一、孤九。③ 孤二、孤八。④ 中張孤張。有對嘅字／中張往往留做眼或進張。',
      },
      {
        title: '例外苗頭',
        body: '追混一色／清一色時，異色就算中張都可能要早打。防守兇時，險張就算「好用」都可能要讓路畀現物。',
      },
      {
        title: '練法',
        body: '題庫「打牌」「牌效」：每次只問打邊張，對完講解再問自己係咪跟階梯。',
      },
    ],
  },
  {
    id: 'better-claim-timing',
    title: '鳴牌：速度同代價',
    blurb: '鳴會亮牌、失門前；換嚟快同番。',
    level: '進深',
    track: 'better',
    minutes: 5,
    steps: [
      {
        title: '值得鳴',
        body: '番牌（中發白）、門風／圈風——聽近時碰，夠番又快。已有番、差一組就听，上可以加速。',
      },
      {
        title: '唔好亂鳴',
        body: '未听就碰普通數、早碰客風、為上而失門前又無番路——手變死、對手睇穿。',
      },
      {
        title: '鳴完要打牌',
        body: '若碰／上完只剩險張可打、對面似听——寧願過。題庫「鳴牌判斷」「防守」專門練呢下。',
      },
    ],
  },
  {
    id: 'better-faan-route',
    title: '開局定番路',
    blurb: '未听之前就要知點夠三番。',
    level: '進深',
    track: 'better',
    minutes: 5,
    steps: [
      {
        title: '三條易路',
        body: '① 番牌刻（中發白）。② 門風／圈風刻。③ 混一色（一門數＋字）。平糊無番好易食唔到。',
      },
      {
        title: '開局掃描',
        body: '起手數：有冇番牌對？有冇一色偏多？門風對未？有就護住；無就準備靠之後碰番或者轉色。',
      },
      {
        title: '清一色',
        body: '幾乎一色先執著；仲有兩門散牌就早打異色定路。唔好半途三門都想要。',
      },
    ],
  },
  {
    id: 'better-winds',
    title: '門風同圈風',
    blurb: '自己位同場風——刻有番。',
    level: '進深',
    track: 'better',
    minutes: 3,
    steps: [
      {
        title: '分清楚',
        body: '門風＝你座位（東家就係東）。圈風＝而家東／南／西／北圈。客風＝其餘，通常無番。',
      },
      {
        title: '用法',
        body: '門風／圈風對要護；雙風位（又係門又係圈）更珍貴。孤客風早打。',
      },
      {
        title: '對照',
        body: '題庫有「碰門風」「圈風對子」「早碰客風」可練。',
      },
    ],
  },
  {
    id: 'better-defense-read',
    title: '點睇人似唔似听',
    blurb: '亮牌、打牌乾淨、巡數。',
    level: '進深',
    track: 'better',
    minutes: 4,
    steps: [
      {
        title: '危險訊號',
        body: '短時間亮咗兩組、之後打牌好「乾淨」（中張少、現物多）；或者追同一色亮牌——當佢听或者好近。',
      },
      {
        title: '現物',
        body: '佢剛打過、或者河上已見多隻嘅牌，再打相對安全。未見過嘅中張最險。',
      },
      {
        title: '筋（入門）',
        body: '例如打過三，六同佢有筋關係，有時安全啲。唔使背晒表，先記住「現物優先於理論筋」。',
      },
    ],
  },
  {
    id: 'better-push-fold',
    title: '推定收',
    blurb: '自己近听時，攻定守。',
    level: '進深',
    track: 'better',
    minutes: 4,
    steps: [
      {
        title: '傾向推',
        body: '你一向听／已听、形闊、番夠、對手未明顯听、你係莊想連——可以打進張中張。',
      },
      {
        title: '傾向收',
        body: '對手亮一色／似听、牆剩少、你仲遠、進听要打極險張——打現物字牌，寧願慢。',
      },
      {
        title: '一句',
        body: '問：呢張打出去，我贏面加幾多、輸面加幾多？題庫「防守」「推定收」對答案。',
      },
    ],
  },
  {
    id: 'better-kong-timing',
    title: '槓嘅時機',
    blurb: '補牌甜蜜，曝光同搶槓危險。',
    level: '進深',
    track: 'better',
    minutes: 3,
    steps: [
      {
        title: '可以槓',
        body: '未听、對手不兇：明槓／加槓換補牌。听住而暗槓後仍然听：可槓加番。',
      },
      {
        title: '暫唔槓',
        body: '多人似听時加槓怕搶槓；未听就槓到牌路全亮、又無番——不值。',
      },
      {
        title: '練',
        body: '題庫主題「槓」。',
      },
    ],
  },
  {
    id: 'better-late-game',
    title: '中後盤變奏',
    blurb: '牆愈少，防守權重愈高。',
    level: '進深',
    track: 'better',
    minutes: 3,
    steps: [
      {
        title: '巡數感',
        body: '早盤：敢打孤字整理。中盤：定番路、少破門前。尾盤：聽家出現就現物優先。',
      },
      {
        title: '一色壓力',
        body: '有人兩組同色亮出，嗰色同字都當險——除非你都走嗰路同佢搶。',
      },
      {
        title: '流局前',
        body: '自己未听又遠：收火保分有時好過博薄听出銃。',
      },
    ],
  },
  {
    id: 'better-practice-loop',
    title: '點練先進步',
    blurb: '題庫對主題，实戰複盤兩至三手。',
    level: '進深',
    track: 'better',
    minutes: 3,
    steps: [
      {
        title: '題庫對照',
        body: '打牌／牌效 → 有效牌。鳴牌判斷 → 上碰時機。番數 → 路線。防守 → 現物推收。規則題鞏固唔好再錯水。',
      },
      {
        title: '打完一舖',
        body: '只問自己：① 有無亂鳴？② 有無拆過複合形？③ 出銃嗰張係唔係未見中張？④ 番路開局有無定？',
      },
      {
        title: '出口',
        body: '學完呢條線，返題庫刷弱項，再「跟住打一舖」。想再上一個層次，去「大師」線。',
      },
    ],
  },

  // —— 大師 ——
  {
    id: 'master-mindset',
    title: '大師諗法',
    blurb: '唔係更快撳掣，係用期望同系統錯誤睇每一著。',
    level: '進深',
    track: 'master',
    minutes: 4,
    steps: [
      {
        title: '同「打好啲」嘅分別',
        body: '打好啲：跟對嘅啟發式（兩面、現物、番路）。大師：喺衝突啟發式之間，用「長期銀碼／段位」做裁判——接受偶爾背啟發式。',
      },
      {
        title: '粗略期望',
        body: '心算框架：糊率 × 平均番收益 − 出銃率 × 出銃虧損。你唔使計準數；但每手要問「呢著加邊邊、減邊邊」。',
      },
      {
        title: '系統 > 單手',
        body: '一舖衰可以係方差；同一類錯（尾巡放中張、無番平糊硬食）重複出現先係要改嘅系統。',
      },
    ],
  },
  {
    id: 'master-multipath',
    title: '多路線有效牌',
    blurb: '唔止比較一張切牌，比較切完之後嘅形態樹。',
    level: '進深',
    track: 'master',
    minutes: 5,
    steps: [
      {
        title: '一著兩用',
        body: '好切牌令你保持兩條進听：例如留複合形同時保留番牌對。差切牌令你「听得快但只有一條死路」。',
      },
      {
        title: '黏牌／樞紐',
        body: '某張牌同時服務兩個搭（例如五筒連四五同五六），打走佢等於斬兩條線——大師極少無故斬樞紐。',
      },
      {
        title: '練習',
        body: '睇題庫牌效題時，強制講出「打 A 之後听口／一向聽接受；打 B 之後呢」。唔好只背答案張。',
      },
    ],
  },
  {
    id: 'master-value-speed',
    title: '打點同速度',
    blurb: '細糊快槍 vs 等大牌——幾時邊邊。',
    level: '進深',
    track: 'master',
    minutes: 4,
    steps: [
      {
        title: '偏速度',
        body: '對手已听／牆少／你番已夠三：用鳴同薄听換先機。莊家連莊價值高時都偏快。',
      },
      {
        title: '偏打點',
        body: '早中盤、對手遠、你門清有一色／字一色苗頭：可以拒絕早碰客風，等大番。',
      },
      {
        title: '衝突句',
        body: '「我有無已經夠起糊？對手有無已听？」兩個答案決定你今鋪係獵人定農夫。',
      },
    ],
  },
  {
    id: 'master-special-hands',
    title: '特殊型：十三么・嚦咕',
    blurb: '唔跟 5 面子 + 眼嘅 17 張例外。',
    level: '進深',
    track: 'master',
    minutes: 5,
    steps: [
      {
        title: '十三么要齊嘅種',
        body: '十三種么九字：一九萬、一九筒、一九索、東南西北、中發白。開局呢啲極多先轉；半途已經三門齊中張就唔好硬轉。',
        tiles: [
          'man-1',
          'man-9',
          'pin-1',
          'pin-9',
          'sou-1',
          'sou-9',
          'wind-east',
          'wind-south',
          'wind-west',
          'wind-north',
          'dragon-zhong',
          'dragon-fa',
          'dragon-bai',
        ],
      },
      {
        title: '嚦咕嚦咕',
        body: '七對＋一刻（17 張）；四張可當兩對、唔好隨便暗槓拆對。門清型。引擎認呢個特殊型。',
        tiles: [
          'man-1',
          'man-1',
          'man-1',
          'pin-2',
          'pin-2',
          'sou-3',
          'sou-3',
          'wind-east',
          'wind-east',
          'dragon-fa',
          'dragon-fa',
          'man-5',
          'man-5',
          'pin-8',
          'pin-8',
          'sou-9',
          'sou-9',
        ],
      },
      {
        title: '雙食',
        body: '有時同一手又係標準拆又係嚦咕——可「雙食」：型類番可重計，偶然／糊法番通常只計一次。詳見番數表。',
      },
    ],
  },
  {
    id: 'master-fan-stack',
    title: '番疊同互斥',
    blurb: '大牌感來自合法疊加，唔係感覺。',
    level: '進深',
    track: 'master',
    minutes: 5,
    steps: [
      {
        title: '先查表',
        body: '以為「清一色＋對對＋咩咩」——有啲組合互斥或吞併。打之前用番數表／計番機核對，養成肌肉記憶。',
      },
      {
        title: '實例（大包細）',
        body: '常見：海底撈月唔再另計自摸；叮摸唔再另計自摸；缺一門唔再另計無字。大牌型已包細條件時只留大嘅——詳見 design／番數表 exclusivity。',
      },
      {
        title: '門清何時斬・爆棚',
        body: '對手已听、你差一碰就够大：要算失門清少幾番 vs 慢幾巡。枱有番封頂時，超過封頂再等大＝邊際零，轉速度。',
      },
    ],
  },
  {
    id: 'master-danger-map',
    title: '三家危險圖',
    blurb: '唔係「有人听就全部現物」。',
    level: '進深',
    track: 'master',
    minutes: 5,
    steps: [
      {
        title: '分層',
        body: '對每家打分：已亮組數、色偏、打牌乾淨度、巡數。最高危嗰家用最嚴安全牌；次危用次安全。',
      },
      {
        title: '現物鏈',
        body: '優先：對听家現物 → 多家現物 → 字牌現物／孤字 → 筋／壁 → 先至中張。',
      },
      {
        title: '自己听時',
        body: '你已听且番夠：可以「只防最高危一家」放寬其餘——否則永遠打唔出听張以外嘅進攻。',
      },
    ],
  },
  {
    id: 'master-deal-in-ev',
    title: '出銃經濟學',
    blurb: '放一槍可以洗白成晚細糊。',
    level: '進深',
    track: 'master',
    minutes: 4,
    steps: [
      {
        title: '量級例子',
        body: '心算：若出銃 8 番、你平均糊約 3 番，粗略要兩舖以上「淨贏 3 番」先回本（未計底同銃全包）。高番銃一次可以洗白成晚細糊。',
      },
      {
        title: '可接受風險',
        body: '你听大牌、對手听勢不明、牆仲多：可以承擔中等危險進張。你遠、對手双亮一色：承擔接近零。',
      },
      {
        title: '複盤句',
        body: '每次出銃問：當下危險圖排第幾？有無更安全嘅一向聽／听口？',
      },
    ],
  },
  {
    id: 'master-wall-end',
    title: '牆尾精密',
    blurb: '最後十餘張，資訊同安全權重爆棚。',
    level: '進深',
    track: 'master',
    minutes: 3,
    steps: [
      {
        title: '數牆',
        body: '養成望剩餘牆張。愈少，鳴牌後要打嘅那張愈貴。',
      },
      {
        title: '最后一搏',
        body: '自己一向听闊、對手未亮：可以搏。自己兩向听、三家乾淨：收。',
      },
      {
        title: '流局價值',
        body: '有啲枱罰未听——則尾盤你未听要更積極或者認罰；以枱規為準。',
      },
    ],
  },
  {
    id: 'master-la-match',
    title: '拉數同場次策略',
    blurb: '銀碼規則改變胃納。',
    level: '進深',
    track: 'master',
    minutes: 4,
    steps: [
      {
        title: '拉同斬',
        body: '拉數令單舖結果跨舖延伸；接近斬口時，大牌同防銃權重上升——你唔好當每舖獨立。',
      },
      {
        title: '普通 vs 排位',
        body: '普通場可練怪手同大牌。排位／分段：降方差——少無謂早鳴、少尾巡探險。',
      },
      {
        title: '座位',
        body: '莊連價值、下家压力（你打出下家先鸣）——大師會微調同桌相對位置嘅兇度。',
      },
    ],
  },
  {
    id: 'master-replay',
    title: '牌譜複盤法',
    blurb: '從「好衰」變成可改嘅規則。',
    level: '進深',
    track: 'master',
    minutes: 4,
    steps: [
      {
        title: '本站點開',
        body: '打完一舖可喺結算重温；之後去個人／檔案搵牌譜再開重温。每譜只深挖三手：開局定路、中盤鳴／切、听後／防。',
      },
      {
        title: '對照引擎',
        body: '結算番係咪你預期？有無互斥搞錯？听口等張仲有幾多——用重温核對。',
      },
      {
        title: '寫一條規則',
        body: '複盤產出必須係一句可執行：「南圈尾盤唔加槓除非已听」——下舖專執行呢句。',
      },
    ],
  },
  {
    id: 'master-table-read',
    title: '讀人同節奏',
    blurb: '習慣、速度、假听壓力。',
    level: '進深',
    track: 'master',
    minutes: 3,
    steps: [
      {
        title: '型格',
        body: '有人常早碰、有人門清偏執、有人尾盤愛險打——幫危險圖加權。AI 性格場同樣適用。',
      },
      {
        title: '時間',
        body: '突然長考再打中張：提高警覺。秒出字牌：可能係整理或者現物。',
      },
      {
        title: '詐同壓',
        body: '港式少「假听宣言」，但亮牌同河可以施壓。你自己亮組時都喺話故事——大師會控制資訊。',
      },
    ],
  },
  {
    id: 'master-deliberate',
    title: '大師修煉節奏',
    blurb: '弱項隔離、劑量、回歸題庫。',
    level: '進深',
    track: 'master',
    minutes: 4,
    steps: [
      {
        title: '一週一題',
        body: '例如本週只打「危險圖」：每舖強制口述三家排序。唔好同時改五樣。',
      },
      {
        title: '劑量',
        body: '題庫高手感題（防守／牌效）暖身 → 兩至三舖有意識實戰 → 一譜三手複盤。',
      },
      {
        title: '畢業自檢（大師線）',
        body: '你能否：① 衝突時講出期望取捨；② 畫三家危險圖；③ 舉一個番互斥例；④ 每譜寫一條可執行規則；⑤ 排位時自覺降方差。五樣都「多數時候係」→ 可持續修煉，唔係學完就畢業。',
      },
    ],
  },
]

export const TRACK_META: Record<
  LearnTrack,
  { label: string; lead: string }
> = {
  zero: {
    label: '基礎課程',
    lead: '由零開始：認牌、17 公式、莊圈畫面、摸打鳴、过水、三番同正花。',
  },
  better: {
    label: '打好啲',
    lead: '識糊之後：向聽、有效牌、听口形、鳴牌、番路、防守推收。',
  },
  master: {
    label: '大師課程',
    lead: '期望思維、特殊型、番互斥實例、危險圖、出銃 EV、複盤同畢業自檢。建議打好啲之後先上。',
  },
}

export function getLesson(id: string): LearnLesson | undefined {
  return LEARN_LESSONS.find((l) => l.id === id)
}

export function lessonsByTrack(track: LearnTrack): LearnLesson[] {
  return LEARN_LESSONS.filter((l) => l.track === track)
}

/** 該課喺所屬線嘅第幾課（1-based）；搵唔到回 0 */
export function lessonIndexInTrack(id: string): {
  track: LearnTrack
  index: number
  total: number
  nextId: string | null
} | null {
  const lesson = getLesson(id)
  if (!lesson) return null
  const list = lessonsByTrack(lesson.track)
  const index = list.findIndex((l) => l.id === id)
  if (index < 0) return null
  return {
    track: lesson.track,
    index: index + 1,
    total: list.length,
    nextId: list[index + 1]?.id ?? null,
  }
}

export function firstLessonId(track: LearnTrack): string | undefined {
  return lessonsByTrack(track)[0]?.id
}

export function nextTrack(track: LearnTrack): LearnTrack | null {
  if (track === 'zero') return 'better'
  if (track === 'better') return 'master'
  return null
}
