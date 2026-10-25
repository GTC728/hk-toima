/**
 * 番薯表：番種名、番數、說明嘅單一來源。
 * UI／計番／結算 tooltip 一律經呢度查。
 */
import fansJson from './fans.json'

export interface FanMeta {
  id: string
  name: string
  value: number
  implemented: boolean
  note?: string
  /** 給玩家睇嘅描述（hover／番數表） */
  desc: string
}

type RawFan = {
  id: string
  name: string
  value: number
  implemented?: boolean
  note?: string
}

export type FanRefRole = 'default' | 'cross'

export interface FanRef {
  title: string
  url: string
  role: FanRefRole
}

const raw = fansJson as {
  version: number
  name: string
  note: string
  refs?: FanRef[]
  fans: RawFan[]
}

/**
 * 港式台牌（Raymond Ting 系）說明：簡潔、新手易明。
 * 唔套用台灣台數／廣東麻雀計法。
 */
const DESC: Record<string, string> = {
  di: '每鋪固定加嘅底番，之後×番值成銀碼。',
  pinghu: '全副都係順子（上），無刻子。',
  menqing: '無上、無碰（槓唔破門清）；出銃時嘅門清。',
  menqing_zimo: '門清自摸；可同門清並計；唔另計自摸。',
  menqing_ding: '門清兼已叮；吞門清／門清自摸／叮。',
  ding: '已聲明叮牌後食糊（5）；門清叮 10 時唔另計；大牌吞門清叮後仍計。',
  dingmo: '叮摸：已叮兼自摸（5）；唔另計自摸。同「即食」（叮後一巡內）分開。',
  tianting: '莊家開牌補花後即叮。',
  diting: '閒家第一輪摸打後即叮。',
  zimo: '自己摸到糊牌。',
  wuzi: '成糊手牌無字牌（風、中發白）。',
  wuhua: '成糊無花牌（偏高檔 1 番）。',
  zhenghua: '花嘅季節／植物對應你座位（正位花）。',
  lanhua: '唔係你座位嘅花。',
  duipeng: '對碰：聽口靠手上嗰對湊成刻食糊（唔係順、唔係眼）。',
  dudu: '獨獨：單聽（聽口得一張）——單騎、邊張或中洞；對碰另計。',
  jiangyan: '眼係二、五或八。',
  jiadu: '假獨：以邊張／中洞／獨聽型式聽，但其實聽多過一張（1 番）。',
  hunyise: '只有一門數牌，再加字牌。',
  qingyise: '只有一門數牌，無字牌。',
  duiduihu: '全副都係刻／槓＋一對眼（對對糊）。',
  jijihu: '門清自摸嘅對對糊（間間／機機糊）。',
  xiaosanyuan: '中發白有兩組刻，另一隻做眼。',
  dasanyuan: '中發白三組刻齊。',
  xiaosifeng: '東南西北有兩組刻，另一隻風做眼。',
  dasifeng: '東南西北有三組刻。',
  xiaosixi: '三組風刻＋一對風眼。',
  dasixi: '東南西北四組風刻齊。',
  shisanyao: '十三么：幺九字齊，其餘砌順或暗刻。',
  liguligu: '嚦咕嚦咕（尼古尼古）：七對＋一刻；門清；四張可當兩對。同標準型一齊＝雙食（兩舖番可重計）。',
  ippatsu: '叮牌後未斷巡即食（即食）。',
  qianggang: '搶人哋加槓食糊。',
  dealer: '莊家食糊額外加番。',
  lianzhuang: '連莊：連 N 莊共 2N＋1 番（已含做莊；連一＝3、連二＝5…）。',
  wuzihua: '無字兼無花（8 番）。',
  yitaicao: '一台草：即時賞罰（唔入番數）。',
  yitaihua: '一台花：即時賞罰（唔入番數）。',
  qixian: '七搶一：即時花賞罰。',
  yiqiangqi: '一搶七：即時花賞罰。',
  baxian: '八仙過海：即時花賞罰。',
  zhui: '追：四家打同一隻；即時收底。',
  ankong_instant: '暗槓即時每家收一個底。',
  weishai: '圍骰：莊家擲骰即時賞。',
  yiersan: '一二三：莊家擲骰即時罰。',
  wuzihuadaping: '無字、無花、又係平胡（大平湖 15；包無字花／平胡）。',
  queimen: '缺一門數牌（萬／筒／索缺一）；可同無字並計。',
  wumenqi: '小五門齊：萬、筒、索、風、三元五門都有。',
  qimenqi: '七門齊（五門再加花等，見枱規）。',
  banqiuren: '副露落地，單釣自摸（半求人）；唔另計自摸。',
  quanqiuren: '副露落地，單釣食人哋出銃（全求人）。',
  daji: '對對糊兼五門齊。',
  daya: '平胡型大鴨（全帶么一類；見枱規）。',
  sizinnei: '開牌後四隻打牌內食糊（四子內）。',
  qizinnei: '開牌後七隻打牌內食糊（七子內）。',
  shizinnei: '開牌後十隻打牌內食糊（十子內）。',
  hedilaoyu: '河底：最後打出嘅牌俾人食。',
  haidilaoyue: '海底：最後一隻牌自摸；唔另計自摸。',
  huamo: '連續補花後自摸；番數×補花次數。',
  gangmo: '連續槓補後自摸；番數×槓次數。',
  jinshangtianhua: '花上槓／槓上花連續補上嘅錦上添花。',
  mingjue: '絕章·明絕：糊牌喺場上已見過兩張。',
  juejue: '絕章·八絕：糊牌喺場上已見過三張（亦稱絕絕）。',
  tianhu: '莊家開牌補花後即食糊（開槓後唔計）。',
  dihu: '莊家打出第一隻俾人食（地胡）。',
  renhu: '閒家好早（約四張內）食糊。',
  shuangxiang: '一炮雙響（雪上霜）5 番。',
  sanxiang: '一炮三響（雪上冰）20 番。',
  ziyise: '全副都係字牌。',
  mingwutongshun: '五組數字一樣嘅順（有副露）；預設仍另計般高／相逢。',
  anwutongshun: '五組數字一樣嘅順（全暗）；預設＝明档×2，仍另計般高／相逢。',
  mingsitongshun: '四組數字一樣嘅順（有副露）；預設仍另計般高／相逢。',
  ansitongshun: '四組數字一樣嘅順（全暗）；預設仍另計般高／相逢。',
  wutongshun: '舊「五同順」；改用明／暗五同順。',
  sitongshun: '舊「四同順」；改用明／暗四同順。',
  shiliubuda:
    '十六不搭：一對眼＋其餘單張，同門數牌隔至少 3；唔另計門清／五門齊／七門齊。',
  fengke:
    '每組風刻／槓：係你門風或當圈圈風＝2番；否則非正＝1番。東圈碰北＝非正1，唔係3。',
  sanyuanpai: '每組中／發／白刻或槓。',
  minggang: '每個明槓／加槓 3 番（表名「槓」）。',
  angang: '每個暗槓入番（另有即時賞罰）。',
  lianganke: '兩組暗刻（手裡或暗槓）。',
  sananke: '三組暗刻。',
  sianke: '四暗坎：暗刻＋槓合計四組（偏高檔 20）。',
  wuanake: '五暗坎：暗刻＋槓合計五組；可同對對糊並計。',
  wugangzi: '五個槓。',
  mingzalong: '同門一至九齊，其中有上／碰（明雜龍）。',
  anzalong: '同門一至九齊，全部手裡（暗雜龍）。',
  mingqinglong: '同門 123＋456＋789，有上破門（明清龍）。',
  anqinglong: '同門 123＋456＋789，全手裡（暗清龍）。',
  hundaiyao: '每組都帶么九或字（混帶么）。',
  quandaiyao: '每組都帶么九，無字（全帶么）。',
  hunlaotou: '全副么九加字（混么九）。',
  qinglaotou: '全副么九，無字（清老頭）。',
  laoshao: '同門 123＋789（或 111＋999）；暗＝4番（明2＋暗加2），唔係計兩次。',
  duanyaojiu: '無么九、無字（斷么）。',
  hundaixyz: '舊名；見混滿庭芳。',
  hunmantingfang:
    '混滿庭芳：有字，每撘／眼係字或帶同一數 X；每個 X 一條 15 番，可分開撳睇。',
  quewu: '成糊數牌無「五」（字牌可以有）；有小於／大於五時唔另計。',
  xiaoyuwu: '成手只有數牌，而且全部係 1–4（無字、無五以上）。',
  dayuwu: '成手只有數牌，而且全部係 6–9（無字、無五以下）。',
  mingsiguiji: '用盡同一隻數牌四張：一刻＋至少一順（如 333＋345）；有上／碰。',
  ansiguiji: '用盡同一隻數牌四張：一刻＋至少一順；全部手裡。',
  mingsiguier: '用盡同一隻數牌四張：兩隻做眼，另外兩隻入兩組順。',
  ansiguier: '用盡同一隻數牌四張：眼＋兩順；全部手裡。',
  mingsiguisi: '用盡同一隻數牌四張：四張分別入四組順。',
  ansiguisi: '用盡同一隻數牌四張：四張入四組順；全部手裡。',
  dasanseke: '三門各有一刻，數字相連（如 444萬＋555筒＋666索）。',
  xiaosanseke: '連續三個數字嘅刻，只用到兩門（小三色連刻）。',
  mingbangao: '同門兩組一樣順（有副露）；5 番；多組分開計。',
  anbangao: '同門兩組一樣順（全暗）；10 番；多組分開計。',
  mingxiaoshuangbangao: '舊合併檔；見明／暗般高。',
  anxiaoshuangbangao: '舊合併檔；見明／暗般高。',
  mingzhenshuangbangao: '舊合併檔；兩組般高改為分開兩條。',
  anzhenshuangbangao: '舊合併檔；兩組般高改為分開兩條。',
  mingyisesantong: '同門三組一樣順（明；對齊三般高）。',
  anyisesantong: '同門三組一樣順（暗）。',
  mingyisesitong: '同門四組一樣順（明；對齊四般高）。',
  anyisesitong: '同門四組一樣順（暗）。',
  mingdansebbg:
    '同門連續順，如 123＋234＋345（明單色步步高）；唔係清龍。',
  andansebbg: '同門連續順，如 123＋234＋345（暗單色步步高）。',
  erlianke: '坊間別名；同「二姊妹」。本表用姊妹計，唔重複加連刻。',
  xiaosanlianke: '坊間別名；同姊妹档。本表唔另計連刻。',
  dasanlianke: '坊間別名；同三／四姊妹。本表唔另計連刻。',
  anxiangfeng: '兩色同數字順且全暗（暗相逢 5）。',
  xixiangfeng: '（停用）喜相逢＝相逢本身，唔係「兩組相逢＋15」。',
  mantingfang:
    '滿庭芳：五撘＋眼每一組都帶同一個數（全帶 X，如全帶六）。常見 60 番。',
  quandaix: '舊名；見滿庭芳。',
  xiangfeng:
    '喜相逢／相逢：兩色同數字順（如 456筒＋456索）。有副露＝明 3；全暗見暗相逢。',
  shuangjiemei: '兩門各有一組同門相連刻（雙姊妹）。',
  mingsanxiangfeng: '三組數字一樣、花色唔同嘅順（明三相逢）。',
  ansanxiangfeng: '三組數字一樣、花色唔同嘅順（暗三相逢）。',
  mingsixiangfeng: '四相逢（明）。',
  ansixiangfeng: '四相逢（暗）。',
  mingwuxiangfeng: '五相逢（明）。',
  anwuxiangfeng: '五相逢（暗）。',
  liangxiongdi: '兩個唔同門、數字一樣嘅刻（兩兄弟）。',
  xiaosanxiongdi: '兩兄弟再加同數做眼（小三兄弟）。',
  dasanxiongdi: '三個唔同門、數字一樣嘅刻（大三兄弟）。',
  mingsansebbg: '三門起始連續順，如 123萬＋234筒＋345索（明）。',
  ansansebbg: '三門起始連續順（暗）。',
  erjiemei:
    '同門兩組相連刻，如 555條＋666條。同「二連刻」一回事，只計一次。',
  sanjiemei: '同門三組相連刻（三姊妹）。',
  sijiemei: '同門四組相連刻（四姊妹）。',
  qizhihua: '七隻花相關番（或即食，見枱規）。',
  liuhuabuzheng: '六花但唔正位。',
  liangtaihua: '兩組花槓齊；可即食兩台花。',
  fanxue: '一炮多響時，出銃者相關番×2（反雪）。',
}

function descOf(f: RawFan): string {
  if (DESC[f.id]) return DESC[f.id]!
  if (f.note) return f.note
  return `${f.name}（${f.value}番）`
}

const byId = new Map<string, FanMeta>()
for (const f of raw.fans) {
  byId.set(f.id, {
    id: f.id,
    name: f.name,
    value: f.value,
    implemented: f.implemented !== false,
    note: f.note,
    desc: descOf(f),
  })
}
// 結算用底／莊等可能唔喺 json 列表頭
if (!byId.has('di')) {
  byId.set('di', {
    id: 'di',
    name: '底',
    value: 5,
    implemented: true,
    desc: DESC.di!,
  })
}

export const FAN_TABLE_META = {
  version: raw.version,
  name: raw.name,
  note: raw.note,
  refs: (raw.refs ?? []) as FanRef[],
}

export function allFanMetas(): FanMeta[] {
  return raw.fans.map((f) => byId.get(f.id)!)
}

export function getFanMeta(id: string): FanMeta {
  const hit = byId.get(id)
  if (hit) return hit
  return {
    id,
    name: id,
    value: 0,
    implemented: false,
    desc: `未收錄番種「${id}」`,
  }
}

export function fanDisplayName(id: string): string {
  return getFanMeta(id).name
}

export function fanDescription(id: string): string {
  return getFanMeta(id).desc
}
